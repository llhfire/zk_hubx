import { describe, expect, it } from 'vitest';
import {
  getPaymentPeriodMetrics,
  getPaymentPlanSummary,
  type PaymentPeriod,
} from '../paymentInvoiceModel';

function createPeriod(overrides: Partial<PaymentPeriod> = {}): PaymentPeriod {
  return {
    id: 'period-1',
    periodLabel: '一期',
    name: '首期款',
    expectedAmount: 100000,
    expectedDate: '2026-07-20',
    condition: '',
    payments: [],
    invoices: [],
    ...overrides,
  };
}

describe('paymentInvoiceModel', () => {
  it('aggregates multiple payment and invoice records for one period', () => {
    const metrics = getPaymentPeriodMetrics(createPeriod({
      payments: [
        { id: 'p1', amount: 30000, paymentDate: '2026-07-10', paymentMethod: '公对公', voucherFiles: [], note: '' },
        { id: 'p2', amount: 70000, paymentDate: '2026-07-12', paymentMethod: '公对公', voucherFiles: [], note: '' },
      ],
      invoices: [
        { id: 'i1', amount: 60000, invoiceType: '电子发票', invoiceDate: '2026-07-08', invoiceTitle: '客户公司', invoiceFiles: [], note: '' },
      ],
    }), '2026-07-17');

    expect(metrics.paidAmount).toBe(100000);
    expect(metrics.lastPaymentDate).toBe('2026-07-12');
    expect(metrics.paymentStatus).toBe('已回款');
    expect(metrics.invoicedAmount).toBe(60000);
    expect(metrics.invoiceStatus).toBe('部分开票');
  });

  it('marks an unsettled overdue period as overdue', () => {
    const metrics = getPaymentPeriodMetrics(createPeriod({
      expectedDate: '2026-07-01',
      payments: [
        { id: 'p1', amount: 20000, paymentDate: '2026-07-02', paymentMethod: '公对公', voucherFiles: [], note: '' },
      ],
    }), '2026-07-17');

    expect(metrics.paymentStatus).toBe('已逾期');
    expect(metrics.remainingPaymentAmount).toBe(80000);
  });

  it('summarizes all periods', () => {
    const summary = getPaymentPlanSummary([
      createPeriod({
        id: 'period-1',
        payments: [{ id: 'p1', amount: 40000, paymentDate: '2026-07-10', paymentMethod: '公对公', voucherFiles: [], note: '' }],
      }),
      createPeriod({
        id: 'period-2',
        expectedAmount: 50000,
        invoices: [{ id: 'i1', amount: 50000, invoiceType: '电子发票', invoiceDate: '2026-07-11', invoiceTitle: '客户公司', invoiceFiles: [], note: '' }],
      }),
    ]);

    expect(summary).toEqual({
      expectedAmount: 150000,
      paidAmount: 40000,
      invoicedAmount: 50000,
    });
  });

  it('excludes split parent periods to prevent duplicate totals', () => {
    const summary = getPaymentPlanSummary([
      createPeriod({ id: 'period-2', isSplitParent: true, expectedAmount: 100000 }),
      createPeriod({ id: 'period-2-1', parentPeriodId: 'period-2', expectedAmount: 40000 }),
      createPeriod({ id: 'period-2-2', parentPeriodId: 'period-2', expectedAmount: 60000 }),
    ]);

    expect(summary.expectedAmount).toBe(100000);
  });
});
