-- 仅 contracts 表添加 version 列（当 quotes 已有 version 但 contracts 缺失时使用）
-- cwd = HubX/apps/api
-- 执行命令：npx wrangler d1 execute zkhubx-db --file migrations/0001b_add_contracts_version.sql --remote

ALTER TABLE contracts ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
