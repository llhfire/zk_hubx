#!/usr/bin/env node
/**
 * 设计系统门禁。
 *
 * 规则见 packages/ui/src/../docs/design-system/设计系统规范.md。
 *
 * 三类检查：
 *  1. 绝对规则（必须为 0，超一条即失败）：
 *     - 引用已取消的 app/components/ui
 *     - design-system 之外声明 fontFamily
 *     - pages 下重复定义状态色映射（STATUS_COLOR / getStatusColor / statusColorMap）
 *     - 内联样式里写死颜色（hardcodedColor）
 *     - 内联样式里写裸数字字号/圆角/阴影（rawStyleLiteral）
 *     - 路由页面没有用 PageShell 包裹（pageWithoutShell）
 *     - facsimile 目录中未登记的代码，或页面侧未登记的 facsimile 子路径引用
 *  2. 结构性规则（迁移目标为 0，未走设计系统的组件）：
 *     - <Table> / <Empty> / <Statistic> / <Descriptions> / <Upload drag> / Modal.confirm
 *  3. 棘轮规则（只防增长）：visualInlineStyle —— 内联视觉样式总数（含用 token 的）。
 *     布局类内联允许、视觉类必须走 token，所以这一项不会归零，也不该归零。
 *
 * 设计例外是「文档复刻」组件：它以 1:1 复刻纸质报价单的缩字号排版，
 * 字号/圆角本来就不在产品字号阶梯上。例外代码必须位于
 * design-system/facsimile，并逐条登记在预算文件 facsimile.files 里；页面只能从
 * facsimile 子路径消费，并逐条登记在 facsimile.consumers 里。
 * 扩大扫描范围后发现的存量债务在 strict 脚本逐节点登记，不改变原预算；
 * --details 展示位置/理由，新增违规仍直接失败。
 *
 * 预算只允许调小。
 *
 * 用法：
 *   node scripts/check-design-system.mjs          # 校验
 *   node scripts/check-design-system.mjs --report # 只打印当前计数
 *   node scripts/check-design-system.mjs --details # 计数 + 全量定位/迁移例外
 *   node scripts/check-design-system.mjs --write-budget # 用当前计数覆盖预算（仅迁移期使用）
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditDesignSystem, isHardcodedColor } from './check-design-system-strict.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const UI_SRC = join(ROOT, 'packages/ui/src');
const PAGES = join(UI_SRC, 'app/pages');
const FACSIMILE_DIR = join(UI_SRC, 'design-system/facsimile');
const BUDGET_FILE = join(ROOT, 'scripts/design-system-budget.json');

// 内联视觉属性本身不违规（布局/动态数据驱动允许），违规的是「值不是 token」。
// 这条只统计出现次数，用来防止回流；真正要归零的是下面的 hardcodedColor。
const VISUAL_STYLE = /\b(color|backgroundColor|background|fontSize|fontFamily|borderRadius|boxShadow|border)\s*:\s*['"`]/g;
// 硬编码色检查要覆盖「边框四边」这类分写属性，否则
// `borderBottom: '1px solid #f2f3f5'` 会从 `border` 的缝里漏过去。
const VISUAL_STYLE_VALUE =
  /\b(color|backgroundColor|background|fontSize|fontFamily|borderRadius|boxShadow|border|borderTop|borderRight|borderBottom|borderLeft|borderColor|outline|fill|stroke|caretColor)\s*:\s*(['"`])([^'"`]*)\2/g;
/** 内联样式里的裸数字：`fontSize: 12` / `borderRadius: 6`。绕开了字号与圆角 token。 */
const RAW_STYLE_LITERAL = /\b(fontSize|borderRadius|boxShadow|color|background|backgroundColor)\s*:\s*(\d+(?:\.\d+)?)\b/g;

