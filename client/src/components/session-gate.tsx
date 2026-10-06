import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "./app-shell";
import { PageLoading } from "./states";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { api, ApiError } from "@/lib/api";
interface Session { mode: "demo" | "live"; restaurantName: string; role: string }
export function SessionGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setLoading(true);
    try { setSession(await api<Session>("/api/auth/me")); setError(null); }
    catch (e) { setSession(null); if (!(e instanceof ApiError && e.status === 401)) setError(e instanceof Error ? e.message : "No se pudo cargar la sesión"); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void load();
    const expired = () => setSession(null);
    window.addEventListener("mips:unauthorized", expired);
    return () => window.removeEventListener("mips:unauthorized", expired);
  }, []);
  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try { await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); setPassword(""); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo iniciar sesión"); }
    finally { setBusy(false); }
  }
  if (loading) return <PageLoading />;
  if (session) return <AppShell restaurantName={session.restaurantName} mode={session.mode} onLogout={async () => { try { await api("/api/auth/logout", { method: "POST" }); setSession(null); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cerrar sesión"); } }} />;
  return <main className="mx-auto max-w-md px-6 py-16">
    <h1 className="font-serif text-3xl">Accede a tu restaurante</h1>
    <form onSubmit={event => void login(event)} className="mt-6 space-y-4">
      <label className="block text-sm">Correo<Input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="block text-sm">Contraseña<Input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</Button>
    </form>
  </main>;
}
