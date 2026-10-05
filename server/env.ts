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
export const allowReseed =
  process.env.ALLOW_RESEED === "true" || process.env.NODE_ENV !== "production";
