-- 0001_init.sql · Esquema D1 de la PREVIEW de VANTSNET (FASE F).
-- Espejo SQLite de los modelos User y ProviderIdentity del contrato Prisma
-- (src/prisma/contract.prisma). SOLO toca la D1 aislada vants-preview-db;
-- la D1 de producción vants-db es intocable.
-- La sincronización de identidades es idempotente gracias a
-- UNIQUE(provider, provider_id) — igual que @@unique del contrato.

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,                          -- cuid2 generado en app
  display_name TEXT NOT NULL,
  created_at   TEXT NOT NULL,                             -- ISO-8601 UTC
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS provider_identities (
  id           TEXT PRIMARY KEY,                          -- cuid2 generado en app
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL,                             -- discord | faceit | riot | steam
  provider_id  TEXT NOT NULL,
  display_name TEXT,
  avatar_url   TEXT,
  raw_json     TEXT,                                      -- última respuesta del proveedor (referencia)
  last_sync_at TEXT,
  created_at   TEXT NOT NULL,
  UNIQUE (provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_identities_user ON provider_identities(user_id);
