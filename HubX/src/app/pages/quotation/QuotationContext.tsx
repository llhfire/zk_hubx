import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import type {
  EvalSheet,
  FeatureModule,
  Quote,
  QuoteAction,
  QuoteRole,
  QuoteStatus,
  QuoteTimelineEvent,
} from './types';
import { QUOTE_ROLE_ACTORS, QUOTE_ROLES, buildInitialAuditNodes } from './types';
import { initialQuotes } from './mockData';
import { buildDefaultFeatureList } from './defaultFeatures';
import {
  buildInitialUnits,
  nextVersion,
  resetAuditNodes,
  resolveAuditOutcome,
} from './quoteFlow';

interface QuotationContextValue {
  quotes: Quote[];
  currentRole: QuoteRole;
  setCurrentRole: (role: QuoteRole) => void;
  getQuoteById: (id: string) => Quote | undefined;
  updateQuote: (id: string, updater: (q: Quote) => Quote) => void;

  /** 创建报价单（从线索功能清单发起） */
  createQuote: (leadId: string, featureList: FeatureModule[], basicInfo: Partial<Quote['basicInfo']>) => string;

  // ── 阶段一：产品经理功能清单 ──
  saveFeatureList: (quoteId: string, featureList: FeatureModule[]) => void;
  setDeadline: (quoteId: string, deadline: string, ccSalesNames: string[]) => void;
  submitFeatureList: (quoteId: string) => void;

  // ── 阶段二：技术人天评估 ──
  saveEvalSheet: (quoteId: string, evalSheet: EvalSheet) => void;
  submitEval: (quoteId: string) => void;
  assignToSales: (quoteId: string) => void;

  // ── 阶段三：销售报价配置 ──
  returnToTech: (quoteId: string, reason: string) => void;
  submitForAudit: (quoteId: string) => void;
  withdrawAudit: (quoteId: string, reason: string) => void;

  // ── 阶段四：审批与盖章 ──
  decideAudit: (quoteId: string, auditorName: string, decision: 'approve' | 'reject', comment?: string) => void;
  stampQuote: (quoteId: string) => void;
  markSent: (quoteId: string) => void;
  markDeal: (quoteId: string) => void;
  markVoided: (quoteId: string, reason: string) => void;
  createNewVersion: (quoteId: string) => string;
}

const QuotationContext = createContext<QuotationContextValue | null>(null);

