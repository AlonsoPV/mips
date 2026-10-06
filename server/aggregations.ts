import { and, avg, count, desc, eq, gte, lte, or, sql, sum } from "drizzle-orm";
import {
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
  whatsappConversations,
  whatsappMessages,
  whatsappTemplates,
} from "../shared/schema";
import type { KpiValue } from "../shared/types";
import { adaptersFor } from "./adapters";
import { getDb } from "./db";
import { deltaPct, type PeriodRange } from "./period";

const RID = "rst_demo";

function kpi(
  label: string,
  tooltip: string,
  value: number,
  previous: number,
  unit: KpiValue["unit"] = "count",
): KpiValue {
  return { label, tooltip, value, previousValue: previous, deltaPct: deltaPct(value, previous), unit };
}

function inRange(column: Date | unknown, from: Date, to: Date) {
  return and(gte(column as any, from), lte(column as any, to));
}

export async function restaurantInfo() {
  const db = getDb();
  const [row] = await db.select().from(restaurants).where(eq(restaurants.id, RID)).limit(1);
  return row;
}

export async function dashboardSummary(period: PeriodRange) {
  const db = getDb();
  const { from, to, previousFrom, previousTo } = period;

  const [[eventsNow], [eventsPrev]] = await Promise.all([
    db.select({ c: count() }).from(integrationEvents).where(and(eq(integrationEvents.restaurantId, RID), inRange(integrationEvents.occurredAt, from, to))),
    db.select({ c: count() }).from(integrationEvents).where(and(eq(integrationEvents.restaurantId, RID), inRange(integrationEvents.occurredAt, previousFrom, previousTo))),
  ]);

  const [[salesNow], [salesPrev]] = await Promise.all([
    db
      .select({ c: count(), s: sum(orders.amount) })
      .from(orders)
      .where(and(eq(orders.restaurantId, RID), eq(orders.status, "confirmed"), inRange(orders.orderedAt, from, to))),
    db
      .select({ c: count(), s: sum(orders.amount) })
      .from(orders)
      .where(and(eq(orders.restaurantId, RID), eq(orders.status, "confirmed"), inRange(orders.orderedAt, previousFrom, previousTo))),
  ]);

  const sales = Number(salesNow.s ?? 0);
  const salesP = Number(salesPrev.s ?? 0);
  const tickets = Number(salesNow.c ?? 0);
  const ticketsP = Number(salesPrev.c ?? 0);

  const [[coversNow], [coversPrev]] = await Promise.all([
    db
      .select({ s: sum(reservations.partySize), c: count() })
      .from(reservations)
      .where(
        and(
          eq(reservations.restaurantId, RID),
          inRange(reservations.reservedFor, from, to),
          sql`${reservations.status} not in ('cancelled','no_show')`,
        ),
      ),
    db
      .select({ s: sum(reservations.partySize), c: count() })
      .from(reservations)
      .where(
        and(
          eq(reservations.restaurantId, RID),
          inRange(reservations.reservedFor, previousFrom, previousTo),
          sql`${reservations.status} not in ('cancelled','no_show')`,
        ),
      ),
  ]);

  const [[uberNow], [uberPrev], [otNow], [otPrev], [waNow], [waPrev]] = await Promise.all([
    db.select({ c: count() }).from(orders).where(and(eq(orders.restaurantId, RID), inRange(orders.orderedAt, from, to))),
    db.select({ c: count() }).from(orders).where(and(eq(orders.restaurantId, RID), inRange(orders.orderedAt, previousFrom, previousTo))),
    db.select({ c: count() }).from(reservations).where(and(eq(reservations.restaurantId, RID), inRange(reservations.reservedFor, from, to))),
    db.select({ c: count() }).from(reservations).where(and(eq(reservations.restaurantId, RID), inRange(reservations.reservedFor, previousFrom, previousTo))),
    db.select({ c: count() }).from(whatsappConversations).where(and(eq(whatsappConversations.restaurantId, RID), inRange(whatsappConversations.startedAt, from, to))),
    db.select({ c: count() }).from(whatsappConversations).where(and(eq(whatsappConversations.restaurantId, RID), inRange(whatsappConversations.startedAt, previousFrom, previousTo))),
  ]);

  const [[mipsNow], [mipsPrev]] = await Promise.all([
    db
      .select({ c: count() })
      .from(posSales)
      .where(and(eq(posSales.restaurantId, RID), eq(posSales.channelSource, "uber_eats"), inRange(posSales.soldAt, from, to))),
    db
      .select({ c: count() })
      .from(posSales)
      .where(and(eq(posSales.restaurantId, RID), eq(posSales.channelSource, "uber_eats"), inRange(posSales.soldAt, previousFrom, previousTo))),
  ]);

  const channel = (metric: string, value: number, previous: number) => ({
    metric,
    value,
    previous,
    deltaPct: deltaPct(value, previous),
  });

  return {
    period: { from: from.toISOString(), to: to.toISOString(), label: period.label },
    kpis: [
      kpi("Actividad digital", "Eventos relevantes de Uber Eats, OpenTable y WhatsApp en el periodo.", Number(eventsNow.c), Number(eventsPrev.c)),
      kpi(
        "Ventas digitales confirmadas",
        "Ventas provenientes de canales digitales que pudieron relacionarse con un folio de Míps.",
        sales,
        salesP,
        "currency",
      ),
      kpi("Ticket promedio", "Importe promedio de pedidos Uber Eats confirmados y vinculados a Míps.", tickets ? Math.round(sales / tickets) : 0, ticketsP ? Math.round(salesP / ticketsP) : 0, "currency"),
      kpi("Comensales reservados", "Suma de personas en reservaciones OpenTable activas (excluye canceladas y no-show).", Number(coversNow.s ?? 0), Number(coversPrev.s ?? 0)),
    ],
    channels: {
      uber_eats: channel("Pedidos", Number(uberNow.c), Number(uberPrev.c)),
      opentable: channel("Reservaciones", Number(otNow.c), Number(otPrev.c)),
      whatsapp: channel("Conversaciones", Number(waNow.c), Number(waPrev.c)),
      mips: channel("Ventas confirmadas", Number(mipsNow.c), Number(mipsPrev.c)),
    },
  };
}

