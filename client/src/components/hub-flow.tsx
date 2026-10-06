import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { ChannelIcon } from "@/components/channel-icon";
import { TrendIndicator } from "@/components/trend-indicator";
import { channelConfig, type SourceKey } from "@/lib/channel-config";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface HubFlowSource {
  channel: SourceKey;
  value: number;
  /** "pedidos", "reservaciones", "conversaciones". */
  metric: string;
  deltaPct?: number | null;
  to: string;
}

/**
 * "Así llega tu negocio": tres fuentes → Hub → Míps POS.
 * El Hub ocupa el centro; las fuentes no son tarjetas sueltas sino entradas de un mismo flujo.
 */
export function HubFlow({
  sources,
  hub,
  destination,
  title = "Así llega tu negocio",
  hubCaption = "eventos recibidos",
  destinationCaption = "operaciones confirmadas en Míps",
  className,
}: {
  sources: HubFlowSource[];
  hub: { events: number; deltaPct?: number | null; to: string };
  destination: { value: number; deltaPct?: number | null; to: string };
  title?: string;
  hubCaption?: string;
  destinationCaption?: string;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border bg-card px-4 py-3.5 shadow-soft", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg">{title}</h2>
        <p className="text-[11px] text-muted-foreground">Fuentes → Hub → Míps POS</p>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_28px_minmax(0,1fr)_28px_minmax(0,1fr)] lg:items-stretch">
        {/* FUENTES */}
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Fuentes</p>
          <ul className="flex flex-col gap-1.5">
            {sources.map((s) => {
              const cfg = channelConfig[s.channel];
              return (
                <li key={s.channel}>
                  <Link
                    to={s.to}
                    className="flex items-center justify-between gap-3 rounded-md border-l-2 bg-muted/60 px-3 py-2 hover:bg-accent"
                    style={{ borderLeftColor: cfg.hex }}
                  >
                    <span className="flex items-center gap-2">
                      <ChannelIcon channel={s.channel} size="sm" ring />
                      <span>
                        <span className={cn("block text-sm font-medium leading-tight", cfg.accent)}>{cfg.label}</span>
                        <span className="block text-[11px] text-muted-foreground">{s.metric}</span>
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-serif text-xl tabular leading-none">{num(s.value)}</span>
                      {s.deltaPct !== undefined && <TrendIndicator value={s.deltaPct} className="text-[11px]" />}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <Connector />

        {/* HUB */}
        <div className="flex flex-col">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Hub</p>
          <Link
            to={hub.to}
            className={cn(
              "flex flex-1 flex-col justify-center rounded-md border px-3 py-3 hover:border-primary/50",
              channelConfig.hub.softBackground,
              channelConfig.hub.border,
            )}
          >
            <span className="flex items-center gap-2">
              <ChannelIcon channel="hub" size="md" ring />
              <span>
                <span className={cn("block text-sm font-medium leading-tight", channelConfig.hub.accent)}>Míps Connect</span>
                <span className="block text-[11px] text-muted-foreground">Integra y sincroniza</span>
              </span>
            </span>
            <span className="mt-3 block font-serif text-3xl tabular leading-none">{num(hub.events)}</span>
            <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {hubCaption}
              {hub.deltaPct !== undefined && <TrendIndicator value={hub.deltaPct} className="text-[11px]" />}
            </span>
          </Link>
        </div>

        <Connector single />

        {/* DESTINO */}
        <div className="flex flex-col">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Destino</p>
          <Link
            to={destination.to}
            className="flex flex-1 flex-col justify-center rounded-md bg-channel-mips px-3 py-3 text-[#F3F6FB] hover:opacity-95"
          >
            <ChannelBadge channel="mips" variant="plain" size="md" onDark />
            <span className="mt-3 block font-serif text-3xl tabular leading-none">{num(destination.value)}</span>
            <span className="mt-1 flex items-center gap-2 text-xs text-[#C5D3E8]">
              {destinationCaption}
              {destination.deltaPct !== undefined && (
                <TrendIndicator value={destination.deltaPct} className="text-[11px] text-[#C5D3E8]" />
              )}
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Flechas de flujo. Horizontales en desktop, una flecha hacia abajo en móvil. */
function Connector({ single = false }: { single?: boolean }) {
  return (
    <>
      <div className="flex items-center justify-center lg:hidden" aria-hidden>
        <ArrowRight className="h-4 w-4 rotate-90 text-muted-foreground/70" />
      </div>
      <div className="hidden flex-col justify-around py-6 lg:flex" aria-hidden>
        {(single ? [0] : [0, 1, 2]).map((i) => (
          <span key={i} className="flex items-center">
            <span className="h-px flex-1 bg-border" />
            <ArrowRight className="-ml-1 h-3.5 w-3.5 text-muted-foreground/70" />
          </span>
        ))}
      </div>
    </>
  );
}
