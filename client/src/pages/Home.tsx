import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { ChartCard } from "@/components/chart-card";
import { FilterBar } from "@/components/filter-bar";
import { HealthStatus } from "@/components/health-status";
import { Heatmap, type HeatMetric } from "@/components/heatmap";
import { KpiCard } from "@/components/kpi-card";
import { PeriodSelector } from "@/components/period-selector";
import { PriorityCard, type PriorityTone } from "@/components/priority-card";
import { TrendIndicator } from "@/components/trend-indicator";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import type { Insight, KpiValue } from "@shared/types";
import { greetingFor } from "@shared/time";
import { DOW_FULL, hourMin, num } from "@/lib/format";

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

const EVENT_TYPE: Record<string, string> = {
  order: "Pedido Uber",
  reservation: "Reserva OpenTable",
  conversation: "WhatsApp",
  sale: "Venta Míps",
};

const EVENT_STATUS: Record<string, string> = {
  confirmed: "Confirmado",
  received: "Recibida",
  pending: "Necesita atención",
  failed: "Necesita atención",
  processing: "En proceso",
};

const HEAT_FILTERS: { id: HeatMetric; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "uber", label: "Pedidos" },
  { id: "ot", label: "Reservaciones" },
  { id: "wa", label: "WhatsApp" },
];

export default function Home() {
  const { qs, range } = usePeriod();
  const [heatMetric, setHeatMetric] = useState<HeatMetric>("all");
  const summary = useApi<Summary>(`/api/dashboard/summary${qs}`);
  const insights = useApi<Insights>(`/api/dashboard/insights${qs}`);
  const heat = useApi<Heat>(`/api/dashboard/heatmap${qs}`);
  const hub = useApi<Hub>("/api/hub/health");
  const uber = useApi<Uber>(`/api/uber/summary${qs}`);

  const loading = summary.loading || insights.loading || heat.loading || hub.loading;
  const error = summary.error || insights.error || heat.error || hub.error;

  const homeKpis = useMemo(() => {
    if (!summary.data) return [] as { kpi: KpiValue; to: string }[];
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
    const items: { kpi: KpiValue; to: string }[] = [];
    if (sales) items.push({ kpi: { ...sales, label: "Ventas digitales" }, to: "/ventas" });
    items.push({
      kpi: toKpi("Pedidos", "Pedidos de Uber Eats recibidos en el periodo. No incluye reservaciones ni conversaciones.", channels.uber_eats),
      to: "/ventas",
    });
    items.push({
      kpi: toKpi("Reservaciones", "Reservaciones OpenTable con hora de visita en el periodo.", channels.opentable),
      to: "/reservaciones",
    });
    if (ticket) items.push({ kpi: ticket, to: "/ventas" });
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
      ? [
          { name: "Pedidos Uber Eats", delta: channels.uber_eats.deltaPct ?? 0, to: "/ventas" },
          { name: "Reservaciones", delta: channels.opentable.deltaPct ?? 0, to: "/reservaciones" },
          { name: "WhatsApp", delta: channels.whatsapp.deltaPct ?? 0, to: "/whatsapp" },
        ].sort((a, b) => b.delta - a.delta)[0]
      : null;
    const peak = heat.data?.peak;
    const schedule = peak
      ? {
          name: `${DOW_FULL[peak.dow] ?? ""} ${String(peak.hour).padStart(2, "0")}–${String(peak.hour + 2).padStart(2, "0")} h`,
          to: "#demanda",
        }
      : null;
    return { product, channel: channelEntries, schedule };
  }, [uber.data, summary.data, heat.data]);

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
            <KpiCard key={item.kpi.label} kpi={item.kpi} to={item.to} />
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
              title={insight.title}
              description={insight.description}
              secondary={insight.comparison ?? insight.metric}
              ctaLabel={insight.ctaLabel}
              to={insight.deepLink}
            />
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <h2 className="font-serif text-lg">Así llega tu negocio</h2>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-stretch">
          {(
            [
              ["uber_eats", summary.data.channels.uber_eats, "/ventas"],
              ["opentable", summary.data.channels.opentable, "/reservaciones"],
              ["whatsapp", summary.data.channels.whatsapp, "/whatsapp"],
            ] as const
          ).map(([key, ch, href]) => (
            <Link
              key={key}
              to={href}
              className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md bg-muted/70 px-3 py-2.5 hover:bg-accent"
            >
              <span>
                <ChannelBadge channel={key} />
                <p className="mt-1 text-[11px] text-muted-foreground">{ch.metric}</p>
              </span>
              <span className="text-right">
                <span className="block font-serif text-2xl tabular leading-none">{num(ch.value)}</span>
                <TrendIndicator value={ch.deltaPct} className="text-xs" />
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-center text-[11px] text-muted-foreground">↓ Confirmado en Míps</div>
        <Link
          to="/salud"
          className="mt-1 flex items-center justify-between rounded-md bg-espresso px-3 py-2.5 text-[#F6F1EA] hover:opacity-95"
        >
          <ChannelBadge channel="mips" label="Míps POS" />
          <span className="text-right">
            <span className="block font-serif text-2xl tabular leading-none">
              {num(summary.data.channels.mips.value)}
            </span>
            <span className="text-[11px] text-[#C9BDB0]">ventas confirmadas</span>
          </span>
        </Link>
      </section>

      <ChartCard
        title="Demanda"
        action={<FilterBar options={HEAT_FILTERS} value={heatMetric} onChange={setHeatMetric} ariaLabel="Filtrar demanda" />}
      >
        <div id="demanda">
          <Heatmap
            cells={heat.data.cells}
            metric={heatMetric}
            peakLabel={`Mayor concentración: ${DOW_FULL[peak.dow]} ${String(peak.hour).padStart(2, "0")}–${String(peak.hour + 2).padStart(2, "0")} h.`}
          />
        </div>
      </ChartCard>

      <section className="grid gap-2.5 md:grid-cols-3">
        <h2 className="font-serif text-lg md:col-span-3">Qué está creciendo</h2>
        <GrowthTile
          kind="Producto"
          title={growth.product?.name ?? "Sin producto destacado"}
          delta={growth.product?.growthPct ?? null}
          to="/ventas?focus=productos"
        />
        <GrowthTile
          kind="Canal"
          title={growth.channel?.name ?? "Canales"}
          delta={growth.channel?.delta ?? null}
          to={growth.channel?.to ?? "/hub"}
        />
        <GrowthTile kind="Horario" title={growth.schedule?.name ?? "Ventana pico"} to={growth.schedule?.to ?? "#demanda"} />
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
            <li key={e.externalId + e.occurredAt} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-12 tabular text-muted-foreground">{hourMin(e.occurredAt)}</span>
              <span className="flex-1">{EVENT_TYPE[e.eventType] ?? e.eventType}</span>
              <span className="text-muted-foreground">{EVENT_STATUS[e.eventStatus] ?? e.eventStatus}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function GrowthTile({
  kind,
  title,
  delta,
  to,
}: {
  kind: string;
  title: string;
  delta?: number | null;
  to: string;
}) {
  return (
    <Link to={to} className="rounded-lg border bg-card px-4 py-3 shadow-soft hover:border-primary/40">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{kind}</p>
      <p className="mt-1 font-serif text-lg leading-snug">{title}</p>
      {delta != null && <TrendIndicator value={delta} className="mt-1 block" />}
    </Link>
  );
}
