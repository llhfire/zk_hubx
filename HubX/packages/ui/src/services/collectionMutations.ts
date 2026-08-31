// 回款实收台账纯函数（B4）。期次计划仍长在合同 paymentPlans 上；本层只处理实际到账款。

import type { CollectionRecord, Contract, PaymentPlanItem } from '../app/pages/contracts/types';

export type CollectionLedgerEntry = CollectionRecord & { projectId?: string };

export function generateCollectionId(): string {
  return `col-${Date.now()}`;
}

export function buildCollectionRecord(
  input: Omit<CollectionLedgerEntry, 'id'> & { id?: string },
): CollectionLedgerEntry {
  const amount = Number(input.amount);
  if (!input.contractId) throw new Error('实收必须关联合同');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('实收金额必须大于 0');
  if (!input.date) throw new Error('实收必须有到账日期');
  return {
    id: input.id || generateCollectionId(),
    contractId: input.contractId,
    projectId: input.projectId,
    period: input.period,
    periods: input.periods,
    periodAllocations: input.periodAllocations,
    amount,
    date: input.date,
    method: input.method || '银行汇款',
    note: input.note || '',
  };
}

export type CollectionPeriod = number | 'other';

export function getCollectionPeriods(record: Pick<CollectionRecord, 'period' | 'periods' | 'periodAllocations'>): CollectionPeriod[] {
  const values = record.periods?.length
    ? record.periods
    : record.periodAllocations?.length
      ? record.periodAllocations.map((item) => item.period)
      : record.period !== undefined
        ? [record.period]
        : [];
  return [...new Set(values)];
}

export function collectionIncludesPeriod(
  record: Pick<CollectionRecord, 'period' | 'periods' | 'periodAllocations'>,
  period: number,
): boolean {
  return getCollectionPeriods(record).includes(period);
}

/**
 * 返回一笔实收明确归属某期的金额。没有期次的旧数据返回 0，交给调用方按顺序兜底分摊。
 */
export function collectionAmountForPeriod(
  record: Pick<CollectionRecord, 'amount' | 'period' | 'periods' | 'periodAllocations'>,
  period: number,
): number {
  if (record.periodAllocations?.length) {
    return record.periodAllocations
      .filter((item) => item.period === period)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }
  const periods = getCollectionPeriods(record);
  return periods.length === 1 && periods[0] === period ? Number(record.amount) || 0 : 0;
}

/** 把一笔合并到账按合同期次顺序冲抵剩余应收；超额部分归到最后一个所选期次。 */
export function allocateCollectionAmount(input: {
  periods: CollectionPeriod[];
  amount: number;
  plans: PaymentPlanItem[];
  allocatedByPeriod?: Map<number, number>;
}): Array<{ period: CollectionPeriod; amount: number }> {
  const periods = [...new Set(input.periods)].sort((left, right) => {
    if (left === 'other') return 1;
    if (right === 'other') return -1;
    return left - right;
  });
  let remaining = Math.max(0, Number(input.amount) || 0);
  const allocations: Array<{ period: CollectionPeriod; amount: number }> = [];

  periods.forEach((period) => {
    if (remaining <= 0) return;
    if (period === 'other') {
      allocations.push({ period, amount: remaining });
      remaining = 0;
      return;
    }
    const planAmount = input.plans.find((plan) => plan.period === period)?.amount ?? 0;
    const allocated = input.allocatedByPeriod?.get(period) ?? 0;
    const due = Math.max(0, planAmount - allocated);
    const amount = Math.min(remaining, due);
    if (amount > 0) allocations.push({ period, amount });
    remaining -= amount;
  });

  if (remaining > 0 && periods.length > 0) {
    const period = periods.at(-1)!;
    const existing = allocations.find((item) => item.period === period);
    if (existing) existing.amount += remaining;
    else allocations.push({ period, amount: remaining });
  }
  return allocations;
}

export function sumReceived(records: Array<{ amount: number }>): number {
  return records.reduce((s, r) => s + (Number(r.amount) || 0), 0);
}

/** 从合同嵌套 collectionRecords 抽出独立台账（合同 id 为准，纠正种子里 contractId 不一致） */
export function seedCollectionsFromContracts(contracts: Contract[]): CollectionLedgerEntry[] {
  return contracts.flatMap((c) =>
    (c.collectionRecords ?? []).map((r) =>
      buildCollectionRecord({
        ...r,
        id: r.id,
        contractId: c.id,
        projectId: c.projectId,
      }),
    ),
  );
}

export function collectionsForProject(
  records: CollectionLedgerEntry[],
  input: { projectId?: string; contractIds: string[] },
): CollectionLedgerEntry[] {
  const ids = new Set(input.contractIds.filter(Boolean));
  return records.filter(
    (r) => (input.projectId && r.projectId === input.projectId) || ids.has(r.contractId),
  );
}

/**
 * 把独立实收台账投影到合同读模型。
 * collectionRecords 仅作为旧组件兼容字段，金额事实始终来自 records。
 */
export function withCollectionLedger(
  contract: Contract,
  records: CollectionLedgerEntry[],
): Contract {
  const collectionRecords = records.filter((record) => record.contractId === contract.id);
  const receivedAmount = sumReceived(collectionRecords);
  return {
    ...contract,
    collectionRecords,
    receivedAmount,
    receivableAmount: Math.max(0, contract.current.totalAmount - receivedAmount),
  };
}

/** 双写状态 */
export type DualWriteStatus = 'ok' | 'contract-failed' | 'ledger-failed';

/** 双写结果 */
export interface DualWriteResult {
  status: DualWriteStatus;
  collectionId: string;
}

/**
 * 洞 B：合同登记双写实收台账（先合同 PUT，成功后再 POST 台账）
 * 钉死顺序：先合同，后台账。禁止先台账。
 * INSERT OR IGNORE 使同一 collectionId 的台账重试安全。
 */
export async function registerMainPaymentDualWrite(input: {
  contractId: string;
  projectId?: string;
  record: Omit<CollectionRecord, 'id' | 'contractId'>;
  addToContract: (contractId: string, record: Omit<CollectionRecord, 'id' | 'contractId'> & { id?: string }) => Promise<boolean>;
  addToLedger: (entry: Omit<CollectionLedgerEntry, 'id'> & { id?: string }) => Promise<string>;
}): Promise<DualWriteResult> {
  const id = generateCollectionId();
  const projectId = input.projectId || `ap-${input.contractId}`;
  const withId = { ...input.record, id };

  // 先合同 PUT
  const contractOk = await input.addToContract(input.contractId, withId);
  if (!contractOk) {
    return { status: 'contract-failed', collectionId: id }; // 禁止 addToLedger
  }

  // 后台账 POST
  const ledgerId = await input.addToLedger({
    ...withId,
    contractId: input.contractId,
    projectId,
  });

  if (!ledgerId) {
    return { status: 'ledger-failed', collectionId: id };
  }

  return { status: 'ok', collectionId: id };
}
