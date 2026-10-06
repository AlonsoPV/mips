import { ArrowRight } from "lucide-react";
import { ChannelBadge } from "@/components/channel-badge";
import { channelConfig, toChannelKey, type ChannelKey } from "@/lib/channel-config";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface FunnelStep {
  label: string;
  value: number;
  channel?: ChannelKey | string;
  format?: (n: number) => string;
}

/**
 * Recorrido visual: cada etapa es un bloque con cifra grande. El % opcional
 * es el veredicto (cuánto llega al final).
 */
export function FunnelStrip({
  steps,
  rate,
  className,
}: {
  steps: FunnelStep[];
  rate?: { value: string; label: string };
  className?: string;
}) {
  if (!steps.length) return null;
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className={className}>
      {rate && (
        <div className="mb-4">
          <p className="font-serif text-5xl tabular leading-none tracking-tight">{rate.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{rate.label}</p>
        </div>
      )}
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))] sm:items-stretch">
        {steps.map((s, i) => {
          const key = toChannelKey(s.channel, "hub");
          const cfg = channelConfig[key];
          const weight = 72 + Math.round((s.value / max) * 56);
          return (
            <li key={s.label} className="flex items-stretch gap-2">
              {i > 0 && (
                <span className="hidden shrink-0 items-center sm:flex" aria-hidden>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/70" />
                </span>
              )}
              <div
                className={cn("flex min-w-0 flex-1 flex-col justify-end rounded-md border-l-2 px-3 py-3", cfg.softBackground)}
                style={{ borderLeftColor: cfg.hex, minHeight: weight }}
              >
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <ChannelBadge channel={key} variant="plain" showLabel={false} />
                  {s.label}
                </p>
                <p className="mt-1 font-serif text-3xl tabular leading-none">{(s.format ?? num)(s.value)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
