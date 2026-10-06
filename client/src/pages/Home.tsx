import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { ChannelEvent } from "@/components/channel-event";
import { ChannelSelector } from "@/components/channel-selector";
import { ChartCard } from "@/components/chart-card";
import { CrossChannelInsight } from "@/components/cross-channel-insight";
import { HealthStatus } from "@/components/health-status";
import { Heatmap, heatMetricFor, heatMetricLabel } from "@/components/heatmap";
import { HubFlow } from "@/components/hub-flow";
import { KpiCard } from "@/components/kpi-card";
import { PeriodSelector } from "@/components/period-selector";
import { PriorityCard, type PriorityTone } from "@/components/priority-card";
import { TrendIndicator } from "@/components/trend-indicator";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import { channelForInsight, countWithUnit, type ChannelKey } from "@/lib/channel-config";
import type { Insight, KpiValue } from "@shared/types";
import { greetingFor } from "@shared/time";
import { DOW_FULL, num } from "@/lib/format";

interface ChannelMetric {
  metric: string;
  value: number;
  previous?: number;
  deltaPct?: number | null;
}

interface Summary {
  period: { label: string };
  kpis: KpiValue[];
  channels: {
    uber_eats: ChannelMetric;
    opentable: ChannelMetric;
    whatsapp: ChannelMetric;
    mips: ChannelMetric;
  };
}

interface Insights {
  insights: Insight[];
}

interface Heat {
  cells: Array<{ dow: number; hour: number; uber: number; ot: number; wa: number; total: number; intensity: number }>;
  peak: { dow: number; hour: number };
}

interface Hub {
  pending: number;
  failed: number;
  lastSyncAgoSeconds: number;
  integrations: Record<string, { status: string }>;
  recent: Array<{
    occurredAt: string;
    channel: string;
    eventType: string;
    eventStatus: string;
    externalId: string;
  }>;
}

interface Uber {
  growingProducts: { name: string; growthPct: number | null; sales: number }[];
  topProducts: { name: string; growthPct: number | null }[];
}

const TONE: Record<string, PriorityTone> = {
  critical: "critical",
  attention: "attention",
  opportunity: "opportunity",
  info: "info",
};

type HeatChannel = "all" | "uber" | "opentable" | "whatsapp";

const HEAT_OPTIONS: { channel: HeatChannel; sublabel: string }[] = [
  { channel: "all", sublabel: "Actividad digital" },
  { channel: "uber", sublabel: "Pedidos" },
  { channel: "opentable", sublabel: "Reservaciones" },
  { channel: "whatsapp", sublabel: "Conversaciones" },
];

const HEAT_DESCRIPTION: Record<HeatChannel, string> = {
  all: "Pedidos, reservaciones y conversaciones por día y hora. Son métricas distintas; el total sólo muestra dónde se concentra la actividad.",
  uber: "Pedidos de Uber Eats por día y hora.",
  opentable: "Reservaciones de OpenTable por día y hora de visita.",
  whatsapp: "Conversaciones de WhatsApp por día y hora de inicio.",
};

function hourWindow(hour: number) {
  return `${String(hour).padStart(2, "0")}–${String(hour + 2).padStart(2, "0")} h`;
}

