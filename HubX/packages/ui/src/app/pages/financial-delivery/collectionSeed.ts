import type { CollectionLedgerEntry } from '@/services/collectionMutations';

/**
 * 精益交付 α 示例业务单的实收种子。
 * 只在 mock CollectionService 初始化时使用；页面不再从合同嵌套字段读取实收。
 */
export const FINANCIAL_DELIVERY_COLLECTION_SEED: CollectionLedgerEntry[] = [
  { id: 'fd-col-1', contractId: 'contract-001', period: 1, amount: 61500, date: '2026-06-20', method: '银行转账', note: '签约款' },
  { id: 'fd-col-2', contractId: 'contract-001', period: 2, amount: 41000, date: '2026-07-20', method: '银行转账', note: '中期款1' },
  { id: 'fd-col-3', contractId: 'contract-003', period: 1, amount: 75000, date: '2026-06-28', method: '银行转账', note: '签约款' },
  { id: 'fd-col-4', contractId: 'contract-003', period: 2, amount: 100000, date: '2026-07-12', method: '银行转账', note: '中期款' },
  { id: 'fd-col-5', contractId: 'contract-003', period: 3, amount: 75000, date: '2026-07-28', method: '银行转账', note: '尾款' },
  { id: 'fd-col-6', contractId: 'contract-005', period: 1, amount: 54000, date: '2026-06-15', method: '银行转账', note: '签约款' },
];
