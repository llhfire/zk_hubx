export type PaymentStatus = '未回款' | '部分回款' | '已回款' | '已逾期';
export type InvoiceStatus = '未开票' | '部分开票' | '已开票';

export interface PaymentRecord {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  voucherFiles: string[];
  note: string;
}

export interface InvoiceRecord {
  id: string;
  amount: number;
  invoiceType: string;
  invoiceDate: string;
  invoiceTitle: string;
  taxRate?: number;
  taxAmount?: number;
  taxpayerId?: string;
  customerAddress?: string;
  customerPhone?: string;
  bankName?: string;
  bankAccount?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  invoiceFiles: string[];
  note: string;
}

export interface PaymentPeriod {
  id: string;
  periodLabel: string;
  name: string;
  isSplitParent?: boolean;
  parentPeriodId?: string;
  expectedAmount: number;
  expectedDate: string;
  condition: string;
  payments: PaymentRecord[];
  invoices: InvoiceRecord[];
}

export interface PaymentPeriodMetrics {
  paidAmount: number;
  invoicedAmount: number;
  remainingPaymentAmount: number;
  remainingInvoiceAmount: number;
  lastPaymentDate: string;
  paymentStatus: PaymentStatus;
  invoiceStatus: InvoiceStatus;
}

const MONEY_EPSILON = 0.005;

function sumAmounts(records: Array<{ amount: number }>) {
  return records.reduce((total, record) => total + Number(record.amount || 0), 0);
}

export function getPaymentPeriodMetrics(
  period: PaymentPeriod,
  today = new Date().toISOString().slice(0, 10),
): PaymentPeriodMetrics {
  const paidAmount = sumAmounts(period.payments);
  const invoicedAmount = sumAmounts(period.invoices);
  const remainingPaymentAmount = Math.max(0, period.expectedAmount - paidAmount);
  const remainingInvoiceAmount = Math.max(0, period.expectedAmount - invoicedAmount);
  const lastPaymentDate = period.payments.reduce(
    (latest, record) => record.paymentDate > latest ? record.paymentDate : latest,
    '',
  );

  let paymentStatus: PaymentStatus = '未回款';
  if (paidAmount + MONEY_EPSILON >= period.expectedAmount) {
    paymentStatus = '已回款';
  } else if (period.expectedDate && period.expectedDate < today) {
    paymentStatus = '已逾期';
  } else if (paidAmount > 0) {
    paymentStatus = '部分回款';
  }

  let invoiceStatus: InvoiceStatus = '未开票';
  if (invoicedAmount + MONEY_EPSILON >= period.expectedAmount) {
    invoiceStatus = '已开票';
  } else if (invoicedAmount > 0) {
    invoiceStatus = '部分开票';
  }

  return {
    paidAmount,
    invoicedAmount,
    remainingPaymentAmount,
    remainingInvoiceAmount,
    lastPaymentDate,
    paymentStatus,
    invoiceStatus,
  };
}

export function getPaymentPlanSummary(periods: PaymentPeriod[]) {
  return periods.reduce(
    (summary, period) => {
      if (period.isSplitParent) return summary;
      const metrics = getPaymentPeriodMetrics(period);
      summary.expectedAmount += period.expectedAmount;
      summary.paidAmount += metrics.paidAmount;
      summary.invoicedAmount += metrics.invoicedAmount;
      return summary;
    },
    { expectedAmount: 0, paidAmount: 0, invoicedAmount: 0 },
  );
}