export async function demandHeatmap(period: PeriodRange) {
  const db = getDb();
  const { from, to } = period;
  const hourExpr = (col: any) => sql<number>`extract(hour from (${col} at time zone 'America/Mexico_City'))`.mapWith(Number);
  const dowExpr = (col: any) => sql<number>`extract(dow from (${col} at time zone 'America/Mexico_City'))`.mapWith(Number);

  const [uber, ot, wa] = await Promise.all([
    db
      .select({ dow: dowExpr(orders.orderedAt), hour: hourExpr(orders.orderedAt), c: count() })
      .from(orders)
      .where(and(eq(orders.restaurantId, RID), inRange(orders.orderedAt, from, to)))
      .groupBy(dowExpr(orders.orderedAt), hourExpr(orders.orderedAt)),
    db
      .select({ dow: dowExpr(reservations.reservedFor), hour: hourExpr(reservations.reservedFor), c: count() })
      .from(reservations)
      .where(and(eq(reservations.restaurantId, RID), inRange(reservations.reservedFor, from, to)))
      .groupBy(dowExpr(reservations.reservedFor), hourExpr(reservations.reservedFor)),
    db
      .select({ dow: dowExpr(whatsappConversations.startedAt), hour: hourExpr(whatsappConversations.startedAt), c: count() })
      .from(whatsappConversations)
      .where(and(eq(whatsappConversations.restaurantId, RID), inRange(whatsappConversations.startedAt, from, to)))
      .groupBy(dowExpr(whatsappConversations.startedAt), hourExpr(whatsappConversations.startedAt)),
  ]);

  const key = (d: number, h: number) => `${d}-${h}`;
  const map = new Map<string, { uber: number; ot: number; wa: number }>();
  const bump = (rows: { dow: number; hour: number; c: number }[], field: "uber" | "ot" | "wa") => {
    for (const r of rows) {
      const k = key(Number(r.dow), Number(r.hour));
      const cur = map.get(k) ?? { uber: 0, ot: 0, wa: 0 };
      cur[field] = Number(r.c);
      map.set(k, cur);
    }
  };
  bump(uber, "uber");
  bump(ot, "ot");
  bump(wa, "wa");

  const cells = [];
  let max = 1;
  let peak = { dow: 0, hour: 14, total: 0 };
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 8; hour <= 22; hour++) {
      const v = map.get(key(dow, hour)) ?? { uber: 0, ot: 0, wa: 0 };
      const total = v.uber + v.ot + v.wa;
      if (total > max) max = total;
      if (total > peak.total) peak = { dow, hour, total };
      cells.push({ dow, hour, ...v, total });
    }
  }
  const normalized = cells.map((c) => ({ ...c, intensity: c.total / max }));
  return { cells: normalized, peak, max };
}

