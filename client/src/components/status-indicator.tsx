import { cn } from "@/lib/utils";

export type HealthLevel = "ok" | "attention" | "critical" | "idle";

const colors: Record<HealthLevel, string> = {
  ok: "bg-olive",
  attention: "bg-amber",
  critical: "bg-merlot",
  idle: "bg-muted-foreground/40",
};

export function StatusIndicator({
  level,
  label,
  compact = false,
}: {
  level: HealthLevel;
  label?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", compact ? "text-xs" : "text-sm")}>
      <span className={cn("h-2 w-2 rounded-full", colors[level])} aria-hidden />
      {label && <span className="text-foreground">{label}</span>}
    </span>
  );
}

export function integrationLevel(status?: string): HealthLevel {
  if (status === "connected") return "ok";
  if (status === "attention") return "attention";
  if (status === "error") return "critical";
  return "idle";
}

export function integrationLabel(status?: string): string {
  if (status === "connected") return "Heartbeat vigente";
  if (status === "attention") return "Atención";
  if (status === "error") return "Necesita atención";
  return "Sin señal verificada";
}
