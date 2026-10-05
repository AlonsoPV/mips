import "./env";
import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import MemoryStoreFactory from "memorystore";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { initDb, getPool, isPglite } from "./db";
import { isProduction } from "./env";
import { registerRoutes } from "./routes";
import { seedDatabase } from "./seed";
import { serveStatic } from "./static";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    restaurantId?: string;
    email?: string;
  }
}

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

await initDb();
await seedDatabase(false);

const secret = process.env.SESSION_SECRET || "mips-connect-dev-secret";
const PgStore = connectPg(session);
const MemoryStore = MemoryStoreFactory(session);

app.use(
  session({
    store: isPglite() || !getPool()
      ? new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 })
      : new PgStore({ pool: getPool()!, tableName: "session", createTableIfMissing: true }),
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

registerRoutes(app);

const server = createServer(app);
const port = Number(process.env.PORT || 5000);

const builtClient = existsSync(path.resolve(import.meta.dirname, "public"));
if (isProduction || builtClient) {
  serveStatic(app);
} else {
  const { setupVite } = await import("./vite");
  await setupVite(app, server);
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Míps Connect escuchando en 0.0.0.0:${port}`);
});
