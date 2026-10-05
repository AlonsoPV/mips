import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function mxn(centavos: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(centavos / 100);
}

export function num(n: number, digits = 0): string {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

export function pct(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function formatKpi(value: number, unit?: string): string {
  if (unit === "currency") return mxn(value);
  if (unit === "percent") return `${num(value, 1)}%`;
  if (unit === "seconds") {
    if (value >= 60) return `${Math.round(value / 60)} min`;
    return `${Math.round(value)} s`;
  }
  if (Number.isInteger(value)) return num(value);
  return num(value, 1);
}

export function when(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "d MMM yyyy", { locale: es });
}

export function hourMin(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "HH:mm", { locale: es });
}

export function ago(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

export const DOW_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DOW_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
