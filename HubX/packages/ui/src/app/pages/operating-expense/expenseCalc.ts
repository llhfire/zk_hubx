// ========================================
// 运营费用 - 纯函数：池、编制工时、R_hour、WMA、预测
// ========================================

import type {
  ExpenseRecord,
  RecurringExpenseTemplate,
} from './types';

export {
  workdaysInRange,
  capacityHours,
  overheadPool,
  hourlyOverheadRate,
  buildOverheadSnapshot,
  overheadAmount,
} from '../finance-shared/overhead';

/**
 * WMA 加权移动平均（0.5/0.3/0.2）
 * 缺月有几月用几月，权重归一
 */
export function wma(values: number[]): number {
  if (values.length === 0) return 0;
  const weights = [0.5, 0.3, 0.2];
  // 取最近几个月（最多 3 个月）
  const recent = values.slice(-3);
  const usedWeights = weights.slice(0, recent.length);
  const totalWeight = usedWeights.reduce((s, w) => s + w, 0);
  let sum = 0;
  for (let i = 0; i < recent.length; i++) {
    sum += recent[i] * usedWeights[i];
  }
  return sum / totalWeight;
}

/**
 * 预测切片：确定模板 + WMA + 工资平移分列
 */
export function forecastSlice(
  templates: RecurringExpenseTemplate[],
  recentPoolValues: number[],
  payrollTotal: number,
  month: string,
): { templateTotal: number; wmaTotal: number; payroll: number } {
  // 确定模板：active 且覆盖该月的固定模板
  const fixedTemplates = templates.filter(
    t => t.status === 'active' && t.kind === 'fixed' && t.startMonth <= month && (!t.endMonth || t.endMonth >= month),
  );
  const templateTotal = fixedTemplates.reduce((sum, t) => sum + t.amount, 0);

  // WMA：最近几个月的非模板费用池
  const wmaTotal = wma(recentPoolValues);

  return { templateTotal, wmaTotal, payroll: payrollTotal };
}

/**
 * 最近已出账月工资合计
 * 从工资表 mock 取 actualSalary ?? nominalSalary
 */
export function latestPayrollTotal(
  salaryRows: { actualSalary?: number; nominalSalary: number }[],
): number {
  return salaryRows.reduce((sum, r) => sum + (r.actualSalary ?? r.nominalSalary), 0);
}

// ─── 4.3 新增：双口径、排行、堆叠 ──────────────────────────

import type { ExpenseCategoryPrimary } from './types';

/** 堆叠层序（不含 LABOR） */
export const STACK_PRIMARIES: ExpenseCategoryPrimary[] = [
  'OFFICE', 'BENEFIT', 'HR_ADMIN', 'OTHER',
  'TRAVEL', 'PROMOTION', 'BUSINESS', 'THIRD_PARTY',
];

/** 是否已入账 */
export function isPosted(r: ExpenseRecord): boolean {
  return r.status === 'posted';
}

/** 当月台账合计（已入账 + 未作废） */
export function postedLedgerTotal(records: ExpenseRecord[], month: string): number {
  return records
    .filter((r) => isPosted(r) && r.billingMonth === month)
    .reduce((s, r) => s + r.amount, 0);
}

/** 按归属归口的直接支出 */
export function directByAttribution(
  records: ExpenseRecord[],
  month: string,
  attribution: Attribution,
): number {
  return records
    .filter((r) => isPosted(r) && r.billingMonth === month && r.attribution === attribution)
    .reduce((s, r) => s + r.amount, 0);
}

/** 八层科目堆叠（不含 LABOR） */
export function categoryStack(
  records: ExpenseRecord[],
  month: string,
): Record<ExpenseCategoryPrimary, number> {
  const out = Object.fromEntries(STACK_PRIMARIES.map((p) => [p, 0])) as Record<ExpenseCategoryPrimary, number>;
  for (const r of records) {
    if (!isPosted(r) || r.billingMonth !== month) continue;
    if (r.categoryPrimary === 'LABOR') continue;
    if (out[r.categoryPrimary] !== undefined) out[r.categoryPrimary] += r.amount;
  }
  return out;
}

/** 含/不含人力的总额 */
export function includeLaborTotal(ledgerTotal: number, payroll: number, includeLabor: boolean): number {
  return includeLabor ? ledgerTotal + payroll : ledgerTotal;
}

export interface RankRow {
  key: string;
  name: string;
  amount: number;
}

/** 部门归口排行 */
export function rankByDepartment(
  records: ExpenseRecord[],
  month: string,
  nameOf: (departmentId: string) => string,
): RankRow[] {
  const map = new Map<string, number>();
  for (const r of records) {
    if (!isPosted(r) || r.billingMonth !== month) continue;
    if (!r.departmentId) continue;
    map.set(r.departmentId, (map.get(r.departmentId) ?? 0) + r.amount);
  }
  return Array.from(map.entries())
    .map(([key, amount]) => ({ key, name: nameOf(key), amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** 项目直接支出排行 */
export function rankByProject(
  records: ExpenseRecord[],
  month: string,
  nameOf: (projectId: string) => string,
): RankRow[] {
  const map = new Map<string, number>();
  for (const r of records) {
    if (!isPosted(r) || r.billingMonth !== month) continue;
    if (r.attribution !== 'project' || !r.projectId) continue;
    map.set(r.projectId, (map.get(r.projectId) ?? 0) + r.amount);
  }
  return Array.from(map.entries())
    .map(([key, amount]) => ({ key, name: nameOf(key), amount }))
    .sort((a, b) => b.amount - a.amount);
}
