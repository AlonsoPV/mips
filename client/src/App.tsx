import { lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionGate } from "@/components/session-gate";
import { ScrollManager } from "@/components/scroll-manager";
import Landing from "@/pages/Landing";

const loaders = {
  Home: () => import("@/pages/Home"),
  Ventas: () => import("@/pages/Ventas"),
  Reservaciones: () => import("@/pages/Reservaciones"),
  Whatsapp: () => import("@/pages/Whatsapp"),
  Clientes: () => import("@/pages/Clientes"),
  ClienteDetalle: () => import("@/pages/ClienteDetalle"),
  Marketing: () => import("@/pages/Marketing"),
  Reportes: () => import("@/pages/Reportes"),
  Salud: () => import("@/pages/Salud"),
  Configuracion: () => import("@/pages/Configuracion"),
};

const Home = lazy(loaders.Home);
const Ventas = lazy(loaders.Ventas);
const Reservaciones = lazy(loaders.Reservaciones);
const Whatsapp = lazy(loaders.Whatsapp);
const Clientes = lazy(loaders.Clientes);
const ClienteDetalle = lazy(loaders.ClienteDetalle);
const Marketing = lazy(loaders.Marketing);
const Reportes = lazy(loaders.Reportes);
const Salud = lazy(loaders.Salud);
const Configuracion = lazy(loaders.Configuracion);

/** Precarga las pantallas en tiempo ocioso para que cambiar de ruta no espere al bundle. */
function usePrefetchPages() {
  useEffect(() => {
    const run = () => {
      for (const load of Object.values(loaders)) void load().catch(() => undefined);
    };
    const idle = typeof window.requestIdleCallback === "function";
    const id = idle ? window.requestIdleCallback(run, { timeout: 2500 }) : window.setTimeout(run, 1200);
    return () => (idle ? window.cancelIdleCallback(id) : window.clearTimeout(id));
  }, []);
}

export default function App() {
  usePrefetchPages();

  return (
    <TooltipProvider delayDuration={200}>
      <BrowserRouter>
        <ScrollManager />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<SessionGate />}>
            <Route path="/inicio" element={<Home />} />
            <Route path="/hub" element={<Navigate to="/salud" replace />} />
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
      </BrowserRouter>
    </TooltipProvider>
  );
}
