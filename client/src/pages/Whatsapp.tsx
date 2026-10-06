import { PeakHour } from "@/components/big-number";
import { ChannelBadge } from "@/components/channel-badge";
import { ChartCard } from "@/components/chart-card";
import { SimpleBar, SimpleDonut } from "@/components/charts";
import { FunnelStrip } from "@/components/funnel-strip";
import { KpiCard } from "@/components/kpi-card";
import { MetricTooltip } from "@/components/metric-tooltip";
import { PageIntro } from "@/components/page-intro";
import { PriorityCard } from "@/components/priority-card";
import { ShareBars } from "@/components/share-bars";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import type { ChannelKey } from "@/lib/channel-config";
import { num } from "@/lib/format";
import type { KpiValue } from "@shared/types";

interface WA {
  kpis: KpiValue[];
  intents: { intent: string; count: number }[];
  byHour: { hour: number; conversations: number }[];
  funnel: { conversacion: number; conversion: number };
  observedStages: { stage: string; count: number }[];
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
  "Clientes identificados": "motivos",
  "Clientes únicos": "motivos",
  "Tiempo medio de primera respuesta": "horario",
  "Solicitudes convertidas": "recorrido",
};

/** La conversación la produce WhatsApp; la atribución a una reservación o pedido la hace el Hub. */
const KPI_CHANNEL: Record<string, ChannelKey> = {
  Conversaciones: "whatsapp",
  "Clientes identificados": "whatsapp",
  "Clientes únicos": "whatsapp",
  "Tiempo medio de primera respuesta": "whatsapp",
  "Solicitudes convertidas": "hub",
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
  const uniqueKpi = unique ? { ...unique, label: "Clientes identificados" } : undefined;
  const resp = pick("Tiempo medio de primera respuesta");
  const converted = pick("Solicitudes convertidas");
  const mainKpis = [conv, uniqueKpi, resp, converted].filter(Boolean) as KpiValue[];
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
      channel: "whatsapp" as const,
      title: "WhatsApp está absorbiendo reservaciones",
      description: `${resPct}% de las conversaciones son por mesa. El canal conversacional opera como extensión de OpenTable.`,
      ctaLabel: "Ver reservaciones",
      to: "/reservaciones",
    });
  }
  if (complaints && complaints.count > 0) {
    priorities.push({
      tone: "attention" as const,
      channel: "whatsapp" as const,
      title: `${num(complaints.count)} ${complaints.count === 1 ? "conversación es queja" : "conversaciones son quejas"}`,
      description: "No son ventas. Conviene leer el motivo antes de que se vayan a reseña.",
      ctaLabel: "Ver motivos",
      to: hash("motivos"),
    });
  }
  if (resp && resp.value > 120) {
    priorities.push({
      tone: "attention" as const,
      channel: "whatsapp" as const,
      title: "La primera respuesta se está tardando",
      description: "Tardan más de 2 minutos en contestar. En servicio eso se siente.",
      ctaLabel: "Ver horarios",
      to: hash("horario"),
    });
  }
  if (priorities.length < 3) {
    priorities.push({
      tone: "info" as const,
      channel: "hub" as const,
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
          {mainKpis.map((k, i) => (
            <KpiCard key={k.label} kpi={k} to={hash(KPI_TO[k.label] ?? "motivos")} channel={KPI_CHANNEL[k.label] ?? "whatsapp"} featured={i === 0} />
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
          <ChartCard title="¿Por qué escriben?" channel="whatsapp">
            <SimpleDonut
              data={donut}
              nameKey="name"
              valueKey="value"
              compact
              channel="whatsapp"
              center={{ value: num(totalIntent), label: "Motivos" }}
            />
          </ChartCard>
        </div>
        <div id="horario" className="scroll-mt-24">
          <ChartCard title="¿A qué hora escriben?" channel="whatsapp">
            <SimpleBar
              data={data.byHour}
              x="hour"
              y="conversations"
              yLabel="Conversaciones"
              compact
              channel="whatsapp"
              highlightX={peakHour?.hour}
            />
            {peakHour && (
              <PeakHour
                className="mt-3"
                hour={peakHour.hour}
                channel="whatsapp"
                caption="Más escriben"
                hint={`${num(peakHour.conversations)} conversaciones en esa hora`}
              />
            )}
          </ChartCard>
        </div>
      </div>

      <section id="recorrido" className="scroll-mt-24 rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <h2 className="font-serif text-lg">Conversaciones y conversiones registradas</h2>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <ChannelBadge channel="whatsapp" variant="plain" /> produce la conversación;
          <ChannelBadge channel="hub" variant="plain" /> la atribuye cuando hay vínculo con una reservación o un pedido.
        </p>
        <FunnelStrip
          className="mt-4"
          rate={{
            value: `${conversionRate}%`,
            label: "llega a una solicitud atribuida. WhatsApp no se trata como caja.",
          }}
          steps={[
            { label: "Conversación", value: data.funnel.conversacion, channel: "whatsapp" },
            ...data.observedStages
              .filter((s) => s.stage !== "conversion")
              .map((s) => ({
                label: ({ intent: "Intención", request: "Solicitud" } as Record<string, string>)[s.stage] ?? s.stage,
                value: s.count,
                channel: "whatsapp" as const,
              })),
            { label: "Atribuida", value: data.funnel.conversion, channel: "hub" },
          ]}
        />
      </section>

      <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <h2 className="font-serif text-lg">Plantillas enviadas en el periodo</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Estados observados de mensajes enviados en el periodo. Las respuestas requieren una marca explícita de respuesta.
        </p>
        <ShareBars
          className="mt-3"
          channel="whatsapp"
          items={data.templates.slice(0, 5).map((t) => ({
            label: t.name,
            value: t.read,
            secondary: `${num(t.sent)} enviados · ${num(t.replied)} respuesta`,
          }))}
        />
      </section>
    </div>
  );
}
