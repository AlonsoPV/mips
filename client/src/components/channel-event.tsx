import { Link } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { channelForEvent, type ChannelKey } from "@/lib/channel-config";
import { hourMin } from "@/lib/format";
import { cn } from "@/lib/utils";

const WHAT: Record<string, string> = {
  order: "Pedido",
  reservation: "Reservación",
  conversation: "Conversación",
  sale: "Venta confirmada",
};

const STATE: Record<string, string> = {
  confirmed: "Confirmado",
  received: "Recibida",
  pending: "Necesita atención",
  failed: "Necesita atención",
  processing: "En proceso",
};

const PAGE: Record<ChannelKey, string> = {
  uber: "/ventas",
  opentable: "/reservaciones",
  whatsapp: "/whatsapp",
  mips: "/reportes/conciliacion",
  hub: "/hub",
  all: "/hub",
};

/**
 * Fila de actividad del Hub: hora · [canal] · qué pasó · estado.
 * El canal se identifica con badge, nunca sólo con texto.
 */
export function ChannelEvent({
  event,
  showId = false,
  className,
}: {
  event: { occurredAt: string; channel?: string; eventType: string; eventStatus: string; externalId?: string };
  showId?: boolean;
  className?: string;
}) {
  const channel = channelForEvent(event.eventType, event.channel);
  const attention = event.eventStatus === "failed" || event.eventStatus === "pending";
  const to = attention ? "/salud#eventos" : PAGE[channel];

  return (
    <li className={cn("text-sm", className)}>
      <Link to={to} className="flex items-center gap-3 py-2 hover:bg-muted/60 -mx-2 px-2 rounded-md">
        <span className="w-12 shrink-0 tabular text-muted-foreground">{hourMin(event.occurredAt)}</span>
        <ChannelBadge channel={channel} size="sm" className="w-[104px] justify-start" />
        <span className="flex-1 truncate">
          {WHAT[event.eventType] ?? event.eventType}
          {showId && event.externalId && <span className="ml-1 tabular text-muted-foreground">{event.externalId}</span>}
        </span>
        <span className={cn("shrink-0 text-xs", attention ? "font-medium text-amber" : "text-muted-foreground")}>
          {STATE[event.eventStatus] ?? event.eventStatus}
        </span>
      </Link>
    </li>
  );
}
