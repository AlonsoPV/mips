import type { KpiValue } from "@shared/types";
import { KpiCard } from "@/components/kpi-card";
import type { ChannelKey } from "@/lib/channel-config";

/**
 * KPI con fuente explícita. Es un KpiCard donde el canal es obligatorio:
 * [Uber Eats] → Pedidos → 408 → +8.4 %.
 */
export function ChannelMetric({
  channel,
  kpi,
  to,
  showTrend = true,
}: {
  channel: ChannelKey;
  kpi: KpiValue;
  to?: string;
  showTrend?: boolean;
}) {
  return <KpiCard kpi={kpi} to={to} showTrend={showTrend} channel={channel} />;
}
