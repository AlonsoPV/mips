import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, RequestHandler } from "express";
import { and, eq, gt, lte } from "drizzle-orm";
import { z } from "zod";
import { authSessions, users } from "../shared/schema";
import { getDb } from "./db";
import { demoMode, isProduction } from "./env";
import { accessContext, type AccessContext } from "./context";
const scryptAsync = promisify(scrypt);
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}
async function verifyPassword(password: string, encoded: string) {
  const [method, salt, expected] = encoded.split(":");
  if (method !== "scrypt" || !salt || !expected || expected.length !== 128) return false;
  const actual = await scryptAsync(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}
const cookieName = "mips_session";
const cookieOptions = { httpOnly: true, sameSite: "strict" as const, secure: isProduction, path: "/" };
function cookieToken(req: Request) {
  return req.headers.cookie?.split(";").map(p => p.trim()).find(p => p.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) ?? "";
}
export const checkOrigin: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || req.path.startsWith("/connector/")) return next();
  const expected = process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get("host")}`;
  if (req.get("origin") !== expected) { res.status(403).json({ error: "Origen no autorizado" }); return; }
  next();
};
export const authorize: RequestHandler = (req, res, next) => {
  void (async () => {
    let context: AccessContext;
    if (req.path.startsWith("/connector/")) {
      const config = z.array(z.object({ token: z.string().min(32), restaurantId: z.string().min(1).max(64), channel: z.enum(["uber_eats", "opentable", "whatsapp", "mips"]) })).parse(JSON.parse(process.env.CONNECTOR_KEYS || "[]"));
      const authorization = req.get("authorization") ?? "";
      const supplied = tokenHash(authorization.startsWith("Bearer ") ? authorization.slice(7) : "");
      const key = config.find(k => timingSafeEqual(Buffer.from(tokenHash(k.token)), Buffer.from(supplied)));
      if (!key) { res.status(401).json({ error: "Credencial de conector requerida" }); return; }
      context = { restaurantId: key.restaurantId, channel: key.channel, role: "connector" };
    } else if (demoMode) {
      context = { restaurantId: "rst_demo", role: "viewer" };
    } else {
      const token = cookieToken(req);
      const [row] = token ? await getDb().select({ user: users }).from(authSessions).innerJoin(users, eq(authSessions.userId, users.id))
        .where(and(eq(authSessions.tokenHash, tokenHash(token)), gt(authSessions.expiresAt, new Date()))).limit(1) : [];
      if (!row || !["owner", "viewer"].includes(row.user.role)) { res.status(401).json({ error: "Inicia sesión" }); return; }
      context = { restaurantId: row.user.restaurantId, userId: row.user.id, role: row.user.role as "owner" | "viewer" };
    }
    accessContext.run(context, next);
  })().catch(next);
};
const attempts = new Map<string, { n: number; expires: number }>();
const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(256) });
export const login: RequestHandler = async (req, res, next) => {
  try {
    if (demoMode) { res.status(404).json({ error: "La demo no usa cuentas" }); return; }
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Datos inválidos" }); return; }
    const now = Date.now();
    for (const [key, value] of attempts) if (value.expires < now) attempts.delete(key);
    const key = req.ip ?? "unknown";
    const entry = attempts.get(key) ?? { n: 0, expires: now + 15 * 60000 };
    if (entry.n >= 10 || attempts.size >= 10000) { res.status(429).json({ error: "Demasiados intentos. Intenta más tarde" }); return; }
    entry.n++; attempts.set(key, entry);
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email.toLowerCase())).limit(1);
    const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? `scrypt:missing:${"0".repeat(128)}`);
    if (!valid || !user || !["owner", "viewer"].includes(user.role)) { res.status(401).json({ error: "Credenciales incorrectas" }); return; }
    attempts.delete(key);
    await db.delete(authSessions).where(lte(authSessions.expiresAt, new Date()));
    const old = cookieToken(req);
    if (old) await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash(old)));
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(now + 8 * 3600000);
    await db.insert(authSessions).values({ tokenHash: tokenHash(token), userId: user.id, expiresAt });
    res.cookie(cookieName, token, { ...cookieOptions, expires: expiresAt });
    res.json({ ok: true });
  } catch (error) { next(error); }
};
export const logout: RequestHandler = async (req, res, next) => {
  try {
    await getDb().delete(authSessions).where(eq(authSessions.tokenHash, tokenHash(cookieToken(req))));
    res.clearCookie(cookieName, cookieOptions);
    res.json({ ok: true });
  } catch (error) { next(error); }
};
