/**
 * 差旅 T2 单测 — travelCalc.ts 纯函数
 */
import { describe, it, expect } from 'vitest';
import {
  assertTripBinding,
  calcSubsidyDays,
  calcSubsidy,
  calcOverStandard,
  offsetLoans,
  loanApprovalChain,
} from '../travelCalc';
import { LOAN_FINANCE_THRESHOLD } from '../travelConfig';
import type { Loan, Reimbursement, StandardDetail } from '../types';

// ==================== 夹具 ====================

const std: StandardDetail = {
  id: 'd1', standardId: 'std-2026',
  levels: ['L1', 'L2', 'L3'], cityLevels: ['first_tier'],
  highSpeedRailClass: 'second', bulletTrainClass: 'second', airplaneClass: 'economy',
  selfDriveRate: 0, localTransportLimit: 80,
  hotelLimit: 500, hotelRoomType: '标准间',
  mealAllowance: 0, entertainmentMealLimit: 0,
  communicationAllowance: 0, miscellaneousAllowance: 0,
  subsidyCalcMode: 'calendar_day', subsidyAmount: 150,
};

const makeLoan = (id: string, amount: number, remaining: number, status: Loan['status'], date: string): Loan => ({
  id, loanNo: `LN-${id}`, applicantId: '1', applicantName: '张三', department: '销售部',
  type: 'travel', amount, reason: '出差', payMethod: 'bank',
  status, createDate: date, updateDate: date,
  offsetAmount: amount - remaining, remainingAmount: remaining,
  approvalRecords: [],
});

const makeReimb = (total: number, offset: number, net: number): Reimbursement => ({
  id: 'reimb-1', reimbursementNo: 'BX-001', tripId: '1', tripNo: 'BT-001',
  applicantId: '1', applicantName: '张三', department: '销售部',
  items: [], totalAmount: total, offsetAmount: offset, netAmount: net,
  status: 'finance_approved', createDate: '2026-05-05', updateDate: '2026-05-05',
  approvalRecords: [],
});

// ==================== assertTripBinding ====================

describe('assertTripBinding', () => {
  it('有 project 无 lead → 通过', () => {
    expect(() => assertTripBinding({ projectId: 'p1' })).not.toThrow();
  });

  it('有 lead 无 project → 通过', () => {
    expect(() => assertTripBinding({ leadId: 'l1' })).not.toThrow();
  });

  it('无 project 无 lead → 失败', () => {
    expect(() => assertTripBinding({})).toThrow();
  });

  it('两者都有 → 失败', () => {
    expect(() => assertTripBinding({ projectId: 'p1', leadId: 'l1' })).toThrow();
  });
});

// ==================== calcSubsidyDays ====================

describe('calcSubsidyDays', () => {
  it('2026-04-28 ~ 05-04（7天）→ 5', () => {
    expect(calcSubsidyDays('2026-04-28', '2026-05-04')).toBe(5);
  });

  it('2026-04-26 ~ 04-27（2天）→ 0', () => {
    expect(calcSubsidyDays('2026-04-26', '2026-04-27')).toBe(0);
  });

  it('同日往返 → 0', () => {
    expect(calcSubsidyDays('2026-05-01', '2026-05-01')).toBe(0);
  });
});

// ==================== calcSubsidy ====================

describe('calcSubsidy', () => {
  it('5天 × 150 = 750', () => {
    expect(calcSubsidy(5, 'first_tier', std)).toBe(750);
  });

  it('0天 → 0', () => {
    expect(calcSubsidy(0, 'first_tier', std)).toBe(0);
  });
});

// ==================== calcOverStandard ====================

describe('calcOverStandard', () => {
  it('高铁一等 vs 标准二等 → 硬超标', () => {
    const expense = { type: 'transport' as const, amount: 553 };
    const segment = { transportMode: 'high_speed_rail' as const };
    const result = calcOverStandard(expense as any, segment as any, std);
    // 一等座比二等座贵约 50%，basePrice=553/1.5≈369，overAmount≈184
    expect(result.isOver).toBe(true);
    expect(result.type).toBe('hard');
    expect(result.amount).toBeGreaterThan(0);
  });

  it('住宿 800 vs limit 500 → 软标旗', () => {
    const expense = { type: 'accommodation' as const, amount: 800, overStandardReason: undefined };
    const segment = { accommodation: { pricePerNight: 800 } };
    const result = calcOverStandard(expense as any, segment as any, std);
    expect(result.isOver).toBe(true);
    expect(result.type).toBe('soft');
  });

  it('住宿 400 vs limit 500 → 不超标', () => {
    const expense = { type: 'accommodation' as const, amount: 400 };
    const segment = { accommodation: { pricePerNight: 400 } };
    const result = calcOverStandard(expense as any, segment as any, std);
    expect(result.isOver).toBe(false);
  });

  it('餐饮 → 不进实报', () => {
    const expense = { type: 'meal' as const, amount: 200 };
    const segment = {};
    const result = calcOverStandard(expense as any, segment as any, std);
    expect(result.isOver).toBe(false);
  });
});

// ==================== offsetLoans ====================

describe('offsetLoans', () => {
  it('借款 3000 早、2000 晚，报销 3526 财务通过 → 先冲 3000，再冲 526，净额 0', () => {
    const loans: Loan[] = [
      makeLoan('loan-1', 3000, 3000, 'paid', '2026-04-25'),
      makeLoan('loan-2', 2000, 2000, 'paid', '2026-05-01'),
    ];
    const reimb = makeReimb(3526, 0, 3526);
    const result = offsetLoans(reimb, loans);

    expect(result.updatedLoans[0].remainingAmount).toBe(0);
    expect(result.updatedLoans[0].status).toBe('settled');
    expect(result.updatedLoans[1].remainingAmount).toBe(1474);
    expect(result.updatedLoans[1].status).toBe('offset');
    expect(result.updatedReimbursement.netAmount).toBe(0);
  });

  it('无借款 → 净额不变', () => {
    const reimb = makeReimb(1000, 0, 1000);
    const result = offsetLoans(reimb, []);
    expect(result.updatedReimbursement.netAmount).toBe(1000);
  });
});

// ==================== loanApprovalChain ====================

describe('loanApprovalChain', () => {
  it(`借款 4000（≤ ${LOAN_FINANCE_THRESHOLD}）→ 链长 1`, () => {
    expect(loanApprovalChain(4000)).toBe(1);
  });

  it(`借款 6000（> ${LOAN_FINANCE_THRESHOLD}）→ 链长 2`, () => {
    expect(loanApprovalChain(6000)).toBe(2);
  });
});
