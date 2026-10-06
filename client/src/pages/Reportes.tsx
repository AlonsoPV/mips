import { Link, useParams } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { ChartCard } from "@/components/chart-card";
import { SimpleBar, SimpleLine } from "@/components/charts";
import { DataTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-table";
import { Heatmap, type HeatCell } from "@/components/heatmap";
import { KpiCard } from "@/components/kpi-card";
import { PageIntro } from "@/components/page-intro";
import { PriorityCard } from "@/components/priority-card";
import { TrendIndicator } from "@/components/trend-indicator";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import { exportUrl } from "@/lib/api";
import { mxn, num } from "@/lib/format";
import type { KpiValue } from "@shared/types";

const REPORTS = [
  {
    id: "ejecutivo",
    title: "Resumen del periodo",
    question: "¿Cómo cerró el periodo?",
    body: "Los cuatro números para explicar el corte.",
    live: "/inicio",
    liveLabel: "Ver operación",
  },
  {
    id: "uber",
    title: "Pedidos",
    question: "¿Qué vendimos en Uber Eats?",
    body: "Pedidos, venta confirmada y productos.",
    live: "/ventas",
    liveLabel: "Ver pedidos",
  },
  {
    id: "opentable",
    title: "Reservaciones",
    question: "¿Cómo se pidió mesa?",
    body: "Demanda de mesa y cómo cerró.",
    live: "/reservaciones",
    liveLabel: "Ver reservaciones",
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    question: "¿Por qué escribieron?",
    body: "Motivos de contacto. No son ventas.",
    live: "/whatsapp",
    liveLabel: "Ver conversaciones",
  },
  {
    id: "demanda",
    title: "Demanda",
    question: "¿Cuándo se junta todo?",
    body: "Día y hora de pedidos, mesas y WhatsApp.",
    live: "/inicio",
    liveLabel: "Ver demanda",
  },
  {
    id: "productos",
    title: "Productos",
    question: "¿Qué está jalando ticket?",
    body: "Mix, ticket y lo que crece.",
    live: "/ventas?focus=productos",
    liveLabel: "Ver productos",
  },
  {
    id: "clientes",
    title: "Clientes",
    question: "¿Quién ya nos conoce?",
    body: "Segmentos identificables del Hub.",
    live: "/clientes",
    liveLabel: "Ver clientes",
  },
  {
    id: "conciliacion",
    title: "Conciliación",
    question: "¿Llegó limpio a Míps?",
    body: "Eventos, folios y lo que necesita atención.",
    live: "/salud",
    liveLabel: "Ver salud del Hub",
  },
] as const;

type ReportId = (typeof REPORTS)[number]["id"];

interface Summary {
  kpis: KpiValue[];
}

interface Hub {
  pending: number;
  failed: number;
  processed: number;
}

interface ReportPayload {
  kpis?: KpiValue[];
  byDay?: Array<{ day: string; sales?: number; orders?: number; reservations?: number }>;
  topProducts?: Array<{ name: string; quantity?: number; sales: number; ticket?: number; growthPct?: number | null }>;
  growingProducts?: Array<{ name: string; growthPct: number | null }>;
  pareto?: { share: number; topCount: number };
  heatmap?: Array<{ dow: number; hour: number; count: number }>;
  cells?: HeatCell[];
  peak?: { dow: number; hour: number };
  intents?: Array<{ intent: string; count: number }>;
  sample?: Array<{ id: string; displayName: string; segment: string; attributedSpend: number }>;
  lists?: Record<string, Array<{ id: string; displayName: string; segment: string; attributedSpend: number }>>;
  segments?: Record<string, number>;
  states?: Array<{ status: string; count: number }>;
  recent?: Array<{
    id: string;
    channel: string;
    externalId: string;
    eventStatus: string;
    eventType?: string;
    mipsFolio: string | null;
  }>;
  pending?: number;
  failed?: number;
  processed?: number;
  integrations?: Record<string, { today?: number }>;
}

const INTENT: Record<string, string> = {
  reservaciones: "Reservaciones",
  pedidos: "Pedidos",
  horarios: "Horarios",
  ubicacion: "Ubicación",
  menu: "Menú",
  eventos: "Eventos",
  quejas: "Quejas",
  otros: "Otros",
};

const SEGMENT: Record<string, string> = {
  nuevos: "Nuevos",
  recurrentes: "Recurrentes",
  frecuentes: "Frecuentes",
  alto_valor: "Alto valor",
  inactivos: "Sin volver",
};

const STATE: Record<string, string> = {
  confirmed: "Confirmado",
  received: "Recibida",
  pending: "Necesita atención",
  failed: "Necesita atención",
  processing: "En proceso",
  seated: "Sentada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No se presentaron",
};

function countKpi(label: string, tooltip: string, value: number): KpiValue {
  return { label, tooltip, value, previousValue: value, deltaPct: 0, unit: "count" };
}

export default function Reportes() {
  const { id } = useParams();
  if (id) return <ReportDetail id={id} />;
  return <ReportLibrary />;
}

function ReportLibrary() {
  const { qs } = usePeriod();
  const summary = useApi<Summary>(`/api/dashboard/summary${qs}`);
  const hub = useApi<Hub>("/api/hub/health");

  if (summary.loading || hub.loading) return <PageLoading />;
  if (summary.error) return <PageError message={summary.error} onRetry={summary.reload} />;
  if (!summary.data) return <EmptyState title="Sin corte" body="Todavía no hay números para reportar en este periodo." />;

  const pick = (label: string) => summary.data!.kpis.find((k) => k.label === label);
  const actividad = pick("Actividad digital");
  const ventas = pick("Ventas digitales confirmadas");
  const ticket = pick("Ticket promedio");
  const covers = pick("Comensales reservados");
  const kpis: { kpi: KpiValue; to: string }[] = [
    actividad && { kpi: actividad, to: "/reportes/ejecutivo" },
    ventas && { kpi: { ...ventas, label: "Ventas digitales" }, to: "/reportes/uber" },
    ticket && { kpi: ticket, to: "/reportes/productos" },
    covers && { kpi: covers, to: "/reportes/opentable" },
  ].filter(Boolean) as { kpi: KpiValue; to: string }[];

  const issues = (hub.data?.pending ?? 0) + (hub.data?.failed ?? 0);
  const salesDown = (ventas?.deltaPct ?? 0) < 0;
  const priorities = [];
  if (hub.data && hub.data.failed > 0) {
    priorities.push({
      tone: "critical" as const,
      title: `${hub.data.failed} ${hub.data.failed === 1 ? "evento necesita" : "eventos necesitan"} conciliación`,
      description: "No llegaron limpios a Míps. Conviene revisar el corte antes de exportarlo.",
      ctaLabel: "Abrir conciliación",
      to: "/reportes/conciliacion",
    });
  } else if (hub.data && hub.data.pending > 0) {
    priorities.push({
      tone: "attention" as const,
      title: `${hub.data.pending} ${hub.data.pending === 1 ? "pendiente" : "pendientes"} en el Hub`,
      description: "Siguen en cola. El CSV de conciliación ayuda a explicar el desfase.",
      ctaLabel: "Abrir conciliación",
      to: "/reportes/conciliacion",
    });
  }
  if (salesDown) {
    priorities.push({
      tone: "attention" as const,
      title: "Las ventas digitales piden revisión",
      description: "El corte está por debajo del periodo anterior. Baja pedidos y productos.",
      deltaPct: ventas?.deltaPct,
      ctaLabel: "Abrir pedidos",
      to: "/reportes/uber",
    });
  }
  if (priorities.length < 3) {
    priorities.push({
      tone: "opportunity" as const,
      title: "El mix de productos explica el ticket",
      description: "Sirve para mostrar qué se pidió y qué conviene destacar.",
      ctaLabel: "Abrir productos",
      to: "/reportes/productos",
    });
  }
  if (priorities.length < 3) {
    priorities.push({
      tone: "info" as const,
      title: "La demanda se ve por día y hora",
      description: "Un solo recorte para mesa, delivery y WhatsApp.",
      ctaLabel: "Abrir demanda",
      to: "/reportes/demanda",
    });
  }

  const headline =
    issues > 0
      ? "Hay movimientos que conviene conciliar antes de exportar."
      : salesDown
        ? "El corte pide revisión de pedidos."
        : "Elige qué bajar. El CSV es para explicar, no para operar.";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageIntro question="¿Qué vale la pena revisar a fondo?" title="Reportes" headline={headline} />

      <section>
        <h2 className="mb-2 font-serif text-lg">El corte ahora</h2>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {kpis.map((item) => (
            <KpiCard key={item.kpi.label} kpi={item.kpi} to={item.to} />
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

      <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <h2 className="font-serif text-lg">Qué puedes bajar</h2>
        <ul className="mt-2 divide-y">
          {REPORTS.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <Link to={`/reportes/${r.id}`} className="font-serif text-lg hover:text-primary">
                  {r.title}
                </Link>
                <p className="text-sm text-muted-foreground">{r.body}</p>
              </div>
              <div className="flex items-center gap-3">
                <Link to={`/reportes/${r.id}`} className="text-sm font-medium text-primary hover:underline">
                  Abrir →
                </Link>
                <a href={exportUrl(r.id, qs)} className="text-sm text-muted-foreground hover:text-primary hover:underline">
                  CSV
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ReportDetail({ id }: { id: string }) {
  const { qs } = usePeriod();
  const meta = REPORTS.find((r) => r.id === id);
  const { data, loading, error, reload } = useApi<ReportPayload>(`/api/reports/${id}${qs}`);

  if (!meta) return <EmptyState title="Reporte no encontrado" body="Ese recorte no está en la biblioteca." />;
  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin datos" body="Este reporte no tiene filas en el periodo." />;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link to="/reportes" className="inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">
        ← Reportes
      </Link>
      <PageIntro
        question={meta.question}
        title={meta.title}
        headline={meta.body}
        aside={
          <a
            href={exportUrl(id, qs)}
            className="inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline"
          >
            Exportar CSV →
          </a>
        }
      />
      <ReportBody id={id as ReportId} data={data} />
      <Link to={meta.live} className="inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">
        {meta.liveLabel} →
      </Link>
    </div>
  );
}

function ReportBody({ id, data }: { id: ReportId; data: ReportPayload }) {
  if (id === "demanda" && data.cells) {
    return (
      <ChartCard title="¿Cuándo se junta la demanda?">
        <Heatmap cells={data.cells} />
      </ChartCard>
    );
  }

  if (id === "conciliacion") {
    const kpis = [
      countKpi("Procesados", "Eventos que el Hub ya resolvió.", data.processed ?? 0),
      countKpi("Pendientes", "Siguen en cola, todavía sin confirmar en Míps.", data.pending ?? 0),
      countKpi("Necesitan atención", "No se confirmaron limpios.", data.failed ?? 0),
      countKpi("Confirmados hoy", "Ventas de canales digitales con folio de Míps hoy.", data.integrations?.mips?.today ?? 0),
    ];
    return (
      <>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {kpis.map((k) => (
            <KpiCard key={k.label} kpi={k} to="/salud" showTrend={false} />
          ))}
        </div>
        <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
          <h2 className="font-serif text-lg">Últimos movimientos</h2>
          <EventTable rows={(data.recent ?? []).slice(0, 8)} />
        </section>
      </>
    );
  }

  if (id === "clientes") {
    const pick = (label: string) => data.kpis?.find((k) => k.label === label);
    const inactivosN = data.segments?.inactivos ?? 0;
    const main = [
      pick("Clientes identificables") && { ...pick("Clientes identificables")!, label: "Identificables" },
      pick("Recurrentes"),
      pick("Nuevos"),
      {
        label: "Sin volver",
        tooltip: "Clientes identificables que no han regresado en más de 45 días.",
        value: inactivosN,
        previousValue: inactivosN,
        deltaPct: 0,
        unit: "count" as const,
      },
    ].filter(Boolean) as KpiValue[];
    const rows = (data.lists?.alto_valor ?? data.sample ?? []).slice(0, 8);
    return (
      <>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {main.map((k) => (
            <KpiCard key={k.label} kpi={k} to="/clientes" showTrend={false} />
          ))}
        </div>
        <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
          <h2 className="font-serif text-lg">A quién cuidar</h2>
          <DataTable>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Gasto atribuido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link to={`/clientes/${c.id}`}>{c.displayName}</Link>
                  </TableCell>
                  <TableCell>{SEGMENT[c.segment] ?? c.segment}</TableCell>
                  <TableCell className="tabular">{mxn(c.attributedSpend)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </section>
      </>
    );
  }

  const kpis =
    id === "whatsapp"
      ? ([
          "Conversaciones",
          "Clientes únicos",
          "Tiempo medio de primera respuesta",
          "Solicitudes convertidas",
        ]
          .map((label) => data.kpis?.find((k) => k.label === label))
          .filter(Boolean) as KpiValue[])
      : (data.kpis ?? []).slice(0, 4);
  const showTrend = (data.byDay?.length ?? 0) > 2;
  const otHeat = data.heatmap
    ? data.heatmap.map((h) => ({
        dow: h.dow,
        hour: h.hour,
        uber: 0,
        ot: h.count,
        wa: 0,
        total: h.count,
        intensity: 0,
      }))
    : [];

  return (
    <>
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {kpis.map((k) => (
            <KpiCard key={k.label} kpi={k} />
          ))}
        </div>
      )}

      {id === "opentable" && otHeat.length > 0 && (
        <ChartCard title="¿Cuándo quieren mesa?">
          <Heatmap cells={otHeat} metric="ot" />
        </ChartCard>
      )}

      {showTrend && data.byDay && (
        <ChartCard title={data.byDay[0]?.sales !== undefined ? "¿Cómo cambia la venta?" : "¿Cómo se mueve el periodo?"}>
          {data.byDay[0]?.sales !== undefined ? (
            <SimpleLine
              compact
              data={data.byDay.map((d) => ({ day: d.day.slice(5), ventas: (d.sales ?? 0) / 100 }))}
              x="day"
              y="ventas"
              yLabel="Ventas MXN"
            />
          ) : (
            <SimpleBar
              compact
              data={data.byDay.map((d) => ({ ...d, day: d.day.slice(5) }))}
              x="day"
              y={data.byDay[0]?.reservations !== undefined ? "reservations" : "orders"}
            />
          )}
        </ChartCard>
      )}

      {(id === "uber" || id === "productos") && data.topProducts && (
        <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
          <h2 className="font-serif text-lg">Qué se vende</h2>
          <DataTable>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Ventas</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topProducts.slice(0, 6).map((p) => (
                <TableRow key={p.name}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="tabular">{mxn(p.sales)}</TableCell>
                  <TableCell>
                    <TrendIndicator value={p.growthPct} className="text-xs" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
          {data.pareto && (
            <p className="mt-3 text-xs text-muted-foreground">
              El {Math.round(data.pareto.share * 100)}% de la venta sale de {data.pareto.topCount} productos.
            </p>
          )}
        </section>
      )}

      {id === "whatsapp" && data.intents && (
        <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
          <h2 className="font-serif text-lg">Por qué escriben</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {data.intents.slice(0, 6).map((i) => (
              <li key={i.intent} className="flex justify-between gap-3">
                <span>{INTENT[i.intent] ?? i.intent}</span>
                <span className="tabular text-muted-foreground">{num(i.count)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {id === "opentable" && data.states && (
        <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
          <h2 className="font-serif text-lg">Cómo cerró la mesa</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {data.states.map((s) => (
              <li key={s.status} className="flex justify-between">
                <span>{STATE[s.status] ?? s.status}</span>
                <span className="tabular">{num(s.count)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function EventTable({
  rows,
}: {
  rows: Array<{ id: string; channel: string; externalId: string; eventStatus: string; mipsFolio: string | null }>;
}) {
  if (!rows.length) return <p className="mt-2 text-sm text-muted-foreground">No hay movimientos para listar.</p>;
  return (
    <DataTable>
      <TableHeader>
        <TableRow>
          <TableHead>Canal</TableHead>
          <TableHead>ID del pedido</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Folio Míps</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((e) => (
          <TableRow key={e.id}>
            <TableCell>
              <ChannelBadge channel={e.channel} />
            </TableCell>
            <TableCell className="tabular">{e.externalId}</TableCell>
            <TableCell>{STATE[e.eventStatus] ?? e.eventStatus}</TableCell>
            <TableCell className="tabular">{e.mipsFolio ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </DataTable>
  );
}
