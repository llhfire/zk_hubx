import { SIGNING_LEAD_STATUSES } from './types';
import type {
  BusinessCase,
  ContractRef,
  LeadProjectBanner,
  UnconfirmedProject,
} from './types';

export type { BusinessCase, ContractRef, LeadProjectBanner, UnconfirmedProject } from './types';

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
