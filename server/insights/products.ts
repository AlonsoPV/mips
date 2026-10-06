import type { Insight } from "../../shared/types";

interface ProductEvidence {
  productId: string;
  name: string;
  ticket: number;
  orderCount: number;
  sales: number;
}

/** Descriptive association only: no cost or margin data exists in this dataset. */
export function productOpportunity(products: ProductEvidence[], averageTicket: number): Insight | null {
  if (averageTicket <= 0) return null;
  const candidate = products.filter(p => p.orderCount >= 10 && p.ticket >= averageTicket * 1.1)
    .sort((a, b) => b.sales - a.sales || a.productId.localeCompare(b.productId))[0];
  if (!candidate) return null;
  const lift = Math.round((candidate.ticket / averageTicket - 1) * 100);
  return {
    id: `product-ticket-${candidate.productId}`,
    type: "producto",
    channel: "uber_eats",
    priority: "opportunity",
    title: "Producto asociado a tickets mayores",
    description: `${candidate.name} aparece en ${candidate.orderCount} pedidos confirmados con ticket promedio ${lift}% superior al general. Es una asociación; no demuestra que el producto cause el incremento.`,
    metric: candidate.name,
    comparison: `Ticket asociado: ${(candidate.ticket / 100).toFixed(2)} MXN · ${candidate.orderCount} pedidos`,
    recommendedAction: "Revisar coste y margen antes de probar una promoción. Comparar el resultado con un grupo sin promoción.",
    ctaLabel: "Ver producto",
    deepLink: "/ventas?focus=productos",
  };
}