export async function uberSummary(period: PeriodRange) {
  const db = getDb();
  const { from, to, previousFrom, previousTo } = period;

  const stats = async (a: Date, b: Date) => {
    const [row] = await db
      .select({
        orders: count(),
        sales: sum(orders.amount),
        cancelled: sql<number>`sum(case when ${orders.cancelled} then 1 else 0 end)`.mapWith(Number),
        errors: sql<number>`sum(case when ${orders.errorFlag} then 1 else 0 end)`.mapWith(Number),
      })
      .from(orders)
      .where(and(eq(orders.restaurantId, RID), inRange(orders.orderedAt, a, b)));
    const [conf] = await db
      .select({ c: count(), s: sum(orders.amount) })
      .from(orders)
      .where(and(eq(orders.restaurantId, RID), eq(orders.status, "confirmed"), inRange(orders.orderedAt, a, b)));
    return { ...row, confirmed: Number(conf.c), confirmedSales: Number(conf.s ?? 0) };
  };

  const nowS = await stats(from, to);
  const prevS = await stats(previousFrom, previousTo);
  const ticket = nowS.confirmed ? Math.round(nowS.confirmedSales / nowS.confirmed) : 0;
  const ticketP = prevS.confirmed ? Math.round(prevS.confirmedSales / prevS.confirmed) : 0;
  const cancelRate = Number(nowS.orders) ? Number(nowS.cancelled) / Number(nowS.orders) : 0;

  const dayExpr = sql<string>`to_char(date_trunc('day', ${orders.orderedAt} at time zone 'America/Mexico_City'), 'YYYY-MM-DD')`;
  const byDay = await db
    .select({ day: dayExpr, sales: sum(orders.amount), orders: count() })
    .from(orders)
    .where(and(eq(orders.restaurantId, RID), eq(orders.status, "confirmed"), inRange(orders.orderedAt, from, to)))
    .groupBy(dayExpr)
    .orderBy(dayExpr);

  const hourExpr = sql<number>`extract(hour from (${orders.orderedAt} at time zone 'America/Mexico_City'))`.mapWith(Number);
  const byHour = await db
    .select({ hour: hourExpr, c: count() })
    .from(orders)
    .where(and(eq(orders.restaurantId, RID), inRange(orders.orderedAt, from, to)))
    .groupBy(hourExpr)
    .orderBy(hourExpr);

  const top = await db
    .select({
      productId: products.id,
      name: products.name,
      quantity: sum(orderItems.quantity),
      sales: sum(orderItems.lineTotal),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(and(eq(orders.restaurantId, RID), inRange(orders.orderedAt, from, to), eq(orders.cancelled, false)))
    .groupBy(products.id, products.name)
    .orderBy(desc(sum(orderItems.lineTotal)))
    .limit(12);

  const topPrev = await db
    .select({
      productId: products.id,
      name: products.name,
      sales: sum(orderItems.lineTotal),
      quantity: sum(orderItems.quantity),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(and(eq(orders.restaurantId, RID), inRange(orders.orderedAt, previousFrom, previousTo), eq(orders.cancelled, false)))
    .groupBy(products.id, products.name);

  const prevMap = new Map(topPrev.map((p) => [p.productId, p]));
  const growth = top.map((p) => {
    const prev = prevMap.get(p.productId);
    const prevSales = Number(prev?.sales ?? 0);
    return {
      ...p,
      quantity: Number(p.quantity ?? 0),
      sales: Number(p.sales ?? 0),
      ticket: Number(p.quantity) ? Math.round(Number(p.sales) / Number(p.quantity)) : 0,
      growthPct: prevSales ? ((Number(p.sales) - prevSales) / prevSales) * 100 : null,
    };
  });

  const modifiers = await db
    .select({ name: orderModifiers.name, c: count() })
    .from(orderModifiers)
    .innerJoin(orderItems, eq(orderModifiers.orderItemId, orderItems.id))
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.restaurantId, RID), inRange(orders.orderedAt, from, to)))
    .groupBy(orderModifiers.name)
    .orderBy(desc(count()))
    .limit(8);

  const cancels = await db
    .select({ reason: orders.cancelReason, c: count() })
    .from(orders)
    .where(and(eq(orders.restaurantId, RID), eq(orders.cancelled, true), inRange(orders.orderedAt, from, to)))
    .groupBy(orders.cancelReason)
    .orderBy(desc(count()));

  const allProductSales = await db
    .select({ sales: sum(orderItems.lineTotal) })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.restaurantId, RID), inRange(orders.orderedAt, from, to), eq(orders.cancelled, false)))
    .groupBy(orderItems.productId)
    .orderBy(desc(sum(orderItems.lineTotal)));

  const totals = allProductSales.map((r) => Number(r.sales ?? 0));
  const grand = totals.reduce((a, b) => a + b, 0);
  const top20count = Math.max(1, Math.ceil(totals.length * 0.2));
  const paretoShare = grand ? totals.slice(0, top20count).reduce((a, b) => a + b, 0) / grand : 0;

  return {
    kpis: [
      kpi("Pedidos", "Pedidos de Uber Eats recibidos durante el periodo seleccionado.", Number(nowS.orders), Number(prevS.orders)),
      kpi("Ventas confirmadas", "Pedidos confirmados y vinculados a un folio de Míps.", nowS.confirmedSales, prevS.confirmedSales, "currency"),
      kpi("Ticket promedio", "Venta confirmada dividida entre pedidos confirmados.", ticket, ticketP, "currency"),
      kpi("Cancelación", "Porcentaje de pedidos Uber Eats cancelados.", Math.round(cancelRate * 1000) / 10, Number(prevS.orders) ? Math.round((Number(prevS.cancelled) / Number(prevS.orders)) * 1000) / 10 : 0, "percent"),
      kpi("Operaciones con error", "Pedidos que requirieron reproceso o quedaron en error.", Number(nowS.errors), Number(prevS.errors)),
    ],
    byDay: byDay.map((d) => ({ day: d.day, sales: Number(d.sales ?? 0), orders: Number(d.orders) })),
    byHour: byHour.map((h) => ({ hour: Number(h.hour), orders: Number(h.c) })),
    topProducts: growth,
    modifiers: modifiers.map((m) => ({ name: m.name, count: Number(m.c) })),
    cancellations: cancels.map((c) => ({
      reason: c.reason ?? "Sin motivo",
      count: Number(c.c),
      pct: Number(nowS.cancelled) ? Math.round((Number(c.c) / Number(nowS.cancelled)) * 1000) / 10 : 0,
    })),
    growingProducts: [...growth].filter((g) => g.growthPct !== null).sort((a, b) => (b.growthPct ?? 0) - (a.growthPct ?? 0)).slice(0, 6),
    pareto: { share: paretoShare, topCount: top20count, totalProducts: totals.length },
  };
}

