import { SIGNING_LEAD_STATUSES } from './types';
import type {
  BusinessCase,
  ContractRef,
  LeadProjectBanner,
  PresalesContractRecord,
  PresalesEvent,
  PresalesFollowRecord,
  PresalesQuoteRecord,
  UnconfirmedProject,
} from './types';
import type { Project } from '@/app/pages/project-management/mockData';

export type {
  BusinessCase,
  ContractRef,
  LeadProjectBanner,
  PresalesContractRecord,
  PresalesEvent,
  PresalesFollowRecord,
  PresalesQuoteRecord,
  UnconfirmedProject,
} from './types';

export function isActiveContract(contract: ContractRef): boolean {
  return contract.status !== 'voided';
}

export function hasEnteredSigning(leadStatus: string, contracts: ContractRef[]): boolean {
  if (leadStatus === '已终止') return false;
  if ((SIGNING_LEAD_STATUSES as readonly string[]).includes(leadStatus)) return true;
  return contracts.some(isActiveContract);
}

export function shouldSpawnUnconfirmedProject(input: {
  leadStatus: string;
  hasProject: boolean;
  contracts: ContractRef[];
}): boolean {
  if (input.hasProject) return false;
  return hasEnteredSigning(input.leadStatus, input.contracts);
}

/** 统一线索身份：`9` 与 `lead-9` 视为同一条线索。 */
export function normalizeLeadIdentity(leadId: string): string {
  return leadId.trim().replace(/^lead-/, '');
}

export function isSameLeadIdentity(left: string | undefined, right: string | undefined): boolean {
  if (!left || !right) return false;
  return normalizeLeadIdentity(left) === normalizeLeadIdentity(right);
}

/**
 * 未确认项目唯一 ID：有线索时以线索为稳定主键；无线索合同才回退合同 ID。
 * 这样“先洽谈、后建合同”不会生成第二个项目。
 */
export function unconfirmedProjectId(input: {
  leadId?: string;
  contractId?: string;
}): string {
  if (input.leadId) return `ap-lead-${normalizeLeadIdentity(input.leadId)}`;
  if (input.contractId) return `ap-${input.contractId}`;
  throw new Error('生成未确认项目 ID 至少需要线索 ID 或合同 ID');
}

/** 线索从非签约态进入合同洽谈/已签单时产生一次签约开启事件。 */
export function signingLeadTransitions(
  previous: Record<string, string> | null,
  leads: Array<{ id: string; status: string }>,
): Array<{ id: string; status: string }> {
  if (!previous) return [];
  return leads.filter(lead => (
    (SIGNING_LEAD_STATUSES as readonly string[]).includes(lead.status)
    && !(SIGNING_LEAD_STATUSES as readonly string[]).includes(previous[lead.id] ?? '')
  ));
}

export function spawnUnconfirmedProject(input: {
  caseId: string;
  leadId: string;
  projectId: string;
}): { case: BusinessCase; project: UnconfirmedProject } {
  return {
    case: {
      id: input.caseId,
      leadId: input.leadId,
      projectId: input.projectId,
      contractId: null,
      extraContractIds: [],
      quoteIds: [],
    },
    project: {
      id: input.projectId,
      leadId: input.leadId,
      status: '未确认',
      productUsers: [],
    },
  };
}

/**
 * 签约开启时生成完整的未确认项目实体。
 * 合同侧触发时 contract 可选传入（取客户名/签约主体）；
 * 线索侧触发时无合同，从 lead 取客户名。
 * 两条接线共用此函数，防止行为分叉。
 */
