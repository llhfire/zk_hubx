-- ═══════════════════════════════════════════════════════════════════════════════
-- ZK HubX Supabase (PostgreSQL) 数据库初始化与迁移脚本
-- 适用范围：ZK HubX β版 后端存储底座
-- 特性：
--   1. 9 大核心领域表文档式存储（JSONB + version 乐观锁 + updated_at 服务端时钟）
--   2. JSONB 提取索引优化（leadId, contractId, projectId 等高频查询）
--   3. 启用 RLS 并配置服务端与网关完全访问策略
--   4. 包含默认种子数据（q-seed-1 初始报价）
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. 报价表 (Quotes)
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 0
);

-- 2. 合同表 (Contracts)
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 0
);

-- 3. 线索表 (Leads)
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 0
);

-- 4. 线索跟进记录表 (Lead Followups)
CREATE TABLE IF NOT EXISTS lead_followups (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 线索流转记录表 (Lead Transfers)
CREATE TABLE IF NOT EXISTS lead_transfers (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 交付项目表 (Projects)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 0
);

-- 7. 业务单/商机表 (Cases)
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 0
);

-- 8. 员工档案与用户表 (Employees)
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 0
);

-- 9. 回款实收台账表 (Collections)
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 0
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 索引配置 (加速高频跨表关联与 JSONB 查询)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_projects_lead_id ON projects ((data->>'leadId'));
CREATE INDEX IF NOT EXISTS idx_cases_lead_id ON cases ((data->>'leadId'));
CREATE INDEX IF NOT EXISTS idx_contracts_lead_id ON contracts ((data->>'leadId'));
CREATE INDEX IF NOT EXISTS idx_collections_contract_id ON collections ((data->>'contractId'));
CREATE INDEX IF NOT EXISTS idx_collections_project_id ON collections ((data->>'projectId'));
CREATE INDEX IF NOT EXISTS idx_lead_followups_lead_id ON lead_followups (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_transfers_lead_id ON lead_transfers (lead_id);
CREATE INDEX IF NOT EXISTS idx_quotes_updated_at ON quotes (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_updated_at ON contracts (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_updated_at ON collections (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_employees_updated_at ON employees (updated_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 行级安全性 (RLS) 与权限策略
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- 允许所有通过后端 Workers 或客户端持有有效 API Key 的操作（无障碍读写）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotes' AND policyname = 'allow_all_quotes') THEN
    CREATE POLICY allow_all_quotes ON quotes FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'allow_all_contracts') THEN
    CREATE POLICY allow_all_contracts ON contracts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'allow_all_leads') THEN
    CREATE POLICY allow_all_leads ON leads FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_followups' AND policyname = 'allow_all_lead_followups') THEN
    CREATE POLICY allow_all_lead_followups ON lead_followups FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lead_transfers' AND policyname = 'allow_all_lead_transfers') THEN
    CREATE POLICY allow_all_lead_transfers ON lead_transfers FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'allow_all_projects') THEN
    CREATE POLICY allow_all_projects ON projects FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cases' AND policyname = 'allow_all_cases') THEN
    CREATE POLICY allow_all_cases ON cases FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'allow_all_employees') THEN
    CREATE POLICY allow_all_employees ON employees FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'collections' AND policyname = 'allow_all_collections') THEN
    CREATE POLICY allow_all_collections ON collections FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 初始种子数据 (Seed)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO quotes (id, data, updated_at, version)
VALUES (
  'q-seed-1',
  '{
    "id": "q-seed-1",
    "quoteNo": "QT-2026-1",
    "version": "v1.0",
    "status": "draft",
    "leadId": "lead-1",
    "basicInfo": {
      "projectName": "示例报价项目",
      "projectType": "企业展示",
      "creatorName": "张产品",
      "techEvaluatorName": "罗总",
      "requirementDesc": "",
      "customerName": "示例客户",
      "customerContact": "",
      "customerPhone": "",
      "quoteValidityDays": 30
    },
    "featureList": [],
    "endpointConfigs": [
      { "id": "ep-1", "name": "用户端", "platforms": ["wechat"] },
      { "id": "ep-2", "name": "管理后台", "platforms": ["pcweb"] }
    ],
    "salesAddedRoles": [],
    "frontendConfig": { "platforms": [] },
    "backendConfig": { "services": [], "language": "" },
    "travelOnsite": { "enableTravel": false, "travelSubtotal": 0, "enableOnsite": false, "onsiteSubtotal": 0 },
    "otherCosts": [],
    "auditNodes": [
      { "auditorId": "huangyi", "auditorName": "黄奕", "role": "销售部负责人", "status": "PENDING" },
      { "auditorId": "luo", "auditorName": "罗总", "role": "技术部负责人", "status": "PENDING" },
      { "auditorId": "min", "auditorName": "闵总", "role": "企业决策层", "status": "PENDING" }
    ],
    "stampNode": { "stamperName": "黄海", "status": "LOCKED" },
    "timeline": [],
    "salesOwnerName": "张三",
    "ccSalesNames": ["张三"],
    "createdAt": "2026-08-16 10:00",
    "updatedAt": "2026-08-16 10:00"
  }'::jsonb,
  NOW(),
  0
)
ON CONFLICT (id) DO NOTHING;
