import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type {
  EvalSheet,
  FeatureModule,
  Quote,
  QuoteRole,
} from './types';
import { buildQuoteTodos } from './quoteFlow';
import { getQuoteAuditSnapshot } from './quoteAuditSnapshot';
import {
  createMockQuotationService,
  type CreateQuoteOptions,
  type QuotationService,
} from '@/services/quotationService';
import { loadBusinessApprovals, loadWorkflowTemplates } from '@/app/approvals/configStore';
import type { TodoItem } from '@/app/todos/types';
import { Message } from '@arco-design/web-react';
import { quoteLeadGate } from './quoteAccess';
import type { QuoteAction } from './types';

/** 线索简况（跨域注入，不建 LeadsContext） */
export interface LeadBrief {
  status: string;
  ownerName?: string;
}

interface QuotationContextValue {
  quotes: Quote[];
  loading: boolean;
  currentRole: QuoteRole;
  setCurrentRole: (role: QuoteRole) => void;
  /** 当前角色待处理的报价待办（派生，非持久化） */
  myQuoteTodos: TodoItem[];
  getQuoteById: (id: string) => Quote | undefined;
  updateQuote: (id: string, updater: (q: Quote) => Quote) => Promise<void>;

  /** 创建报价单（从线索功能清单发起） */
  createQuote: (
    leadId: string,
    featureList: FeatureModule[],
    basicInfo: Partial<Quote['basicInfo']>,
    options?: CreateQuoteOptions,
  ) => Promise<string>;
  createSupplementQuote: (sourceQuoteId: string, contractId: string, flowMode: 'online' | 'file') => Promise<string>;

  // ── 阶段一：产品经理功能清单 ──
  saveFeatureList: (quoteId: string, featureList: FeatureModule[]) => Promise<void>;
  setDeadline: (quoteId: string, deadline: string, ccSalesNames: string[]) => Promise<void>;
  submitFeatureList: (quoteId: string) => Promise<void>;

  // ── 阶段二：技术人天评估 ──
  saveEvalSheet: (quoteId: string, evalSheet: EvalSheet) => Promise<void>;
  submitEval: (quoteId: string) => Promise<void>;
  assignToSales: (quoteId: string) => Promise<void>;

  // ── 阶段三：销售报价配置 ──
  returnToTech: (quoteId: string, reason: string) => Promise<void>;
  submitForAudit: (quoteId: string) => Promise<void>;
  withdrawAudit: (quoteId: string, reason: string) => Promise<void>;

  // ── 阶段四：审批与盖章 ──
  decideAudit: (quoteId: string, auditorName: string, decision: 'approve' | 'reject', comment?: string) => Promise<void>;
  stampQuote: (quoteId: string) => Promise<void>;
  markSent: (quoteId: string) => Promise<void>;
  markConfirmed: (quoteId: string) => Promise<void>;
  markVoided: (quoteId: string, reason: string) => Promise<void>;
  createNewVersion: (quoteId: string) => Promise<string>;

  // ── 回退动作 ──
  withdrawSent: (quoteId: string) => Promise<void>;
  returnToStamp: (quoteId: string) => Promise<void>;
  returnToEditFeatures: (quoteId: string) => Promise<void>;

  // ── 4.2 新增 ──
  /** 当前查看者姓名（从角色映射） */
  currentViewer: string;
  /** 是否管理员 */
  isAdmin: boolean;
  /** 线索简况注入器（α 读 mock，β 换 HTTP join） */
  leadBriefProvider?: (leadId: string) => LeadBrief | null;
  /** 当前报价是否因线索已终止而冻结前进动作 */
  isLeadFrozen: (quoteId: string) => boolean;
  /** 删除报价（仅从未提交评估的草稿） */
  deleteQuote: (quoteId: string) => Promise<void>;
  /** 改指销售或评估人 */
  reassignOwner: (quoteId: string, field: 'salesOwnerName' | 'techEvaluatorName', value: string) => Promise<void>;
}

const QuotationContext = createContext<QuotationContextValue | null>(null);

const ROLE_KEY = 'hubx-quotation-role-v1';

function loadRole(): QuoteRole {
  try {
    const raw = window.localStorage.getItem(ROLE_KEY);
    if (raw) return raw as QuoteRole;
  } catch {
    // ignore
  }
  return 'sales';
}

interface QuotationProviderProps extends PropsWithChildren {
  /** 数据源：α版注入 mock，β版注入 http。缺省 mock。 */
  service?: QuotationService;
  /** 线索简况注入器 */
  leadBriefProvider?: (leadId: string) => LeadBrief | null;
}

