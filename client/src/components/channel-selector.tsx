import { ChannelIcon } from "@/components/channel-icon";
import { channelConfig, type ChannelKey } from "@/lib/channel-config";
import { cn } from "@/lib/utils";

export interface ChannelOption<T extends ChannelKey = ChannelKey> {
  channel: T;
  /** Qué métrica muestra ese canal en este contexto ("Pedidos", "Reservaciones"). */
  sublabel?: string;
}

/**
 * Filtro por canal. Cada opción muestra icono + nombre (+ métrica) para que el
 * usuario sepa qué dataset está viendo antes de leer la gráfica.
 */
export function ChannelSelector<T extends ChannelKey>({
  options,
  value,
  onChange,
  ariaLabel = "Filtrar por canal",
  className,
}: {
  options: ChannelOption<T>[];
  value: T;
  onChange: (channel: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("flex flex-wrap gap-1", className)}>
      {options.map((opt) => {
        const cfg = channelConfig[opt.channel];
        const selected = value === opt.channel;
        return (
          <button
            key={opt.channel}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.channel)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 text-sm transition",
              selected
                ? cn("border-current bg-card shadow-soft", cfg.accent)
                : "border-transparent bg-muted text-foreground hover:bg-accent",
            )}
          >
            <ChannelIcon channel={opt.channel} size="sm" />
            <span className={cn("font-medium", selected ? cfg.accent : "text-foreground")}>{cfg.shortLabel}</span>
            {opt.sublabel && (
              <span className={cn("hidden text-[11px] sm:inline", selected ? "opacity-80" : "text-muted-foreground")}>
                · {opt.sublabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
