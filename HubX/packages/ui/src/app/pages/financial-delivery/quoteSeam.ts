// ========================================
// 精益交付 - 报价接缝（L2）
// 从报价域读取已确认报价，转换为精益交付可用格式
// ========================================

import { initialQuotes } from '../quotation/mockData';
import type { LeanRole, EvalSheet, QuotationAtoms } from './types';

/** 根据 caseId 获取关联报价（α 全量返回，由调用方按 case.quoteIds 过滤） */
export function getQuotesForCase(_caseId: string) {
  return initialQuotes;
}

/** 报价摘要（供 CaseDetail 展示） */
export interface QuoteSummaryForDisplay {
  id: string;
  quoteNo: string;
  projectName: string;
  status: string;
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
  status: string;
  createdAt: string;
}

/** 获取评估摘要列表（从报价域 evalSheet 读取） */
export function getEvalSummaries(): EvalSummaryForDisplay[] {
  return initialQuotes.map(q => {
    const evalDays = q.evalSheet?.evalDays ?? {};
    const totalDays = Object.values(evalDays).reduce((s, d) => s + d, 0);
    return {
      id: q.id,
      quoteNo: q.quoteNo,
      projectName: q.basicInfo?.projectName ?? q.quoteNo,
      evalDays,
      totalDays,
      status: q.status,
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
    status: q.status,
    totalAmount: q.summary?.totalAmount ?? 0,
    createdAt: q.createdAt,
    evalDays: q.evalSheet?.evalDays ?? {},
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

  if (quote.evalSheet?.evalDays) {
    const EVAL_ROLE_MAP: Record<string, LeanRole> = {
      pm_days: 'product', ui_days: 'design', fe_days: 'frontend', be_days: 'backend', qa_days: 'test',
    };
    for (const [key, days] of Object.entries(quote.evalSheet.evalDays)) {
      const role = EVAL_ROLE_MAP[key] ?? 'other';
      roleDays[role] += days as number;
    }
  }

  const serviceItems = (quote.otherCosts ?? []).map((c: any) => ({
    description: c.name ?? c.description ?? '',
    amount: c.amount ?? 0,
    isPassthrough: c.isPassthrough ?? c.category === 'passthrough',
  }));

  const marginRate = quote.markupRate ?? 0;
  return { roleDays, rolePrices, marginRate, serviceItems };
}
