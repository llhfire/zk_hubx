/**
 * MySQL → D1 数据迁移脚本
 *
 * 读取 zkoadata_2026-08-20_01-30-01_mysql_data.sql，
 * 解析 INSERT 语句，映射到 HubX 类型，输出 D1 JSON seed。
 *
 * 用法：npx tsx scripts/migrate-mysql-to-d1.ts > apps/api/migrations/0005_seed_from_mysql.sql
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = resolve(__dirname, '../data/zkoadata_2026-08-20_01-30-01_mysql_data.sql');

// ── 工具函数 ──────────────────────────────────────────────

/** int 时间戳(秒) → 'YYYY-MM-DD HH:mm' 北京时间 */
function tsToDate(ts: number | null | undefined): string {
  if (!ts || ts <= 0) return '';
  const d = new Date((ts + 8 * 3600) * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** tinyint → 线索来源英文 key */
const SOURCE_MAP: Record<number, string> = {
  1: 'baidu',
  2: 'xiaohongshu',
  3: 'douyin',
  4: 'wechat',
  5: 'website',
  6: 'xiaohongshu', // 小红书
};

/** tinyint → 线索类型 */
const CLUE_TYPE_MAP: Record<number, string> = {
  1: 'public',
  2: 'assigned',
  3: 'trash',
  4: 'hightech',
};

/** tinyint → 意向等级 */
const LEVEL_MAP: Record<number, string> = {
  1: '高',
  2: '中',
  3: '低',
  4: '无意向',
};

/** tinyint → 客户等级 */
const CUSTOMER_LEVEL_MAP: Record<number, string> = {
  0: '',
  1: 'S',
  2: 'A',
  3: 'B',
  4: 'C',
};

/** tinyint → 客户状态(销售漏斗) */
const CUST_STATUS_MAP: Record<number, string> = {
  1: '未联系',
  2: '初步沟通',
  3: '已终止',
  4: '需求调研',
  5: '方案报价',
  6: '合同洽谈',
  7: '已签单',
};

/** tinyint → 合同状态 */
const CONTRACT_STATUS_MAP: Record<number, string> = {
  0: 'draft',
  1: 'approving',
  2: 'archived',
  3: 'voided',
};

/** tinyint → 项目状态 */
const PROJECT_STATUS_MAP: Record<number, string> = {
  0: '未确认',
  1: '未开始',
  2: '进行中',
  3: '已完成',
  4: '验收中',
  5: '搁置',
  6: '延迟',
  7: '催款中',
};

/** 部门 id → 名称（从 speed_department 推导） */
const DEPT_MAP: Record<number, string> = {};

/** 用户 id → 姓名 */
const USER_MAP: Record<number, string> = {};

// ── SQL 解析 ──────────────────────────────────────────────

/** 从 INSERT INTO `table` VALUES (...) 中提取行（手动解析到非字符串分号） */
function parseInsertRows(sql: string, table: string): unknown[][] {
  const rows: unknown[][] = [];
  const marker = `INSERT INTO \`${table}\` VALUES`;
  let pos = sql.indexOf(marker);
  if (pos === -1) return rows;
  pos += marker.length;

  // 找到语句结束：不在字符串内的分号
  let end = pos;
  let inStr = false;
  let escaped = false;
  while (end < sql.length) {
    const ch = sql[end];
    if (escaped) { escaped = false; end++; continue; }
    if (ch === '\\') { escaped = true; end++; continue; }
    if (ch === "'") { inStr = !inStr; end++; continue; }
    if (ch === ';' && !inStr) break;
    end++;
  }
  const valuesStr = sql.slice(pos, end);

  // 逐行解析 (val1,val2,...)
  let i = 0;
  while (i < valuesStr.length) {
    if (valuesStr[i] === '(') {
      // 找到匹配的 )（考虑字符串转义）
      let j = i + 1;
      let depth = 1;
      let strMode = false;
      let esc = false;
      while (j < valuesStr.length && depth > 0) {
        const c = valuesStr[j];
        if (esc) { esc = false; j++; continue; }
        if (c === '\\') { esc = true; j++; continue; }
        if (c === "'") { strMode = !strMode; j++; continue; }
        if (!strMode) {
          if (c === '(') depth++;
          else if (c === ')') depth--;
        }
        j++;
      }
      const rowStr = valuesStr.slice(i + 1, j - 1);
      rows.push(parseRowValues(rowStr));
      i = j + 1;
    } else {
      i++;
    }
  }
  return rows;
}

/** 解析单行 (val1,val2,...) 为数组 */
function parseRowValues(s: string): unknown[] {
  const values: unknown[] = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === ',' && i === 0) { i++; continue; }
    if (s[i] === "'") {
      // 字符串值
      let j = i + 1;
      let val = '';
      while (j < s.length && s[j] !== "'") {
        if (s[j] === '\\') {
          j++;
          if (j < s.length) val += s[j];
        } else {
          val += s[j];
        }
        j++;
      }
      values.push(val);
      i = j + 1; // 跳过闭合 '
    } else if (s.slice(i, i + 4) === 'NULL') {
      values.push(null);
      i += 4;
    } else {
      // 数字值
      let j = i;
      while (j < s.length && s[j] !== ',') j++;
      const numStr = s.slice(i, j).trim();
      values.push(numStr === 'NULL' ? null : Number(numStr));
      i = j;
    }
    // 跳过逗号
    if (i < s.length && s[i] === ',') i++;
  }
  return values;
}

