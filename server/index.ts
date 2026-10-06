import "./env";
import express from "express";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { initDb } from "./db";
import { isProduction, demoMode, validateRuntime } from "./env";
import { registerRoutes } from "./routes";
import { seedDatabase } from "./seed";
import { serveStatic } from "./static";

const app = express();
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
validateRuntime();
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

await initDb();
if (demoMode) await seedDatabase(false);

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
