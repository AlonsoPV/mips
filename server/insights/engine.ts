import type { Insight } from "../../shared/types";
import { demandHeatmap, opentableSummary, uberSummary, whatsappSummary, customersSummary, hubHealth } from "../aggregations";
import type { PeriodRange } from "../period";

const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function hourRange(h: number) {
  return `${String(h).padStart(2, "0")}:00 y ${String(h + 2).padStart(2, "0")}:00`;
}

export async function buildInsights(period: PeriodRange): Promise<{ insights: Insight[]; subtitle: string }> {
  const [heat, uber, _ot, wa, cust, health] = await Promise.all([
    demandHeatmap(period),
    uberSummary(period),
    opentableSummary(period),
    whatsappSummary(period),
    customersSummary(period),
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

  const angus = uber.topProducts.find((p) => p.name.toLowerCase().includes("angus"));
  const avgTicket = uber.kpis.find((k) => k.label === "Ticket promedio")?.value ?? 0;
  if (angus && avgTicket) {
    const lift = avgTicket ? ((angus.ticket - avgTicket) / avgTicket) * 100 : 0;
    insights.push({
      id: "angus-star",
      type: "producto",
      channel: "uber_eats",
      priority: "opportunity",
      title: "Producto estrella",
      description: `La hamburguesa Angus es de los productos más solicitados en Uber Eats y genera un ticket ${Math.round(lift)}% ${lift >= 0 ? "superior" : "inferior"} al promedio.`,
      metric: angus.name,
      comparison: `Ticket asociado ${angus.ticket}`,
      impact: "Mayor ticket digital",
      recommendedAction: "Destacar el producto en canales digitales.",
      ctaLabel: "Ver producto",
      deepLink: "/ventas?focus=productos",
    });
  }

  const rib = uber.topProducts.find((p) => p.name.toLowerCase().includes("rib eye"));
  if (rib) {
    insights.push({
      id: "ribeye-freq",
      type: "producto",
      channel: "uber_eats",
      priority: "opportunity",
      title: "Producto de alto ticket",
      description: `El rib eye tiene un ticket asociado alto (${rib.ticket}) con menor frecuencia (${rib.quantity} unidades).`,
      metric: rib.name,
      impact: "Oportunidad de campaña a clientes de alto valor",
      recommendedAction: "Probar una comunicación orientada a clientes de alto valor.",
      ctaLabel: "Ver producto",
      deepLink: "/marketing",
    });
  }

  const resIntent = wa.intents.find((i) => i.intent === "reservaciones");
  const waTotal = wa.intents.reduce((s, i) => s + i.count, 0);
  const resPct = waTotal ? resIntent!.count / waTotal : 0;
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

  const thu = heat.cells.filter((c) => c.dow === 4 && c.hour >= 18 && c.hour < 20);
  const thuTotal = thu.reduce((s, c) => s + c.total, 0);
  const avgSlot =
    heat.cells.filter((c) => c.hour >= 18 && c.hour < 20).reduce((s, c) => s + c.total, 0) / 7;
  if (avgSlot && thuTotal < avgSlot * 0.75) {
    const drop = Math.round((1 - thuTotal / avgSlot) * 100);
    insights.push({
      id: "thursday-gap",
      type: "horario",
      channel: "hub",
      priority: "opportunity",
      title: "Horario con menor demanda",
      description: `Los jueves de 18:00 a 20:00 tienen ${drop}% menos demanda digital que el promedio de esa misma ventana.`,
      metric: `-${drop}%`,
      recommendedAction: "Evaluar promoción o experiencia específica para ese horario.",
      ctaLabel: "Ver horario",
      deepLink: "/marketing",
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
      description: `${inactivos} clientes identificables no han regresado en más de 45 días.`,
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
  const digitalUp = (uber.kpis[0]?.deltaPct ?? 0) > 0;
  const subtitle = `En los últimos ${period.label.toLowerCase()} ${digitalUp ? "aumentaron" : "se movieron"} los pedidos digitales, OpenTable concentró la mayor demanda los ${peakDay} y Uber Eats tuvo su mejor desempeño alrededor de las ${String(heat.peak.hour).padStart(2, "0")}:00. Tu mayor concentración digital ocurre los ${peakDay} entre ${hourRange(heat.peak.hour)}.`;

  const order: Record<string, number> = { critical: 0, attention: 1, opportunity: 2, info: 3 };
  insights.sort((a, b) => order[a.priority]! - order[b.priority]!);
  return { insights: insights.slice(0, 5), subtitle };
}

export async function marketingOpportunities(period: PeriodRange) {
  const { insights } = await buildInsights(period);
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
