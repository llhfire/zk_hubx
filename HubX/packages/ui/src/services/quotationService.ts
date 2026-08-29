// 报价域数据访问服务（数据接缝）。
//
// UI 只依赖本接口，不关心数据从哪来：
//  - α版（纯前端）：createMockQuotationService() —— 内存 + localStorage
//  - β版（前后端）：createHttpQuotationService(baseUrl) —— 调 Cloudflare Workers 的 /api/quotes
//
// 接口是异步的（Promise），因为 HTTP 天生异步；mock 实现用 Promise.resolve 包装本地状态。
// 业务逻辑（状态迁移/会签/版本）抽在 quotationMutations.ts，mock 与 http 共用，保证口径一致。

import { Message } from '@arco-design/web-react';
import { initialQuotes } from '@/app/pages/quotation/mockData';
import { resetAuditNodes } from '@/app/pages/quotation/quoteFlow';
import {
  applyDecideAudit,
  applyNewVersion,
  applyReassign,
  applySubmitFeatureList,
  applyTransition,
  applyUpdate,
  buildNewQuote,
  buildPricingSummary,
  generateQuoteId,
  generateQuoteNo,
  migrateQuote,
  now,
  canTransition,
} from './quotationMutations';
import { canDeleteQuote, isTerminalStatus } from '@/app/pages/quotation/quoteAccess';
import type { EvalSheet, FeatureModule, Quote } from '@/app/pages/quotation/types';
import { buildSupplementQuote } from '@/app/pages/quotation/supplementQuote';

export interface CreateQuoteOptions {
  flowMode?: Quote['flowMode'];
  salesOwnerName?: string;
}

export interface QuotationService {
  list(): Promise<Quote[]>;
  getById(id: string): Promise<Quote | undefined>;
  /** 通用客户端更新（仅本地便利；接后端时改为具体字段 PATCH） */
  updateQuote(id: string, updater: (q: Quote) => Quote): Promise<void>;

  createQuote(
    leadId: string,
    featureList: FeatureModule[],
    basicInfo: Partial<Quote['basicInfo']>,
    options?: CreateQuoteOptions,
  ): Promise<string>;
  createSupplementQuote(sourceQuoteId: string, contractId: string, flowMode: 'online' | 'file'): Promise<string>;

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
  submitForAudit(quoteId: string, auditSnapshot?: { auditNodes: import('@/app/pages/quotation/types').AuditNode[]; stampNode: import('@/app/pages/quotation/types').StampNode }): Promise<void>;
  withdrawAudit(quoteId: string, reason: string): Promise<void>;

  // ── 阶段四：审批与盖章 ──
  decideAudit(quoteId: string, auditorName: string, decision: 'approve' | 'reject', comment?: string): Promise<void>;
  stampQuote(quoteId: string): Promise<void>;
  markSent(quoteId: string): Promise<void>;
  markConfirmed(quoteId: string): Promise<void>;
  markVoided(quoteId: string, reason: string): Promise<void>;
  createNewVersion(quoteId: string): Promise<string>;

  // ── 回退动作（PRD §回退，TRANSITIONS 表驱动）──
  withdrawSent(quoteId: string): Promise<void>;       // sent → stamped
  returnToStamp(quoteId: string): Promise<void>;      // stamped → pending_stamp（未发出才可）
  returnToEditFeatures(quoteId: string): Promise<void>; // rejected → draft（ADR 0064）

  // ── 4.2 新增 ──
  deleteQuote(quoteId: string): Promise<void>;
  reassignOwner(quoteId: string, field: 'salesOwnerName' | 'techEvaluatorName', value: string): Promise<void>;
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

  function requireTransition(quote: Quote, action: string) {
    if (!canTransition(quote.status, action)) {
      throw new Error(`报价状态 ${quote.status} 不允许执行 ${action}`);
    }
  }

