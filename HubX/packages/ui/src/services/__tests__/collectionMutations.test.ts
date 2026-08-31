import { describe, expect, it } from 'vitest';
import {
  allocateCollectionAmount,
  collectionAmountForPeriod,
  getCollectionPeriods,
} from '../collectionMutations';

const plans = [
  { period: 1, expectedDate: '2026-09-01', amount: 50_000, percentage: 50 },
  { period: 2, expectedDate: '2026-10-01', amount: 50_000, percentage: 50 },
];

describe('多期次实收分配', () => {
  it('一笔两期合付按每期剩余应收拆分，且总金额不重复', () => {
    const allocations = allocateCollectionAmount({ periods: [1, 2], amount: 70_000, plans });

    expect(allocations).toEqual([
      { period: 1, amount: 50_000 },
      { period: 2, amount: 20_000 },
    ]);
    expect(allocations.reduce((sum, item) => sum + item.amount, 0)).toBe(70_000);
  });

  it('已有部分实收时优先补足当前期，再分配到下一期', () => {
    const allocations = allocateCollectionAmount({
      periods: [1, 2],
      amount: 70_000,
      plans,
      allocatedByPeriod: new Map([[1, 30_000]]),
    });

    expect(allocations).toEqual([
      { period: 1, amount: 20_000 },
      { period: 2, amount: 50_000 },
    ]);
  });

  it('即使倒序选择期次，也始终按合同期次顺序优先冲抵', () => {
    const allocations = allocateCollectionAmount({ periods: [2, 1], amount: 70_000, plans });

    expect(allocations).toEqual([
      { period: 1, amount: 50_000 },
      { period: 2, amount: 20_000 },
    ]);
  });

  it('可从新旧记录中读取期次与各期金额', () => {
    const record = {
      amount: 100_000,
      period: 1 as const,
      periods: [1, 2],
      periodAllocations: [{ period: 1, amount: 50_000 }, { period: 2, amount: 50_000 }],
    };
    expect(getCollectionPeriods(record)).toEqual([1, 2]);
    expect(collectionAmountForPeriod(record, 2)).toBe(50_000);
  });
});
