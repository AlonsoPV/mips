import { Link } from "react-router-dom";
import { ChannelChip } from "@/components/channel-chip";
import { KpiStat } from "@/components/kpi-stat";
import { Disclaimer, EmptyState, PageError, PageLoading } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import { ago, mxn } from "@/lib/format";
import type { KpiValue } from "@shared/types";

interface Cust {
  kpis: KpiValue[];
  segments: Record<string, number>;
  sample: Array<{
    id: string;
    displayName: string;
    channels: string[];
    lastSeenAt: string;
    reservationCount: number;
    attributedSpend: number;
    visitCount: number;
    segment: string;
    preferences: { mesa?: string; momento?: string; dia?: string } | null;
  }>;
  disclaimer: string;
}

const segmentLabel: Record<string, string> = {
  nuevos: "Nuevos",
  recurrentes: "Recurrentes",
  frecuentes: "Frecuentes",
  alto_valor: "Alto valor",
  inactivos: "Inactivos",
};

export default function Clientes() {
  const { qs } = usePeriod();
  const { data, loading, error, reload } = useApi<Cust>(`/api/customers/summary${qs}`);
  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin clientes" body="No hay identificadores compatibles en este periodo." />;

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <header>
        <h1 className="font-serif text-3xl md:text-4xl">Clientes · vista 360</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Potencial futuro del Hub cuando existe un identificador compatible. No es información garantizada.</p>
      </header>
      <Disclaimer>{data.disclaimer}</Disclaimer>
      <section className="grid gap-8 sm:grid-cols-2 xl:grid-cols-5">
        {data.kpis.map((k) => (
          <KpiStat key={k.label} kpi={k} />
        ))}
      </section>
      <section className="flex flex-wrap gap-2">
        {Object.entries(data.segments).map(([key, n]) => (
          <Badge key={key} tone="copper">
            {segmentLabel[key] ?? key}: {n}
          </Badge>
        ))}
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {data.sample.map((c) => (
          <article key={c.id} className="rounded-xl border bg-card p-6 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-serif text-xl">{c.displayName}</h2>
              <Badge>{segmentLabel[c.segment] ?? c.segment}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(c.channels ?? []).map((ch) => (
                <ChannelChip key={ch} channel={ch} />
              ))}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Última visita</dt>
                <dd>{ago(c.lastSeenAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Reservaciones</dt>
                <dd>{c.reservationCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Gasto atribuido</dt>
                <dd>{mxn(c.attributedSpend)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Preferencias</dt>
                <dd>
                  {c.preferences ? `${c.preferences.mesa} · ${c.preferences.momento} · ${c.preferences.dia}` : "—"}
                </dd>
              </div>
            </dl>
            <Link to={`/clientes/${c.id}`} className="mt-4 inline-flex min-h-11 items-center text-sm text-primary hover:underline">
              Ver ficha
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
