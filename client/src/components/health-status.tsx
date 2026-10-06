import { Link } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { StatusIndicator, integrationLabel, integrationLevel } from "@/components/status-indicator";

const CHANNELS = [
  { key: "uber_eats", label: "Uber Eats" },
  { key: "opentable", label: "OpenTable" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "mips", label: "Míps" },
] as const;

export function HealthStatus({
  integrations,
  lastSyncAgoSeconds,
  pending,
  failed,
  issuesTo = "/salud",
}: {
  integrations: Record<string, { status: string }>;
  lastSyncAgoSeconds: number;
  pending: number;
  failed: number;
  issuesTo?: string;
}) {
  const issues = pending + failed;
  const hubOk = issues === 0 && CHANNELS.every((c) => integrationLevel(integrations[c.key]?.status) === "ok");
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card px-3 py-2 text-xs shadow-soft">
      <StatusIndicator level={hubOk ? "ok" : issues > 0 ? "attention" : "ok"} label={hubOk ? "Hub operativo" : "Hub con atención"} compact />
      <span className="hidden h-3 w-px bg-border sm:block" />
      {CHANNELS.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1.5">
          <ChannelBadge channel={c.key} label={c.label} />
          <StatusIndicator level={integrationLevel(integrations[c.key]?.status)} label={integrationLabel(integrations[c.key]?.status)} compact />
        </span>
      ))}
      <span className="ml-auto flex flex-wrap items-center gap-3 text-muted-foreground">
        <span>Última sincronización: {lastSyncAgoSeconds} s</span>
        <Link to={issuesTo} className="font-medium text-foreground hover:underline">
          {pending} pendientes{failed ? ` · ${failed} necesitan atención` : ""}
        </Link>
      </span>
    </div>
  );
}
