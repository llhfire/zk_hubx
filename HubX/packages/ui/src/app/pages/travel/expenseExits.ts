// ========================================
// 差旅模块 - 双出口（T3）
// 财务通过后调用，推进运营费用台账 & 精益成本流水
// α 推进模块级数组，不写运营费用 Context
// ========================================

import type { Reimbursement, Trip } from './types';

export interface LedgerEntry {
  source: 'travel';
  sourceRefId: string;
  categoryPrimary: 'TRAVEL';
  amount: number;
  month: string;
  attribution: 'project' | 'lead_channel';
  projectId?: string;
  leadId?: string;
}

export interface CostItem {
  sourceType: 'reimbursement';
  sourceId: string;
  costCategory: 'commercial';
  costType: '差旅';
  amount: number;
  date: string;
  status: 'actual';
  caseBinding: { projectId?: string; leadId?: string };
}

/** α 模块级收集数组 */
export const emittedLedger: LedgerEntry[] = [];
export const emittedCostItems: CostItem[] = [];

/**
 * 出口1：运营费用台账投影
 * 禁止 attribution='pool'（ADR-0089）
 */
export function emitExpenseLedgerEntry(reimb: Reimbursement, trip: Trip): LedgerEntry {
  const attribution = trip.projectId ? 'project' as const : 'lead_channel' as const;
  const entry: LedgerEntry = {
    source: 'travel',
    sourceRefId: reimb.id,
    categoryPrimary: 'TRAVEL',
    amount: reimb.netAmount,
    month: reimb.createDate.slice(0, 7),
    attribution,
    projectId: trip.projectId,
    leadId: trip.leadId,
  };
  emittedLedger.push(entry);
  return entry;
}

/**
 * 出口2：精益交付成本流水
 */
export function emitCostItem(reimb: Reimbursement, trip: Trip): CostItem {
  const item: CostItem = {
    sourceType: 'reimbursement',
    sourceId: reimb.id,
    costCategory: 'commercial',
    costType: '差旅',
    amount: reimb.netAmount,
    date: reimb.createDate,
    status: 'actual',
    caseBinding: {
      projectId: trip.projectId,
      leadId: trip.leadId,
    },
  };
  emittedCostItems.push(item);
  return item;
}

/** 宿舍月汇总（T4 填数据，T3 先建函数） */
export function getDormitoryMonthlySummary(
  dormExpenses: { amount: number; period: string }[],
  utilityPayments: { amount: number; period: string }[],
  month: string,
): number {
  const expenses = dormExpenses
    .filter(d => d.period.startsWith(month))
    .reduce((s, d) => s + d.amount, 0);
  const utilities = utilityPayments
    .filter(u => u.period.startsWith(month))
    .reduce((s, u) => s + u.amount, 0);
  return expenses + utilities;
}
