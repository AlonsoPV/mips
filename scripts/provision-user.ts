import "../server/env";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { initDb, closeDb } from "../server/db";
import { hashPassword } from "../server/auth";
import { restaurants, users } from "../shared/schema";
const config = z.object({ restaurantId: z.string().min(1).max(64), restaurantName: z.string().min(1), email: z.string().email(), password: z.string().min(14).max(256), role: z.enum(["owner", "viewer"]) }).parse({ restaurantId: process.env.PROVISION_RESTAURANT_ID, restaurantName: process.env.PROVISION_RESTAURANT_NAME, email: process.env.PROVISION_EMAIL, password: process.env.PROVISION_PASSWORD, role: process.env.PROVISION_ROLE ?? "owner" });
try {
 const db = await initDb();
 const passwordHash = await hashPassword(config.password);
 await db.transaction(async tx => {
  await tx.insert(restaurants).values({ id: config.restaurantId, name: config.restaurantName }).onConflictDoNothing();
  await tx.insert(users).values({ id: randomUUID(), restaurantId: config.restaurantId, email: config.email.toLowerCase(), passwordHash, role: config.role });
 });
 console.log("Usuario creado. No se imprimieron credenciales.");
} finally { await closeDb(); }
