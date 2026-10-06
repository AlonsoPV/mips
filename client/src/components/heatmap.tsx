import { DOW_LABELS } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

export type HeatMetric = "all" | "uber" | "ot" | "wa";

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
  onSelectHour,
}: {
  cells: HeatCell[];
  peakLabel?: string;
  metric?: HeatMetric;
  onSelectHour?: (dow: number, hour: number) => void;
}) {
  const hours = Array.from({ length: 15 }, (_, i) => i + 8);
  const map = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c]));
  const max = Math.max(1, ...cells.map((c) => valueFor(c, metric)));

  return (
    <div>
      {peakLabel && <p className="mb-3 text-sm text-muted-foreground">{peakLabel}</p>}
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
                return (
                  <Tooltip key={`${dow}-${hour}`}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onSelectHour?.(dow, hour)}
                        className={cn("h-6 rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
                        style={{ backgroundColor: `rgba(140, 63, 36, ${0.07 + intensity * 0.88})` }}
                        aria-label={`${label} ${hour}:00`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">
                        {label} {String(hour).padStart(2, "0")}:00
                      </p>
                      {(metric === "all" || metric === "uber") && <p>{cell?.uber ?? 0} pedidos</p>}
                      {(metric === "all" || metric === "ot") && <p>{cell?.ot ?? 0} reservaciones</p>}
                      {(metric === "all" || metric === "wa") && <p>{cell?.wa ?? 0} conversaciones</p>}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