export async function opentableSummary(period: PeriodRange) {
  const db = getDb();
  const { from, to, previousFrom, previousTo } = period;

  const stats = async (a: Date, b: Date) => {
    const [row] = await db
      .select({
        c: count(),
        covers: sum(reservations.partySize),
        avgSize: avg(reservations.partySize),
        cancelled: sql<number>`sum(case when ${reservations.status} = 'cancelled' then 1 else 0 end)`.mapWith(Number),
        noshow: sql<number>`sum(case when ${reservations.status} = 'no_show' then 1 else 0 end)`.mapWith(Number),
      })
      .from(reservations)
      .where(and(eq(reservations.restaurantId, RID), inRange(reservations.reservedFor, a, b)));
    return row;
  };
  const nowS = await stats(from, to);
  const prevS = await stats(previousFrom, previousTo);

  const dayExpr = sql<string>`to_char(date_trunc('day', ${reservations.reservedFor} at time zone 'America/Mexico_City'), 'YYYY-MM-DD')`;
  const byDay = await db
    .select({ day: dayExpr, c: count(), covers: sum(reservations.partySize) })
    .from(reservations)
    .where(and(eq(reservations.restaurantId, RID), inRange(reservations.reservedFor, from, to)))
    .groupBy(dayExpr)
    .orderBy(dayExpr);

  const hourExpr = sql<number>`extract(hour from (${reservations.reservedFor} at time zone 'America/Mexico_City'))`.mapWith(Number);
  const dowExpr = sql<number>`extract(dow from (${reservations.reservedFor} at time zone 'America/Mexico_City'))`.mapWith(Number);
  const heat = await db
    .select({ dow: dowExpr, hour: hourExpr, c: count() })
    .from(reservations)
    .where(and(eq(reservations.restaurantId, RID), inRange(reservations.reservedFor, from, to)))
    .groupBy(dowExpr, hourExpr);

  const sizeRows = await db
    .select({ size: reservations.partySize, c: count() })
    .from(reservations)
    .where(and(eq(reservations.restaurantId, RID), inRange(reservations.reservedFor, from, to)))
    .groupBy(reservations.partySize);

  const buckets = { "2": 0, "3-4": 0, "5-6": 0, "7+": 0 };
  for (const r of sizeRows) {
    const s = Number(r.size);
    const n = Number(r.c);
    if (s <= 2) buckets["2"] += n;
    else if (s <= 4) buckets["3-4"] += n;
    else if (s <= 6) buckets["5-6"] += n;
    else buckets["7+"] += n;
  }

  const leadExpr = sql<number>`greatest(0, floor(extract(epoch from (${reservations.reservedFor} - ${reservations.bookedAt})) / 86400))`.mapWith(Number);
  const leads = await db
    .select({ lead: leadExpr, c: count() })
    .from(reservations)
    .where(and(eq(reservations.restaurantId, RID), inRange(reservations.reservedFor, from, to)))
    .groupBy(leadExpr);

  const leadBuckets = { "Mismo día": 0, "1–2 días": 0, "3–7 días": 0, "7+ días": 0 };
  for (const r of leads) {
    const d = Number(r.lead);
    const n = Number(r.c);
    if (d <= 0) leadBuckets["Mismo día"] += n;
    else if (d <= 2) leadBuckets["1–2 días"] += n;
    else if (d <= 7) leadBuckets["3–7 días"] += n;
    else leadBuckets["7+ días"] += n;
  }

  const states = await db
    .select({ status: reservations.status, c: count() })
    .from(reservations)
    .where(and(eq(reservations.restaurantId, RID), inRange(reservations.reservedFor, from, to)))
    .groupBy(reservations.status);

  const returning = await db
    .select({ c: sql<number>`count(distinct ${reservations.customerId})`.mapWith(Number) })
    .from(reservations)
    .innerJoin(customers, eq(reservations.customerId, customers.id))
    .where(
      and(
        eq(reservations.restaurantId, RID),
        inRange(reservations.reservedFor, from, to),
        sql`${customers.visitCount} > 1`,
      ),
    );

  return {
    kpis: [
      kpi("Reservaciones", "Reservaciones OpenTable con hora de visita en el periodo.", Number(nowS.c), Number(prevS.c)),
      kpi("Comensales", "Suma de tamaño de mesa.", Number(nowS.covers ?? 0), Number(prevS.covers ?? 0)),
      kpi("Tamaño promedio de mesa", "Personas promedio por reservación.", Math.round(Number(nowS.avgSize ?? 0) * 10) / 10, Math.round(Number(prevS.avgSize ?? 0) * 10) / 10),
      kpi("Cancelaciones", "Reservaciones canceladas.", Number(nowS.cancelled), Number(prevS.cancelled)),
      kpi("No-show", "Reservaciones marcadas como no-show en el dataset demo.", Number(nowS.noshow), Number(prevS.noshow)),
    ],
    byDay: byDay.map((d) => ({ day: d.day, reservations: Number(d.c), covers: Number(d.covers ?? 0) })),
    heatmap: heat.map((h) => ({ dow: Number(h.dow), hour: Number(h.hour), count: Number(h.c) })),
    partySize: Object.entries(buckets).map(([label, value]) => ({ label, value })),
    leadTime: Object.entries(leadBuckets).map(([label, value]) => ({ label, value })),
    states: states.map((s) => ({ status: s.status, count: Number(s.c) })),
    returningCustomers: Number(returning[0]?.c ?? 0),
    disclaimer: "Disponibilidad sujeta al acceso autorizado de OpenTable.",
  };
}

