// ========================================
// 精益交付 - 纯函数层（calc.ts）
// 常量 + 派生 + 状态机规则
// 页面不要直接加总，一律调这些函数
// ========================================

import { OVERHEAD_RATE } from '../finance-shared/overhead';
import type {
  CaseStatus,
  LeanRole,
  CaseCostItem,
  EvalSheet,
  QuotationAtoms,
} from './types';

// ==================== 常量 ====================

/** 各角色日薪（成本口径） */
export const COST_DAY_RATES: Record<LeanRole, number> = {
  product: 400,
  design: 350,
  frontend: 500,
  backend: 450,
  test: 450,
  other: 350,
};

/** 各角色对外单价（报价口径） */
export const ROLE_PRICES: Record<LeanRole, number> = {
  product: 1000,
  design: 800,
  frontend: 1200,
  backend: 1200,
  test: 600,
  other: 800,
};

/** 报价 eval key → 精益角色映射 */
export const EVAL_ROLE_MAP: Record<string, LeanRole> = {
  pm_days: 'product',
  ui_days: 'design',
  fe_days: 'frontend',
  be_days: 'backend',
  qa_days: 'test',
};

/** WIP 预警阈值（天） */
export const WIP_DAYS_YELLOW = 14;

/** 公摊率（元/工时），从 finance-shared 引入 */
export { OVERHEAD_RATE };

// ==================== 状态机 ====================

/** 合法下一态映射 */
export const CASE_STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  drafting:     ['quoting', 'terminated'],
  quoting:      ['negotiating', 'drafting', 'terminated'],
  negotiating:  ['signed', 'quoting', 'terminated'],
  signed:       ['in_progress', 'terminated'],
  in_progress:  ['suspended', 'accepting', 'collecting', 'terminated'],
  suspended:    ['in_progress', 'terminated'],
  accepting:    ['collecting', 'in_progress'],
  collecting:   ['completed', 'in_progress'],
  completed:    [],
  terminated:   [],
};

