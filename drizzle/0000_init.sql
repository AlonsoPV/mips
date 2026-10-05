-- Míps Connect initial schema (PostgreSQL)
-- Aplicado también en runtime por server/db.ts (CREATE TABLE IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS restaurants (
  id varchar(64) PRIMARY KEY,
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Mexico_City',
  currency text NOT NULL DEFAULT 'MXN',
  created_at timestamptz NOT NULL DEFAULT now()
);
