// Wizard 使用的轻量线索/报价上下文 mock。
//
// 线索详情页（LeadDetail.tsx）的 quotationHistory 是页面局部 state，
// 没有跨页面共享层。原型阶段我们这里维护一份"按 leadId 查得到线索基本信息
// 和报价历史"的最小 mock，让 Wizard 能从 URL 参数还原上下文。
//
// 真接入后端时，这层会被一个真实的 leadsApi 替代。

import type { QuotationRecord } from './types';

export interface LeadContext {
  id: string;
  leadName: string;
  customerName: string;
  customerEntity: string; // 我方签约主体（与 companyEntityData.shortName 对齐）
  contactPerson: string;
  contactPhone: string;
  contactEmail?: string;
  productCategory: string;
  estimatedDuration?: string; // 工期字面量，如 '3个月'
  quotations: QuotationRecord[];
}

export interface LeadContractPrefillState {
  lead: LeadContext;
  quoteId?: string;
}

/** 线索详情页路由 id（如 "3"）与 mock 主键的映射 */
const LEAD_ID_ALIASES: Record<string, string> = {
  '3': 'lead-1',
};

/** 线索详情页报价 id 与 mock 报价 id 的映射 */
const QUOTE_ID_ALIASES: Record<string, string> = {
  '1': 'q1',
  '2': 'q2',
};

export function normalizeLeadId(leadId: string | null | undefined): string | null {
  if (!leadId) return null;
  return LEAD_ID_ALIASES[leadId] ?? leadId;
}

export function normalizeQuoteId(quoteId: string | null | undefined): string | null {
  if (!quoteId) return null;
  return QUOTE_ID_ALIASES[quoteId] ?? quoteId;
}

export function deriveProductCategory(tags?: string[]): string {
  if (tags?.some((tag) => ['APP', '小程序', '管理系统', '移动应用'].includes(tag))) {
    return '软件开发';
  }
  return '技术服务';
}

export function buildLeadContextFromDetail(
  leadId: string,
  leadInfo: {
    name: string;
    customer: string;
    contact: string;
    phone: string;
    entity: string;
    tags?: string[];
  },
  quotations: Array<{
    id: string;
    name?: string;
    status: string;
    flowStatus: string;
    amount?: string;
    period?: string;
    createTime?: string;
    entity?: string;
  }>,
): LeadContext {
  const latestApproved = quotations.find(
    (quote) => quote.flowStatus === '已审核' && quote.status === '已报价',
  );

  return {
    id: leadId,
    leadName: leadInfo.name,
    customerName: leadInfo.customer,
    customerEntity: leadInfo.entity,
    contactPerson: leadInfo.contact,
    contactPhone: leadInfo.phone,
    productCategory: deriveProductCategory(leadInfo.tags),
    estimatedDuration: latestApproved?.period,
    quotations: quotations.map((quote) => ({
      id: quote.id,
      name: quote.name,
      status: quote.status,
      flowStatus: quote.flowStatus,
      amount: quote.amount,
      period: quote.period,
      createTime: quote.createTime,
      entity: quote.entity,
    })),
  };
}

export function findQuotationInLead(
  lead: LeadContext | null | undefined,
  quoteId: string | null | undefined,
): QuotationRecord | null {
  if (!lead || !quoteId) return null;
  const normalizedQuoteId = normalizeQuoteId(quoteId) ?? quoteId;
  return (
    lead.quotations.find((quote) => quote.id === quoteId || quote.id === normalizedQuoteId) ?? null
  );
}

const MOCK_LEAD_CONTEXTS: LeadContext[] = [
  {
    id: 'lead-1',
    leadName: '某科技公司APP开发需求',
    customerName: '北京科技有限公司',
    customerEntity: '中科软艺',
    contactPerson: '张经理',
    contactPhone: '13800138000',
    contactEmail: 'zhang@example.com',
    productCategory: '软件开发',
    estimatedDuration: '3个月',
    quotations: [
      {
        id: 'q1',
        name: 'APP开发项目报价方案V2',
        status: '已报价',
        flowStatus: '已审核',
        amount: '680,000',
        period: '3个月',
        createTime: '2026-04-10 14:30',
        entity: '中科软艺',
      },
      {
        id: 'q2',
        name: 'APP开发项目初步报价',
        status: '未报价',
        flowStatus: '已审核',
        amount: '750,000',
        period: '4个月',
        createTime: '2026-04-05 10:20',
        entity: '软艺信息',
      },
    ],
  },
  {
    id: 'lead-6',
    leadName: 'F信息公司CRM定制',
    customerName: 'F信息公司',
    customerEntity: '中科软艺',
    contactPerson: '范经理',
    contactPhone: '13911112222',
    productCategory: '软件开发',
    estimatedDuration: '3个月',
    quotations: [
      {
        id: 'quote-6',
        name: 'CRM定制开发报价',
        status: '已报价',
        flowStatus: '已审核',
        amount: '680,000',
        period: '3个月',
        createTime: '2026-06-08 11:00',
        entity: '中科软艺',
      },
    ],
  },
  {
    id: 'lead-9',
    leadName: '华信科技内部OA流程优化需求',
    customerName: '华信科技有限公司',
    customerEntity: '中科软艺',
    contactPerson: '周经理',
    contactPhone: '13800009999',
    contactEmail: 'zhou@huaxin.example.com',
    productCategory: '软件开发',
    estimatedDuration: '4个月',
    quotations: [
      {
        id: 'quote-9',
        name: '华信科技OA流程优化报价单V2',
        status: '已报价',
        flowStatus: '已审核',
        amount: '960,000',
        period: '4个月',
        createTime: '2026-06-15 16:20',
        entity: '中科软艺',
      },
    ],
  },
  {
    id: 'lead-without-quote',
    leadName: '某零售公司咨询需求',
    customerName: '某零售公司',
    customerEntity: '中科软艺',
    contactPerson: '钱经理',
    contactPhone: '13522224444',
    productCategory: '技术服务',
    quotations: [],
  },
];

export function findLeadContext(leadId: string | null | undefined): LeadContext | null {
  const normalizedLeadId = normalizeLeadId(leadId);
  if (!normalizedLeadId) return null;
  return MOCK_LEAD_CONTEXTS.find((lead) => lead.id === normalizedLeadId) ?? null;
}

export function listLeadContexts(): LeadContext[] {
  return MOCK_LEAD_CONTEXTS;
}

export function findQuotation(
  leadId: string | null | undefined,
  quoteId: string | null | undefined,
): QuotationRecord | null {
  const lead = findLeadContext(leadId);
  return findQuotationInLead(lead, quoteId);
}

// 把报价中的金额字符串（"680,000"）转成数字
export function parseQuoteAmount(amountStr: string | undefined): number {
  if (!amountStr) return 0;
  const n = Number(amountStr.replace(/[,，\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
