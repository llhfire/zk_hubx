CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT,
  version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT,
  version INTEGER NOT NULL DEFAULT 0
);

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

-- B3：签约联动服务端化（ADR-0093）——projects / cases 表
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

-- B5：员工/用户（β 前端 EmployeeContext 数据源）
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT,
  version INTEGER NOT NULL DEFAULT 0
);

-- B4：回款实收台账（期次计划仍在合同 JSON 的 paymentPlans）
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT,
  version INTEGER NOT NULL DEFAULT 0
);
