import { ChannelBadge } from "@/components/channel-badge";
import { ChannelLegend } from "@/components/channel-legend";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SOURCE_CHANNELS, channelConfig, countWithUnit, type ChannelKey } from "@/lib/channel-config";
import { DOW_LABELS, num } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface HeatCell {
  dow: number;
  hour: number;
  uber: number;
  ot: number;
  wa: number;
  total: number;
  intensity: number;
}

/** Métrica mostrada. `all` agrega las tres fuentes y se etiqueta como actividad digital. */
export type HeatMetric = "all" | "uber" | "ot" | "wa";

const METRIC_CHANNEL: Record<HeatMetric, ChannelKey> = { all: "all", uber: "uber", ot: "opentable", wa: "whatsapp" };
const CHANNEL_METRIC: Record<string, HeatMetric> = { all: "all", uber: "uber", opentable: "ot", whatsapp: "wa" };

export function heatMetricFor(channel: ChannelKey): HeatMetric {
  return CHANNEL_METRIC[channel] ?? "all";
}

/** Nombre de lo que se está midiendo, para títulos y descripciones. */
export function heatMetricLabel(metric: HeatMetric): string {
  if (metric === "all") return "Actividad digital";
  const u = channelConfig[METRIC_CHANNEL[metric]].unit.plural;
  return u.charAt(0).toUpperCase() + u.slice(1);
}

function valueFor(cell: HeatCell | undefined, metric: HeatMetric): number {
  if (!cell) return 0;
  if (metric === "uber") return cell.uber;
  if (metric === "ot") return cell.ot;
  if (metric === "wa") return cell.wa;
  return cell.total;
}

export function Heatmap({
  cells,
  peakLabel,
  metric = "all",
  description,
  showLegend = metric === "all",
  onSelectHour,
}: {
  cells: HeatCell[];
  peakLabel?: string;
  metric?: HeatMetric;
  /** Qué contiene la gráfica y en qué unidad. Cambia con el filtro. */
  description?: string;
  showLegend?: boolean;
  onSelectHour?: (dow: number, hour: number) => void;
}) {
  const hours = Array.from({ length: 15 }, (_, i) => i + 8);
  const map = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c]));
  const max = Math.max(1, ...cells.map((c) => valueFor(c, metric)));
  const channel = METRIC_CHANNEL[metric];
  // Agregado → tono del Hub (lo generó el Hub con varias fuentes). Canal → su acento.
  const rgb = metric === "all" ? channelConfig.hub.rgb : channelConfig[channel].rgb;
  const unitLabel = metric === "all" ? "eventos" : channelConfig[channel].unit.plural;

  return (
    <div>
      {(description || showLegend) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {showLegend && <ChannelLegend channels={SOURCE_CHANNELS} />}
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] gap-0.5" style={{ gridTemplateColumns: `40px repeat(${hours.length}, minmax(0,1fr))` }}>
          <div />
          {hours.map((h) => (
            <div key={h} className="text-center text-[10px] text-muted-foreground">
              {h}
            </div>
          ))}
          {DOW_LABELS.map((label, dow) => (
            <div key={label} className="contents">
              <div className="flex items-center text-[11px] text-muted-foreground">{label}</div>
              {hours.map((hour) => {
                const cell = map.get(`${dow}-${hour}`);
                const value = valueFor(cell, metric);
                const intensity = value / max;
                const time = `${label} ${String(hour).padStart(2, "0")}:00`;
                return (
                  <Tooltip key={`${dow}-${hour}`}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onSelectHour?.(dow, hour)}
                        className={cn("h-6 rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
                        style={{ backgroundColor: `rgba(${rgb}, ${0.07 + intensity * 0.88})` }}
                        aria-label={`${time}: ${num(value)} ${unitLabel}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="min-w-[200px]">
                      <p className="font-medium">{time}</p>
                      <ul className="mt-1.5 space-y-1">
                        {(metric === "all" || metric === "uber") && (
                          <Row channel="uber" text={countWithUnit("uber", cell?.uber ?? 0)} />
                        )}
                        {(metric === "all" || metric === "ot") && (
                          <Row channel="opentable" text={countWithUnit("opentable", cell?.ot ?? 0)} />
                        )}
                        {(metric === "all" || metric === "wa") && (
                          <Row channel="whatsapp" text={countWithUnit("whatsapp", cell?.wa ?? 0)} />
                        )}
                      </ul>
                      {metric === "all" && (
                        <p className="mt-1.5 border-t border-white/15 pt-1.5 text-xs text-[#C9BDB0]">
                          Total actividad digital: <span className="tabular text-[#F6F1EA]">{num(cell?.total ?? 0)} eventos</span>
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {peakLabel && <p className="mt-3 text-sm text-muted-foreground">{peakLabel}</p>}
    </div>
  );
}

function Row({ channel, text }: { channel: ChannelKey; text: string }) {
  return (
    <li className="flex items-center justify-between gap-4 text-xs">
      <ChannelBadge channel={channel} variant="plain" onDark />
      <span className="tabular">{text}</span>
    </li>
  );
}
