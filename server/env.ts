import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

export function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export const isProduction = process.env.NODE_ENV === "production";
/** Sin APP_MODE=live, la app corre como demo abierta (sin cuentas). */
export const demoMode = process.env.APP_MODE !== "live";
export const allowReseed = demoMode && !isProduction && process.env.ALLOW_RESEED === "true";
export function validateRuntime() {
  if (isProduction && !demoMode && !process.env.DATABASE_URL) throw new Error("DATABASE_URL requerida en producción");
  if (isProduction && !demoMode && !process.env.PUBLIC_ORIGIN?.startsWith("https://")) throw new Error("PUBLIC_ORIGIN https requerida en producción");
}
