import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
  Waypoints,
} from "lucide-react";
import { PeriodSelector } from "@/components/period-selector";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV = [
  { to: "/inicio", label: "Inicio", icon: LayoutDashboard },
  { to: "/hub", label: "Hub", icon: Waypoints },
  { to: "/ventas", label: "Ventas y pedidos", icon: ShoppingBag },
  { to: "/reservaciones", label: "Reservaciones", icon: CalendarDays },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/marketing", label: "Marketing", icon: Sparkles },
  { to: "/reportes", label: "Reportes", icon: Activity },
  { to: "/salud", label: "Salud del Hub", icon: HeartPulse },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-[#E8DFD4] hover:bg-white/10",
              isActive && "bg-white/12 text-white",
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </NavLink>
      ))}
      <div className="mt-auto pt-6">
        <NavLink
          to="/configuracion"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-[#E8DFD4] hover:bg-white/10",
              isActive && "bg-white/12 text-white",
            )
          }
        >
          <Settings className="h-4 w-4" />
          Configuración
        </NavLink>
      </div>
    </nav>
  );
}

function Brand() {
  return (
    <div className="mb-8 px-3">
      <p className="font-serif text-xl text-white">Míps Connect</p>
      <p className="mt-1 text-xs text-[#C9BDB0]">Hub de operación</p>
    </div>
  );
}

export function AppShell({ restaurantName }: { restaurantName: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    navigate("/");
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden bg-espresso lg:flex lg:flex-col lg:p-4">
        <Brand />
        <NavItems />
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b bg-[#FFFCF8]/90 px-4 py-3 backdrop-blur md:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden" aria-label="Abrir menú">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <Brand />
              <NavItems onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div>
            <p className="text-sm font-medium">{restaurantName}</p>
            <p className="text-xs text-muted-foreground">Demo · Datos simulados</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <PeriodSelector />
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              Salir
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-8 md:px-8 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