export function buildUnconfirmedProject(input: {
  lead?: { name?: string; id: string };
  contract?: { id: string; current: { customerName?: string; signingEntity?: string } };
  projectId: string;
  today: string;
}): Project {
  const customerName =
    input.contract?.current?.customerName || input.lead?.name || '签约客户';
  const entity = input.contract?.current?.signingEntity || '中科软艺';
  const hasContract = !!input.contract;

  return {
    id: input.projectId,
    projectNo: 'PRJ' + input.today.replace(/-/g, '') + String(input.projectId).slice(-3),
    name: customerName + '项目（待确认）',
    latestProgress: hasContract
      ? '主合同已创建，等待管理员确认并指派产品经理。'
      : '线索进入签约阶段，等待管理员确认并指派产品经理。',
    priority: '中',
    entity,
    status: '未确认',
    businessLine: '外包',
    salesUsers: [],
    owner: '',
    assistants: [],
    productUsers: [],
    uiUsers: [],
    frontendUsers: [],
    backendUsers: [],
    opsUsers: [],
    testUsers: [],
    legalUsers: [],
    progress: 0,
    startDate: '',
    expectedEndDate: '',
    remark: hasContract
      ? '签约开启自动生成，尚未确认。'
      : '签约开启自动生成，尚未确认。',
    attachments: [],
    leadId: input.lead?.id,
    contractId: input.contract?.id,
    createdAt: input.today + ' 00:00',
  };
}

export function confirmProject(input: {
  project: { status: string; productUsers: string[] };
  productManager: string;
}): { status: '未开始'; productUsers: string[]; owner: string } {
  if (input.project.status !== '未确认') {
    throw new Error('只有未确认项目才能确认指派');
  }
  const productManager = input.productManager.trim();
  if (!productManager) {
    throw new Error('请指定产品经理');
  }
  return {
    status: '未开始',
    productUsers: [productManager],
    owner: productManager,
  };
}

/** 「交付启动」对项目实体的补丁：状态进行中 + 关联合同 + 启动日期 */
export interface DeliveryStartPatch {
  status: '进行中';
  startDate: string;
  contractId: string;
  latestProgress: string;
}

/**
 * 阶段 3：主合同审批通过后的「交付启动」状态迁移。
 * 仅对「未开始」（已确认指派、等待合同）或「搁置」的项目生效；
 * 项目已绑定其他合同时不启动（避免一份合同拉起别人的项目）。
 */
export function startDelivery(input: {
  project: { status: string; contractId?: string | null };
  contractId: string;
  today: string;
}): DeliveryStartPatch | null {
  if (input.project.status !== '未开始' && input.project.status !== '搁置') return null;
  if (input.project.contractId && input.project.contractId !== input.contractId) return null;
  return {
    status: '进行中',
    startDate: input.today,
    contractId: input.contractId,
    latestProgress: '主合同审批通过，交付已启动，SOP 交付计划已生成。',
  };
}

/**
 * 退回线索：未确认，或未开始且无未作废主合同，可退回。
 * 有未作废主合同或进行中 → 拒绝。
 */
/** 主合同作废 → 项目搁置（U3）。仅进行中项目且绑定该合同时生效。 */
export function shelveProject(input: {
  project: { status: string; contractId?: string | null };
  contractId: string;
  reason?: string;
}): { status: '搁置'; latestProgress: string } | null {
  if (input.project.status !== '进行中') return null;
  if (input.project.contractId !== input.contractId) return null;
  return {
    status: '搁置',
    latestProgress: `主合同作废（${input.reason || '无原因'}），项目已搁置。日报与交付计划保留。`,
  };
}

export function canReturnToLead(
  project: { status: string },
  contracts: ContractRef[],
): { allowed: boolean; reason?: string } {
  if (project.status === '未确认') return { allowed: true };
  if (project.status === '未开始') {
    const hasActiveContract = contracts.some(isActiveContract);
    if (hasActiveContract) {
      return { allowed: false, reason: '存在未作废主合同，不能退回线索' };
    }
    return { allowed: true };
  }
  return { allowed: false, reason: `项目状态为「${project.status}」，不能退回线索` };
}

export function isVisibleToProductManager(
  project: { status: string; productUsers: string[] },
  productManager: string,
): boolean {
  if (project.status === '未确认') return false;
  return project.productUsers.includes(productManager);
}

export function filterProjectsForViewer<T extends { status: string; productUsers: string[] }>(
  projects: T[],
  viewer: { isAdmin: boolean; viewerName: string },
): T[] {
  if (viewer.isAdmin) return projects;
  return projects.filter((project) => isVisibleToProductManager(project, viewer.viewerName));
}

