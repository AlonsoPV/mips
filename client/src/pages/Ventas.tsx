import { ChannelChip } from "@/components/channel-chip";
import { SimpleBar, SimpleLine } from "@/components/charts";
import { KpiStat } from "@/components/kpi-stat";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import { mxn, num, pct } from "@/lib/format";
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

export default function Ventas() {
  const { qs } = usePeriod();
  const { data, loading, error, reload } = useApi<Uber>(`/api/uber/summary${qs}`);
  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin pedidos" body="No hay pedidos de Uber Eats en este periodo." />;

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <header>
        <ChannelChip channel="uber_eats" />
        <h1 className="mt-3 font-serif text-3xl md:text-4xl">Ventas y pedidos</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Pedidos digitales de Uber Eats y su impacto confirmado en Míps. Las conversaciones de WhatsApp no se mezclan aquí.</p>
      </header>
      <section className="grid gap-8 sm:grid-cols-2 xl:grid-cols-5">
        {data.kpis.map((k) => (
          <KpiStat key={k.label} kpi={k} />
        ))}
      </section>
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-serif text-xl">Ventas por día</h2>
          <SimpleLine data={data.byDay.map((d) => ({ ...d, ventas: d.sales / 100 }))} x="day" y="ventas" yLabel="Ventas MXN" />
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-serif text-xl">Pedidos por hora</h2>
          <SimpleBar data={data.byHour} x="hour" y="orders" yLabel="Pedidos" />
        </div>
      </section>
      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-serif text-xl">Top productos</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Ventas</TableHead>
              <TableHead>Ticket asociado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.topProducts.map((p) => (
              <TableRow key={p.name}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{num(p.quantity)}</TableCell>
                <TableCell>{mxn(p.sales)}</TableCell>
                <TableCell>{mxn(p.ticket)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-serif text-xl">Modificadores más pedidos</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.modifiers.map((m) => (
              <li key={m.name} className="flex justify-between">
                <span>{m.name}</span>
                <span className="tabular text-muted-foreground">{num(m.count)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-serif text-xl">Cancelaciones</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motivo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.cancellations.map((c) => (
                <TableRow key={c.reason}>
                  <TableCell>{c.reason}</TableCell>
                  <TableCell>{num(c.count)}</TableCell>
                  <TableCell>{c.pct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-serif text-xl">Productos con mayor crecimiento</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {data.growingProducts.map((p) => (
            <li key={p.name} className="flex justify-between gap-4">
              <span>{p.name}</span>
              <span className="tabular text-olive">{pct(p.growthPct)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          El {Math.round(data.pareto.share * 100)}% de las ventas viene del {data.pareto.topCount} productos más vendidos (aprox. 20% de {data.pareto.totalProducts}).
        </p>
      </section>
    </div>
  );
}
