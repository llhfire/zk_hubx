// 线索域数据访问服务（数据接缝，B2）。UI 只依赖本接口：
//  - α版（纯前端）：createMockLeadService() —— 内存，以现有线索 mockData 作种子
//  - β版（前后端）：createHttpLeadService(baseUrl) —— 调 Cloudflare Workers 的 /api/leads
// 业务逻辑（状态迁移/退回自动垃圾/操作规则）抽在 leadMutations.ts，mock 与 http 共用。

import { Message } from '@arco-design/web-react';
import {
  PUBLIC_LEADS,
  MY_LEADS,
  TRASH_LEADS,
  CLOSED_LEADS,
  FOLLOWUP_RECORDS,
  TRANSFER_RECORDS,
  getLeadDetailInfo,
  getTransferRecordsByLeadId,
} from '@/app/pages/leads/mockData';
import type {
  FollowUpRecord,
  LeadDetailInfo,
  LeadListItem,
  TransferRecord,
} from '@/app/pages/leads/types';
import {
  applyAddFollowUp,
  applyAssignLead,
  applyClaimLead,
  applyCreateLead,
  applyMarkTrash,
  applyReturnLead,
  applySoftDelete,
  applyTransformToCustomer,
  buildTransferRecord,
  canClaimLead,
  canReturnLead,
  nowString,
  type LeadCreateInput,
  type FollowUpInput,
} from './leadMutations';

export interface LeadService {
  /** 全部线索（含各池；UI 按 clueType 切片） */
  list(): Promise<LeadListItem[]>;
  getById(id: string | undefined): Promise<LeadListItem | undefined>;
  getDetailInfo(id: string | undefined): Promise<LeadDetailInfo | null>;
  getFollowUps(leadId: string): Promise<FollowUpRecord[]>;
  getTransferRecords(leadId: string): Promise<TransferRecord[]>;

  /** 新建公海线索；返回 id（mock 本地生成，http 服务端生成） */
  createLead(input: LeadCreateInput): Promise<string>;
  /** 认领（公海 → 我的） */
  claimLead(id: string, operator: string): Promise<void>;
  /** 分配/转让给他人 */
  assignLead(id: string, toOwner: string, operator: string, reason?: string): Promise<void>;
  /** 退回公海 / 第 3 次自动进垃圾 / 垃圾池退出 */
  returnLead(id: string, operator: string, reason?: string): Promise<void>;
  /** 标记垃圾 */
  markTrash(id: string, operator: string, reason: string): Promise<void>;
  /** 软删除 */
  softDelete(id: string): Promise<void>;
  /** 转客户 */
  transformToCustomer(id: string): Promise<void>;
  /** 写跟进记录（同步线索状态/等级/时间） */
  addFollowUp(id: string, input: FollowUpInput): Promise<void>;
  /** 更新字段（通用；编辑表单） */
  updateLead(id: string, updater: (lead: LeadListItem) => LeadListItem): Promise<void>;
}

/** 全部池子：公海 + 我的 + 垃圾 + 已成交（含种子内去重） */
function seedLeadsList(): LeadListItem[] {
  const seed = [...PUBLIC_LEADS, ...MY_LEADS, ...TRASH_LEADS, ...CLOSED_LEADS];
  return seed;
}

/** 下一个数字线索编号（沿用种子 '5944' 风格，避免冲突） */
function nextSeedLeadNo(list: LeadListItem[]): string {
  const nums = list.map((l) => Number(l.id)).filter((n) => Number.isFinite(n));
  return String((nums.length ? Math.max(...nums) : 5000) + 1);
}

/** 详情兜底：getLeadDetailInfo 未命中时取第一个同名线索（兼容 detail seed 不完全覆盖） */
export function seedFallback(leadId: string): LeadDetailInfo | null {
  return getLeadDetailInfo(leadId);
}

