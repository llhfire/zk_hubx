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

/** 期次上当前生效的开票申请状态（ProjectInvoiceContext 里的申请单） */
export type InvoiceApplicationStatus = '开票中' | '已开票' | '已冲红';

export interface PeriodActionContext {
  /** 回款/开票状态与金额（getPaymentPeriodMetrics 计算） */
  metrics: PaymentPeriodMetrics;
  /** 拆分父行（汇总展示行，本身不可操作） */
  isSplitParent: boolean;
  /** 拆分子期次（不可再拆） */
  isSplitChild: boolean;
  /** 当前生效的开票申请状态；无申请为 undefined */
  applicationStatus?: InvoiceApplicationStatus;
  /** 期次名（仅用于生成禁用原因文案） */
  periodLabel?: string;
}

export interface PeriodActionPermissions {
  /** 拆分期次 */
  canSplit: boolean;
  /** 回款登记 */
  canRegisterPayment: boolean;
  /** 开票申请 */
  canApplyInvoice: boolean;
  /** 冲红（对已开票申请） */
  canRedFlush: boolean;
  /** 每个操作不可用时的原因（可用则为 undefined），供 UI 提示 */
  reasons?: Partial<Record<keyof PeriodActionPermissions, string>>;
}

/**
 * 拆分/冲红等操作的统一状态权限矩阵（P0②）：回款四态 × 开票状态 × 申请态 × 拆分角色。
 * 所有页面（表格操作列、期次详情弹窗）一律经由本函数判断，避免各处内联条件口径漂移。
 *
 * | 操作     | 未回款 | 部分回款 | 已回款 | 已逾期 | 开票约束                                |
 * |--------|-----|-------|-----|-----|-------------------------------------|
 * | 拆分期次   | ✅  | ❌     | ❌  | ✅  | 仅「未开票且无任何开票申请」；子期次不可再拆、父行不操作 |
 * | 回款登记   | ✅  | ❌     | ❌  | ✅  | 不限（开票不阻塞回款）                       |
 * | 开票申请   | ✅  | ✅     | ✅  | ✅  | 仅「开票金额未满且无进行中申请」                |
 * | 冲红     | 按开票 | 按开票    | 按开票 | 按开票 | 仅存在「已开票」申请（开错票即冲，与回款状态无关）      |
 */
export function getPeriodActionPermissions(context: PeriodActionContext): PeriodActionPermissions {
  const { metrics, isSplitParent, isSplitChild, applicationStatus } = context;
  const reasons: NonNullable<PeriodActionPermissions['reasons']> = {};

  const noMoneyMoved = metrics.paidAmount === 0;
  const noInvoiceTouched = metrics.invoicedAmount === 0 && !applicationStatus;
  const paymentNotSettled = metrics.paymentStatus !== '已回款';
  const invoiceNotSettled = metrics.invoiceStatus !== '已开票';
  const noActiveApplication = applicationStatus !== '开票中';

  // 拆分：资金与发票均未动过的原始期次才可拆；已逾期但未实付的可拆（重新排期）
  const canSplit = !isSplitParent && !isSplitChild && noMoneyMoved && noInvoiceTouched;
  if (!canSplit) {
    reasons.canSplit = isSplitChild
      ? '拆分子期次不能再拆分'
      : isSplitParent
        ? '已拆分的期次请在子期次上操作'
        : noMoneyMoved
          ? '已有开票动作，不可拆分'
          : '已有回款记录，不可拆分';
  }

  // 回款登记：未结清且无回款记录（现有单记录模型，部分回款走详情查看/修改）
  const canRegisterPayment = !isSplitParent && paymentNotSettled && noMoneyMoved;
  if (!canRegisterPayment) {
    reasons.canRegisterPayment = isSplitParent
      ? '已拆分的期次请在子期次上操作'
      : metrics.paymentStatus === '已回款'
        ? '本期已回款结清'
        : '已有回款记录，请在详情中查看';
  }

  // 开票申请：开票金额未满且无进行中申请
  const canApplyInvoice = !isSplitParent && invoiceNotSettled && noActiveApplication;
  if (!canApplyInvoice) {
    reasons.canApplyInvoice = isSplitParent
      ? '已拆分的期次请在子期次上操作'
      : applicationStatus === '开票中'
        ? '开票申请处理中'
        : '本期已全额开票';
  }

  // 冲红：存在已开票的申请（与回款状态无关）
  const canRedFlush = applicationStatus === '已开票';
  if (!canRedFlush) {
    reasons.canRedFlush = applicationStatus === '开票中'
      ? '开票完成后才能冲红'
      : '仅已开票的发票可冲红';
  }

  return { canSplit, canRegisterPayment, canApplyInvoice, canRedFlush, reasons };
}
