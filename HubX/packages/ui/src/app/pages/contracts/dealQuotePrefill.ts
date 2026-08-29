// 阶段 3「报价成交 -> 生成主合同」的预填桥。
// 把报价域的真实 Quote 映射成合同向导可消费的预填字段（纯函数，可单测）。
// 数据流：Stage4 成交态按钮 -> navigate 携带 dealQuotePrefill state ->
// ContractWizard 用 applyDealQuotePrefill 覆盖默认表单 -> 创建成功后回写 quote.contractId。

import type { Quote, QuoteSummary } from '../quotation/types';
import type { ContractFormData, PaymentPlanItem, PaymentPlanPeriodName } from './types';
import { addWorkdays } from '../quotation/quotePricing';

export interface DealQuotePrefill {
  quoteId: string;
  quoteNo: string;
  leadId: string;
  projectName: string;
  requirementDesc: string;
  totalAmount: number;
  paymentPlans: PaymentPlanItem[];
  /** 约定工期（自然日），用于推导合同终止日期 */
  projectWorkDays?: number;
  warrantyYears?: number;
  taxIncluded?: boolean;
  customerName: string;
  customerContact: string;
  customerPhone: string;
  kind: 'main' | 'supplement';
  parentContractId?: string;
  invoiceType?: '专票' | '普票';
}

function periodNameForStage(stage: string, index: number): PaymentPlanPeriodName | undefined {
  if (stage.includes('全款')) return '全款';
  if (stage.includes('尾款')) return '尾款';
  if (stage.includes('验收')) return '验收款';
  if (stage.includes('首付') || stage.includes('签订')) return '首期款';
  const byIndex: PaymentPlanPeriodName[] = ['首期款', '二期款', '三期款', '四期款', '五期款', '六期款', '七期款', '八期款'];
  return byIndex[index];
}

/** 报价付款条款 -> 合同回款期次：金额优先用报价算好的 amount，缺省按比例折算 */
export function paymentTermsToPlans(summary: QuoteSummary | undefined): PaymentPlanItem[] {
  const terms = summary?.paymentTerms ?? [];
  const total = summary?.grandTotalPrice ?? 0;
  return terms.map((term, index) => ({
    period: index + 1,
    periodName: periodNameForStage(term.stage, index),
    expectedDate: '',
    expectedDateType: 'fixed',
    expectedDays: undefined,
    condition: term.stage,
    amount: term.amount > 0 ? term.amount : Math.round((total * term.percent) / 100),
    percentage: term.percent,
    amountType: 'percentage',
  }));
}

export function buildDealQuotePrefill(quote: Quote): DealQuotePrefill {
  return {
    quoteId: quote.id,
    quoteNo: quote.quoteNo,
    leadId: quote.leadId,
    projectName: quote.basicInfo.projectName,
    requirementDesc: quote.basicInfo.requirementDesc,
    totalAmount: quote.summary?.grandTotalPrice ?? 0,
    paymentPlans: paymentTermsToPlans(quote.summary),
    projectWorkDays: quote.summary?.projectWorkDays,
    warrantyYears: quote.summary?.warrantyYears,
    taxIncluded: quote.summary?.taxIncluded,
    customerName: quote.basicInfo.customerName,
    customerContact: quote.basicInfo.customerContact,
    customerPhone: quote.basicInfo.customerPhone,
    kind: quote.isSupplement ? 'supplement' : 'main',
    parentContractId: quote.isSupplement ? quote.contractId : undefined,
    invoiceType: quote.summary?.invoiceType,
  };
}

/**
 * 用成交报价预填覆盖向导默认表单：
 * - 金额/回款期次按报价 summary 覆盖
 * - 客户信息仅在向导默认值为空时补齐（线索数据优先）
 * - 终止日期按约定工期重算
 */
export function applyDealQuotePrefill(base: ContractFormData, prefill: DealQuotePrefill): ContractFormData {
  const endDate = prefill.projectWorkDays && prefill.projectWorkDays > 0
    ? addWorkdays(base.effectiveDate, prefill.projectWorkDays)
    : base.endDate;

  const warrantyText = prefill.warrantyYears && prefill.warrantyYears > 0
    ? '提供 ' + prefill.warrantyYears + ' 年免费质保'
    : null;

  return {
    ...base,
    contractName: base.contractName || (prefill.projectName ? prefill.projectName + '合同' : ''),
    customerName: base.customerName || prefill.customerName,
    customerContact: base.customerContact || prefill.customerContact,
    customerPhone: base.customerPhone || prefill.customerPhone,
    totalAmount: prefill.kind === 'supplement' ? prefill.totalAmount : (prefill.totalAmount > 0 ? prefill.totalAmount : base.totalAmount),
    paymentPlans: prefill.paymentPlans.length > 0 ? prefill.paymentPlans : base.paymentPlans,
    invoiceType: prefill.invoiceType ?? base.invoiceType,
    endDate,
    contractContent: warrantyText
      ? '乙方按甲方需求规格说明书完成系统设计、开发、测试、部署及培训，' + warrantyText + '。'
      : base.contractContent,
  };
}