export async function whatsappSummary(period: PeriodRange) {
  const db = getDb();
  const { from, to, previousFrom, previousTo } = period;
  const stats = async (a: Date, b: Date) => {
    const [row] = await db
      .select({
        c: count(),
        uniqueC: sql<number>`count(distinct ${whatsappConversations.customerId})`.mapWith(Number),
        avgResp: avg(whatsappConversations.firstResponseSeconds),
        converted: sql<number>`sum(case when ${whatsappConversations.converted} then 1 else 0 end)`.mapWith(Number),
      })
      .from(whatsappConversations)
      .where(and(eq(whatsappConversations.restaurantId, RID), inRange(whatsappConversations.startedAt, a, b)));
    return row;
  };
  const nowS = await stats(from, to);
  const prevS = await stats(previousFrom, previousTo);

  const [msgNow] = await db
    .select({
      sent: sql<number>`sum(case when ${whatsappMessages.direction} = 'out' then 1 else 0 end)`.mapWith(Number),
      read: sql<number>`sum(case when ${whatsappMessages.readAt} is not null then 1 else 0 end)`.mapWith(Number),
    })
    .from(whatsappMessages)
    .innerJoin(whatsappConversations, eq(whatsappMessages.conversationId, whatsappConversations.id))
    .where(and(eq(whatsappConversations.restaurantId, RID), inRange(whatsappConversations.startedAt, from, to)));

  const [msgPrev] = await db
    .select({
      sent: sql<number>`sum(case when ${whatsappMessages.direction} = 'out' then 1 else 0 end)`.mapWith(Number),
    })
    .from(whatsappMessages)
    .innerJoin(whatsappConversations, eq(whatsappMessages.conversationId, whatsappConversations.id))
    .where(and(eq(whatsappConversations.restaurantId, RID), inRange(whatsappConversations.startedAt, previousFrom, previousTo)));

  const intents = await db
    .select({ intent: whatsappConversations.intent, c: count() })
    .from(whatsappConversations)
    .where(and(eq(whatsappConversations.restaurantId, RID), inRange(whatsappConversations.startedAt, from, to)))
    .groupBy(whatsappConversations.intent)
    .orderBy(desc(count()));

  const hourExpr = sql<number>`extract(hour from (${whatsappConversations.startedAt} at time zone 'America/Mexico_City'))`.mapWith(Number);
  const byHour = await db
    .select({ hour: hourExpr, c: count() })
    .from(whatsappConversations)
    .where(and(eq(whatsappConversations.restaurantId, RID), inRange(whatsappConversations.startedAt, from, to)))
    .groupBy(hourExpr)
    .orderBy(hourExpr);

  const templates = await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.restaurantId, RID));

  const withIntent = Number(nowS.c);
  const converted = Number(nowS.converted);
  return {
    kpis: [
      kpi("Conversaciones", "Hilos de WhatsApp iniciados en el periodo. No son ventas.", Number(nowS.c), Number(prevS.c)),
      kpi("Clientes únicos", "Conversaciones con identificador de cliente compatible.", Number(nowS.uniqueC), Number(prevS.uniqueC)),
      kpi("Tiempo medio de primera respuesta", "Métrica demo de primera respuesta del restaurante.", Math.round(Number(nowS.avgResp ?? 0)), Math.round(Number(prevS.avgResp ?? 0)), "seconds"),
      kpi("Mensajes enviados", "Mensajes de salida en el periodo.", Number(msgNow.sent ?? 0), Number(msgPrev.sent ?? 0)),
      kpi("Mensajes leídos", "Mensajes con marca de lectura en el dataset demo.", Number(msgNow.read ?? 0), 0),
      kpi("Solicitudes convertidas", "Conversiones explícitamente relacionadas (reservación o pedido).", converted, Number(prevS.converted)),
    ],
    intents: intents.map((i) => ({ intent: i.intent, count: Number(i.c) })),
    byHour: byHour.map((h) => ({ hour: Number(h.hour), conversations: Number(h.c) })),
    funnel: {
      conversacion: withIntent,
      intencion: withIntent,
      solicitud: Math.round(withIntent * 0.46),
      conversion: converted,
    },
    templates,
    disclaimer: "Las métricas reales dependerán de las capacidades y permisos de WhatsApp Business API.",
  };
}

