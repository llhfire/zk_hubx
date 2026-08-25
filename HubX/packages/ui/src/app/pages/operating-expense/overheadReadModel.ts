// 公摊结果表只读模型
// 从精益交付 mock/成本项拼只读行；缺字段用对齐 mock，不在本模块重算毛利。

import type { ExpenseRecord } from './types';

/** 精益成本项最小接口（只读，不改精益 calc.ts） */
interface LeanCostItem {
  id: string;
  caseId: string;
  costCategory: string;
  sourceType: string;
  amount: number;
  date: string;
  endDate?: string;
  quantityDays?: number;
  status: string;
}

interface CaseRef {
  id: string;
  projectId?: string;
  projectName?: string;
  contractId?: string;
}

export interface OverheadReadRow {
  projectId: string;
  projectName: string;
  caseId?: string;
  hours: number;
  laborCost: number;
  ledgerDirect: number;
  overhead: number;          // hours * rHour
  contractAmount: number;
  eac: number;
  margin: number | null;
}

export interface OverheadReadModel {
  month: string;
  rHour: number;
  pool: number;
  capacityHours: number;
  rows: OverheadReadRow[];
  allocated: number;
  unallocated: number;
  hoursOverflow: boolean;
}

/** 该 Case 当月人力成本（date 所在月） */
export function laborCostInMonth(items: LeanCostItem[], month: string): number {
  return items
    .filter((i) => i.costCategory === 'labor' && i.status === 'actual' && i.date.slice(0, 7) === month)
    .reduce((s, i) => s + i.amount, 0);
}

/** 该 Case 当月项目工时（overhead sourceType 的 quantityDays * 8） */
export function projectHoursInMonth(items: LeanCostItem[], month: string): number {
  return items
    .filter((i) => i.sourceType === 'overhead' && i.date.slice(0, 7) === month)
    .reduce((s, i) => s + (i.quantityDays ?? 0) * 8, 0);
}

/** 构建公摊结果表只读模型 */
export function buildOverheadReadModel(args: {
  month: string;
  records: ExpenseRecord[];
  rHour: number;
  pool: number;
  capacityHours: number;
  cases: CaseRef[];
  costItems: LeanCostItem[];
  getContract?: (contractId: string) => { totalAmount?: number } | undefined;
  deriveEac?: (items: LeanCostItem[]) => number;
  deriveLifecycleMargin?: (contractAmount: number, eac: number) => number | null;
}): OverheadReadModel {
  const {
    month,
    rHour,
    pool,
    capacityHours,
    cases,
    costItems,
    getContract,
    deriveEac,
    deriveLifecycleMargin,
  } = args;

  const rows: OverheadReadRow[] = [];

  for (const c of cases) {
    if (!c.projectId) continue;
    const caseItems = costItems.filter((i) => i.caseId === c.id);
    const hours = projectHoursInMonth(caseItems, month);
    const laborCost = laborCostInMonth(caseItems, month);
    const ledgerDirect = args.records
      .filter((r) => r.attribution === 'project' && r.projectId === c.projectId && r.billingMonth === month && r.status === 'posted')
      .reduce((s, r) => s + r.amount, 0);
    const overhead = hours * rHour;

    const contract = c.contractId ? getContract?.(c.contractId) : undefined;
    const contractAmount = contract?.totalAmount ?? 0;
    const eac = deriveEac ? deriveEac(caseItems) : 0;
    const margin = contractAmount > 0 && deriveLifecycleMargin
      ? deriveLifecycleMargin(contractAmount, eac)
      : null;

    rows.push({
      projectId: c.projectId,
      projectName: c.projectName ?? c.projectId,
      caseId: c.id,
      hours,
      laborCost,
      ledgerDirect,
      overhead,
      contractAmount,
      eac,
      margin,
    });
  }

  const allocated = rows.reduce((s, r) => s + r.overhead, 0);
  const hoursOverflow = rows.reduce((s, r) => s + r.hours, 0) > capacityHours;
  const unallocated = hoursOverflow ? 0 : Math.max(0, pool - allocated);

  return { month, rHour, pool, capacityHours, rows, allocated, unallocated, hoursOverflow };
}
