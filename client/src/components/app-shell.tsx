import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  ChevronDown,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import { ChannelIcon } from "@/components/channel-icon";
import { PeriodSelector } from "@/components/period-selector";
import { PageLoading } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { channelConfig, type ChannelKey } from "@/lib/channel-config";
import { cn } from "@/lib/utils";
import { Suspense, useState } from "react";

interface NavChild {
  to: string;
  label: string;
  /** Fuente del dato: pinta el icono del canal y la sub-etiqueta. */
  channel?: ChannelKey;
  sub?: string;
  icon?: typeof LayoutDashboard;
}

const GROUPS: Array<{
  label: string;
  to?: string;
  icon?: typeof LayoutDashboard;
  channel?: ChannelKey;
  children?: NavChild[];
}> = [
  { to: "/inicio", label: "Inicio", icon: LayoutDashboard },
  {
    label: "Operación",
    icon: ShoppingBag,
    children: [
      { to: "/ventas", label: "Pedidos", channel: "uber", sub: "Uber Eats" },
      { to: "/reservaciones", label: "Reservaciones", channel: "opentable", sub: "OpenTable" },
      { to: "/whatsapp", label: "WhatsApp", channel: "whatsapp", sub: "Conversaciones" },
    ],
  },
  {
    label: "Insights",
    icon: Sparkles,
    children: [
      { to: "/marketing", label: "Oportunidades", icon: Sparkles },
      { to: "/clientes", label: "Clientes identificados", icon: Users },
    ],
  },
  { to: "/reportes", label: "Reportes", icon: Activity },
  { to: "/salud", label: "Salud del Hub", icon: HeartPulse },
];

function NavGlyph({ icon: Icon, channel, small = false }: { icon?: typeof LayoutDashboard; channel?: ChannelKey; small?: boolean }) {
  if (channel) return <ChannelIcon channel={channel} size={small ? "sm" : "md"} onDark />;
  if (Icon) return <Icon className={cn("shrink-0", small ? "h-3.5 w-3.5" : "h-4 w-4")} />;
  return null;
}

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
              <NavGlyph icon={item.icon} channel={item.channel} />
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
              <NavGlyph icon={item.icon} channel={item.channel} />
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
                    className={({ isActive }) => cn(navClass(isActive), child.sub && "py-1.5")}
                  >
                    <NavGlyph icon={child.icon} channel={child.channel} small />
                    <span className="flex flex-col leading-tight">
                      <span>{child.label}</span>
                      {child.sub && (
                        <span className={cn("text-[10px]", child.channel ? channelConfig[child.channel].accentOnDark : "text-[#C9BDB0]")}>
                          {child.sub}
                        </span>
                      )}
                    </span>
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
          Integraciones
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

export function AppShell({ restaurantName, mode, onLogout }: { restaurantName: string; mode: "demo" | "live"; onLogout: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const withoutPeriod =
    pathname === "/inicio" || pathname === "/salud" || pathname === "/configuracion" || pathname === "/hub" || pathname.startsWith("/clientes") || pathname === "/reportes/clientes";

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
            <p className="text-[11px] text-muted-foreground">{mode === "demo" ? "Demo · Datos simulados" : "Operación del restaurante"}</p>
          </div>
          {mode === "live" && <Button variant="outline" size="sm" onClick={() => void onLogout()}>Cerrar sesión</Button>}
          {!withoutPeriod && (
            <div className="ml-auto">
              <PeriodSelector />
            </div>
          )}
        </header>
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