// ── 数据转换 ──────────────────────────────────────────────

interface LeadDoc {
  id: string;
  key: string;
  name: string;
  customer: string;
  contact: string;
  phone: string;
  wechat: string;
  source: string;
  keyword: string;
  status: string;
  clueType: string;
  level: string;
  customerLevel: string;
  tags: string[];
  entity: string;
  owner: string;
  optimizer: string;
  assistant: string;
  creator: string;
  createTime: string;
  updateTime: string;
  lastFollowTime: string;
  lastFollowContent: string;
  nextFollowTime: string;
  followCount: number;
  daysHeld: number;
  trashCount: number;
  transformStatus: boolean;
  isOverdue: boolean;
  remark: string;
  customerBudget: string;
  customerCost: string;
  presalesGroupName: string;
  prototypeLink: string;
  witkeyId: string;
  witkeyTaskNo: string;
  customerNote: string;
  initialRequirement: string;
}

function convertLead(row: unknown[]): LeadDoc {
  const id = `L-${row[0]}`;
  const clueType = CLUE_TYPE_MAP[row[33] as number] ?? 'public';
  const ownerUserId = row[13] as number | null;
  const optimizerUserId = row[38] as number | null;
  const assistantUserId = row[40] as number | null;
  const createUserId = row[14] as number;
  const source = SOURCE_MAP[row[2] as number] ?? 'website';
  const level = LEVEL_MAP[row[4] as number] ?? '';
  const customerLevel = CUSTOMER_LEVEL_MAP[row[37] as number] ?? '';
  const custStatus = row[35] as number | null;
  const status = custStatus ? (CUST_STATUS_MAP[custStatus] ?? '未联系') : '未联系';
  const isTransform = row[17] as number;
  const trashCount = clueType === 'trash' ? 1 : 0;

  return {
    id,
    key: id,
    name: String(row[1] ?? ''),
    customer: '',
    contact: String(row[39] ?? ''),
    phone: String(row[3] ?? ''),
    wechat: String(row[41] ?? ''),
    source,
    keyword: String(row[42] ?? ''),
    status,
    clueType,
    level,
    customerLevel,
    tags: row[36] ? String(row[36]).split(';').filter(Boolean) : [],
    entity: '',
    owner: ownerUserId ? (USER_MAP[ownerUserId] ?? '') : '',
    optimizer: optimizerUserId ? (USER_MAP[optimizerUserId] ?? '') : '',
    assistant: assistantUserId ? (USER_MAP[assistantUserId] ?? '') : '',
    creator: createUserId ? (USER_MAP[createUserId] ?? '') : '',
    createTime: tsToDate(row[10] as number),
    updateTime: tsToDate(row[10] as number),
    lastFollowTime: tsToDate(row[18] as number),
    lastFollowContent: row[17] ? String(row[17]) : '',
    nextFollowTime: tsToDate(row[19] as number),
    followCount: 0,
    daysHeld: 0,
    trashCount,
    transformStatus: isTransform === 1,
    isOverdue: false,
    remark: String(row[8] ?? ''),
    customerBudget: String(row[38] ?? ''),
    customerCost: String(row[43] ?? ''),
    presalesGroupName: String(row[46] ?? ''),
    prototypeLink: String(row[45] ?? ''),
    witkeyId: String(row[47] ?? ''),
    witkeyTaskNo: String(row[48] ?? ''),
    customerNote: String(row[8] ?? ''),
    initialRequirement: String(row[34] ?? ''),
  };
}

