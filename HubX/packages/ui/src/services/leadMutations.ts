// 线索域操作纯函数（B2）。mock/http 服务共用，口径与 PRD-线索管理模块一致。
// 规则：8 态销售漏斗、退回第 3 次自动进垃圾、公海认领/分配、软删除、转客户、写跟进同步状态。
import type { LeadListItem, FollowUpRecord, LeadAction } from '@/app/pages/leads/types';

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
}

/** 跟进入参 */
export interface FollowUpInput {
  method: string;
  customerStatus: string;
  customerLevel?: string;
  content: string;
  nextFollowTime?: string;
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
    owner: '',
    optimizer: '',
    assistant: '',
    createTime: t,
    lastFollowTime: '',
    lastFollowContent: '',
    nextFollowTime: '',
    followCount: 0,
    daysHeld: 0,
    trashCount: 0,
    transformStatus: false,
    isOverdue: false,
    initialRequirement: input.initialRequirement,
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
    attachments: [],
    creator: input.creator,
    createdAt: t,
    updatedAt: t,
    followupStatus: 'pending',
  };
  const updated: LeadListItem = {
    ...lead,
    status: input.customerStatus,
    customerLevel: input.customerLevel ?? lead.customerLevel,
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