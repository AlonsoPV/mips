import { and, eq, gte, lte } from "drizzle-orm";
import { integrationEvents } from "../../shared/schema";
import { getDb } from "../db";
import type { ChannelAdapter, ChannelHealth, NormalizedEvent } from "./types";

async function eventsFromDb(
  channel: NormalizedEvent["channel"],
  restaurantId: string,
  from: Date,
  to: Date,
): Promise<NormalizedEvent[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(integrationEvents)
    .where(
      and(
        eq(integrationEvents.restaurantId, restaurantId),
        eq(integrationEvents.channel, channel),
        gte(integrationEvents.occurredAt, from),
        lte(integrationEvents.occurredAt, to),
      ),
    );
  return rows.map((r) => ({
    channel: r.channel as NormalizedEvent["channel"],
    externalId: r.externalId,
    eventType: r.eventType,
    eventStatus: r.eventStatus as NormalizedEvent["eventStatus"],
    occurredAt: r.occurredAt,
    receivedAt: r.receivedAt,
    processedAt: r.processedAt,
    mipsStatus: r.mipsStatus,
    mipsFolio: r.mipsFolio,
    amount: r.amount,
    customerId: r.customerId,
    rawMetadata: {},
  }));
}

function statusFromEvents(events: { eventStatus: string; occurredAt: Date }[]): ChannelHealth {
  if (!events.length) {
    return { status: "idle", lastEventAt: null, message: "Sin actividad en el periodo" };
  }
  const failed = events.filter((e) => e.eventStatus === "failed").length;
  const pending = events.filter((e) => e.eventStatus === "pending").length;
  const last = events.reduce((a, b) => (a.occurredAt > b.occurredAt ? a : b));
  if (failed > 8) {
    return { status: "error", lastEventAt: last.occurredAt, message: "Errores por encima del umbral" };
  }
  if (failed > 0 || pending > 5) {
    return { status: "attention", lastEventAt: last.occurredAt, message: "Hay eventos pendientes o fallidos" };
  }
  return { status: "connected", lastEventAt: last.occurredAt, message: "Operativo" };
}

export class MockUberEatsAdapter implements ChannelAdapter {
  readonly channel = "uber_eats" as const;
  constructor(private restaurantId: string) {}
  async getEvents(from: Date, to: Date) {
    return eventsFromDb(this.channel, this.restaurantId, from, to);
  }
  async healthCheck() {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 86400000);
    return statusFromEvents(await this.getEvents(from, to));
  }
}

export class MockOpenTableAdapter implements ChannelAdapter {
  readonly channel = "opentable" as const;
  constructor(private restaurantId: string) {}
  async getEvents(from: Date, to: Date) {
    return eventsFromDb(this.channel, this.restaurantId, from, to);
  }
  async healthCheck() {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 86400000);
    return statusFromEvents(await this.getEvents(from, to));
  }
}

export class MockWhatsAppAdapter implements ChannelAdapter {
  readonly channel = "whatsapp" as const;
  constructor(private restaurantId: string) {}
  async getEvents(from: Date, to: Date) {
    return eventsFromDb(this.channel, this.restaurantId, from, to);
  }
  async healthCheck() {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 86400000);
    return statusFromEvents(await this.getEvents(from, to));
  }
}

export class MockMipsAdapter implements ChannelAdapter {
  readonly channel = "mips" as const;
  constructor(private restaurantId: string) {}
  async getEvents(from: Date, to: Date) {
    return eventsFromDb(this.channel, this.restaurantId, from, to);
  }
  async healthCheck() {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 86400000);
    return statusFromEvents(await this.getEvents(from, to));
  }
}

export function adaptersFor(restaurantId: string) {
  return {
    uberEats: new MockUberEatsAdapter(restaurantId),
    openTable: new MockOpenTableAdapter(restaurantId),
    whatsapp: new MockWhatsAppAdapter(restaurantId),
    mips: new MockMipsAdapter(restaurantId),
  };
}
