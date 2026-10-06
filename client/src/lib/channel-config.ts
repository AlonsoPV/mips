import {
  CalendarDays,
  Layers,
  MessageCircle,
  Receipt,
  ShoppingBag,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

/**
 * Sistema visual de canales. Toda la identidad (icono, nombre, color, unidad)
 * vive aquí; los componentes sólo consultan esta tabla.
 *
 * Jerarquía:
 *   FUENTES   uber · opentable · whatsapp
 *   HUB       hub   (Míps Connect: integración, sincronización, estado)
 *   DESTINO   mips  (Míps POS: ventas confirmadas, folios)
 *   all       agregado de varias fuentes
 */
export type ChannelKey = "uber" | "opentable" | "whatsapp" | "mips" | "hub" | "all";
export type SourceKey = "uber" | "opentable" | "whatsapp";

export interface ChannelConfig {
  key: ChannelKey;
  /** Nombre visible. */
  label: string;
  /** Nombre corto para espacios estrechos. */
  shortLabel: string;
  role: "source" | "hub" | "destination" | "all";
  /** Qué representa, en lenguaje de restaurante. */
  describes: string;
  /** Unidad que produce el canal. */
  unit: { singular: string; plural: string };
  icon: LucideIcon;
  /** Clases Tailwind. Guardadas completas para que el compilador las detecte. */
  accent: string;
  accentOnDark: string;
  softBackground: string;
  border: string;
  dot: string;
  /** Color base para gráficas (rgb sin alpha). */
  rgb: string;
  hex: string;
}

export const channelConfig: Record<ChannelKey, ChannelConfig> = {
  uber: {
    key: "uber",
    label: "Uber Eats",
    shortLabel: "Uber",
    role: "source",
    describes: "Pedidos y delivery",
    unit: { singular: "pedido", plural: "pedidos" },
    icon: ShoppingBag,
    accent: "text-channel-uber",
    accentOnDark: "text-[#4CCB8A]",
    softBackground: "bg-channel-uber/10",
    border: "border-channel-uber/30",
    dot: "bg-channel-uber",
    rgb: "4,122,62",
    hex: "#047A3E",
  },
  opentable: {
    key: "opentable",
    label: "OpenTable",
    shortLabel: "OpenTable",
    role: "source",
    describes: "Reservaciones y comensales",
    unit: { singular: "reservación", plural: "reservaciones" },
    icon: CalendarDays,
    accent: "text-channel-opentable",
    accentOnDark: "text-[#F08A91]",
    softBackground: "bg-channel-opentable/10",
    border: "border-channel-opentable/30",
    dot: "bg-channel-opentable",
    rgb: "179,38,47",
    hex: "#B3262F",
  },
  whatsapp: {
    key: "whatsapp",
    label: "WhatsApp",
    shortLabel: "WhatsApp",
    role: "source",
    describes: "Conversaciones y atención",
    unit: { singular: "conversación", plural: "conversaciones" },
    icon: MessageCircle,
    accent: "text-channel-whatsapp",
    accentOnDark: "text-[#5FD3C4]",
    softBackground: "bg-channel-whatsapp/10",
    border: "border-channel-whatsapp/30",
    dot: "bg-channel-whatsapp",
    rgb: "18,140,126",
    hex: "#128C7E",
  },
  mips: {
    key: "mips",
    label: "Míps POS",
    shortLabel: "Míps",
    role: "destination",
    describes: "Ventas confirmadas y folios",
    unit: { singular: "venta confirmada", plural: "ventas confirmadas" },
    icon: Receipt,
    accent: "text-channel-mips",
    accentOnDark: "text-[#9DB6DB]",
    softBackground: "bg-channel-mips/10",
    border: "border-channel-mips/30",
    dot: "bg-channel-mips",
    rgb: "31,58,95",
    hex: "#1F3A5F",
  },
  hub: {
    key: "hub",
    label: "Hub",
    shortLabel: "Hub",
    role: "hub",
    describes: "Integración, sincronización y estado",
    unit: { singular: "evento", plural: "eventos" },
    icon: Waypoints,
    accent: "text-channel-hub",
    accentOnDark: "text-[#E8A27F]",
    softBackground: "bg-channel-hub/10",
    border: "border-channel-hub/30",
    dot: "bg-channel-hub",
    rgb: "184,92,56",
    hex: "#B85C38",
  },
  all: {
    key: "all",
    label: "Todos los canales",
    shortLabel: "Todos",
    role: "all",
    describes: "Uber Eats, OpenTable y WhatsApp",
    unit: { singular: "evento", plural: "eventos" },
    icon: Layers,
    accent: "text-channel-all",
    accentOnDark: "text-[#C9BDB0]",
    softBackground: "bg-muted",
    border: "border-border",
    dot: "bg-channel-all",
    rgb: "92,81,73",
    hex: "#5C5149",
  },
};

export const SOURCE_CHANNELS: SourceKey[] = ["uber", "opentable", "whatsapp"];
export const STATUS_CHANNELS: Exclude<ChannelKey, "hub" | "all">[] = ["uber", "opentable", "whatsapp", "mips"];

const ALIASES: Record<string, ChannelKey> = {
  uber: "uber",
  uber_eats: "uber",
  ubereats: "uber",
  opentable: "opentable",
  ot: "opentable",
  whatsapp: "whatsapp",
  wa: "whatsapp",
  mips: "mips",
  pos: "mips",
  hub: "hub",
  all: "all",
};

/** Acepta las claves de la API (uber_eats, ot, wa…) y devuelve la clave del sistema visual. */
export function toChannelKey(value: string | null | undefined, fallback: ChannelKey = "all"): ChannelKey {
  if (!value) return fallback;
  return ALIASES[value.toLowerCase()] ?? fallback;
}

/** Canal que produjo un evento del Hub según su tipo. */
export function channelForEvent(eventType: string, channel?: string): ChannelKey {
  if (channel) return toChannelKey(channel, "hub");
  if (eventType === "order") return "uber";
  if (eventType === "reservation") return "opentable";
  if (eventType === "conversation") return "whatsapp";
  if (eventType === "sale") return "mips";
  return "hub";
}

/** Canal de un insight: usa el que manda la API o lo infiere del destino del CTA. */
export function channelForInsight(insight: { channel?: string | null; deepLink?: string }): ChannelKey {
  if (insight.channel) return toChannelKey(insight.channel, "hub");
  const link = insight.deepLink ?? "";
  if (link.startsWith("/ventas")) return "uber";
  if (link.startsWith("/reservaciones")) return "opentable";
  if (link.startsWith("/whatsapp")) return "whatsapp";
  return "hub";
}

/** "34 pedidos", "1 reservación". */
export function countWithUnit(channel: ChannelKey, value: number, formatted?: string): string {
  const u = channelConfig[channel].unit;
  return `${formatted ?? value} ${value === 1 ? u.singular : u.plural}`;
}
