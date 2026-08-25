// 线索域 http 服务（B2）行为单测。
// 覆盖：list 注入 version；写操作回传 version 且 X-Actor 上报；409 提示且不抛错（Context refresh）；
//      create 走服务端生成 id；mock 实现领带规则（第3次退回自动垃圾）与 mockData 种子。
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Message } from '@arco-design/web-react';

vi.mock('@arco-design/web-react', () => ({ Message: { warning: vi.fn(), success: vi.fn() } }));

import type { LeadListItem } from '@/app/pages/leads/types';
import { createMockLeadService, createHttpLeadService, seedFallback } from '../leadService';
import { PUBLIC_LEADS, MY_LEADS } from '@/app/pages/leads/mockData';

type Call = { method: string; url: string; body?: unknown; headers?: Record<string, string> };

function jsonResponse(status: number, payload: unknown) {
  return { ok: status < 400, status, json: async () => payload } as Response;
}

function makeLead(overrides: Partial<LeadListItem> = {}): LeadListItem & { version?: number } {
  return {
    key: 'L1',
    id: '5940',
    name: '测试线索',
    customer: '测试公司',
    contact: '张经理',
    phone: '13800138000',
    wechat: '',
    source: '百度',
    keyword: '',
    status: '初步沟通',
    clueType: 'assigned',
    level: '高',
    customerLevel: 'S',
    tags: [],
    entity: '中科软齐',
    owner: '阎杨',
    optimizer: '乐炎',
    assistant: '',
    createTime: '2026-08-19 10:30',
    lastFollowTime: '2026-08-20 10:37',
    lastFollowContent: '',
    nextFollowTime: '2026-08-25 10:00',
    followCount: 1,
    daysHeld: 1,
    trashCount: 0,
    transformStatus: false,
    isOverdue: false,
    ...overrides,
  } as LeadListItem & { version?: number };
}

describe('createHttpLeadService 乐观锁（ADR-0094）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list 返回带 version 数据，领带操作 PUT 回传 version + X-Actor', async () => {
    const calls: Call[] = [];
    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      calls.push({ method: init?.method ?? 'GET', url: u, body: init?.body ? JSON.parse(String(init.body)) : undefined, headers: init?.headers as Record<string, string> });
      if (u.endsWith('/api/leads')) return jsonResponse(200, { leads: [makeLead({ version: 3 })] });
      if (u.endsWith('/api/leads/5940')) {
        if (init?.method === 'PUT') return jsonResponse(200, { ok: true, version: 4 });
        return jsonResponse(200, { lead: makeLead({ version: 3 }) });
      }
      throw new Error(`unexpected url: ${u}`);
    }) as unknown as typeof fetch;

    const svc = createHttpLeadService('http://x', { actor: '张三' });
    const list = await svc.list();
    expect(list[0].version).toBe(3);

    await svc.claimLead('5940', '张三');
    const put = calls.find((c) => c.method === 'PUT');
    expect(put).toBeTruthy();
    expect((put!.body as Record<string, unknown>).version).toBe(3);
    expect(put!.headers?.['X-Actor']).toBe('张三');
  });

  it('409 冲突：提示用户且不抛错（写入放弃，Context refresh 拉最新）', async () => {
    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/api/leads/5940')) {
        if (init?.method === 'PUT') return jsonResponse(409, { error: 'version conflict' });
        return jsonResponse(200, { lead: makeLead({ version: 3 }) });
      }
      throw new Error(`unexpected url: ${u}`);
    }) as unknown as typeof fetch;

    const svc = createHttpLeadService('http://x');
    await expect(svc.markTrash('5940', '张三', '虚假信息')).resolves.toBeUndefined();
    expect(Message.warning).toHaveBeenCalledTimes(1);
  });

  it('create 走 POST 由服务端返回 id，客户端不本地造 id', async () => {
    const calls: Call[] = [];
    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      calls.push({ method: init?.method ?? 'GET', url: u });
      if (u.endsWith('/api/leads')) {
        if (init?.method === 'POST') return jsonResponse(200, { id: 'L-SRV-1' });
        return jsonResponse(200, { leads: [] });
      }
      throw new Error(`unexpected url: ${u}`);
    }) as unknown as typeof fetch;

    const svc = createHttpLeadService('http://x');
    const id = await svc.createLead({ name: '新线索', contact: '李总', phone: '13900139000', source: '百度', entity: '中科软齐' });
    expect(id).toBe('L-SRV-1');
    expect(calls.some((c) => c.method === 'POST')).toBe(true);
  });
});

describe('createMockLeadService 种子与流转', () => {
  it('mock 实现以现有 mockData 作种子，list 返回五池数据', async () => {
    const svc = createMockLeadService();
    const all = await svc.list();
    expect(all.some((l) => l.id === PUBLIC_LEADS[0].id)).toBe(true);
    expect(all.some((l) => l.id === MY_LEADS[0].id)).toBe(true);
  });

  it('mock 认领：公海线索归属当前用户并改池子', async () => {
    const svc = createMockLeadService();
    await svc.claimLead(PUBLIC_LEADS[0].id, '张三');
    const all = await svc.list();
    const claimed = all.find((l) => l.id === PUBLIC_LEADS[0].id);
    expect(claimed?.clueType).toBe('assigned');
    expect(claimed?.owner).toBe('张三');
  });

  it('mock 三次退回进垃圾（PRD：第3次自动；公海不可直接退，中间经认领）', async () => {
    const svc = createMockLeadService();
    const trashLead = MY_LEADS[0]; // trashCount=0
    // 模拟真实流转：退回→公海 →认领回我的 →再退→认领→再退进垃圾
    await svc.returnLead(trashLead.id, '张三', '一次');
    await svc.claimLead(trashLead.id, '张三');
    await svc.returnLead(trashLead.id, '张三', '二次');
    await svc.claimLead(trashLead.id, '张三');
    await svc.returnLead(trashLead.id, '张三', '三次');
    const all = await svc.list();
    const back = all.find((l) => l.id === trashLead.id);
    expect(back?.trashCount).toBe(3);
    expect(back?.clueType).toBe('trash');
  });

  it('seedFallback 选择公海种子（getLeadDetailInfo 未命中时兜底）', () => {
    const fb = seedFallback('5940');
    expect(fb).not.toBeNull();
  });
});