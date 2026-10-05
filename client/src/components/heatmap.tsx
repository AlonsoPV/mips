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

export function Heatmap({ cells, peakLabel }: { cells: HeatCell[]; peakLabel?: string }) {
  const hours = Array.from({ length: 15 }, (_, i) => i + 8);
  const map = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c]));
  return (
    <div>
      {peakLabel && <p className="mb-4 max-w-2xl text-sm text-muted-foreground">{peakLabel}</p>}
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] gap-1" style={{ gridTemplateColumns: `48px repeat(${hours.length}, minmax(0,1fr))` }}>
          <div />
          {hours.map((h) => (
            <div key={h} className="text-center text-[11px] text-muted-foreground">
              {h}h
            </div>
          ))}
          {DOW_LABELS.map((label, dow) => (
            <div key={label} className="contents">
              <div className="flex items-center text-xs text-muted-foreground">{label}</div>
              {hours.map((hour) => {
                const cell = map.get(`${dow}-${hour}`);
                const intensity = cell?.intensity ?? 0;
                return (
                  <Tooltip key={`${dow}-${hour}`}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "h-8 rounded-sm border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        )}
                        style={{ backgroundColor: `rgba(184, 92, 56, ${0.08 + intensity * 0.85})` }}
                        aria-label={`${label} ${hour}:00`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">
                        {label} {String(hour).padStart(2, "0")}:00
                      </p>
                      <p>{cell?.uber ?? 0} pedidos Uber</p>
                      <p>{cell?.ot ?? 0} reservaciones</p>
                      <p>{cell?.wa ?? 0} conversaciones WhatsApp</p>
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
