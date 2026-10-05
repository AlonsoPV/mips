import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Disclaimer, PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";

export default function Configuracion() {
  const flags = useApi<{ allowReseed: boolean }>("/api/demo/flags");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (flags.loading) return <PageLoading />;
  if (flags.error) return <PageError message={flags.error} onRetry={flags.reload} />;

  async function reseed() {
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/demo/reseed", { method: "POST" });
      setMsg("Datos demo regenerados. Recarga las pantallas para ver el dataset fresco.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No se pudo regenerar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-serif text-3xl">Configuración</h1>
        <p className="mt-2 text-muted-foreground">Restaurante Demo. Esta fase no incluye administración compleja de usuarios.</p>
      </header>
      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-serif text-xl">Demo</h2>
        <p className="mt-2 text-sm text-muted-foreground">Indicador visible en toda la app: Demo · Datos simulados.</p>
        {flags.data?.allowReseed ? (
          <Button className="mt-4" onClick={() => void reseed()} disabled={busy}>
            {busy ? "Regenerando…" : "Regenerar datos demo"}
          </Button>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">La regeneración está deshabilitada en este entorno.</p>
        )}
        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </section>
      <Disclaimer>
        Sustituir dummy data por APIs reales se documenta en docs/INTEGRATIONS.md. No hay scraping ni APIs fingidas.
      </Disclaimer>
    </div>
  );
}
