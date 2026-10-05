import { Link, useParams } from "react-router-dom";
import { SimpleBar, SimpleLine } from "@/components/charts";
import { Heatmap } from "@/components/heatmap";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { usePeriod } from "@/hooks/use-period";
import { exportUrl } from "@/lib/api";
import { formatKpi, mxn, num } from "@/lib/format";

const REPORTS = [
  { id: "ejecutivo", title: "Resumen ejecutivo", body: "KPIs del restaurante en el periodo." },
  { id: "uber", title: "Desempeño de Uber Eats", body: "Pedidos, ventas confirmadas y productos." },
  { id: "opentable", title: "Reservaciones OpenTable", body: "Demanda de mesa y estados." },
  { id: "whatsapp", title: "Actividad WhatsApp", body: "Motivos de contacto y conversaciones." },
  { id: "demanda", title: "Demanda por día y hora", body: "Concentración digital combinada." },
  { id: "productos", title: "Productos", body: "Mix, ticket y crecimiento." },
  { id: "clientes", title: "Clientes", body: "Segmentos identificables del Hub." },
  { id: "conciliacion", title: "Conciliación Hub vs Míps", body: "Eventos, folios y estados." },
];

export default function Reportes() {
  const { id } = useParams();
  if (!id) {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <h1 className="font-serif text-3xl md:text-4xl">Reportes</h1>
          <p className="mt-2 text-muted-foreground">Biblioteca para bajar al detalle y exportar CSV.</p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {REPORTS.map((r) => (
            <Link key={r.id} to={`/reportes/${r.id}`} className="rounded-xl border bg-card p-6 shadow-soft hover:border-primary/40">
              <h2 className="font-serif text-xl">{r.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }
  return <ReportDetail id={id} />;
}

function ReportDetail({ id }: { id: string }) {
  const { qs } = usePeriod();
  const meta = REPORTS.find((r) => r.id === id);
  const { data, loading, error, reload } = useApi<any>(`/api/reports/${id}${qs}`);
  if (loading) return <PageLoading />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Sin datos" body="Este reporte no tiene filas en el periodo." />;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/reportes" className="text-sm text-primary hover:underline">
            Biblioteca
          </Link>
          <h1 className="mt-2 font-serif text-3xl">{meta?.title ?? id}</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href={exportUrl(id, qs)}>Exportar CSV</a>
          </Button>
          <Button asChild>
            <a href={exportUrl(id, qs)}>Descargar reporte</a>
          </Button>
        </div>
      </header>
      <ReportBody id={id} data={data} />
    </div>
  );
}

function ReportBody({ id, data }: { id: string; data: any }) {
  if (id === "demanda") {
    return (
      <div className="rounded-xl border bg-card p-6">
        <Heatmap cells={data.cells} />
      </div>
    );
  }
  if (data.kpis) {
    return (
      <div className="space-y-8">
        <div className="grid gap-6 sm:grid-cols-2">
          {data.kpis.map((k: any) => (
            <div key={k.label}>
              <p className="text-sm text-muted-foreground">{k.label}</p>
              <p className="font-serif text-3xl">{formatKpi(k.value, k.unit)}</p>
            </div>
          ))}
        </div>
        {data.byDay && (
          <div className="rounded-xl border bg-card p-6">
            {data.byDay[0]?.sales !== undefined ? (
              <SimpleLine data={data.byDay.map((d: any) => ({ ...d, ventas: d.sales / 100 }))} x="day" y="ventas" />
            ) : (
              <SimpleBar data={data.byDay} x="day" y={data.byDay[0]?.reservations !== undefined ? "reservations" : "orders"} />
            )}
          </div>
        )}
        {data.topProducts && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Ventas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topProducts.slice(0, 15).map((p: any) => (
                <TableRow key={p.name}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{mxn(p.sales)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data.sample && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Gasto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sample.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.displayName}</TableCell>
                  <TableCell>{c.segment}</TableCell>
                  <TableCell>{mxn(c.attributedSpend)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data.intents && (
          <ul className="space-y-2 text-sm">
            {data.intents.map((i: any) => (
              <li key={i.intent} className="flex justify-between">
                <span>{i.intent}</span>
                <span>{num(i.count)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  if (data.recent) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Canal</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Folio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.recent.map((e: any) => (
            <TableRow key={e.id}>
              <TableCell>{e.channel}</TableCell>
              <TableCell>{e.externalId}</TableCell>
              <TableCell>{e.eventStatus}</TableCell>
              <TableCell>{e.mipsFolio ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
  return <pre className="overflow-auto rounded-xl border bg-card p-4 text-xs">{JSON.stringify(data, null, 2)}</pre>;
}