export default function Home() {
  const { qs, range } = usePeriod();
  const [heatChannel, setHeatChannel] = useState<HeatChannel>("all");
  const summary = useApi<Summary>(`/api/dashboard/summary${qs}`);
  const insights = useApi<Insights>(`/api/dashboard/insights${qs}`);
  const heat = useApi<Heat>(`/api/dashboard/heatmap${qs}`);
  const hub = useApi<Hub>("/api/hub/health");
  const uber = useApi<Uber>(`/api/uber/summary${qs}`);

  const loading = summary.loading || insights.loading || heat.loading || hub.loading;
  const error = summary.error || insights.error || heat.error || hub.error;

  const homeKpis = useMemo(() => {
    if (!summary.data) return [] as { kpi: KpiValue; to: string; channel: ChannelKey }[];
    const { kpis, channels } = summary.data;
    const sales = kpis.find((k) => k.label.startsWith("Ventas digitales"));
    const ticket = kpis.find((k) => k.label === "Ticket promedio");
    const toKpi = (label: string, tooltip: string, ch: ChannelMetric): KpiValue => ({
      label,
      tooltip,
      value: ch.value,
      previousValue: ch.previous ?? 0,
      deltaPct: ch.deltaPct ?? null,
      unit: "count",
    });
    const items: { kpi: KpiValue; to: string; channel: ChannelKey }[] = [];
    if (sales) items.push({ kpi: { ...sales, label: "Ventas confirmadas en Míps" }, to: "/reportes/conciliacion", channel: "mips" });
    items.push({
      kpi: toKpi("Pedidos", "Pedidos de Uber Eats recibidos en el periodo. No incluye reservaciones ni conversaciones.", channels.uber_eats),
      to: "/ventas",
      channel: "uber",
    });
    items.push({
      kpi: toKpi("Reservaciones", "Reservaciones OpenTable con hora de visita en el periodo.", channels.opentable),
      to: "/reservaciones",
      channel: "opentable",
    });
    if (ticket) items.push({ kpi: ticket, to: "/ventas", channel: "uber" });
    return items;
  }, [summary.data]);

  const priorities = useMemo(() => {
    const list = insights.data?.insights ?? [];
    const order: Record<string, number> = { critical: 0, attention: 1, opportunity: 2, info: 3 };
    return [...list].sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9)).slice(0, 3);
  }, [insights.data]);

  const attentionCount = priorities.filter((p) => p.priority === "critical" || p.priority === "attention").length
    + (hub.data && hub.data.pending + hub.data.failed > 0 ? 1 : 0);

  const growth = useMemo(() => {
    const product =
      uber.data?.growingProducts.find((p) => (p.growthPct ?? 0) > 0) ?? uber.data?.topProducts[0];
    const channels = summary.data?.channels;
    const channelEntries = channels
      ? (
          [
            { channel: "uber", name: "Pedidos Uber Eats", delta: channels.uber_eats.deltaPct ?? 0, to: "/ventas" },
            { channel: "opentable", name: "Reservaciones OpenTable", delta: channels.opentable.deltaPct ?? 0, to: "/reservaciones" },
            { channel: "whatsapp", name: "Conversaciones WhatsApp", delta: channels.whatsapp.deltaPct ?? 0, to: "/whatsapp" },
          ] as { channel: ChannelKey; name: string; delta: number; to: string }[]
        ).sort((a, b) => b.delta - a.delta)[0]
      : null;
    return { product, channel: channelEntries };
  }, [uber.data, summary.data]);

  /** Aportación de cada fuente en la ventana pico: lo que el Hub cruza para señalar la concentración. */
  const peakBreakdown = useMemo(() => {
    if (!heat.data) return null;
    const { peak, cells } = heat.data;
    const window = cells.filter((c) => c.dow === peak.dow && c.hour >= peak.hour && c.hour < peak.hour + 2);
    return {
      uber: window.reduce((s, c) => s + c.uber, 0),
      opentable: window.reduce((s, c) => s + c.ot, 0),
      whatsapp: window.reduce((s, c) => s + c.wa, 0),
    };
  }, [heat.data]);

  if (loading) return <PageLoading />;
  if (error) {
    return (
      <PageError
        message={error}
        onRetry={() => {
          summary.reload();
          insights.reload();
          heat.reload();
          hub.reload();
        }}
      />
    );
  }
  if (!summary.data || !insights.data || !heat.data || !hub.data) {
    return <EmptyState title="Sin actividad" body="Todavía no hay movimiento en este periodo." />;
  }

  const greeting = greetingFor();
  const headline =
    attentionCount > 0
      ? `Hay ${attentionCount} ${attentionCount === 1 ? "situación que requiere" : "situaciones que requieren"} atención.`
      : "Todo está operando normalmente.";
  const peak = heat.data.peak;
  const heatMetric = heatMetricFor(heatChannel);
  const activity = summary.data.kpis.find((k) => k.label === "Actividad digital");
  const { channels } = summary.data;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        ¿Cómo está funcionando mi restaurante?
      </p>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl leading-tight md:text-[1.75rem]">
            {greeting}, Alonso.
          </h1>
          <p className="mt-1 text-sm font-medium text-foreground">{headline}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <PeriodSelector />
          <p className="text-[11px] text-muted-foreground">
            {range === "today" ? "Hoy" : summary.data.period.label} · actualizado hace {hub.data.lastSyncAgoSeconds} s
          </p>
        </div>
      </header>

      <HealthStatus
        integrations={hub.data.integrations}
        lastSyncAgoSeconds={hub.data.lastSyncAgoSeconds}
        pending={hub.data.pending}
        failed={hub.data.failed}
      />

      <section>
        <h2 className="mb-2 font-serif text-lg">Tu restaurante ahora</h2>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {homeKpis.map((item) => (
            <KpiCard key={item.kpi.label} kpi={item.kpi} to={item.to} channel={item.channel} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-serif text-lg">Prioridades</h2>
        <div className="flex snap-x gap-2.5 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible">
          {priorities.map((insight) => (
            <PriorityCard
              key={insight.id}
              tone={TONE[insight.priority] ?? "info"}
              channel={channelForInsight(insight)}
              title={insight.title}
              description={insight.description}
              secondary={insight.comparison ?? insight.metric}
              ctaLabel={insight.ctaLabel}
              to={insight.deepLink}
            />
          ))}
        </div>
      </section>

      <HubFlow
        sources={[
          { channel: "uber", value: channels.uber_eats.value, metric: "pedidos", deltaPct: channels.uber_eats.deltaPct, to: "/ventas" },
          { channel: "opentable", value: channels.opentable.value, metric: "reservaciones", deltaPct: channels.opentable.deltaPct, to: "/reservaciones" },
          { channel: "whatsapp", value: channels.whatsapp.value, metric: "conversaciones", deltaPct: channels.whatsapp.deltaPct, to: "/whatsapp" },
        ]}
        hub={{ events: activity?.value ?? channels.uber_eats.value + channels.opentable.value + channels.whatsapp.value, deltaPct: activity?.deltaPct, to: "/hub" }}
        destination={{ value: channels.mips.value, deltaPct: channels.mips.deltaPct, to: "/reportes/conciliacion" }}
      />

      <ChartCard
        title={`¿Cuándo ocurre la demanda? · ${heatMetricLabel(heatMetric)}`}
        action={<ChannelSelector options={HEAT_OPTIONS} value={heatChannel} onChange={setHeatChannel} ariaLabel="Fuente de la demanda" />}
      >
        <div id="demanda" className="scroll-mt-24">
          <Heatmap cells={heat.data.cells} metric={heatMetric} description={HEAT_DESCRIPTION[heatChannel]} />
          {peakBreakdown && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ChannelBadge channel="hub" variant="plain" />
                <span>
                  Mayor concentración: <span className="font-medium text-foreground">{DOW_FULL[peak.dow]} {hourWindow(peak.hour)}</span>
                </span>
              </span>
              <span className="hidden h-3 w-px bg-border sm:block" />
              {(["uber", "opentable", "whatsapp"] as const).map((c) => (
                <span key={c} className="inline-flex items-center gap-1">
                  <ChannelBadge channel={c} variant="plain" showLabel={false} />
                  <span className="tabular text-foreground">{countWithUnit(c, peakBreakdown[c], num(peakBreakdown[c]))}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </ChartCard>

      <section className="grid gap-2.5 md:grid-cols-3">
        <h2 className="font-serif text-lg md:col-span-3">Qué está creciendo</h2>
        <GrowthTile
          channel="uber"
          kind="Producto"
          title={growth.product?.name ?? "Sin producto destacado"}
          delta={growth.product?.growthPct ?? null}
          to="/ventas?focus=productos"
        />
        <GrowthTile
          channel={growth.channel?.channel ?? "all"}
          kind="Canal"
          title={growth.channel?.name ?? "Canales"}
          delta={growth.channel?.delta ?? null}
          to={growth.channel?.to ?? "/hub"}
        />
        {peakBreakdown && (
          <CrossChannelInsight
            tone="opportunity"
            title={`Tu mayor concentración digital es el ${DOW_FULL[peak.dow].toLowerCase()} ${hourWindow(peak.hour)}`}
            breakdown={[
              { channel: "uber", value: peakBreakdown.uber },
              { channel: "opentable", value: peakBreakdown.opentable },
              { channel: "whatsapp", value: peakBreakdown.whatsapp },
            ]}
            ctaLabel="Analizar horario"
            to="#demanda"
          />
        )}
      </section>

      <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg">Última actividad</h2>
          <Link to="/hub" className="text-sm font-medium text-primary hover:underline">
            Ver Hub →
          </Link>
        </div>
        <ul className="mt-2 divide-y">
          {hub.data.recent.slice(0, 5).map((e) => (
            <ChannelEvent key={e.externalId + e.occurredAt} event={e} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function GrowthTile({
  channel,
  kind,
  title,
  delta,
  to,
}: {
  channel: ChannelKey;
  kind: string;
  title: string;
  delta?: number | null;
  to: string;
}) {
  return (
    <Link to={to} className="rounded-lg border bg-card px-4 py-3 shadow-soft hover:border-primary/40">
      <p className="flex items-center gap-1.5">
        <ChannelBadge channel={channel} size="sm" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{kind}</span>
      </p>
      <p className="mt-1.5 font-serif text-lg leading-snug">{title}</p>
      {delta != null && <TrendIndicator value={delta} className="mt-1 block" />}
    </Link>
  );
}
