import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const restaurants = pgTable("restaurants", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/Mexico_City"),
  currency: text("currency").notNull().default("MXN"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  restaurantId: varchar("restaurant_id", { length: 64 })
    .notNull()
    .references(() => restaurants.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channels = pgTable(
  "channels",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    restaurantId: varchar("restaurant_id", { length: 64 })
      .notNull()
      .references(() => restaurants.id),
    type: text("type").notNull(),
    status: text("status").notNull(),
    lastEventAt: timestamp("last_event_at", { withTimezone: true }),
    configJson: jsonb("config_json"),
  },
  (t) => [index("channels_restaurant_idx").on(t.restaurantId)],
);

export const products = pgTable(
  "products",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    restaurantId: varchar("restaurant_id", { length: 64 })
      .notNull()
      .references(() => restaurants.id),
    name: text("name").notNull(),
    category: text("category").notNull(),
    basePrice: integer("base_price").notNull(),
    isStar: boolean("is_star").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_restaurant_idx").on(t.restaurantId),
    index("products_name_idx").on(t.name),
  ],
);

export const customers = pgTable(
  "customers",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    restaurantId: varchar("restaurant_id", { length: 64 })
      .notNull()
      .references(() => restaurants.id),
    displayName: text("display_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    segment: text("segment").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    attributedSpend: integer("attributed_spend").notNull().default(0),
    visitCount: integer("visit_count").notNull().default(0),
    reservationCount: integer("reservation_count").notNull().default(0),
    preferencesJson: jsonb("preferences_json"),
    channelsJson: jsonb("channels_json"),
  },
  (t) => [
    index("customers_restaurant_idx").on(t.restaurantId),
    index("customers_segment_idx").on(t.restaurantId, t.segment),
    index("customers_last_seen_idx").on(t.lastSeenAt),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    restaurantId: varchar("restaurant_id", { length: 64 })
      .notNull()
      .references(() => restaurants.id),
    channel: text("channel").notNull(),
    externalId: text("external_id").notNull(),
    status: text("status").notNull(),
    orderedAt: timestamp("ordered_at", { withTimezone: true }).notNull(),
    amount: integer("amount").notNull(),
    customerId: varchar("customer_id", { length: 64 }),
    mipsFolio: text("mips_folio"),
    cancelled: boolean("cancelled").notNull().default(false),
    cancelReason: text("cancel_reason"),
    errorFlag: boolean("error_flag").notNull().default(false),
  },
  (t) => [
    index("orders_restaurant_time_idx").on(t.restaurantId, t.orderedAt),
    index("orders_channel_idx").on(t.channel, t.status),
    index("orders_customer_idx").on(t.customerId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    orderId: varchar("order_id", { length: 64 })
      .notNull()
      .references(() => orders.id),
    productId: varchar("product_id", { length: 64 })
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    index("order_items_product_idx").on(t.productId),
  ],
);

export const orderModifiers = pgTable(
  "order_modifiers",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    orderItemId: varchar("order_item_id", { length: 64 })
      .notNull()
      .references(() => orderItems.id),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull().default(1),
  },
  (t) => [index("order_modifiers_item_idx").on(t.orderItemId)],
);

export const reservations = pgTable(
  "reservations",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    restaurantId: varchar("restaurant_id", { length: 64 })
      .notNull()
      .references(() => restaurants.id),
    externalId: text("external_id").notNull(),
    customerId: varchar("customer_id", { length: 64 }),
    partySize: integer("party_size").notNull(),
    reservedFor: timestamp("reserved_for", { withTimezone: true }).notNull(),
    bookedAt: timestamp("booked_at", { withTimezone: true }).notNull(),
    status: text("status").notNull(),
    mipsFolio: text("mips_folio"),
  },
  (t) => [
    index("reservations_restaurant_time_idx").on(t.restaurantId, t.reservedFor),
    index("reservations_status_idx").on(t.status),
    index("reservations_customer_idx").on(t.customerId),
  ],
);

export const whatsappConversations = pgTable(
  "whatsapp_conversations",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    restaurantId: varchar("restaurant_id", { length: 64 })
      .notNull()
      .references(() => restaurants.id),
    customerId: varchar("customer_id", { length: 64 }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    intent: text("intent").notNull(),
    converted: boolean("converted").notNull().default(false),
    convertedType: text("converted_type"),
    firstResponseSeconds: integer("first_response_seconds"),
    messageCount: integer("message_count").notNull(),
  },
  (t) => [
    index("wa_conv_restaurant_time_idx").on(t.restaurantId, t.startedAt),
    index("wa_conv_intent_idx").on(t.intent),
    index("wa_conv_customer_idx").on(t.customerId),
  ],
);

