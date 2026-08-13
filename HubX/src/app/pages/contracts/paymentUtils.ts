import type { Contract, PaymentStatus, DunningRecord } from './types';

const BUFFER_DAYS = 7;

export function getReceivedAmount(c: Contract): number {
  return (c.collectionRecords ?? []).reduce((sum, r) => sum + r.amount, 0);
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