  return {
    list: async () => quotes,
    getById: async (id) => quotes.find((q) => q.id === id),

    updateQuote: async (id, updater) => mapOne(id, (q) => applyUpdate(q, (current) => {
      const updated = updater(current);
      return updated.flowMode === q.flowMode ? updated : { ...updated, flowMode: q.flowMode };
    })),
    createQuote: async (leadId, featureList, basicInfo, options) => {
      const id = generateQuoteId();
      const quoteNo = generateQuoteNo(quotes);
      quotes = [...quotes, buildNewQuote(
        id,
        quoteNo,
        leadId,
        featureList,
        basicInfo,
        options?.salesOwnerName,
        options?.flowMode,
      )];
      persist();
      return id;
    },
    createSupplementQuote: async (sourceQuoteId, contractId, flowMode) => {
      const source = quotes.find((quote) => quote.id === sourceQuoteId);
      if (!source) throw new Error('未找到主报价，无法创建补充报价');
      const id = generateQuoteId();
      const quoteNo = generateQuoteNo(quotes);
      quotes = [...quotes, buildSupplementQuote({ sourceQuote: source, contractId, newId: id, newQuoteNo: quoteNo, flowMode })];
      persist();
      return id;
    },

    saveFeatureList: async (id, featureList) => mapOne(id, (q) => applyUpdate(q, (x) => ({ ...x, featureList }))),
    setDeadline: async (id, deadline, ccSalesNames) => mapOne(id, (q) => applyUpdate(q, (x) => ({ ...x, deadline, ccSalesNames }))),
    submitFeatureList: async (id) => mapOne(id, (q) => {
      requireTransition(q, 'submit_feature_list');
      return applySubmitFeatureList(q);
    }),

    saveEvalSheet: async (id, evalSheet) => mapOne(id, (q) => applyUpdate(q, (x) => ({ ...x, evalSheet }))),
    submitEval: async (id) => mapOne(id, (q) => {
      requireTransition(q, 'submit_eval');
      return applyTransition(q, 'submit_eval', 'tech', 'pending_quote');
    }),
    assignToSales: async (id) => mapOne(id, (q) => {
      requireTransition(q, 'assign_to_sales');
      return applyTransition(q, 'assign_to_sales', 'pm', 'pending_quote');
    }),

    returnToTech: async (id, reason) => mapOne(id, (q) => {
      requireTransition(q, 'return_to_tech');
      return applyTransition(q, 'return_to_tech', 'sales', 'pending_eval', reason);
    }),
    submitForAudit: async (id, snapshot) =>
      mapOne(id, (q) => {
        requireTransition(q, 'submit_for_audit');
        return applyTransition(q, 'submit_for_audit', 'sales', 'auditing', undefined, () => ({
          auditNodes: snapshot?.auditNodes ?? (() => { throw new Error('报价审批未配置，请联系管理员'); })(),
          stampNode: snapshot?.stampNode ?? (() => { throw new Error('报价审批未配置盖章人，请联系管理员'); })(),
          summary: buildPricingSummary(q),
        }));
      }),
    withdrawAudit: async (id, reason) =>
      mapOne(id, (q) => {
        requireTransition(q, 'withdraw_audit');
        return applyTransition(q, 'withdraw_audit', 'sales', 'pending_quote', reason, () => ({
          auditNodes: resetAuditNodes(q.auditNodes),
        }));
      }),

    decideAudit: async (id, auditorName, decision, comment) =>
      mapOne(id, (q) => {
        if (q.status !== 'auditing') throw new Error(`报价状态 ${q.status} 不允许审批`);
        return applyDecideAudit(q, auditorName, decision, comment);
      }),
    stampQuote: async (id) =>
      mapOne(id, (q) => {
        requireTransition(q, 'stamp');
        return applyTransition(q, 'stamp', 'assistant', 'stamped', undefined, (x) => ({
          stampNode: { ...x.stampNode, status: 'COMPLETED' as const, stampTime: now() },
          ...(x.flowMode === 'file' && x.fileFlow
            ? { fileFlow: { ...x.fileFlow, onlineDocument: { ...x.fileFlow.onlineDocument, status: 'finalized' as const } } }
            : {}),
        }));
      }),
    markSent: async (id) =>
      mapOne(id, (q) => {
        requireTransition(q, 'mark_sent');
        return applyTransition(q, 'mark_sent', 'sales', 'sent', undefined, () => ({ sentAt: now() }));
      }),
    markConfirmed: async (id) => mapOne(id, (q) => {
      requireTransition(q, 'mark_confirmed');
      return applyTransition(q, 'mark_confirmed', 'sales', 'confirmed');
    }),
    markVoided: async (id, reason) => mapOne(id, (q) => {
      requireTransition(q, 'mark_voided');
      return applyTransition(q, 'mark_voided', 'sales', 'voided', reason);
    }),
    createNewVersion: async (id) => {
      const source = quotes.find((q) => q.id === id);
      if (!source) return id;
      requireTransition(source, 'new_version');
      const newId = generateQuoteId();
      quotes = [...quotes, applyNewVersion(source, newId)];
      persist();
      return newId;
    },
    withdrawSent: async (id) =>
      mapOne(id, (q) => {
        requireTransition(q, 'withdraw_sent');
        return applyTransition(q, 'withdraw_sent', 'sales', 'stamped', undefined, () => ({ sentAt: undefined }));
      }),
    returnToStamp: async (id) =>
      mapOne(id, (q) => {
        requireTransition(q, 'return_to_stamp');
        if (q.sentAt) throw new Error('已发出的报价不能退回盖章');
        return applyTransition(q, 'return_to_stamp', 'assistant', 'pending_stamp');
      }),
    returnToEditFeatures: async (id) =>
      mapOne(id, (q) => {
        requireTransition(q, 'return_to_edit_features');
        return applyTransition(q, 'return_to_edit_features', 'sales', 'draft', undefined, (current) => ({
          ...(current.flowMode === 'file' && current.fileFlow
            ? { fileFlow: { ...current.fileFlow, onlineDocument: { status: 'draft' as const } } }
            : {}),
        }));
      }),
    deleteQuote: async (id) => {
      const quote = quotes.find((q) => q.id === id);
      if (!quote || !canDeleteQuote(quote)) throw new Error('仅可删除从未提交过的草稿报价');
      quotes = quotes.filter((q) => q.id !== id);
      persist();
    },
    reassignOwner: async (id, field, value) =>
      mapOne(id, (q) => {
        if (isTerminalStatus(q.status)) throw new Error('已确认或已废止的报价不能改指');
        return applyReassign(q, field, value, '当前操作人');
      }),
  };
}

