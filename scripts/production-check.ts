import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
process.env.APP_MODE = "live";
await import("../server/env");
process.env.DATABASE_URL = "";
process.env.PGLITE_PATH = "memory://";
const { initDb, closeDb } = await import("../server/db");
const { hashPassword } = await import("../server/auth");
const { registerRoutes } = await import("../server/routes");
const { restaurants, users, customers, integrationEvents, orders, connectorHealth, authSessions } = await import("../shared/schema");
const { eq, count } = await import("drizzle-orm");
const { parsePeriod } = await import("../server/period");
const { eveningOpportunity } = await import("../server/insights/demand");
const db = await initDb();
const password = "test-only-strong-password";
const passwordHash = await hashPassword(password);
await db.insert(restaurants).values([{ id: "tenant_a", name: "Restaurante A" }, { id: "tenant_b", name: "Restaurante B" }]);
await db.insert(users).values([{ id: "user_a", restaurantId: "tenant_a", email: "a@example.test", passwordHash, role: "owner" }, { id: "user_b", restaurantId: "tenant_b", email: "b@example.test", passwordHash, role: "viewer" }]);
const keys = ["uber_eats", "mips", "whatsapp", "opentable"].map(channel => ({ restaurantId: "tenant_a", channel, token: `test-only-long-connector-token-${channel}` }));
process.env.CONNECTOR_KEYS = JSON.stringify(keys);
const app = express(); app.use(express.json()); registerRoutes(app);
const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
const address = server.address(); assert(address && typeof address !== "string");
const base = `http://127.0.0.1:${address.port}`;
let checks = 0;
async function request(path: string, status: number, init: RequestInit = {}) {
 const res = await fetch(base + path, init); assert.equal(res.status, status, `${path}: ${res.status}`); checks++; return res;
}
const asUser = (cookie: string) => ({ headers: { cookie } });
async function login(email: string) {
 const res = await request("/api/auth/login", 200, { method: "POST", headers: { origin: base, "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
 return res.headers.get("set-cookie")!.split(";")[0]!;
}
const at = new Date(Date.now() - 60000).toISOString();
const event = (channel: string, event_type: string, event_id: string, payload: unknown) => ({ channel, event_type, event_id, payload, payload_version: "1", created_at: at });
async function ingest(body: ReturnType<typeof event>, status = 200, tokenChannel = body.channel) {
 const token = keys.find(k => k.channel === tokenChannel)!.token;
 return request("/api/connector/events", status, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
}
try {
 await request("/api/dashboard/summary", 401);
 await request("/api/export/clientes", 401);
 await request("/api/connector/events", 401, { method: "POST" });
 await request("/api/auth/login", 403, { method: "POST", headers: { origin: "https://foreign.example" } });
 const a = await login("a@example.test"); const b = await login("b@example.test");
 const who = await (await request("/api/auth/me", 200, asUser(b))).json(); assert.equal(who.restaurantName, "Restaurante B");
 await request("/api/demo/reseed", 403, { method: "POST", headers: { cookie: a, origin: base } });
 const order = event("uber_eats", "order", "order-event", { external_id: "order-1", status: "confirmed", amount: 2000, items: [{ product_id: "p1", name: "Producto", quantity: 2, unit_price: 1000 }] });
 const responses = await Promise.all([ingest(order), ingest(order)]);
 const values = await Promise.all(responses.map(r => r.json())); assert.notEqual(values[0].duplicate, values[1].duplicate); assert.equal(values[0].mips_folio, null);
 await ingest({ ...order, payload: { ...order.payload as object, amount: 3000 } }, 409);
 await ingest(order, 403, "mips");
 const before = await (await request("/api/uber/summary", 200, asUser(a))).json(); assert.equal(before.kpis[1].value, 0); assert.equal(before.kpis[0].value, 1);
 const confirm = event("mips", "pos_confirmation", "pos-1", { order_external_id: "order-1", folio: "POS-123", amount: 2000 });
 await ingest({ ...confirm, event_id: "bad-pos", payload: { order_external_id: "order-1", folio: "POS-123", amount: 1900 } }, 409);
 await ingest(confirm);
 await ingest({ ...confirm, event_id: "different-folio", payload: { order_external_id: "order-1", folio: "OTHER-FOLIO", amount: 2000 } }, 409);
 const after = await (await request("/api/uber/summary", 200, asUser(a))).json(); assert.equal(after.kpis[1].value, 2000); assert.equal(after.topProducts[0].sales, 2000);
 const isolated = await (await request("/api/uber/summary", 200, asUser(b))).json(); assert.equal(isolated.kpis[0].value, 0);
 await ingest(event("uber_eats", "order", "cancelled-event", { external_id: "cancelled", status: "cancelled", amount: 1000, items: [{ product_id: "p1", name: "Producto", quantity: 1, unit_price: 1000 }] }));
 const stats = await (await request("/api/uber/summary", 200, asUser(a))).json(); assert.equal(stats.byDay.reduce((s: number, d: { orders: number }) => s + d.orders, 0), stats.kpis[0].value); assert.equal(stats.topProducts[0].sales, 2000);
 // Failure after envelope insertion must roll back both the event and domain mutations.
 const [failed] = await db.select({ n: count() }).from(integrationEvents).where(eq(integrationEvents.externalId, "bad-pos")); assert.equal(failed.n, 0);
 const [realOrder] = await db.select().from(orders).where(eq(orders.externalId, "order-1")); assert.equal(realOrder.mipsFolio, "POS-123");
 for (let start = 0; start < 1001; start += 200) await db.insert(customers).values(Array.from({ length: Math.min(200, 1001 - start) }, (_, i) => ({ id: `a-c-${String(start + i).padStart(4, "0")}`, restaurantId: "tenant_a", displayName: `Cliente ${start + i}`, segment: "nuevos", firstSeenAt: new Date(at), lastSeenAt: new Date(at) })));
 await request("/api/customers/a-c-0000", 404, asUser(b));
 const customerCsv = await (await request("/api/export/clientes", 200, asUser(a))).text(); assert.equal(customerCsv.trim().split("\n").length, 1002);
 const customerPage = await (await request("/api/customers?offset=1000", 200, asUser(a))).json(); assert.equal(customerPage.rows.length, 1); assert.equal(customerPage.nextOffset, null);
 const otherCsv = await (await request("/api/export/clientes", 200, asUser(b))).text(); assert.equal(otherCsv.trim().split("\n").length, 1);
 await db.insert(integrationEvents).values(Array.from({ length: 205 }, (_, i) => ({ id: `bulk-${String(i).padStart(4, "0")}`, restaurantId: "tenant_a", channel: "uber_eats", eventType: "order", externalId: `bulk-${i}`, eventStatus: "confirmed", occurredAt: new Date(at), receivedAt: new Date(at) })));
 const report = await (await request("/api/reports/conciliacion?range=7d", 200, asUser(a))).json(); assert.equal(report.recent.length, 100); assert.equal(report.total, 208);
 const last = await (await request("/api/reports/conciliacion?range=7d&offset=200", 200, asUser(a))).json(); assert.equal(last.recent.length, 8); assert.equal(last.nextOffset, null);
 const csv = await (await request("/api/export/conciliacion?range=7d", 200, asUser(a))).text(); assert.equal(csv.trim().split("\n").length, 209);
 const empty = await (await request("/api/reports/conciliacion?from=2000-01-01&to=2000-01-02", 200, asUser(a))).json(); assert.equal(empty.total, 0);
 await ingest(event("whatsapp", "conversation", "conv-event", { external_id: "conv-1", intent: "pedido" }));
 await ingest(event("whatsapp", "conversation_stage", "stage-1", { conversation_external_id: "conv-1", stage: "intent" }));
 await ingest(event("whatsapp", "conversation_stage", "stage-2", { conversation_external_id: "conv-1", stage: "conversion", target_type: "order", target_external_id: "order-1" }));
 await ingest(event("whatsapp", "message", "message-1", { external_id: "msg-1", conversation_external_id: "conv-1", direction: "out", template_name: "Confirmación", read_at: at, delivered_at: at, replied_at: at }));
 const wa = await (await request("/api/whatsapp/summary", 200, asUser(a))).json(); assert.equal(wa.templates[0].sent, 1); assert.equal(wa.templates[0].read, 1); assert.equal(wa.observedStages.length, 2);
 await ingest(event("whatsapp", "message", "message-2", { external_id: "msg-2", conversation_external_id: "conv-1", direction: "out", template_name: "Confirmación" }));
 await ingest(event("whatsapp", "message_status", "status-2", { message_external_id: "msg-2", status: "read" }));
 const updatedWa = await (await request("/api/whatsapp/summary", 200, asUser(a))).json(); assert.equal(updatedWa.templates[0].sent, 2); assert.equal(updatedWa.templates[0].read, 2);
 const oldWa = await (await request("/api/whatsapp/summary?from=2000-01-01&to=2000-01-02", 200, asUser(a))).json(); assert.equal(oldWa.templates.length, 0);
 const noHeartbeat = await (await request("/api/hub/health", 200, asUser(a))).json(); assert.equal(noHeartbeat.integrations.uber_eats.status, "idle");
 await request("/api/connector/heartbeat", 200, { method: "POST", headers: { authorization: `Bearer ${keys[0]!.token}`, "content-type": "application/json" }, body: JSON.stringify({ status: "connected", message: "Conector disponible" }) });
 const health = await (await request("/api/hub/health", 200, asUser(a))).json(); assert.equal(health.integrations.uber_eats.status, "connected");
 await db.update(connectorHealth).set({ checkedAt: new Date(Date.now() - 180000) });
 const stale = await (await request("/api/hub/health", 200, asUser(a))).json(); assert.equal(stale.integrations.uber_eats.status, "attention");
 const heat = await (await request("/api/dashboard/heatmap", 200, asUser(a))).json(); assert.equal(heat.cells.length, 168);
 await request("/api/dashboard/summary?from=2026-02-31&to=2026-03-03", 400, asUser(a));
 const period = parsePeriod({ from: "2026-10-01", to: "2026-10-01" }); assert.equal(period.to.getTime() - period.from.getTime(), 86400000 - 1); assert.equal(period.from.toISOString(), "2026-10-01T06:00:00.000Z");
 const unequal = parsePeriod({ from: "2026-09-01", to: "2026-09-30" });
 const { mexicoParts, addDays, startOfMexicoDay } = await import("../shared/time");
 const exposures = Array(7).fill(0); for (let d = startOfMexicoDay(unequal.from); d <= unequal.to; d = addDays(d, 1)) exposures[mexicoParts(d).weekday]++;
 const cells = exposures.map((n, dow) => ({ dow, hour: 18, total: n * 10 })); assert.equal(eveningOpportunity(cells, unequal), null); assert.equal(eveningOpportunity(cells, period), null);
 const timings: number[] = [];
 for (let i = 0; i < 5; i++) { const start = performance.now(); await request("/api/dashboard/insights?range=30d", 200, asUser(a)); timings.push(Math.round(performance.now() - start)); }
 console.log("Insights ms (PGlite, 1001 clientes, 208 eventos + WA):", timings.join(", "));
 await request("/api/auth/logout", 200, { method: "POST", headers: { cookie: a, origin: base } }); await request("/api/dashboard/summary", 401, asUser(a));
 await db.update(authSessions).set({ expiresAt: new Date(0) }); await request("/api/dashboard/summary", 401, asUser(b));
 console.log(`PASS: ${checks} HTTP checks; tenant isolation, sessions, CSRF, transactional connector, POS reconciliation, complete exports, observed WA stages, heartbeat expiry, 24h heatmap and normalized demand.`);
} finally { await new Promise<void>(resolve => server.close(() => resolve())); await closeDb(); }
