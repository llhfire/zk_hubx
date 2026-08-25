-- B3：签约联动服务端化（ADR-0093）
-- 给已有 D1 补 projects / cases 表（与 schema.sql 对齐）。
-- 执行方式：wrangler d1 execute DB --file=migrations/0002_add_projects_cases.sql

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT,
  version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT,
  version INTEGER NOT NULL DEFAULT 0
);
