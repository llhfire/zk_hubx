#!/usr/bin/env node
/**
 * 设计系统门禁。
 *
 * 规则见 packages/ui/src/../docs/design-system/设计系统规范.md。
 *
 * 两类检查：
 *  1. 绝对规则（必须为 0，超一条即失败）：
 *     - 引用已取消的 app/components/ui
 *     - design-system 之外声明 fontFamily
 *     - pages 下重复定义状态色映射（STATUS_COLOR / getStatusColor / statusColorMap）
 *  2. 棘轮规则（不得超过 scripts/design-system-budget.json 里的预算）：
 *     - 页面里的视觉类内联样式
 *     - 未走设计系统的 <Table> / <Empty> / <Statistic> / <Descriptions> / <Upload> / Modal.confirm
 *
 * 预算只允许调小。迁移完成后全部为 0，此后任何新增都会让门禁失败。
 *
 * 用法：
 *   node scripts/check-design-system.mjs          # 校验
 *   node scripts/check-design-system.mjs --report # 只打印当前计数
 *   node scripts/check-design-system.mjs --write-budget # 用当前计数覆盖预算（仅迁移期使用）
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const UI_SRC = join(ROOT, 'packages/ui/src');
const PAGES = join(UI_SRC, 'app/pages');
const BUDGET_FILE = join(ROOT, 'scripts/design-system-budget.json');

const VISUAL_STYLE = /\b(color|backgroundColor|background|fontSize|fontFamily|borderRadius|boxShadow|border)\s*:\s*['"`]/g;
const ARCO_RAW = {
  table: /<Table\b/g,
  empty: /<Empty\b/g,
  statistic: /<Statistic\b/g,
  descriptions: /<Descriptions\b/g,
  upload: /<Upload\b/g,
  modalConfirm: /Modal\.(confirm|useModal)\s*\(/g,
};
const STATUS_COLOR_DEF = /\b(?:const|let|var|function)\s+(?:getStatusColor|resolveStatusColor|statusColorMap|STATUS_COLOR|STATUS_COLORS|StatusColor)\b/g;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__') continue;
      walk(full, out);
    } else if (['.ts', '.tsx'].includes(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

function countMatches(text, regex) {
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  return (text.match(re) || []).length;
}

const files = walk(PAGES);

const counts = {
  legacyImport: 0,
  fontFamilyOutsideDs: 0,
  statusColorDef: 0,
  visualInlineStyle: 0,
  rawTable: 0,
  rawEmpty: 0,
  rawStatistic: 0,
  rawDescriptions: 0,
  rawUpload: 0,
  rawModalConfirm: 0,
};

const violations = { legacyImport: [], fontFamilyOutsideDs: [], statusColorDef: [] };

for (const file of files) {
  const rel = relative(ROOT, file);
  const text = readFileSync(file, 'utf8');

  const legacy = countMatches(text, /components\/ui['"]/);
  if (legacy) {
    counts.legacyImport += legacy;
    violations.legacyImport.push(rel);
  }

  const fonts = countMatches(text, /\bfontFamily\s*:/);
  if (fonts) {
    counts.fontFamilyOutsideDs += fonts;
    violations.fontFamilyOutsideDs.push(rel);
  }

  const statusDefs = countMatches(text, STATUS_COLOR_DEF);
  if (statusDefs) {
    counts.statusColorDef += statusDefs;
    violations.statusColorDef.push(rel);
  }

  counts.visualInlineStyle += countMatches(text, VISUAL_STYLE);
  for (const [key, regex] of Object.entries(ARCO_RAW)) {
    const map = { table: 'rawTable', empty: 'rawEmpty', statistic: 'rawStatistic', descriptions: 'rawDescriptions', upload: 'rawUpload', modalConfirm: 'rawModalConfirm' };
    counts[map[key]] += countMatches(text, regex);
  }
}

const args = process.argv.slice(2);
const reportOnly = args.includes('--report');
const writeBudget = args.includes('--write-budget');

if (writeBudget) {
  writeFileSync(BUDGET_FILE, JSON.stringify(counts, null, 2) + '\n');
  console.log('已写入预算：', counts);
  process.exit(0);
}

if (reportOnly) {
  console.log(JSON.stringify(counts, null, 2));
  process.exit(0);
}

let budget;
try {
  budget = JSON.parse(readFileSync(BUDGET_FILE, 'utf8'));
} catch {
  console.error(`缺少预算文件 ${relative(ROOT, BUDGET_FILE)}，先跑 --write-budget`);
  process.exit(1);
}

let failed = false;

for (const [rule, files] of Object.entries(violations)) {
  if (files.length > 0) {
    failed = true;
    console.error(`\n✗ ${rule}：${files.length} 个文件`);
    for (const file of files.slice(0, 20)) console.error(`    ${file}`);
    if (files.length > 20) console.error(`    …还有 ${files.length - 20} 个`);
  }
}

const regressions = [];
for (const [key, value] of Object.entries(counts)) {
  const limit = budget[key] ?? 0;
  if (value > limit) regressions.push(`${key}: ${value} > 预算 ${limit}`);
}

if (regressions.length > 0) {
  failed = true;
  console.error('\n✗ 超出预算（预算只允许调小）：');
  for (const line of regressions) console.error(`    ${line}`);
}

if (failed) {
  console.error('\n设计系统门禁未通过。规则见 docs/design-system/设计系统规范.md');
  process.exit(1);
}

const pending = Object.entries(counts).reduce((sum, [, value]) => sum + value, 0);
console.log(`设计系统门禁通过（剩余待迁移计数 ${pending}）`);
