import { addDays, mexicoDate, mexicoParts, startOfMexicoDay } from "../shared/time";

export interface PeriodRange {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  label: string;
}

export function parsePeriod(query: { from?: string; to?: string; range?: string }): PeriodRange {
  const now = new Date();
  const todayStart = startOfMexicoDay(now);
  const range = query.range || (!query.from ? "30d" : "custom");

  let from: Date;
  let to: Date = now;
  let label = "30 días";

  if (query.from && query.to) {
    const civil = (value: string, end: boolean) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value);
      const utc = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(utc.getTime()) || utc.toISOString().slice(0, 10) !== value) return new Date(NaN);
      const [year, month, day] = value.split("-").map(Number);
      const result = mexicoDate(year!, month!, day!);
      const parts = mexicoParts(result);
      if (parts.year !== year || parts.month !== month || parts.day !== day) return new Date(NaN);
      return end ? new Date(addDays(result, 1).getTime() - 1) : result;
    };
    from = civil(query.from, false);
    to = civil(query.to, true);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw Object.assign(new Error("Periodo inválido: verifica las fechas y su orden"), { status: 400 });
    } else {
      label = "Personalizado";
    }
  } else {
    if (query.from || query.to) {
      throw Object.assign(new Error("El periodo requiere from y to"), { status: 400 });
    }
    switch (range) {
      case "today":
        from = todayStart;
        label = "Hoy";
        break;
      case "7d":
        from = addDays(todayStart, -6);
        label = "7 días";
        break;
      case "90d":
        from = addDays(todayStart, -89);
        label = "90 días";
        break;
      case "30d":
      default:
        from = addDays(todayStart, -29);
        label = "30 días";
        break;
    }
  }

  if (to.getTime() - from.getTime() > 366 * 86400000) throw Object.assign(new Error("El periodo máximo es de 366 días"), { status: 400 });

  const duration = Math.max(1, to.getTime() - from.getTime());
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - duration);

  return { from, to, previousFrom, previousTo, label };
}

export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function hourDowSql(column: string) {
  return {
    hour: `extract(hour from (${column} at time zone 'America/Mexico_City'))`,
    dow: `extract(dow from (${column} at time zone 'America/Mexico_City'))`,
    day: `date_trunc('day', ${column} at time zone 'America/Mexico_City')`,
  };
}

export { mexicoDate, mexicoParts };
