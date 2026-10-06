import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { connectorHealth, conversationStages, integrationEvents, orderItems, orders, posSales, products, reservations, whatsappConversations, whatsappMessages, whatsappTemplates } from "../shared/schema";
import { currentAccess } from "./context";
import { getDb } from "./db";
const text = z.string().min(1).max(256);
const date = z.iso.datetime({ offset: true });
const money = z.number().int().min(0).max(2147483647);
const envelope = z.object({ event_id: text, channel: z.enum(["uber_eats", "opentable", "whatsapp", "mips"]), payload_version: z.literal("1"), created_at: date });
export const connectorSchema = z.discriminatedUnion("event_type", [
  envelope.extend({ event_type: z.literal("order"), payload: z.object({ external_id: text, amount: money, status: z.enum(["confirmed", "cancelled"]), items: z.array(z.object({ product_id: text, name: text, quantity: z.number().int().min(1).max(10000), unit_price: money })).max(200) }) }),
  envelope.extend({ event_type: z.literal("pos_confirmation"), payload: z.object({ order_external_id: text, folio: text, amount: money }) }),
  envelope.extend({ event_type: z.literal("reservation"), payload: z.object({ external_id: text, party_size: z.number().int().min(1).max(1000), reserved_for: date, status: z.enum(["confirmed", "cancelled", "no_show", "seated", "completed"]) }) }),
  envelope.extend({ event_type: z.literal("conversation"), payload: z.object({ external_id: text, intent: text, first_response_seconds: z.number().int().nonnegative().optional() }) }),
  envelope.extend({ event_type: z.literal("message"), payload: z.object({ external_id: text, conversation_external_id: text, direction: z.enum(["in", "out"]), template_name: text.optional(), delivered_at: date.optional(), read_at: date.optional(), replied_at: date.optional() }) }),
  envelope.extend({ event_type: z.literal("message_status"), payload: z.object({ message_external_id: text, status: z.enum(["delivered", "read", "replied"]) }) }),
  envelope.extend({ event_type: z.literal("conversation_stage"), payload: z.object({ conversation_external_id: text, stage: z.enum(["intent", "request", "conversion"]), target_type: z.enum(["order", "reservation"]).optional(), target_external_id: text.optional() }) }),
]);
export const scopedId = (...parts: string[]) => createHash("sha256").update(JSON.stringify(parts)).digest("hex");
const fail = (message: string, status = 409): never => { throw Object.assign(new Error(message), { status }); };
export async function ingestEvent(input: unknown) {
  const parsed = connectorSchema.safeParse(input);
  if (!parsed.success) fail("Evento inválido para contrato v1", 400);
  const event = parsed.data!;
  const access = currentAccess();
  if (access.role !== "connector" || access.channel !== event.channel) fail("Canal no autorizado", 403);
  const expectedChannel = { order: "uber_eats", pos_confirmation: "mips", reservation: "opentable", conversation: "whatsapp", message: "whatsapp", message_status: "whatsapp", conversation_stage: "whatsapp" }[event.event_type];
  if (event.channel !== expectedChannel) fail("Tipo de evento incompatible con canal", 400);
  const rid = access.restaurantId;
  const eventId = scopedId(rid, event.channel, event.event_id);
  const digest = scopedId(JSON.stringify(event));
  const at = new Date(event.created_at);
  if (at.getTime() > Date.now() + 5 * 60000) fail("Fecha futura fuera de tolerancia", 400);
  return getDb().transaction(async tx => {
    const inserted = await tx.insert(integrationEvents).values({ id: eventId, restaurantId: rid, channel: event.channel, externalId: event.event_id, eventType: event.event_type, eventStatus: "pending", occurredAt: at, receivedAt: new Date(), rawMetadata: { digest, version: "1", orderExternalId: event.event_type === "order" ? event.payload.external_id : null } }).onConflictDoNothing().returning();
    if (!inserted.length) {
      const [existing] = await tx.select().from(integrationEvents).where(eq(integrationEvents.id, eventId));
      if ((existing.rawMetadata as { digest?: string })?.digest !== digest) fail("event_id ya recibido con otro contenido");
      return { status: existing.eventStatus, mips_folio: existing.mipsFolio, duplicate: true };
    }
    let folio: string | null = null;
    let amount: number | null = null;
    if (event.event_type === "order") {
      const p = event.payload;
      const id = scopedId(rid, "uber_eats", p.external_id);
      if (p.items.reduce((n, item) => n + item.quantity * item.unit_price, 0) !== p.amount) fail("El total debe coincidir con las líneas", 400);
      const saved = await tx.insert(orders).values({ id, restaurantId: rid, channel: "uber_eats", externalId: p.external_id, amount: p.amount, status: p.status, cancelled: p.status === "cancelled", orderedAt: at }).onConflictDoNothing().returning();
      if (!saved.length) fail("Pedido ya registrado: las modificaciones requieren contrato de actualización");
      for (const [index, item] of p.items.entries()) {
        const productId = scopedId(rid, "product", item.product_id);
        await tx.insert(products).values({ id: productId, restaurantId: rid, name: item.name, category: "Conector", basePrice: item.unit_price }).onConflictDoNothing();
        await tx.insert(orderItems).values({ id: scopedId(id, String(index)), orderId: id, productId, quantity: item.quantity, unitPrice: item.unit_price, lineTotal: item.quantity * item.unit_price });
      }
      amount = p.amount;
    } else if (event.event_type === "pos_confirmation") {
      const p = event.payload;
      const orderId = scopedId(rid, "uber_eats", p.order_external_id);
      // Serializes confirmations of one order even when different event IDs race.
      const [order] = await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.restaurantId, rid))).for("update");
      if (!order) fail("Pedido de origen no encontrado");
      if (order.status !== "confirmed" || order.cancelled || order.amount !== p.amount) fail("La confirmación POS no coincide con el pedido");
      if (order.mipsFolio && order.mipsFolio !== p.folio) fail("Pedido ya conciliado con otro folio");
      const saleId = scopedId(rid, "pos", p.folio);
      const [previous] = await tx.select().from(posSales).where(eq(posSales.id, saleId));
      if (previous && previous.orderId !== orderId) fail("Folio ya asociado a otro pedido");
      await tx.insert(posSales).values({ id: saleId, restaurantId: rid, mipsFolio: p.folio, soldAt: at, amount: p.amount, channelSource: "uber_eats", orderId }).onConflictDoNothing();
      // A competing order claiming the same folio must roll back its event.
      const [sale] = await tx.select().from(posSales).where(eq(posSales.id, saleId));
      if (sale.orderId !== orderId) fail("Folio ya asociado a otro pedido");
      await tx.update(orders).set({ mipsFolio: p.folio }).where(eq(orders.id, orderId));
      folio = p.folio; amount = p.amount;
    } else if (event.event_type === "reservation") {
      const p = event.payload;
      const saved = await tx.insert(reservations).values({ id: scopedId(rid, "opentable", p.external_id), restaurantId: rid, externalId: p.external_id, partySize: p.party_size, reservedFor: new Date(p.reserved_for), bookedAt: at, status: p.status }).onConflictDoNothing().returning();
      if (!saved.length) fail("Reservación ya registrada");
    } else if (event.event_type === "conversation") {
      const p = event.payload;
      const saved = await tx.insert(whatsappConversations).values({ id: scopedId(rid, "whatsapp", p.external_id), restaurantId: rid, startedAt: at, intent: p.intent, firstResponseSeconds: p.first_response_seconds, messageCount: 0 }).onConflictDoNothing().returning();
      if (!saved.length) fail("Conversación ya registrada");
    } else if (event.event_type === "message_status") {
      const p = event.payload;
      const messageId = scopedId(rid, "message", p.message_external_id);
      const [row] = await tx.select({ message: whatsappMessages }).from(whatsappMessages)
        .innerJoin(whatsappConversations, eq(whatsappMessages.conversationId, whatsappConversations.id))
        .where(and(eq(whatsappMessages.id, messageId), eq(whatsappConversations.restaurantId, rid)));
      if (!row) fail("Mensaje no encontrado");
      if (at < row.message.sentAt) fail("Estado anterior al envío", 400);
      const field = p.status === "delivered" ? "deliveredAt" : p.status === "read" ? "readAt" : "repliedAt";
      await tx.update(whatsappMessages).set({ [field]: sql`least(coalesce(${whatsappMessages[field]}, ${at}), ${at})` }).where(eq(whatsappMessages.id, messageId));
    } else {
      const p = event.payload;
      const conversationId = scopedId(rid, "whatsapp", p.conversation_external_id);
      const [conversation] = await tx.select().from(whatsappConversations).where(and(eq(whatsappConversations.id, conversationId), eq(whatsappConversations.restaurantId, rid)));
      if (!conversation) fail("Conversación no encontrada");
      if (at < conversation.startedAt) fail("Evento anterior a la conversación", 400);
      if (event.event_type === "message") {
        const message = event.payload;
        const templateId = message.template_name ? scopedId(rid, "template", message.template_name) : null;
        if (templateId) await tx.insert(whatsappTemplates).values({ id: templateId, restaurantId: rid, name: message.template_name! }).onConflictDoNothing();
        for (const stamp of [message.delivered_at, message.read_at, message.replied_at]) if (stamp && new Date(stamp) < at) fail("Estado anterior al envío", 400);
        const saved = await tx.insert(whatsappMessages).values({ id: scopedId(rid, "message", message.external_id), conversationId, direction: message.direction, templateId, sentAt: at, deliveredAt: message.delivered_at ? new Date(message.delivered_at) : null, readAt: message.read_at ? new Date(message.read_at) : null, repliedAt: message.replied_at ? new Date(message.replied_at) : null }).onConflictDoNothing().returning();
        if (!saved.length) fail("Mensaje ya registrado");
      } else {
        const stage = event.payload;
        let targetId: string | null = null;
        if (stage.stage === "conversion") {
          if (!stage.target_type || !stage.target_external_id) fail("Conversión requiere destino explícito", 400);
          const type = stage.target_type!;
          targetId = scopedId(rid, type === "order" ? "uber_eats" : "opentable", stage.target_external_id!);
          const table = type === "order" ? orders : reservations;
          const [target] = await tx.select().from(table).where(and(eq(table.id, targetId), eq(table.restaurantId, rid)));
          if (!target) fail("Destino de conversión no encontrado");
          await tx.update(whatsappConversations).set({ converted: true, convertedType: type }).where(eq(whatsappConversations.id, conversationId));
        }
        await tx.insert(conversationStages).values({ id: eventId, restaurantId: rid, conversationId, stage: stage.stage, occurredAt: at, targetId });
      }
    }
    const status = event.event_type === "order" && event.payload.status === "confirmed" ? "pending" : "confirmed";
    await tx.update(integrationEvents).set({ eventStatus: status, processedAt: new Date(), mipsFolio: folio, mipsStatus: folio ? "posted" : null, amount }).where(eq(integrationEvents.id, eventId));
    if (event.event_type === "pos_confirmation") {
      await tx.update(integrationEvents).set({ eventStatus: "confirmed", mipsFolio: folio, mipsStatus: "posted", processedAt: new Date() })
        .where(and(eq(integrationEvents.restaurantId, rid), eq(integrationEvents.channel, "uber_eats"), eq(integrationEvents.eventType, "order"), sql`${integrationEvents.rawMetadata}->>'orderExternalId' = ${event.payload.order_external_id}`));
    }
    return { status, mips_folio: folio, duplicate: false };
  });
}
export async function recordHeartbeat(input: unknown) {
  const payload = z.object({ status: z.enum(["connected", "error"]), message: z.string().max(500) }).parse(input);
  const access = currentAccess();
  if (access.role !== "connector" || !access.channel) fail("Emisor no autorizado", 403);
  const value = { id: scopedId(access.restaurantId, access.channel!), restaurantId: access.restaurantId, channel: access.channel!, checkedAt: new Date(), ...payload };
  await getDb().insert(connectorHealth).values(value).onConflictDoUpdate({ target: connectorHealth.id, set: value });
  return { ok: true };
}
