import { hash } from "bcryptjs";
import { count } from "drizzle-orm";
import { DEMO_EMAIL, DEMO_RESTAURANT_ID, DEMO_RESTAURANT_NAME } from "../shared/types";
import { mexicoDate, mexicoParts } from "../shared/time";
import {
  channels,
  customers,
  incidents,
  integrationEvents,
  orderItems,
  orderModifiers,
  orders,
  posSales,
  products,
  reservations,
  restaurants,
  syncEvents,
  users,
  whatsappConversations,
  whatsappMessages,
  whatsappTemplates,
} from "../shared/schema";
import { CANCEL_REASONS, FIRST_NAMES, LAST_NAMES, MODIFIERS, PREFERENCES, PRODUCT_CATALOG, WA_TEMPLATES } from "./catalog";
import { getDb } from "./db";
import { env } from "./env";
import { chance, id, int, mulberry32, pick, pickWeighted, type Rng } from "./rng";

const SEED = 20261005;
const DAYS = 90;
const ORDER_TARGET = 1200;
const RESERVATION_TARGET = 700;
const CONVERSATION_TARGET = 1500;
const CUSTOMER_TARGET = 1000;
const POS_TARGET = 1100;

const DOW_WEIGHT = [1.65, 0.68, 0.72, 0.82, 0.88, 1.42, 1.72];
const HOUR_WEIGHT = [
  0.05, 0.02, 0.01, 0.01, 0.01, 0.02, 0.05, 0.15, 0.35, 0.55, 0.7, 0.95,
  1.15, 1.55, 1.85, 1.7, 1.25, 1.05, 1.2, 1.65, 1.8, 1.7, 1.15, 0.45,
];

function dayWeight(dow: number, hour: number, forUber: boolean, forOt: boolean): number {
  let w = DOW_WEIGHT[dow]! * HOUR_WEIGHT[hour]!;
  if (dow === 0 && hour >= 14 && hour < 16) w *= forOt ? 2.4 : forUber ? 1.15 : 1.8;
  if (dow === 0 && hour >= 13 && hour < 15 && forOt) w *= 1.35;
  if (dow === 0 && hour >= 13 && hour < 15 && forUber) w *= 0.72;
  if (dow === 4 && hour >= 18 && hour < 20) w *= 0.63;
  if (dow === 6 && forOt) w *= 1.2;
  return w;
}

function randomMexicoDate(rng: Rng, now: Date, channel: "uber" | "ot" | "wa"): Date {
  const parts = mexicoParts(now);
  const start = mexicoDate(parts.year, parts.month, parts.day, 0, 0, 0);
  const slots: { dayOffset: number; hour: number; weight: number }[] = [];
  for (let d = 0; d < DAYS; d++) {
    const dt = new Date(start.getTime() - d * 86400000);
    const p = mexicoParts(dt);
    for (let h = 8; h <= 22; h++) {
      slots.push({
        dayOffset: d,
        hour: h,
        weight: dayWeight(p.weekday, h, channel === "uber", channel === "ot"),
      });
    }
  }
  const chosen = pickWeighted(
    rng,
    slots.map((s) => ({ item: s, weight: s.weight })),
  );
  const dt = new Date(start.getTime() - chosen.dayOffset * 86400000);
  const p = mexicoParts(dt);
  return mexicoDate(p.year, p.month, p.day, chosen.hour, int(rng, 0, 59), int(rng, 0, 59));
}

async function insertBatches<T extends Record<string, unknown>>(
  table: any,
  rows: T[],
  size = 150,
) {
  const db = getDb();
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size));
  }
}

