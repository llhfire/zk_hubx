# 0106. β 版数据库底座迁移至 Supabase (PostgreSQL)

- **状态**：已采纳 (Accepted)
- **日期**：2026-09-05
- **决策人**：架构组 / 全栈开发
- **影响范围**：`apps/api` (Workers 后端)、`supabase/schema.sql`、`DEPLOYMENT.md`、`ZK-HubX技术架构.html`

## 背景与上下文

在先前阶段（ADR-0094），ZK HubX β版采用 Cloudflare D1（SQLite）作为初期验证阶段的后端文档式数据底座，核心领域对象整段序列化为 JSON 存入 `data` 列，辅以 `id + version` 乐观并发锁与服务端时钟控制。

随着业务模块推进与数据治理要求提升，D1（嵌入式 SQLite）面临以下瓶颈与扩展诉求：
1. **关系型与扩展能力**：SQLite 缺乏完整的 JSONB 倒排/路径索引与高级 SQL 能力，难以支撑后续复杂的跨域多维聚合报表与权限细化。
2. **可视化管理与生态**：Supabase 提供开箱即用的 PostgreSQL 生产底座、全功能 Web 控制台、数据备份与实时扩展。
3. **架构平滑演进**：需要一种平滑迁移路径，既将数据库改造为 Supabase，又完全不破坏现有前端 114 个测试套件、不破坏已在 Workers 建立的状态机验证与签约联动业务逻辑（ADR-0093 / ADR-0095）。

## 决策

1. **保留 Workers 服务端业务层，无缝切换存储底座**：
   - 保留 `apps/api`（Hono + Workers），继续承担服务端状态机合法性校验、签约自动联动（自动生成未确认项目与商机、流转实收）、操作人 `X-Actor` 校验与乐观锁控制。
   - 抽象统一数据访问接口 `DatabaseAdapter`（`apps/api/src/db/`），底层实现 `SupabaseAdapter`（基于 `@supabase/supabase-js`），同时保留 `D1Adapter` 与 `MemoryAdapter` 作为平滑过渡与测试兜底。
2. **PostgreSQL 文档式存储 + JSONB 路径索引**：
   - Supabase 端采用 9 张核心表：`quotes`, `contracts`, `leads`, `lead_followups`, `lead_transfers`, `projects`, `cases`, `employees`, `collections`。
   - 字段对齐：`id TEXT PRIMARY KEY`, `data JSONB NOT NULL`, `updated_at TIMESTAMPTZ DEFAULT NOW()`, `version INTEGER NOT NULL DEFAULT 0`。
   - 建立高频 JSONB 表达式索引（如 `(data->>'leadId')`、`(data->>'contractId')`、`(data->>'projectId')` 等），大幅提升跨表关联合成性能。
3. **配置与凭据注入**：
   - 本地联调：通过 `apps/api/.dev.vars` 提供 `SUPABASE_URL` 与 `SUPABASE_KEY`（`wrangler dev` 自动加载）。
   - 生产部署：通过 `wrangler secret put SUPABASE_KEY` 与 `wrangler.toml` 的 `[vars]` 注入。

## 效果与优势

- **零破坏性**：前端（`apps/web`）与各域 Service 接口（`QuotationService`, `ContractService`, `LeadService`, 等）100% 保持原样，114 个测试套件全部通过。
- **可靠性与灵活性**：数据统一落地在 Supabase 托管的 PostgreSQL 中，具备事务支持、可视化面板与随时按需拆列建外键的未来演进空间。
- **环境安全**：无配置凭据时支持内存与 D1 自动优雅兜底，杜绝测试与部署崩溃。
