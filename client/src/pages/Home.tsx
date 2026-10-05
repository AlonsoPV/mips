import { Link } from "react-router-dom";
import { InsightCard } from "@/components/insight-card";
import { KpiStat } from "@/components/kpi-stat";
import { Heatmap } from "@/components/heatmap";
import { ChannelChip } from "@/components/channel-chip";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import type { Insight, KpiValue } from "@shared/types";
import { greetingFor } from "@shared/time";
import { num } from "@/lib/format";

interface Summary {
  kpis: KpiValue[];
  channels: {
    uber_eats: { metric: string; value: number };
    opentable: { metric: string; value: number };
    whatsapp: { metric: string; value: number };
    mips: { metric: string; value: number };
  };
}
interface Insights {
  insights: Insight[];
  subtitle: string;
}
interface Heat {
  cells: Array<{ dow: number; hour: number; uber: number; ot: number; wa: number; total: number; intensity: number }>;
  peak: { dow: number; hour: number };
}

const DAYS = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];

export default function Home() {
  const { qs } = usePeriod();
  const summary = useApi<Summary>(`/api/dashboard/summary${qs}`);
  const insights = useApi<Insights>(`/api/dashboard/insights${qs}`);
  const heat = useApi<Heat>(`/api/dashboard/heatmap${qs}`);

  if (summary.loading || insights.loading || heat.loading) return <PageLoading />;
  if (summary.error || insights.error || heat.error) {
    return <PageError message={summary.error || insights.error || heat.error || ""} onRetry={() => { summary.reload(); insights.reload(); heat.reload(); }} />;
  }
  if (!summary.data || !insights.data || !heat.data) {
    return <EmptyState title="Sin datos" body="Todavía no hay actividad para este periodo." />;
  }

  const greeting = greetingFor();
  const peak = heat.data.peak;

  return (
    <div className="mx-auto max-w-6xl space-y-14">
      <header className="max-w-3xl">
        <h1 className="font-serif text-3xl md:text-4xl">{greeting}, aquí está lo que está pasando en tu restaurante.</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{insights.data.subtitle}</p>
      </header>

      <section className="grid gap-10 sm:grid-cols-2 xl:grid-cols-4">
        {summary.data.kpis.map((kpi) => (
          <KpiStat key={kpi.label} kpi={kpi} large />
        ))}
      </section>

      <section>
        <h2 className="font-serif text-2xl">Lo que debes saber</h2>
        <div className="mt-2 divide-y">
          {insights.data.insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl">Así llega tu negocio</h2>
        <p className="mt-2 text-sm text-muted-foreground">Cada canal se mide por lo que realmente produce. No se mezclan pedidos, reservaciones y conversaciones.</p>
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          {(
            [
              ["uber_eats", summary.data.channels.uber_eats, "/ventas"],
              ["opentable", summary.data.channels.opentable, "/reservaciones"],
              ["whatsapp", summary.data.channels.whatsapp, "/whatsapp"],
            ] as const
          ).map(([key, ch, href]) => (
            <Link key={key} to={href} className="block rounded-xl border bg-card p-6 shadow-soft transition hover:border-primary/40">
              <ChannelChip channel={key} />
              <p className="mt-4 text-sm text-muted-foreground">{ch.metric}</p>
              <p className="mt-1 font-serif text-4xl tabular">{num(ch.value)}</p>
            </Link>
          ))}
        </div>
        <div className="mt-6 rounded-xl border bg-card px-6 py-5">
          <p className="text-sm text-muted-foreground">Impacto en Míps</p>
          <p className="mt-1 font-serif text-3xl tabular">{num(summary.data.channels.mips.value)} operaciones confirmadas</p>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl">Demanda por día y hora</h2>
        <div className="mt-4 rounded-xl border bg-card p-6">
          <Heatmap
            cells={heat.data.cells}
            peakLabel={`Tu mayor concentración digital ocurre los ${DAYS[peak.dow]} entre ${String(peak.hour).padStart(2, "0")}:00 y ${String(peak.hour + 2).padStart(2, "0")}:00.`}
          />
        </div>
      </section>
    </div>
  );
}
