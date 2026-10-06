import { Link } from "react-router-dom";
import { KpiCard } from "@/components/kpi-card";
import { MetricTooltip } from "@/components/metric-tooltip";
import { PageIntro } from "@/components/page-intro";
import { PriorityCard, type PriorityTone } from "@/components/priority-card";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import type { Insight, KpiValue } from "@shared/types";

interface Mkt {
  disclaimer: string;
  opportunities: Insight[];
}

interface Cust {
  segments: Record<string, number>;
}

interface Uber {
  growingProducts: { name: string; growthPct: number | null }[];
}

const TONE: Record<string, PriorityTone> = {
  critical: "critical",
  attention: "attention",
  opportunity: "opportunity",
  info: "info",
};

function kpi(label: string, tooltip: string, value: number): KpiValue {
  return { label, tooltip, value, previousValue: value, deltaPct: 0, unit: "count" };
}

function actionLink(o: Insight, qs: string) {
  if (o.type === "recurrencia" || o.deepLink.startsWith("/clientes")) return `/clientes${qs}&segment=inactivos`;
  if (o.deepLink === "/marketing") {
    if (o.type === "horario") return "/reservaciones";
    if (o.type === "producto") return "/ventas?focus=productos";
  }
  if (o.type === "producto" || o.deepLink.includes("focus=productos")) return `/ventas${qs}&focus=productos`;
  return o.deepLink;
}

export default function Marketing() {
  const { qs } = usePeriod();
  const mkt = useApi<Mkt>(`/api/marketing/opportunities${qs}`);
  const cust = useApi<Cust>(`/api/customers/summary${qs}`);
  const uber = useApi<Uber>(`/api/uber/summary${qs}`);

  if (mkt.loading) return <PageLoading />;
  if (mkt.error) return <PageError message={mkt.error} onRetry={mkt.reload} />;
  if (!mkt.data) return <EmptyState title="Sin lecturas" body="No hay señales de marketing para este periodo." />;

  const opportunities = mkt.data.opportunities;
  const inactivos = cust.data?.segments.inactivos ?? 0;
  const alto = cust.data?.segments.alto_valor ?? 0;
  const growing = uber.data?.growingProducts.filter((p) => (p.growthPct ?? 0) > 0).length ?? 0;
  const star = uber.data?.growingProducts.find((p) => (p.growthPct ?? 0) > 0);

  const kpis: { kpi: KpiValue; to: string }[] = [
    {
      kpi: kpi("Lecturas", "Horario, producto o recurrencia que vale la pena probar. No es un gestor de campañas.", opportunities.length),
      to: `${qs}#prioridades`,
    },
    {
      kpi: kpi("Sin volver", "Clientes identificables que no han regresado en más de 45 días.", inactivos),
      to: `/clientes${qs}&segment=inactivos`,
    },
    {
      kpi: kpi("Alto valor", "Clientes identificables con gasto y visitas altos.", alto),
      to: `/clientes${qs}&segment=alto_valor`,
    },
    {
      kpi: kpi("Productos en alza", "Productos de Uber Eats con venta por encima del periodo anterior.", growing),
      to: `/ventas${qs}&focus=productos`,
    },
  ];

  const priorities = opportunities.slice(0, 3).map((o) => ({
    tone: TONE[o.priority] ?? "opportunity",
    title: o.title,
    description: o.description,
    secondary: o.metric ?? o.impact,
    ctaLabel: o.ctaLabel,
    to: actionLink(o, qs),
  }));

  const horario = opportunities.find((o) => o.type === "horario");
  const producto = opportunities.find((o) => o.type === "producto");
  const recurrencia = opportunities.find((o) => o.type === "recurrencia");

  const headline = inactivos > 0
    ? "Hay clientes que no han vuelto. Y hay lecturas de horario y producto para probar."
    : opportunities[0]
      ? opportunities[0].title
      : "Revisa horario, producto y quién no ha vuelto.";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageIntro
        question="¿Dónde están las oportunidades?"
        title="Oportunidades"
        headline={headline}
        aside={<MetricTooltip label="Sobre estas lecturas">{mkt.data.disclaimer}</MetricTooltip>}
      />

      <section>
        <h2 className="mb-2 font-serif text-lg">Qué vale la pena ahora</h2>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {kpis.map((item) => (
            <KpiCard key={item.kpi.label} kpi={item.kpi} to={item.to} showTrend={false} />
          ))}
        </div>
      </section>

      <section id="prioridades" className="scroll-mt-24">
        <h2 className="mb-2 font-serif text-lg">Prioridades</h2>
        {priorities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay una lectura fuerte en este periodo.</p>
        ) : (
          <div className="flex snap-x gap-2.5 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible">
            {priorities.map((p) => (
              <PriorityCard key={p.title} {...p} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-2.5 md:grid-cols-3">
        <h2 className="font-serif text-lg md:col-span-3">Por dónde atacar</h2>
        <Lever
          kind="Horario"
          title={horario?.title ?? "Cuándo se junta la demanda"}
          to="/reservaciones"
        />
        <Lever
          kind="Producto"
          title={star?.name ?? producto?.metric ?? "Qué está jalando ticket"}
          to={`/ventas${qs}&focus=productos`}
        />
        <Lever
          kind="Recurrencia"
          title={recurrencia?.title ?? "Quién no ha vuelto"}
          to={`/clientes${qs}&segment=inactivos`}
        />
      </section>
    </div>
  );
}

function Lever({ kind, title, to }: { kind: string; title: string; to: string }) {
  return (
    <Link to={to} className="rounded-lg border bg-card px-4 py-3 shadow-soft hover:border-primary/40">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{kind}</p>
      <p className="mt-1 font-serif text-lg leading-snug">{title}</p>
    </Link>
  );
}
