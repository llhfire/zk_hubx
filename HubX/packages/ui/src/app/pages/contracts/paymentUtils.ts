import type { Contract, PaymentPlanItem, PaymentStatus, DunningRecord } from './types';
import { collectionAmountForPeriod, getCollectionPeriods } from '../../../services/collectionMutations';

const BUFFER_DAYS = 7;

export function getReceivedAmount(c: Contract): number {
  return (c.collectionRecords ?? []).reduce((sum, r) => sum + r.amount, 0);
}

/**
 * 计算有效标的额：主合同额 + Σ已归档且未作废的补充合同额
 * @param main 主合同
 * @param supplements 该主合同下的补充合同列表（kind === 'supplement' && parentContractId === main.id）
 */
export function effectiveAmount(main: Contract, supplements: Contract[]): number {
  const archivedSupplementAmount = supplements
    .filter(s => s.kind === 'supplement' && s.status === 'archived' && s.status !== 'voided')
    .reduce((sum, s) => sum + (s.current?.totalAmount ?? 0), 0);
  return (main.current?.totalAmount ?? 0) + archivedSupplementAmount;
}

function getNextPendingPlan(c: Contract, now: Date) {
  const plans = c.current.paymentPlans ?? [];
  const received = getReceivedAmount(c);
  let accumulated = 0;
  for (const plan of plans) {
    accumulated += plan.amount;
    if (received < accumulated) {
      return plan;
    }
  }
  return null;
}

export function computePaymentStatus(c: Contract, now: Date = new Date()): PaymentStatus {
  const hasActiveBlocker = (c.paymentBlockers ?? []).some(b => !b.resolvedAt);
  if (hasActiveBlocker) return 'blocked';

  const total = c.current.totalAmount;
  const received = getReceivedAmount(c);
  if (received >= total) return 'settled';

  const plans = c.current.paymentPlans ?? [];
  const bufferMs = BUFFER_DAYS * 24 * 60 * 60 * 1000;

  let accBefore = 0;
  for (const plan of plans) {
    const expected = new Date(plan.expectedDate);
    const deadline = new Date(expected.getTime() + bufferMs);
    const planReceived = Math.max(0, received - accBefore);
    const planDue = plan.amount;

    if (now > deadline && planReceived < planDue) {
      return 'overdue';
    }
    accBefore += plan.amount;
  }

  const nextPlan = getNextPendingPlan(c, now);
  if (nextPlan) {
    const expected = new Date(nextPlan.expectedDate);
    const diffMs = expected.getTime() - now.getTime();
    const diffDays = diffMs / (24 * 60 * 60 * 1000);
    if (diffDays <= BUFFER_DAYS && diffDays >= 0) {
      return 'upcoming';
    }
  }

  return 'normal';
}

export interface KanbanSummary {
  totalContracts: number;
  totalReceivable: number;
  monthlyCollected: number;
  overdueAmount: number;
  blockedCount: number;
  blockedAmount: number;
  upcomingMonthEstimate: number;
}

// ─── 期次回款状态（合同详情「回款」Tab 用） ──────────────────────

export type PlanStatusKind = 'paid' | 'partial' | 'overdue' | 'upcoming' | 'pending';

export interface PlanStatusRow {
  plan: PaymentPlanItem;
  /** 按期次顺序累计分摊后，该期已到账金额 */
  allocated: number;
  status: PlanStatusKind;
}

/**
 * 把已回款金额按期次顺序分摊，推导每一期的回款状态：
 * paid 已收足 / partial 部分已收 / overdue 逾期（超预计日期+缓冲仍未收足）/
 * upcoming 即将到期（7 天内）/ pending 待收。
 */
