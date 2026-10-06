import { Link } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { StatusIndicator, integrationLabel, integrationLevel } from "@/components/status-indicator";
import { channelConfig, toChannelKey, type ChannelKey } from "@/lib/channel-config";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Tarjeta de un canal conectado: identidad + estado + lo que produjo hoy.
 * Se usa en Hub, Salud y Configuración; la identidad (icono, nombre, acento)
 * es la misma que en el resto del producto.
 */
export function ChannelSourceCard({
  channel,
  status,
  value,
  metric,
  message,
  to,
  className,
}: {
  channel: ChannelKey | string;
  status?: string;
  value: number;
  /** "Pedidos", "Reservaciones", "Confirmados"… */
  metric: string;
  message?: string;
  to: string;
  className?: string;
}) {
  const key = toChannelKey(channel);
  const cfg = channelConfig[key];
  const level = integrationLevel(status);
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border-l-2 bg-muted/60 px-3 py-2.5 hover:bg-accent",
        className,
      )}
      style={{ borderLeftColor: cfg.hex }}
    >
      <span className="min-w-0">
        <ChannelBadge channel={key} size="md" />
        <span className="mt-1.5 block">
          <StatusIndicator level={level} label={integrationLabel(status)} compact />
        </span>
        {message && <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{message}</span>}
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-serif text-3xl tabular leading-none">{num(value)}</span>
        <span className="text-[11px] text-muted-foreground">{metric} hoy</span>
      </span>
    </Link>
  );
}
