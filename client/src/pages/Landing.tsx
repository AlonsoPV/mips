import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <p className="font-serif text-2xl">Míps Connect</p>
        <p className="text-xs text-muted-foreground">Demo · Datos simulados</p>
      </header>
      <main className="mx-auto grid max-w-6xl gap-16 px-6 pb-24 pt-8 lg:grid-cols-[1.2fr_0.8fr] lg:pt-16">
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
          <p className="mt-10 max-w-lg text-sm text-muted-foreground">
            Un Hub. Tres canales. Una operación más conectada. Uber Eats, OpenTable y WhatsApp Business, con impacto en Míps.
          </p>
        </section>
        <section className="rounded-2xl border bg-card p-8 shadow-soft">
          <h2 className="font-serif text-2xl">Qué vas a ver</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sin cuentas ni contraseñas. Entra y entiende el restaurante en segundos.</p>
          <ul className="mt-6 space-y-4 text-sm leading-relaxed">
            <li>
              <span className="font-medium">Hoy</span>
              <p className="text-muted-foreground">Ventas digitales, reservaciones y lo que debes saber.</p>
            </li>
            <li>
              <span className="font-medium">Los tres canales</span>
              <p className="text-muted-foreground">Uber Eats, OpenTable y WhatsApp, cada uno con su métrica real.</p>
            </li>
            <li>
              <span className="font-medium">El Hub</span>
              <p className="text-muted-foreground">Cómo llega cada evento a Míps y si hay algo que atender.</p>
            </li>
          </ul>
          <Button className="mt-8 w-full" size="lg" asChild>
            <Link to="/inicio">Entrar al restaurante demo</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
