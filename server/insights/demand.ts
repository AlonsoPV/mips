import { addDays, mexicoParts, startOfMexicoDay } from "../../shared/time";
import type { PeriodRange } from "../period";
/** Exposure counts only the overlapping part of the 18–20 civil-time window. */
export function eveningOpportunity(cells: { dow: number; hour: number; total: number }[], period: PeriodRange) {
  const exposure = Array<number>(7).fill(0);
  for (let day = startOfMexicoDay(period.from); day <= period.to; day = addDays(day, 1)) {
    const start = day.getTime() + 18 * 3600000;
    const end = start + 2 * 3600000;
    const overlap = Math.max(0, Math.min(end, period.to.getTime() + 1) - Math.max(start, period.from.getTime()));
    exposure[mexicoParts(day).weekday] += overlap / (2 * 3600000);
  }
  if (exposure.some(n => n < 2)) return null;
  const totals = Array<number>(7).fill(0);
  for (const cell of cells) if (cell.hour >= 18 && cell.hour < 20) totals[cell.dow] += cell.total;
  if (totals.reduce((a, b) => a + b, 0) < 30) return null;
  const rates = totals.map((total, dow) => total / exposure[dow]!);
  const mean = rates.reduce((a, b) => a + b, 0) / 7;
  const dow = rates.indexOf(Math.min(...rates));
  if (!mean || rates[dow]! >= mean * 0.75) return null;
  return { dow, drop: Math.round((1 - rates[dow]! / mean) * 100), exposure: exposure[dow], rate: rates[dow] };
}