export async function customersSummary(period: PeriodRange) {
  const db = getDb();
  const { from, to } = period;
  const all = await db.select().from(customers).where(eq(customers.restaurantId, RID));
  const identifiable = all.length;
  const recurrentes = all.filter((c) => c.visitCount >= 2 && c.segment !== "inactivos").length;
  const nuevos = all.filter((c) => c.segment === "nuevos").length;
  const freq = all.reduce((s, c) => s + c.visitCount, 0) / Math.max(1, all.length);
  const spend = all.reduce((s, c) => s + c.attributedSpend, 0);
  const segments: Record<string, number> = {};
  for (const c of all) segments[c.segment] = (segments[c.segment] ?? 0) + 1;

  const toRow = (c: (typeof all)[number]) => ({
    id: c.id,
    displayName: c.displayName,
    channels: c.channelsJson as string[] | null,
    lastSeenAt: c.lastSeenAt,
    reservationCount: c.reservationCount,
    attributedSpend: c.attributedSpend,
    visitCount: c.visitCount,
    segment: c.segment,
    preferences: c.preferencesJson as { mesa?: string; momento?: string; dia?: string } | null,
  });

  const bySegment = (segment: string, n = 8) =>
    all
      .filter((c) => c.segment === segment)
      .sort((a, b) => b.attributedSpend - a.attributedSpend)
      .slice(0, n)
      .map(toRow);

  const sample = all
    .filter((c) => (c.channelsJson as string[] | null)?.length)
    .sort((a, b) => b.attributedSpend - a.attributedSpend)
    .slice(0, 12)
    .map(toRow);

  void from;
  void to;
  return {
    kpis: [
      kpi("Clientes identificables", "Personas con identificador compatible en el dataset demo.", identifiable, identifiable),
      kpi("Recurrentes", "Clientes con más de una visita atribuida.", recurrentes, recurrentes),
      kpi("Nuevos", "Clientes en segmento nuevos.", nuevos, nuevos),
      kpi("Frecuencia promedio", "Visitas promedio por cliente identificable.", Math.round(freq * 10) / 10, Math.round(freq * 10) / 10),
      kpi("Valor acumulado atribuido", "Gasto atribuido cuando existe identificador compatible.", spend, spend, "currency"),
    ],
    segments,
    sample,
    lists: {
      inactivos: bySegment("inactivos"),
      alto_valor: bySegment("alto_valor"),
      frecuentes: bySegment("frecuentes"),
      recurrentes: bySegment("recurrentes"),
      nuevos: bySegment("nuevos"),
    },
    disclaimer: "Ejemplo demostrativo. La unificación real depende de identificadores, consentimiento y disponibilidad de datos.",
  };
}