/** U5：管理员可改指产品经理（仅未开始/进行中） */
export function canReassignProject(
  project: { status: string },
  viewer: { isAdmin: boolean },
): boolean {
  return viewer.isAdmin && (project.status === '未开始' || project.status === '进行中');
}

/** U5：改指产品经理，owner 联动 */
export function reassignProductManager(
  project: { productUsers: string[]; owner: string },
  pm: string,
): { productUsers: string[]; owner: string } {
  const trimmed = pm.trim();
  if (!trimmed) throw new Error('请指定产品经理');
  return { productUsers: [trimmed], owner: trimmed };
}

/** U5：线索客户 ≠ 合同甲方 → 黄灯 */
export function customerPartyMismatch(
  leadCustomer: string | undefined,
  contractParty: string | undefined,
): boolean {
  const a = (leadCustomer ?? '').trim();
  const b = (contractParty ?? '').trim();
  if (!a || !b) return false;
  return a !== b;
}

/** U6：内部项目判定（无线索、无客户、无合同） */
export function isInternalProject(project: { leadId?: string; contractId?: string }): boolean {
  return !project.leadId && !project.contractId;
}

/** U6：内部项目预算告警豁免 */
export function projectBudgetAlert(
  project: { leadId?: string; contractId?: string },
  _metrics?: { marginRate?: number },
): 'none' | 'warning' | 'danger' {
  if (isInternalProject(project)) return 'none';
  // 外部项目沿用现阈值（此处简化，实际由调用方判断）
  return 'none';
}

export function leadProjectBanner(
  project: { status: string; productUsers: string[] } | null,
): LeadProjectBanner {
  if (!project) return 'none';
  if (project.status === '未确认') return 'pending_confirm';
  if (project.status === '未开始' || project.status === '搁置') return 'assigned';
  return 'in_execution';
}

/** 时间统一按前 16 位（YYYY-MM-DD HH:mm）比较，容忍 mock 里带秒的格式 */
function presalesTimeKey(time: string): string {
  return (time || '').slice(0, 16);
}

/**
 * 汇总售前历程时间线：线索创建 + 售前跟进 + 报价 + 合同，按时间倒序。
 * 项目详情「售前历程」Tab 的数据口径（只读聚合，不提供删改）。
 */
export function buildPresalesTimeline(input: {
  lead: { id: string; name?: string; createTime?: string; requirement?: string };
  followUps: PresalesFollowRecord[];
  quotes: PresalesQuoteRecord[];
  contracts: PresalesContractRecord[];
}): PresalesEvent[] {
  const events: PresalesEvent[] = [];

  if (input.lead.createTime) {
    events.push({
      id: 'presales-lead-' + input.lead.id,
      time: input.lead.createTime,
      type: 'lead',
      title: '线索创建',
      detail: input.lead.requirement || input.lead.name,
      status: input.lead.name,
    });
  }

  input.followUps.forEach((follow) => {
    events.push({
      id: 'presales-follow-' + follow.id,
      time: follow.time,
      type: 'follow',
      title: '售前跟进 · ' + follow.method,
      detail: follow.content,
      status: follow.operator,
    });
  });

  input.quotes.forEach((quote) => {
    events.push({
      id: 'presales-quote-' + quote.id,
      time: quote.createTime,
      type: 'quote',
      title: quote.name,
      detail: quote.amount ? '报价金额 ¥' + quote.amount : undefined,
      status: quote.flowStatus || quote.status,
    });
  });

  input.contracts.forEach((contract) => {
    if (!contract.createTime) return;
    events.push({
      id: 'presales-contract-' + contract.id,
      time: contract.createTime,
      type: 'contract',
      title: contract.contractNo ? '合同 ' + contract.contractNo : '合同创建',
      status: contract.status,
    });
  });

  return events.sort((left, right) => presalesTimeKey(right.time).localeCompare(presalesTimeKey(left.time)));
}
