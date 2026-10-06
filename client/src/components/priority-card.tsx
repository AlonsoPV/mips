import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { TrendIndicator } from "@/components/trend-indicator";

export type PriorityTone = "critical" | "attention" | "opportunity" | "info";

const labels: Record<PriorityTone, string> = {
  critical: "Riesgo",
  attention: "Atención",
  opportunity: "Oportunidad",
  info: "Contexto",
};

const tones: Record<PriorityTone, string> = {
  critical: "border-l-merlot bg-merlot/[0.04]",
  attention: "border-l-amber bg-amber/[0.06]",
  opportunity: "border-l-primary bg-primary/[0.05]",
  info: "border-l-olive bg-olive/[0.04]",
};

const chip: Record<PriorityTone, string> = {
  critical: "text-merlot",
  attention: "text-amber",
  opportunity: "text-primary",
  info: "text-olive",
};

export function PriorityCard({
  tone,
  title,
  description,
  secondary,
  deltaPct,
  ctaLabel,
  to,
}: {
  tone: PriorityTone;
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
        tones[tone],
      )}
    >
      <p className={cn("text-[11px] font-semibold uppercase tracking-wider", chip[tone])}>{labels[tone]}</p>
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
