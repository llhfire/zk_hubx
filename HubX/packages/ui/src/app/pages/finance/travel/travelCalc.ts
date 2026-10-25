// ========================================
// 差旅模块 - 纯函数层
// 与报价 quoteFlow.ts 同套路
// ========================================

import { LOAN_FINANCE_THRESHOLD } from './travelConfig';
import type {
  Trip,
  Loan,
  Reimbursement,
  Expense,
  ItinerarySegment,
  StandardDetail,
  CityLevel,
} from './types';

// ==================== 校验 ====================

/**
 * 出差单绑定校验：projectId 与 leadId 恰好一个非空
 */
export function assertTripBinding(trip: Pick<Trip, 'projectId' | 'leadId'>): void {
  const hasProject = !!trip.projectId;
  const hasLead = !!trip.leadId;
  if (hasProject === hasLead) {
    throw new Error('出差单必须关联项目或线索，且不能同时关联两者');
  }
}

// ==================== 补贴 ====================

/**
 * 补贴天数 = 自然日数 − 2（出发日 + 返回日），最小 0
 * 出发=返回 → 0
 */
export function calcSubsidyDays(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const calendarDays = Math.floor(diffMs / 86400000) + 1; // 包含首尾
  return Math.max(0, calendarDays - 2);
}

/**
 * 补贴金额 = 天数 × 该城等级 subsidyAmount
 * 单一包干
 */
export function calcSubsidy(
  days: number,
  _cityLevel: CityLevel,
  standard: StandardDetail,
): number {
  return days * standard.subsidyAmount;
}

// ==================== 超标 ====================

export interface OverStandardResult {
  isOver: boolean;
  type: 'hard' | 'soft';
  amount: number;      // 超标金额（硬超标=差额，软标=0但需原因）
  reason?: string;
}

/**
 * 超标校验
 * 交通：席别高于标准 → 硬超标，差额自付
 * 住宿：单价 > hotelLimit → 软标旗，须 overStandardReason
 * 餐饮：不进实报（调用方过滤）
 */
export function calcOverStandard(
  expense: Pick<Expense, 'type' | 'amount' | 'overStandardReason'>,
  segment: Pick<ItinerarySegment, 'transportMode' | 'accommodation'>,
  standard: StandardDetail,
): OverStandardResult {
  // 交通超标
  if (expense.type === 'transport') {
    // 简化判断：高铁一等 vs 标准二等
    if (segment.transportMode === 'high_speed_rail') {
      if (standard.highSpeedRailClass === 'second') {
        // 假设一等座比二等座贵约 50%
        const basePrice = expense.amount / 1.5;
        const overAmount = expense.amount - basePrice;
        if (overAmount > 0) {
          return { isOver: true, type: 'hard', amount: Math.round(overAmount) };
        }
      }
    }
    return { isOver: false, type: 'hard', amount: 0 };
  }

  // 住宿超标
  if (expense.type === 'accommodation') {
    const pricePerNight = segment.accommodation?.pricePerNight ?? 0;
    if (pricePerNight > standard.hotelLimit) {
      return {
        isOver: true,
        type: 'soft',
        amount: 0,
        reason: expense.overStandardReason,
      };
    }
    return { isOver: false, type: 'soft', amount: 0 };
  }

  // 餐饮：不进实报
  if (expense.type === 'meal') {
    return { isOver: false, type: 'soft', amount: 0 };
  }

  return { isOver: false, type: 'soft', amount: 0 };
}

// ==================== 借款冲抵 ====================

export interface OffsetResult {
  updatedLoans: Loan[];
  updatedReimbursement: Reimbursement;
}

/**
 * 财务通过后，按借款 createDate 升序冲未结
 * status paid/offset 且 remaining > 0
 * 返回更新后的 loans + reimb.netAmount
 */
export function offsetLoans(
  reimb: Reimbursement,
  loans: Loan[],
): OffsetResult {
  let remaining = reimb.totalAmount - reimb.offsetAmount;
  const updatedLoans = loans.map(l => ({ ...l }));
  const offsets = [...(reimb.loanOffsets ?? [])];

  // 按 createDate 升序
  const unsettled = updatedLoans
    .filter(l => (l.status === 'paid' || l.status === 'offset') && l.remainingAmount > 0)
    .sort((a, b) => a.createDate.localeCompare(b.createDate));

  for (const loan of unsettled) {
    if (remaining <= 0) break;
    const canOffset = Math.min(remaining, loan.remainingAmount);
    loan.remainingAmount -= canOffset;
    loan.offsetAmount += canOffset;
    remaining -= canOffset;

    // 更新 loan 状态
    if (loan.remainingAmount <= 0) {
      loan.status = 'settled';
    } else {
      loan.status = 'offset';
    }

    offsets.push({
      id: `offset-${loan.id}-${Date.now()}`,
      loanId: loan.id,
      loanNo: loan.loanNo,
      reimbursementId: reimb.id,
      offsetAmount: canOffset,
      offsetDate: new Date().toISOString().slice(0, 10),
    });
  }

  const netAmount = Math.max(0, remaining);
  const totalOffset = reimb.totalAmount - netAmount - reimb.offsetAmount;

  return {
    updatedLoans,
    updatedReimbursement: {
      ...reimb,
      offsetAmount: reimb.offsetAmount + totalOffset,
      netAmount,
      loanOffsets: offsets,
    },
  };
}

// ==================== 审批链 ====================

export interface ApprovalStep {
  step: string;
  approver: string;
  approverId: string;
}

/**
 * 借款审批链长
 * ≤ LOAN_FINANCE_THRESHOLD 仅部门主管终审（链长 1）
 * > LOAN_FINANCE_THRESHOLD 主管→财务（链长 2）
 */
export function loanApprovalChain(amount: number): number {
  return amount > LOAN_FINANCE_THRESHOLD ? 2 : 1;
}
