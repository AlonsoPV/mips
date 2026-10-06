import { Router, type Express, type Request, type Response, type NextFunction, type RequestHandler } from "express";
import { z } from "zod";
import { authorize, checkOrigin, login, logout } from "./auth";
import { currentAccess } from "./context";
import { ingestEvent, recordHeartbeat } from "./connector";
import { exportPages, customerPage, reconciliationReport } from "./reports";
import {
  customerDetail,
  customersSummary,
  dashboardSummary,
  demandHeatmap,
  hubEvents,
  hubHealth,
  opentableSummary,
  reportData,
  restaurantInfo,
  uberSummary,
  whatsappSummary,
} from "./aggregations";
import { allowReseed, demoMode } from "./env";
import { buildInsights, marketingOpportunities } from "./insights/engine";
import { parsePeriod } from "./period";
import { seedDatabase } from "./seed";

function periodFrom(req: Request) {
  return parsePeriod({
    from: typeof req.query.from === "string" ? req.query.from : undefined,
    to: typeof req.query.to === "string" ? req.query.to : undefined,
    range: typeof req.query.range === "string" ? req.query.range : undefined,
  });
}

function csvEscape(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const s = typeof value === "string" && /^[=+@\-\t\r\n]/.test(raw) ? `'${raw}` : raw;
  if (/[",\r\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  return [headers.join(","), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","))].join("\n");
}

export function registerRoutes(root: Express) {
  const app = Router();
  // Express 4 does not forward rejected async handlers to error middleware.
  const asyncRoute = (handler: RequestHandler): RequestHandler => (req, res, next) => {
    Promise.resolve().then(() => handler(req, res, next)).catch(next);
  };
  const get = (path: string, ...handlers: RequestHandler[]) => app.get(path, ...handlers.map(asyncRoute));
  const post = (path: string, ...handlers: RequestHandler[]) => app.post(path, ...handlers.map(asyncRoute));
  root.use(app);
  get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "mips-connect" });
  });

  get("/api/runtime", (_req, res) => res.json({ mode: demoMode ? "demo" : "live" }));
  app.use("/api", checkOrigin);
  post("/api/auth/login", login);
  app.use("/api", authorize);
  post("/api/auth/logout", logout);
  get("/api/auth/me", async (_req, res) => {
    res.json({ mode: demoMode ? "demo" : "live", restaurantName: (await restaurantInfo())?.name, role: currentAccess().role });
  });

  get("/api/demo/context", async (_req, res) => {
    const restaurant = await restaurantInfo();
    res.json({ mode: demoMode ? "demo" : "live", restaurantName: restaurant?.name ?? "Restaurante Demo" });
  });

  get("/api/dashboard/summary", async (req, res) => {
    res.json(await dashboardSummary(periodFrom(req)));
  });

  get("/api/dashboard/insights", async (req, res) => {
    res.json(await buildInsights(periodFrom(req)));
  });

  get("/api/dashboard/heatmap", async (req, res) => {
    res.json(await demandHeatmap(periodFrom(req)));
  });

  get("/api/channels", async (req, res) => {
    const summary = await dashboardSummary(periodFrom(req));
    res.json(summary.channels);
  });

  get("/api/uber/summary", async (req, res) => {
    res.json(await uberSummary(periodFrom(req)));
  });

  get("/api/opentable/summary", async (req, res) => {
    res.json(await opentableSummary(periodFrom(req)));
  });

  get("/api/whatsapp/summary", async (req, res) => {
    res.json(await whatsappSummary(periodFrom(req)));
  });

  get("/api/customers/summary", async (req, res) => {
    res.json(await customersSummary());
  });

  get("/api/customers", async (req, res) => {
    const offset = z.coerce.number().int().min(0).max(10000000).parse(req.query.offset ?? 0);
    res.json(await customerPage(offset));
  });

  get("/api/customers/:id", async (req, res) => {
    const row = await customerDetail(req.params.id);
    if (!row) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    const { ...safe } = row;
    res.json(safe);
  });

  get("/api/marketing/opportunities", async (req, res) => {
    res.json(await marketingOpportunities(periodFrom(req)));
  });

  get("/api/reports/:report", async (req, res) => {
    const offset = z.coerce.number().int().min(0).max(10000000).parse(req.query.offset ?? 0);
    const data = req.params.report === "conciliacion" ? await reconciliationReport(periodFrom(req), offset) : await reportData(req.params.report, periodFrom(req));
    if (!data) {
      res.status(404).json({ error: "Reporte no encontrado" });
      return;
    }
    res.json(data);
  });

  get("/api/hub/health", async (_req, res) => {
    res.json(await hubHealth());
  });

  get("/api/hub/events", async (req, res) => {
    const limit = Number(req.query.limit ?? 40);
    if (!Number.isInteger(limit) || limit < 1) {
      res.status(400).json({ error: "limit debe ser un entero positivo" });
      return;
    }
    res.json(await hubEvents(Math.min(100, Math.max(1, limit))));
  });

  get("/api/export/:type", async (req, res) => {
    const type = req.params.type;
    const period = periodFrom(req);
    if (type === "clientes" || type === "conciliacion") {
      const headers = type === "clientes" ? ["id", "nombre", "segmento", "visitas", "gasto_centavos"] : ["hora", "canal", "tipo", "id", "estado", "folio"];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="mips-connect-${type}.csv"`);
      res.write("\uFEFF" + headers.join(",") + "\n");
      for await (const page of exportPages(type, period)) {
        if (res.destroyed) return;
        const chunk = page.map(row => headers.map(h => csvEscape(row[h])).join(",")).join("\n") + "\n";
        if (!res.write(chunk)) await new Promise<void>(resolve => {
          const done = () => { res.off("drain", done); res.off("close", done); resolve(); };
          res.once("drain", done); res.once("close", done);
        });
      }
      res.end(); return;
    }
    let rows: Record<string, unknown>[] = [];
    if (type === "uber") {
      const data = await uberSummary(period);
      rows = data.byDay.map((d) => ({ dia: d.day, pedidos: d.orders, ventas_centavos: d.sales }));
    } else if (type === "opentable") {
      const data = await opentableSummary(period);
      rows = data.byDay.map((d) => ({ dia: d.day, reservaciones: d.reservations, comensales: d.covers }));
    } else if (type === "whatsapp") {
      const data = await whatsappSummary(period);
      rows = data.intents.map((i) => ({ motivo: i.intent, conversaciones: i.count }));
    } else if (type === "productos") {
      const data = await uberSummary(period, 2147483647);
      rows = data.topProducts.map((p) => ({ producto: p.name, cantidad: p.quantity, ventas_centavos: p.sales, ticket: p.ticket }));
    } else if (type === "demanda") {
      const data = await demandHeatmap(period);
      rows = data.cells.map((c) => ({ dia: c.dow, hora: c.hour, uber: c.uber, opentable: c.ot, whatsapp: c.wa, total: c.total }));
    } else if (type === "ejecutivo") {
      const data = await dashboardSummary(period);
      rows = data.kpis.map((k) => ({ kpi: k.label, valor: k.value, anterior: k.previousValue, delta_pct: k.deltaPct }));
    } else {
      res.status(404).json({ error: "Tipo de export no válido" });
      return;
    }
    const csv = toCsv(rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="mips-connect-${type}.csv"`);
    res.send("\uFEFF" + csv);
  });

  post("/api/demo/reseed", async (_req, res) => {
    if (!allowReseed) {
      res.status(403).json({ error: "Regenerar datos no está permitido en este entorno" });
      return;
    }
    const result = await seedDatabase(true);
    res.json(result);
  });

  get("/api/demo/flags", (_req, res) => {
    res.json({ allowReseed });
  });

  post("/api/connector/events", async (req, res) => { res.json(await ingestEvent(req.body)); });
  post("/api/connector/heartbeat", async (req, res) => { res.json(await recordHeartbeat(req.body)); });

  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ error: "Ruta no encontrada" });
  });
  app.use((error: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) { res.destroy(); return; }
    const status = error instanceof z.ZodError ? 400 : [400, 401, 403, 404, 409, 429].includes(error.status ?? 0) ? error.status! : 500;
    if (status === 500) console.error(error);
    res.status(status).json({ error: status < 500 ? (error instanceof z.ZodError ? "Datos inválidos" : error.message) : "No se pudo completar la operación" });
  });
}
