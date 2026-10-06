import { Link } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { StatusIndicator, integrationLabel, integrationLevel } from "@/components/status-indicator";
import { STATUS_CHANNELS, channelConfig } from "@/lib/channel-config";
import { cn } from "@/lib/utils";

/**
 * Barra compacta y permanente de estado del Hub. La identidad de cada canal es
 * exactamente la misma que en el resto del producto (icono + nombre + acento).
 */
export function ChannelStatus({
  integrations,
  lastSyncAgoSeconds,
  pending,
  failed,
  issuesTo = "/salud",
  className,
}: {
  /** Claves de la API: uber_eats, opentable, whatsapp, mips. */
  integrations: Record<string, { status: string }>;
  lastSyncAgoSeconds: number | null;
  pending: number;
  failed: number;
  issuesTo?: string;
  className?: string;
}) {
  const API_KEY = { uber: "uber_eats", opentable: "opentable", whatsapp: "whatsapp", mips: "mips" } as const;
  const issues = pending + failed;
  const allOk = STATUS_CHANNELS.every((c) => integrationLevel(integrations[API_KEY[c]]?.status) === "ok");
  const hubOk = issues === 0 && allOk;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card px-3 py-2 text-xs shadow-soft",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <ChannelBadge channel="hub" variant="plain" size="md" />
        <StatusIndicator level={hubOk ? "ok" : "attention"} label={hubOk ? "Conectores vigentes" : "Revisar estado"} compact />
      </span>
      <span className="hidden h-3 w-px bg-border sm:block" />
      {STATUS_CHANNELS.map((c) => {
        const status = integrations[API_KEY[c]]?.status;
        return (
          <span key={c} className="inline-flex items-center gap-1.5">
            <ChannelBadge channel={c} variant="plain" label={channelConfig[c].shortLabel} />
            <StatusIndicator level={integrationLevel(status)} label={integrationLabel(status)} compact />
          </span>
        );
      })}
      <span className="ml-auto flex flex-wrap items-center gap-3 text-muted-foreground">
        <span>{lastSyncAgoSeconds === null ? "Sin registros de sincronización" : `Último registro: hace ${lastSyncAgoSeconds} s`}</span>
        <Link to={issuesTo} className="font-medium text-foreground hover:underline">
          {pending} pendientes{failed ? ` · ${failed} necesitan atención` : ""}
        </Link>
      </span>
    </div>
  );
}
