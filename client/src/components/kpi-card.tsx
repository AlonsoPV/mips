import { Link } from "react-router-dom";
import type { KpiValue } from "@shared/types";
import { ChannelBadge } from "@/components/channel-badge";
import { MetricTooltip } from "@/components/metric-tooltip";
import { TrendIndicator } from "@/components/trend-indicator";
import type { ChannelKey } from "@/lib/channel-config";
import { deltaCopy, formatKpi } from "@/lib/format";
import { cn } from "@/lib/utils";

export function KpiCard({
  kpi,
  to,
  showTrend = true,
  channel,
  featured = false,
}: {
  kpi: KpiValue;
  to?: string;
  showTrend?: boolean;
  /** Fuente del dato. Se muestra antes del número para que el origen quede claro primero. */
  channel?: ChannelKey;
  /** Primera cifra de la pantalla: más grande, se lee antes. */
  featured?: boolean;
}) {
  const body = (
    <>
      {channel && (
        <div className="mb-1.5">
          <ChannelBadge channel={channel} size="sm" />
        </div>
      )}
      <MetricTooltip label={kpi.label}>{kpi.tooltip}</MetricTooltip>
      <p
        className={cn(
          "mt-2 font-serif tabular tracking-tight",
          featured ? "text-4xl md:text-5xl" : "text-3xl md:text-[2.15rem]",
        )}
      >
        {formatKpi(kpi.value, kpi.unit)}
      </p>
      {showTrend && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <TrendIndicator value={kpi.deltaPct} />
          <p className="text-xs text-muted-foreground">{deltaCopy(kpi.value, kpi.previousValue, kpi.unit ?? "count")}</p>
        </div>
      )}
    </>
  );

  const className = cn(
    "rounded-lg border bg-card px-4 py-3.5 text-left shadow-soft transition",
    to && "hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    featured && "col-span-2 xl:col-span-1",
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}
