import { channelConfig, type ChannelKey } from "@/lib/channel-config";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ShareBarItem {
  label: string;
  value: number;
  secondary?: string;
}

/**
 * Distribución horizontal. El largo de la barra es la comparación; el número
 * a la derecha es la cifra. Una sola fuente de color por canal.
 */
export function ShareBars({
  items,
  channel,
  format = (n) => num(n),
  className,
}: {
  items: ShareBarItem[];
  channel?: ChannelKey;
  format?: (n: number) => string;
  className?: string;
}) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Sin datos para graficar.</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  const color = channel ? channelConfig[channel].hex : "#B85C38";
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="shrink-0 tabular text-muted-foreground">
              {format(item.value)}
              {item.secondary ? ` · ${item.secondary}` : ""}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%`, backgroundColor: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