export function createHttpQuotationService(baseUrl: string, opts?: { actor?: string }): QuotationService {
  const api = (p: string) => `${baseUrl}${p}`;

  async function getList(): Promise<Quote[]> {
    const r = await fetch(api('/api/quotes'));
    const d = (await r.json()) as { quotes?: Array<Quote & { version?: number }> };
    return (d.quotes ?? []).map(migrateQuote);
  }

  async function getOne(id: string): Promise<Quote | undefined> {
    const r = await fetch(api(`/api/quotes/${id}`));
    if (!r.ok) return undefined;
    const d = (await r.json()) as { quote?: Quote & { version?: number } };
    return d.quote;
  }

  // 乐观锁（ADR-0094）：GET 返回的 version 随对象全程携带，PUT 原样回传，服务端比对。
  // 409 = 数据已被他人修改：提示用户并放弃本次写入（不抛错，Context 随后 refresh 拉到最新）。
  async function saveOne(quote: Quote): Promise<boolean> {
    const r = await fetch(api(`/api/quotes/${quote.id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(opts?.actor ? { 'X-Actor': opts.actor } : {}) },
      body: JSON.stringify(quote),
    });
    if (r.status === 409) {
      Message.warning('数据已被他人修改，已刷新为最新内容，请重试本次操作');
      return false;
    }
    return r.ok;
  }

  async function mutate(id: string, fn: (q: Quote) => Quote): Promise<void> {
    const q = await getOne(id);
    if (q) await saveOne(fn(q));
  }

  return {
    list: getList,
    getById: getOne,

    updateQuote: async (id, updater) => mutate(id, (q) => applyUpdate(q, updater)),
    createQuote: async (leadId, featureList, basicInfo, options) => {
      const list = await getList();
      const id = generateQuoteId();
      const quoteNo = generateQuoteNo(list);
      await saveOne(buildNewQuote(
        id,
        quoteNo,
        leadId,
        featureList,
        basicInfo,
        options?.salesOwnerName,
        options?.flowMode,
      ));
      return id;
    },
    createSupplementQuote: async (sourceQuoteId, contractId, flowMode) => {
      const list = await getList();
      const source = list.find((quote) => quote.id === sourceQuoteId);
      if (!source) throw new Error('未找到主报价，无法创建补充报价');
      const id = generateQuoteId();
      const quoteNo = generateQuoteNo(list);
      const saved = await saveOne(buildSupplementQuote({ sourceQuote: source, contractId, newId: id, newQuoteNo: quoteNo, flowMode }));
      return saved ? id : sourceQuoteId;
    },

    saveFeatureList: async (id, featureList) => mutate(id, (q) => applyUpdate(q, (x) => ({ ...x, featureList }))),
    setDeadline: async (id, deadline, ccSalesNames) => mutate(id, (q) => applyUpdate(q, (x) => ({ ...x, deadline, ccSalesNames }))),
    submitFeatureList: async (id) => mutate(id, applySubmitFeatureList),

    saveEvalSheet: async (id, evalSheet) => mutate(id, (q) => applyUpdate(q, (x) => ({ ...x, evalSheet }))),
    submitEval: async (id) => mutate(id, (q) => applyTransition(q, 'submit_eval', 'tech', 'pending_quote')),
    assignToSales: async (id) => mutate(id, (q) => applyTransition(q, 'assign_to_sales', 'pm', 'pending_quote')),

    returnToTech: async (id, reason) => mutate(id, (q) => applyTransition(q, 'return_to_tech', 'sales', 'pending_eval', reason)),
    submitForAudit: async (id, snapshot) =>
      mutate(id, (q) =>
        applyTransition(q, 'submit_for_audit', 'sales', 'auditing', undefined, () => ({
          auditNodes: snapshot?.auditNodes ?? resetAuditNodes(),
          stampNode: snapshot?.stampNode ?? { stamperName: '黄海', status: 'LOCKED' as const },
          summary: buildPricingSummary(q),
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
      // 409 冲突时未写成：返回原 id，Context refresh 后用户看到最新版再重试
      const saved = await saveOne(applyNewVersion(source, newId));
      return saved ? newId : id;
    },
    withdrawSent: async (id) =>
      mutate(id, (q) => applyTransition(q, 'withdraw_sent', 'sales', 'stamped', undefined, () => ({ sentAt: undefined }))),
    returnToStamp: async (id) =>
      mutate(id, (q) => {
        if (q.sentAt) throw new Error('已发出的报价不能退回盖章');
        return applyTransition(q, 'return_to_stamp', 'assistant', 'pending_stamp');
      }),
    returnToEditFeatures: async (id) =>
      mutate(id, (q) => applyTransition(q, 'return_to_edit_features', 'sales', 'draft')),
    deleteQuote: async (id) => {
      await fetch(api(`/api/quotes/${id}`), { method: 'DELETE' });
    },
    reassignOwner: async (id, field, value) =>
      mutate(id, (q) => {
        if (field === 'salesOwnerName') {
          return { ...q, salesOwnerName: value, timeline: [...q.timeline, { id: `ev-${Date.now()}`, action: 'reassign_sales' as const, actorName: value, actorRole: 'sales', time: now(), note: `销售改指为 ${value}` }], updatedAt: now() };
        }
        return { ...q, basicInfo: { ...q.basicInfo, techEvaluatorName: value }, timeline: [...q.timeline, { id: `ev-${Date.now()}`, action: 'reassign_evaluator' as const, actorName: value, actorRole: 'tech', time: now(), note: `评估人改指为 ${value}` }], updatedAt: now() };
      }),
  };
}
