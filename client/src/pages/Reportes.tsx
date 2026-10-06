import { Link, useParams, useSearchParams } from "react-router-dom";
import { PeakHour } from "@/components/big-number";
import { ChannelEventTable } from "@/components/channel-event-table";
import { ChannelIcon } from "@/components/channel-icon";
import { ChartCard } from "@/components/chart-card";
import { SimpleBar, SimpleDonut, SimpleLine } from "@/components/charts";
import { DataTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-table";
import { FunnelStrip } from "@/components/funnel-strip";
import { Heatmap, type HeatCell } from "@/components/heatmap";
import { KpiCard } from "@/components/kpi-card";
import { PageIntro } from "@/components/page-intro";
import { ShareBars } from "@/components/share-bars";
import { TrendIndicator } from "@/components/trend-indicator";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import { exportUrl } from "@/lib/api";
import { channelConfig, type ChannelKey } from "@/lib/channel-config";
import { DOW_FULL, mxn, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { KpiValue } from "@shared/types";

const REPORTS = [
  {
    id: "ejecutivo",
    channel: "hub",
    title: "Resumen del periodo",
    question: "¿Cómo cerró el periodo?",
    body: "Los cuatro números para explicar el corte.",
    live: "/inicio",
    liveLabel: "Ver operación",
  },
  {
    id: "uber",
    channel: "uber",
    title: "Pedidos",
    question: "¿Qué vendimos en Uber Eats?",
    body: "Pedidos, venta confirmada y productos.",
    live: "/ventas",
    liveLabel: "Ver pedidos",
  },
  {
    id: "opentable",
    channel: "opentable",
    title: "Reservaciones",
    question: "¿Cómo se pidió mesa?",
    body: "Demanda de mesa y cómo cerró.",
    live: "/reservaciones",
    liveLabel: "Ver reservaciones",
  },
  {
    id: "whatsapp",
    channel: "whatsapp",
    title: "WhatsApp",
    question: "¿Por qué escribieron?",
    body: "Motivos de contacto. No son ventas.",
    live: "/whatsapp",
    liveLabel: "Ver conversaciones",
  },
  {
    id: "demanda",
    channel: "hub",
    title: "Demanda",
    question: "¿Cuándo se junta todo?",
    body: "Día y hora de pedidos, mesas y WhatsApp.",
    live: "/inicio",
    liveLabel: "Ver demanda",
  },
  {
    id: "productos",
    channel: "uber",
    title: "Productos",
    question: "¿Qué está jalando ticket?",
    body: "Mix, ticket y lo que crece.",
    live: "/ventas?focus=productos",
    liveLabel: "Ver productos",
  },
  {
    id: "clientes",
    channel: "hub",
    title: "Clientes identificados",
    question: "¿Quién ya nos conoce?",
    body: "Segmentos identificables del Hub.",
    live: "/clientes",
    liveLabel: "Ver clientes",
  },
  {
    id: "conciliacion",
    channel: "mips",
    title: "Conciliación",
    question: "¿Llegó limpio a Míps?",
    body: "Eventos, folios y lo que necesita atención.",
    live: "/salud",
    liveLabel: "Ver salud del Hub",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  channel: ChannelKey;
  title: string;
  question: string;
  body: string;
  live: string;
  liveLabel: string;
}>;

type ReportId = (typeof REPORTS)[number]["id"];

interface ReportPayload {
  offset?: number;
  nextOffset?: number | null;
  total?: number;
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

/**
 * Fuente de un KPI dentro de un reporte. Por defecto es el canal del reporte;
 * las excepciones son las que mezclan fuentes o ya pasaron por Míps.
 */
const KPI_CHANNEL_OVERRIDE: Record<string, ChannelKey> = {
  "Ventas conciliadas": "mips",
  "Ventas digitales conciliadas": "mips",
  "Operaciones con error": "hub",
  "Solicitudes convertidas": "hub",
  "Actividad digital": "hub",
  "Comensales reservados": "opentable",
  "Ticket promedio": "uber",
  "Clientes únicos": "whatsapp",
  "Clientes identificados": "whatsapp",
};

function kpiChannel(label: string, fallback: ChannelKey): ChannelKey {
  return KPI_CHANNEL_OVERRIDE[label] ?? fallback;
}

export default function Reportes() {
  const { id } = useParams();
  if (id) return <ReportDetail id={id} />;
  return <ReportLibrary />;
}

function ReportLibrary() {
  const { qs } = usePeriod();
  const summary = useApi<{ kpis: KpiValue[] }>(`/api/dashboard/summary${qs}`);
  const pick = (label: string) => summary.data?.kpis.find((k) => k.label === label);
  const actividad = pick("Actividad digital");
  const ventas = pick("Ventas digitales conciliadas") ?? pick("Ventas conciliadas") ?? pick("Ventas digitales confirmadas");
  const ticket = pick("Ticket promedio");
  const covers = pick("Comensales reservados");
  const kpis: { kpi: KpiValue; to: string; channel: ChannelKey }[] = [
    actividad && { kpi: actividad, to: "/reportes/ejecutivo", channel: "hub" as const },
    ventas && { kpi: { ...ventas, label: "Ventas conciliadas en Míps" }, to: "/reportes/conciliacion", channel: "mips" as const },
    ticket && { kpi: ticket, to: "/reportes/productos", channel: "uber" as const },
    covers && { kpi: covers, to: "/reportes/opentable", channel: "opentable" as const },
  ].filter(Boolean) as { kpi: KpiValue; to: string; channel: ChannelKey }[];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageIntro question="¿Qué corte necesitas compartir?" title="Reportes" headline="Elige un reporte para revisar sus datos o descargar el CSV." />
      <p className="text-sm text-muted-foreground">
        Ventas, reservas y conversaciones usan el periodo seleccionado. Clientes muestra el acumulado; conciliación usa el periodo seleccionado.
      </p>
      {kpis.length > 0 && (
        <section>
          <h2 className="mb-2 font-serif text-lg">El corte ahora</h2>
          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
            {kpis.map((item, i) => (
              <KpiCard key={item.kpi.label} kpi={item.kpi} to={item.to} channel={item.channel} featured={i === 0} />
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-2 font-serif text-lg">Qué puedes bajar</h2>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {REPORTS.map((r) => {
            const cfg = channelConfig[r.channel];
            return (
              <li key={r.id}>
                <Link
                  to={`/reportes/${r.id}`}
                  className="flex h-full items-start gap-3 rounded-lg border-l-2 bg-card px-4 py-3.5 shadow-soft hover:bg-accent"
                  style={{ borderLeftColor: cfg.hex }}
                >
                  <ChannelIcon channel={r.channel} size="md" ring />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-xs font-medium", cfg.accent)}>{cfg.label}</span>
                    <span className="mt-0.5 block font-serif text-lg leading-snug">{r.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{r.body}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function ReportDetail({ id }: { id: string }) {
  const { qs } = usePeriod();
  const [searchParams, setSearchParams] = useSearchParams();
  const offset = Number(searchParams.get("offset") || 0);
  const reportQs = id === "clientes" ? "" : qs;
  const meta = REPORTS.find((r) => r.id === id);
  const { data, loading, error, reload } = useApi<ReportPayload>(meta ? `/api/reports/${id}${reportQs}${reportQs ? "&" : "?"}offset=${Number.isSafeInteger(offset) && offset >= 0 ? offset : 0}` : null);

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
        channel={meta.channel}
        title={meta.title}
        headline={meta.body}
        aside={
          <a
            href={exportUrl(id, reportQs)}
            className="inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline"
          >
            Exportar CSV →
          </a>
        }
      />
      {id === "clientes" && <p className="text-sm text-muted-foreground">Historial acumulado. La tabla muestra clientes destacados; el CSV incluye el padrón completo.</p>}
      {id === "conciliacion" && <p className="text-sm text-muted-foreground">Eventos del periodo seleccionado. El CSV incluye todos; la tabla muestra páginas de 100.</p>}
      {id === "conciliacion" && <div className="flex items-center gap-3 text-sm">
        <button disabled={!offset} onClick={() => { const p = new URLSearchParams(searchParams); p.set("offset", String(Math.max(0, offset - 100))); setSearchParams(p); }}>Anterior</button>
        <span>{data.total ?? 0} eventos · página {Math.floor(offset / 100) + 1}</span>
        <button disabled={data.nextOffset == null} onClick={() => { const p = new URLSearchParams(searchParams); p.set("offset", String(data.nextOffset)); setSearchParams(p); }}>Siguiente</button>
      </div>}
      <ReportBody id={id as ReportId} channel={meta.channel} data={data} />
      <Link to={meta.live} className="inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">
        {meta.liveLabel} →
      </Link>
    </div>
  );
}

function ReportBody({ id, channel, data }: { id: ReportId; channel: ChannelKey; data: ReportPayload }) {
  if (id === "demanda" && data.cells) {
    const peak = data.peak;
    return (
      <ChartCard title="¿Cuándo se junta la demanda? · Actividad digital" channel="hub">
        <Heatmap
          cells={data.cells}
          description="Pedidos, reservaciones y conversaciones por día y hora. Son métricas distintas; el total sólo muestra dónde se concentra la actividad."
        />
        {peak && (
          <PeakHour
            className="mt-3"
            hour={peak.hour}
            channel="hub"
            caption="Mayor concentración"
            hint={`${DOW_FULL[peak.dow]} · ${String(peak.hour).padStart(2, "0")}:00`}
          />
        )}
      </ChartCard>
    );
  }

  if (id === "conciliacion") {
    const kpis: { kpi: KpiValue; to: string; channel: ChannelKey }[] = [
      { kpi: countKpi("Procesados", "Eventos que el Hub ya resolvió.", data.processed ?? 0), to: "/salud", channel: "hub" },
      { kpi: countKpi("Pendientes", "Siguen en cola del Hub, todavía sin confirmar en Míps.", data.pending ?? 0), to: "/salud#eventos", channel: "hub" },
      { kpi: countKpi("Necesitan atención", "No se confirmaron limpios en Míps.", data.failed ?? 0), to: "/salud#eventos", channel: "hub" },
      {
        kpi: countKpi("Eventos del periodo", "Todos los eventos del restaurante dentro del periodo seleccionado.", data.total ?? 0),
        to: "/salud",
        channel: "hub",
      },
    ];
    return (
      <>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {kpis.map((k, i) => (
            <KpiCard key={k.kpi.label} kpi={k.kpi} to={k.to} channel={k.channel} showTrend={false} featured={i === 0} />
          ))}
        </div>
        <ChartCard title="De la cola a Míps" channel="mips">
          <FunnelStrip
            rate={{
              value: `${Math.round(((data.processed ?? 0) / Math.max(1, (data.processed ?? 0) + (data.pending ?? 0) + (data.failed ?? 0))) * 100)}%`,
              label: "de los eventos del periodo ya se resolvieron",
            }}
            steps={[
              { label: "Necesitan atención", value: data.failed ?? 0, channel: "hub" },
              { label: "Pendientes", value: data.pending ?? 0, channel: "hub" },
              { label: "Procesados", value: data.processed ?? 0, channel: "mips" },
            ]}
          />
        </ChartCard>
        <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
          <h2 className="font-serif text-lg">Movimientos de esta página</h2>
          <p className="mt-1 text-xs text-muted-foreground">Qué recibió el Hub de cada canal y si ya tiene folio de Míps.</p>
          <div className="mt-2">
            <ChannelEventTable rows={data.recent ?? []} showTime={true} emptyText="No hay movimientos para listar." />
          </div>
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
          {main.map((k, i) => (
            <KpiCard key={k.label} kpi={k} to="/clientes" channel="hub" showTrend={false} featured={i === 0} />
          ))}
        </div>
        {data.segments && (
          <ChartCard title="Cómo se parten" channel="hub">
            <ShareBars
              channel="hub"
              items={Object.entries(data.segments).map(([id, value]) => ({
                label: SEGMENT[id] ?? id,
                value,
              }))}
            />
          </ChartCard>
        )}
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
          {kpis.map((k, i) => (
            <KpiCard
              key={k.label}
              kpi={k.label === "Clientes únicos" ? { ...k, label: "Clientes identificados" } : k}
              channel={kpiChannel(k.label, channel)}
              featured={i === 0}
            />
          ))}
        </div>
      )}

      {id === "opentable" && otHeat.length > 0 && (
        <ChartCard title="¿Cuándo quieren mesa?" channel="opentable">
          <Heatmap cells={otHeat} metric="ot" description="Reservaciones de OpenTable por día y hora de visita." />
          {data.peak && (
            <PeakHour
              className="mt-3"
              hour={data.peak.hour}
              channel="opentable"
              caption="Momento más pedido"
              hint={DOW_FULL[data.peak.dow]}
            />
          )}
        </ChartCard>
      )}

      {showTrend && data.byDay && (
        <ChartCard
          title={data.byDay[0]?.sales !== undefined ? "¿Cómo cambia la venta confirmada?" : "¿Cómo se mueve el periodo?"}
          channel={data.byDay[0]?.sales !== undefined ? "mips" : channel}
        >
          {data.byDay[0]?.sales !== undefined ? (
            <SimpleLine
              compact
              data={data.byDay.map((d) => ({ day: d.day.slice(5), ventas: (d.sales ?? 0) / 100 }))}
              x="day"
              y="ventas"
              yLabel="Ventas MXN"
              channel="mips"
            />
          ) : (
            <SimpleBar
              compact
              data={data.byDay.map((d) => ({ ...d, day: d.day.slice(5) }))}
              x="day"
              y={data.byDay[0]?.reservations !== undefined ? "reservations" : "orders"}
              yLabel={data.byDay[0]?.reservations !== undefined ? "Reservaciones" : "Pedidos"}
              channel={channel}
            />
          )}
        </ChartCard>
      )}

      {(id === "uber" || id === "productos") && data.topProducts && (
        <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
          <h2 className="font-serif text-lg">Qué se vende</h2>
          <ShareBars
            className="mt-3"
            channel="uber"
            items={data.topProducts.slice(0, 6).map((p) => ({ label: p.name, value: p.sales }))}
            format={mxn}
          />
          {data.pareto && (
            <p className="mt-3 font-serif text-2xl tabular leading-none">
              {Math.round(data.pareto.share * 100)}%
              <span className="ml-2 align-middle text-xs font-sans font-normal text-muted-foreground">
                de la venta sale de {data.pareto.topCount} productos.
              </span>
            </p>
          )}
          <div className="mt-3">
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
          </div>
        </section>
      )}

      {id === "whatsapp" && data.intents && (
        <ChartCard title="Por qué escriben" channel="whatsapp">
          <SimpleDonut
            compact
            channel="whatsapp"
            data={data.intents.slice(0, 6).map((i) => ({ name: INTENT[i.intent] ?? i.intent, value: i.count }))}
            nameKey="name"
            valueKey="value"
            center={{
              value: num(data.intents.reduce((s, i) => s + i.count, 0)),
              label: "Motivos",
            }}
          />
        </ChartCard>
      )}

      {id === "opentable" && data.states && (
        <ChartCard title="Cómo cerró la mesa" channel="opentable">
          <ShareBars
            channel="opentable"
            items={data.states.map((s) => ({ label: STATE[s.status] ?? s.status, value: s.count }))}
          />
        </ChartCard>
      )}
    </>
  );
}
