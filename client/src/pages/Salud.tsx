import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { HealthStatus } from "@/components/health-status";
import { KpiCard } from "@/components/kpi-card";
import { PageIntro } from "@/components/page-intro";
import { PriorityCard } from "@/components/priority-card";
import { StatusIndicator, integrationLabel, integrationLevel } from "@/components/status-indicator";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { hourMin, num } from "@/lib/format";
import type { KpiValue } from "@shared/types";

interface Health {
  processed: number;
  pending: number;
  failed: number;
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
  attention?: Array<{
    occurredAt: string;
    channel: string;
    eventType: string;
    externalId: string;
    eventStatus: string;
    mipsFolio: string | null;
  }>;
  timeline: { occurredAt: string; channel: string; message: string; severity: string }[];
  incidents: { occurredAt: string; title: string; description: string; status: string; channel: string }[];
}

const CHANNELS = [
  { key: "uber_eats", to: "/ventas", metric: "Pedidos" },
  { key: "opentable", to: "/reservaciones", metric: "Reservaciones" },
  { key: "whatsapp", to: "/whatsapp", metric: "Conversaciones" },
  { key: "mips", to: "/reportes/conciliacion", metric: "Confirmados" },
] as const;

const FILTERS = [
  { id: "attention", label: "Por atender" },
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
  mips: "/reportes/conciliacion",
};

const CHANNEL_NAME: Record<string, string> = {
  uber_eats: "Uber Eats",
  opentable: "OpenTable",
  whatsapp: "WhatsApp",
  mips: "Míps",
};

function kpi(label: string, tooltip: string, value: number): KpiValue {
  return { label, tooltip, value, previousValue: value, deltaPct: 0, unit: "count" };
}

function needsAttention(status: string) {
  return status === "failed" || status === "pending";
}

export default function Salud() {
  const { data, loading, error, reload } = useApi<Health>("/api/hub/health");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("attention");

  const channelsOk = useMemo(() => {
    if (!data) return 0;
    return CHANNELS.filter((c) => integrationLevel(data.integrations[c.key]?.status) === "ok").length;
  }, [data]);

  const rows = useMemo(() => {
    const list = data?.attention?.length ? data.attention : (data?.recent ?? []).filter((e) => needsAttention(e.eventStatus));
    if (filter === "attention") return list.slice(0, 8);
    return list.filter((e) => e.channel === filter).slice(0, 8);
  }, [data, filter]);

  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin telemetría" body="El Hub no ha registrado salud todavía." />;

  const issues = data.pending + data.failed;
  const down = CHANNELS.map((c) => ({ ...c, info: data.integrations[c.key] })).filter(
    (c) => c.info && integrationLevel(c.info.status) !== "ok",
  );

  const headline =
    issues > 0
      ? `Hay ${issues} ${issues === 1 ? "situación que requiere" : "situaciones que requieren"} atención.`
      : down.length > 0
        ? "Los canales no están del todo operativos."
        : "Los canales operan. La información está llegando.";

  const kpis: { kpi: KpiValue; to: string }[] = [
    {
      kpi: kpi("Necesitan atención", "Eventos que fallaron o no se pudieron confirmar en Míps.", data.failed),
      to: "#eventos",
    },
    {
      kpi: kpi("Pendientes", "Siguen en el Hub y todavía no se confirman en Míps.", data.pending),
      to: "#eventos",
    },
    {
      kpi: kpi("Procesados", "Eventos que el Hub ya resolvió en el dataset demo.", data.processed),
      to: "/reportes/conciliacion",
    },
    {
      kpi: kpi("Canales operativos", "Uber Eats, OpenTable, WhatsApp y Míps con estado operativo.", channelsOk),
      to: "#canales",
    },
  ];

  const priorities = [];
  if (data.failed > 0) {
    priorities.push({
      tone: "critical" as const,
      title: `${data.failed} ${data.failed === 1 ? "evento necesita" : "eventos necesitan"} atención`,
      description: "No llegaron limpios a Míps. Están identificados para reprocesar.",
      secondary: `${num(data.processed)} procesados en total`,
      ctaLabel: "Ver eventos",
      to: "#eventos",
    });
  }
  if (data.pending > 0) {
    priorities.push({
      tone: "attention" as const,
      title: `${data.pending} ${data.pending === 1 ? "pendiente" : "pendientes"} en cola`,
      description: "Siguen en el Hub. Todavía no hay folio de Míps.",
      ctaLabel: "Ver cola",
      to: "#eventos",
    });
  }
  for (const c of down) {
    if (priorities.length >= 3) break;
    priorities.push({
      tone: (integrationLevel(c.info.status) === "critical" ? "critical" : "attention") as "critical" | "attention",
      title: `${CHANNEL_NAME[c.key] ?? c.key} no está del todo operativo`,
      description: c.info.message || "Hay que revisar este canal.",
      ctaLabel: "Ver canal",
      to: c.to,
    });
  }
  if (priorities.length === 0) {
    priorities.push({
      tone: "info" as const,
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
        title="Salud del Hub"
        headline={headline}
        aside={<p className="text-[11px] text-muted-foreground">En vivo · hace {data.lastSyncAgoSeconds} s</p>}
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
          {kpis.map((item) => (
            <KpiCard key={item.kpi.label} kpi={item.kpi} to={item.to} showTrend={false} />
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

      <section id="canales" className="scroll-mt-24 rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <h2 className="font-serif text-lg">Estado de los canales</h2>
        <p className="mt-1 text-xs text-muted-foreground">Si un canal no está operativo, eso se siente en pedidos, mesas o WhatsApp.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {CHANNELS.map((c) => {
            const info = data.integrations[c.key];
            const level = integrationLevel(info?.status);
            return (
              <Link
                key={c.key}
                to={c.to}
                className="flex items-center justify-between gap-3 rounded-md bg-muted/70 px-3 py-2.5 hover:bg-accent"
              >
                <span>
                  <ChannelBadge channel={c.key} />
                  <span className="mt-1 block">
                    <StatusIndicator level={level} label={integrationLabel(info?.status)} compact />
                  </span>
                  {info?.message && <span className="mt-0.5 block text-[11px] text-muted-foreground">{info.message}</span>}
                </span>
                <span className="text-right">
                  <span className="block font-serif text-2xl tabular leading-none">{num(info?.today ?? 0)}</span>
                  <span className="text-[11px] text-muted-foreground">{c.metric} hoy</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="eventos" className="scroll-mt-24 rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-lg">Qué hay que atender</h2>
          <FilterBar options={[...FILTERS]} value={filter} onChange={setFilter} ariaLabel="Filtrar eventos" />
        </div>
        {rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No hay eventos por atender en este filtro.</p>
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
                const href = CHANNEL_PAGE[e.channel] ?? "/hub";
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
                <div>
                  <p className="font-medium">{i.title}</p>
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
            <li key={t.occurredAt + t.message} className="flex items-start gap-3 py-2 text-sm">
              <span className="w-12 shrink-0 tabular text-muted-foreground">{hourMin(t.occurredAt)}</span>
              <span className="flex-1">{t.message}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
