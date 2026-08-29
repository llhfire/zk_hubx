// 线索域操作纯函数（B2）。mock/http 服务共用，口径与 PRD-线索管理模块一致。
// 规则：8 态销售漏斗、退回第 3 次自动进垃圾、公海认领/分配、软删除、转客户、写跟进同步状态。
// β 阶段 2：派发域四动作与详情组装也下沉到这里（Workers 经 esbuild 单源导入，禁止复制）。
import type { Attachment, LeadListItem, LeadDetailInfo, FollowUpRecord, LeadAction, CustomerLevel } from '@/app/pages/leads/types';
import type { LeadEvent, DispatchTarget } from '@/app/pages/lead-dispatch/types';

/** 线索创建入参 */
export interface LeadCreateInput {
  name: string;
  contact: string;
  phone: string;
  wechat?: string;
  source: string;
  keyword?: string;
  customer?: string;
  entity: string;
  tags?: string[];
  initialRequirement?: string;
  level?: string;
  customerLevel?: string;
  optimizer?: string;
  owner?: string;
  assistant?: string;
  attachments?: Attachment[];
}

/** 跟进入参 */
export interface FollowUpInput {
  method: string;
  customerStatus: string;
  customerLevel?: string;
  intentionLevel?: string;
  costHours?: number;
  costMins?: number;
  content: string;
  nextFollowTime?: string;
  attachments?: Attachment[];
  creator: string;
}

/** 流转记录构建入参 */
export interface TransferRecordInput {
  leadId: string;
  operator: string;
  action: LeadAction;
  toOwner: string;
  status: string;
  reason?: string;
  createdAt: string;
}

let leadSeq = 1000;

/** 生成线索 ID（mock 用；β 端由服务端生成） */
export function generateLeadId(): string {
  leadSeq += 1;
  return `L${leadSeq}`;
}

/** 生成线索编号。沿用既有「纯数字 id」风格，B2 阶段 id 即展示编号 */
export function generateLeadNo(seed: number): string {
  return String(seed + 1);
}

