-- 0002: B2 线索域接缝 —— 新增 leads / lead_followups / lead_transfers 表。
-- 全新库直接用 schema.sql；已按旧 schema 初始化的 D1（本地或线上）执行本文件补齐。
-- 执行：npx wrangler d1 execute zkhubx-db --file apps/api/migrations/0002_add_leads.sql --remote
--      （本地联调库去掉 --remote）
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT,
  version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lead_followups (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS lead_transfers (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT
);