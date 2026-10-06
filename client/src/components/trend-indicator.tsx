import { cn } from "@/lib/utils";
import { pct } from "@/lib/format";

export function TrendIndicator({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className={cn("text-sm text-muted-foreground", className)}>—</span>;
  }
  const up = value > 0;
  const down = value < 0;
  return (
    <span
      className={cn(
        "text-sm font-medium tabular",
        up && "text-olive",
        down && "text-merlot",
        !up && !down && "text-muted-foreground",
        className,
      )}
    >
      {up ? "↑" : down ? "↓" : "→"} {pct(value)}
    </span>
  );
}
