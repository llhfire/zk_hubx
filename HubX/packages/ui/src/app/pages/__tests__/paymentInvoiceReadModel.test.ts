import { describe, expect, it } from 'vitest';
import { seedCollectionsFromContracts } from '../../../services/collectionMutations';
import { buildInitialContracts } from '../contracts/mockData';
import type { ProjectInvoiceApplication } from '../finance/ProjectInvoiceContext';
import { CLOSED_LEADS } from '../leads/mockData';
import { buildPaymentInvoiceRows } from '../paymentInvoiceReadModel';
import type { Contract } from '../contracts/types';

function invoice(overrides: Partial<ProjectInvoiceApplication>): ProjectInvoiceApplication {
  return {
    id: 'invoice-1',
    projectId: '3',
    projectName: '华信科技内部OA流程优化',
    projectNo: 'PRJ202606001',
    contractId: '9',
    periodId: '1',
    periodLabel: '首期款',
    expectedAmount: 384_000,
    status: '已开票',
    submittedAt: '2026-06-23 10:00',
    invoicedAt: '2026-06-24 10:00',
    invoiceType: '增值税专用发票',
    taxRate: 6,
    amount: 384_000,
    taxAmount: 23_040,
    customerName: '华信科技有限公司',
    taxpayerId: '',
    customerAddress: '',
    customerPhone: '',
    bankName: '',
    bankAccount: '',
    recipientName: '',
    recipientPhone: '',
    recipientEmail: '',
    invoiceFiles: ['华信科技首期发票.pdf'],
    ...overrides,
  };
}

describe('buildPaymentInvoiceRows', () => {
  it('以合同为主线汇总实收和有效开票，冲红金额不重复累计', () => {
    const contracts = buildInitialContracts();
    const rows = buildPaymentInvoiceRows({
      contracts,
      collections: seedCollectionsFromContracts(contracts),
      applications: [invoice({}), invoice({ id: 'invoice-red', status: '已冲红', amount: 100_000 })],
      leads: CLOSED_LEADS,
      today: '2026-08-28',
    });
    const row = rows.find(item => item.contractId === '9');

    expect(row).toMatchObject({
      recordNo: 'PI-HT202606009',
      customerEntity: '华信科技有限公司',
      totalAmount: 960_000,
      receivedAmount: 384_000,
      receivedRate: 40,
      invoicedAmount: 384_000,
      invoicedRate: 40,
      hasPayment: true,
      hasInvoice: true,
      status: '部分收款',
    });
    expect(row?.payments[0]).toMatchObject({ receivedAmount: 384_000, status: '已收款', actualDate: '2026-06-25' });
  });

  it('只展示已归档主合同', () => {
    const contracts = buildInitialContracts();
    const rows = buildPaymentInvoiceRows({ contracts, collections: [], applications: [], leads: [], today: '2026-08-28' });
    expect(rows.every(row => contracts.find(contract => contract.id === row.contractId)?.status === 'archived')).toBe(true);
    expect(rows.some(row => row.contractId === '6')).toBe(false);
  });

  it('把已归档补充合同金额、回款期次和开票汇总到主合同', () => {
    const contracts = buildInitialContracts();
    const main = contracts.find(contract => contract.id === '9')!;
    const supplement: Contract = {
      ...main,
      id: '9-s1',
      contractNo: 'HT202606009-BC01',
      kind: 'supplement',
      parentContractId: main.id,
      sourceQuoteId: 'quote-9-s1',
      current: {
        ...main.current,
        contractName: '华信科技OA增项补充合同',
        totalAmount: 100_000,
        paymentPlans: [{ period: 1, periodName: '需求变更款', expectedDate: '2026-08-20', amount: 100_000, percentage: 100 }],
      },
      collectionRecords: [],
    };
    const collections = [
      ...seedCollectionsFromContracts(contracts),
      { id: 'col-s1', contractId: supplement.id, projectId: '3', period: 1 as const, amount: 50_000, date: '2026-08-21', method: '银行汇款', note: '补充合同首款' },
    ];
    const rows = buildPaymentInvoiceRows({
      contracts: [...contracts, supplement],
      collections,
      applications: [invoice({ id: 'invoice-s1', contractId: supplement.id, amount: 100_000 })],
      leads: CLOSED_LEADS,
      today: '2026-08-28',
    });
    const row = rows.find(item => item.contractId === main.id)!;

    expect(row.totalAmount).toBe(1_060_000);
    expect(row.receivedAmount).toBe(434_000);
    expect(row.invoicedAmount).toBe(100_000);
    expect(row.payments).toContainEqual(expect.objectContaining({
      key: '9-s1-1',
      contractNo: 'HT202606009-BC01',
      receivedAmount: 50_000,
    }));
  });
});
