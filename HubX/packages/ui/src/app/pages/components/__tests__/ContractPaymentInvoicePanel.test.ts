import { describe, expect, it } from 'vitest';
import {
  getSelectablePaymentPlans,
  hasActiveInvoiceForPlan,
  type PaymentInvoiceRecord,
} from '../ContractPaymentInvoicePanel';
import type { CollectionLedgerEntry } from '@/services/collectionMutations';
import type { Contract } from '../../contracts/types';

const collection: CollectionLedgerEntry = {
  id: 'collection-1',
  contractId: 'contract-1',
  periods: [1, 2],
  periodAllocations: [{ period: 1, amount: 50_000 }, { period: 2, amount: 50_000 }],
  amount: 100_000,
  date: '2026-08-31',
  method: '银行汇款',
  note: '',
};

function hasInvoice(invoiceRecords: PaymentInvoiceRecord[]) {
  return hasActiveInvoiceForPlan({
    contractId: 'contract-1',
    period: 2,
    collections: [collection],
    invoiceRecords,
  });
}

describe('回款计划开票状态投影', () => {
  it('合并实收开票后，所关联期次显示已开票', () => {
    expect(hasInvoice([{ id: 'invoice-1', collectionId: collection.id, invoiceNo: 'INV-1', amount: 100_000, issuedAt: '2026-08-31', status: 'valid' }])).toBe(true);
  });

  it('发票冲红后取消已开票状态', () => {
    expect(hasInvoice([
      { id: 'invoice-1', collectionId: collection.id, invoiceNo: 'INV-1', amount: 100_000, issuedAt: '2026-08-31', status: 'valid' },
      { id: 'red-1', collectionId: collection.id, invoiceNo: 'RED-INV-1', amount: -100_000, issuedAt: '2026-08-31', status: 'red', originalInvoiceId: 'invoice-1' },
    ])).toBe(false);
  });
});

describe('新增实收可选期次', () => {
  const contract = {
    id: 'contract-1',
    current: {
      paymentPlans: [
        { period: 1, amount: 50_000, percentage: 50, expectedDate: '2026-09-01' },
        { period: 2, amount: 50_000, percentage: 50, expectedDate: '2026-10-01' },
      ],
    },
  } as Contract;
  const collections: CollectionLedgerEntry[] = [
    { id: 'paid-1', contractId: contract.id, period: 1, amount: 50_000, date: '2026-09-01', method: '银行汇款', note: '' },
    { id: 'partial-2', contractId: contract.id, period: 2, amount: 20_000, date: '2026-09-02', method: '银行汇款', note: '' },
  ];

  it('隐藏已收足期次，并保留部分已收期次及其剩余金额', () => {
    const rows = getSelectablePaymentPlans({ contract, collections });

    expect(rows.map((row) => row.plan.period)).toEqual([2]);
    expect(rows[0].plan.amount - rows[0].allocated).toBe(30_000);
  });

  it('编辑实收时排除当前记录，保留其原回款期次', () => {
    const rows = getSelectablePaymentPlans({ contract, collections, editingCollectionId: 'paid-1' });

    expect(rows.map((row) => row.plan.period)).toEqual([1, 2]);
  });
});
