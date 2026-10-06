import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { ChannelEventTable } from "@/components/channel-event-table";
import { ChannelSelector } from "@/components/channel-selector";
import { ChannelSourceCard } from "@/components/channel-source-card";
import { ChartCard } from "@/components/chart-card";
import { FunnelStrip } from "@/components/funnel-strip";
import { HealthStatus } from "@/components/health-status";
import { KpiCard } from "@/components/kpi-card";
import { PageIntro } from "@/components/page-intro";
import { PriorityCard, type PriorityTone } from "@/components/priority-card";
import { integrationLevel } from "@/components/status-indicator";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { STATUS_CHANNELS, channelConfig, toChannelKey, type ChannelKey } from "@/lib/channel-config";
import { hourMin, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { KpiValue } from "@shared/types";

interface HubEvent {
  occurredAt: string;
  channel: string;
  eventType: string;
  externalId: string;
  eventStatus: string;
  mipsFolio: string | null;
}

interface Health {
  processed: number;
  pending: number;
  failed: number;
  lastSyncAgoSeconds: number | null;
  integrations: Record<string, { status: string; lastEventAt: string | null; message: string; today: number }>;
  recent: HubEvent[];
  attention?: HubEvent[];
  timeline: { occurredAt: string; channel: string; message: string; severity: string }[];
  incidents: { occurredAt: string; title: string; description: string; status: string; channel: string }[];
}

type StatusKey = (typeof STATUS_CHANNELS)[number];

/** Clave de la API y destino de cada canal conectado. */
const CHANNEL_META: Record<StatusKey, { api: string; to: string; metric: string }> = {
  uber: { api: "uber_eats", to: "/ventas", metric: "Pedidos" },
  opentable: { api: "opentable", to: "/reservaciones", metric: "Reservaciones" },
  whatsapp: { api: "whatsapp", to: "/whatsapp", metric: "Conversaciones" },
  mips: { api: "mips", to: "/reportes/conciliacion", metric: "Confirmados" },
};

type Filter = "all" | StatusKey;

const FILTERS: { channel: Filter; sublabel: string }[] = [
  { channel: "all", sublabel: "Por atender" },
  { channel: "uber", sublabel: "Pedidos" },
  { channel: "opentable", sublabel: "Reservaciones" },
  { channel: "whatsapp", sublabel: "Conversaciones" },
  { channel: "mips", sublabel: "Confirmados" },
];

function kpi(label: string, tooltip: string, value: number): KpiValue {
  return { label, tooltip, value, previousValue: value, deltaPct: 0, unit: "count" };
}

function needsAttention(status: string) {
  return status === "failed" || status === "pending";
}

interface Priority {
  tone: PriorityTone;
  channel: ChannelKey;
  title: string;
  description: string;
  secondary?: string;
  ctaLabel: string;
  to: string;
}

export default function Salud() {
  const { data, loading, error, reload } = useApi<Health>("/api/hub/health");
  const [filter, setFilter] = useState<Filter>("all");

  const channelsOk = useMemo(() => {
    if (!data) return 0;
    return STATUS_CHANNELS.filter((c) => integrationLevel(data.integrations[CHANNEL_META[c].api]?.status) === "ok").length;
  }, [data]);

  const rows = useMemo(() => {
    const list = data?.attention?.length ? data.attention : (data?.recent ?? []).filter((e) => needsAttention(e.eventStatus));
    if (filter === "all") return list.slice(0, 8);
    return list.filter((e) => toChannelKey(e.channel) === filter).slice(0, 8);
  }, [data, filter]);

  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin telemetría" body="El Hub no ha registrado salud todavía." />;

  const issues = data.pending + data.failed;
  const down = STATUS_CHANNELS.map((c) => ({ key: c, info: data.integrations[CHANNEL_META[c].api] })).filter(
    (c) => c.info && integrationLevel(c.info.status) !== "ok",
  );

  const headline =
    issues > 0
      ? `Hay ${issues} ${issues === 1 ? "situación que requiere" : "situaciones que requieren"} atención.`
      : down.length > 0
        ? "Faltan señales recientes de algunos conectores."
        : "Los conectores reportaron un estado saludable recientemente.";

  const kpis: { kpi: KpiValue; to: string; channel: ChannelKey }[] = [
    {
      kpi: kpi("Necesitan atención", "Eventos que fallaron o no se pudieron confirmar en Míps.", data.failed),
      to: "#eventos",
      channel: "hub",
    },
    {
      kpi: kpi("Pendientes", "Siguen en el Hub y todavía no se confirman en Míps.", data.pending),
      to: "#eventos",
      channel: "hub",
    },
    {
      kpi: kpi("Procesados", "Eventos que el Hub ya resolvió en los registros.", data.processed),
      to: "/reportes/conciliacion",
      channel: "hub",
    },
    {
      kpi: kpi("Conectores vigentes", "Conectores con heartbeat autenticado de los últimos dos minutos. No es un SLA del proveedor.", channelsOk),
      to: "#canales",
      channel: "hub",
    },
  ];

  const priorities: Priority[] = [];
  if (data.failed > 0) {
    priorities.push({
      tone: "critical",
      channel: "hub",
      title: `${data.failed} ${data.failed === 1 ? "evento necesita" : "eventos necesitan"} atención`,
      description: "No llegaron limpios a Míps. Están identificados para reprocesar.",
      secondary: `${num(data.processed)} procesados en total`,
      ctaLabel: "Ver eventos",
      to: "#eventos",
    });
  }
  if (data.pending > 0) {
    priorities.push({
      tone: "attention",
      channel: "hub",
      title: `${data.pending} ${data.pending === 1 ? "pendiente" : "pendientes"} en cola`,
      description: "Siguen en el Hub. Todavía no hay folio de Míps.",
      ctaLabel: "Ver cola",
      to: "#eventos",
    });
  }
  for (const c of down) {
    if (priorities.length >= 3) break;
    priorities.push({
      tone: integrationLevel(c.info.status) === "critical" ? "critical" : "attention",
      channel: c.key,
      title: `${channelConfig[c.key].label} no tiene señal saludable vigente`,
      description: c.info.message || "Hay que revisar este canal.",
      ctaLabel: "Ver canal",
      to: CHANNEL_META[c.key].to,
    });
  }
  if (priorities.length === 0) {
    priorities.push({
      tone: "info",
      channel: "hub",
      title: "Nada que reprocesar ahora",
      description: "Los cuatro canales operan y lo que genera venta se confirma en Míps.",
      ctaLabel: "Ver Hub",
      to: "/hub",
    });
  }

  const openIncidents = data.incidents.filter((i) => i.status !== "resolved");
  const recentIncidents = (openIncidents.length ? openIncidents : data.incidents).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageIntro
        question="¿Está funcionando todo correctamente?"
        channel="hub"
        title="Salud del Hub"
        headline={headline}
        aside={<p className="text-[11px] text-muted-foreground">{data.lastSyncAgoSeconds === null ? "Sin registros de sincronización" : `Último registro hace ${data.lastSyncAgoSeconds} s`}</p>}
      />

      <HealthStatus
        integrations={data.integrations}
        lastSyncAgoSeconds={data.lastSyncAgoSeconds}
        pending={data.pending}
        failed={data.failed}
        issuesTo="#eventos"
      />

      <section>
        <h2 className="mb-2 font-serif text-lg">El Hub ahora</h2>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {kpis.map((item, i) => (
            <KpiCard key={item.kpi.label} kpi={item.kpi} to={item.to} channel={item.channel} showTrend={false} featured={i === 0} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-serif text-lg">Prioridades</h2>
        <div className="flex snap-x gap-2.5 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible">
          {priorities.slice(0, 3).map((p) => (
            <PriorityCard key={p.title} {...p} />
          ))}
        </div>
      </section>

      <ChartCard title="De la cola a Míps" channel="hub">
        <FunnelStrip
          rate={{
            value: `${Math.round((data.processed / Math.max(1, data.processed + data.pending + data.failed)) * 100)}%`,
            label: "de los eventos del Hub ya se resolvieron",
          }}
          steps={[
            { label: "Necesitan atención", value: data.failed, channel: "hub" },
            { label: "Pendientes", value: data.pending, channel: "hub" },
            { label: "Procesados", value: data.processed, channel: "mips" },
          ]}
        />
      </ChartCard>

      <section id="canales" className="scroll-mt-24 rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <h2 className="font-serif text-lg">Estado de los canales</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tres fuentes y un destino. Si una fuente no opera, se siente en pedidos, mesas o WhatsApp; si Míps no opera, no hay folio.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {STATUS_CHANNELS.map((c) => {
            const info = data.integrations[CHANNEL_META[c].api];
            return (
              <ChannelSourceCard
                key={c}
                channel={c}
                status={info?.status}
                value={info?.today ?? 0}
                metric={CHANNEL_META[c].metric}
                message={info?.message}
                to={CHANNEL_META[c].to}
              />
            );
          })}
        </div>
      </section>

      <section id="eventos" className="scroll-mt-24 rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg">Qué hay que atender</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {filter === "all"
                ? "Eventos pendientes o con error, de cualquier canal."
                : `Eventos pendientes o con error de ${channelConfig[filter].label}.`}
            </p>
          </div>
          <ChannelSelector options={FILTERS} value={filter} onChange={setFilter} ariaLabel="Filtrar eventos por canal" />
        </div>
        <ChannelEventTable rows={rows} attentionTo={null} emptyText="No hay eventos por atender en este filtro." />
        <Link to="/reportes/conciliacion" className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">
          Bajar conciliación →
        </Link>
      </section>

      {recentIncidents.length > 0 && (
        <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
          <h2 className="font-serif text-lg">Incidencias recientes</h2>
          <ul className="mt-2 divide-y">
            {recentIncidents.map((i) => (
              <li key={i.title} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <ChannelBadge channel={i.channel} size="sm" />
                    <span className="font-medium">{i.title}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{i.description}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {hourMin(i.occurredAt)} · {i.status === "resolved" ? "Resuelta" : "Abierta"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg">Última actividad</h2>
          <Link to="/hub" className="text-sm font-medium text-primary hover:underline">
            Ver Hub →
          </Link>
        </div>
        <ul className="mt-2 divide-y">
          {data.timeline.slice(0, 5).map((t) => (
            <li key={t.occurredAt + t.message} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-12 shrink-0 tabular text-muted-foreground">{hourMin(t.occurredAt)}</span>
              <ChannelBadge channel={toChannelKey(t.channel, "hub")} variant="plain" className="w-[104px] justify-start" />
              <span className={cn("flex-1", t.severity === "warning" && "font-medium text-amber")}>{t.message}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
