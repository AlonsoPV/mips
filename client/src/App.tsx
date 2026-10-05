import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/app-shell";
import { PageLoading } from "@/components/states";
import { api } from "@/lib/api";
import Landing from "@/pages/Landing";

const Home = lazy(() => import("@/pages/Home"));
const Hub = lazy(() => import("@/pages/Hub"));
const Ventas = lazy(() => import("@/pages/Ventas"));
const Reservaciones = lazy(() => import("@/pages/Reservaciones"));
const Whatsapp = lazy(() => import("@/pages/Whatsapp"));
const Clientes = lazy(() => import("@/pages/Clientes"));
const ClienteDetalle = lazy(() => import("@/pages/ClienteDetalle"));
const Marketing = lazy(() => import("@/pages/Marketing"));
const Reportes = lazy(() => import("@/pages/Reportes"));
const Salud = lazy(() => import("@/pages/Salud"));
const Configuracion = lazy(() => import("@/pages/Configuracion"));

interface Me {
  user: { email: string; restaurantName: string } | null;
}

function Protected() {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => setMe({ user: null }))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <PageLoading />;
  if (!me?.user) return <Navigate to="/" replace />;
  return <AppShell restaurantName={me.user.restaurantName} />;
}

export default function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route element={<Protected />}>
              <Route path="/inicio" element={<Home />} />
              <Route path="/hub" element={<Hub />} />
              <Route path="/ventas" element={<Ventas />} />
              <Route path="/reservaciones" element={<Reservaciones />} />
              <Route path="/whatsapp" element={<Whatsapp />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/clientes/:id" element={<ClienteDetalle />} />
              <Route path="/marketing" element={<Marketing />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/reportes/:id" element={<Reportes />} />
              <Route path="/salud" element={<Salud />} />
              <Route path="/configuracion" element={<Configuracion />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  );
}
