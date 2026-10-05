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
    from = new Date(query.from);
    to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      from = addDays(todayStart, -29);
      label = "30 días";
    } else {
      label = "Personalizado";
    }
  } else {
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