export async function seedDatabase(force = false): Promise<{ seeded: boolean; restaurantId: string }> {
  const db = getDb();
  const [existing] = await db.select({ c: count() }).from(restaurants);
  if (existing && existing.c > 0 && !force) {
    return { seeded: false, restaurantId: DEMO_RESTAURANT_ID };
  }

  if (force) {
    await db.delete(orderModifiers);
    await db.delete(orderItems);
    await db.delete(whatsappMessages);
    await db.delete(whatsappConversations);
    await db.delete(whatsappTemplates);
    await db.delete(posSales);
    await db.delete(integrationEvents);
    await db.delete(syncEvents);
    await db.delete(incidents);
    await db.delete(orders);
    await db.delete(reservations);
    await db.delete(customers);
    await db.delete(products);
    await db.delete(channels);
    await db.delete(users);
    await db.delete(restaurants);
  }

  const rng = mulberry32(SEED);
  const now = new Date();
  const password = env("DEMO_PASSWORD", "MipsDemo2026!");
  const passwordHash = await hash(password, 10);

  await db.insert(restaurants).values({
    id: DEMO_RESTAURANT_ID,
    name: DEMO_RESTAURANT_NAME,
    timezone: "America/Mexico_City",
    currency: "MXN",
  });

  await db.insert(users).values({
    id: "usr_demo",
    restaurantId: DEMO_RESTAURANT_ID,
    email: DEMO_EMAIL,
    passwordHash,
    role: "owner",
  });

  const channelRows = [
    { id: "chn_uber", type: "uber_eats", status: "connected" },
    { id: "chn_ot", type: "opentable", status: "connected" },
    { id: "chn_wa", type: "whatsapp", status: "connected" },
    { id: "chn_mips", type: "mips", status: "connected" },
  ] as const;
  await db.insert(channels).values(
    channelRows.map((c) => ({
      id: c.id,
      restaurantId: DEMO_RESTAURANT_ID,
      type: c.type,
      status: c.status,
      lastEventAt: now,
      configJson: { demo: true },
    })),
  );

  const productRows = PRODUCT_CATALOG.map((p, i) => ({
    id: id("prd", i + 1),
    restaurantId: DEMO_RESTAURANT_ID,
    name: p.name,
    category: p.category,
    basePrice: p.price,
    isStar: Boolean(p.star),
  }));
  await insertBatches(products, productRows);

  const customerRows = [];
  for (let i = 0; i < CUSTOMER_TARGET; i++) {
    const first = pick(rng, FIRST_NAMES);
    const last = pick(rng, LAST_NAMES);
    const lastSeen = randomMexicoDate(rng, now, "ot");
    const firstSeen = new Date(lastSeen.getTime() - int(rng, 5, 80) * 86400000);
    const visitCount = chance(rng, 0.22) ? int(rng, 5, 14) : chance(rng, 0.45) ? int(rng, 2, 4) : 1;
    const spend = visitCount * int(rng, 28000, 92000);
    const daysSince = (now.getTime() - lastSeen.getTime()) / 86400000;
    let segment = "nuevos";
    if (daysSince > 45) segment = "inactivos";
    else if (spend > 800000 && visitCount >= 4) segment = "alto_valor";
    else if (visitCount >= 5) segment = "frecuentes";
    else if (visitCount >= 2) segment = "recurrentes";
    const chans = [];
    if (chance(rng, 0.7)) chans.push("opentable");
    if (chance(rng, 0.55)) chans.push("whatsapp");
    if (chance(rng, 0.35)) chans.push("uber_eats");
    if (chans.length === 0) chans.push("opentable");
    customerRows.push({
      id: id("cst", i + 1),
      restaurantId: DEMO_RESTAURANT_ID,
      displayName: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@correo-demo.mx`.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      phone: `55${int(rng, 10000000, 99999999)}`,
      segment,
      firstSeenAt: firstSeen,
      lastSeenAt: lastSeen,
      attributedSpend: spend,
      visitCount,
      reservationCount: visitCount > 1 ? int(rng, 1, visitCount) : chance(rng, 0.6) ? 1 : 0,
      preferencesJson: pick(rng, PREFERENCES),
      channelsJson: chans,
    });
  }
  await insertBatches(customers, customerRows);

  const angus = productRows.find((p) => p.name === "Hamburguesa Angus")!;
  const ribeye = productRows.find((p) => p.name === "Rib Eye 400 g")!;
  const weightedProducts = productRows.map((p, i) => ({
    item: p,
    weight: PRODUCT_CATALOG[i]!.weight,
  }));

  const orderRows: Array<{
    id: string;
    restaurantId: string;
    channel: string;
    externalId: string;
    status: string;
    orderedAt: Date;
    amount: number;
    customerId: string | null;
    mipsFolio: string | null;
    cancelled: boolean;
    cancelReason: string | null;
    errorFlag: boolean;
  }> = [];
  const itemRows = [];
  const modRows = [];
  const eventRows: Array<{
    id: string;
    restaurantId: string;
    channel: string;
    externalId: string;
    eventType: string;
    eventStatus: string;
    occurredAt: Date;
    receivedAt: Date;
    processedAt: Date | null;
    mipsStatus: string | null;
    mipsFolio: string | null;
    amount: number | null;
    customerId: string | null;
    rawMetadata: Record<string, unknown>;
  }> = [];
  const posRows = [];
  let folio = 21000;
  let itemSeq = 1;
  let modSeq = 1;
  let eventSeq = 1;

  for (let i = 0; i < ORDER_TARGET; i++) {
    const orderedAt = randomMexicoDate(rng, now, "uber");
    const p = mexicoParts(orderedAt);
    const sunday = p.weekday === 0;
    const cancelled = chance(rng, sunday ? 0.09 : 0.045);
    const errorFlag = false;
    const status: "cancelled" | "confirmed" | "pending" | "failed" = cancelled ? "cancelled" : "confirmed";
    const nItems = chance(rng, 0.55) ? 1 : chance(rng, 0.8) ? 2 : 3;
    const lines = [];
    for (let k = 0; k < nItems; k++) {
      const forceAngus = k === 0 && chance(rng, 0.22);
      const forceRib = k === 0 && !forceAngus && chance(rng, 0.035);
      const prod = forceAngus ? angus : forceRib ? ribeye : pickWeighted(rng, weightedProducts);
      const qty = chance(rng, 0.15) ? 2 : 1;
      const unit = prod.basePrice + int(rng, -800, 1200);
      lines.push({ prod, qty, unit, total: unit * qty });
    }
    const amount = lines.reduce((s, l) => s + l.total, 0);
    const customer = chance(rng, 0.42) ? pick(rng, customerRows) : null;
    const confirmed = status === "confirmed";
    const mipsFolio = confirmed ? `M-${folio++}` : null;
    const externalId = `UB-${10400 + i}`;
    const oid = id("ord", i + 1);
    orderRows.push({
      id: oid,
      restaurantId: DEMO_RESTAURANT_ID,
      channel: "uber_eats",
      externalId,
      status,
      orderedAt,
      amount,
      customerId: customer?.id ?? null,
      mipsFolio,
      cancelled,
      cancelReason: cancelled ? (sunday && chance(rng, 0.4) ? "Tiempo de espera" : pick(rng, CANCEL_REASONS)) : null,
      errorFlag,
    });
    for (const line of lines) {
      const iid = id("itm", itemSeq++);
      itemRows.push({
        id: iid,
        orderId: oid,
        productId: line.prod.id,
        quantity: line.qty,
        unitPrice: line.unit,
        lineTotal: line.total,
      });
      if (chance(rng, 0.48)) {
        modRows.push({
          id: id("mod", modSeq++),
          orderItemId: iid,
          name: pick(rng, MODIFIERS),
          quantity: 1,
        });
      }
    }
    const receivedAt = new Date(orderedAt.getTime() + int(rng, 2, 40) * 1000);
    const processedAt = new Date(receivedAt.getTime() + int(rng, 4, 90) * 1000);
    eventRows.push({
      id: id("evt", eventSeq++),
      restaurantId: DEMO_RESTAURANT_ID,
      channel: "uber_eats",
      externalId,
      eventType: "order",
      eventStatus: status === "confirmed" ? "confirmed" : status === "cancelled" ? "received" : status === "failed" ? "failed" : "pending",
      occurredAt: orderedAt,
      receivedAt,
      processedAt,
      mipsStatus: confirmed ? "posted" : errorFlag ? "error" : cancelled ? "skipped" : "queued",
      mipsFolio,
      amount,
      customerId: customer?.id ?? null,
      rawMetadata: { source: "mock_uber_eats", demo: true },
    });
    if (confirmed && mipsFolio) {
      posRows.push({
        id: id("pos", posRows.length + 1),
        restaurantId: DEMO_RESTAURANT_ID,
        mipsFolio,
        soldAt: processedAt ?? orderedAt,
        amount,
        channelSource: "uber_eats",
        orderId: oid,
        customerId: customer?.id ?? null,
      });
    }
  }

  const liveOrders = orderRows
    .filter((o) => o.status === "confirmed")
    .sort((a, b) => b.orderedAt.getTime() - a.orderedAt.getTime());
  const weekAgo = now.getTime() - 7 * 86400000;
  for (let i = 0; i < 3; i++) {
    const o = liveOrders[i];
    if (!o) continue;
    o.status = "pending";
    o.mipsFolio = null;
  }
  for (let i = 3; i < 5; i++) {
    const o = liveOrders[i];
    if (!o) continue;
    o.status = "failed";
    o.errorFlag = true;
    o.mipsFolio = null;
  }
  let reprocessed = 0;
  for (const o of liveOrders.slice(5)) {
    if (o.orderedAt.getTime() >= weekAgo && reprocessed < 6) {
      o.errorFlag = true;
      reprocessed += 1;
    }
  }
  const blocked = new Set(orderRows.filter((o) => o.status !== "confirmed").map((o) => o.id));
  for (let i = posRows.length - 1; i >= 0; i--) {
    if (posRows[i]?.orderId && blocked.has(posRows[i]!.orderId!)) posRows.splice(i, 1);
  }
  for (const ev of eventRows) {
    const o = orderRows.find((row) => row.externalId === ev.externalId);
    if (!o) continue;
    ev.eventStatus =
      o.status === "confirmed" ? "confirmed" : o.status === "failed" ? "failed" : o.status === "pending" ? "pending" : "received";
    ev.mipsFolio = o.mipsFolio;
    ev.mipsStatus = o.status === "confirmed" ? "posted" : o.errorFlag ? "error" : o.cancelled ? "skipped" : "queued";
  }

  const reservationRows = [];
  const otStatuses = [
    { item: "completed", weight: 62 },
    { item: "confirmed", weight: 12 },
    { item: "seated", weight: 6 },
    { item: "cancelled", weight: 12 },
    { item: "no_show", weight: 8 },
  ];
  for (let i = 0; i < RESERVATION_TARGET; i++) {
    const reservedFor = randomMexicoDate(rng, now, "ot");
    const p = mexicoParts(reservedFor);
    const lead = pickWeighted(rng, [
      { item: 0, weight: 18 },
      { item: 1, weight: 22 },
      { item: 2, weight: 16 },
      { item: 4, weight: 20 },
      { item: 6, weight: 12 },
      { item: 10, weight: 8 },
      { item: 16, weight: 4 },
    ]);
    const bookedAt = new Date(reservedFor.getTime() - lead * 86400000 - int(rng, 0, 8) * 3600000);
    let party = pickWeighted(rng, [
      { item: 2, weight: 42 },
      { item: 3, weight: 12 },
      { item: 4, weight: 26 },
      { item: 5, weight: 8 },
      { item: 6, weight: 7 },
      { item: 8, weight: 5 },
    ]);
    if (p.weekday === 6) {
      party = pickWeighted(rng, [
        { item: 2, weight: 22 },
        { item: 4, weight: 28 },
        { item: 6, weight: 24 },
        { item: 8, weight: 16 },
        { item: 10, weight: 10 },
      ]);
    }
    const status = pickWeighted(rng, otStatuses);
    const customer = chance(rng, 0.78) ? pick(rng, customerRows) : null;
    const externalId = `OT-${3800 + i}`;
    reservationRows.push({
      id: id("rsv", i + 1),
      restaurantId: DEMO_RESTAURANT_ID,
      externalId,
      customerId: customer?.id ?? null,
      partySize: party,
      reservedFor,
      bookedAt,
      status,
      mipsFolio: null,
    });
    eventRows.push({
      id: id("evt", eventSeq++),
      restaurantId: DEMO_RESTAURANT_ID,
      channel: "opentable",
      externalId,
      eventType: "reservation",
      eventStatus: status === "cancelled" || status === "no_show" ? "received" : "confirmed",
      occurredAt: reservedFor,
      receivedAt: bookedAt,
      processedAt: bookedAt,
      mipsStatus: null,
      mipsFolio: null,
      amount: null,
      customerId: customer?.id ?? null,
      rawMetadata: { source: "mock_opentable", demo: true },
    });
  }

  const intentWeights = [
    { item: "reservaciones", weight: 41 },
    { item: "pedidos", weight: 14 },
    { item: "horarios", weight: 12 },
    { item: "ubicacion", weight: 8 },
    { item: "menu", weight: 9 },
    { item: "eventos", weight: 5 },
    { item: "quejas", weight: 4 },
    { item: "otros", weight: 7 },
  ];
  const convRows = [];
  const msgRows = [];
  let msgSeq = 1;
  const templateStats = WA_TEMPLATES.map((name) => ({
    name,
    sent: 0,
    delivered: 0,
    read: 0,
    replied: 0,
  }));

  for (let i = 0; i < CONVERSATION_TARGET; i++) {
    const startedAt = randomMexicoDate(rng, now, "wa");
    const intent = pickWeighted(rng, intentWeights);
    const converted = intent === "reservaciones" ? chance(rng, 0.18) : intent === "pedidos" ? chance(rng, 0.12) : false;
    const customer = chance(rng, 0.6) ? pick(rng, customerRows) : null;
    const cid = id("wac", i + 1);
    const firstResponse = int(rng, 25, 280);
    const messageCount = int(rng, 2, 7);
    convRows.push({
      id: cid,
      restaurantId: DEMO_RESTAURANT_ID,
      customerId: customer?.id ?? null,
      startedAt,
      intent,
      converted,
      convertedType: converted ? (intent === "pedidos" ? "pedido" : "reservacion") : null,
      firstResponseSeconds: firstResponse,
      messageCount,
    });
    for (let m = 0; m < Math.min(messageCount, 3); m++) {
      const direction = m % 2 === 0 ? "in" : "out";
      const sentAt = new Date(startedAt.getTime() + m * firstResponse * 1000);
      const deliveredAt = direction === "out" ? new Date(sentAt.getTime() + int(rng, 1, 8) * 1000) : sentAt;
      const readAt = chance(rng, 0.82) ? new Date(deliveredAt.getTime() + int(rng, 5, 120) * 1000) : null;
      const useTemplate = direction === "out" && chance(rng, 0.35);
      const tplIndex = useTemplate ? int(rng, 0, templateStats.length - 1) : -1;
      if (tplIndex >= 0) {
        templateStats[tplIndex]!.sent += 1;
        templateStats[tplIndex]!.delivered += 1;
        if (readAt) templateStats[tplIndex]!.read += 1;
        if (m < messageCount - 1) templateStats[tplIndex]!.replied += 1;
      }
      msgRows.push({
        id: id("wam", msgSeq++),
        conversationId: cid,
        direction,
        templateId: tplIndex >= 0 ? id("tpl", tplIndex + 1) : null,
        sentAt,
        deliveredAt,
        readAt,
        bodyPreview: direction === "in" ? `Consulta de ${intent}` : "Respuesta del restaurante",
      });
    }
    eventRows.push({
      id: id("evt", eventSeq++),
      restaurantId: DEMO_RESTAURANT_ID,
      channel: "whatsapp",
      externalId: `WA-${2800 + i}`,
      eventType: "conversation",
      eventStatus: "received",
      occurredAt: startedAt,
      receivedAt: startedAt,
      processedAt: startedAt,
      mipsStatus: null,
      mipsFolio: null,
      amount: null,
      customerId: customer?.id ?? null,
      rawMetadata: { source: "mock_whatsapp", demo: true },
    });
  }

  while (posRows.length < POS_TARGET) {
    const extraAt = randomMexicoDate(rng, now, "uber");
    const amount = int(rng, 18000, 98000);
    const folioId = `M-${folio++}`;
    posRows.push({
      id: id("pos", posRows.length + 1),
      restaurantId: DEMO_RESTAURANT_ID,
      mipsFolio: folioId,
      soldAt: extraAt,
      amount,
      channelSource: chance(rng, 0.55) ? "uber_eats" : "walk_in",
      orderId: null,
      customerId: chance(rng, 0.3) ? pick(rng, customerRows).id : null,
    });
    eventRows.push({
      id: id("evt", eventSeq++),
      restaurantId: DEMO_RESTAURANT_ID,
      channel: "mips",
      externalId: folioId,
      eventType: "sale",
      eventStatus: "confirmed",
      occurredAt: extraAt,
      receivedAt: extraAt,
      processedAt: extraAt,
      mipsStatus: "posted",
      mipsFolio: folioId,
      amount,
      customerId: null,
      rawMetadata: { source: "mock_mips", demo: true },
    });
  }

  const incidentAnchor = new Date(now.getTime() - 18 * 86400000);
  const incidentRows = [
    {
      id: "inc_001",
      restaurantId: DEMO_RESTAURANT_ID,
      channel: "uber_eats",
      title: "Reproceso de pedidos Uber Eats",
      description: "Varios pedidos requirieron reprocesamiento y se normalizaron el mismo día.",
      occurredAt: new Date(incidentAnchor.getTime() + 2 * 3600000),
      resolvedAt: new Date(incidentAnchor.getTime() + 5 * 3600000),
      status: "resolved",
    },
    {
      id: "inc_002",
      restaurantId: DEMO_RESTAURANT_ID,
      channel: "mips",
      title: "Timeout temporal con Míps",
      description: "El conector local tardó en responder. El Hub reintentó y confirmó los folios.",
      occurredAt: new Date(incidentAnchor.getTime() + 6 * 3600000),
      resolvedAt: new Date(incidentAnchor.getTime() + 7 * 3600000),
      status: "resolved",
    },
    {
      id: "inc_003",
      restaurantId: DEMO_RESTAURANT_ID,
      channel: "opentable",
      title: "Sincronización OpenTable",
      description: "Reservaciones retrasadas 4 minutos; se completó la cola.",
      occurredAt: new Date(now.getTime() - 2 * 86400000),
      resolvedAt: new Date(now.getTime() - 2 * 86400000 + 20 * 60000),
      status: "resolved",
    },
  ];

  const syncRows = [
    {
      id: "syn_001",
      restaurantId: DEMO_RESTAURANT_ID,
      channel: "uber_eats",
      message: "Pedido Uber reprocesado correctamente.",
      occurredAt: new Date(now.getTime() - 2.3 * 3600000),
      severity: "info",
    },
    {
      id: "syn_002",
      restaurantId: DEMO_RESTAURANT_ID,
      channel: "mips",
      message: "Timeout temporal con Míps.",
      occurredAt: new Date(now.getTime() - 4.8 * 3600000),
      severity: "warning",
    },
    {
      id: "syn_003",
      restaurantId: DEMO_RESTAURANT_ID,
      channel: "opentable",
      message: "OpenTable sincronizado.",
      occurredAt: new Date(now.getTime() - 5.2 * 3600000),
      severity: "info",
    },
    {
      id: "syn_004",
      restaurantId: DEMO_RESTAURANT_ID,
      channel: "whatsapp",
      message: "Plantillas de WhatsApp actualizadas.",
      occurredAt: new Date(now.getTime() - 26 * 3600000),
      severity: "info",
    },
  ];

  const templateRows = WA_TEMPLATES.map((name, i) => ({
    id: id("tpl", i + 1),
    restaurantId: DEMO_RESTAURANT_ID,
    name,
    sent: templateStats[i]!.sent + int(rng, 40, 90),
    delivered: templateStats[i]!.delivered + int(rng, 38, 88),
    read: templateStats[i]!.read + int(rng, 20, 70),
    replied: templateStats[i]!.replied + int(rng, 8, 28),
  }));

  await insertBatches(orders, orderRows);
  await insertBatches(orderItems, itemRows);
  await insertBatches(orderModifiers, modRows);
  await insertBatches(reservations, reservationRows);
  await insertBatches(whatsappConversations, convRows);
  await insertBatches(whatsappMessages, msgRows);
  await insertBatches(whatsappTemplates, templateRows);
  await insertBatches(posSales, posRows);
  await insertBatches(integrationEvents, eventRows);
  await insertBatches(syncEvents, syncRows);
  await insertBatches(incidents, incidentRows);

  return { seeded: true, restaurantId: DEMO_RESTAURANT_ID };
}
