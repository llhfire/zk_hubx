// 报价域数据访问服务（数据接缝）。
//
// UI 只依赖本接口，不关心数据从哪来：
//  - α版（纯前端）：createMockQuotationService() —— 内存 + localStorage
//  - β版（前后端）：createHttpQuotationService(baseUrl) —— 调 Cloudflare Workers 的 /api/quotes
//
// 接口是异步的（Promise），因为 HTTP 天生异步；mock 实现用 Promise.resolve 包装本地状态。
// 业务逻辑（状态迁移/会签/版本）抽在 quotationMutations.ts，mock 与 http 共用，保证口径一致。

import { initialQuotes } from '@/app/pages/quotation/mockData';
import { resetAuditNodes } from '@/app/pages/quotation/quoteFlow';
import {
  applyDecideAudit,
  applyNewVersion,
  applySubmitFeatureList,
  applyTransition,
  applyUpdate,
  buildNewQuote,
  generateQuoteId,
  generateQuoteNo,
  migrateQuote,
  now,
} from './quotationMutations';
import type { EvalSheet, FeatureModule, Quote } from '@/app/pages/quotation/types';

export interface QuotationService {
  list(): Promise<Quote[]>;
  getById(id: string): Promise<Quote | undefined>;
  /** 通用客户端更新（仅本地便利；接后端时改为具体字段 PATCH） */
  updateQuote(id: string, updater: (q: Quote) => Quote): Promise<void>;

  createQuote(leadId: string, featureList: FeatureModule[], basicInfo: Partial<Quote['basicInfo']>): Promise<string>;

  // ── 阶段一：产品经理功能清单 ──
  saveFeatureList(quoteId: string, featureList: FeatureModule[]): Promise<void>;
  setDeadline(quoteId: string, deadline: string, ccSalesNames: string[]): Promise<void>;
  submitFeatureList(quoteId: string): Promise<void>;

  // ── 阶段二：技术人天评估 ──
  saveEvalSheet(quoteId: string, evalSheet: EvalSheet): Promise<void>;
  submitEval(quoteId: string): Promise<void>;
  assignToSales(quoteId: string): Promise<void>;

  // ── 阶段三：销售报价配置 ──
  returnToTech(quoteId: string, reason: string): Promise<void>;
  submitForAudit(quoteId: string): Promise<void>;
  withdrawAudit(quoteId: string, reason: string): Promise<void>;

  // ── 阶段四：审批与盖章 ──
  decideAudit(quoteId: string, auditorName: string, decision: 'approve' | 'reject', comment?: string): Promise<void>;
  stampQuote(quoteId: string): Promise<void>;
  markSent(quoteId: string): Promise<void>;
  markConfirmed(quoteId: string): Promise<void>;
  markVoided(quoteId: string, reason: string): Promise<void>;
  createNewVersion(quoteId: string): Promise<string>;
}

const STORAGE_KEY = 'hubx-quotation-quotes-v2';

function loadQuotes(): Quote[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(migrateQuote);
    }
  } catch {
    // ignore
  }
  return initialQuotes.map(migrateQuote);
}

export function createMockQuotationService(): QuotationService {
  let quotes: Quote[] = loadQuotes();

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
    } catch {
      // ignore
    }
  }

  function mapOne(id: string, fn: (q: Quote) => Quote) {
    quotes = quotes.map((q) => (q.id === id ? fn(q) : q));
    persist();
  }

  return {
    list: async () => quotes,
    getById: async (id) => quotes.find((q) => q.id === id),

    updateQuote: async (id, updater) => mapOne(id, (q) => applyUpdate(q, updater)),
    createQuote: async (leadId, featureList, basicInfo) => {
      const id = generateQuoteId();
      const quoteNo = generateQuoteNo(quotes.length);
      quotes = [...quotes, buildNewQuote(id, quoteNo, leadId, featureList, basicInfo)];
      persist();
      return id;
    },

    saveFeatureList: async (id, featureList) => mapOne(id, (q) => applyUpdate(q, (x) => ({ ...x, featureList }))),
    setDeadline: async (id, deadline, ccSalesNames) => mapOne(id, (q) => applyUpdate(q, (x) => ({ ...x, deadline, ccSalesNames }))),
    submitFeatureList: async (id) => mapOne(id, applySubmitFeatureList),

    saveEvalSheet: async (id, evalSheet) => mapOne(id, (q) => applyUpdate(q, (x) => ({ ...x, evalSheet }))),
    submitEval: async (id) => mapOne(id, (q) => applyTransition(q, 'submit_eval', 'tech', 'pending_quote')),
    assignToSales: async (id) => mapOne(id, (q) => applyTransition(q, 'assign_to_sales', 'pm', 'pending_quote')),

    returnToTech: async (id, reason) => mapOne(id, (q) => applyTransition(q, 'return_to_tech', 'sales', 'pending_eval', reason)),
    submitForAudit: async (id) =>
      mapOne(id, (q) =>
        applyTransition(q, 'submit_for_audit', 'sales', 'auditing', undefined, () => ({
          auditNodes: resetAuditNodes(),
          stampNode: { stamperName: '黄海', status: 'LOCKED' as const },
        })),
      ),
    withdrawAudit: async (id, reason) =>
      mapOne(id, (q) =>
        applyTransition(q, 'withdraw_audit', 'sales', 'pending_quote', reason, () => ({
          auditNodes: resetAuditNodes(),
        })),
      ),

    decideAudit: async (id, auditorName, decision, comment) =>
      mapOne(id, (q) => applyDecideAudit(q, auditorName, decision, comment)),
    stampQuote: async (id) =>
      mapOne(id, (q) =>
        applyTransition(q, 'stamp', 'assistant', 'stamped', undefined, (x) => ({
          stampNode: { ...x.stampNode, status: 'COMPLETED' as const, stampTime: now() },
        })),
      ),
    markSent: async (id) =>
      mapOne(id, (q) => applyTransition(q, 'mark_sent', 'sales', 'sent', undefined, () => ({ sentAt: now() }))),
    markConfirmed: async (id) => mapOne(id, (q) => applyTransition(q, 'mark_confirmed', 'sales', 'confirmed')),
    markVoided: async (id, reason) => mapOne(id, (q) => applyTransition(q, 'mark_voided', 'sales', 'voided', reason)),
    createNewVersion: async (id) => {
      const source = quotes.find((q) => q.id === id);
      if (!source) return id;
      const newId = generateQuoteId();
      quotes = [...quotes, applyNewVersion(source, newId)];
      persist();
      return newId;
    },
  };
}

