import { Link, useParams } from "react-router-dom";
import { ChannelBadge } from "@/components/channel-badge";
import { MetricTooltip } from "@/components/metric-tooltip";
import { PageIntro } from "@/components/page-intro";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import type { ChannelKey } from "@/lib/channel-config";
import { ago, mxn, num, when } from "@/lib/format";

interface Detail {
  displayName: string;
  channelsJson: string[] | null;
  lastSeenAt: string;
  reservationCount: number;
  attributedSpend: number;
  visitCount: number;
  segment: string;
  preferencesJson: { mesa?: string; momento?: string; dia?: string } | null;
  reservations: Array<{ id: string; reservedFor: string; partySize: number; status: string }>;
  orders: Array<{ id: string; orderedAt: string; amount: number; status: string }>;
}

const statusEs: Record<string, string> = {
  confirmed: "Confirmada",
  seated: "Sentada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No se presentaron",
};

const segmentLabel: Record<string, string> = {
  nuevos: "Nuevo",
  recurrentes: "Recurrente",
  frecuentes: "Frecuente",
  alto_valor: "Alto valor",
  inactivos: "Sin volver",
};

export default function ClienteDetalle() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi<Detail>(id ? `/api/customers/${id}` : null);
  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No encontrado" body="Este cliente no existe en el dataset demo." />;

  const prefs = data.preferencesJson
    ? [data.preferencesJson.mesa, data.preferencesJson.momento, data.preferencesJson.dia].filter(Boolean).join(" · ")
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/clientes" className="inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">
        ← Clientes identificados
      </Link>
      <PageIntro
        question="¿Qué sabemos de este cliente?"
        channel="hub"
        title={data.displayName}
        headline={segmentLabel[data.segment] ?? "Cliente identificable"}
        aside={
          <MetricTooltip label="Sobre esta ficha">
            Ejemplo demostrativo. La unificación real depende de identificadores, consentimiento y disponibilidad de datos.
          </MetricTooltip>
        }
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <span>Lo conocemos por</span>
        {(data.channelsJson ?? []).map((ch) => (
          <ChannelBadge key={ch} channel={ch} />
        ))}
      </div>

      <section>
        <h2 className="mb-2 font-serif text-lg">Ahora</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Stat channel="hub" label="Última visita" value={ago(data.lastSeenAt)} />
          <Stat channel="opentable" label="Reservaciones" value={num(data.reservationCount)} />
          <Stat channel="mips" label="Gasto atribuido" value={mxn(data.attributedSpend)} />
          <Stat channel="hub" label="Visitas identificadas" value={num(data.visitCount)} />
        </div>
      </section>

      {prefs && <p className="text-sm text-muted-foreground">Prefiere {prefs}.</p>}

      <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <h2 className="flex items-center gap-2 font-serif text-lg">
          <ChannelBadge channel="opentable" size="sm" />
          Reservaciones recientes
        </h2>
        {data.reservations?.length ? (
          <ul className="mt-2 divide-y text-sm">
            {data.reservations.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {when(r.reservedFor)} · {num(r.partySize)} personas
                </span>
                <span className="text-muted-foreground">{statusEs[r.status] ?? r.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Sin reservaciones recientes.</p>
        )}
      </section>

      {data.orders?.length > 0 && (
        <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
          <h2 className="flex items-center gap-2 font-serif text-lg">
            <ChannelBadge channel="uber" size="sm" />
            Pedidos recientes
          </h2>
          <ul className="mt-2 divide-y text-sm">
            {data.orders.slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                <span>{when(o.orderedAt)}</span>
                <span className="tabular">{mxn(o.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ channel, label, value }: { channel?: ChannelKey; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
      {channel && (
        <div className="mb-1.5">
          <ChannelBadge channel={channel} size="sm" />
        </div>
      )}
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl tabular leading-tight">{value}</p>
    </div>
  );
}
