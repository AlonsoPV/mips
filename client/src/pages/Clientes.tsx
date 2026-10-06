import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { KpiCard } from "@/components/kpi-card";
import { MetricTooltip } from "@/components/metric-tooltip";
import { PageIntro } from "@/components/page-intro";
import { PriorityCard } from "@/components/priority-card";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import { ago, mxn, num } from "@/lib/format";
import type { KpiValue } from "@shared/types";

interface Row {
  id: string;
  displayName: string;
  channels: string[] | null;
  lastSeenAt: string;
  reservationCount: number;
  attributedSpend: number;
  visitCount: number;
  segment: string;
  preferences: { mesa?: string; momento?: string; dia?: string } | null;
}

interface Cust {
  kpis: KpiValue[];
  segments: Record<string, number>;
  sample: Row[];
  lists?: Record<string, Row[]>;
  disclaimer: string;
}

const segmentLabel: Record<string, string> = {
  nuevos: "Nuevos",
  recurrentes: "Recurrentes",
  frecuentes: "Frecuentes",
  alto_valor: "Alto valor",
  inactivos: "Sin volver",
};

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "inactivos", label: "Sin volver" },
  { id: "alto_valor", label: "Alto valor" },
  { id: "frecuentes", label: "Frecuentes" },
  { id: "nuevos", label: "Nuevos" },
] as const;

type SegmentId = (typeof FILTERS)[number]["id"];

function hash(qs: string, id: string, extra?: string) {
  const p = new URLSearchParams(qs.startsWith("?") ? qs.slice(1) : qs);
  if (extra) p.set("segment", extra);
  else p.delete("segment");
  const search = p.toString();
  return search ? `?${search}${id ? `#${id}` : ""}` : id ? `#${id}` : "";
}

export default function Clientes() {
  const { qs } = usePeriod();
  const [params, setParams] = useSearchParams();
  const segment = (FILTERS.some((f) => f.id === params.get("segment")) ? params.get("segment") : "all") as SegmentId;
  const { data, loading, error, reload } = useApi<Cust>(`/api/customers/summary${qs}`);

  const rows = useMemo(() => {
    if (!data) return [];
    if (segment === "all") {
      const seen = new Set<string>();
      const mix = [...(data.lists?.alto_valor ?? []), ...(data.lists?.inactivos ?? []), ...(data.sample ?? [])];
      const out: Row[] = [];
      for (const c of mix) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        out.push(c);
        if (out.length >= 8) break;
      }
      return out;
    }
    return (data.lists?.[segment] ?? data.sample.filter((c) => c.segment === segment)).slice(0, 8);
  }, [data, segment]);

  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin clientes" body="No hay identificadores compatibles en este periodo." />;

  const pick = (label: string) => data.kpis.find((k) => k.label === label);
  const identifiable = pick("Clientes identificables");
  const recurrentes = pick("Recurrentes");
  const nuevos = pick("Nuevos");
  const inactivosN = data.segments.inactivos ?? 0;
  const inactivos: KpiValue = {
    label: "Sin volver",
    tooltip: "Clientes identificables que no han regresado en más de 45 días.",
    value: inactivosN,
    previousValue: inactivosN,
    deltaPct: 0,
    unit: "count",
  };
  const mainKpis: { kpi: KpiValue; to: string }[] = [
    identifiable && { kpi: { ...identifiable, label: "Identificables" }, to: hash(qs, "lista") },
    recurrentes && { kpi: recurrentes, to: hash(qs, "lista", "all") },
    nuevos && { kpi: nuevos, to: hash(qs, "lista", "nuevos") },
    { kpi: inactivos, to: hash(qs, "lista", "inactivos") },
  ].filter(Boolean) as { kpi: KpiValue; to: string }[];

  const alto = data.segments.alto_valor ?? 0;
  const frecuentes = data.segments.frecuentes ?? 0;
  const priorities = [];
  if (inactivosN > 0) {
    priorities.push({
      tone: "opportunity" as const,
      title: `${num(inactivosN)} ${inactivosN === 1 ? "cliente no ha" : "clientes no han"} vuelto`,
      description: "Llevan más de 45 días sin visita atribuida. Sirve para una reactivación, con consentimiento.",
      ctaLabel: "Ver quiénes",
      to: hash(qs, "lista", "inactivos"),
    });
  }
  if (alto > 0) {
    priorities.push({
      tone: "opportunity" as const,
      title: `Hay ${num(alto)} de alto valor`,
      description: "Gasto y visitas altos. Conviene cuidarlos en mesa y en el canal digital.",
      ctaLabel: "Ver fichas",
      to: hash(qs, "lista", "alto_valor"),
    });
  }
  if (priorities.length < 3 && frecuentes > 0) {
    priorities.push({
      tone: "info" as const,
      title: `${num(frecuentes)} vienen seguido`,
      description: "Ya conocen el restaurante. Útil para experiencias o horarios que ya les funcionan.",
      ctaLabel: "Ver frecuentes",
      to: hash(qs, "lista", "frecuentes"),
    });
  }
  if (priorities.length < 3 && (nuevos?.value ?? 0) > 0) {
    priorities.push({
      tone: "info" as const,
      title: `${num(nuevos!.value)} mesas nuevas identificables`,
      description: "Primera visita con identificador. Todavía no son recurrencia.",
      ctaLabel: "Ver nuevos",
      to: hash(qs, "lista", "nuevos"),
    });
  }

  const headline =
    inactivosN > 0
      ? `Hay ${num(inactivosN)} clientes identificables que no han vuelto.`
      : alto > 0
        ? "Hay clientes de alto valor que conviene cuidar."
        : "Así se ve quién ya nos conoce, cuando hay identificador.";

  function setSegment(id: SegmentId) {
    const p = new URLSearchParams(params);
    if (id === "all") p.delete("segment");
    else p.set("segment", id);
    setParams(p);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageIntro
        question="¿Quién ya nos conoce?"
        title="Clientes"
        headline={headline}
        aside={<MetricTooltip label="Sobre esta vista">{data.disclaimer}</MetricTooltip>}
      />

      <section>
        <h2 className="mb-2 font-serif text-lg">Tus clientes ahora</h2>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {mainKpis.map((item) => (
            <KpiCard key={item.kpi.label} kpi={item.kpi} to={item.to} showTrend={false} />
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

      <section id="lista" className="scroll-mt-24 rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-lg">A quién cuidar</h2>
          <FilterBar options={[...FILTERS]} value={segment} onChange={setSegment} ariaLabel="Filtrar clientes" />
        </div>
        {rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No hay fichas en este grupo ahora.</p>
        ) : (
          <DataTable>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Canales</TableHead>
                <TableHead>Última visita</TableHead>
                <TableHead>Gasto atribuido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell>
                    <Link to={`/clientes/${c.id}`} className="block font-medium">
                      {c.displayName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link to={`/clientes/${c.id}`}>{segmentLabel[c.segment] ?? c.segment}</Link>
                  </TableCell>
                  <TableCell>
                    <Link to={`/clientes/${c.id}`} className="flex flex-wrap gap-1">
                      {(c.channels ?? []).slice(0, 3).map((ch) => (
                        <ChannelBadge key={ch} channel={ch} />
                      ))}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link to={`/clientes/${c.id}`}>{ago(c.lastSeenAt)}</Link>
                  </TableCell>
                  <TableCell className="tabular">
                    <Link to={`/clientes/${c.id}`}>{mxn(c.attributedSpend)}</Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        )}
        <Link to="/marketing" className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">
          Ver oportunidades →
        </Link>
      </section>
    </div>
  );
}
