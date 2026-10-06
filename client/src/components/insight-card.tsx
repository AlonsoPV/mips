import { Link } from "react-router-dom";
import type { Insight } from "@shared/types";
import { PriorityHeader, type PriorityTone } from "@/components/priority-card";
import { channelForInsight } from "@/lib/channel-config";

const TONE: Record<string, PriorityTone> = {
  opportunity: "opportunity",
  attention: "attention",
  critical: "critical",
  info: "info",
};

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <article className="border-b border-border py-5 last:border-b-0">
      <PriorityHeader tone={TONE[insight.priority] ?? "info"} channel={channelForInsight(insight)} />
      {insight.impact && <p className="mt-1 text-xs text-muted-foreground">{insight.impact}</p>}
      <h3 className="mt-2 font-serif text-lg">{insight.title}</h3>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{insight.description}</p>
      <Link
        to={insight.deepLink}
        className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
      >
        {insight.ctaLabel}
      </Link>
    </article>
  );
}