const ARCO_RAW = {
  // `<Table.Summary.Row>` 是 Arco 合计行的必要写法（DataTable 透传 summary 函数），不算裸表格
  table: /<Table(?=[\s>])/g,
  empty: /<Empty\b/g,
  statistic: /<Statistic\b/g,
  descriptions: /<Descriptions\b/g,
  upload: /<Upload\b[^>]*\bdrag\b/g,
  modalConfirm: /Modal\.(confirm|useModal)\s*\(/g,
  card: /<Card(?![A-Za-z])/g,
  alert: /<Alert(?![A-Za-z])/g,
  progress: /<Progress(?![A-Za-z])/g,
};

/**
 * 带 `color` 的 Arco `Tag` = 页面自己挑颜色，是 StatusTag 之外的第二个状态标签。
 * 可关闭 / 可勾选 / 带 onClose 的标签属于**输入控件**（选择已选项），不算违规。
 */
const RAW_TAG_COLOR = /<Tag(?![A-Za-z])([^>]*)>/gs;
const TAG_IS_INPUT = /\b(closable|checkable|onClose|onCheck)\b/;
const STATUS_COLOR_DEF = /\b(?:const|let|var|function)\s+(?:getStatusColor|resolveStatusColor|statusColorMap|STATUS_COLOR|STATUS_COLORS|StatusColor)\b/g;
// 更宽的棘轮计数：任何 *STATUS_COLOR* / *StatusColor* 定义都算「状态色的第二份实现」
const STATUS_COLOR_ANY = /\b(?:const|let|var|function)\s+\w*(?:STATUS_COLOR|StatusColor|statusColorMap)\w*\b/g;

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
let budget;
try {
  budget = JSON.parse(readFileSync(BUDGET_FILE, 'utf8'));
} catch {
  budget = {};
}
/** 文档复刻边界：样式文件与页面消费方都必须登记理由。 */
const FACSIMILE = budget.facsimile ?? {};
const FACSIMILE_FILES = FACSIMILE.files ?? {};
const FACSIMILE_CONSUMERS = FACSIMILE.consumers ?? {};
const isFacsimile = (rel) => Object.prototype.hasOwnProperty.call(FACSIMILE_FILES, rel);
const isFacsimileConsumer = (rel) => Object.prototype.hasOwnProperty.call(FACSIMILE_CONSUMERS, rel);
const facsimileFiles = walk(FACSIMILE_DIR);
const audit = auditDesignSystem(ROOT);
const files = [...new Set([...audit.files.map((file) => join(ROOT, file)), ...facsimileFiles])];
const FACSIMILE_IMPORT = /['"]@\/design-system\/facsimile(?:['"/]|$)/;
const FACSIMILE_PREFIX = `${relative(ROOT, FACSIMILE_DIR)}/`;

/**
 * 组件的「实样」也是交付的一部分。
 *
 * `design-system/index.ts` 的每个值导出都必须在 `/ui-library` 页面里被用到 ——
 * 只有目录表里一行文字，等于用户看不到这个组件长什么样。这一项不是棘轮，
 * 新增组件不补实样就直接失败。
 */
function findComponentsWithoutDemo() {
  const indexFile = join(UI_SRC, 'design-system/index.ts');
  const libraryDir = join(PAGES, 'ui-library');
  let indexText;
  try {
    indexText = readFileSync(indexFile, 'utf8');
  } catch {
    return [];
  }
  const exported = [...indexText.matchAll(/export\s*\{([^}]*)\}/g)]
    .flatMap((match) => match[1].split(',').map((name) => name.trim()))
    .filter((name) => name && !name.startsWith('type '));

  // 实样页已拆成 ui-library/ 目录（壳 + panels/ + demos/），必须扫整个目录，
  // 否则拆文件会把「缺实样」判成 0 覆盖。
  const libraryFiles = walk(libraryDir).filter((file) => extname(file) === '.tsx');
  if (libraryFiles.length === 0) return [];

  // 只算「真的用了」：去掉 import 段与所有字符串字面量，
  // 否则目录表里那行 `component: 'MoneyText'` 会让检查假通过。
  const codeOnly = libraryFiles
    .map((file) => {
      const text = readFileSync(file, 'utf8');
      const body = text.slice(text.lastIndexOf("} from '"));
      return body.replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, "''");
    })
    .join('\n');
  return exported.filter((name) => !new RegExp(`\\b${name}\\b`).test(codeOnly));
}

const counts = {
  legacyImport: 0,
  fontFamilyOutsideDs: 0,
  statusColorDef: 0,
  statusColorAny: 0,
  visualInlineStyle: 0,
  hardcodedColor: 0,
  rawStyleLiteral: 0,
  rawTable: 0,
  rawEmpty: 0,
  rawStatistic: 0,
  rawDescriptions: 0,
  rawUpload: 0,
  rawModalConfirm: 0,
  rawCard: 0,
  rawAlert: 0,
  rawProgress: 0,
  rawTagColor: 0,
  rawPageTabs: 0,
  pageWithoutShell: 0,
  libraryMissingDemo: 0,
  facsimileBoundary: 0,
  directUiImport: 0,
  nativeControl: 0,
};

const violations = {
  legacyImport: [],
  fontFamilyOutsideDs: [],
  statusColorDef: [],
  pageWithoutShell: [],
  libraryMissingDemo: [],
  facsimileBoundary: [],
};

