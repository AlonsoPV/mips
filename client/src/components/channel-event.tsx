import { Link } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { channelForEvent, type ChannelKey } from "@/lib/channel-config";
import { hourMin } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface HubEventRow {
  occurredAt?: string;
  channel?: string;
  eventType?: string;
  eventStatus: string;
  externalId?: string;
  mipsFolio?: string | null;
}

/** Qué pasó, en lenguaje de restaurante. El canal lo dice el badge, no el texto. */
export const EVENT_WHAT: Record<string, string> = {
  order: "Pedido",
  reservation: "Reservación",
  conversation: "Conversación",
  sale: "Venta confirmada",
};

export const EVENT_STATE: Record<string, string> = {
  confirmed: "Confirmado",
  received: "Recibida",
  pending: "Necesita atención",
  failed: "Necesita atención",
  processing: "En proceso",
};

/** A dónde lleva cada canal cuando el usuario quiere ver el detalle. */
export const CHANNEL_PAGE: Record<ChannelKey, string> = {
  uber: "/ventas",
  opentable: "/reservaciones",
  whatsapp: "/whatsapp",
  mips: "/reportes/conciliacion",
  hub: "/hub",
  all: "/hub",
};

export function eventNeedsAttention(status: string) {
  return status === "failed" || status === "pending";
}

export function eventChannel(event: HubEventRow): ChannelKey {
  return channelForEvent(event.eventType ?? "", event.channel);
}

/**
 * Destino de un evento. Los que necesitan atención van a Salud (salvo que ya
 * estemos ahí: `attentionTo = null` manda al canal).
 */
export function eventHref(event: HubEventRow, attentionTo: string | null = "/salud#eventos"): string {
  if (attentionTo && eventNeedsAttention(event.eventStatus)) return attentionTo;
  return CHANNEL_PAGE[eventChannel(event)];
}

/** Folio sólo cuando hay venta; en reservaciones y conversaciones no aplica. */
export function eventFolio(event: HubEventRow): string {
  return event.eventType === "order" || event.eventType === "sale" ? event.mipsFolio ?? "—" : "—";
}

/**
 * Fila de actividad del Hub: hora · [canal] · qué pasó · estado.
 * El canal se identifica con badge, nunca sólo con texto.
 */
export function ChannelEvent({
  event,
  showId = false,
  attentionTo,
  className,
}: {
  event: HubEventRow & { occurredAt: string; eventType: string };
  showId?: boolean;
  attentionTo?: string | null;
  className?: string;
}) {
  const channel = eventChannel(event);
  const attention = eventNeedsAttention(event.eventStatus);
  const to = eventHref(event, attentionTo);

  return (
    <li className={cn("text-sm", className)}>
      <Link to={to} className="flex items-center gap-3 py-2 hover:bg-muted/60 -mx-2 px-2 rounded-md">
        <span className="w-12 shrink-0 tabular text-muted-foreground">{hourMin(event.occurredAt)}</span>
        <ChannelBadge channel={channel} size="sm" className="w-[104px] justify-start" />
        <span className="flex-1 truncate">
          {EVENT_WHAT[event.eventType] ?? event.eventType}
          {showId && event.externalId && <span className="ml-1 tabular text-muted-foreground">{event.externalId}</span>}
        </span>
        <span className={cn("shrink-0 text-xs", attention ? "font-medium text-amber" : "text-muted-foreground")}>
          {EVENT_STATE[event.eventStatus] ?? event.eventStatus}
        </span>
      </Link>
    </li>
  );
}
