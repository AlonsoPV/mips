export interface NormalizedEvent {
  channel: "uber_eats" | "opentable" | "whatsapp" | "mips";
  externalId: string;
  eventType: string;
  eventStatus: "received" | "processing" | "confirmed" | "pending" | "failed";
  occurredAt: Date;
  receivedAt: Date;
  processedAt: Date | null;
  mipsStatus: string | null;
  mipsFolio: string | null;
  amount: number | null;
  customerId: string | null;
  rawMetadata: Record<string, unknown>;
}

export interface ChannelHealth {
  status: "connected" | "attention" | "error" | "idle";
  lastEventAt: Date | null;
  message: string;
}

export interface ChannelAdapter {
  readonly channel: NormalizedEvent["channel"];
  getEvents(from: Date, to: Date): Promise<NormalizedEvent[]>;
  getOrders?(from: Date, to: Date): Promise<unknown[]>;
  getReservations?(from: Date, to: Date): Promise<unknown[]>;
  getMessages?(from: Date, to: Date): Promise<unknown[]>;
  healthCheck(): Promise<ChannelHealth>;
}
