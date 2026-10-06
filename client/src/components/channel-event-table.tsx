import { Link } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-table";
import {
  EVENT_STATE,
  EVENT_WHAT,
  eventChannel,
  eventFolio,
  eventHref,
  eventNeedsAttention,
  type HubEventRow,
} from "@/components/channel-event";
import { hourMin } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Tabla de eventos del Hub (Hub, Salud, Conciliación). Una sola implementación:
 * hora · [canal] · qué pasó · ID · estado · folio Míps. El canal siempre va con
 * icono + nombre; el folio sólo aparece cuando hay venta.
 */
export function ChannelEventTable({
  rows,
  showTime = true,
  attentionTo,
  emptyText = "No hay eventos en este filtro.",
}: {
  rows: HubEventRow[];
  showTime?: boolean;
  /** Destino de los eventos que necesitan atención. `null` → página del canal. */
  attentionTo?: string | null;
  emptyText?: string;
}) {
  if (!rows.length) return <p className="py-6 text-sm text-muted-foreground">{emptyText}</p>;

  return (
    <DataTable>
      <TableHeader>
        <TableRow>
          {showTime && <TableHead>Hora</TableHead>}
          <TableHead>Canal</TableHead>
          <TableHead>Qué pasó</TableHead>
          <TableHead>ID</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Folio Míps</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((e, i) => {
          const href = eventHref(e, attentionTo);
          const attention = eventNeedsAttention(e.eventStatus);
          const cell = (content: React.ReactNode, className?: string) => (
            <TableCell className={className}>
              <Link to={href} className="block">
                {content}
              </Link>
            </TableCell>
          );
          return (
            <TableRow key={`${e.externalId ?? i}-${e.occurredAt ?? i}`} className="cursor-pointer">
              {showTime && cell(e.occurredAt ? hourMin(e.occurredAt) : "—", "tabular")}
              {cell(<ChannelBadge channel={eventChannel(e)} variant="plain" />)}
              {cell(e.eventType ? EVENT_WHAT[e.eventType] ?? e.eventType : "—")}
              {cell(e.externalId ?? "—", "tabular")}
              {cell(
                <span className={cn(attention && "font-medium text-amber")}>{EVENT_STATE[e.eventStatus] ?? e.eventStatus}</span>,
              )}
              {cell(eventFolio(e), "tabular")}
            </TableRow>
          );
        })}
      </TableBody>
    </DataTable>
  );
}
