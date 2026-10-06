import { Link } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { PRIORITY_SURFACE, PriorityHeader, type PriorityTone } from "@/components/priority-card";
import { countWithUnit, type ChannelKey } from "@/lib/channel-config";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ChannelBreakdown {
  channel: ChannelKey;
  value: number;
  /** Texto alternativo a la unidad del canal ("28 reservas"). */
  label?: string;
}

/**
 * Insight generado por el Hub a partir de varias fuentes. Se etiqueta [Hub] y
 * desglosa la aportación de cada canal para que el origen quede explícito.
 */
export function CrossChannelInsight({
  tone,
  title,
  description,
  breakdown,
  ctaLabel,
  to,
}: {
  tone: PriorityTone;
  title: string;
  description?: string;
  breakdown: ChannelBreakdown[];
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
      <PriorityHeader tone={tone} channel="hub" />
      <h3 className="mt-1 font-serif text-lg leading-snug">{title}</h3>
      {description && <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{description}</p>}
      <ul className="mt-2.5 space-y-1">
        {breakdown.map((b) => (
          <li key={b.channel} className="flex items-center justify-between gap-3 text-xs">
            <ChannelBadge channel={b.channel} variant="plain" />
            <span className="tabular text-foreground">{b.label ?? countWithUnit(b.channel, b.value, num(b.value))}</span>
          </li>
        ))}
      </ul>
      <Link to={to} className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">
        {ctaLabel} →
      </Link>
    </article>
  );
}