/** 本地时间（YYYY-MM-DD HH:mm）。β 端 updatedAt 由服务端时钟覆盖 */
export function nowString(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ── 可操作性规则（PRD-线索管理 §4/§5：只能操作对应池子允许的动作）──

/** 公海线索可认领 */
export function canClaimLead(lead: LeadListItem): boolean {
  return lead.clueType === 'public';
}

/** 公海线索或已分配（非垃圾）可分配/转给他人 */
export function canAssignLead(lead: LeadListItem): boolean {
  if (lead.clueType === 'trash') return false;
  return lead.clueType === 'public' || lead.clueType === 'assigned';
}

/** 已分配未成交可退回公海；垃圾线索可退出垃圾池 */
export function canReturnLead(lead: LeadListItem): boolean {
  if (lead.clueType === 'trash') return true;
  if (lead.clueType !== 'assigned') return false;
  return lead.status !== '已签单' && lead.status !== '已终止';
}

// ── 创建 ──

export function applyCreateLead(input: LeadCreateInput, newId: string): LeadListItem {
  const t = nowString();
  return {
    key: newId,
    id: newId,
    name: input.name,
    customer: input.customer ?? '',
    contact: input.contact,
    phone: input.phone,
    wechat: input.wechat ?? '',
    source: input.source,
    keyword: input.keyword ?? '',
    status: '未联系',
    clueType: 'public',
    level: input.level ?? '中',
    customerLevel: input.customerLevel ?? 'B',
    tags: input.tags ?? [],
    entity: input.entity,
    owner: input.owner ?? '',
    optimizer: input.optimizer ?? '',
    assistant: input.assistant ?? '',
    createTime: t,
    lastFollowTime: '',
    lastFollowContent: '',
    nextFollowTime: '',
    followCount: 0,
    daysHeld: 0,
    trashCount: 0,
    transformStatus: false,
    isOverdue: false,
    remark: input.initialRequirement ?? '',
    attachments: input.attachments ?? [],
  };
}

/** 公海认领：回「我的线索」并记录认领时间 */
export function applyClaimLead(lead: LeadListItem, operator: string): LeadListItem {
  return {
    ...lead,
    clueType: 'assigned',
    owner: operator,
    optimizer: operator,
    claimTime: nowString(),
    lastFollowTime: '',
  };
}

/** 分配/转让：设置归属并更新池子 */
export function applyAssignLead(lead: LeadListItem, toOwner: string, operator: string, reason?: string): LeadListItem {
  return {
    ...lead,
    clueType: 'assigned',
    owner: toOwner,
    claimTime: lead.claimTime || nowString(),
  };
}

/**
 * 退回公海：trashCount +1；第 3 次退回自动标记垃圾（PRD：3 次退回自动进垃圾）。
 * 已分配 → 公海；垃圾池退出 → 公海（不累计 trashCount）。
 */
export function applyReturnLead(lead: LeadListItem, operator: string, reason?: string): LeadListItem {
  if (lead.clueType === 'trash') {
    return { ...lead, clueType: 'public', owner: '' };
  }
  const nextCount = (lead.trashCount ?? 0) + 1;
  if (nextCount >= 3) {
    return {
      ...lead,
      clueType: 'trash',
      trashCount: nextCount,
      trashReason: reason ?? '第3次退回自动标记垃圾',
      owner: '',
    };
  }
  return { ...lead, clueType: 'public', trashCount: nextCount, owner: '' };
}

/** 标记垃圾：带原因、移除归属 */
export function applyMarkTrash(lead: LeadListItem, operator: string, reason: string): LeadListItem {
  return { ...lead, clueType: 'trash', trashReason: reason, owner: '' };
}

/** 软删除：不物理移除，只打删除标记（B2 保留 for 追溯） */
export function applySoftDelete(lead: LeadListItem): LeadListItem {
  return { ...lead, deleted: true };
}

/** 转客户：成交后置位（详情按 PRD 从线索转项目详情入口） */
export function applyTransformToCustomer(lead: LeadListItem): LeadListItem {
  return { ...lead, transformStatus: true };
}

/**
 * 写跟进记录：同步客户状态/等级，更新最后跟进与下次跟进时间，跟进次数 +1。
 * 返回更新后的线索与新增的记录，由服务负责入列。
 */
export function applyAddFollowUp(
  lead: LeadListItem,
  _records: FollowUpRecord[],
  input: FollowUpInput,
): { lead: LeadListItem; record: FollowUpRecord } {
  const t = nowString();
  const record: FollowUpRecord = {
    id: `fu-${lead.id}-${t.replace(/[-: ]/g, '')}`,
    leadId: lead.id,
    method: input.method,
    customerStatus: input.customerStatus,
    customerLevel: input.customerLevel,
    content: input.content,
    nextFollowTime: input.nextFollowTime,
    costHours: input.costHours,
    costMins: input.costMins,
    attachments: input.attachments ?? [],
    creator: input.creator,
    createdAt: t,
    updatedAt: t,
    followupStatus: 'pending',
  };
  const updated: LeadListItem = {
    ...lead,
    status: input.customerStatus,
    customerLevel: input.customerLevel ?? lead.customerLevel,
    level: input.intentionLevel ?? lead.level,
    lastFollowTime: t,
    lastFollowContent: input.content,
    nextFollowTime: input.nextFollowTime ?? '',
    followCount: (lead.followCount ?? 0) + 1,
    isOverdue: false,
  };
  return { lead: updated, record };
}

/** 构建流转记录（转入/转出留痕，PRD §8.4） */
export function buildTransferRecord(input: TransferRecordInput) {
  return {
    id: `tr-${input.leadId}-${input.createdAt.replace(/[-: ]/g, '')}`,
    leadId: input.leadId,
    operator: input.operator,
    action: input.action,
    toOwner: input.toOwner,
    status: input.status,
    reason: input.reason ?? '',
    createdAt: input.createdAt,
  };
}

// ── 派发域纯函数（β 阶段 2；事件 id/时间由调用方传入：mock 本地生成，服务端用服务端时钟）──

/** 客户等级序（S 最高）：用于判断升级/降级 */
const LEVEL_RANK: Record<string, number> = { S: 4, A: 3, B: 2, C: 1 };

/** 升级 = 目标等级序更高（升级免审直接生效，降级走审批，PRD-线索派发 §等级调整） */
export function isLevelUpgrade(from: string, to: string): boolean {
  return (LEVEL_RANK[to] ?? 0) > (LEVEL_RANK[from] ?? 0);
}

/** 派发入参 */
export interface DispatchInput {
  target: DispatchTarget;
  /** target=sales 时必填 */
  assignee?: string;
  reason?: string;
}

/**
 * 派发：销售 -> 指派（assigned + owner + 流转记录）；公海 -> 回公海池待领取。
 * 均写 dispatchedAt/dispatchTarget 与对应事件（事件只增不删，ADR-0096）。
 */
export function applyDispatchLead(
  lead: LeadListItem,
  input: DispatchInput,
  actor: string,
  now: string,
  eventId: string,
): { lead: LeadListItem; transfer: ReturnType<typeof buildTransferRecord> | null } {
  const event: LeadEvent =
    input.target === 'sales'
      ? { id: eventId, leadId: lead.id, kind: 'dispatch_to_sales', actor, at: now, dispatchTarget: 'sales', assignee: input.assignee, note: input.reason }
      : { id: eventId, leadId: lead.id, kind: 'dispatch_to_pool', actor, at: now, dispatchTarget: 'pool', note: input.reason };

  const events = [...(lead.leadEvents ?? []), event];

  if (input.target === 'sales') {
    const assigned: LeadListItem = {
      ...lead,
      clueType: 'assigned',
      owner: input.assignee ?? lead.owner,
      claimTime: lead.claimTime || now,
      dispatchedAt: now,
      dispatchTarget: 'sales',
      leadEvents: events,
    };
    const transfer = buildTransferRecord({
      leadId: lead.id,
      operator: actor,
      action: 'assign',
      toOwner: input.assignee ?? '',
      status: assigned.status,
      reason: input.reason ?? '派发工作台 · 派发',
      createdAt: now,
    });
    return { lead: assigned, transfer };
  }

  const pooled: LeadListItem = {
    ...lead,
    clueType: 'public',
    owner: '',
    dispatchedAt: now,
    dispatchTarget: 'pool',
    leadEvents: events,
  };
  return { lead: pooled, transfer: null };
}

/** 催办：只追加事件，不动池子/归属 */
export function applyUrge(lead: LeadListItem, actor: string, note: string, now: string, eventId: string): LeadListItem {
  const event: LeadEvent = { id: eventId, leadId: lead.id, kind: 'urge', actor, at: now, note };
  return { ...lead, leadEvents: [...(lead.leadEvents ?? []), event] };
}

/**
 * 等级调整：升级免审直接生效（customerLevel 同步）；降级只写事件进审核队列。
 */
export function applyLevelChange(
  lead: LeadListItem,
  from: CustomerLevel,
  to: CustomerLevel,
  actor: string,
  now: string,
  eventId: string,
): LeadListItem {
  const event: LeadEvent = { id: eventId, leadId: lead.id, kind: 'level_change', actor, at: now, levelFrom: from, levelTo: to };
  const upgraded = isLevelUpgrade(from, to);
  return {
    ...lead,
    customerLevel: upgraded ? to : lead.customerLevel,
    leadEvents: [...(lead.leadEvents ?? []), event],
  };
}

/** 质检确认（管理员）：追加 level_audit_result 事件，清除待质检状态 */
export function applyQualityConfirm(lead: LeadListItem, actor: string, note: string, now: string, eventId: string): LeadListItem {
  const event: LeadEvent = { id: eventId, leadId: lead.id, kind: 'level_audit_result', actor, at: now, note };
  return { ...lead, leadEvents: [...(lead.leadEvents ?? []), event] };
}

// ── 详情组装（β 阶段 2：服务端 /api/leads/:id/detail 与 mock 兜底共用）──

/**
 * 从列表项组装详情信息（迁移线索无 α 静态 profile 时的兜底）。
 * 字段口径与原 mock 兜底分支一致；富字段（报价历史/演示合同等）由页面层另行取。
 */
export function buildLeadDetailInfo(lead: LeadListItem): LeadDetailInfo {
  return {
    name: lead.name,
    customer: lead.customer,
    contact: lead.contact,
    phone: lead.phone,
    wechat: lead.wechat,
    source: lead.source,
    keyword: lead.keyword,
    tags: lead.tags,
    requirement: lead.remark ?? '',
    initialRequirement: lead.remark ?? lead.name,
    level: lead.level,
    customerLevel: lead.customerLevel,
    status: lead.status,
    clueType: lead.clueType,
    transformStatus: lead.transformStatus,
    trashCount: lead.trashCount,
    trashReason: lead.trashReason,
    createTime: lead.createTime,
    updateTime: lead.createTime,
    claimTime: '',
    lastFollowTime: lead.lastFollowTime,
    nextFollowTime: lead.nextFollowTime,
    creator: lead.owner || lead.optimizer || '',
    owner: lead.owner,
    optimizer: lead.optimizer,
    assistant: lead.assistant,
    customerTitle: lead.contact,
    customerCost: '',
    entity: lead.entity,
    agent: lead.optimizer,
    presalesGroupName: lead.presalesGroupName,
    prototypeLink: lead.prototypeLink,
    followCount: lead.followCount,
    daysHeld: lead.daysHeld,
    attachments: lead.attachments ?? [],
  };
}
