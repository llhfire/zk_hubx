#!/usr/bin/env node

/**
 * ZK HubX 统一数据库 CLI 管理工具
 * 用途：接管 Supabase 数据库操作，对齐旧版 wrangler d1 execute 体验
 * 支持：
 *   node scripts/db.js status                    # 查看所有核心表的记录数
 *   node scripts/db.js list <table_name>         # 查询指定表的最近记录
 *   node scripts/db.js count <table_name>        # 统计指定表记录数
 *   node scripts/db.js seed                      # 导入初始/历史种子数据
 *   node scripts/db.js sql "<SQL 语句>"          # 执行任意 SQL（需 exec_sql 函数或 PG 连接）
 *   node scripts/db.js file <SQL 文件路径>        # 执行本地 SQL 脚本（对齐 wrangler d1 execute --file）
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取环境变量（优先读 apps/api/.dev.vars，其次环境变量）
function loadEnv() {
  const envFile = path.resolve(__dirname, '../apps/api/.dev.vars');
  const env = { ...process.env };
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const k = trimmed.slice(0, eq).trim();
        const v = trimmed.slice(eq + 1).trim();
        if (!env[k]) env[k] = v;
      }
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 SUPABASE_URL 或 SUPABASE_KEY，请检查 apps/api/.dev.vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const TABLES = [
  'quotes',
  'contracts',
  'leads',
  'lead_followups',
  'lead_transfers',
  'projects',
  'cases',
  'employees',
  'collections',
];

async function cmdStatus() {
  console.log(`\n🔍 连接数据库: ${supabaseUrl}`);
  console.log('─────────────────────────────────────────────');
  console.log(' 表名                  │ 记录数  │ 状态');
  console.log('─────────────────────────────────────────────');
  for (const table of TABLES) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(` ${table.padEnd(21)} │ -       │ ❌ ${error.message}`);
    } else {
      console.log(` ${table.padEnd(21)} │ ${String(count ?? 0).padStart(7)} │ ✅ 正常`);
    }
  }
  console.log('─────────────────────────────────────────────\n');
}

async function cmdList(table, limit = 5) {
  if (!table) {
    console.error('❌ 请指定表名，例如: node scripts/db.js list quotes');
    process.exit(1);
  }
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(Number(limit));
  if (error) {
    console.error(`❌ 查询失败: ${error.message}`);
    process.exit(1);
  }
  console.log(`\n📋 表 [${table}] 最近 ${data.length} 条记录:`);
  for (const row of data) {
    const summaryName = row.data?.name || row.data?.customerName || row.data?.projectName || row.data?.title || '-';
    const summaryStatus = row.data?.status || row.data?.stage || '-';
    console.log(` ▸ ID: ${row.id} | 更新: ${row.updated_at} | 版本: ${row.version} | 摘要: ${summaryName} (${summaryStatus})`);
  }
  console.log('\n💡 提示：查看完整单条数据请使用: node scripts/db.js get <表名> <ID>\n');
}

async function cmdGet(table, id) {
  if (!table || !id) {
    console.error('❌ 请指定表名和 ID，例如: node scripts/db.js get quotes q-seed-1');
    process.exit(1);
  }
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error(`❌ 查询失败: ${error.message}`);
    process.exit(1);
  }
  if (!data) {
    console.log(`⚠️ 未找到表 [${table}] 中 ID 为 "${id}" 的记录`);
    return;
  }
  console.log(`\n📋 表 [${table}] 记录详情 [${id}]:`);
  console.log(JSON.stringify(data, null, 2));
}

async function cmdCount(table) {
  if (!table) {
    console.error('❌ 请指定表名，例如: node scripts/db.js count quotes');
    process.exit(1);
  }
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    console.error(`❌ 统计失败: ${error.message}`);
    process.exit(1);
  }
  console.log(`📊 表 [${table}] 记录总数: ${count ?? 0}`);
}

async function cmdDelete(table, id) {
  if (!table || !id) {
    console.error('❌ 请指定表名和 ID，例如: node scripts/db.js delete leads L-1111');
    process.exit(1);
  }
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    console.error(`❌ 删除失败: ${error.message}`);
    process.exit(1);
  }
  console.log(`✅ 已成功删除表 [${table}] 中 ID 为 "${id}" 的记录`);
}

async function cmdTruncate(table, forceFlag) {
  if (!table) {
    console.error('❌ 请指定表名，例如: node scripts/db.js truncate leads --force');
    process.exit(1);
  }
  if (forceFlag !== '--force') {
    console.error(`⚠️ 警告：清空表 [${table}] 将删除全部数据！若确认请追加 --force 参数：`);
    console.error(`   node scripts/db.js truncate ${table} --force`);
    process.exit(1);
  }
  const { error } = await supabase.from(table).delete().neq('id', '__never_match__');
  if (error) {
    console.error(`❌ 清空失败: ${error.message}`);
    process.exit(1);
  }
  console.log(`✅ 表 [${table}] 数据已全部清空`);
}

// 解析 SQL 文件的 VALUES 字面量
function parseSqlValues(valStr) {
  let i = 0;
  const tokens = [];
  while (i < valStr.length) {
    while (valStr[i] === ' ' || valStr[i] === '\t') i++;
    if (i >= valStr.length) break;
    if (valStr[i] === "'") {
      i++;
      let str = '';
      while (i < valStr.length) {
        if (valStr[i] === "'") {
          if (valStr[i + 1] === "'") {
            str += "'";
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          str += valStr[i];
          i++;
        }
      }
      tokens.push(str);
    } else {
      let str = '';
      while (i < valStr.length && valStr[i] !== ',') {
        str += valStr[i];
        i++;
      }
      tokens.push(str.trim());
    }
    while (valStr[i] === ' ' || valStr[i] === '\t') i++;
    if (valStr[i] === ',') i++;
  }
  return tokens;
}

// 种子数据一键注入
async function cmdSeed(filePath) {
  const defaultPath = path.resolve(__dirname, '../supabase/seed_from_mysql.sql');
  const targetPath = filePath ? path.resolve(process.cwd(), filePath) : defaultPath;

  if (!fs.existsSync(targetPath)) {
    console.error(`❌ 未找到种子文件: ${targetPath}`);
    process.exit(1);
  }

  console.log(`\n🌱 开始注入种子数据: ${targetPath}`);
  const content = fs.readFileSync(targetPath, 'utf-8');
  const lines = content.split('\n');

  const rowsByTable = {};
  for (const table of TABLES) {
    rowsByTable[table] = [];
  }

  let lineCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--') || !trimmed.startsWith('INSERT INTO')) continue;

    const match = trimmed.match(/^INSERT INTO (\w+)\s*\([^)]+\)\s*VALUES\s*\((.*)\)\s*(?:ON CONFLICT.*)?;?$/i);
    if (!match) continue;

    const table = match[1];
    if (!rowsByTable[table]) rowsByTable[table] = [];

    const tokens = parseSqlValues(match[2]);
    if (tokens.length >= 4) {
      const [id, dataStr, updatedAt, version] = tokens;
      try {
        const dataObj = JSON.parse(dataStr);
        rowsByTable[table].push({
          id,
          data: dataObj,
          updated_at: updatedAt || new Date().toISOString(),
          version: Number(version) || 0,
        });
        lineCount++;
      } catch (err) {
        console.warn(`⚠️ 解析 JSON 失败 (${table}:${id}): ${err.message}`);
      }
    }
  }

  console.log(`📦 解析就绪: 共识别到 ${lineCount} 条有效记录`);
  for (const [table, rows] of Object.entries(rowsByTable)) {
    if (rows.length === 0) continue;
    console.log(`   ▸ 表 [${table}]: ${rows.length} 条记录待导入`);
  }

  const BATCH_SIZE = 100;
  const startTime = Date.now();

  for (const [table, rows] of Object.entries(rowsByTable)) {
    if (rows.length === 0) continue;
    process.stdout.write(`⏳ 正在导入表 [${table}] (${rows.length} 条)... `);

    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
      if (error) {
        console.error(`\n❌ 表 [${table}] 批次 [${i} - ${i + batch.length}] 导入失败: ${error.message}`);
        break;
      }
      inserted += batch.length;
    }
    console.log(`✅ 成功写入 ${inserted} 条`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 种子数据全部导入完成！耗时: ${elapsed} 秒\n`);

  await cmdStatus();
}

async function cmdExecSql(sql) {
  if (!sql) {
    console.error('❌ 请提供 SQL 语句');
    process.exit(1);
  }

  const res = await supabase.rpc('exec_sql', { query: sql });
  if (!res.error) {
    console.log('✅ SQL 执行成功 (RPC):', res.data);
    return;
  }

  if (env.DATABASE_URL) {
    try {
      const pg = await import('pg');
      const client = new pg.default.Client({ connectionString: env.DATABASE_URL });
      await client.connect();
      const queryRes = await client.query(sql);
      await client.end();
      console.log('✅ SQL 执行成功 (pg 直连):', queryRes.rows || queryRes.command);
      return;
    } catch (e) {
      console.error('❌ PG 直连执行异常:', e.message);
      process.exit(1);
    }
  }

  console.error(`❌ 执行 SQL 失败: ${res.error.message}`);
  console.log('\n💡 提示：若要在 CLI 自由执行任意原生 DDL/SQL，请在 Supabase SQL Editor 执行一次授权函数：');
  console.log(`
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;
  `);
}

async function cmdExecFile(filePath) {
  const absPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ 文件不存在: ${absPath}`);
    process.exit(1);
  }
  console.log(`📄 正在读取 SQL 脚本: ${absPath}`);
  const sql = fs.readFileSync(absPath, 'utf-8');
  await cmdExecSql(sql);
}

async function main() {
  const [cmd, arg1, arg2] = process.argv.slice(2);

  switch (cmd) {
    case 'status':
      await cmdStatus();
      break;
    case 'list':
      await cmdList(arg1, arg2);
      break;
    case 'get':
      await cmdGet(arg1, arg2);
      break;
    case 'count':
      await cmdCount(arg1);
      break;
    case 'seed':
      await cmdSeed(arg1);
      break;
    case 'delete':
      await cmdDelete(arg1, arg2);
      break;
    case 'truncate':
      await cmdTruncate(arg1, arg2);
      break;
    case 'sql':
      await cmdExecSql(arg1);
      break;
    case 'file':
      await cmdExecFile(arg1);
      break;
    default:
      console.log(`
ZK HubX 数据库管理 CLI (Supabase 全权接管工具)
用法:
  node scripts/db.js status                    查看所有表记录数与健康度
  node scripts/db.js list <表名> [条数]        查看表最近数据 (默认 5 条)
  node scripts/db.js get <表名> <ID>           查看指定记录的完整 JSON 详情
  node scripts/db.js count <表名>              统计指定表总数
  node scripts/db.js seed [SQL文件路径]        一键批量导入种子数据 (分批 upsert)
  node scripts/db.js delete <表名> <ID>        删除指定 ID 的记录
  node scripts/db.js truncate <表名> --force   清空指定表的所有数据
  node scripts/db.js sql "<SQL语句>"           在数据库执行任意原生 SQL
  node scripts/db.js file <SQL文件路径>        执行本地 SQL 脚本文件
`);
  }
}

main().catch((err) => {
  console.error('❌ 未捕获异常:', err);
  process.exit(1);
});
