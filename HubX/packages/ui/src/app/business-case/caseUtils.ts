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
