import { and, asc, count, eq, gt, gte, lte, sql } from "drizzle-orm";
import { customers, integrationEvents } from "../shared/schema";
import { getDb } from "./db";
import { restaurantId } from "./context";
import type { PeriodRange } from "./period";
export async function customerPage(offset = 0) {
  const db = getDb();
  const where = eq(customers.restaurantId, restaurantId());
  const [total] = await db.select({ count: count() }).from(customers).where(where);
  const rows = await db.select({ id: customers.id, displayName: customers.displayName, segment: customers.segment, attributedSpend: customers.attributedSpend, visitCount: customers.visitCount, lastSeenAt: customers.lastSeenAt }).from(customers).where(where).orderBy(asc(customers.id)).limit(100).offset(offset);
  return { scope: "cumulative", rows, total: total.count, offset, nextOffset: offset + rows.length < total.count ? offset + rows.length : null };
}
export async function reconciliationReport(period: PeriodRange, offset = 0) {
  const db = getDb();
  const where = and(eq(integrationEvents.restaurantId, restaurantId()), gte(integrationEvents.occurredAt, period.from), lte(integrationEvents.occurredAt, period.to));
  const [totals] = await db.select({ total: count(), processed: sql<number>`count(*) filter (where event_status = 'confirmed')`.mapWith(Number), pending: sql<number>`count(*) filter (where event_status = 'pending')`.mapWith(Number), failed: sql<number>`count(*) filter (where event_status = 'failed')`.mapWith(Number) }).from(integrationEvents).where(where);
  const recent = await db.select({ id: integrationEvents.id, occurredAt: integrationEvents.occurredAt, channel: integrationEvents.channel, externalId: integrationEvents.externalId, eventType: integrationEvents.eventType, eventStatus: integrationEvents.eventStatus, mipsFolio: integrationEvents.mipsFolio }).from(integrationEvents).where(where).orderBy(asc(integrationEvents.id)).limit(100).offset(offset);
  return { ...totals, recent, offset, nextOffset: offset + recent.length < totals.total ? offset + recent.length : null, scope: "period", period: { from: period.from, to: period.to } };
}
export async function* exportPages(type: "clientes" | "conciliacion", period: PeriodRange): AsyncGenerator<Record<string, unknown>[]> {
  const db = getDb();
  let cursor = "";
  while (true) {
    if (type === "clientes") {
      const rows = await db.select().from(customers).where(and(eq(customers.restaurantId, restaurantId()), gt(customers.id, cursor))).orderBy(asc(customers.id)).limit(500);
      if (!rows.length) return;
      cursor = rows[rows.length - 1]!.id;
      yield rows.map(c => ({ id: c.id, nombre: c.displayName, segmento: c.segment, visitas: c.visitCount, gasto_centavos: c.attributedSpend }));
    } else {
      const rows = await db.select().from(integrationEvents).where(and(eq(integrationEvents.restaurantId, restaurantId()), gt(integrationEvents.id, cursor), gte(integrationEvents.occurredAt, period.from), lte(integrationEvents.occurredAt, period.to))).orderBy(asc(integrationEvents.id)).limit(500);
      if (!rows.length) return;
      cursor = rows[rows.length - 1]!.id;
      yield rows.map(e => ({ hora: e.occurredAt.toISOString(), canal: e.channel, tipo: e.eventType, id: e.externalId, estado: e.eventStatus, folio: e.mipsFolio ?? "" }));
    }
  }
}