function now(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

let timelineSeq = 0;

/** 角色 key → 显示名，写流转轨迹用 */
function roleLabel(role: QuoteRole): string {
  const found = QUOTE_ROLES.find((r) => r.key === role);
  if (!found) return role;
  // 「技术负责人（罗总）」→「技术负责人」
  return found.name.replace(/（.*）$/, '');
}

function makeEvent(action: QuoteAction, role: QuoteRole, note?: string): QuoteTimelineEvent {
  timelineSeq += 1;
  return {
    id: `tl-${timelineSeq}`,
    action,
    actorName: QUOTE_ROLE_ACTORS[role],
    actorRole: roleLabel(role),
    time: now(),
    note,
  };
}

export function QuotationProvider({ children }: PropsWithChildren) {
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const [currentRole, setCurrentRole] = useState<QuoteRole>('pm');

  const getQuoteById = useCallback((id: string) => quotes.find((q) => q.id === id), [quotes]);

  const updateQuote = useCallback((id: string, updater: (q: Quote) => Quote) => {
    setQuotes((current) => current.map((q) => (q.id === id ? { ...updater(q), updatedAt: now() } : q)));
  }, []);

  /** 统一的流转入口：改状态 + 追加轨迹，可选附带其他字段变更 */
  const transition = useCallback(
    (
      quoteId: string,
      action: QuoteAction,
      role: QuoteRole,
      status: QuoteStatus | null,
      note?: string,
      patch?: (q: Quote) => Partial<Quote>,
    ) => {
      setQuotes((current) =>
        current.map((q) => {
          if (q.id !== quoteId) return q;
          const extra = patch ? patch(q) : {};
          return {
            ...q,
            ...extra,
            status: status ?? q.status,
            timeline: [...q.timeline, makeEvent(action, role, note)],
            updatedAt: now(),
          };
        }),
      );
    },
    [],
  );

  const createQuote = useCallback(
    (leadId: string, featureList: FeatureModule[], basicInfo: Partial<Quote['basicInfo']>): string => {
      const clock = new Date();
      const nowStr = now();
      const id = `q-${clock.getTime()}`;
      const quoteNo = `ZK-${clock.toISOString().slice(0, 10).replace(/-/g, '')}-${String(quotes.length + 1).padStart(3, '0')}`;
      const newQuote: Quote = {
        id,
        quoteNo,
        version: 'v1.0',
        // 从线索带入的清单仍需 PM 在工作台一整理定版，所以落在草稿
        status: 'draft',
        leadId,
        basicInfo: {
          projectName: basicInfo.projectName ?? '未命名项目',
          projectType: basicInfo.projectType ?? '其他定制',
          creatorName: basicInfo.creatorName ?? '张产品',
          techEvaluatorName: basicInfo.techEvaluatorName ?? '罗总',
          requirementDesc: basicInfo.requirementDesc ?? '',
          customerName: basicInfo.customerName ?? '',
          customerContact: basicInfo.customerContact ?? '',
          customerPhone: basicInfo.customerPhone ?? '',
          quoteValidityDays: basicInfo.quoteValidityDays ?? 30,
        },
        featureList: featureList.length > 0 ? featureList : buildDefaultFeatureList(),
        salesAddedRoles: [],
        frontendConfig: { platforms: [] },
        backendConfig: { services: [], language: '' },
        travelOnsite: { enableTravel: false, travelSubtotal: 0, enableOnsite: false, onsiteSubtotal: 0 },
        otherCosts: [],
        auditNodes: buildInitialAuditNodes(),
        stampNode: { stamperName: '黄海', status: 'LOCKED' },
        timeline: [makeEvent('create', 'pm')],
        ccSalesNames: ['李销售'],
        createdAt: nowStr,
        updatedAt: nowStr,
      };
      setQuotes((current) => [...current, newQuote]);
      return id;
    },
    [quotes.length],
  );

  // ─── 阶段一 ─────────────────────────────────────────────

  const saveFeatureList = useCallback((quoteId: string, featureList: FeatureModule[]) => {
    updateQuote(quoteId, (q) => ({ ...q, featureList }));
  }, [updateQuote]);

  const setDeadline = useCallback((quoteId: string, deadline: string, ccSalesNames: string[]) => {
    updateQuote(quoteId, (q) => ({ ...q, deadline, ccSalesNames }));
  }, [updateQuote]);

  const submitFeatureList = useCallback((quoteId: string) => {
    // 提交时按功能清单初始化评估表（逐项 SINGLE），罗总再自行切片
    transition(quoteId, 'submit_feature_list', 'pm', 'feature_confirmed', undefined, (q) => {
      if (q.evalSheet) return {};
      const activeRoles = [
        { key: 'pm_days', name: '产品经理' },
        { key: 'ui_days', name: 'UI设计师' },
        { key: 'fe_days', name: '前端开发' },
        { key: 'be_days', name: '后端开发' },
        { key: 'qa_days', name: '测试工程师' },
      ];
      const evalSheet: EvalSheet = {
        id: `EV-${q.quoteNo}`,
        evaluator: q.basicInfo.techEvaluatorName,
        activeRoles,
        evaluationUnits: buildInitialUnits(q.featureList, activeRoles.map((r) => r.key)),
        manualWorkDays: 0,
        techSolutionNote: '',
      };
      return { evalSheet };
    });
  }, [transition]);

  // ─── 阶段二 ─────────────────────────────────────────────

  const saveEvalSheet = useCallback((quoteId: string, evalSheet: EvalSheet) => {
    updateQuote(quoteId, (q) => ({ ...q, evalSheet }));
  }, [updateQuote]);

  const submitEval = useCallback((quoteId: string) => {
    transition(quoteId, 'submit_eval', 'tech', 'eval_completed');
  }, [transition]);

  const assignToSales = useCallback((quoteId: string) => {
    transition(quoteId, 'assign_to_sales', 'pm', 'assigned_sales');
  }, [transition]);

  // ─── 阶段三 ─────────────────────────────────────────────

  const returnToTech = useCallback((quoteId: string, reason: string) => {
    transition(quoteId, 'return_to_tech', 'sales', 'feature_confirmed', reason);
  }, [transition]);

  const submitForAudit = useCallback((quoteId: string) => {
    // 每次提交都重置会签节点，禁止沿用上一轮审批结果
    transition(quoteId, 'submit_for_audit', 'sales', 'auditing', undefined, () => ({
      auditNodes: resetAuditNodes(),
      stampNode: { stamperName: '黄海', status: 'LOCKED' as const },
    }));
  }, [transition]);

  const withdrawAudit = useCallback((quoteId: string, reason: string) => {
    transition(quoteId, 'withdraw_audit', 'sales', 'assigned_sales', reason, () => ({
      auditNodes: resetAuditNodes(),
    }));
  }, [transition]);

  // ─── 阶段四 ─────────────────────────────────────────────

  const decideAudit = useCallback(
    (quoteId: string, auditorName: string, decision: 'approve' | 'reject', comment?: string) => {
      setQuotes((current) =>
        current.map((q) => {
          if (q.id !== quoteId) return q;
          const stamp = now();
          const decided = q.auditNodes.map((node) =>
            node.auditorName === auditorName
              ? {
                  ...node,
                  status: decision === 'approve' ? ('APPROVED' as const) : ('REJECTED' as const),
                  auditTime: stamp,
                  comment: comment || (decision === 'approve' ? '同意' : ''),
                }
              : node,
          );
          const outcome = resolveAuditOutcome(decided);
          const role: QuoteRole =
            auditorName === '黄奕' ? 'sales_manager' : auditorName === '罗总' ? 'tech' : 'decision';
          const event = makeEvent(decision === 'approve' ? 'audit_approve' : 'audit_reject', role, comment);

          if (outcome === 'rejected') {
            // 全员重审重置：清空所有审批记录，销售改完须三人重新会签
            return {
              ...q,
              auditNodes: resetAuditNodes(),
              status: 'rejected' as QuoteStatus,
              timeline: [...q.timeline, event],
              updatedAt: stamp,
            };
          }
          if (outcome === 'pending_stamp') {
            return {
              ...q,
              auditNodes: decided,
              status: 'pending_stamp' as QuoteStatus,
              stampNode: { ...q.stampNode, status: 'PENDING_STAMP' as const },
              timeline: [...q.timeline, event],
              updatedAt: stamp,
            };
          }
          return { ...q, auditNodes: decided, timeline: [...q.timeline, event], updatedAt: stamp };
        }),
      );
    },
    [],
  );

  const stampQuote = useCallback((quoteId: string) => {
    transition(quoteId, 'stamp', 'assistant', 'stamped', undefined, (q) => ({
      stampNode: { ...q.stampNode, status: 'COMPLETED' as const, stampTime: now() },
    }));
  }, [transition]);

  const markSent = useCallback((quoteId: string) => {
    // 报价有效期自正式发送日起算
    transition(quoteId, 'mark_sent', 'sales', 'sent', undefined, () => ({ sentAt: now() }));
  }, [transition]);

  const markDeal = useCallback((quoteId: string) => {
    transition(quoteId, 'mark_deal', 'sales', 'deal');
  }, [transition]);

  const markVoided = useCallback((quoteId: string, reason: string) => {
    transition(quoteId, 'mark_voided', 'sales', 'voided', reason);
  }, [transition]);

  const createNewVersion = useCallback((quoteId: string): string => {
    const source = quotes.find((q) => q.id === quoteId);
    if (!source) return quoteId;
    const newId = `q-${new Date().getTime()}`;
    // 旧版本不覆盖，新版本继承快照后回到销售报价阶段
    const copy: Quote = {
      ...source,
      id: newId,
      version: nextVersion(source.version),
      status: 'assigned_sales',
      previousQuoteId: source.id,
      auditNodes: resetAuditNodes(),
      stampNode: { stamperName: '黄海', status: 'LOCKED' },
      sentAt: undefined,
      summary: source.summary ? { ...source.summary } : undefined,
      timeline: [makeEvent('new_version', 'sales', `基于 ${source.version} 创建`)],
      createdAt: now(),
      updatedAt: now(),
    };
    setQuotes((current) => [...current, copy]);
    return newId;
  }, [quotes]);

  const value = useMemo<QuotationContextValue>(() => ({
    quotes,
    currentRole,
    setCurrentRole,
    getQuoteById,
    updateQuote,
    createQuote,
    saveFeatureList,
    setDeadline,
    submitFeatureList,
    saveEvalSheet,
    submitEval,
    assignToSales,
    returnToTech,
    submitForAudit,
    withdrawAudit,
    decideAudit,
    stampQuote,
    markSent,
    markDeal,
    markVoided,
    createNewVersion,
  }), [
    quotes, currentRole, getQuoteById, updateQuote, createQuote,
    saveFeatureList, setDeadline, submitFeatureList,
    saveEvalSheet, submitEval, assignToSales,
    returnToTech, submitForAudit, withdrawAudit,
    decideAudit, stampQuote, markSent, markDeal, markVoided, createNewVersion,
  ]);

  return <QuotationContext.Provider value={value}>{children}</QuotationContext.Provider>;
}

export function useQuotation(): QuotationContextValue {
  const context = useContext(QuotationContext);
  if (!context) throw new Error('useQuotation must be used within QuotationProvider');
  return context;
}
