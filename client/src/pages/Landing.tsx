import { ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";
import { ChannelIcon } from "@/components/channel-icon";
import { Button } from "@/components/ui/button";
import { SOURCE_CHANNELS, channelConfig, type ChannelKey } from "@/lib/channel-config";
import { cn } from "@/lib/utils";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <p className="flex items-center gap-2 font-serif text-2xl">
          <ChannelIcon channel="hub" size="md" ring />
          Míps Connect
        </p>
        <p className="text-xs text-muted-foreground">Demo · Datos simulados</p>
      </header>
      <main className="mx-auto grid max-w-6xl gap-16 px-6 pb-24 pt-8 lg:grid-cols-[1.15fr_0.85fr] lg:pt-16">
        <section>
          <p className="text-sm uppercase tracking-[0.2em] text-primary">Míps Connect</p>
          <h1 className="mt-4 max-w-xl font-serif text-4xl leading-tight md:text-5xl">
            Tu Hub digital para conectar operación, canales y datos.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Hoy tu restaurante no necesita más plataformas. Necesita que las que ya utiliza trabajen juntas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/inicio">Explorar mi operación</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/hub">Ver cómo funciona el Hub</Link>
            </Button>
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-6 shadow-soft sm:p-8">
          <h2 className="font-serif text-2xl">Qué vas a ver</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sin cuentas ni contraseñas. Entra y entiende el restaurante en segundos.
          </p>

          <div className="mt-6 space-y-2" aria-label="Fuentes, Hub y destino">
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

          <Button className="mt-7 w-full" size="lg" asChild>
            <Link to="/inicio">Entrar al restaurante demo</Link>
          </Button>
        </section>
      </main>
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
        <span className="shrink-0 text-[11px] text-[#C5D3E8]">{unitLabel(cfg.unit.plural)}</span>
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
      <span className="shrink-0 text-[11px] text-muted-foreground">{unitLabel(cfg.unit.plural)}</span>
    </div>
  );
}

function unitLabel(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-0.5" aria-hidden>
      <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/70" />
    </div>
  );
}
