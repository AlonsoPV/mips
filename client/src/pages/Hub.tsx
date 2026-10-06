import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChannelEventTable } from "@/components/channel-event-table";
import { ChannelSelector } from "@/components/channel-selector";
import { HealthStatus } from "@/components/health-status";
import { HubFlow } from "@/components/hub-flow";
import { KpiCard } from "@/components/kpi-card";
import { PageIntro } from "@/components/page-intro";
import { PriorityCard, type PriorityTone } from "@/components/priority-card";
import { integrationLevel } from "@/components/status-indicator";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { SOURCE_CHANNELS, channelConfig, toChannelKey, type ChannelKey, type SourceKey } from "@/lib/channel-config";
import { num } from "@/lib/format";
import type { KpiValue } from "@shared/types";

interface HubData {
  pending: number;
  failed: number;
  processed: number;
  lastSyncAgoSeconds: number | null;
  integrations: Record<string, { status: string; lastEventAt: string | null; message: string; today: number }>;
  recent: Array<{
    occurredAt: string;
    channel: string;
    eventType: string;
    externalId: string;
    eventStatus: string;
    mipsFolio: string | null;
  }>;
}

/** Clave de la API por canal del sistema visual. */
const API_KEY: Record<SourceKey | "mips", string> = {
  uber: "uber_eats",
  opentable: "opentable",
  whatsapp: "whatsapp",
  mips: "mips",
};

const PAGE: Record<SourceKey, string> = { uber: "/ventas", opentable: "/reservaciones", whatsapp: "/whatsapp" };

type Filter = "all" | SourceKey | "mips";

const FILTERS: { channel: Filter; sublabel: string }[] = [
  { channel: "all", sublabel: "Actividad" },
  { channel: "uber", sublabel: "Pedidos" },
  { channel: "opentable", sublabel: "Reservaciones" },
  { channel: "whatsapp", sublabel: "Conversaciones" },
  { channel: "mips", sublabel: "Confirmados" },
];