export async function customerDetail(id: string) {
  const db = getDb();
  const [c] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!c) return null;
  const rsv = await db.select().from(reservations).where(eq(reservations.customerId, id)).limit(8);
  const ords = await db.select().from(orders).where(eq(orders.customerId, id)).limit(8);
  return { ...c, reservations: rsv, orders: ords };
}

export async function hubHealth() {
  const db = getDb();
  const adapters = adaptersFor(RID);
  const [uber, ot, wa, mips] = await Promise.all([
    adapters.uberEats.healthCheck(),
    adapters.openTable.healthCheck(),
    adapters.whatsapp.healthCheck(),
    adapters.mips.healthCheck(),
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [processed] = await db.select({ c: count() }).from(integrationEvents).where(eq(integrationEvents.restaurantId, RID));
  const [pending] = await db
    .select({ c: count() })
    .from(integrationEvents)
    .where(and(eq(integrationEvents.restaurantId, RID), eq(integrationEvents.eventStatus, "pending")));
  const [failed] = await db
    .select({ c: count() })
    .from(integrationEvents)
    .where(and(eq(integrationEvents.restaurantId, RID), eq(integrationEvents.eventStatus, "failed")));
  const todayEvents = await db
    .select({
      channel: integrationEvents.channel,
      c: count(),
    })
    .from(integrationEvents)
    .where(and(eq(integrationEvents.restaurantId, RID), gte(integrationEvents.occurredAt, todayStart)))
    .groupBy(integrationEvents.channel);

  const recent = await db
    .select({
      id: integrationEvents.id,
      occurredAt: integrationEvents.occurredAt,
      channel: integrationEvents.channel,
      eventType: integrationEvents.eventType,
      externalId: integrationEvents.externalId,
      eventStatus: integrationEvents.eventStatus,
      mipsFolio: integrationEvents.mipsFolio,
    })
    .from(integrationEvents)
    .where(eq(integrationEvents.restaurantId, RID))
    .orderBy(desc(integrationEvents.occurredAt))
    .limit(18);

  const attention = await db
    .select({
      id: integrationEvents.id,
      occurredAt: integrationEvents.occurredAt,
      channel: integrationEvents.channel,
      eventType: integrationEvents.eventType,
      externalId: integrationEvents.externalId,
      eventStatus: integrationEvents.eventStatus,
      mipsFolio: integrationEvents.mipsFolio,
    })
    .from(integrationEvents)
    .where(
      and(
        eq(integrationEvents.restaurantId, RID),
        or(eq(integrationEvents.eventStatus, "pending"), eq(integrationEvents.eventStatus, "failed")),
      ),
    )
    .orderBy(desc(integrationEvents.occurredAt))
    .limit(20);

  const timeline = await db
    .select()
    .from(syncEvents)
    .where(eq(syncEvents.restaurantId, RID))
    .orderBy(desc(syncEvents.occurredAt))
    .limit(12);

  const inc = await db.select().from(incidents).where(eq(incidents.restaurantId, RID)).orderBy(desc(incidents.occurredAt));

  const todayMap: Record<string, number> = {};
  for (const t of todayEvents) todayMap[t.channel] = Number(t.c);

  return {
    availability: 99.9,
    processed: Number(processed.c),
    pending: Number(pending.c),
    failed: Number(failed.c),
    lastSyncAgoSeconds: 18,
    integrations: {
      uber_eats: { ...uber, today: todayMap.uber_eats ?? 0 },
      opentable: { ...ot, today: todayMap.opentable ?? 0 },
      whatsapp: { ...wa, today: todayMap.whatsapp ?? 0 },
      mips: { ...mips, today: todayMap.mips ?? 0 },
    },
    recent,
    attention,
    timeline,
    incidents: inc,
  };
}

export async function hubEvents(limit = 40) {
  const db = getDb();
  return db
    .select({
      id: integrationEvents.id,
      occurredAt: integrationEvents.occurredAt,
      channel: integrationEvents.channel,
      eventType: integrationEvents.eventType,
      externalId: integrationEvents.externalId,
      eventStatus: integrationEvents.eventStatus,
      mipsFolio: integrationEvents.mipsFolio,
    })
    .from(integrationEvents)
    .where(eq(integrationEvents.restaurantId, RID))
    .orderBy(desc(integrationEvents.occurredAt))
    .limit(limit);
}

export async function reportData(report: string, period: PeriodRange) {
  switch (report) {
    case "ejecutivo":
      return dashboardSummary(period);
    case "uber":
      return uberSummary(period);
    case "opentable":
      return opentableSummary(period);
    case "whatsapp":
      return whatsappSummary(period);
    case "demanda":
      return demandHeatmap(period);
    case "productos":
      return uberSummary(period);
    case "clientes":
      return customersSummary(period);
    case "conciliacion":
      return hubHealth();
    default:
      return null;
  }
}
