/**
 * 差旅 T3 单测 — 出口函数
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  emitExpenseLedgerEntry,
  emitCostItem,
  getDormitoryMonthlySummary,
  emittedLedger,
  emittedCostItems,
} from '../expenseExits';
import type { Reimbursement, Trip } from '../types';

const trip: Trip = {
  id: '1', tripNo: 'BT-001', applicantId: '1', applicantName: '张三', department: '销售部',
  destinations: ['杭州'], startDate: '2026-04-28', endDate: '2026-05-04', days: 7,
  transportModes: ['high_speed_rail'], accommodationIntent: 'hotel', estimatedAccommodationDays: 6,
  estimatedTransportCost: 0, estimatedAccommodationCost: 0, estimatedMealCost: 0,
  estimatedOtherCost: 0, estimatedTotalCost: 0, needLoan: false,
  status: 'closed', purpose: '驻场', createDate: '2026-04-24', updateDate: '2026-05-05',
  projectId: 'project-001',
};

const leadTrip: Trip = { ...trip, id: '3', projectId: undefined, leadId: 'lead-1' };

const reimb: Reimbursement = {
  id: 'reimb-1', reimbursementNo: 'BX-001', tripId: '1', tripNo: 'BT-001',
  applicantId: '1', applicantName: '张三', department: '销售部',
  items: [], totalAmount: 2886, offsetAmount: 0, netAmount: 2886,
  status: 'finance_approved', createDate: '2026-05-05', updateDate: '2026-05-05',
};

describe('emitExpenseLedgerEntry', () => {
  it('挂项目 → attribution=project', () => {
    const entry = emitExpenseLedgerEntry(reimb, trip);
    expect(entry.attribution).toBe('project');
    expect(entry.source).toBe('travel');
    expect(entry.amount).toBe(2886);
    expect(entry.attribution).not.toBe('pool');
  });

  it('挂线索 → attribution=lead_channel', () => {
    const entry = emitExpenseLedgerEntry(reimb, leadTrip);
    expect(entry.attribution).toBe('lead_channel');
    expect(entry.leadId).toBe('lead-1');
  });
});

describe('emitCostItem', () => {
  it('生成成本流水', () => {
    const item = emitCostItem(reimb, trip);
    expect(item.sourceType).toBe('reimbursement');
    expect(item.costCategory).toBe('travel');
    expect(item.costType).toBe('差旅');
    expect(item.caseBinding.projectId).toBe('project-001');
  });
});

describe('getDormitoryMonthlySummary', () => {
  it('汇总宿舍费用 + 水电', () => {
    const dorm = [{ amount: 3000, period: '2026-07' }, { amount: 3000, period: '2026-08' }];
    const util = [{ amount: 500, period: '2026-07' }];
    expect(getDormitoryMonthlySummary(dorm, util, '2026-07')).toBe(3500);
  });

  it('无匹配月份 → 0', () => {
    expect(getDormitoryMonthlySummary([], [], '2026-09')).toBe(0);
  });
});
