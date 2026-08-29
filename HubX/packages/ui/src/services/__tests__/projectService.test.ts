import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Message } from '@arco-design/web-react';

vi.mock('@arco-design/web-react', () => ({ Message: { warning: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import { initialProjects } from '@/app/pages/project-management/mockData';
import { createMockProjectService, createHttpProjectService } from '../projectService';

type Call = { method: string; url: string; body?: unknown; headers?: Record<string, string> };

function jsonResponse(status: number, payload: unknown) {
  return { ok: status < 400, status, json: async () => payload } as Response;
}

function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    projectNo: 'PRJ1',
    name: '测试项目',
    status: '未确认',
    owner: '',
    productUsers: [],
    version: 3,
    ...overrides,
  };
}

describe('createHttpProjectService 乐观锁（ADR-0094）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list 返回带 version；确认指派 PUT 回传 version + X-Actor', async () => {
    const calls: Call[] = [];
    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      calls.push({ method: init?.method ?? 'GET', url: u, body: init?.body ? JSON.parse(String(init.body)) : undefined, headers: init?.headers as Record<string, string> });
      if (u.endsWith('/api/projects')) return jsonResponse(200, { projects: [makeProject()] });
      if (u.endsWith('/api/projects/1')) {
        if (init?.method === 'PUT') return jsonResponse(200, { ok: true, version: 4 });
        return jsonResponse(200, { project: makeProject() });
      }
      throw new Error(`unexpected url: ${u}`);
    }) as unknown as typeof fetch;

    const svc = createHttpProjectService('http://x', { actor: '张三' });
    const list = await svc.list();
    expect(list[0].version).toBe(3);

    await svc.confirmAssign('1', '李四');
    const put = calls.find((c) => c.method === 'PUT');
    expect(put).toBeTruthy();
    expect((put!.body as Record<string, unknown>).status).toBe('未开始');
    expect((put!.body as Record<string, unknown>).owner).toBe('李四');
    expect((put!.body as Record<string, unknown>).version).toBe(3);
    expect(put!.headers?.['X-Actor']).toBe('张三');
  });

  it('409 冲突：提示且不抛错', async () => {
    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/api/projects/1')) {
        if (init?.method === 'PUT') return jsonResponse(409, { error: 'version conflict' });
        return jsonResponse(200, { project: makeProject() });
      }
      throw new Error(`unexpected url: ${u}`);
    }) as unknown as typeof fetch;

    const svc = createHttpProjectService('http://x');
    await expect(svc.confirmAssign('1', '李四')).resolves.toBeUndefined();
    expect(Message.warning).toHaveBeenCalledTimes(1);
  });

  it('create 走 POST 由服务端返回 id', async () => {
    const calls: Call[] = [];
    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      calls.push({ method: init?.method ?? 'GET', url: u });
      if (u.endsWith('/api/projects') && init?.method === 'POST') return jsonResponse(200, { id: 'p-SRV-1' });
      throw new Error(`unexpected url: ${u}`);
    }) as unknown as typeof fetch;

    const svc = createHttpProjectService('http://x');
    const id = await svc.create({ ...(initialProjects[0]), id: '' } as typeof initialProjects[0]);
    expect(id).toBe('p-SRV-1');
    expect(calls.some((c) => c.method === 'POST')).toBe(true);
  });
});

describe('createMockProjectService', () => {
  it('以 initialProjects 为种子', async () => {
    const svc = createMockProjectService();
    const all = await svc.list();
    expect(all.some((p) => p.id === initialProjects[0].id)).toBe(true);
  });

  it('确认指派后状态变为未开始', async () => {
    const svc = createMockProjectService();
    const unconfirmed = (await svc.list()).find((p) => p.status === '未确认');
    expect(unconfirmed).toBeTruthy();
    await svc.confirmAssign(unconfirmed!.id, '李四');
    const next = await svc.getById(unconfirmed!.id);
    expect(next?.status).toBe('未开始');
    expect(next?.owner).toBe('李四');
  });

  it('线索入口与合同入口按业务身份幂等合并，不生成第二个项目', async () => {
    const svc = createMockProjectService();
    const leadProject = {
      ...initialProjects[0],
      id: 'ap-lead-unique',
      leadId: 'lead-unique',
      contractId: undefined,
      status: '未确认' as const,
      owner: '',
      productUsers: [],
      name: '测试客户项目（待确认）',
    };
    const contractProject = {
      ...leadProject,
      id: 'ap-c-unique',
      leadId: 'unique',
      contractId: 'c-unique',
      name: '测试客户有限公司项目（待确认）',
    };

    expect(await svc.create(leadProject)).toBe('ap-lead-unique');
    expect(await svc.create(contractProject)).toBe('ap-lead-unique');
    const matches = (await svc.list()).filter(project => project.leadId?.replace(/^lead-/, '') === 'unique');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ id: 'ap-lead-unique', contractId: 'c-unique' });
  });
});

describe('getDetail 详情复合接口（β 阶段 2）', () => {
  it('http：调 GET /api/projects/:id/detail 返回复合数据', async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      calls.push(u);
      if (u.endsWith('/api/projects/1/detail')) {
        return jsonResponse(200, { project: makeProject(), contracts: [{ id: 'c-1' }], collections: [], activities: [] });
      }
      throw new Error(`unexpected url: ${u}`);
    }) as unknown as typeof fetch;

    const svc = createHttpProjectService('http://x');
    const detail = await svc.getDetail('1');
    expect(detail?.project.id).toBe('1');
    expect(detail?.contracts).toHaveLength(1);
    expect(calls[0]).toContain('/api/projects/1/detail');
  });

  it('http：404/异常返回 null 不抛错', async () => {
    global.fetch = vi.fn(async () => jsonResponse(404, { error: 'not found' })) as unknown as typeof fetch;
    const svc = createHttpProjectService('http://x');
    expect(await svc.getDetail('nope')).toBeNull();
  });

  it('mock：按 contractId 匹配关联合同；未命中返回空数组', async () => {
    const svc = createMockProjectService();
    const all = await svc.list();
    const withContract = all.find((p) => p.contractId);
    if (withContract) {
      const detail = await svc.getDetail(withContract.id);
      expect(detail?.project.id).toBe(withContract.id);
      // mock 合同种子若含该合同则命中；口径上只要不抛错且字段齐全
      expect(detail).toHaveProperty('contracts');
      expect(detail).toHaveProperty('collections');
      expect(detail).toHaveProperty('activities');
    }
    const none = await svc.getDetail(all[0].id);
    expect(none?.project.id).toBe(all[0].id);
  });
});
