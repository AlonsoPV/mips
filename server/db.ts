import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { mkdirSync } from "node:fs";
import * as schema from "../shared/schema";
import { isProduction } from "./env";

type AppSchema = typeof schema;

export type AppDb =
  | ReturnType<typeof drizzlePg<AppSchema>>
  | ReturnType<typeof drizzlePglite<AppSchema>>;

let db: AppDb;
let pool: Pool | null = null;
let pglite: PGlite | null = null;
let usingPglite = false;

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS restaurants (
  id varchar(64) PRIMARY KEY,
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Mexico_City',
  currency text NOT NULL DEFAULT 'MXN',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  id varchar(64) PRIMARY KEY,
  restaurant_id varchar(64) NOT NULL REFERENCES restaurants(id),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS channels (
  id varchar(64) PRIMARY KEY,
  restaurant_id varchar(64) NOT NULL REFERENCES restaurants(id),
  type text NOT NULL,
  status text NOT NULL,
  last_event_at timestamptz,
  config_json jsonb
);
CREATE INDEX IF NOT EXISTS channels_restaurant_idx ON channels(restaurant_id);
CREATE TABLE IF NOT EXISTS products (
  id varchar(64) PRIMARY KEY,
  restaurant_id varchar(64) NOT NULL REFERENCES restaurants(id),
  name text NOT NULL,
  category text NOT NULL,
  base_price integer NOT NULL,
  is_star boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_restaurant_idx ON products(restaurant_id);
CREATE INDEX IF NOT EXISTS products_name_idx ON products(name);
CREATE TABLE IF NOT EXISTS customers (
  id varchar(64) PRIMARY KEY,
  restaurant_id varchar(64) NOT NULL REFERENCES restaurants(id),
  display_name text NOT NULL,
  email text,
  phone text,
  segment text NOT NULL,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  attributed_spend integer NOT NULL DEFAULT 0,
  visit_count integer NOT NULL DEFAULT 0,
  reservation_count integer NOT NULL DEFAULT 0,
  preferences_json jsonb,
  channels_json jsonb
);
CREATE INDEX IF NOT EXISTS customers_restaurant_idx ON customers(restaurant_id);
CREATE INDEX IF NOT EXISTS customers_segment_idx ON customers(restaurant_id, segment);
CREATE INDEX IF NOT EXISTS customers_last_seen_idx ON customers(last_seen_at);
CREATE TABLE IF NOT EXISTS orders (
  id varchar(64) PRIMARY KEY,
  restaurant_id varchar(64) NOT NULL REFERENCES restaurants(id),
  channel text NOT NULL,
  external_id text NOT NULL,
  status text NOT NULL,
  ordered_at timestamptz NOT NULL,
  amount integer NOT NULL,
  customer_id varchar(64),
  mips_folio text,
  cancelled boolean NOT NULL DEFAULT false,
  cancel_reason text,
  error_flag boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS orders_restaurant_time_idx ON orders(restaurant_id, ordered_at);
CREATE INDEX IF NOT EXISTS orders_channel_idx ON orders(channel, status);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id);
CREATE TABLE IF NOT EXISTS order_items (
  id varchar(64) PRIMARY KEY,
  order_id varchar(64) NOT NULL REFERENCES orders(id),
  product_id varchar(64) NOT NULL REFERENCES products(id),
  quantity integer NOT NULL,
  unit_price integer NOT NULL,
  line_total integer NOT NULL
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items(product_id);
CREATE TABLE IF NOT EXISTS order_modifiers (
  id varchar(64) PRIMARY KEY,
  order_item_id varchar(64) NOT NULL REFERENCES order_items(id),
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS order_modifiers_item_idx ON order_modifiers(order_item_id);
CREATE TABLE IF NOT EXISTS reservations (
  id varchar(64) PRIMARY KEY,
  restaurant_id varchar(64) NOT NULL REFERENCES restaurants(id),
  external_id text NOT NULL,
  customer_id varchar(64),
  party_size integer NOT NULL,
  reserved_for timestamptz NOT NULL,
  booked_at timestamptz NOT NULL,
  status text NOT NULL,
  mips_folio text
);
CREATE INDEX IF NOT EXISTS reservations_restaurant_time_idx ON reservations(restaurant_id, reserved_for);
CREATE INDEX IF NOT EXISTS reservations_status_idx ON reservations(status);
CREATE INDEX IF NOT EXISTS reservations_customer_idx ON reservations(customer_id);
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id varchar(64) PRIMARY KEY,
  restaurant_id varchar(64) NOT NULL REFERENCES restaurants(id),
  customer_id varchar(64),
  started_at timestamptz NOT NULL,
  intent text NOT NULL,
  converted boolean NOT NULL DEFAULT false,
  converted_type text,
  first_response_seconds integer,
  message_count integer NOT NULL
);
CREATE INDEX IF NOT EXISTS wa_conv_restaurant_time_idx ON whatsapp_conversations(restaurant_id, started_at);
CREATE INDEX IF NOT EXISTS wa_conv_intent_idx ON whatsapp_conversations(intent);
CREATE INDEX IF NOT EXISTS wa_conv_customer_idx ON whatsapp_conversations(customer_id);
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id varchar(64) PRIMARY KEY,
  conversation_id varchar(64) NOT NULL REFERENCES whatsapp_conversations(id),
  direction text NOT NULL,
  template_id varchar(64),
  sent_at timestamptz NOT NULL,
  delivered_at timestamptz,
  read_at timestamptz,
  body_preview text
);
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS replied_at timestamptz;
CREATE INDEX IF NOT EXISTS wa_msg_conversation_idx ON whatsapp_messages(conversation_id);
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id varchar(64) PRIMARY KEY,
  restaurant_id varchar(64) NOT NULL REFERENCES restaurants(id),
  name text NOT NULL,
  sent integer NOT NULL DEFAULT 0,
  delivered integer NOT NULL DEFAULT 0,
  read integer NOT NULL DEFAULT 0,
  replied integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS pos_sales (
  id varchar(64) PRIMARY KEY,
  restaurant_id varchar(64) NOT NULL REFERENCES restaurants(id),
  mips_folio text NOT NULL,
  sold_at timestamptz NOT NULL,
  amount integer NOT NULL,
  channel_source text,
  order_id varchar(64),
  customer_id varchar(64)
);
CREATE INDEX IF NOT EXISTS pos_sales_restaurant_time_idx ON pos_sales(restaurant_id, sold_at);
CREATE INDEX IF NOT EXISTS pos_sales_folio_idx ON pos_sales(mips_folio);
CREATE TABLE IF NOT EXISTS integration_events (
  id varchar(64) PRIMARY KEY,
  restaurant_id varchar(64) NOT NULL REFERENCES restaurants(id),
  channel text NOT NULL,
  external_id text NOT NULL,
  event_type text NOT NULL,
  event_status text NOT NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  processed_at timestamptz,
  mips_status text,
  mips_folio text,
  amount integer,
  customer_id varchar(64),
  raw_metadata jsonb
);
CREATE INDEX IF NOT EXISTS events_restaurant_time_idx ON integration_events(restaurant_id, occurred_at);
CREATE INDEX IF NOT EXISTS events_channel_status_idx ON integration_events(channel, event_status);
CREATE TABLE IF NOT EXISTS sync_events (
  id varchar(64) PRIMARY KEY,
  restaurant_id varchar(64) NOT NULL REFERENCES restaurants(id),
  channel text NOT NULL,
  message text NOT NULL,
  occurred_at timestamptz NOT NULL,
  severity text NOT NULL
);
CREATE INDEX IF NOT EXISTS sync_events_restaurant_time_idx ON sync_events(restaurant_id, occurred_at);
CREATE TABLE IF NOT EXISTS incidents (
  id varchar(64) PRIMARY KEY,
  restaurant_id varchar(64) NOT NULL REFERENCES restaurants(id),
  channel text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  occurred_at timestamptz NOT NULL,
  resolved_at timestamptz,
  status text NOT NULL
);
CREATE INDEX IF NOT EXISTS incidents_restaurant_time_idx ON incidents(restaurant_id, occurred_at);
CREATE TABLE IF NOT EXISTS auth_sessions (
 token_hash varchar(64) PRIMARY KEY, user_id varchar(64) NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);
CREATE TABLE IF NOT EXISTS connector_health (
 id varchar(64) PRIMARY KEY, restaurant_id varchar(64) NOT NULL REFERENCES restaurants(id), channel text NOT NULL,
 checked_at timestamptz NOT NULL, status text NOT NULL, message text NOT NULL
);
CREATE TABLE IF NOT EXISTS conversation_stages (
 id varchar(64) PRIMARY KEY, restaurant_id varchar(64) NOT NULL REFERENCES restaurants(id),
 conversation_id varchar(64) NOT NULL REFERENCES whatsapp_conversations(id), stage text NOT NULL,
 occurred_at timestamptz NOT NULL, target_id varchar(64)
);
CREATE INDEX IF NOT EXISTS conversation_stages_time_idx ON conversation_stages(restaurant_id, occurred_at);
CREATE TABLE IF NOT EXISTS session (
  sid varchar PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session(expire);
`;

export async function initDb(): Promise<AppDb> {
  if (db) return db;
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    pool = new Pool({
      connectionString: url,
      ssl: isProduction ? { rejectUnauthorized: true } : false,
      max: 8,
    });
    db = drizzlePg(pool, { schema });
    usingPglite = false;
    await pool.query(CREATE_SQL);
  } else {
    mkdirSync("data", { recursive: true });
    pglite = new PGlite(process.env.PGLITE_PATH || "data/pglite");
    await pglite.waitReady;
    db = drizzlePglite(pglite, { schema });
    usingPglite = true;
    await pglite.exec(CREATE_SQL);
  }
  return db;
}

export function getDb(): AppDb {
  if (!db) throw new Error("La base de datos no está inicializada");
  return db;
}

export function getPool(): Pool | null {
  return pool;
}

export function isPglite(): boolean {
  return usingPglite;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  await pglite?.close();
}
