export type ChannelType = "uber_eats" | "opentable" | "whatsapp" | "mips";

export type InsightPriority = "info" | "opportunity" | "attention" | "critical";

export type InsightType =
  | "horario"
  | "producto"
  | "atencion"
  | "riesgo"
  | "recurrencia"
  | "demanda";

export interface KpiValue {
  value: number;
  previousValue: number;
  deltaPct: number | null;
  label: string;
  tooltip: string;
  unit?: "currency" | "count" | "percent" | "seconds";
}

export interface Insight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  metric?: string;
  comparison?: string;
  impact?: string;
  recommendedAction: string;
  ctaLabel: string;
  deepLink: string;
}

export interface PeriodQuery {
  from: string;
  to: string;
}

export const CHANNEL_LABELS: Record<ChannelType, string> = {
  uber_eats: "Uber Eats",
  opentable: "OpenTable",
  whatsapp: "WhatsApp",
  mips: "Míps POS",
};

export const DEMO_EMAIL = "demo@mipsconnect.mx";
export const DEMO_RESTAURANT_ID = "rst_demo";
export const DEMO_RESTAURANT_NAME = "Restaurante Demo";
