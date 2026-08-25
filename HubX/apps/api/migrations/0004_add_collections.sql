-- B4：回款实收台账（与 schema.sql 对齐）。
-- 执行：npx wrangler d1 execute zkhubx-db --file apps/api/migrations/0003_add_collections.sql --remote

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT,
  version INTEGER NOT NULL DEFAULT 0
);
