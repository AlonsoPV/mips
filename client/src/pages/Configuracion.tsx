import { ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";
import { BigNumber } from "@/components/big-number";
import { ChannelIcon } from "@/components/channel-icon";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { PageError, PageLoading } from "@/components/states";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { SOURCE_CHANNELS, channelConfig, type ChannelKey } from "@/lib/channel-config";
import { cn } from "@/lib/utils";
import { useState } from "react";

const SOURCES: { channel: ChannelKey; scope: string; requirement: string; to: string }[] = [
  { channel: "uber", scope: "Pedidos y productos", requirement: "Acceso autorizado a pedidos del restaurante", to: "/ventas" },
  { channel: "opentable", scope: "Reservaciones y comensales", requirement: "Acceso autorizado a reservaciones", to: "/reservaciones" },
  { channel: "whatsapp", scope: "Conversaciones y estados de mensajes", requirement: "Cuenta Business y permisos de mensajería", to: "/whatsapp" },
  { channel: "mips", scope: "Ventas y folios del POS", requirement: "Conector con confirmación de registro en Míps", to: "/salud" },
];

export default function Configuracion() {
  const flags = useApi<{ allowReseed: boolean }>("/api/demo/flags");
  const context = useApi<{ mode: string; restaurantName: string }>("/api/demo/context");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (flags.loading || context.loading) return <PageLoading />;
  if (flags.error || context.error) {
    return (
      <PageError
        message={flags.error || context.error!}
        onRetry={() => {
          void flags.reload();
          void context.reload();
        }}
      />
    );
  }

  async function reseed() {
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/demo/reseed", { method: "POST" });
      setMessage("Datos demo regenerados. Las vistas cargarán el nuevo dataset al abrirlas.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron regenerar los datos.");
    } finally {
      setBusy(false);
    }
  }

  const demo = context.data?.mode === "demo";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageIntro
        question="¿De dónde vendría la información?"
        channel="hub"
        title="Integraciones"
        headline={
          demo
            ? "Cuatro canales simulados. Ninguna cuenta externa está conectada."
            : "Los conectores autorizados envían datos y confirman su estado en Salud."
        }
      />

      <div className="grid gap-2.5 sm:grid-cols-2">
        <BigNumber channel="hub" value="4" label="Canales" hint="Tres fuentes y un destino" />
        <BigNumber channel="mips" value={demo ? "Demo" : "Live"} label="Modo" hint={context.data?.restaurantName} />
      </div>

      <section className="rounded-lg border bg-card px-4 py-3.5 shadow-soft">
        <h2 className="font-serif text-lg">Cómo viajaría la información</h2>
        <p className="mt-1 text-xs text-muted-foreground">Fuentes → Hub → Míps POS. Aquí se ve el mapa; en Salud se ve si opera.</p>
        <div className="mt-4 space-y-2" aria-label="Fuentes, Hub y destino">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Fuentes</p>
          {SOURCE_CHANNELS.map((c) => (
            <FlowRow key={c} channel={c} />
          ))}
          <FlowArrow />
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Hub</p>
          <FlowRow channel="hub" emphasis />
          <FlowArrow />
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Destino</p>
          <FlowRow channel="mips" destination />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 shadow-soft">
        <h2 className="font-serif text-lg">Fuentes y requisitos</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {SOURCES.map((source) => (
            <Link
              key={source.channel}
              to={source.to}
              className="rounded-md border-l-2 bg-muted/60 px-3 py-3 hover:bg-accent"
              style={{ borderLeftColor: channelConfig[source.channel].hex }}
            >
              <span className="flex items-center gap-2">
                <ChannelIcon channel={source.channel} size="md" ring />
                <span className={cn("text-sm font-medium", channelConfig[source.channel].accent)}>
                  {channelConfig[source.channel].label}
                </span>
              </span>
              <p className="mt-2 font-serif text-lg leading-snug">{source.scope}</p>
              <p className="mt-1 text-sm text-muted-foreground">{source.requirement} para conectar datos reales.</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="demo" className="scroll-mt-24 rounded-lg border bg-card p-4 shadow-soft">
        <h2 className="font-serif text-lg">{context.data?.restaurantName ?? "Restaurante Demo"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {demo ? "Demostración abierta, con datos simulados." : "Acceso autenticado y limitado a este restaurante."}
        </p>
        {flags.data?.allowReseed ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Regenerar reemplaza los registros actuales de la demo.</p>
            <Button className="mt-3" onClick={() => void reseed()} disabled={busy}>
              {busy ? "Regenerando…" : "Regenerar datos demo"}
            </Button>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">La regeneración está deshabilitada en este entorno.</p>
        )}
        {message && (
          <p role="status" className="mt-3 text-sm">
            {message}
          </p>
        )}
      </section>
      <Link to="/salud" className="inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">
        Revisar incidencias de la demo →
      </Link>
    </div>
  );
}

function FlowRow({
  channel,
  emphasis,
  destination,
}: {
  channel: ChannelKey;
  emphasis?: boolean;
  destination?: boolean;
}) {
  const cfg = channelConfig[channel];
  if (destination) {
    return (
      <div className="flex items-center gap-3 rounded-md bg-channel-mips px-3 py-3 text-[#F3F6FB]">
        <ChannelIcon channel={channel} size="md" onDark />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-tight">{cfg.label}</span>
          <span className="mt-0.5 block text-[11px] text-[#C5D3E8]">{cfg.describes}</span>
        </span>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5",
        emphasis ? cn("border", cfg.softBackground, cfg.border) : "border-l-2 bg-muted/60",
      )}
      style={emphasis ? undefined : { borderLeftColor: cfg.hex }}
    >
      <ChannelIcon channel={channel} size="md" ring />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-medium leading-tight", cfg.accent)}>{cfg.label}</span>
        <span className="block text-[11px] text-muted-foreground">{cfg.describes}</span>
      </span>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-0.5" aria-hidden>
      <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/70" />
    </div>
  );
}