// ── Mock 实现：内存，种子来自现有 mockData ──
export function createMockLeadService(): LeadService {
  let leads: LeadListItem[] = seedLeadsList();
  let followUps: FollowUpRecord[] = FOLLOWUP_RECORDS;
  let transfers: TransferRecord[] = TRANSFER_RECORDS;

  function mapOne(id: string, fn: (l: LeadListItem) => LeadListItem) {
    leads = leads.map((l) => (l.id === id ? { ...fn(l), updateTime: nowString() } : l));
  }

  function findOne(id: string | undefined) {
    return leads.find((l) => l.id === id);
  }

  return {
    list: async () => leads,
    getById: async (id) => findOne(id),
    getDetailInfo: async (id) => {
      const detail = getLeadDetailInfo(id);
      if (detail) return detail;
      // 兜底：从列表切片（新增/流转的线索 detail 未在 seed 时用列表字段组装）
      const lead = leads.find((l) => l.id === id);
      if (!lead) return null;
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
        attachments: [],
      };
    },
    getFollowUps: async (leadId) => followUps.filter((r) => r.leadId === leadId),
    getTransferRecords: async (leadId) => transfers.filter((r) => r.leadId === leadId),

    createLead: async (input) => {
      // 新线索沿用种子的纯数字编号风格，取当前最大值 +1，返回的 id 与落库一致
      const no = nextSeedLeadNo(leads);
      const created = applyCreateLead(input, no);
      leads = [created, ...leads];
      return created.id;
    },

    claimLead: async (id, operator) => {
      const lead = findOne(id);
      if (!lead) return;
      if (!canClaimLead(lead)) return;
      mapOne(id, (l) => {
        const claimed = applyClaimLead(l, operator);
        transfers.push(buildTransferRecord({ leadId: l.id, operator, action: 'claim', toOwner: operator, status: claimed.status, reason: '', createdAt: nowString() }));
        return claimed;
      });
    },

    assignLead: async (id, toOwner, operator, reason) => {
      const lead = findOne(id);
      if (!lead) return;
      mapOne(id, (l) => {
        const assigned = applyAssignLead(l, toOwner, operator, reason);
        transfers.push(buildTransferRecord({ leadId: l.id, operator, action: 'assign', toOwner, status: assigned.status, reason, createdAt: nowString() }));
        return assigned;
      });
    },

    returnLead: async (id, operator, reason) => {
      const lead = findOne(id);
      if (!lead) return;
      if (!canReturnLead(lead)) return;
      mapOne(id, (l) => {
        const returned = applyReturnLead(l, operator, reason);
        transfers.push(buildTransferRecord({ leadId: l.id, operator, action: 'return', toOwner: '', status: returned.status, reason, createdAt: nowString() }));
        return returned;
      });
    },

    markTrash: async (id, operator, reason) =>
      mapOne(id, (l) => {
        const trashed = applyMarkTrash(l, operator, reason);
        transfers.push(buildTransferRecord({ leadId: l.id, operator, action: 'trash', toOwner: '', status: '垃圾线索', reason, createdAt: nowString() }));
        return trashed;
      }),

    softDelete: async (id) => mapOne(id, applySoftDelete),

    transformToCustomer: async (id) =>
      mapOne(id, (l) => {
        const transformed = applyTransformToCustomer(l);
        transfers.push(buildTransferRecord({ leadId: l.id, operator: l.owner, action: 'transform', toOwner: l.owner, status: transformed.status, reason: '客户签约', createdAt: nowString() }));
        return transformed;
      }),

    addFollowUp: async (id, input) => {
      const lead = findOne(id);
      if (!lead) return;
      const { lead: updated, record } = applyAddFollowUp(lead, followUps, input);
      followUps = [...followUps, record];
      mapOne(id, () => updated);
    },

    updateLead: async (id, updater) => mapOne(id, updater),
  };
}