export const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    conversationId: varchar("conversation_id", { length: 64 })
      .notNull()
      .references(() => whatsappConversations.id),
    direction: text("direction").notNull(),
    templateId: varchar("template_id", { length: 64 }),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    bodyPreview: text("body_preview"),
  },
  (t) => [index("wa_msg_conversation_idx").on(t.conversationId)],
);

export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: varchar("id", { length: 64 }).primaryKey(),
  restaurantId: varchar("restaurant_id", { length: 64 })
    .notNull()
    .references(() => restaurants.id),
  name: text("name").notNull(),
  sent: integer("sent").notNull().default(0),
  delivered: integer("delivered").notNull().default(0),
  read: integer("read").notNull().default(0),
  replied: integer("replied").notNull().default(0),
});

export const posSales = pgTable(
  "pos_sales",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    restaurantId: varchar("restaurant_id", { length: 64 })
      .notNull()
      .references(() => restaurants.id),
    mipsFolio: text("mips_folio").notNull(),
    soldAt: timestamp("sold_at", { withTimezone: true }).notNull(),
    amount: integer("amount").notNull(),
    channelSource: text("channel_source"),
    orderId: varchar("order_id", { length: 64 }),
    customerId: varchar("customer_id", { length: 64 }),
  },
  (t) => [
    index("pos_sales_restaurant_time_idx").on(t.restaurantId, t.soldAt),
    index("pos_sales_folio_idx").on(t.mipsFolio),
  ],
);

export const integrationEvents = pgTable(
  "integration_events",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    restaurantId: varchar("restaurant_id", { length: 64 })
      .notNull()
      .references(() => restaurants.id),
    channel: text("channel").notNull(),
    externalId: text("external_id").notNull(),
    eventType: text("event_type").notNull(),
    eventStatus: text("event_status").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    mipsStatus: text("mips_status"),
    mipsFolio: text("mips_folio"),
    amount: integer("amount"),
    customerId: varchar("customer_id", { length: 64 }),
    rawMetadata: jsonb("raw_metadata"),
  },
  (t) => [
    index("events_restaurant_time_idx").on(t.restaurantId, t.occurredAt),
    index("events_channel_status_idx").on(t.channel, t.eventStatus),
  ],
);

export const syncEvents = pgTable(
  "sync_events",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    restaurantId: varchar("restaurant_id", { length: 64 })
      .notNull()
      .references(() => restaurants.id),
    channel: text("channel").notNull(),
    message: text("message").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    severity: text("severity").notNull(),
  },
  (t) => [index("sync_events_restaurant_time_idx").on(t.restaurantId, t.occurredAt)],
);

export const incidents = pgTable(
  "incidents",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    restaurantId: varchar("restaurant_id", { length: 64 })
      .notNull()
      .references(() => restaurants.id),
    channel: text("channel").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    status: text("status").notNull(),
  },
  (t) => [index("incidents_restaurant_time_idx").on(t.restaurantId, t.occurredAt)],
);

export type Restaurant = typeof restaurants.$inferSelect;
export type User = typeof users.$inferSelect;
export type Channel = typeof channels.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type WhatsappConversation = typeof whatsappConversations.$inferSelect;
export type IntegrationEvent = typeof integrationEvents.$inferSelect;
export type Incident = typeof incidents.$inferSelect;

export const authSessions = pgTable("auth_sessions", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull().references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export const connectorHealth = pgTable("connector_health", {
  id: varchar("id", { length: 64 }).primaryKey(),
  restaurantId: varchar("restaurant_id", { length: 64 }).notNull().references(() => restaurants.id),
  channel: text("channel").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
  status: text("status").notNull(),
  message: text("message").notNull(),
});
export const conversationStages = pgTable("conversation_stages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  restaurantId: varchar("restaurant_id", { length: 64 }).notNull().references(() => restaurants.id),
  conversationId: varchar("conversation_id", { length: 64 }).notNull().references(() => whatsappConversations.id),
  stage: text("stage").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  targetId: varchar("target_id", { length: 64 }),
});