export function computePlanStatusRows(c: Contract, now: Date = new Date()): PlanStatusRow[] {
  const plans = c.current.paymentPlans ?? [];
  const bufferMs = BUFFER_DAYS * 24 * 60 * 60 * 1000;
  const records = c.collectionRecords ?? [];
  const explicitlyAllocated = new Map<number, number>();
  let unassigned = 0;

  records.forEach((record) => {
    const periods = getCollectionPeriods(record);
    if (periods.length === 0 || (periods.length > 1 && !record.periodAllocations?.length)) {
      unassigned += Number(record.amount) || 0;
      return;
    }
    plans.forEach((plan) => {
      const amount = collectionAmountForPeriod(record, plan.period);
      if (amount > 0) explicitlyAllocated.set(plan.period, (explicitlyAllocated.get(plan.period) ?? 0) + amount);
    });
  });

  return plans.map((plan) => {
    const direct = explicitlyAllocated.get(plan.period) ?? 0;
    const fallback = Math.min(Math.max(0, plan.amount - direct), unassigned);
    unassigned -= fallback;
    const allocated = Math.max(0, Math.min(plan.amount, direct + fallback));

    let status: PlanStatusKind;
    if (allocated >= plan.amount) {
      status = 'paid';
    } else {
      const expected = new Date(plan.expectedDate);
      if (Number.isNaN(expected.getTime())) {
        status = allocated > 0 ? 'partial' : 'pending';
      } else if (now.getTime() > expected.getTime() + bufferMs) {
        status = 'overdue';
      } else if (expected.getTime() - now.getTime() <= bufferMs) {
        status = allocated > 0 ? 'partial' : 'upcoming';
      } else {
        status = allocated > 0 ? 'partial' : 'pending';
      }
    }
    return { plan, allocated, status };
  });
}

export const PLAN_STATUS_META: Record<PlanStatusKind, { label: string; color: string }> = {
  paid: { label: '已收', color: 'green' },
  partial: { label: '部分已收', color: 'orange' },
  overdue: { label: '逾期', color: 'red' },
  upcoming: { label: '即将到期', color: 'orange' },
  pending: { label: '待收', color: 'gray' },
};

export function computeKanbanSummary(contracts: Contract[], now: Date = new Date()): KanbanSummary {
  const year = now.getFullYear();
  const month = now.getMonth();
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  let totalReceivable = 0;
  let monthlyCollected = 0;
  let overdueAmount = 0;
  let blockedCount = 0;
  let blockedAmount = 0;
  let upcomingMonthEstimate = 0;

  for (const c of contracts) {
    if (c.status === 'voided') continue;
    totalReceivable += c.current.totalAmount;

    for (const r of (c.collectionRecords ?? [])) {
      const d = new Date(r.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        monthlyCollected += r.amount;
      }
    }

    const activeBlockers = (c.paymentBlockers ?? []).filter(b => !b.resolvedAt);
    if (activeBlockers.length > 0) {
      blockedCount++;
      blockedAmount += activeBlockers.reduce((s, b) => s + b.amountBlocked, 0);
    }

    for (const plan of (c.current.paymentPlans ?? [])) {
      const d = new Date(plan.expectedDate);
      if (d.getFullYear() === nextYear && d.getMonth() === nextMonth) {
        upcomingMonthEstimate += plan.amount;
      }
    }
  }

  // 计算逾期金额
  for (const c of contracts) {
    if (c.status === 'voided') continue;
    const received = getReceivedAmount(c);
    const plans = c.current.paymentPlans ?? [];
    let accBefore = 0;
    for (const plan of plans) {
      const deadline = new Date(new Date(plan.expectedDate).getTime() + BUFFER_DAYS * 86400000);
      if (now > deadline) {
        const planRcvd = Math.min(plan.amount, Math.max(0, received - accBefore));
        if (planRcvd < plan.amount) {
          overdueAmount += (plan.amount - planRcvd);
        }
      }
      accBefore += plan.amount;
    }
  }

  return {
    totalContracts: contracts.filter(c => c.status !== 'voided').length,
    totalReceivable,
    monthlyCollected,
    overdueAmount,
    blockedCount,
    blockedAmount,
    upcomingMonthEstimate,
  };
}

export function getLatestDunning(records: DunningRecord[]): DunningRecord | null {
  if (!records || records.length === 0) return null;
  return records.reduce((latest, r) =>
    new Date(r.date) > new Date(latest.date) ? r : latest
  );
}
