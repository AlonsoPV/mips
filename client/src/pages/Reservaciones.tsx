import { ChartCard } from "@/components/chart-card";
import { Heatmap } from "@/components/heatmap";
import { KpiCard } from "@/components/kpi-card";
import { MetricTooltip } from "@/components/metric-tooltip";
import { PageIntro } from "@/components/page-intro";
import { PriorityCard } from "@/components/priority-card";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import { DOW_FULL, num } from "@/lib/format";
import type { KpiValue } from "@shared/types";

interface OT {
  kpis: KpiValue[];
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
  no_show: "No se presentaron",
};

const KPI_TO: Record<string, string> = {
  Reservaciones: "demanda",
  Comensales: "grupos",
  "Tamaño promedio de mesa": "grupos",
  Cancelaciones: "estados",
};

export default function Reservaciones() {
  const { qs } = usePeriod();
  const { data, loading, error, reload } = useApi<OT>(`/api/opentable/summary${qs}`);
  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin reservaciones" body="No hay reservaciones OpenTable en este periodo." />;

  const pick = (label: string) => data.kpis.find((k) => k.label === label);
  const rsv = pick("Reservaciones");
  const covers = pick("Comensales");
  const avgSize = pick("Tamaño promedio de mesa");
  const cancel = pick("Cancelaciones");
  const noshow = pick("No-show");
  const mainKpis = [rsv, covers, avgSize, cancel].filter(Boolean) as KpiValue[];
  const hash = (id: string) => `${qs}#${id}`;

  const peak = [...data.heatmap].sort((a, b) => b.count - a.count)[0];
  const large = data.partySize.find((p) => p.label === "7+" || p.label === "5-6");
  const sameDay = data.leadTime.find((l) => l.label.toLowerCase().includes("mismo"));

  const priorities = [];
  if (noshow && noshow.value > 0) {
    priorities.push({
      tone: "attention" as const,
      title: `${num(noshow.value)} ${noshow.value === 1 ? "mesa no se presentó" : "mesas no se presentaron"}`,
      description: "No-show en OpenTable. Sirve para revisar depósitos o confirmación por WhatsApp.",
      deltaPct: noshow.deltaPct,
      ctaLabel: "Ver estados",
      to: hash("estados"),
    });
  }
  if (cancel && (cancel.deltaPct ?? 0) > 0) {
    priorities.push({
      tone: "attention" as const,
      title: "Hay más cancelaciones de mesa",
      description: "Si se concentran en un horario, conviene soltar esa capacidad a walk-in o Uber.",
      deltaPct: cancel.deltaPct,
      ctaLabel: "Ver demanda",
      to: hash("demanda"),
    });
  }
  if (peak) {
    priorities.push({
      tone: "opportunity" as const,
      title: `${DOW_FULL[peak.dow] ?? "Ese día"} ${String(peak.hour).padStart(2, "0")}:00 es el momento más pedido`,
      description: "Ahí se concentra quién quiere venir. Ajusta piso y WhatsApp a esa ventana.",
      ctaLabel: "Ver horario",
      to: hash("demanda"),
    });
  }
  if (priorities.length < 3 && large && large.value > 0) {
    priorities.push({
      tone: "opportunity" as const,
      title: "Hay grupos grandes pidiendo mesa",
      description: "Mesas de 5 o más. Útil para armar experiencias o menús de grupo.",
      ctaLabel: "Ver tamaños",
      to: hash("grupos"),
    });
  }

  const headline =
    noshow && noshow.value > 0
      ? "Hay mesas que no se presentaron."
      : peak
        ? `La demanda se junta ${DOW_FULL[peak.dow] ?? ""} alrededor de las ${String(peak.hour).padStart(2, "0")}:00.`
        : "Así piden mesa tus clientes.";

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
    <div className="mx-auto max-w-6xl space-y-5">
      <PageIntro
        question="¿Cuándo quieren venir nuestros clientes?"
        channel="opentable"
        title="Reservaciones"
        headline={headline}
        aside={<MetricTooltip label="Sobre OpenTable">{data.disclaimer}</MetricTooltip>}
      />

      <section>
        <h2 className="mb-2 font-serif text-lg">Tus mesas ahora</h2>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {mainKpis.map((k) => (
            <KpiCard key={k.label} kpi={k} to={hash(KPI_TO[k.label] ?? "demanda")} />
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

      <div id="demanda" className="scroll-mt-24">
        <ChartCard title="¿Cuándo quieren mesa?">
          <Heatmap
            cells={cells}
            metric="ot"
            peakLabel={
              peak
                ? `Mayor concentración: ${DOW_FULL[peak.dow]} ${String(peak.hour).padStart(2, "0")}:00.`
                : undefined
            }
          />
        </ChartCard>
      </div>

      <div className="grid gap-2.5 md:grid-cols-3">
        <section id="grupos" className="scroll-mt-24 rounded-lg border bg-card px-4 py-3.5 shadow-soft">
          <h2 className="font-serif text-lg">Tamaño de grupo</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {data.partySize.map((p) => (
              <li key={p.label} className="flex justify-between">
                <span>{p.label} personas</span>
                <span className="tabular">{num(p.value)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
          <h2 className="font-serif text-lg">Con cuánta anticipación</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {data.leadTime.map((l) => (
              <li key={l.label} className="flex justify-between">
                <span>{l.label}</span>
                <span className="tabular">{num(l.value)}</span>
              </li>
            ))}
          </ul>
          {sameDay && sameDay.value > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">{num(sameDay.value)} llegan el mismo día.</p>
          )}
        </section>
        <section id="estados" className="scroll-mt-24 rounded-lg border bg-card px-4 py-3.5 shadow-soft">
          <h2 className="font-serif text-lg">Cómo cerró la mesa</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {data.states.map((s) => (
              <li key={s.status} className="flex justify-between">
                <span>{statusEs[s.status] ?? s.status}</span>
                <span className="tabular">{num(s.count)}</span>
              </li>
            ))}
          </ul>
          {data.returningCustomers > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {num(data.returningCustomers)} clientes ya habían venido (cuando hay identificador).
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
