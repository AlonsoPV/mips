import { Link } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { TrendIndicator } from "@/components/trend-indicator";
import type { ChannelKey } from "@/lib/channel-config";
import { cn } from "@/lib/utils";

export type PriorityTone = "critical" | "attention" | "opportunity" | "info";

export const PRIORITY_LABEL: Record<PriorityTone, string> = {
  critical: "Riesgo",
  attention: "Atención",
  opportunity: "Oportunidad",
  info: "Contexto",
};

export const PRIORITY_SURFACE: Record<PriorityTone, string> = {
  critical: "border-l-merlot bg-merlot/[0.04]",
  attention: "border-l-amber bg-amber/[0.06]",
  opportunity: "border-l-primary bg-primary/[0.05]",
  info: "border-l-olive bg-olive/[0.04]",
};

export const PRIORITY_TEXT: Record<PriorityTone, string> = {
  critical: "text-merlot",
  attention: "text-amber",
  opportunity: "text-primary",
  info: "text-olive",
};

/** Encabezado "[canal] TIPO": primero de dónde viene, después qué significa. */
export function PriorityHeader({ tone, channel }: { tone: PriorityTone; channel?: ChannelKey }) {
  return (
    <p className="flex flex-wrap items-center gap-1.5">
      {channel && <ChannelBadge channel={channel} size="sm" />}
      <span className={cn("text-[11px] font-semibold uppercase tracking-wider", PRIORITY_TEXT[tone])}>
        {PRIORITY_LABEL[tone]}
      </span>
    </p>
  );
}

export function PriorityCard({
  tone,
  channel,
  title,
  description,
  secondary,
  deltaPct,
  ctaLabel,
  to,
}: {
  tone: PriorityTone;
  /** Fuente del insight. Si mezcla varias, usar "hub". */
  channel?: ChannelKey;
  title: string;
  description: string;
  secondary?: string;
  deltaPct?: number | null;
  ctaLabel: string;
  to: string;
}) {
  return (
    <article
      className={cn(
        "flex min-w-[260px] snap-start flex-col border-l-4 bg-card px-4 py-3.5 shadow-soft",
        PRIORITY_SURFACE[tone],
      )}
    >
      <PriorityHeader tone={tone} channel={channel} />
      <h3 className="mt-1 font-serif text-lg leading-snug">{title}</h3>
      <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{description}</p>
      {(secondary || deltaPct != null) && (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          {secondary}
          {deltaPct != null && <TrendIndicator value={deltaPct} className="text-xs" />}
        </p>
      )}
      <Link to={to} className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">
        {ctaLabel} →
      </Link>
    </article>
  );
}
