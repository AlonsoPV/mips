import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/use-api";
import { Button } from "./ui/button";
import { mxn } from "@/lib/format";
interface Page { rows: { id: string; displayName: string; segment: string; attributedSpend: number }[]; total: number; nextOffset: number | null }
export function CustomerDirectory() {
 const [offset, setOffset] = useState(0);
 const { data, loading, error, reload } = useApi<Page>(`/api/customers?offset=${offset}`);
 return <section className="rounded-lg border bg-card p-4 shadow-soft">
  <div className="flex flex-wrap justify-between gap-2"><h2 className="font-serif text-lg">Directorio completo</h2><a href="/api/export/clientes" className="text-sm text-primary">Descargar todos en CSV</a></div>
  {error ? <div role="alert">{error}<Button onClick={() => void reload()}>Reintentar</Button></div> : loading ? <p role="status">Cargando clientes…</p> : <>
   <p className="my-2 text-sm text-muted-foreground">{data?.total ?? 0} clientes · historial acumulado</p>
   <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Cliente</th><th>Segmento</th><th>Gasto atribuido</th></tr></thead><tbody>{data?.rows.map(row => <tr key={row.id} className="border-t"><td className="py-2"><Link className="text-primary" to={`/clientes/${row.id}`}>{row.displayName}</Link></td><td>{row.segment}</td><td>{mxn(row.attributedSpend)}</td></tr>)}</tbody></table></div>
  </>}
  <div className="mt-3 flex items-center gap-3"><Button variant="outline" disabled={loading || !offset} onClick={() => setOffset(n => Math.max(0, n - 100))}>Anterior</Button><span className="text-sm">Página {Math.floor(offset / 100) + 1}</span><Button variant="outline" disabled={loading || data?.nextOffset == null} onClick={() => setOffset(data!.nextOffset!)}>Siguiente</Button></div>
 </section>;
}
