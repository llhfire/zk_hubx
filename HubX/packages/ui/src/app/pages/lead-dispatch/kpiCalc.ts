/**
 * 线索派发工作台 - KPI 与分类纯函数
 *
 * 事实源：PLAN.md 阶段 B（告警卡 5 类 + Cohort 成交率；快捷分类 6 Tab；行高亮红>橙>琥珀）
 */

import type { LeadListItem } from '@/app/pages/leads/types';
import { dispatchSlaState, firstContactSlaState } from './slaCalc';
import { returnQualityBucket } from './dispatchRules';
import { admissionCohortRate, type CohortRow } from './cohortCalc';
import type { ReturnQualityState, SlaState } from './types';

// --- 快捷分类（6 Tab） ---
export type DispatchCategory =
  | 'all'                 // 全部
  | 'pending_dispatch'    // 待派发
  | 'first_contact_overdue' // 首联超时
  | 'sa_focus'            // S-A 重点客资
  | 'level_audit'         // 等级审核（管理员）
  | 'quality_bucket';     // 质检分桶（管理员）

export const CATEGORY_LABEL: Record<DispatchCategory, string> = {
  all: '全部',
  pending_dispatch: '待派发',
  first_contact_overdue: '首联超时',
  sa_focus: 'S-A 重点',
  level_audit: '等级审核',
  quality_bucket: '质检分桶',
};

// --- 单条线索的派发视图 ---

export type RowHighlight = 'first_contact_overdue' | 'dispatch_overdue' | 'level_audit' | null;

export interface LeadDispatchView {
  /** 派发 SLA（30min） */
  dispatchSla: SlaState;
  /** 首联 SLA（2h） */
  firstContactSla: SlaState;
  /** 退回质检分桶 */
  returnQuality: ReturnQualityState;
  /** 是否有待审核的降级申请 */
  pendingLevelAudit: boolean;
  /** 行高亮：红（首联超时）> 橙（派发超期）> 琥珀（待审核） */
  highlight: RowHighlight;
}

/** 公海派发后被领取的领取时刻近似（owner 非空视为已领取） */
export function claimedAtOf(lead: LeadListItem): string | null {
  if (lead.dispatchTarget === 'pool' && lead.owner) {
    return lead.lastFollowTime || lead.dispatchedAt || null;
  }
  return null;
}

/** 降级事件后没有审核结果 -> 待审核 */
export function hasPendingLevelAudit(lead: LeadListItem): boolean {
  const events = lead.leadEvents ?? [];
  let pending = false;
  for (const e of events) {
    if (e.kind === 'level_change' && isDowngrade(e.levelFrom, e.levelTo)) pending = true;
    if (e.kind === 'level_audit_result') pending = false;
  }
  return pending;
}

const LEVEL_RANK: Record<string, number> = { S: 4, A: 3, B: 2, C: 1 };

function isDowngrade(from?: string, to?: string): boolean {
  if (!from || !to) return false;
  return (LEVEL_RANK[from] ?? 0) > (LEVEL_RANK[to] ?? 0);
}

/** 退回事件的操作人列表（不同销售去重交给 returnQualityBucket） */
export function returnActorsOf(lead: LeadListItem): string[] {
  return (lead.leadEvents ?? []).filter((e) => e.kind === 'return').map((e) => e.actor);
}

/** 单条线索派发视图（时效两道 + 质检 + 高亮） */
export function leadDispatchView(lead: LeadListItem, now: Date): LeadDispatchView {
  const dispatchSla = dispatchSlaState(lead.createTime, lead.dispatchedAt, now);
  const firstContactSla = firstContactSlaState(
    lead.dispatchedAt,
    lead.dispatchTarget,
    claimedAtOf(lead),
    lead.followCount > 0,
    now,
  );
  const returnQuality = returnQualityBucket(returnActorsOf(lead));
  const pendingLevelAudit = hasPendingLevelAudit(lead);

  // 行高亮优先级：红（首联超时）> 橙（派发超期）> 琥珀（待审核）
  let highlight: RowHighlight = null;
  if (firstContactSla.status === 'overdue') highlight = 'first_contact_overdue';
  else if (dispatchSla.status === 'overdue') highlight = 'dispatch_overdue';
  else if (pendingLevelAudit) highlight = 'level_audit';

  return { dispatchSla, firstContactSla, returnQuality, pendingLevelAudit, highlight };
}

// --- 分类过滤 ---

export function filterByCategory(
  leads: LeadListItem[],
  category: DispatchCategory,
  now: Date,
): LeadListItem[] {
  switch (category) {
    case 'all':
      return leads;
    case 'pending_dispatch':
      return leads.filter((l) => !l.dispatchedAt);
    case 'first_contact_overdue':
      return leads.filter((l) => leadDispatchView(l, now).firstContactSla.status === 'overdue');
    case 'sa_focus':
      return leads.filter((l) => l.customerLevel === 'S' || l.customerLevel === 'A');
    case 'level_audit':
      return leads.filter((l) => hasPendingLevelAudit(l));
    case 'quality_bucket':
      return leads.filter((l) => leadDispatchView(l, now).returnQuality.bucket === 'pending_confirm');
    default:
      return leads;
  }
}

// --- KPI（告警卡 5 类 + Cohort 成交率） ---

export interface DispatchKpis {
  /** 今日录入 */
  inboundToday: number;
  /** 今日录入中已派发 */
  dispatchedToday: number;
  /** 待派发池总量 */
  pendingDispatch: number;
  /** 待派发超时（30min） */
  dispatchOverdue: number;
  /** 首联超时（2h） */
  firstContactOverdue: number;
  /** 等级审核待办（降级待审核） */
  levelAuditPending: number;
  /** 质检分桶待确认（满 3 人退回） */
  qualityPending: number;
  /** 录入月归因成交率（近 6 个月） */
  cohort: CohortRow[];
}

export function computeDispatchKpis(leads: LeadListItem[], now: Date): DispatchKpis {
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayLeads = leads.filter((l) => l.createTime.slice(0, 10) === todayStr);

  let dispatchOverdue = 0;
  let firstContactOverdue = 0;
  let levelAuditPending = 0;
  let qualityPending = 0;
  for (const l of leads) {
    const view = leadDispatchView(l, now);
    if (view.dispatchSla.status === 'overdue') dispatchOverdue += 1;
    if (view.firstContactSla.status === 'overdue') firstContactOverdue += 1;
    if (view.pendingLevelAudit) levelAuditPending += 1;
    if (view.returnQuality.bucket === 'pending_confirm') qualityPending += 1;
  }

  return {
    inboundToday: todayLeads.length,
    dispatchedToday: todayLeads.filter((l) => l.dispatchedAt).length,
    pendingDispatch: leads.filter((l) => !l.dispatchedAt).length,
    dispatchOverdue,
    firstContactOverdue,
    levelAuditPending,
    qualityPending,
    cohort: admissionCohortRate(leads).slice(0, 6),
  };
}
