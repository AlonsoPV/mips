import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export default function Landing() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@mipsconnect.mx");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      navigate("/inicio");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
    } finally {
      setLoading(false);
    }
  }

  async function enter(path: string) {
    setLoading(true);
    setError(null);
    try {
      if (!password) {
        setError("Escribe la contraseña demo para continuar.");
        return;
      }
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      navigate(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
    } finally {
      setLoading(false);
    }
  }

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
            <Button size="lg" onClick={() => void enter("/inicio")} disabled={loading}>
              Explorar mi operación
            </Button>
            <Button size="lg" variant="outline" onClick={() => void enter("/hub")} disabled={loading}>
              Ver cómo funciona el Hub
            </Button>
          </div>
          <p className="mt-10 max-w-lg text-sm text-muted-foreground">
            Un Hub. Tres canales. Una operación más conectada. Uber Eats, OpenTable y WhatsApp Business, con impacto en Míps.
          </p>
        </section>
        <section className="rounded-2xl border bg-card p-8 shadow-soft">
          <h2 className="font-serif text-2xl">Entrar a la demo</h2>
          <p className="mt-2 text-sm text-muted-foreground">Usuario de demostración. La contraseña nunca viaja en el frontend embebida.</p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            {error && <p className="text-sm text-merlot">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando…" : "Continuar"}
            </Button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground">
            Usuario: demo@mipsconnect.mx · La contraseña está en las variables de entorno (DEMO_PASSWORD).
          </p>
          <Link to="/inicio" className="mt-4 inline-block text-sm text-primary hover:underline">
            Ya tengo sesión
          </Link>
        </section>
      </main>
    </div>
  );
}
