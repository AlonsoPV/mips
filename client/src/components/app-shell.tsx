import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  HeartPulse,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
  Waypoints,
} from "lucide-react";
import { PeriodSelector } from "@/components/period-selector";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useState } from "react";

const GROUPS: Array<{
  label: string;
  to?: string;
  icon: typeof LayoutDashboard;
  children?: { to: string; label: string; icon: typeof LayoutDashboard }[];
}> = [
  { to: "/inicio", label: "Inicio", icon: LayoutDashboard },
  { to: "/hub", label: "Hub", icon: Waypoints },
  {
    label: "Operación",
    icon: ShoppingBag,
    children: [
      { to: "/ventas", label: "Pedidos", icon: ShoppingBag },
      { to: "/reservaciones", label: "Reservaciones", icon: CalendarDays },
      { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
    ],
  },
  {
    label: "Insights",
    icon: Sparkles,
    children: [
      { to: "/marketing", label: "Oportunidades", icon: Sparkles },
      { to: "/clientes", label: "Clientes", icon: Users },
    ],
  },
  { to: "/reportes", label: "Reportes", icon: Activity },
  { to: "/salud", label: "Salud del Hub", icon: HeartPulse },
];

function navClass(active: boolean) {
  return cn(
    "flex min-h-10 items-center gap-2.5 rounded-md px-3 text-sm text-[#E8DFD4] hover:bg-white/10",
    active && "bg-white/12 text-white",
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      {GROUPS.map((item) => {
        if (!item.children) {
          return (
            <NavLink key={item.to} to={item.to!} onClick={onNavigate} className={({ isActive }) => navClass(isActive)}>
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        }
        const childActive = item.children.some((c) => pathname.startsWith(c.to));
        const expanded = item.label in open ? open[item.label] : childActive;
        return (
          <div key={item.label}>
            <button
              type="button"
              className={cn(navClass(childActive), "w-full")}
              onClick={() => setOpen((s) => ({ ...s, [item.label]: !expanded }))}
              aria-expanded={expanded}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition", expanded && "rotate-180")} />
            </button>
            {expanded && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                {item.children.map((child) => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    onClick={onNavigate}
                    className={({ isActive }) => navClass(isActive)}
                  >
                    <child.icon className="h-3.5 w-3.5 shrink-0" />
                    {child.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="mt-auto pt-6">
        <NavLink to="/configuracion" onClick={onNavigate} className={({ isActive }) => navClass(isActive)}>
          <Settings className="h-4 w-4" />
          Configuración
        </NavLink>
      </div>
    </nav>
  );
}

function Brand() {
  return (
    <NavLink to="/inicio" className="mb-6 block px-3">
      <p className="font-serif text-xl text-white">Míps Connect</p>
      <p className="mt-0.5 text-[11px] text-[#C9BDB0]">Centro de operación</p>
    </NavLink>
  );
}

export function AppShell({ restaurantName }: { restaurantName: string }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const livePage =
    pathname === "/inicio" || pathname === "/hub" || pathname === "/salud" || pathname === "/configuracion";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="hidden bg-espresso lg:flex lg:flex-col lg:p-3">
        <Brand />
        <NavItems />
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b bg-card/90 px-4 py-2.5 backdrop-blur md:px-6">
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
            <p className="text-[11px] text-muted-foreground">Demo · Datos simulados</p>
          </div>
          {!livePage && (
            <div className="ml-auto">
              <PeriodSelector />
            </div>
          )}
        </header>
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
