import { eveningOpportunity } from "./demand";
import { productOpportunity } from "./products";
import type { Insight } from "../../shared/types";
import { demandHeatmap, uberSummary, whatsappSummary, customersSummary, hubHealth } from "../aggregations";
import type { PeriodRange } from "../period";

const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export async function buildInsights(period: PeriodRange, limit = 5): Promise<{ insights: Insight[]; subtitle: string }> {
  const [heat, uber, wa, cust, health] = await Promise.all([
    demandHeatmap(period),
    uberSummary(period),
    whatsappSummary(period),
    customersSummary(),
    hubHealth(),
  ]);

  const insights: Insight[] = [];

  const sundayCells = heat.cells.filter((c) => c.dow === 0 && c.hour >= 13 && c.hour < 15);
  const sundayRes = sundayCells.reduce((s, c) => s + c.ot, 0);
  const sundayUber = sundayCells.reduce((s, c) => s + c.uber, 0);
  const totalRes = heat.cells.reduce((s, c) => s + c.ot, 0);
  const totalUber = heat.cells.reduce((s, c) => s + c.uber, 0);
  const resShare = totalRes ? sundayRes / totalRes : 0;
  const uberShare = totalUber ? sundayUber / totalUber : 0;
  if (resShare > 0.12 && resShare > uberShare * 1.25) {
    insights.push({
      id: "sunday-gap",
      type: "horario",
      channel: "hub",
      priority: "opportunity",
      title: "Oportunidad de horario",
      description: `Los domingos entre 13:00 y 15:00 concentran ${Math.round(resShare * 100)}% de las reservaciones, pero sólo ${Math.round(uberShare * 100)}% de los pedidos de Uber Eats.`,
      metric: `${Math.round(resShare * 100)}% vs ${Math.round(uberShare * 100)}%`,
      comparison: "OpenTable vs Uber Eats en la misma ventana",
      impact: "Demanda de mesa no aprovechada en delivery",
      recommendedAction: "Revisar menú y tiempos de preparación para esa ventana.",
      ctaLabel: "Ver horario",
      deepLink: "/inicio?focus=heatmap",
    });
  }

  const avgTicket = uber.kpis.find((k) => k.label === "Ticket promedio")?.value ?? 0;
  const product = productOpportunity(uber.topProducts, avgTicket);
  if (product) insights.push(product);

  const resIntent = wa.intents.find((i) => i.intent === "reservaciones");
  const waTotal = wa.intents.reduce((s, i) => s + i.count, 0);
  const resPct = waTotal ? (resIntent?.count ?? 0) / waTotal : 0;
  if (resIntent && resPct > 0.3) {
    insights.push({
      id: "wa-reservations",
      type: "atencion",
      channel: "whatsapp",
      priority: "attention",
      title: "Atención en WhatsApp",
      description: `Las consultas de reservaciones representan ${Math.round(resPct * 100)}% de las conversaciones de WhatsApp.`,
      metric: `${Math.round(resPct * 100)}%`,
      impact: "El canal conversacional opera como extensión de OpenTable",
      recommendedAction: "Revisar plantillas de confirmación y horarios.",
      ctaLabel: "Ver conversaciones",
      deepLink: "/whatsapp",
    });
  }

  const errors = uber.kpis.find((k) => k.label === "Operaciones con error")?.value ?? 0;
  if (errors > 0) {
    insights.push({
      id: "uber-errors",
      type: "riesgo",
      channel: "uber_eats",
      priority: errors > 8 ? "critical" : "attention",
      title: "Riesgo operativo",
      description: `${errors} pedidos de Uber Eats necesitaron reprocesamiento o quedaron en error en el periodo.`,
      metric: String(errors),
      impact: "Pedidos que no llegaron limpios a Míps",
      recommendedAction: "Revisar incidencias del Hub y reintentos.",
      ctaLabel: "Revisar incidencias",
      deepLink: "/salud",
    });
  }

  const evening = eveningOpportunity(heat.cells, period);
  if (evening) {
    insights.push({
      id: `evening-gap-${evening.dow}`, type: "horario", channel: "hub", priority: "opportunity",
      title: "Horario con menor actividad por jornada",
      description: `Los ${DAYS[evening.dow]} de 18:00 a 20:00 tienen ${evening.drop}% menos actividad por jornada que el promedio de esa ventana. Se normalizó por la exposición de cada día en el periodo.`,
      metric: `-${evening.drop}%`, comparison: "Mínimo dos ventanas por día de semana y 30 eventos en total",
      recommendedAction: "Revisar apertura y capacidad antes de probar una promoción; actividad no equivale a ventas.",
      ctaLabel: "Ver horario", deepLink: "/inicio?focus=heatmap",
    });
  }

  const inactivos = cust.segments.inactivos ?? 0;
  if (inactivos > 0) {
    insights.push({
      id: "inactive-customers",
      type: "recurrencia",
      channel: "hub",
      priority: "opportunity",
      title: "Reactivación",
      description: `En el historial acumulado, ${inactivos} clientes están clasificados como inactivos. Esta audiencia no depende del periodo seleccionado.`,
      metric: String(inactivos),
      recommendedAction: "Crear audiencia de reactivación (requiere consentimiento).",
      ctaLabel: "Ver clientes",
      deepLink: "/clientes",
    });
  }

  if (health.failed > 0 || health.pending > 0) {
    insights.push({
      id: "hub-health",
      type: "riesgo",
      channel: "hub",
      priority: health.failed > 5 ? "critical" : "attention",
      title: "Salud del Hub",
      description: `Hay ${health.pending} eventos pendientes y ${health.failed} fallidos. El Hub los monitorea para no perder operación.`,
      recommendedAction: "Abrir Salud del Hub.",
      ctaLabel: "Ver salud",
      deepLink: "/salud",
    });
  }

  const peakDay = DAYS[heat.peak.dow] ?? "fin de semana";
  const subtitle = heat.peak.total > 0
    ? `En el periodo ${period.label.toLowerCase()}, la mayor actividad digital combinada ocurre los ${peakDay} entre ${String(heat.peak.hour).padStart(2, "0")}:00 y ${String(heat.peak.hour + 1).padStart(2, "0")}:00. Esta señal combina pedidos, reservaciones y conversaciones; no equivale a ventas.`
    : "No hay actividad digital en el periodo seleccionado.";

  const order: Record<string, number> = { critical: 0, attention: 1, opportunity: 2, info: 3 };
  insights.sort((a, b) => order[a.priority]! - order[b.priority]!);
  return { insights: insights.slice(0, limit), subtitle };
}

export async function marketingOpportunities(period: PeriodRange) {
  const { insights } = await buildInsights(period, Infinity);
  return {
    disclaimer: "Activación de campañas requiere consentimiento y configuración adicional.",
    opportunities: insights
      .filter((i) => i.priority === "opportunity" || i.type === "horario" || i.type === "recurrencia" || i.type === "producto")
      .map((i) => ({
        ...i,
        suggestion: i.recommendedAction,
      })),
  };
}
