import { RANGES, usePeriod } from "@/hooks/use-period";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PeriodSelector() {
  const { range, from, to, setRange, setCustom } = usePeriod();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {RANGES.map((r) => (
        <Button
          key={r.id}
          size="sm"
          variant={range === r.id ? "default" : "outline"}
          className={cn(range === r.id && "shadow-none", r.id === "custom" && "hidden sm:inline-flex")}
          onClick={() => setRange(r.id)}
        >
          {r.label}
        </Button>
      ))}
      {range === "custom" && (
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => setCustom(e.target.value, to || e.target.value)} className="h-9 min-h-9 w-auto" />
          <Input type="date" value={to} onChange={(e) => setCustom(from || e.target.value, e.target.value)} className="h-9 min-h-9 w-auto" />
        </div>
      )}
    </div>
  );
}
