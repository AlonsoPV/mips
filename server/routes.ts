import type { Express, Request, Response } from "express";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { users } from "../shared/schema";
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
import { getDb } from "./db";
import { allowReseed } from "./env";
import { buildInsights, marketingOpportunities } from "./insights/engine";
import { requireAuth } from "./middleware";
import { parsePeriod } from "./period";
import { seedDatabase } from "./seed";
import { integrationEvents } from "../shared/schema";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const connectorSchema = z.object({
  event_id: z.string().min(1),
  channel: z.string().min(1),
  event_type: z.string().min(1),
  payload_version: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  created_at: z.string().min(1),
});

function periodFrom(req: Request) {
  return parsePeriod({
    from: typeof req.query.from === "string" ? req.query.from : undefined,
    to: typeof req.query.to === "string" ? req.query.to : undefined,
    range: typeof req.query.range === "string" ? req.query.range : undefined,
  });
}

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  return [headers.join(","), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","))].join("\n");
}

export function registerRoutes(app: Express) {
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "mips-connect" });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      res.json({ user: null });
      return;
    }
    const restaurant = await restaurantInfo();
    res.json({
      user: {
        id: req.session.userId,
        email: req.session.email,
        restaurantId: req.session.restaurantId,
        restaurantName: restaurant?.name ?? "Restaurante Demo",
      },
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos inválidos" });
      return;
    }
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email.toLowerCase())).limit(1);
    if (!user) {
      res.status(401).json({ error: "Credenciales incorrectas" });
      return;
    }
    const ok = await compare(parsed.data.password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Credenciales incorrectas" });
      return;
    }
    req.session.userId = user.id;
    req.session.restaurantId = user.restaurantId;
    req.session.email = user.email;
    res.json({ ok: true, email: user.email });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  const authed = [requireAuth];

  app.get("/api/dashboard/summary", ...authed, async (req, res) => {
    res.json(await dashboardSummary(periodFrom(req)));
  });

  app.get("/api/dashboard/insights", ...authed, async (req, res) => {
    res.json(await buildInsights(periodFrom(req)));
  });

  app.get("/api/dashboard/heatmap", ...authed, async (req, res) => {
    res.json(await demandHeatmap(periodFrom(req)));
  });

  app.get("/api/channels", ...authed, async (req, res) => {
    const summary = await dashboardSummary(periodFrom(req));
    res.json(summary.channels);
  });

  app.get("/api/uber/summary", ...authed, async (req, res) => {
    res.json(await uberSummary(periodFrom(req)));
  });

  app.get("/api/opentable/summary", ...authed, async (req, res) => {
    res.json(await opentableSummary(periodFrom(req)));
  });

  app.get("/api/whatsapp/summary", ...authed, async (req, res) => {
    res.json(await whatsappSummary(periodFrom(req)));
  });

  app.get("/api/customers/summary", ...authed, async (req, res) => {
    res.json(await customersSummary(periodFrom(req)));
  });

  app.get("/api/customers/:id", ...authed, async (req, res) => {
    const row = await customerDetail(req.params.id);
    if (!row) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    const { ...safe } = row;
    res.json(safe);
  });

  app.get("/api/marketing/opportunities", ...authed, async (req, res) => {
    res.json(await marketingOpportunities(periodFrom(req)));
  });

  app.get("/api/reports/:report", ...authed, async (req, res) => {
    const data = await reportData(req.params.report, periodFrom(req));
    if (!data) {
      res.status(404).json({ error: "Reporte no encontrado" });
      return;
    }
    res.json(data);
  });

  app.get("/api/hub/health", ...authed, async (_req, res) => {
    res.json(await hubHealth());
  });

  app.get("/api/hub/events", ...authed, async (req, res) => {
    const limit = Number(req.query.limit ?? 40);
    res.json(await hubEvents(Math.min(100, Math.max(1, limit))));
  });

  app.get("/api/export/:type", ...authed, async (req, res) => {
    const type = req.params.type;
    const period = periodFrom(req);
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
      const data = await uberSummary(period);
      rows = data.topProducts.map((p) => ({ producto: p.name, cantidad: p.quantity, ventas_centavos: p.sales, ticket: p.ticket }));
    } else if (type === "clientes") {
      const data = await customersSummary(period);
      rows = data.sample.map((c) => ({ nombre: c.displayName, segmento: c.segment, visitas: c.visitCount, gasto_centavos: c.attributedSpend }));
    } else if (type === "demanda") {
      const data = await demandHeatmap(period);
      rows = data.cells.map((c) => ({ dia: c.dow, hora: c.hour, uber: c.uber, opentable: c.ot, whatsapp: c.wa, total: c.total }));
    } else if (type === "ejecutivo") {
      const data = await dashboardSummary(period);
      rows = data.kpis.map((k) => ({ kpi: k.label, valor: k.value, anterior: k.previousValue, delta_pct: k.deltaPct }));
    } else if (type === "conciliacion") {
      const data = await hubHealth();
      rows = data.recent.map((e) => ({
        hora: e.occurredAt.toISOString(),
        canal: e.channel,
        tipo: e.eventType,
        id: e.externalId,
        estado: e.eventStatus,
        folio: e.mipsFolio ?? "",
      }));
    } else {
      res.status(404).json({ error: "Tipo de export no válido" });
      return;
    }
    const csv = toCsv(rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="mips-connect-${type}.csv"`);
    res.send("\uFEFF" + csv);
  });

  app.post("/api/demo/reseed", ...authed, async (_req, res) => {
    if (!allowReseed) {
      res.status(403).json({ error: "Regenerar datos no está permitido en este entorno" });
      return;
    }
    const result = await seedDatabase(true);
    res.json(result);
  });

  app.get("/api/demo/flags", ...authed, (_req, res) => {
    res.json({ allowReseed });
  });

  app.post("/api/connector/events", ...authed, async (req, res) => {
    const parsed = connectorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ status: "failed", error: "Payload inválido", mips_folio: null });
      return;
    }
    const db = getDb();
    const folio =
      parsed.data.event_type === "order" || parsed.data.event_type === "sale"
        ? `M-${Date.now().toString().slice(-6)}`
        : null;
    await db.insert(integrationEvents).values({
      id: `evt_live_${parsed.data.event_id}`.slice(0, 64),
      restaurantId: req.session.restaurantId ?? "rst_demo",
      channel: parsed.data.channel,
      externalId: parsed.data.event_id,
      eventType: parsed.data.event_type,
      eventStatus: "confirmed",
      occurredAt: new Date(parsed.data.created_at),
      receivedAt: new Date(),
      processedAt: new Date(),
      mipsStatus: folio ? "posted" : null,
      mipsFolio: folio,
      amount: typeof parsed.data.payload.amount === "number" ? parsed.data.payload.amount : null,
      customerId: null,
      rawMetadata: { payload_version: parsed.data.payload_version, demo: true },
    });
    res.json({ status: "processed", mips_folio: folio, error: null });
  });

  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ error: "Ruta no encontrada" });
  });
}
