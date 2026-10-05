import type { KpiValue } from "@shared/types";
import { formatKpi, pct } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function KpiStat({ kpi, large = false }: { kpi: KpiValue; large?: boolean }) {
  const up = (kpi.deltaPct ?? 0) > 0;
  const down = (kpi.deltaPct ?? 0) < 0;
  return (
    <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="cursor-help text-sm text-muted-foreground underline decoration-dotted underline-offset-4">
            {kpi.label}
          </p>
        </TooltipTrigger>
        <TooltipContent>{kpi.tooltip}</TooltipContent>
      </Tooltip>
      <p className={cn("mt-2 font-serif tabular tracking-tight", large ? "text-4xl md:text-5xl" : "text-3xl")}>
        {formatKpi(kpi.value, kpi.unit)}
      </p>
      {kpi.deltaPct !== null && (
        <p className={cn("mt-1 text-sm", up && "text-olive", down && "text-merlot", !up && !down && "text-muted-foreground")}>
          {pct(kpi.deltaPct)} vs periodo anterior
        </p>
      )}
    </div>
  );
}
