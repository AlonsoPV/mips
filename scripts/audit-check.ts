import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
process.env.APP_MODE = "demo";
await import("../server/env");

// Never touch the developer's persisted database.
process.env.DATABASE_URL = "";
process.env.PGLITE_PATH = "memory://";
process.env.CONNECTOR_KEYS = JSON.stringify([{ token: "audit-connector-key-32-characters-long", restaurantId: "rst_demo", channel: "uber_eats" }]);
const { initDb, closeDb, getDb } = await import("../server/db");
const { seedDatabase } = await import("../server/seed");
const { registerRoutes } = await import("../server/routes");
const { parsePeriod } = await import("../server/period");
const { whatsappConversations, integrationEvents, syncEvents } = await import("../shared/schema");
const { eq, count } = await import("drizzle-orm");
await initDb();
await seedDatabase(false);
const app = express();
app.use(express.json());
registerRoutes(app);
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert(address && typeof address !== "string");
const base = `http://127.0.0.1:${address.port}`;
let checks = 0;
async function get(path: string, status = 200) {
  const res = await fetch(base + path);
  assert.equal(res.status, status, path);
  const data = await res.json();
  checks++;
  return data;
}
try {
  for (const path of ["/api/dashboard/summary", "/api/dashboard/insights", "/api/dashboard/heatmap", "/api/uber/summary", "/api/opentable/summary", "/api/whatsapp/summary", "/api/customers/summary", "/api/marketing/opportunities", "/api/hub/health", "/api/hub/events", "/api/reports/ejecutivo"]) await get(path);
  for (const query of ["from=bad&to=bad", "from=2026-10-06&to=2026-10-01", "from=2026-10-01"]) await get(`/api/dashboard/summary?${query}`, 400);
  for (const limit of ["abc", "-1", "1.5", "Infinity"]) await get(`/api/hub/events?limit=${limit}`, 400);
  await get("/api/customers/does-not-exist", 404);
  const context = await get("/api/demo/context");
  assert.equal(context.mode, "demo");
  const publicResponse = await fetch(base + "/api/dashboard/summary");
  assert.equal(publicResponse.headers.get("set-cookie"), null);
  await get("/api/auth/me");
  assert.equal((await fetch(base + "/api/auth/login", { method: "POST", headers: { origin: base } })).status, 404);
  const wa = await get("/api/whatsapp/summary");
  assert.deepEqual(Object.keys(wa.funnel).sort(), ["conversacion", "conversion"]);
  assert.equal(wa.funnel.conversacion, wa.kpis.find((k: { label: string }) => k.label === "Conversaciones").value);
  assert.equal(wa.funnel.conversion, wa.kpis.find((k: { label: string }) => k.label === "Solicitudes convertidas").value);
  const customersNow = await get("/api/customers/summary?range=today");
  const customersOld = await get("/api/customers/summary?from=2000-01-01&to=2000-01-02");
  assert.equal(customersNow.scope, "cumulative");
  assert.deepEqual(customersNow, customersOld);
  const { productOpportunity } = await import("../server/insights/products");
  const evidence = { productId: "unrelated-name", name: "Ensalada de temporada", sales: 50000, orderCount: 10, ticket: 15000 };
  assert.equal(productOpportunity([{ ...evidence, orderCount: 9 }], 10000), null);
  assert.equal(productOpportunity([{ ...evidence, ticket: 10000 }], 10000), null);
  assert.equal(productOpportunity([evidence], 0), null);
  assert.equal(productOpportunity([evidence], 10000)?.metric, evidence.name);
  const health = await get("/api/hub/health");
  const [confirmed] = await getDb().select({ n: count() }).from(integrationEvents).where(eq(integrationEvents.eventStatus, "confirmed"));
  assert.equal(health.processed, confirmed.n);
  assert.equal(health.availability, null);
  for (const type of ["uber", "opentable", "whatsapp", "productos", "clientes", "demanda", "ejecutivo", "conciliacion"]) {
    const res = await fetch(`${base}/api/export/${type}`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/csv/);
    assert((await res.text()).length > 0);
  }
  const empty = await get("/api/dashboard/insights?from=2000-01-01&to=2000-01-02");
  assert.match(empty.subtitle, /No hay actividad/);
  await getDb().update(whatsappConversations).set({ intent: "menu" });
  await get("/api/dashboard/insights"); // Previously crashed when reservations intent was absent.
  const event = { event_id: "audit-retry", channel: "uber_eats", event_type: "order", payload_version: "1", payload: { external_id: "audit-order", status: "confirmed", amount: 1000, items: [{ product_id: "audit-product", name: "Producto de prueba", quantity: 1, unit_price: 1000 }] }, created_at: new Date().toISOString() };
  const post = (body: unknown) => fetch(base + "/api/connector/events", { method: "POST", headers: { "Content-Type": "application/json", authorization: "Bearer audit-connector-key-32-characters-long" }, body: JSON.stringify(body) });
  const replies = await Promise.all([post(event), post(event)]);
  for (const reply of replies) assert.equal(reply.status, 200);
  const first = await replies[0].json();
  const second = await replies[1].json();
  assert.equal(first.status, second.status);
  assert.equal(first.mips_folio, null);
  assert.notEqual(first.duplicate, second.duplicate);
  const [total] = await getDb().select({ n: count() }).from(integrationEvents).where(eq(integrationEvents.externalId, event.event_id));
  assert.equal(total.n, 1);
  for (const patch of [{ created_at: "invalid" }, { channel: "unknown" }, { payload: { amount: -1 } }, { payload: { amount: 1.5 } }]) assert.equal((await post({ ...event, ...patch })).status, 400);
  await getDb().delete(syncEvents);
  const noSync = await get("/api/hub/health");
  assert.equal(noSync.lastSyncAgoSeconds, null);
  const p = parsePeriod({ range: "7d" });
  assert(p.previousTo < p.from);
  assert.equal(p.to.getTime() - p.from.getTime(), p.previousTo.getTime() - p.previousFrom.getTime());
  console.log(`PASS: ${checks} HTTP reads, concurrent connector retries, 4 invalid payloads and period boundaries. Isolated in-memory database.`);
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await closeDb();
}
