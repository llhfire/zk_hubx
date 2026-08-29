// 项目域数据访问服务（数据接缝，B4）。
// UI 只依赖本接口：
//  - α版：createMockProjectService() —— 内存，以 initialProjects 作种子
//  - β版：createHttpProjectService(baseUrl) —— 调 Workers /api/projects
// spawn 由 B3 Workers 在合同 PUT 时调用，前端 http 实现不暴露 spawn。
// 业务规则在 projectMutations.ts / caseUtils.ts，mock 与 http 共用。

import { Message } from '@arco-design/web-react';
import { initialProjects, type Project, type ProjectStatus } from '@/app/pages/project-management/mockData';
import { buildInitialContracts } from '@/app/pages/contracts/mockData';
import type { Contract } from '@/app/pages/contracts/types';
import type { CollectionLedgerEntry } from './collectionMutations';
import {
  applyAdvanceStatus,
  applyConfirmAssign,
  applyReassignPm,
  findSigningProject,
  generateProjectId,
  mergeSigningProject,
} from './projectMutations';

/** 项目详情复合数据（β 阶段 2：/api/projects/:id/detail） */
export interface ProjectDetail {
  project: Project;
  /** 关联合同（按 contractId / leadId 匹配） */
  contracts: Contract[];
  /** 项目实收记录 */
  collections: CollectionLedgerEntry[];
  /** 活动事件（doc 内嵌若有） */
  activities: unknown[];
}

export interface ProjectService {
  list(): Promise<Project[]>;
  getById(id: string | undefined): Promise<Project | undefined>;
  /** 详情复合数据（详情页 360 用；阶段 3 切换渲染） */
  getDetail(id: string | undefined): Promise<ProjectDetail | null>;
  /** 新建（内部项目 / α 签约桥 addProject）；id 可预分配（spawn 幂等） */
  create(project: Project): Promise<string>;
  updateProject(id: string, updater: (p: Project) => Project): Promise<void>;
  confirmAssign(id: string, productManager: string): Promise<void>;
  reassignPm(id: string, productManager: string): Promise<void>;
  advanceStatus(id: string, status: ProjectStatus): Promise<void>;
  remove(id: string): Promise<void>;
}

export function createMockProjectService(): ProjectService {
  let projects: Project[] = initialProjects.map((p) => ({ ...p }));

  function findOne(id: string | undefined) {
    return projects.find((p) => p.id === id);
  }

  function mapOne(id: string, fn: (p: Project) => Project) {
    projects = projects.map((p) => (p.id === id ? fn(p) : p));
  }

  return {
    list: async () => projects,
    getById: async (id) => findOne(id),

    getDetail: async (id) => {
      const project = findOne(id);
      if (!project) return null;
      // mock 组装与 Workers /api/projects/:id/detail 同口径：contractId/leadId 双路匹配合同
      const contracts = buildInitialContracts().filter(
        (ct) => ct.id === project.contractId || (project.leadId && ct.leadId === project.leadId),
      );
      return { project, contracts, collections: [], activities: [] };
    },

    create: async (project) => {
      const id = project.id || generateProjectId();
      const candidate = { ...project, id };
      const existing = findSigningProject(projects, candidate);
      if (existing) {
        projects = projects.map(current => (
          current.id === existing.id ? mergeSigningProject(current, candidate) : current
        ));
        return existing.id;
      }
      projects = [candidate, ...projects];
      return id;
    },

    updateProject: async (id, updater) => mapOne(id, updater),

    confirmAssign: async (id, productManager) => {
      const p = findOne(id);
      if (!p) return;
      mapOne(id, () => applyConfirmAssign(p, productManager));
    },

    reassignPm: async (id, productManager) => {
      const p = findOne(id);
      if (!p) return;
      mapOne(id, () => applyReassignPm(p, productManager));
    },

    advanceStatus: async (id, status) => {
      const p = findOne(id);
      if (!p) return;
      mapOne(id, () => applyAdvanceStatus(p, status));
    },

    remove: async (id) => {
      projects = projects.filter((p) => p.id !== id);
    },
  };
}

export function createHttpProjectService(baseUrl: string, opts?: { actor?: string }): ProjectService {
  const api = (p: string) => `${baseUrl}${p}`;

  async function getList(): Promise<Project[]> {
    const r = await fetch(api('/api/projects'));
    const d = (await r.json()) as { projects?: Array<Project & { version?: number }> };
    return d.projects ?? [];
  }

  async function getOne(id: string | undefined): Promise<(Project & { version?: number }) | undefined> {
    if (!id) return undefined;
    const r = await fetch(api(`/api/projects/${id}`));
    if (!r.ok) return undefined;
    const d = (await r.json()) as { project?: Project & { version?: number } };
    return d.project;
  }

  async function saveOne(project: Project): Promise<boolean> {
    const r = await fetch(api(`/api/projects/${project.id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(opts?.actor ? { 'X-Actor': opts.actor } : {}) },
      body: JSON.stringify(project),
    });
    if (r.status === 409) {
      Message.warning('数据已被他人修改，已刷新为最新内容，请重试本次操作');
      return false;
    }
    if (r.status === 400) {
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      Message.error(d.error || '项目状态不允许本次操作');
      return false;
    }
    return r.ok;
  }

  async function mutate(id: string, fn: (p: Project) => Project): Promise<void> {
    const project = await getOne(id);
    if (!project) return;
    await saveOne(fn(project));
  }

  return {
    list: getList,
    getById: async (id) => getOne(id),

    getDetail: async (id) => {
      if (!id) return null;
      try {
        const r = await fetch(api(`/api/projects/${id}/detail`));
        if (!r.ok) return null;
        const d = (await r.json()) as ProjectDetail;
        return d;
      } catch {
        return null;
      }
    },

    create: async (project) => {
      const r = await fetch(api('/api/projects'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(opts?.actor ? { 'X-Actor': opts.actor } : {}) },
        body: JSON.stringify(project),
      });
      if (!r.ok) return project.id || '';
      const d = (await r.json()) as { id?: string };
      return d.id ?? project.id ?? '';
    },

    updateProject: async (id, updater) => mutate(id, updater),
    confirmAssign: async (id, productManager) => mutate(id, (p) => applyConfirmAssign(p, productManager)),
    reassignPm: async (id, productManager) => mutate(id, (p) => applyReassignPm(p, productManager)),
    advanceStatus: async (id, status) => mutate(id, (p) => applyAdvanceStatus(p, status)),

    remove: async (id) => {
      await fetch(api(`/api/projects/${id}`), {
        method: 'DELETE',
        headers: { ...(opts?.actor ? { 'X-Actor': opts.actor } : {}) },
      });
    },
  };
}
