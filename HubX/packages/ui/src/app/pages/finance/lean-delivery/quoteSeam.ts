// ========================================
// 精益交付 - 报价接缝（L2）
// 从报价域读取已确认报价，转换为精益交付可用格式
// ========================================

import { initialQuotes } from '../../sales/quotation/mockData';
import type { EvalSheet as QuoteEvalSheet, QuoteStatus } from '../../sales/quotation/types';
import { QuotationStatus } from './types';
import type { LeanRole, EvalSheet, QuotationAtoms } from './types';

/**
 * 报价状态跨域映射：销售域 `QuoteStatus`(10 态，驱动审批/盖章流程)
 * → 精益交付 `QuotationStatus`(6 态，只关心「能否用于核算」)。
 *
 * 两个域的词表不同（销售域有 pending_eval / pending_stamp / voided，
 * 精益交付有 reviewing / accepted），不能互相强转。此前接缝把状态声明成
 * `string` 直接透传，界面查 `quotationStatusMap` 时全部落空、标签显示为空。
 * 映射规则按业务含义归并，见各分支注释；新增销售态时这里会编译报错。
 */
const QUOTE_STATUS_TO_LEAN: Record<QuoteStatus, QuotationStatus> = {
  draft: QuotationStatus.DRAFT,
  pending_eval: QuotationStatus.DRAFT,
  pending_quote: QuotationStatus.DRAFT,
  auditing: QuotationStatus.REVIEWING,
  rejected: QuotationStatus.REJECTED,
  pending_stamp: QuotationStatus.REVIEWING,
  stamped: QuotationStatus.APPROVED,
  sent: QuotationStatus.SENT,
  confirmed: QuotationStatus.ACCEPTED,
  voided: QuotationStatus.REJECTED,
};

/** 根据 caseId 获取关联报价（α 全量返回，由调用方按 case.quoteIds 过滤） */
export function getQuotesForCase(_caseId: string) {
  return initialQuotes;
}

/** 报价摘要（供 CaseDetail 展示） */
export interface QuoteSummaryForDisplay {
  id: string;
  quoteNo: string;
  projectName: string;
  status: QuotationStatus;
  totalAmount: number;
  createdAt: string;
  evalDays: Record<string, number>;
}

/** 评估摘要（供 CaseDetail 工时评估 Tab 展示） */
export interface EvalSummaryForDisplay {
  id: string;
  quoteNo: string;
  projectName: string;
  evalDays: Record<string, number>;
  totalDays: number;
  status: QuotationStatus;
  createdAt: string;
}

/**
 * 把报价域的评估表折算成「岗位 → 人天」。
 *
 * 报价域 `EvalSheet` 没有人天字段：人天按评估单元存在
 * `evaluationUnits[].manualWorkload`（role_key → 人天）里，一个岗位会散落在多个
 * 评估单元上，必须聚合成一个总和才是该报价的岗位人天。
 *
 * 此前这里读的是 `evalSheet.evalDays` —— 那个字段在报价域根本不存在，
 * 所以 CaseDetail 的「工时评估」Tab 一直拿到空对象，整天数恒为 0。
 */
function collectEvalDays(evalSheet: QuoteEvalSheet | undefined): Record<string, number> {
  if (!evalSheet) return {};
  const days: Record<string, number> = {};
  for (const unit of evalSheet.evaluationUnits) {
    for (const [roleKey, value] of Object.entries(unit.manualWorkload ?? {})) {
      if (typeof value !== 'number' || Number.isNaN(value)) continue;
      days[roleKey] = (days[roleKey] ?? 0) + value;
    }
  }
  return days;
}

/** 获取评估摘要列表（从报价域 evalSheet 读取） */
export function getEvalSummaries(): EvalSummaryForDisplay[] {
  return initialQuotes.map(q => {
    const evalDays = collectEvalDays(q.evalSheet);
    const totalDays = Object.values(evalDays).reduce((s, d) => s + d, 0);
    return {
      id: q.id,
      quoteNo: q.quoteNo,
      projectName: q.basicInfo?.projectName ?? q.quoteNo,
      evalDays,
      totalDays,
      status: QUOTE_STATUS_TO_LEAN[q.status],
      createdAt: q.createdAt,
    };
  });
}

/** 获取报价摘要列表 */
export function getQuoteSummaries(): QuoteSummaryForDisplay[] {
  return initialQuotes.map(q => ({
    id: q.id,
    quoteNo: q.quoteNo,
    projectName: q.basicInfo?.projectName ?? q.quoteNo,
    status: QUOTE_STATUS_TO_LEAN[q.status],
    totalAmount: q.summary?.grandTotalPrice ?? 0,
    createdAt: q.createdAt,
    evalDays: collectEvalDays(q.evalSheet),
  }));
}

/**
 * 将报价域 Quote 转换为精益交付 QuotationAtoms
 * 用于 deriveQuotationTotals 计算
 */
export function toQuotationAtoms(quote: any): QuotationAtoms {
  const roleDays: Record<LeanRole, number> = {
    product: 0, design: 0, frontend: 0, backend: 0, test: 0, other: 0,
  };
  const rolePrices: Record<LeanRole, number> = {
    product: 1000, design: 800, frontend: 1200, backend: 1200, test: 600, other: 800,
  };

  const evalDays = collectEvalDays(quote.evalSheet);
  const EVAL_ROLE_MAP: Record<string, LeanRole> = {
    pm_days: 'product', ui_days: 'design', fe_days: 'frontend', be_days: 'backend', qa_days: 'test',
  };
  for (const [key, days] of Object.entries(evalDays)) {
    const role = EVAL_ROLE_MAP[key] ?? 'other';
    roleDays[role] += days;
  }

  const serviceItems = (quote.otherCosts ?? []).map((c: any) => ({
    description: c.name ?? c.description ?? '',
    amount: c.amount ?? 0,
    isPassthrough: c.isPassthrough ?? c.category === 'passthrough',
  }));

  const marginRate = quote.markupRate ?? 0;
  return { roleDays, rolePrices, marginRate, serviceItems };
}
