// 项目域数据访问服务（数据接缝，B4）。
// UI 只依赖本接口：
//  - α版：createMockProjectService() —— 内存，以 initialProjects 作种子
//  - β版：createHttpProjectService(baseUrl) —— 调 Workers /api/projects
// spawn 由 B3 Workers 在合同 PUT 时调用，前端 http 实现不暴露 spawn。
// 业务规则在 projectMutations.ts / caseUtils.ts，mock 与 http 共用。

import { Message } from '@arco-design/web-react';
import { initialProjects, type Project, type ProjectStatus } from '@/app/pages/project-management/mockData';
import {
  applyAdvanceStatus,
  applyConfirmAssign,
  applyReassignPm,
  generateProjectId,
} from './projectMutations';

export interface ProjectService {
  list(): Promise<Project[]>;
  getById(id: string | undefined): Promise<Project | undefined>;
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

    create: async (project) => {
      const id = project.id || generateProjectId();
      if (projects.some((p) => p.id === id)) return id;
      projects = [{ ...project, id }, ...projects];
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
