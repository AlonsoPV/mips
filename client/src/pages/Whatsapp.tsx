import { ChannelChip } from "@/components/channel-chip";
import { SimpleBar, SimpleDonut } from "@/components/charts";
import { KpiStat } from "@/components/kpi-stat";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Disclaimer, EmptyState, PageError, PageLoading } from "@/components/states";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

export default function Whatsapp() {
  const { qs } = usePeriod();
  const { data, loading, error, reload } = useApi<WA>(`/api/whatsapp/summary${qs}`);
  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin conversaciones" body="No hay actividad de WhatsApp en este periodo." />;

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <header>
        <ChannelChip channel="whatsapp" />
        <h1 className="mt-3 font-serif text-3xl md:text-4xl">WhatsApp Business</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Conversaciones, no ventas. Solo se marca conversión cuando hay una relación explícita con una solicitud.
        </p>
      </header>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="cursor-help text-xs text-muted-foreground underline decoration-dotted">{data.disclaimer}</p>
        </TooltipTrigger>
        <TooltipContent>{data.disclaimer}</TooltipContent>
      </Tooltip>
      <section className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        {data.kpis.map((k) => (
          <KpiStat key={k.label} kpi={k} />
        ))}
      </section>
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-serif text-xl">Motivos de contacto</h2>
          <SimpleDonut data={data.intents.map((i) => ({ name: intentEs[i.intent] ?? i.intent, value: i.count }))} nameKey="name" valueKey="value" />
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-serif text-xl">Conversaciones por hora</h2>
          <SimpleBar data={data.byHour} x="hour" y="conversations" yLabel="Conversaciones" />
        </div>
      </section>
      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-serif text-xl">Funnel</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            ["Conversación", data.funnel.conversacion],
            ["Intención", data.funnel.intencion],
            ["Solicitud", data.funnel.solicitud],
            ["Conversión atribuida", data.funnel.conversion],
          ].map(([label, value]) => (
            <li key={String(label)}>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="font-serif text-3xl tabular">{num(Number(value))}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-serif text-xl">Plantillas</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Enviados</TableHead>
              <TableHead>Entregados</TableHead>
              <TableHead>Leídos</TableHead>
              <TableHead>Respuesta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.templates.map((t) => (
              <TableRow key={t.name}>
                <TableCell>{t.name}</TableCell>
                <TableCell>{num(t.sent)}</TableCell>
                <TableCell>{num(t.delivered)}</TableCell>
                <TableCell>{num(t.read)}</TableCell>
                <TableCell>{num(t.replied)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      <Disclaimer>{data.disclaimer}</Disclaimer>
    </div>
  );
}