export function createHttpQuotationService(baseUrl: string): QuotationService {
  const api = (p: string) => `${baseUrl}${p}`;

  async function getList(): Promise<Quote[]> {
    const r = await fetch(api('/api/quotes'));
    const d = (await r.json()) as { quotes?: Quote[] };
    return (d.quotes ?? []).map(migrateQuote);
  }

  async function getOne(id: string): Promise<Quote | undefined> {
    const r = await fetch(api(`/api/quotes/${id}`));
    if (!r.ok) return undefined;
    const d = (await r.json()) as { quote?: Quote };
    return d.quote;
  }

  async function saveOne(quote: Quote): Promise<void> {
    await fetch(api(`/api/quotes/${quote.id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quote),
    });
  }

  async function mutate(id: string, fn: (q: Quote) => Quote): Promise<void> {
    const q = await getOne(id);
    if (q) await saveOne(fn(q));
  }

  return {
    list: getList,
    getById: getOne,

    updateQuote: async (id, updater) => mutate(id, (q) => applyUpdate(q, updater)),
    createQuote: async (leadId, featureList, basicInfo) => {
      const list = await getList();
      const id = generateQuoteId();
      const quoteNo = generateQuoteNo(list.length);
      await saveOne(buildNewQuote(id, quoteNo, leadId, featureList, basicInfo));
      return id;
    },

    saveFeatureList: async (id, featureList) => mutate(id, (q) => applyUpdate(q, (x) => ({ ...x, featureList }))),
    setDeadline: async (id, deadline, ccSalesNames) => mutate(id, (q) => applyUpdate(q, (x) => ({ ...x, deadline, ccSalesNames }))),
    submitFeatureList: async (id) => mutate(id, applySubmitFeatureList),

    saveEvalSheet: async (id, evalSheet) => mutate(id, (q) => applyUpdate(q, (x) => ({ ...x, evalSheet }))),
    submitEval: async (id) => mutate(id, (q) => applyTransition(q, 'submit_eval', 'tech', 'pending_quote')),
    assignToSales: async (id) => mutate(id, (q) => applyTransition(q, 'assign_to_sales', 'pm', 'pending_quote')),

    returnToTech: async (id, reason) => mutate(id, (q) => applyTransition(q, 'return_to_tech', 'sales', 'pending_eval', reason)),
    submitForAudit: async (id) =>
      mutate(id, (q) =>
        applyTransition(q, 'submit_for_audit', 'sales', 'auditing', undefined, () => ({
          auditNodes: resetAuditNodes(),
          stampNode: { stamperName: '黄海', status: 'LOCKED' as const },
        })),
      ),
    withdrawAudit: async (id, reason) =>
      mutate(id, (q) =>
        applyTransition(q, 'withdraw_audit', 'sales', 'pending_quote', reason, () => ({
          auditNodes: resetAuditNodes(),
        })),
      ),

    decideAudit: async (id, auditorName, decision, comment) =>
      mutate(id, (q) => applyDecideAudit(q, auditorName, decision, comment)),
    stampQuote: async (id) =>
      mutate(id, (q) =>
        applyTransition(q, 'stamp', 'assistant', 'stamped', undefined, (x) => ({
          stampNode: { ...x.stampNode, status: 'COMPLETED' as const, stampTime: now() },
        })),
      ),
    markSent: async (id) =>
      mutate(id, (q) => applyTransition(q, 'mark_sent', 'sales', 'sent', undefined, () => ({ sentAt: now() }))),
    markConfirmed: async (id) => mutate(id, (q) => applyTransition(q, 'mark_confirmed', 'sales', 'confirmed')),
    markVoided: async (id, reason) => mutate(id, (q) => applyTransition(q, 'mark_voided', 'sales', 'voided', reason)),
    createNewVersion: async (id) => {
      const source = await getOne(id);
      if (!source) return id;
      const newId = generateQuoteId();
      await saveOne(applyNewVersion(source, newId));
      return newId;
    },
  };
}
