import { ChannelChip } from "@/components/channel-chip";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { hourMin, num } from "@/lib/format";

interface Health {
  availability: number;
  processed: number;
  pending: number;
  failed: number;
  lastSyncAgoSeconds: number;
  integrations: Record<string, { status: string; message: string }>;
  timeline: { occurredAt: string; channel: string; message: string; severity: string }[];
  incidents: { occurredAt: string; title: string; description: string; status: string; channel: string }[];
}

const labels: Record<string, string> = {
  connected: "Operativo",
  attention: "Atención",
  error: "Error",
  idle: "Sin actividad",
};

export default function Salud() {
  const { data, loading, error, reload } = useApi<Health>("/api/hub/health");
  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin telemetría" body="El Hub no ha registrado salud todavía." />;

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <header>
        <h1 className="font-serif text-3xl md:text-4xl">Salud del Hub</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Monitoreo, mantenimiento y continuidad. Esto es lo que justifica el servicio mensual: que los canales no se caigan en silencio.
        </p>
      </header>
      <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Disponibilidad demo" value={`${data.availability}%`} />
        <Stat label="Eventos procesados" value={num(data.processed)} />
        <Stat label="Pendientes" value={num(data.pending)} />
        <Stat label="Fallidos" value={num(data.failed)} />
        <Stat label="Última sincronización" value={`Hace ${data.lastSyncAgoSeconds} segundos`} />
      </section>
      <section>
        <h2 className="font-serif text-2xl">Estado de integraciones</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {Object.entries(data.integrations).map(([key, info]) => (
            <div key={key} className="flex items-center justify-between rounded-xl border bg-card px-5 py-4">
              <ChannelChip channel={key} />
              <Badge tone={info.status === "connected" ? "success" : info.status === "error" ? "danger" : "warning"}>
                {labels[info.status] ?? info.status}
              </Badge>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-serif text-2xl">Timeline de incidencias</h2>
        <ol className="mt-4 space-y-4">
          {data.timeline.map((t) => (
            <li key={t.occurredAt + t.message} className="border-l-2 border-primary/40 pl-4">
              <p className="text-xs text-muted-foreground">{hourMin(t.occurredAt)}</p>
              <p className="text-sm">{t.message}</p>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="font-serif text-2xl">Incidencias</h2>
        <ul className="mt-4 space-y-4">
          {data.incidents.map((i) => (
            <li key={i.title} className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                {hourMin(i.occurredAt)} · {i.channel}
              </p>
              <p className="mt-1 font-medium">{i.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{i.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl tabular">{value}</p>
    </div>
  );
}
