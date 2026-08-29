import { describe, expect, it } from 'vitest';
import { buildInitialContracts } from '../../contracts/mockData';
import {
  effectiveAmount,
  getCollections,
  getContract,
  getPaymentPlans,
  totalCollected,
} from '../contractSeam';

describe('financial-delivery contract seam', () => {
  it('回款只读取调用方传入的独立实收台账', () => {
    const ledger = [
      { id: 'ledger-1', contractId: 'contract-001', amount: 1200, date: '2026-08-28', method: '银行汇款', note: '' },
      { id: 'ledger-2', contractId: 'other', amount: 9999, date: '2026-08-28', method: '银行汇款', note: '' },
    ];

    expect(getCollections('contract-001', ledger)).toEqual([
      { amount: 1200, date: '2026-08-28' },
    ]);
    expect(totalCollected('contract-001', ledger)).toBe(1200);
    expect(getCollections('contract-003', [])).toEqual([]);
  });

  it('当前合同优先于旧精益合同，并兼容 current 付款计划结构', () => {
    const current = buildInitialContracts()[0];
    const resolved = getContract(current.id, [current]);
    const plans = getPaymentPlans(current.id, [current]);

    expect(resolved).toBe(current);
    expect(effectiveAmount(resolved)).toBe(current.current.totalAmount);
    expect(plans[0]).toEqual({
      dueDate: current.current.paymentPlans[0].expectedDate,
      amount: current.current.paymentPlans[0].amount,
    });
  });
});
