export const MEXICO_TZ = "America/Mexico_City";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Interpreta un reloj civil de Ciudad de México y lo convierte a Date UTC. */
export function mexicoDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const desired = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
  const utcGuess = new Date(`${desired}Z`);
  const inMx = utcGuess
    .toLocaleString("sv-SE", { timeZone: MEXICO_TZ })
    .replace(" ", "T");
  const diff = utcGuess.getTime() - new Date(`${inMx}Z`).getTime();
  return new Date(utcGuess.getTime() + diff);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function startOfMexicoDay(date: Date): Date {
  const parts = mexicoParts(date);
  return mexicoDate(parts.year, parts.month, parts.day, 0, 0, 0);
}

export function mexicoParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: MEXICO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: weekdayMap[map.weekday] ?? 0,
  };
}

export function greetingFor(date = new Date()): string {
  const hour = mexicoParts(date).hour;
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}
