import { Link } from "react-router-dom";
import { InsightCard } from "@/components/insight-card";
import { Disclaimer, EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import type { Insight } from "@shared/types";

export default function Marketing() {
  const { qs } = usePeriod();
  const { data, loading, error, reload } = useApi<{ disclaimer: string; opportunities: Insight[] }>(
    `/api/marketing/opportunities${qs}`,
  );
  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data?.opportunities.length) {
    return <EmptyState title="Sin oportunidades" body="No hay señales de marketing para este periodo." />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header>
        <h1 className="font-serif text-3xl md:text-4xl">Insights para marketing</h1>
        <p className="mt-2 text-muted-foreground">
          No es un gestor de campañas. Es una lectura de horarios, productos y recurrencia para decidir qué vale la pena probar.
        </p>
      </header>
      <Disclaimer>{data.disclaimer}</Disclaimer>
      <div className="divide-y">
        {data.opportunities.map((o) => (
          <InsightCard key={o.id} insight={o} />
        ))}
      </div>
      <p className="text-sm">
        <Link to="/reportes" className="text-primary hover:underline">
          Bajar a un reporte
        </Link>
      </p>
    </div>
  );
}