// ── HTTP 实现：调 Workers /api/leads ──
export function createHttpLeadService(baseUrl: string, opts?: { actor?: string }): LeadService {
  const api = (p: string) => `${baseUrl}${p}`;

  async function getList(): Promise<LeadListItem[]> {
    const r = await fetch(api('/api/leads'));
    const d = (await r.json()) as { leads?: Array<LeadListItem & { version?: number }> };
    return d.leads ?? [];
  }

  async function getOne(id: string | undefined): Promise<(LeadListItem & { version?: number }) | undefined> {
    if (!id) return undefined;
    const r = await fetch(api(`/api/leads/${id}`));
    if (!r.ok) return undefined;
    const d = (await r.json()) as { lead?: LeadListItem & { version?: number } };
    return d.lead;
  }

  // 乐观锁（ADR-0094）：GET 版本随对象全程携带，PUT 比对；409 提示后放弃写入（Context refresh 拿最新）
  async function saveOne(lead: LeadListItem): Promise<boolean> {
    const r = await fetch(api(`/api/leads/${lead.id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(opts?.actor ? { 'X-Actor': opts.actor } : {}) },
      body: JSON.stringify(lead),
    });
    if (r.status === 409) {
      Message.warning('数据已被他人修改，已刷新为最新内容，请重试本次操作');
      return false;
    }
    return r.ok;
  }

  async function mutate(id: string, fn: (l: LeadListItem) => LeadListItem, onChange?: (l: LeadListItem, lb: LeadListItem) => void): Promise<void> {
    const lead = await getOne(id);
    if (!lead) return;
    const updated = fn(lead as LeadListItem);
    const saved = await saveOne(updated);
    if (saved) onChange?.(updated, lead as LeadListItem);
  }

  return {
    list: getList,
    getById: async (id) => getOne(id),
    getDetailInfo: async (id) => {
      // β：从列表取该线索精简字段 → detail 由服务端明细接口提供（当前缺省用种子兜底）
      const lead = await getOne(id);
      if (!lead) return null;
      return seedFallback(lead.id);
    },

    getFollowUps: async (leadId) => {
      const r = await fetch(api(`/api/leads/${leadId}/followups`));
      if (!r.ok) return [];
      const d = (await r.json()) as { followUps?: FollowUpRecord[] };
      return d.followUps ?? [];
    },
    getTransferRecords: async (leadId) => {
      const r = await fetch(api(`/api/leads/${leadId}/transfers`));
      if (!r.ok) return [];
      const d = (await r.json()) as { transfers?: TransferRecord[] };
      return d.transfers ?? [];
    },

    createLead: async (input) => {
      const r = await fetch(api('/api/leads'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(opts?.actor ? { 'X-Actor': opts.actor } : {}) },
        body: JSON.stringify(input),
      });
      if (!r.ok) return '';
      const d = (await r.json()) as { id?: string };
      return d.id ?? '';
    },

    claimLead: async (id, operator) => mutate(id, (l) => applyClaimLead(l, operator)),
    assignLead: async (id, toOwner, operator, reason) => mutate(id, (l) => applyAssignLead(l, toOwner, operator, reason)),
    returnLead: async (id, operator, reason) => mutate(id, (l) => applyReturnLead(l, operator, reason)),
    markTrash: async (id, operator, reason) => mutate(id, (l) => applyMarkTrash(l, operator, reason)),
    softDelete: async (id) => mutate(id, applySoftDelete),
    transformToCustomer: async (id) => mutate(id, applyTransformToCustomer),
    addFollowUp: async (id, input) => {
      // 写跟进要同时落跟进记录表：走服务端专门端点，由 Workers 写 leads 详情 + followups
      const r = await fetch(api(`/api/leads/${id}/followups`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(opts?.actor ? { 'X-Actor': opts.actor } : {}) },
        body: JSON.stringify(input),
      });
      if (r.status === 409) Message.warning('数据已被他人修改，已刷新为最新内容，请重试本次操作');
    },
    updateLead: async (id, updater) => mutate(id, updater),
  };
}