/** 角色 → 默认姓名映射（α 版硬编码，后续接真实用户体系时替换） */
const ROLE_DEFAULT_NAME: Record<QuoteRole, string> = {
  pm: '张产品',
  tech: '罗总',
  sales: '张三',
  sales_manager: '黄奕',
  decision: '闵总',
  assistant: '黄海',
};

const ADMIN_ROLES: QuoteRole[] = ['sales_manager', 'decision'];

export function QuotationProvider({ children, service, leadBriefProvider }: QuotationProviderProps) {
  const svc = useMemo(() => service ?? createMockQuotationService(), [service]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<QuoteRole>(loadRole);

  useEffect(() => {
    let cancelled = false;
    svc.list().then((qs) => {
      if (cancelled) return;
      setQuotes(qs);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [svc]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ROLE_KEY, currentRole);
    } catch {
      // ignore
    }
  }, [currentRole]);

  const refresh = useCallback(async () => {
    setQuotes(await svc.list());
  }, [svc]);

  const myQuoteTodos = useMemo(() => buildQuoteTodos(quotes, currentRole), [quotes, currentRole]);

  const getQuoteById = useCallback((id: string) => quotes.find((q) => q.id === id), [quotes]);

  const canRunAction = useCallback((quoteId: string, action: QuoteAction) => {
    const quote = quotes.find((item) => item.id === quoteId);
    if (!quote) return false;
    const allowed = quoteLeadGate(leadBriefProvider?.(quote.leadId)?.status, action);
    if (!allowed) Message.warning('关联线索已终止，恢复线索后才能继续推进报价');
    return allowed;
  }, [quotes, leadBriefProvider]);

  const isLeadFrozen = useCallback((quoteId: string) => {
    const quote = quotes.find((item) => item.id === quoteId);
    return Boolean(quote && leadBriefProvider?.(quote.leadId)?.status === '已终止');
  }, [quotes, leadBriefProvider]);

  const updateQuote = useCallback(
    async (id: string, updater: (q: Quote) => Quote) => {
      await svc.updateQuote(id, updater);
      await refresh();
    },
    [svc, refresh],
  );

  const createQuote = useCallback(
    async (
      leadId: string,
      featureList: FeatureModule[],
      basicInfo: Partial<Quote['basicInfo']>,
      options?: CreateQuoteOptions,
    ): Promise<string> => {
      const leadOwnerName = leadBriefProvider?.(leadId)?.ownerName;
      const id = await svc.createQuote(leadId, featureList, basicInfo, {
        ...options,
        salesOwnerName: options?.salesOwnerName ?? leadOwnerName,
      });
      await refresh();
      return id;
    },
    [svc, refresh, leadBriefProvider],
  );

  const createSupplementQuote = useCallback(
    async (sourceQuoteId: string, contractId: string, flowMode: 'online' | 'file') => {
      const id = await svc.createSupplementQuote(sourceQuoteId, contractId, flowMode);
      await refresh();
      return id;
    },
    [svc, refresh],
  );

  const saveFeatureList = useCallback(
    async (quoteId: string, featureList: FeatureModule[]) => {
      await svc.saveFeatureList(quoteId, featureList);
      await refresh();
    },
    [svc, refresh],
  );

  const setDeadline = useCallback(
    async (quoteId: string, deadline: string, ccSalesNames: string[]) => {
      await svc.setDeadline(quoteId, deadline, ccSalesNames);
      await refresh();
    },
    [svc, refresh],
  );

  const submitFeatureList = useCallback(
    async (quoteId: string) => {
      if (!canRunAction(quoteId, 'submit_feature_list')) return;
      await svc.submitFeatureList(quoteId);
      await refresh();
    },
    [svc, refresh, canRunAction],
  );

  const saveEvalSheet = useCallback(
    async (quoteId: string, evalSheet: EvalSheet) => {
      await svc.saveEvalSheet(quoteId, evalSheet);
      await refresh();
    },
    [svc, refresh],
  );

  const submitEval = useCallback(
    async (quoteId: string) => {
      if (!canRunAction(quoteId, 'submit_eval')) return;
      await svc.submitEval(quoteId);
      await refresh();
    },
    [svc, refresh, canRunAction],
  );

  const assignToSales = useCallback(
    async (quoteId: string) => {
      if (!canRunAction(quoteId, 'assign_to_sales')) return;
      await svc.assignToSales(quoteId);
      await refresh();
    },
    [svc, refresh, canRunAction],
  );

  const returnToTech = useCallback(
    async (quoteId: string, reason: string) => {
      await svc.returnToTech(quoteId, reason);
      await refresh();
    },
    [svc, refresh],
  );

  const submitForAudit = useCallback(
    async (quoteId: string) => {
      if (!canRunAction(quoteId, 'submit_for_audit')) return;
      // 提交时拍配置快照（ADR 0049）
      const quote = quotes.find((item) => item.id === quoteId);
      const snapshot = getQuoteAuditSnapshot(
        loadBusinessApprovals,
        loadWorkflowTemplates,
        quote?.isSupplement ? 'supplement-quote-approval' : 'quote-approval',
      );
      await svc.submitForAudit(quoteId, snapshot);
      await refresh();
    },
    [svc, refresh, canRunAction, quotes],
  );

  const withdrawAudit = useCallback(
    async (quoteId: string, reason: string) => {
      await svc.withdrawAudit(quoteId, reason);
      await refresh();
    },
    [svc, refresh],
  );

  const decideAudit = useCallback(
    async (quoteId: string, auditorName: string, decision: 'approve' | 'reject', comment?: string) => {
      if (!canRunAction(quoteId, decision === 'approve' ? 'audit_approve' : 'audit_reject')) return;
      await svc.decideAudit(quoteId, auditorName, decision, comment);
      await refresh();
    },
    [svc, refresh, canRunAction],
  );

  const stampQuote = useCallback(
    async (quoteId: string) => {
      if (!canRunAction(quoteId, 'stamp')) return;
      await svc.stampQuote(quoteId);
      await refresh();
    },
    [svc, refresh, canRunAction],
  );

  const markSent = useCallback(
    async (quoteId: string) => {
      if (!canRunAction(quoteId, 'mark_sent')) return;
      await svc.markSent(quoteId);
      await refresh();
    },
    [svc, refresh, canRunAction],
  );

  const markConfirmed = useCallback(
    async (quoteId: string) => {
      if (!canRunAction(quoteId, 'mark_confirmed')) return;
      await svc.markConfirmed(quoteId);
      await refresh();
    },
    [svc, refresh, canRunAction],
  );

  const markVoided = useCallback(
    async (quoteId: string, reason: string) => {
      if (!canRunAction(quoteId, 'mark_voided')) return;
      await svc.markVoided(quoteId, reason);
      await refresh();
    },
    [svc, refresh, canRunAction],
  );

  const createNewVersion = useCallback(
    async (quoteId: string): Promise<string> => {
      if (!canRunAction(quoteId, 'new_version')) return quoteId;
      const id = await svc.createNewVersion(quoteId);
      await refresh();
      return id;
    },
    [svc, refresh, canRunAction],
  );

  const withdrawSent = useCallback(
    async (quoteId: string) => {
      await svc.withdrawSent(quoteId);
      await refresh();
    },
    [svc, refresh],
  );

  const returnToStamp = useCallback(
    async (quoteId: string) => {
      await svc.returnToStamp(quoteId);
      await refresh();
    },
    [svc, refresh],
  );

  const returnToEditFeatures = useCallback(
    async (quoteId: string) => {
      await svc.returnToEditFeatures(quoteId);
      await refresh();
    },
    [svc, refresh],
  );

  const deleteQuote = useCallback(
    async (quoteId: string) => {
      await svc.deleteQuote(quoteId);
      await refresh();
    },
    [svc, refresh],
  );

  const reassignOwner = useCallback(
    async (quoteId: string, field: 'salesOwnerName' | 'techEvaluatorName', value: string) => {
      await svc.reassignOwner(quoteId, field, value);
      await refresh();
    },
    [svc, refresh],
  );

  const currentViewer = ROLE_DEFAULT_NAME[currentRole];
  const isAdmin = ADMIN_ROLES.includes(currentRole);

  const value = useMemo<QuotationContextValue>(() => ({
    quotes,
    loading,
    currentRole,
    setCurrentRole,
    myQuoteTodos,
    getQuoteById,
    updateQuote,
    createQuote,
    createSupplementQuote,
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
    markConfirmed,
    markVoided,
    createNewVersion,
    withdrawSent,
    returnToStamp,
    returnToEditFeatures,
    currentViewer,
    isAdmin,
    leadBriefProvider,
    isLeadFrozen,
    deleteQuote,
    reassignOwner,
  }), [
    quotes, loading, currentRole, myQuoteTodos, getQuoteById, updateQuote, createQuote, createSupplementQuote,
    saveFeatureList, setDeadline, submitFeatureList,
    saveEvalSheet, submitEval, assignToSales,
    returnToTech, submitForAudit, withdrawAudit,
    decideAudit, stampQuote, markSent, markConfirmed, markVoided, createNewVersion,
    withdrawSent, returnToStamp, returnToEditFeatures,
    currentViewer, isAdmin, leadBriefProvider, isLeadFrozen, deleteQuote, reassignOwner,
  ]);

  return <QuotationContext.Provider value={value}>{children}</QuotationContext.Provider>;
}

export function useQuotation(): QuotationContextValue {
  const context = useContext(QuotationContext);
  if (!context) throw new Error('useQuotation must be used within QuotationProvider');
  return context;
}