/** 判断状态转移是否合法 */
export function canTransit(from: CaseStatus, to: CaseStatus): boolean {
  return CASE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * 建议进入催款：有逾期未收到期次 且 当前为 in_progress / accepting
 */
export function suggestCollecting(
  status: CaseStatus,
  plans: { dueDate: string; amount: number }[],
  collections: { planId?: string; amount: number }[],
  asOf: string,
): boolean {
  if (status !== 'in_progress' && status !== 'accepting') return false;
  // 简化判断：有到期日 < asOf 的期次且未足额收到
  const collectedAmount = collections.reduce((s, c) => s + c.amount, 0);
  const duePlans = plans.filter(p => p.dueDate <= asOf);
  const dueTotal = duePlans.reduce((s, p) => s + p.amount, 0);
  return dueTotal > collectedAmount;
}

// ==================== 派生函数 ====================

/** Σ actual 成本 */
export function deriveTotalCost(costItems: CaseCostItem[]): number {
  return costItems
    .filter(c => c.status === 'actual')
    .reduce((s, c) => s + c.amount, 0);
}

/** Σ actual + Σ forecast = EAC */
export function deriveEac(costItems: CaseCostItem[]): number {
  return costItems.reduce((s, c) => s + c.amount, 0);
}

/** Σ 回款金额 */
export function deriveRevenue(
  collectionRecords: { amount: number }[],
): number {
  return collectionRecords.reduce((s, c) => s + c.amount, 0);
}

/** 有效标的额 = 主合同额 + 已归档未作废补充变更额 */
export function deriveContractAmount(
  mainAmount: number,
  supplements: { amount: number; archived: boolean; voided: boolean }[],
): number {
  const validSupplements = supplements
    .filter(s => s.archived && !s.voided)
    .reduce((s, sup) => s + sup.amount, 0);
  return mainAmount + validSupplements;
}

/** 全周期利润率 = (标的额 − EAC) / 标的额；标的额 ≤ 0 则 null */
export function deriveLifecycleMargin(
  contractAmount: number,
  eac: number,
): number | null {
  if (contractAmount <= 0) return null;
  return (contractAmount - eac) / contractAmount;
}

/** 回款口径利润率 = (回款 − actual) / 回款；回款 = 0 则 null */
export function deriveCollectedMargin(
  revenue: number,
  actualCost: number,
): number | null {
  if (revenue === 0) return null;
  return (revenue - actualCost) / revenue;
}

/** WIP = { value, days } */
export function deriveWip(
  actualCost: number,
  revenue: number,
  lastCollectionDate: string | null,
  asOf: string,
): { value: number; days: number } {
  const value = Math.max(0, actualCost - revenue);
  if (value === 0) return { value: 0, days: 0 };
  if (!lastCollectionDate) {
    // 无回款记录，days = 从 asOf 起算（简化：返回 0，页面可另行计算）
    return { value, days: 0 };
  }
  const last = new Date(lastCollectionDate).getTime();
  const now = new Date(asOf).getTime();
  const days = Math.max(0, Math.floor((now - last) / 86400000));
  return { value, days };
}

/**
 * 健康灯：
 * 红 = margin < target 或 eac > budgetCap
 * 黄 = 未红 且 wipDays > WIP_DAYS_YELLOW
 * 否则绿。红优先于黄。
 */
export function deriveHealth(
  lifecycleMargin: number | null,
  targetMargin: number,
  eac: number,
  budgetCap: number,
  wipDays: number,
): 'green' | 'yellow' | 'red' {
  // eac > budgetCap → 红
  if (budgetCap > 0 && eac > budgetCap) return 'red';
  // margin < target → 红
  if (lifecycleMargin !== null && lifecycleMargin < targetMargin) return 'red';
  // wipDays > 阈值 → 黄
  if (wipDays > WIP_DAYS_YELLOW) return 'yellow';
  return 'green';
}

/** 按 costCategory 汇总 actual / forecast */
export function deriveCostStructure(
  costItems: CaseCostItem[],
): Record<string, { actual: number; forecast: number }> {
  const result: Record<string, { actual: number; forecast: number }> = {};
  for (const item of costItems) {
    if (!result[item.costCategory]) {
      result[item.costCategory] = { actual: 0, forecast: 0 };
    }
    if (item.status === 'actual') {
      result[item.costCategory].actual += item.amount;
    } else {
      result[item.costCategory].forecast += item.amount;
    }
  }
  return result;
}

/**
 * 趋势：按月累计 应收 / 实收 / 成本
 * 注意：此函数签名示意，实际使用需传入完整的 paymentPlans / collectionRecords
 */
export function deriveTrend(
  paymentPlans: { dueDate: string; amount: number }[],
  collectionRecords: { date: string; amount: number }[],
  costItems: CaseCostItem[],
): { month: string; receivable: number; collected: number; cost: number }[] {
  // 收集所有月份
  const months = new Set<string>();
  for (const p of paymentPlans) months.add(p.dueDate.slice(0, 7));
  for (const c of collectionRecords) months.add(c.date.slice(0, 7));
  for (const c of costItems) months.add(c.date.slice(0, 7));

  const sorted = [...months].sort();
  let receivable = 0;
  let collected = 0;
  let cost = 0;

  return sorted.map(month => {
    const mp = paymentPlans.filter(p => p.dueDate.startsWith(month));
    receivable += mp.reduce((s, p) => s + p.amount, 0);
    const cr = collectionRecords.filter(c => c.date.startsWith(month));
    collected += cr.reduce((s, c) => s + c.amount, 0);
    const ci = costItems.filter(c => c.date.startsWith(month));
    cost += ci.reduce((s, c) => s + c.amount, 0);
    return { month, receivable, collected, cost };
  });
}

/** EvalSheet 各精益角色人天合计 */
export function sumEvalDaysByLeanRole(evalSheet: EvalSheet): Record<LeanRole, number> {
  const result: Record<LeanRole, number> = {
    product: 0, design: 0, frontend: 0, backend: 0, test: 0, other: 0,
  };
  for (const [key, days] of Object.entries(evalSheet.evalDays)) {
    const role = EVAL_ROLE_MAP[key] ?? 'other';
    result[role] += days;
  }
  return result;
}

/** 报价汇总 */
export function deriveQuotationTotals(
  atoms: QuotationAtoms,
): { featureQuote: number; serviceTotal: number; passthroughTotal: number; totalAmount: number } {
  // 功能报价 = Σ(人天 × 对外单价)
  let featureQuote = 0;
  for (const role of Object.keys(atoms.roleDays) as LeanRole[]) {
    featureQuote += (atoms.roleDays[role] ?? 0) * (atoms.rolePrices[role] ?? 0);
  }

  let serviceTotal = 0;
  let passthroughTotal = 0;
  for (const item of atoms.serviceItems) {
    if (item.isPassthrough) {
      passthroughTotal += item.amount;
    } else {
      serviceTotal += item.amount;
    }
  }

  // totalAmount = 功能报价 × (1 + 加成率) + 非代收服务项
  const totalAmount = featureQuote * (1 + atoms.marginRate) + serviceTotal;
  return { featureQuote, serviceTotal, passthroughTotal, totalAmount };
}

/**
 * 敏感性模拟：只把 forecast 且 costCategory=labor 的金额 × scopePct
 * actual、商务、运营、第三方不缩
 */
export function simulateSensitivity(
  costItems: CaseCostItem[],
  contractAmount: number,
  scopePct: number,
  targetMargin: number,
): { eac: number; margin: number; breakevenAmount: number; floorPrice: number } {
  let eac = 0;
  for (const item of costItems) {
    if (item.status === 'forecast' && item.costCategory === 'labor') {
      eac += item.amount * scopePct;
    } else {
      eac += item.amount;
    }
  }
  const margin = contractAmount > 0 ? (contractAmount - eac) / contractAmount : 0;
  const breakevenAmount = eac;
  const floorPrice = targetMargin < 1 ? eac / (1 - targetMargin) : Infinity;
  return { eac, margin, breakevenAmount, floorPrice };
}
