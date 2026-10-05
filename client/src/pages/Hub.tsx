import { Link } from "react-router-dom";
import { ChannelChip } from "@/components/channel-chip";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { hourMin, num } from "@/lib/format";

interface Hub {
  pending: number;
  failed: number;
  lastSyncAgoSeconds: number;
  integrations: Record<
    string,
    { status: string; lastEventAt: string | null; message: string; today: number }
  >;
  recent: Array<{
    occurredAt: string;
    channel: string;
    eventType: string;
    externalId: string;
    eventStatus: string;
    mipsFolio: string | null;
  }>;
}

const nodes = [
  { key: "uber_eats", to: "/ventas", label: "Uber Eats" },
  { key: "opentable", to: "/reservaciones", label: "OpenTable" },
  { key: "whatsapp", to: "/whatsapp", label: "WhatsApp" },
  { key: "mips", to: "/salud", label: "Míps POS" },
];

const statusTone: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  connected: "success",
  attention: "warning",
  error: "danger",
  idle: "neutral",
};
const statusLabel: Record<string, string> = {
  connected: "Conectado",
  attention: "Atención",
  error: "Error",
  idle: "Sin actividad",
};
const typeLabel: Record<string, string> = {
  order: "Pedido",
  reservation: "Reservación",
  conversation: "Conversación",
  sale: "Venta",
};

export default function Hub() {
  const { data, loading, error, reload } = useApi<Hub>("/api/hub/health");
  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin eventos" body="El Hub todavía no ha procesado actividad." />;

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <header className="max-w-2xl">
        <h1 className="font-serif text-3xl md:text-4xl">El Hub conecta lo que ya usas</h1>
        <p className="mt-3 text-muted-foreground">
          Uber Eats, OpenTable y WhatsApp entran a Míps Connect. Lo que genera venta se confirma en Míps POS. Lo demás se observa sin forzar un folio.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {nodes.slice(0, 3).map((n) => {
          const info = data.integrations[n.key];
          return (
            <Link key={n.key} to={n.to} className="rounded-xl border bg-card p-5 shadow-soft">
              <ChannelChip channel={n.key} />
              <div className="mt-3 flex items-center justify-between">
                <Badge tone={statusTone[info?.status ?? "idle"]}>{statusLabel[info?.status ?? "idle"]}</Badge>
                <span className="text-xs text-muted-foreground">{num(info?.today ?? 0)} hoy</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{info?.message}</p>
            </Link>
          );
        })}
      </section>

      <div className="flex justify-center text-sm text-muted-foreground">↓ Míps Connect ↓</div>

      <section className="rounded-xl border bg-card p-6 text-center shadow-soft">
        <p className="font-serif text-2xl">Míps Connect</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.pending} pendientes · {data.failed} errores · última sincronización hace {data.lastSyncAgoSeconds} segundos
        </p>
      </section>

      <div className="flex justify-center text-sm text-muted-foreground">↓</div>

      <Link to="/salud" className="block rounded-xl border bg-card p-5 shadow-soft">
        <ChannelChip channel="mips" />
        <div className="mt-3 flex items-center justify-between">
          <Badge tone={statusTone[data.integrations.mips?.status ?? "connected"]}>
            {statusLabel[data.integrations.mips?.status ?? "connected"]}
          </Badge>
          <span className="text-xs text-muted-foreground">{num(data.integrations.mips?.today ?? 0)} hoy</span>
        </div>
      </Link>

      <section>
        <h2 className="font-serif text-2xl">Flujo reciente</h2>
        <div className="mt-4 rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Míps Folio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent.map((e) => (
                <TableRow key={e.externalId + e.occurredAt}>
                  <TableCell>{hourMin(e.occurredAt)}</TableCell>
                  <TableCell>
                    <ChannelChip channel={e.channel} />
                  </TableCell>
                  <TableCell>{typeLabel[e.eventType] ?? e.eventType}</TableCell>
                  <TableCell className="tabular">{e.externalId}</TableCell>
                  <TableCell>{e.eventStatus}</TableCell>
                  <TableCell className="tabular">{e.mipsFolio ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
