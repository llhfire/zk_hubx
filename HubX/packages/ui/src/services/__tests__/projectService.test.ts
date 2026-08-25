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
});
