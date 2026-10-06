import { ChartCard } from "@/components/chart-card";
import { SimpleBar, SimpleDonut } from "@/components/charts";
import { DataTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-table";
import { KpiCard } from "@/components/kpi-card";
import { MetricTooltip } from "@/components/metric-tooltip";
import { PageIntro } from "@/components/page-intro";
import { PriorityCard } from "@/components/priority-card";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import { num } from "@/lib/format";
import type { KpiValue } from "@shared/types";

interface WA {
  kpis: KpiValue[];
  intents: { intent: string; count: number }[];
  byHour: { hour: number; conversations: number }[];
  funnel: { conversacion: number; intencion: number; solicitud: number; conversion: number };
  templates: { name: string; sent: number; delivered: number; read: number; replied: number }[];
  disclaimer: string;
}

const intentEs: Record<string, string> = {
  reservaciones: "Reservaciones",
  pedidos: "Pedidos",
  horarios: "Horarios",
  ubicacion: "Ubicación",
  menu: "Menú",
  eventos: "Eventos",
  quejas: "Quejas",
  otros: "Otros",
};

const KPI_TO: Record<string, string> = {
  Conversaciones: "motivos",
  "Clientes únicos": "motivos",
  "Tiempo medio de primera respuesta": "horario",
  "Solicitudes convertidas": "recorrido",
};

export default function Whatsapp() {
  const { qs } = usePeriod();
  const { data, loading, error, reload } = useApi<WA>(`/api/whatsapp/summary${qs}`);
  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin conversaciones" body="No hay actividad de WhatsApp en este periodo." />;

  const pick = (label: string) => data.kpis.find((k) => k.label === label);
  const conv = pick("Conversaciones");
  const unique = pick("Clientes únicos");
  const resp = pick("Tiempo medio de primera respuesta");
  const converted = pick("Solicitudes convertidas");
  const mainKpis = [conv, unique, resp, converted].filter(Boolean) as KpiValue[];
  const hash = (id: string) => `${qs}#${id}`;

  const totalIntent = data.intents.reduce((s, i) => s + i.count, 0) || 1;
  const resIntent = data.intents.find((i) => i.intent === "reservaciones");
  const complaints = data.intents.find((i) => i.intent === "quejas");
  const resPct = resIntent ? Math.round((resIntent.count / totalIntent) * 100) : 0;
  const peakHour = [...data.byHour].sort((a, b) => b.conversations - a.conversations)[0];
  const conversionRate = data.funnel.conversacion
    ? Math.round((data.funnel.conversion / data.funnel.conversacion) * 100)
    : 0;

  const priorities = [];
  if (resPct >= 30) {
    priorities.push({
      tone: "opportunity" as const,
      title: "WhatsApp está absorbiendo reservaciones",
      description: `${resPct}% de las conversaciones son por mesa. El canal conversacional opera como extensión de OpenTable.`,
      ctaLabel: "Ver reservaciones",
      to: "/reservaciones",
    });
  }
  if (complaints && complaints.count > 0) {
    priorities.push({
      tone: "attention" as const,
      title: `${num(complaints.count)} ${complaints.count === 1 ? "conversación es queja" : "conversaciones son quejas"}`,
      description: "No son ventas. Conviene leer el motivo antes de que se vayan a reseña.",
      ctaLabel: "Ver motivos",
      to: hash("motivos"),
    });
  }
  if (resp && resp.value > 120) {
    priorities.push({
      tone: "attention" as const,
      title: "La primera respuesta se está tardando",
      description: "Tardan más de 2 minutos en contestar. En servicio eso se siente.",
      ctaLabel: "Ver horarios",
      to: hash("horario"),
    });
  }
  if (priorities.length < 3) {
    priorities.push({
      tone: "info" as const,
      title: `${conversionRate}% llega a una solicitud atribuida`,
      description: "Solo cuenta cuando hay vínculo explícito con reservación o pedido. WhatsApp no se trata como caja.",
      ctaLabel: "Ver recorrido",
      to: hash("recorrido"),
    });
  }

  const headline =
    resPct >= 30
      ? "La gente escribe sobre todo para reservar."
      : complaints && complaints.count > 0
        ? "Hay quejas en el canal. No son ventas."
        : "Conversaciones, no ventas: por eso nos escriben.";

  const donut = data.intents.map((i) => ({ name: intentEs[i.intent] ?? i.intent, value: i.count }));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageIntro
        question="¿Por qué nos están contactando?"
        channel="whatsapp"
        title="WhatsApp"
        headline={headline}
        aside={<MetricTooltip label="Sobre las métricas">{data.disclaimer}</MetricTooltip>}
      />

      <section>
        <h2 className="mb-2 font-serif text-lg">Tus conversaciones ahora</h2>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {mainKpis.map((k) => (
            <KpiCard key={k.label} kpi={k} to={hash(KPI_TO[k.label] ?? "motivos")} />
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

      <div className="grid gap-2.5 lg:grid-cols-2">
        <div id="motivos" className="scroll-mt-24">
          <ChartCard title="¿Por qué escriben?">
            <SimpleDonut data={donut} nameKey="name" valueKey="value" compact />
          </ChartCard>
        </div>
        <div id="horario" className="scroll-mt-24">
          <ChartCard title="¿A qué hora escriben?">
            <SimpleBar data={data.byHour} x="hour" y="conversations" yLabel="Conversaciones" compact />
            {peakHour && (
              <p className="mt-2 text-xs text-muted-foreground">
                Más escriben a las {String(peakHour.hour).padStart(2, "0")}:00.
              </p>
            )}
          </ChartCard>
        </div>
      </div>

      <section id="recorrido" className="scroll-mt-24 rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <h2 className="font-serif text-lg">Del mensaje a la solicitud</h2>
        <ol className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Conversación", data.funnel.conversacion],
            ["Intención", data.funnel.intencion],
            ["Solicitud", data.funnel.solicitud],
            ["Atribuida", data.funnel.conversion],
          ].map(([label, value]) => (
            <li key={String(label)}>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="font-serif text-2xl tabular">{num(Number(value))}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <h2 className="font-serif text-lg">Plantillas que sí se leen</h2>
        <DataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Plantilla</TableHead>
              <TableHead>Enviados</TableHead>
              <TableHead>Leídos</TableHead>
              <TableHead>Respuesta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.templates.slice(0, 5).map((t) => (
              <TableRow key={t.name}>
                <TableCell>{t.name}</TableCell>
                <TableCell className="tabular">{num(t.sent)}</TableCell>
                <TableCell className="tabular">{num(t.read)}</TableCell>
                <TableCell className="tabular">{num(t.replied)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      </section>
    </div>
  );
}