interface ContractDoc {
  id: string;
  contractNo: string;
  status: string;
  kind: string;
  leadId: string;
  current: {
    contractName: string;
    customerName: string;
    signingEntity: string;
    totalAmount: number;
    signDate: string;
    effectiveDate: string;
    endDate: string;
    paymentPlans: Array<{
      period: number;
      periodName: string;
      amount: number;
      percentage: number;
      expectedDate: string;
      condition: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
  receivedAmount: number;
  receivableAmount: number;
  executionStatus: string;
}

function convertContractV2(row: unknown[]): ContractDoc {
  // speed_contract_v2 字段：id, clue_id, my_company_id, template_id, contract_no, contract_name,
  // contract_amount, sign_date, sign_user_id, ..., customer_company_name, ..., contract_status, approval_status, ...
  const id = `CT-${row[0]}`;
  const contractStatus = row[23] as number; // 1=草稿,2=已作废,3=已归档
  const approvalStatus = row[24] as number; // 1=待审批,2=已拒绝,3=已通过
  const status = contractStatus === 3 ? 'archived' : contractStatus === 2 ? 'voided' : approvalStatus === 3 ? 'archived' : 'draft';
  const totalAmount = Number(row[6] ?? 0);
  const clueId = row[1] as number;
  const approvedTime = row[29] as number;

  return {
    id,
    contractNo: String(row[4] ?? id),
    status,
    kind: 'main',
    leadId: clueId ? `L-${clueId}` : '',
    current: {
      contractName: String(row[5] ?? ''),
      customerName: String(row[14] ?? ''),
      signingEntity: '中科软齐',
      totalAmount,
      signDate: tsToDate(row[7] as number),
      effectiveDate: tsToDate(row[7] as number),
      endDate: '',
      paymentPlans: [],
    },
    createdAt: tsToDate(row[7] as number),
    updatedAt: tsToDate(approvedTime || row[7] as number),
    receivedAmount: 0,
    receivableAmount: totalAmount,
    executionStatus: status === 'archived' ? '履行中' : '已完成',
  };
}

function convertContractV1(row: unknown[]): ContractDoc {
  // speed_contract 字段：id, name, order_no, business_id, signing_time, start_time, end_time, status, customer_id, ...
  const id = `CT-${row[0]}`;
  const statusVal = row[7] as number; // 0=草稿,1=通过,2=无效
  const status = statusVal === 1 ? 'archived' : statusVal === 2 ? 'voided' : 'draft';
  const totalAmount = Number(row[12] ?? 0);

  return {
    id,
    contractNo: String(row[2] ?? id),
    status,
    kind: 'main',
    leadId: '',
    current: {
      contractName: String(row[1] ?? ''),
      customerName: '',
      signingEntity: '中科软齐',
      totalAmount,
      signDate: tsToDate(row[4] as number),
      effectiveDate: tsToDate(row[5] as number),
      endDate: tsToDate(row[6] as number),
      paymentPlans: [],
    },
    createdAt: tsToDate(row[4] as number),
    updatedAt: tsToDate(row[4] as number),
    receivedAmount: 0,
    receivableAmount: totalAmount,
    executionStatus: status === 'archived' ? '履行中' : '已完成',
  };
}

interface ProjectDoc {
  id: string;
  projectNo: string;
  name: string;
  status: string;
  priority: string;
  businessLine: string;
  entity: string;
  owner: string;
  salesUsers: string[];
  progress: number;
  startDate: string;
  expectedEndDate: string;
  latestProgress: string;
  remark: string;
  createdAt: string;
  contractId: string;
  customerName: string;
  totalHours: number;
  budgetHours: number;
  bugP0Count: number;
  bugP1Count: number;
  daysRemaining: number;
  isOverdue: boolean;
  healthStatus: string;
  contractAmount: number;
  receivedAmount: number;
}

function convertProject(row: unknown[]): ProjectDoc {
  // speed_project 字段：id, name, pro_priority, pro_status, company_id, business_line,
  // leader, saleor, relation_person, total_process, start_time, end_time, project_remark,
  // last_record, last_time, last_user_id, delete_time, update_time, create_time
  const id = `P-${row[0]}`;
  const statusVal = row[3] as number; // 1=未确认,2=进行中,3=已完成,4=验收中,5=搁置
  const status = PROJECT_STATUS_MAP[statusVal] ?? '未确认';
  const priorityVal = row[2] as number; // 1=低,2=中,3=高
  const priority = priorityVal === 3 ? '高' : priorityVal === 1 ? '低' : '中';
  const ownerId = row[6] as number | null;
  const progress = Number(row[9] ?? 0);
  const startTime = row[10] as number | null;
  const endTime = row[11] as number | null;
  const remark = String(row[12] ?? '');
  const latestProgress = String(row[13] ?? '');
  const createTime = row[18] as number;

  return {
    id,
    projectNo: `PRJ-${row[0]}`,
    name: String(row[1] ?? ''),
    status,
    priority,
    businessLine: '外包',
    entity: '中科软齐',
    owner: ownerId ? (USER_MAP[ownerId] ?? '') : '',
    salesUsers: [],
    progress,
    startDate: tsToDate(startTime),
    expectedEndDate: tsToDate(endTime),
    latestProgress,
    remark,
    createdAt: tsToDate(createTime),
    contractId: '',
    customerName: '',
    totalHours: 0,
    budgetHours: 0,
    bugP0Count: 0,
    bugP1Count: 0,
    daysRemaining: 0,
    isOverdue: false,
    healthStatus: 'normal',
    contractAmount: 0,
    receivedAmount: 0,
  };
}

interface EmployeeDoc {
  id: string;
  name: string;
  jobNumber: string;
  department: string;
  position: string;
  level: string;
  employmentStatus: string;
  phone: string;
  email: string;
  hireDate: string;
}

function convertEmployee(row: unknown[]): EmployeeDoc {
  const id = `U-${row[0]}`;
  const deptId = row[7] as number;
  const positionId = row[16] as number;
  const status = row[19] as string;

  return {
    id,
    name: String(row[3] ?? ''),
    jobNumber: String(row[4] ?? ''),
    department: DEPT_MAP[deptId] ?? `部门${deptId}`,
    position: String(row[16] ?? ''),
    level: '',
    employmentStatus: status === '在职' ? 'active' : status === '已离职' ? 'inactive' : 'probation',
    phone: String(row[5] ?? ''),
    email: String(row[6] ?? ''),
    hireDate: tsToDate(row[20] as number),
  };
}

// ── 主流程 ──────────────────────────────────────────────

function main() {
  const sql = readFileSync(SQL_PATH, 'utf-8');

  // 1. 解析部门
  const deptRows = parseInsertRows(sql, 'speed_department');
  for (const row of deptRows) {
    DEPT_MAP[row[0] as number] = String(row[1] ?? '');
  }

  // 2. 解析用户（先建立 USER_MAP）
  const userRows = parseInsertRows(sql, 'speed_user');
  for (const row of userRows) {
    USER_MAP[row[0] as number] = String(row[3] ?? '');
  }

  // 3. 解析线索
  const clueRows = parseInsertRows(sql, 'speed_clues');
  const leads = clueRows.map(convertLead);

  // 4. 解析合同（speed_contract_v2 + speed_contract 合并）
  const contractV2Rows = parseInsertRows(sql, 'speed_contract_v2');
  const contractV1Rows = parseInsertRows(sql, 'speed_contract');
  const contracts = [
    ...contractV2Rows.map(convertContractV2),
    ...contractV1Rows.map(convertContractV1),
  ];

  // 5. 解析项目
  const projectRows = parseInsertRows(sql, 'speed_project');
  const projects = projectRows.map(convertProject);

  // 6. 解析员工
  const employees = userRows.map(convertEmployee);

  // 7. 输出 D1 SQL seed
  const output: string[] = [];
  output.push('-- ═══════════════════════════════════════════════════════════');
  output.push('-- HubX D1 Seed — 从 MySQL zkoadata 迁移');
  output.push('-- 生成时间：' + new Date().toISOString());
  output.push('-- ═══════════════════════════════════════════════════════════');
  output.push('');

  // Leads
  output.push('-- ── 线索 ──');
  for (const lead of leads) {
    const data = JSON.stringify(lead).replace(/'/g, "''");
    output.push(`INSERT OR IGNORE INTO leads (id, data, updated_at, version) VALUES ('${lead.id}', '${data}', '${lead.updateTime}', 0);`);
  }
  output.push('');

  // Contracts
  output.push('-- ── 合同 ──');
  for (const ct of contracts) {
    const data = JSON.stringify(ct).replace(/'/g, "''");
    output.push(`INSERT OR IGNORE INTO contracts (id, data, updated_at, version) VALUES ('${ct.id}', '${data}', '${ct.updatedAt}', 0);`);
  }
  output.push('');

  // Projects
  output.push('-- ── 项目 ──');
  for (const proj of projects) {
    const data = JSON.stringify(proj).replace(/'/g, "''");
    output.push(`INSERT OR IGNORE INTO projects (id, data, updated_at, version) VALUES ('${proj.id}', '${data}', '${proj.createdAt}', 0);`);
  }
  output.push('');

  // 员工数据写入 D1
  output.push('-- ── 员工 ──');
  for (const emp of employees) {
    const data = JSON.stringify(emp).replace(/'/g, "''");
    output.push(`INSERT OR IGNORE INTO employees (id, data, updated_at, version) VALUES ('${emp.id}', '${data}', '', 0);`);
  }
  output.push('');

  // 输出统计
  output.push('-- ── 统计 ──');
  output.push(`-- 线索: ${leads.length} 条`);
  output.push(`-- 合同: ${contracts.length} 条`);
  output.push(`-- 项目: ${projects.length} 条`);
  output.push(`-- 员工: ${employees.length} 条`);

  console.log(output.join('\n'));
}

main();
