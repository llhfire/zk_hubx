-- 0001: β 数据底座（ADR-0094）—— quotes/contracts 加乐观锁 version 列。
-- 已按旧 schema 初始化过的 D1（本地或线上）执行本文件；全新库直接用 schema.sql。
-- 执行：npx wrangler d1 execute zkhubx-db --file apps/api/migrations/0001_add_version.sql --remote
--      （本地联调库去掉 --remote）
ALTER TABLE quotes ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contracts ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
