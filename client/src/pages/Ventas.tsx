import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ChartCard } from "@/components/chart-card";
import { SimpleBar, SimpleLine } from "@/components/charts";
import { DataTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-table";
import { KpiCard } from "@/components/kpi-card";
import { PageIntro } from "@/components/page-intro";
import { PriorityCard } from "@/components/priority-card";
import { TrendIndicator } from "@/components/trend-indicator";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import { mxn, num } from "@/lib/format";
import type { KpiValue } from "@shared/types";

interface Uber {
  kpis: KpiValue[];
  byDay: { day: string; sales: number; orders: number }[];
  byHour: { hour: number; orders: number }[];
  topProducts: { name: string; quantity: number; sales: number; ticket: number; growthPct: number | null }[];
  modifiers: { name: string; count: number }[];
  cancellations: { reason: string; count: number; pct: number }[];
  growingProducts: { name: string; growthPct: number | null; sales: number }[];
  pareto: { share: number; topCount: number; totalProducts: number };
}

const KPI_TO: Record<string, string> = {
  Pedidos: "horario",
  "Ventas confirmadas": "productos",
  "Ticket promedio": "productos",
  Cancelación: "cancelaciones",
};

export default function Ventas() {
  const { qs } = usePeriod();
  const [params] = useSearchParams();
  const { data, loading, error, reload } = useApi<Uber>(`/api/uber/summary${qs}`);

  useEffect(() => {
    if (!data) return;
    const id = params.get("focus") === "productos" ? "productos" : null;
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [data, params]);

  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin pedidos" body="No hay pedidos de Uber Eats en este periodo." />;

  const pick = (label: string) => data.kpis.find((k) => k.label === label);
  const pedidos = pick("Pedidos");
  const ventas = pick("Ventas confirmadas");
  const ticket = pick("Ticket promedio");
  const cancel = pick("Cancelación");
  const errors = pick("Operaciones con error");
  const mainKpis = [pedidos, ventas, ticket, cancel].filter(Boolean) as KpiValue[];

  const star = data.growingProducts.find((p) => (p.growthPct ?? 0) > 0) ?? data.topProducts[0];
  const peakHour = [...data.byHour].sort((a, b) => b.orders - a.orders)[0];
  const showTrend = data.byDay.length > 2;
  const hash = (id: string) => `${qs}#${id}`;

  const priorities = [];
  if (errors && errors.value > 0) {
    priorities.push({
      tone: "critical" as const,
      title: `${errors.value} ${errors.value === 1 ? "pedido necesita" : "pedidos necesitan"} atención`,
      description: "No se confirmaron limpios en Míps. Hay que revisar el Hub.",
      secondary: `${num(pedidos?.value ?? 0)} pedidos en el periodo`,
      ctaLabel: "Revisar incidencias",
      to: "/salud",
    });
  }
  if (cancel && (cancel.deltaPct ?? 0) > 0) {
    priorities.push({
      tone: "attention" as const,
      title: "Subieron las cancelaciones",
      description: `${cancel.value}% de los pedidos se cancelaron. El motivo más frecuente ayuda a decidir si es cocina, zona o espera.`,
      secondary: data.cancellations[0] ? `Principal: ${data.cancellations[0].reason}` : undefined,
      deltaPct: cancel.deltaPct,
      ctaLabel: "Ver motivos",
      to: hash("cancelaciones"),
    });
  }
  if (star) {
    priorities.push({
      tone: "opportunity" as const,
      title: `${star.name} está jalando ticket`,
      description: "Conviene destacarlo en el canal digital mientras el ticket se sostenga.",
      deltaPct: star.growthPct,
      ctaLabel: "Ver producto",
      to: hash("productos"),
    });
  }
  if (priorities.length < 3 && peakHour) {
    priorities.push({
      tone: "info" as const,
      title: `El pico de pedidos es a las ${String(peakHour.hour).padStart(2, "0")}:00`,
      description: "Sirve para alinear cocina y tiempos de Uber.",
      ctaLabel: "Ver horario",
      to: hash("horario"),
    });
  }

  const up = (pedidos?.deltaPct ?? 0) > 0;
  const headline =
    errors && errors.value > 0
      ? "Hay pedidos que no llegaron limpios a Míps."
      : cancel && (cancel.deltaPct ?? 0) > 5
        ? "Las cancelaciones piden atención."
        : up
          ? "Los pedidos digitales van al alza."
          : "Así van los pedidos de Uber Eats.";

  const hourChart = (
    <div id="horario" className="scroll-mt-24">
      <ChartCard title="¿A qué hora piden?">
        <SimpleBar data={data.byHour} x="hour" y="orders" yLabel="Pedidos" compact />
        {peakHour && (
          <p className="mt-2 text-xs text-muted-foreground">
            Más piden a las {String(peakHour.hour).padStart(2, "0")}:00.
          </p>
        )}
      </ChartCard>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageIntro question="¿Qué estamos vendiendo?" channel="uber_eats" title="Pedidos" headline={headline} />

      <section>
        <h2 className="mb-2 font-serif text-lg">Tus pedidos ahora</h2>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {mainKpis.map((k) => (
            <KpiCard key={k.label} kpi={k} to={hash(KPI_TO[k.label] ?? "productos")} />
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

      {showTrend ? (
        <div className="grid gap-2.5 lg:grid-cols-2">
          <ChartCard title="¿Cómo cambia la venta?">
            <SimpleLine
              data={data.byDay.map((d) => ({ day: d.day.slice(5), ventas: d.sales / 100 }))}
              x="day"
              y="ventas"
              yLabel="Ventas MXN"
              compact
            />
          </ChartCard>
          {hourChart}
        </div>
      ) : (
        hourChart
      )}

      <section id="productos" className="scroll-mt-24 rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <h2 className="font-serif text-lg">Qué se vende</h2>
        <DataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Ventas</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.topProducts.slice(0, 6).map((p) => (
              <TableRow key={p.name}>
                <TableCell>{p.name}</TableCell>
                <TableCell className="tabular">{num(p.quantity)}</TableCell>
                <TableCell>{mxn(p.sales)}</TableCell>
                <TableCell>{mxn(p.ticket)}</TableCell>
                <TableCell>
                  <TrendIndicator value={p.growthPct} className="text-xs" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
        <p className="mt-3 text-xs text-muted-foreground">
          El {Math.round(data.pareto.share * 100)}% de la venta sale de {data.pareto.topCount} productos.
        </p>
      </section>

      <div className="grid gap-2.5 md:grid-cols-2">
        <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
          <h2 className="font-serif text-lg">Extras más pedidos</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {data.modifiers.slice(0, 5).map((m) => (
              <li key={m.name} className="flex justify-between gap-3">
                <span>{m.name}</span>
                <span className="tabular text-muted-foreground">{num(m.count)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section id="cancelaciones" className="scroll-mt-24 rounded-lg border bg-card px-4 py-3.5 shadow-soft">
          <h2 className="font-serif text-lg">Por qué cancelan</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {data.cancellations.map((c) => (
              <li key={c.reason} className="flex justify-between gap-3">
                <span>{c.reason}</span>
                <span className="tabular text-muted-foreground">
                  {num(c.count)} · {c.pct}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
