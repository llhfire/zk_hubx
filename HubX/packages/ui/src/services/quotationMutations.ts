// 报价域「状态变更」共享纯函数：mock 与 http 两个 service 复用同一套业务逻辑，
// 区别只在「改完存到哪」（内存/localStorage vs HTTP）。这样接后端时不会出现两套口径。

import { buildDefaultFeatureList } from '@/app/pages/quotation/defaultFeatures';
import {
  buildInitialUnits,
  computeAmountBreakdown,
  nextVersion,
  resetAuditNodes,
  resolveAuditOutcome,
} from '@/app/pages/quotation/quoteFlow';
import {
  QUOTE_ROLE_ACTORS,
  QUOTE_ROLES,
  buildInitialAuditNodes,
} from '@/app/pages/quotation/types';
import { ZKRT_QUOTE_TEMPLATE } from '@/app/pages/quotation/quoteDocumentTemplate';
import type {
  EvalSheet,
  FeatureModule,
  Quote,
  QuoteAction,
  QuoteRole,
  QuoteStatus,
  QuoteTimelineEvent,
} from '@/app/pages/quotation/types';

export function now(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

let timelineSeq = 0;

function roleLabel(role: QuoteRole): string {
  const found = QUOTE_ROLES.find((r) => r.key === role);
  if (!found) return role;
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

/** 通用字段更新（保存功能清单/评估表/出差驻场等） */
export function applyUpdate(quote: Quote, updater: (q: Quote) => Quote): Quote {
  return { ...updater(quote), updatedAt: now() };
}

/** 提交审批时把唯一计算源固化为报价汇总快照。 */
export function buildPricingSummary(quote: Quote): NonNullable<Quote['summary']> {
  const breakdown = computeAmountBreakdown(quote);
  const paymentTerms = quote.summary?.paymentTerms?.length
    ? quote.summary.paymentTerms.map((term) => ({
        ...term,
        amount: Math.round((breakdown.grandTotal * term.percent / 100) * 100) / 100,
      }))
    : ZKRT_QUOTE_TEMPLATE.defaultPaymentTerms.map((term) => ({
        ...term,
        amount: Math.round((breakdown.grandTotal * term.percent / 100) * 100) / 100,
      }));
  return {
    totalLaborDays: breakdown.totalLaborDays,
    projectWorkDays: quote.evalSheet?.manualWorkDays ?? quote.summary?.projectWorkDays ?? 0,
    grandTotalPrice: breakdown.grandTotal,
    paymentTerms,
    taxIncluded: quote.summary?.taxIncluded ?? true,
    warrantyYears: quote.summary?.warrantyYears ?? 1,
    invoiceType: quote.summary?.invoiceType ?? '专票',
  };
}

/** 通用流转：改状态 + 追加轨迹 + 可选字段 patch */
export function applyTransition(
  quote: Quote,
  action: QuoteAction,
  role: QuoteRole,
  status: QuoteStatus | null,
  note?: string,
  patch?: (q: Quote) => Partial<Quote>,
): Quote {
  const extra = patch ? patch(quote) : {};
  return {
    ...quote,
    ...extra,
    status: status ?? quote.status,
    timeline: [...quote.timeline, makeEvent(action, role, note)],
    updatedAt: now(),
  };
}

/** 改指销售或评估人（非终态可改） */
export function applyReassign(
  quote: Quote,
  field: 'salesOwnerName' | 'techEvaluatorName',
  newValue: string,
  actorName: string,
): Quote {
  const action = field === 'salesOwnerName' ? 'reassign_sales' : 'reassign_evaluator';
  return {
    ...quote,
    [field]: newValue,
    timeline: [...quote.timeline, makeEvent(action, 'sales' as QuoteRole, `${field === 'salesOwnerName' ? '销售' : '评估人'}改指为 ${newValue}`)],
    updatedAt: now(),
  };
}

/** 三人会签决策：任一驳回→全员重审，全部通过→待盖章 */
export function applyDecideAudit(
  quote: Quote,
  auditorName: string,
  decision: 'approve' | 'reject',
  comment?: string,
): Quote {
  const stamp = now();
  const decided = quote.auditNodes.map((node) =>
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
  const role: QuoteRole = quote.auditNodes.find((node) => node.auditorName === auditorName)?.quoteRole
    ?? (auditorName === '黄奕' ? 'sales_manager' : auditorName === '罗总' ? 'tech' : 'decision');
  const event = makeEvent(decision === 'approve' ? 'audit_approve' : 'audit_reject', role, comment);

  if (outcome === 'rejected') {
    return {
      ...quote,
      auditNodes: resetAuditNodes(decided),
      status: 'rejected' as QuoteStatus,
      timeline: [...quote.timeline, event],
      updatedAt: stamp,
    };
  }
  if (outcome === 'pending_stamp') {
    return {
      ...quote,
      auditNodes: decided,
      status: 'pending_stamp' as QuoteStatus,
      stampNode: { ...quote.stampNode, status: 'PENDING_STAMP' as const },
      timeline: [...quote.timeline, event],
      updatedAt: stamp,
    };
  }
  return { ...quote, auditNodes: decided, timeline: [...quote.timeline, event], updatedAt: stamp };
}

/** 提交功能清单时的评估表初始化（首次提交才建） */
export function applySubmitFeatureList(quote: Quote): Quote {
  const base = applyTransition(quote, 'submit_feature_list', 'pm', 'pending_eval');
  if (base.evalSheet) return base;
  const activeRoles = [
    { key: 'pm_days', name: '产品经理' },
    { key: 'ui_days', name: 'UI设计师' },
    { key: 'fe_days', name: '前端开发' },
    { key: 'be_days', name: '后端开发' },
    { key: 'qa_days', name: '测试工程师' },
  ];
  const evalSheet: EvalSheet = {
    id: `EV-${base.quoteNo}`,
    evaluator: base.basicInfo.techEvaluatorName,
    activeRoles,
    evaluationUnits: buildInitialUnits(base.featureList, activeRoles.map((r) => r.key)),
    manualWorkDays: 0,
    techSolutionNote: '',
  };
  return { ...base, evalSheet };
}

/** 新建报价单（id/quoteNo 由调用方生成，避免与存储层耦合） */
export function buildNewQuote(
  id: string,
  quoteNo: string,
  leadId: string,
  featureList: FeatureModule[],
  basicInfo: Partial<Quote['basicInfo']>,
  salesOwnerName?: string,
  flowMode: Quote['flowMode'] = 'online',
  signingEntity: string = ZKRT_QUOTE_TEMPLATE.signingEntity,
): Quote {
  const nowStr = now();
  return {
    id,
    quoteNo,
    version: 'v1.0',
    status: 'draft',
    leadId,
    quoteTemplateId: ZKRT_QUOTE_TEMPLATE.id,
    signingEntity,
    flowMode,
    fileFlow: { onlineDocument: { status: 'empty' }, scans: [] },
    salesOwnerName: salesOwnerName ?? '张三',
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
    endpointConfigs: [
      { id: 'ep-1', name: '用户端', platforms: ['wechat'] },
      { id: 'ep-2', name: '管理后台', platforms: ['pcweb'] },
    ],
    salesAddedRoles: [],
    roleDailyCosts: {},
    frontendConfig: { platforms: [] },
    backendConfig: { services: [], language: '' },
    travelOnsite: { enableTravel: false, travelSubtotal: 0, enableOnsite: false, onsiteSubtotal: 0 },
    otherCosts: [],
    summary: {
      totalLaborDays: 0,
      projectWorkDays: 0,
      grandTotalPrice: 0,
      paymentTerms: [
        ...ZKRT_QUOTE_TEMPLATE.defaultPaymentTerms.map((term) => ({ ...term, amount: 0 })),
      ],
      taxIncluded: true,
      warrantyYears: 1,
      invoiceType: '专票',
    },
    auditNodes: buildInitialAuditNodes(),
    stampNode: { stamperName: '黄海', status: 'LOCKED' },
    timeline: [makeEvent('create', 'pm')],
    ccSalesNames: ['张三'],
    createdAt: nowStr,
    updatedAt: nowStr,
  };
}

/** 基于旧版本复制出新版本（不可覆盖原版） */
export function applyNewVersion(source: Quote, newId: string): Quote {
  return {
    ...source,
    id: newId,
    version: nextVersion(source.version),
    status: 'draft',
    previousQuoteId: source.id,
    auditNodes: resetAuditNodes(source.auditNodes),
    stampNode: { stamperName: source.stampNode.stamperName, stamperRole: source.stampNode.stamperRole, status: 'LOCKED' },
    sentAt: undefined,
    summary: source.summary ? { ...source.summary } : undefined,
    timeline: [makeEvent('new_version', 'sales', `基于 ${source.version} 创建`)],
    createdAt: now(),
    updatedAt: now(),
  };
}

/** 生成客户端报价 id（α 版以时间戳保证本地唯一） */
export function generateQuoteId(): string {
  return `q-${new Date().getTime()}`;
}

/** QT-YYYY-序号：主/补共用当年序列，每年从 1 重新开始。 */
export function generateQuoteNo(
  existing: { quoteNo: string }[],
  year = new Date().getFullYear(),
): string {
  const prefix = `QT-${year}-`;
  let max = 0;
  for (const quote of existing) {
    if (!quote.quoteNo.startsWith(prefix)) continue;
    const sequence = Number.parseInt(quote.quoteNo.slice(prefix.length), 10);
    if (Number.isFinite(sequence) && sequence > max) max = sequence;
  }
  return `${prefix}${max + 1}`;
}

// ─── 读时迁移（13 态 → 10 态）───────────────────────────────

const STATUS_MAP: Record<string, QuoteStatus> = {
  draft: 'draft',
  pending_eval: 'pending_eval',
  pending_quote: 'pending_quote',
  feature_confirmed: 'pending_eval',
  eval_completed: 'pending_quote',
  assigned_sales: 'pending_quote',
  quote_summarized: 'pending_quote',
  auditing: 'auditing',
  rejected: 'rejected',
  pending_stamp: 'pending_stamp',
  stamped: 'stamped',
  sent: 'sent',
  confirmed: 'confirmed',
  deal: 'confirmed',
  pending_followup: 'sent',
  voided: 'voided',
};

const LEGACY_AUDITOR_ROLES: Record<string, QuoteRole> = {
  huangyi: 'sales_manager',
  luo: 'tech',
  min: 'decision',
};

/**
 * 读时迁移：旧词表 → 新词表。
 * mock/HTTP/D1 三处读路径统一过这道函数再进 UI。
 * 脏数据（未知 status）保留原值并 console 警告，不静默吞。
 */
export function migrateQuote(quote: Quote): Quote {
  const mapped = STATUS_MAP[quote.status];
  if (!mapped) {
    console.warn(`[migrateQuote] 未知状态 "${quote.status}"，保留原值 (quote ${quote.id})`);
  }

  // α 版会长期保留浏览器缓存；旧报价可能只有当时页面需要的字段。
  // 在统一读路径补齐当前 UI 的必需结构，避免点击报价页签后才因 reduce/属性读取崩溃。
  const basicInfo = quote.basicInfo ?? ({} as Partial<Quote['basicInfo']>);
  const timeline = quote.timeline ?? [];
  const auditNodes = quote.auditNodes ?? [];
  const stampNode = quote.stampNode ?? { stamperName: '黄海', status: 'LOCKED' as const };

  return {
    ...quote,
    status: mapped ?? quote.status,
    quoteTemplateId: quote.quoteTemplateId ?? ZKRT_QUOTE_TEMPLATE.id,
    signingEntity: quote.signingEntity ?? ZKRT_QUOTE_TEMPLATE.signingEntity,
    salesOwnerName: quote.salesOwnerName ?? quote.ccSalesNames?.[0] ?? '张三',
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
      ...(basicInfo.industry ? { industry: basicInfo.industry } : {}),
    },
    featureList: (quote.featureList ?? []).map((module) => ({
      ...module,
      subFeatures: module.subFeatures ?? [],
    })),
    endpointConfigs: (quote.endpointConfigs ?? []).map((endpoint) => ({
      ...endpoint,
      platforms: endpoint.platforms ?? [],
    })),
    ...(quote.evalSheet
      ? {
          evalSheet: {
            ...quote.evalSheet,
            activeRoles: quote.evalSheet.activeRoles ?? [],
            evaluationUnits: quote.evalSheet.evaluationUnits ?? [],
          },
        }
      : {}),
    salesAddedRoles: quote.salesAddedRoles ?? [],
    frontendConfig: {
      ...(quote.frontendConfig ?? {}),
      platforms: quote.frontendConfig?.platforms ?? [],
    },
    backendConfig: {
      ...(quote.backendConfig ?? {}),
      services: quote.backendConfig?.services ?? [],
      language: quote.backendConfig?.language ?? '',
    },
    travelOnsite: {
      ...(quote.travelOnsite ?? {}),
      enableTravel: quote.travelOnsite?.enableTravel ?? false,
      travelSubtotal: quote.travelOnsite?.travelSubtotal ?? 0,
      enableOnsite: quote.travelOnsite?.enableOnsite ?? false,
      onsiteSubtotal: quote.travelOnsite?.onsiteSubtotal ?? 0,
      travelDetails: quote.travelOnsite?.travelDetails ?? [],
      onsiteDetails: quote.travelOnsite?.onsiteDetails ?? [],
    },
    otherCosts: quote.otherCosts ?? [],
    timeline: timeline.map((event) =>
      event.action === 'mark_deal'
        ? { ...event, action: 'mark_confirmed' as QuoteAction }
        : event,
    ),
    auditNodes: auditNodes.map((node) => ({
      ...node,
      quoteRole: node.quoteRole ?? LEGACY_AUDITOR_ROLES[node.auditorId],
    })),
    stampNode: {
      ...stampNode,
      stamperRole: stampNode.stamperRole
        ?? (stampNode.stamperName === '黄海' ? 'assistant' as QuoteRole : undefined),
    },
    ccSalesNames: quote.ccSalesNames ?? [],
    ...(quote.summary
      ? { summary: { ...quote.summary, invoiceType: quote.summary.invoiceType ?? '专票' as const } }
      : {}),
  };
}

// ─── 合法迁移表 ────────────────────────────────────────────

export interface TransitionRule {
  from: QuoteStatus[];
  to: QuoteStatus;
}

/** 合法迁移表：action → { from[], to }。service 层先查表再 applyTransition。 */
export const TRANSITIONS: Record<string, TransitionRule> = {
  submit_feature_list: { from: ['draft'], to: 'pending_eval' },
  submit_eval: { from: ['pending_eval'], to: 'pending_quote' },
  assign_to_sales: { from: ['pending_quote'], to: 'pending_quote' },
  submit_for_audit: { from: ['pending_quote', 'rejected'], to: 'auditing' },
  stamp: { from: ['pending_stamp'], to: 'stamped' },
  mark_sent: { from: ['stamped'], to: 'sent' },
  mark_confirmed: { from: ['sent'], to: 'confirmed' },
  withdraw_sent: { from: ['sent'], to: 'stamped' },
  return_to_stamp: { from: ['stamped'], to: 'pending_stamp' },
  return_to_edit_features: { from: ['rejected'], to: 'draft' },
  return_to_tech: { from: ['pending_quote'], to: 'pending_eval' },
  withdraw_audit: { from: ['auditing'], to: 'pending_quote' },
  mark_voided: { from: ['draft', 'pending_eval', 'pending_quote', 'auditing', 'rejected', 'pending_stamp', 'stamped', 'sent'], to: 'voided' },
  new_version: { from: ['rejected', 'voided'], to: 'draft' },
};

export function canTransition(status: QuoteStatus, action: string): boolean {
  const rule = TRANSITIONS[action];
  if (!rule) return false;
  return rule.from.includes(status);
}
