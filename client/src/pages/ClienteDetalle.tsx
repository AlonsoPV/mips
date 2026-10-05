import { useParams } from "react-router-dom";
import { ChannelChip } from "@/components/channel-chip";
import { Disclaimer, EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { ago, mxn, when } from "@/lib/format";

export default function ClienteDetalle() {
  const { id } = useParams();
  const { data, loading, error } = useApi<any>(id ? `/api/customers/${id}` : null);
  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} />;
  if (!data) return <EmptyState title="No encontrado" body="Este cliente no existe en el dataset demo." />;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-serif text-3xl">{data.displayName}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {(data.channelsJson ?? []).map((ch: string) => (
            <ChannelChip key={ch} channel={ch} />
          ))}
        </div>
      </header>
      <Disclaimer>Ejemplo demostrativo. La unificación real depende de identificadores, consentimiento y disponibilidad de datos.</Disclaimer>
      <dl className="grid gap-4 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Última visita</dt>
          <dd>{ago(data.lastSeenAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Reservaciones</dt>
          <dd>{data.reservationCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Gasto atribuido</dt>
          <dd>{mxn(data.attributedSpend)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Preferencias</dt>
          <dd>
            {data.preferencesJson
              ? `${data.preferencesJson.mesa} · ${data.preferencesJson.momento} · ${data.preferencesJson.dia}`
              : "—"}
          </dd>
        </div>
      </dl>
      <section>
        <h2 className="font-serif text-xl">Reservaciones recientes</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(data.reservations ?? []).map((r: any) => (
            <li key={r.id}>
              {when(r.reservedFor)} · {r.partySize} personas · {r.status}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
