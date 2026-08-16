// 报价域「状态变更」共享纯函数：mock 与 http 两个 service 复用同一套业务逻辑，
// 区别只在「改完存到哪」（内存/localStorage vs HTTP）。这样接后端时不会出现两套口径。

import { buildDefaultFeatureList } from '@/app/pages/quotation/defaultFeatures';
import {
  buildInitialUnits,
  nextVersion,
  resetAuditNodes,
  resolveAuditOutcome,
} from '@/app/pages/quotation/quoteFlow';
import {
  QUOTE_ROLE_ACTORS,
  QUOTE_ROLES,
  buildInitialAuditNodes,
} from '@/app/pages/quotation/types';
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
  const role: QuoteRole =
    auditorName === '黄奕' ? 'sales_manager' : auditorName === '罗总' ? 'tech' : 'decision';
  const event = makeEvent(decision === 'approve' ? 'audit_approve' : 'audit_reject', role, comment);

  if (outcome === 'rejected') {
    return {
      ...quote,
      auditNodes: resetAuditNodes(),
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
  const base = applyTransition(quote, 'submit_feature_list', 'pm', 'feature_confirmed');
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
): Quote {
  const nowStr = now();
  return {
    id,
    quoteNo,
    version: 'v1.0',
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
    endpointConfigs: [
      { id: 'ep-1', name: '用户端', platforms: ['wechat'] },
      { id: 'ep-2', name: '管理后台', platforms: ['pcweb'] },
    ],
    salesAddedRoles: [],
    frontendConfig: { platforms: [] },
    backendConfig: { services: [], language: '' },
    travelOnsite: { enableTravel: false, travelSubtotal: 0, enableOnsite: false, onsiteSubtotal: 0 },
    otherCosts: [],
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
}

/** 生成客户端报价 id / 编号（http 服务也用它，编号顺序以当前列表长度为准） */
export function generateQuoteId(): string {
  return `q-${new Date().getTime()}`;
}

export function generateQuoteNo(listLength: number): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `ZK-${date}-${String(listLength + 1).padStart(3, '0')}`;
}
