import { ChannelChip } from "@/components/channel-chip";
import { SimpleBar, SimpleDonut } from "@/components/charts";
import { Heatmap } from "@/components/heatmap";
import { KpiStat } from "@/components/kpi-stat";
import { Disclaimer, EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import { num } from "@/lib/format";
import type { KpiValue } from "@shared/types";

interface OT {
  kpis: KpiValue[];
  byDay: { day: string; reservations: number; covers: number }[];
  heatmap: { dow: number; hour: number; count: number }[];
  partySize: { label: string; value: number }[];
  leadTime: { label: string; value: number }[];
  states: { status: string; count: number }[];
  returningCustomers: number;
  disclaimer: string;
}

const statusEs: Record<string, string> = {
  confirmed: "Confirmada",
  seated: "Sentada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No-show",
};

export default function Reservaciones() {
  const { qs } = usePeriod();
  const { data, loading, error, reload } = useApi<OT>(`/api/opentable/summary${qs}`);
  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin reservaciones" body="No hay reservaciones OpenTable en este periodo." />;

  const max = Math.max(1, ...data.heatmap.map((h) => h.count));
  const cells = data.heatmap.map((h) => ({
    dow: h.dow,
    hour: h.hour,
    uber: 0,
    ot: h.count,
    wa: 0,
    total: h.count,
    intensity: h.count / max,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <header>
        <ChannelChip channel="opentable" />
        <h1 className="mt-3 font-serif text-3xl md:text-4xl">Reservaciones</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Demanda de mesa desde OpenTable. No se interpreta como venta hasta que exista un folio de Míps.</p>
      </header>
      <Disclaimer>{data.disclaimer}</Disclaimer>
      <section className="grid gap-8 sm:grid-cols-2 xl:grid-cols-5">
        {data.kpis.map((k) => (
          <KpiStat key={k.label} kpi={k} />
        ))}
      </section>
      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-serif text-xl">Reservaciones por día</h2>
        <SimpleBar data={data.byDay} x="day" y="reservations" yLabel="Reservaciones" />
      </section>
      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-serif text-xl">Heatmap día / hora</h2>
        <div className="mt-4">
          <Heatmap cells={cells} />
        </div>
      </section>
      <section className="grid gap-8 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-serif text-xl">Tamaño de grupo</h2>
          <SimpleDonut data={data.partySize} nameKey="label" valueKey="value" />
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-serif text-xl">Anticipación</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.leadTime.map((l) => (
              <li key={l.label} className="flex justify-between">
                <span>{l.label}</span>
                <span className="tabular">{num(l.value)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-serif text-xl">Estados</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.states.map((s) => (
              <li key={s.status} className="flex justify-between">
                <span>{statusEs[s.status] ?? s.status}</span>
                <span className="tabular">{num(s.count)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">{num(data.returningCustomers)} clientes con visitas recurrentes (cuando existe customer_id).</p>
        </div>
      </section>
    </div>
  );
}
