import { Link } from "react-router-dom";
import type { Insight } from "@shared/types";
import { Badge } from "@/components/ui/badge";

const tone: Record<string, "copper" | "warning" | "danger" | "success"> = {
  opportunity: "copper",
  attention: "warning",
  critical: "danger",
  info: "success",
};

const category: Record<string, string> = {
  horario: "Oportunidad",
  producto: "Producto",
  atencion: "Atención",
  riesgo: "Riesgo",
  recurrencia: "Recurrencia",
  demanda: "Demanda",
};

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <article className="border-b border-border py-5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone[insight.priority] ?? "neutral"}>{category[insight.type] ?? insight.type}</Badge>
        {insight.impact && <span className="text-xs text-muted-foreground">{insight.impact}</span>}
      </div>
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