for (const file of files) {
  const rel = relative(ROOT, file);
  const text = readFileSync(file, 'utf8');

  if (rel.startsWith(FACSIMILE_PREFIX) && !isFacsimile(rel)) {
    violations.facsimileBoundary.push(`${rel}（未登记到 facsimile.files）`);
  }
  if (!rel.startsWith(FACSIMILE_PREFIX) && FACSIMILE_IMPORT.test(text) && !isFacsimileConsumer(rel)) {
    violations.facsimileBoundary.push(`${rel}（未登记到 facsimile.consumers）`);
  }

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

  counts.statusColorAny += countMatches(text, STATUS_COLOR_ANY);

  const statusDefs = countMatches(text, STATUS_COLOR_DEF);
  if (statusDefs) {
    counts.statusColorDef += statusDefs;
    violations.statusColorDef.push(rel);
  }

  counts.visualInlineStyle += countMatches(text, VISUAL_STYLE);
  // 页面级分区页签只能走 SectionTabs。Arco 的 <Tabs> 仍是底层实现材料，页面直接用它
  // 会绕开统一激活态与数量表达，且同一页签在不同页面长得不一样。这一项是棘轮：只减不增。
  if (file.startsWith(PAGES) && !file.startsWith(join(PAGES, 'ui-library'))) {
    // 只数 <Tabs ...> / <Tabs> 元素本身；<Tabs.TabPane> 属于同一个页签组，不重复计数。
    counts.rawPageTabs += countMatches(text, /<Tabs(?!\s*\.)/g);
  }
  counts.rawTagColor += [...text.matchAll(RAW_TAG_COLOR)].filter(
    (m) => m[1].includes('color=') && !TAG_IS_INPUT.test(m[1]),
  ).length;
  for (const match of text.matchAll(VISUAL_STYLE_VALUE)) {
    if (isHardcodedColor(match[3])) counts.hardcodedColor += 1;
  }
  if (!isFacsimile(rel)) {
    counts.rawStyleLiteral += countMatches(text, RAW_STYLE_LITERAL);
  }
  for (const [key, regex] of Object.entries(ARCO_RAW)) {
    const map = {
      table: 'rawTable',
      empty: 'rawEmpty',
      statistic: 'rawStatistic',
      descriptions: 'rawDescriptions',
      upload: 'rawUpload',
      modalConfirm: 'rawModalConfirm',
      card: 'rawCard',
      alert: 'rawAlert',
      progress: 'rawProgress',
    };
    counts[map[key]] += countMatches(text, regex);
  }
}

counts.facsimileBoundary = violations.facsimileBoundary.length;

// 保留旧计数字段；JSX 颜色进入 hardcodedColor，路由返回分支进入 pageWithoutShell。
// 报告包含已登记存量，判定时仅减去当前实际匹配的精确例外，不提高预算。
const auditCounts = { jsxHardcodedColor: 'hardcodedColor', pageWithoutShell: 'pageWithoutShell', directUiImport: 'directUiImport', nativeControl: 'nativeControl', visualInlineStyle: 'visualInlineStyle' };
const allowances = {};
for (const finding of audit.findings) {
  const key = auditCounts[finding.rule];
  if (finding.rule !== 'visualInlineStyle') counts[key] += 1;
  if (finding.allowed) allowances[key] = (allowances[key] ?? 0) + 1;
  else {
    violations[key] ??= [];
    violations[key].push(`${finding.file}:${finding.line}:${finding.column}（${finding.message}）`);
  }
}

const undemoed = findComponentsWithoutDemo();
counts.libraryMissingDemo = undemoed.length;
violations.libraryMissingDemo = undemoed;

const args = process.argv.slice(2);
const reportOnly = args.includes('--report');
const writeBudget = args.includes('--write-budget');

if (args.includes('--details')) {
  console.log(JSON.stringify({ counts, violations, audit }, null, 2));
  process.exit(0);
}

if (writeBudget) {
  const next = Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, value - (allowances[key] ?? 0)]));
  if (Object.keys(FACSIMILE_FILES).length > 0 || Object.keys(FACSIMILE_CONSUMERS).length > 0) {
    next.facsimile = { files: FACSIMILE_FILES, consumers: FACSIMILE_CONSUMERS };
  }
  writeFileSync(BUDGET_FILE, JSON.stringify(next, null, 2) + '\n');
  console.log('已写入预算：', next);
  process.exit(0);
}

if (reportOnly) {
  console.log(JSON.stringify(counts, null, 2));
  process.exit(0);
}

let failed = false;

for (const [rule, entries] of Object.entries(violations)) {
  if (entries.length > 0) {
    failed = true;
    console.error(`\n✗ ${rule}：${entries.length} 项`);
    for (const entry of entries.slice(0, 20)) console.error(`    ${entry}`);
    if (entries.length > 20) console.error(`    …还有 ${entries.length - 20} 项`);
  }
}

const regressions = [];
for (const [key, value] of Object.entries(counts)) {
  const limit = budget[key] ?? 0;
  const enforced = value - (allowances[key] ?? 0);
  if (enforced > limit) regressions.push(`${key}: ${enforced} > 预算 ${limit}`);
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

if (audit.allowlisted.length) {
  console.log(`已登记存量迁移例外 ${audit.allowlisted.length} 处（--details 查看定位/理由）。`);
}
const pending = Object.entries(counts).reduce((sum, [, value]) => sum + value, 0);
console.log(`设计系统门禁通过（剩余待迁移计数 ${pending}）`);