function kpi(label: string, tooltip: string, value: number): KpiValue {
  return { label, tooltip, value, previousValue: value, deltaPct: 0, unit: "count" };
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

export default function Hub() {
  const { data, loading, error, reload } = useApi<HubData>("/api/hub/health");
  const [filter, setFilter] = useState<Filter>("all");

  const sourceEvents = useMemo(
    () => (data ? SOURCE_CHANNELS.reduce((s, c) => s + (data.integrations[API_KEY[c]]?.today ?? 0), 0) : 0),
    [data],
  );

  const priorities = useMemo<Priority[]>(() => {
    if (!data) return [];
    const cards: Priority[] = [];
    if (data.failed > 0) {
      cards.push({
        tone: "critical",
        channel: "hub",
        title: `${data.failed} ${data.failed === 1 ? "evento necesita" : "eventos necesitan"} atención`,
        description: "No llegaron limpios a Míps. El Hub los tiene identificados para reprocesar.",
        secondary: `${num(data.processed)} procesados en total`,
        ctaLabel: "Revisar incidencias",
        to: "/salud#eventos",
      });
    }
    if (data.pending > 0) {
      cards.push({
        tone: "attention",
        channel: "hub",
        title: `${data.pending} ${data.pending === 1 ? "pendiente" : "pendientes"} en cola`,
        description: "Siguen en el Hub y todavía no se confirman en Míps.",
        ctaLabel: "Ver salud del Hub",
        to: "/salud#eventos",
      });
    }
    for (const c of SOURCE_CHANNELS) {
      if (cards.length >= 3) break;
      const info = data.integrations[API_KEY[c]];
      if (!info || integrationLevel(info.status) === "ok") continue;
      cards.push({
        tone: integrationLevel(info.status) === "critical" ? "critical" : "attention",
        channel: c,
        title: `${channelConfig[c].label} no está del todo operativo`,
        description: info.message || "Hay que revisar este canal.",
        ctaLabel: "Ver canal",
        to: PAGE[c],
      });
    }
    if (cards.length === 0) {
      cards.push({
        tone: "info",
        channel: "hub",
        title: "La información está llegando",
        description: "Los tres canales operan y lo que genera venta se confirma en Míps.",
        ctaLabel: "Ver mi operación",
        to: "/inicio",
      });
    }
    return cards.slice(0, 3);
  }, [data]);

  const rows = useMemo(() => {
    const list = data?.recent ?? [];
    if (filter === "all") return list.slice(0, 8);
    return list.filter((e) => toChannelKey(e.channel) === filter).slice(0, 8);
  }, [data, filter]);

  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin actividad del Hub" body="Todavía no ha llegado información de los canales." />;

  const issues = data.pending + data.failed;
  const headline =
    issues > 0
      ? `Hay ${issues} ${issues === 1 ? "situación que requiere" : "situaciones que requieren"} atención.`
      : "La información está llegando correctamente.";

  const mipsToday = data.integrations.mips?.today ?? 0;
  const kpis: { kpi: KpiValue; to: string; channel: ChannelKey }[] = [
    {
      kpi: kpi("Actividad digital hoy", "Pedidos, reservaciones y conversaciones que el Hub recibió hoy. Son métricas distintas; aquí sólo se cuentan eventos.", sourceEvents),
      to: "#flujo",
      channel: "hub",
    },
    {
      kpi: kpi("Pendientes", "Eventos en cola del Hub, todavía sin confirmar en Míps.", data.pending),
      to: "/salud#eventos",
      channel: "hub",
    },
    {
      kpi: kpi("Necesitan atención", "Eventos que fallaron o no se pudieron confirmar en Míps.", data.failed),
      to: "/salud#eventos",
      channel: "hub",
    },
    {
      kpi: kpi("Ventas conciliadas en Míps", "Ventas de canales digitales que hoy ya tienen folio de Míps POS.", mipsToday),
      to: "/reportes/conciliacion",
      channel: "mips",
    },
  ];

  const filterCfg = channelConfig[filter];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageIntro
        question="¿Está llegando correctamente la información?"
        channel="hub"
        title="Hub"
        headline={headline}
        aside={<p className="text-[11px] text-muted-foreground">{data.lastSyncAgoSeconds === null ? "Demo · sin registros de sincronización" : `Demo · último registro hace ${data.lastSyncAgoSeconds} s`}</p>}
      />

      <HealthStatus
        integrations={data.integrations}
        lastSyncAgoSeconds={data.lastSyncAgoSeconds}
        pending={data.pending}
        failed={data.failed}
        issuesTo="/salud#eventos"
      />

      <section>
        <h2 className="mb-2 font-serif text-lg">Tu Hub ahora</h2>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {kpis.map((item) => (
            <KpiCard key={item.kpi.label} kpi={item.kpi} to={item.to} channel={item.channel} showTrend={false} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-serif text-lg">Qué atender</h2>
        <div className="flex snap-x gap-2.5 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible">
          {priorities.map((p) => (
            <PriorityCard key={p.title} {...p} />
          ))}
        </div>
      </section>

      <div id="flujo" className="scroll-mt-24">
        <HubFlow
          title="Cómo viaja la información hoy"
          sources={SOURCE_CHANNELS.map((c) => ({
            channel: c,
            value: data.integrations[API_KEY[c]]?.today ?? 0,
            metric: `${channelConfig[c].unit.plural} hoy`,
            to: PAGE[c],
          }))}
          hub={{ events: sourceEvents, to: "/salud" }}
          destination={{ value: mipsToday, to: "/reportes/conciliacion" }}
          hubCaption="eventos recibidos hoy"
          destinationCaption="ventas confirmadas en Míps hoy"
        />
      </div>

      <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg">Actividad del Hub</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {filter === "all"
                ? "Últimos eventos de Uber Eats, OpenTable, WhatsApp y Míps POS."
                : `Últimos eventos de ${filterCfg.label}: ${filterCfg.describes.toLowerCase()}.`}
            </p>
          </div>
          <ChannelSelector options={FILTERS} value={filter} onChange={setFilter} ariaLabel="Filtrar actividad por canal" />
        </div>
        <ChannelEventTable rows={rows} emptyText="No hay actividad en este canal ahora." />
        <Link to="/salud" className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">
          Ver salud del Hub →
        </Link>
      </section>
    </div>
  );
}
