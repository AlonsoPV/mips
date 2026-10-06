import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { HealthStatus } from "@/components/health-status";
import { KpiCard } from "@/components/kpi-card";
import { PageIntro } from "@/components/page-intro";
import { PriorityCard } from "@/components/priority-card";
import { StatusIndicator, integrationLabel, integrationLevel } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { Disclaimer, EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { num } from "@/lib/format";
import type { KpiValue } from "@shared/types";

interface Health {
  processed: number;
  pending: number;
  failed: number;
  lastSyncAgoSeconds: number;
  integrations: Record<
    string,
    { status: string; lastEventAt: string | null; message: string; today: number }
  >;
}

const CHANNELS = [
  { key: "uber_eats", to: "/ventas", metric: "Pedidos" },
  { key: "opentable", to: "/reservaciones", metric: "Reservaciones" },
  { key: "whatsapp", to: "/whatsapp", metric: "Conversaciones" },
  { key: "mips", to: "/reportes/conciliacion", metric: "Confirmados" },
] as const;

const CHANNEL_NAME: Record<string, string> = {
  uber_eats: "Uber Eats",
  opentable: "OpenTable",
  whatsapp: "WhatsApp",
  mips: "Míps",
};

function kpi(label: string, tooltip: string, value: number): KpiValue {
  return { label, tooltip, value, previousValue: value, deltaPct: 0, unit: "count" };
}

export default function Configuracion() {
  const health = useApi<Health>("/api/hub/health");
  const flags = useApi<{ allowReseed: boolean }>("/api/demo/flags");
  const me = useApi<{ user: { restaurantName: string } }>("/api/auth/me");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const data = health.data;
  const channelsOk = useMemo(() => {
    if (!data) return 0;
    return CHANNELS.filter((c) => integrationLevel(data.integrations[c.key]?.status) === "ok").length;
  }, [data]);

  if (health.loading || flags.loading) return <PageLoading />;
  if (health.error) return <PageError message={health.error} onRetry={health.reload} />;
  if (!data) return <EmptyState title="Sin configuración" body="El Hub no ha cargado este restaurante todavía." />;

  const restaurantName = me.data?.user.restaurantName ?? "Restaurante Demo";
  const issues = data.pending + data.failed;
  const down = CHANNELS.map((c) => ({ ...c, info: data.integrations[c.key] })).filter(
    (c) => c.info && integrationLevel(c.info.status) !== "ok",
  );

  const headline =
    issues > 0
      ? `Hay ${issues} ${issues === 1 ? "situación que requiere" : "situaciones que requieren"} atención.`
      : down.length > 0
        ? "Los canales están conectados, pero no todos operan del todo."
        : "El Hub está listo para este restaurante.";

  const kpis: { kpi: KpiValue; to: string }[] = [
    {
      kpi: kpi("Canales conectados", "Uber Eats, OpenTable, WhatsApp y Míps en este restaurante.", CHANNELS.length),
      to: "#canales",
    },
    {
      kpi: kpi("Canales operativos", "Canales que están entregando información sin bloqueo.", channelsOk),
      to: "#canales",
    },
    {
      kpi: kpi("Pendientes", "Siguen en el Hub y todavía no se confirman en Míps.", data.pending),
      to: "/salud#eventos",
    },
    {
      kpi: kpi("Necesitan atención", "Eventos que fallaron o no se pudieron confirmar en Míps.", data.failed),
      to: "/salud#eventos",
    },
  ];

  const priorities = [];
  if (data.failed > 0) {
    priorities.push({
      tone: "critical" as const,
      title: `${data.failed} ${data.failed === 1 ? "evento necesita" : "eventos necesitan"} atención`,
      description: "No llegaron limpios a Míps. La salud del Hub los tiene identificados.",
      ctaLabel: "Ver salud",
      to: "/salud#eventos",
    });
  }
  if (data.pending > 0) {
    priorities.push({
      tone: "attention" as const,
      title: `${data.pending} ${data.pending === 1 ? "pendiente" : "pendientes"} en cola`,
      description: "Siguen en el Hub. Todavía no hay folio de Míps.",
      ctaLabel: "Ver cola",
      to: "/salud#eventos",
    });
  }
  for (const c of down) {
    if (priorities.length >= 3) break;
    priorities.push({
      tone: (integrationLevel(c.info.status) === "critical" ? "critical" : "attention") as "critical" | "attention",
      title: `${CHANNEL_NAME[c.key] ?? c.key} no está del todo operativo`,
      description: c.info.message || "Hay que revisar este canal.",
      ctaLabel: "Ver canal",
      to: c.to,
    });
  }
  if (priorities.length < 3) {
    priorities.push({
      tone: "info" as const,
      title: "Estás viendo datos simulados",
      description: "Toda la app corre con un restaurante demo. Se puede regenerar el dataset desde aquí.",
      ctaLabel: "Ver datos demo",
      to: "#demo",
    });
  }
  if (priorities.length === 0) {
    priorities.push({
      tone: "info" as const,
      title: "Nada que configurar ahora",
      description: "Los cuatro canales están conectados y el restaurante puede operar.",
      ctaLabel: "Ver Hub",
      to: "/hub",
    });
  }

  async function reseed() {
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/demo/reseed", { method: "POST" });
      setMsg("Los datos demo se regeneraron. Recarga las pantallas para ver el restaurante de nuevo.");
      void health.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No se pudieron regenerar los datos");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageIntro
        question="¿Está listo el Hub para este restaurante?"
        title="Configuración"
        headline={headline}
        aside={<p className="text-[11px] text-muted-foreground">En vivo · hace {data.lastSyncAgoSeconds} s</p>}
      />

      <HealthStatus
        integrations={data.integrations}
        lastSyncAgoSeconds={data.lastSyncAgoSeconds}
        pending={data.pending}
        failed={data.failed}
      />

      <section>
        <h2 className="mb-2 font-serif text-lg">Este restaurante ahora</h2>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {kpis.map((item) => (
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

      <section id="canales" className="scroll-mt-24 rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <h2 className="font-serif text-lg">Qué está conectado</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Uber Eats, OpenTable, WhatsApp y Míps alimentan este restaurante. Si un canal no opera, se siente en pedidos, mesas o
          conversaciones.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {CHANNELS.map((c) => {
            const info = data.integrations[c.key];
            const level = integrationLevel(info?.status);
            return (
              <Link
                key={c.key}
                to={c.to}
                className="flex items-center justify-between gap-3 rounded-md bg-muted/70 px-3 py-2.5 hover:bg-accent"
              >
                <span>
                  <ChannelBadge channel={c.key} />
                  <span className="mt-1 block">
                    <StatusIndicator level={level} label={integrationLabel(info?.status)} compact />
                  </span>
                  {info?.message && <span className="mt-0.5 block text-[11px] text-muted-foreground">{info.message}</span>}
                </span>
                <span className="text-right">
                  <span className="block font-serif text-2xl tabular leading-none">{num(info?.today ?? 0)}</span>
                  <span className="text-[11px] text-muted-foreground">{c.metric} hoy</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="demo" className="scroll-mt-24 rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <h2 className="font-serif text-lg">Este restaurante</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-muted/70 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Nombre</p>
            <p className="mt-1 font-serif text-xl leading-tight">{restaurantName}</p>
            <p className="mt-1 text-xs text-muted-foreground">Demo · Datos simulados</p>
          </div>
          <div className="rounded-md bg-muted/70 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Canales</p>
            <p className="mt-1 font-serif text-xl leading-tight">
              {channelsOk} de {CHANNELS.length} operativos
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Los cuatro están conectados a este Hub.</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Los números de la app son simulados para esta demostración. Regenerar arma de nuevo el mismo restaurante demo.
          </p>
          {flags.data?.allowReseed ? (
            <Button className="mt-3" onClick={() => void reseed()} disabled={busy}>
              {busy ? "Regenerando…" : "Regenerar datos demo"}
            </Button>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">En este entorno no se pueden regenerar los datos.</p>
          )}
          {msg && <p className="mt-3 text-sm">{msg}</p>}
        </div>
      </section>

      <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-lg">Si algo no opera</h2>
          <Link to="/salud" className="text-sm font-medium text-primary hover:underline">
            Ver salud del Hub →
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          La configuración dice qué está conectado. La salud del Hub dice qué hay que atender ahora.
        </p>
      </section>

      <Disclaimer>
        Los canales reales se conectan con acceso autorizado. Esta demo no llama a Uber Eats, OpenTable ni WhatsApp.
      </Disclaimer>
    </div>
  );
}
