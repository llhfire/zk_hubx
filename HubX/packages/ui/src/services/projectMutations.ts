// 项目域状态迁移纯函数（B4）。mock / http / Workers 共用，禁止在页面里复制规则。
// spawn / startDelivery / shelve 已在 caseUtils.ts（B3 签约联动单源），此处只做列表侧操作：
// 确认指派、改指产品经理、状态推进。

import {
  confirmProject,
  reassignProductManager,
  canReassignProject,
  isSameLeadIdentity,
} from '../app/business-case/caseUtils';
import type { Project, ProjectStatus } from '../app/pages/project-management/mockData';

export const PROJECT_ADVANCE: Record<ProjectStatus, ProjectStatus[]> = {
  未确认: [], // 必须走 confirmAssign
  未开始: ['进行中', '搁置'],
  进行中: ['验收中', '延迟', '搁置', '催款中', '已完成'],
  验收中: ['催款中', '进行中', '已完成'],
  催款中: ['已完成', '验收中'],
  延迟: ['进行中', '搁置'],
  搁置: ['进行中', '未开始'],
  已完成: [],
};

export function generateProjectId(): string {
  return `p-${Date.now()}`;
}

/** 按项目 ID、线索身份或合同 ID 判断是否是同一笔交付项目。 */
export function findSigningProject(
  projects: Project[],
  candidate: Pick<Project, 'id' | 'leadId' | 'contractId'>,
): Project | undefined {
  return projects.find(project => (
    project.id === candidate.id
    || isSameLeadIdentity(project.leadId, candidate.leadId)
    || Boolean(project.contractId && candidate.contractId && project.contractId === candidate.contractId)
  ));
}

/**
 * 签约开启幂等合并：保留既有项目 ID/状态/人员，只补齐线索、合同和合同侧展示信息。
 */
export function mergeSigningProject(existing: Project, incoming: Project): Project {
  const bindContract = !existing.contractId && Boolean(incoming.contractId);
  return {
    ...existing,
    leadId: existing.leadId ?? incoming.leadId,
    contractId: existing.contractId ?? incoming.contractId,
    name: bindContract ? incoming.name : existing.name,
    entity: bindContract ? incoming.entity : existing.entity,
    latestProgress: bindContract ? incoming.latestProgress : existing.latestProgress,
    remark: bindContract ? incoming.remark : existing.remark,
  };
}

export function nowProjectString(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function canAdvanceStatus(from: ProjectStatus, to: ProjectStatus): boolean {
  if (from === to) return true;
  return (PROJECT_ADVANCE[from] ?? []).includes(to);
}

/** 未确认 → 未开始，必须指定产品经理 */
export function applyConfirmAssign(project: Project, productManager: string): Project {
  const next = confirmProject({ project, productManager });
  return {
    ...project,
    status: next.status,
    productUsers: next.productUsers,
    owner: next.owner,
    latestProgress: `已指派产品经理 ${next.owner}，等待交付启动。`,
  };
}

/** 管理员改指产品经理（未开始 / 进行中） */
export function applyReassignPm(project: Project, productManager: string, isAdmin = true): Project {
  if (!canReassignProject(project, { isAdmin })) {
    throw new Error('仅未开始或进行中的项目可由管理员改指产品经理');
  }
  const next = reassignProductManager(project, productManager);
  return {
    ...project,
    productUsers: next.productUsers,
    owner: next.owner,
    latestProgress: `已改指产品经理 ${next.owner}。`,
  };
}

export function applyAdvanceStatus(project: Project, status: ProjectStatus): Project {
  if (!canAdvanceStatus(project.status, status)) {
    throw new Error(`不允许从「${project.status}」推进到「${status}」`);
  }
  if (project.status === status) return project;
  return {
    ...project,
    status,
    latestProgress: `状态推进为「${status}」。`,
  };
}

/** 服务端 PUT 校验：未确认只能经确认指派变为未开始；其它推进走 PROJECT_ADVANCE */
export function validateProjectStatusWrite(
  oldStatus: string,
  newStatus: string,
  newOwner: string | undefined,
): string | null {
  if (oldStatus === newStatus) return null;
  if (oldStatus === '未确认') {
    if (newStatus !== '未开始') return '未确认项目只能确认指派为未开始';
    if (!String(newOwner ?? '').trim()) return '确认指派必须指定产品经理';
    return null;
  }
  if (!canAdvanceStatus(oldStatus as ProjectStatus, newStatus as ProjectStatus)) {
    return `不允许从「${oldStatus}」推进到「${newStatus}」`;
  }
  return null;
}
