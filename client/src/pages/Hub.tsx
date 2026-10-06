import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { FilterBar } from "@/components/filter-bar";
import { HealthStatus } from "@/components/health-status";
import { KpiCard } from "@/components/kpi-card";
import { PriorityCard } from "@/components/priority-card";
import { StatusIndicator, integrationLabel, integrationLevel } from "@/components/status-indicator";
import { DataTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-table";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import type { KpiValue } from "@shared/types";
import { hourMin, num } from "@/lib/format";

interface HubData {
  pending: number;
  failed: number;
  processed: number;
  lastSyncAgoSeconds: number;
  integrations: Record<
    string,
    { status: string; lastEventAt: string | null; message: string; today: number }
  >;
  recent: Array<{
    occurredAt: string;
    channel: string;
    eventType: string;
    externalId: string;
    eventStatus: string;
    mipsFolio: string | null;
  }>;
}

const CHANNELS = [
  { key: "uber_eats", to: "/ventas", metric: "Pedidos" },
  { key: "opentable", to: "/reservaciones", metric: "Reservaciones" },
  { key: "whatsapp", to: "/whatsapp", metric: "Conversaciones" },
] as const;

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "uber_eats", label: "Pedidos" },
  { id: "opentable", label: "Reservaciones" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "mips", label: "Míps" },
] as const;

const WHAT: Record<string, string> = {
  order: "Pedido Uber",
  reservation: "Reserva OpenTable",
  conversation: "Conversación WhatsApp",
  sale: "Venta Míps",
};

const STATE: Record<string, string> = {
  confirmed: "Confirmado",
  received: "Recibida",
  pending: "Necesita atención",
  failed: "Necesita atención",
  processing: "En proceso",
};

const CHANNEL_PAGE: Record<string, string> = {
  uber_eats: "/ventas",
  opentable: "/reservaciones",
  whatsapp: "/whatsapp",
  mips: "/salud",
};

function kpi(label: string, tooltip: string, value: number): KpiValue {
  return { label, tooltip, value, previousValue: value, deltaPct: 0, unit: "count" };
}

