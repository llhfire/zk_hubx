// 补充报价纯函数
// 主合同 approvedAt 之后才能建补充报价；已确认后生成补充合同向导预填。

import type { Quote } from './types';
import type { Contract } from '../contracts/types';

/** 是否可以创建补充报价（主合同已批准） */
export function canCreateSupplementQuote(contract: Contract | undefined): boolean {
  if (!contract) return false;
  if (contract.status === 'voided') return false;
  return !!contract.approvedAt;
}

/** 基于主报价创建补充报价的初始数据 */
export function buildSupplementQuote(input: {
  sourceQuote: Quote;
  contractId: string;
  newId: string;
  newQuoteNo: string;
  flowMode?: 'online' | 'file';
}): Quote {
  return {
    ...input.sourceQuote,
    id: input.newId,
    quoteNo: input.newQuoteNo,
    version: 'v1.0',
    status: 'draft',
    flowMode: input.flowMode ?? 'online',
    contractId: input.contractId,
    isSupplement: true,
    supplementChangeAmount: 0,
    previousQuoteId: undefined,
    parentQuoteId: input.sourceQuote.id,
    featureList: [],
    evalSheet: undefined,
    salesAddedRoles: [],
    travelOnsite: { enableTravel: false, travelSubtotal: 0, enableOnsite: false, onsiteSubtotal: 0, travelDetails: [], onsiteDetails: [] },
    otherCosts: [],
    summary: {
      totalLaborDays: 0,
      projectWorkDays: 0,
      grandTotalPrice: 0,
      paymentTerms: input.sourceQuote.summary?.paymentTerms.map((term) => ({ ...term, amount: 0 })) ?? [],
      taxIncluded: input.sourceQuote.summary?.taxIncluded ?? true,
      warrantyYears: input.sourceQuote.summary?.warrantyYears ?? 1,
      invoiceType: input.sourceQuote.summary?.invoiceType ?? '专票',
    },
    auditNodes: input.sourceQuote.auditNodes.map((node) => ({ ...node, status: 'PENDING', auditTime: undefined, comment: undefined })),
    stampNode: { ...input.sourceQuote.stampNode, status: 'LOCKED', stampTime: undefined },
    sentAt: undefined,
    fileFlow: { onlineDocument: { status: 'empty' }, scans: [] },
    timeline: [{
      id: 'tl-sup-1',
      action: 'create',
      actorName: '系统',
      actorRole: '产品经理',
      time: new Date().toISOString().slice(0, 16).replace('T', ' '),
      note: `基于主报价 ${input.sourceQuote.quoteNo} 创建补充报价`,
    }],
    createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  };
}

/** 补充报价预填（金额=变更额，可负） */
export interface SupplementQuotePrefill {
  quoteId: string;
  quoteNo: string;
  leadId: string;
  contractId: string;
  /** 变更金额（可负） */
  changeAmount: number;
  customerName: string;
}

export function buildSupplementQuotePrefill(quote: Quote): SupplementQuotePrefill {
  return {
    quoteId: quote.id,
    quoteNo: quote.quoteNo,
    leadId: quote.leadId,
    contractId: quote.contractId ?? '',
    changeAmount: quote.summary?.grandTotalPrice ?? 0,
    customerName: quote.basicInfo.customerName,
  };
}

/** 检查已确认报价是否可以废止（有未作废合同则不能废止） */
export function canVoidConfirmedQuote(
  quote: Quote,
  contracts: Contract[],
): { allowed: boolean; reason?: string } {
  if (quote.status !== 'confirmed') return { allowed: false, reason: '报价未确认' };
  const linkedContracts = contracts.filter(
    (c) => c.quoteId === quote.id && c.status !== 'voided',
  );
  if (linkedContracts.length > 0) {
    return { allowed: false, reason: '存在未作废合同，请先作废合同' };
  }
  return { allowed: true };
}