export default function Hub() {
  const { data, loading, error, reload } = useApi<HubData>("/api/hub/health");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const activityToday = useMemo(() => {
    if (!data) return 0;
    return CHANNELS.reduce((s, c) => s + (data.integrations[c.key]?.today ?? 0), 0) + (data.integrations.mips?.today ?? 0);
  }, [data]);

  const priorities = useMemo(() => {
    if (!data) return [];
    const cards = [];
    if (data.failed > 0) {
      cards.push({
        tone: "critical" as const,
        title: `${data.failed} ${data.failed === 1 ? "evento necesita" : "eventos necesitan"} atención`,
        description: "No llegaron limpios a Míps. El Hub los tiene identificados para reprocesar.",
        secondary: `${num(data.processed)} procesados en total`,
        ctaLabel: "Revisar incidencias",
        to: "/salud",
      });
    }
    if (data.pending > 0) {
      cards.push({
        tone: "attention" as const,
        title: `${data.pending} ${data.pending === 1 ? "pendiente" : "pendientes"} en cola`,
        description: "Siguen en el Hub y todavía no se confirman en Míps.",
        ctaLabel: "Ver salud del Hub",
        to: "/salud",
      });
    }
    const down = CHANNELS.map((c) => ({ ...c, info: data.integrations[c.key] })).filter(
      (c) => c.info && integrationLevel(c.info.status) !== "ok",
    );
    for (const c of down) {
      if (cards.length >= 3) break;
      cards.push({
        tone: (integrationLevel(c.info.status) === "critical" ? "critical" : "attention") as "critical" | "attention",
        title: `${c.key === "uber_eats" ? "Uber Eats" : c.key === "opentable" ? "OpenTable" : "WhatsApp"} no está del todo operativo`,
        description: c.info.message || "Hay que revisar este canal.",
        ctaLabel: "Ver canal",
        to: c.to,
      });
    }
    if (cards.length === 0) {
      cards.push({
        tone: "info" as const,
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
    return list.filter((e) => e.channel === filter).slice(0, 8);
  }, [data, filter]);

  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin actividad del Hub" body="Todavía no ha llegado información de los canales." />;

  const issues = data.pending + data.failed;
  const headline =
    issues > 0
      ? `Hay ${issues} ${issues === 1 ? "situación que requiere" : "situaciones que requieren"} atención.`
      : "La información está llegando correctamente.";

  const kpis: { kpi: KpiValue; to: string }[] = [
    {
      kpi: kpi("Actividad de hoy", "Eventos que el Hub recibió hoy de Uber Eats, OpenTable, WhatsApp y Míps.", activityToday),
      to: "/inicio",
    },
    {
      kpi: kpi("Pendientes", "Eventos en cola, todavía sin confirmar en Míps.", data.pending),
      to: "/salud",
    },
    {
      kpi: kpi("Necesitan atención", "Eventos que fallaron o no se pudieron confirmar.", data.failed),
      to: "/salud",
    },
    {
      kpi: kpi("Confirmados en Míps", "Ventas de canales digitales que ya tienen folio de Míps hoy.", data.integrations.mips?.today ?? 0),
      to: "/salud",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        ¿Está llegando correctamente la información?
      </p>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl leading-tight md:text-[1.75rem]">Hub</h1>
          <p className="mt-1 text-sm font-medium">{headline}</p>
        </div>
        <p className="text-[11px] text-muted-foreground">En vivo · hace {data.lastSyncAgoSeconds} s</p>
      </header>

      <HealthStatus
        integrations={data.integrations}
        lastSyncAgoSeconds={data.lastSyncAgoSeconds}
        pending={data.pending}
        failed={data.failed}
      />

      <section>
        <h2 className="mb-2 font-serif text-lg">Tu Hub ahora</h2>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {kpis.map((item) => (
            <KpiCard key={item.kpi.label} kpi={item.kpi} to={item.to} showTrend={false} />
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

      <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <h2 className="font-serif text-lg">Cómo viaja la información</h2>
        <p className="mt-1 text-xs text-muted-foreground">Cada canal se mide por lo que produce. El folio de Míps solo aparece cuando hay venta.</p>
        <div className="mt-3 flex flex-col gap-2 lg:flex-row">
          {CHANNELS.map((c) => {
            const info = data.integrations[c.key];
            const level = integrationLevel(info?.status);
            return (
              <Link
                key={c.key}
                to={c.to}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md bg-muted/70 px-3 py-2.5 hover:bg-accent"
              >
                <span>
                  <ChannelBadge channel={c.key} />
                  <span className="mt-1 block">
                    <StatusIndicator level={level} label={integrationLabel(info?.status)} compact />
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-serif text-2xl tabular leading-none">{num(info?.today ?? 0)}</span>
                  <span className="text-[11px] text-muted-foreground">{c.metric} hoy</span>
                </span>
              </Link>
            );
          })}
        </div>
        <div className="mt-2 text-center text-[11px] text-muted-foreground">↓ Lo que genera venta se confirma en Míps</div>
        <Link
          to="/salud"
          className="mt-1 flex items-center justify-between rounded-md bg-espresso px-3 py-2.5 text-[#F6F1EA] hover:opacity-95"
        >
          <span>
            <ChannelBadge channel="mips" label="Míps POS" />
            <span className="mt-1 block text-[11px] text-[#C9BDB0]">
              {integrationLabel(data.integrations.mips?.status)}
            </span>
          </span>
          <span className="text-right">
            <span className="block font-serif text-2xl tabular leading-none">{num(data.integrations.mips?.today ?? 0)}</span>
            <span className="text-[11px] text-[#C9BDB0]">confirmados hoy</span>
          </span>
        </Link>
      </section>

      <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-lg">Actividad del Hub</h2>
          <FilterBar
            options={[...FILTERS]}
            value={filter}
            onChange={setFilter}
            ariaLabel="Filtrar actividad"
          />
        </div>
        {rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No hay actividad en este canal ahora.</p>
        ) : (
          <DataTable>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Qué pasó</TableHead>
                <TableHead>ID del pedido</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Folio Míps</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => {
                const href = e.eventStatus === "failed" || e.eventStatus === "pending" ? "/salud" : CHANNEL_PAGE[e.channel] ?? "/salud";
                return (
                  <TableRow key={e.externalId + e.occurredAt} className="cursor-pointer">
                    <TableCell>
                      <Link to={href} className="block tabular">
                        {hourMin(e.occurredAt)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={href}>
                        <ChannelBadge channel={e.channel} />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={href}>{WHAT[e.eventType] ?? e.eventType}</Link>
                    </TableCell>
                    <TableCell className="tabular">
                      <Link to={href}>{e.externalId}</Link>
                    </TableCell>
                    <TableCell>
                      <Link to={href}>{STATE[e.eventStatus] ?? e.eventStatus}</Link>
                    </TableCell>
                    <TableCell className="tabular">
                      <Link to={href}>{e.eventType === "order" || e.eventType === "sale" ? e.mipsFolio ?? "—" : "—"}</Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTable>
        )}
        <Link to="/salud" className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">
          Ver salud del Hub →
        </Link>
      </section>
    </div>
  );
}
