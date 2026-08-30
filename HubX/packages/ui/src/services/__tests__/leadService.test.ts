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

  it('mock 新建线索保留附件，并可从详情读取', async () => {
    const svc = createMockLeadService();
    const attachment = { id: 'att-create', name: '需求说明.pdf', url: '/files/需求说明.pdf', size: 2048, type: 'application/pdf' };
    const id = await svc.createLead({
      name: '带附件线索',
      contact: '李总',
      phone: '13900139000',
      source: 'baidu',
      entity: '中科软齐',
      initialRequirement: '需要开发管理系统',
      attachments: [attachment],
    });

    expect((await svc.list()).find((lead) => lead.id === id)?.attachments).toEqual([attachment]);
    expect((await svc.getDetailInfo(id))?.attachments).toEqual([attachment]);
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

  it('mock 软删除后从普通线索列表隐藏', async () => {
    const svc = createMockLeadService();
    const target = MY_LEADS[0];

    await svc.softDelete(target.id);

    expect((await svc.list()).some((lead) => lead.id === target.id)).toBe(false);
  });

  it('seedFallback 返回当前采样线索详情', () => {
    const fb = seedFallback('5957');
    expect(fb).not.toBeNull();
  });
});

describe('派发域（β 阶段 2）http：走专门端点，事件服务端生成', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatchLead 调 POST /api/leads/:id/dispatch，带 target/assignee 与 X-Actor', async () => {
    const calls: Call[] = [];
    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      calls.push({ method: init?.method ?? 'GET', url: u, body: init?.body ? JSON.parse(String(init.body)) : undefined, headers: init?.headers as Record<string, string> });
      if (u.endsWith('/api/leads/5940/dispatch')) return jsonResponse(200, { ok: true });
      throw new Error(`unexpected url: ${u}`);
    }) as unknown as typeof fetch;

    const svc = createHttpLeadService('http://x', { actor: '张三' });
    await svc.dispatchLead('5940', { target: 'sales', assignee: '李四' }, '张三');
    const call = calls[0];
    expect(call.method).toBe('POST');
    expect(call.url).toContain('/api/leads/5940/dispatch');
    expect(call.body).toMatchObject({ target: 'sales', assignee: '李四' });
    expect(call.headers?.['X-Actor']).toBe('张三');
  });

  it('urgeLead / adjustLevel / confirmQuality 分别调对应端点', async () => {
    const urls: string[] = [];
    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      urls.push(`${init?.method ?? 'GET'} ${u}`);
      return jsonResponse(200, { ok: true });
    }) as unknown as typeof fetch;

    const svc = createHttpLeadService('http://x', { actor: '张三' });
    await svc.urgeLead('5940', '张三', '催办->李四');
    await svc.adjustLevel('5940', 'A', 'S', '张三');
    await svc.confirmQuality('5940', '管理员', '质检确认：3 人退回');
    expect(urls).toEqual([
      'POST http://x/api/leads/5940/urge',
      'POST http://x/api/leads/5940/level-change',
      'POST http://x/api/leads/5940/level-audit',
    ]);
  });

  it('getDetailInfo 优先取服务端 detail 接口', async () => {
    global.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith('/api/leads/5940')) return jsonResponse(200, { lead: makeLead() });
      if (u.endsWith('/api/leads/5940/detail')) {
        return jsonResponse(200, { detail: { name: '服务端组装详情', tags: [] } });
      }
      throw new Error(`unexpected url: ${u}`);
    }) as unknown as typeof fetch;

    const svc = createHttpLeadService('http://x');
    const detail = await svc.getDetailInfo('5940');
    expect(detail?.name).toBe('服务端组装详情');
  });

  it('detail 接口不可用时，本地按列表字段组装兜底（迁移线索不 404 白屏）', async () => {
    global.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith('/api/leads/5940')) return jsonResponse(200, { lead: makeLead() });
      if (u.endsWith('/api/leads/5940/detail')) return jsonResponse(404, { error: 'not found' });
      throw new Error(`unexpected url: ${u}`);
    }) as unknown as typeof fetch;

    const svc = createHttpLeadService('http://x');
    const detail = await svc.getDetailInfo('5940');
    expect(detail?.name).toBe('测试线索');
    expect(detail?.owner).toBe('阎杨');
    expect(detail?.requirement).toBe('');
  });
});

describe('createMockLeadService 派发域（与 Workers 端点同口径）', () => {
  it('dispatchLead sales：assigned + owner + dispatchedAt + 事件 + 流转记录', async () => {
    const svc = createMockLeadService();
    const target = PUBLIC_LEADS[0];
    await svc.dispatchLead(target.id, { target: 'sales', assignee: '李四' }, '张三');
    const all = await svc.list();
    const lead = all.find((l) => l.id === target.id);
    expect(lead?.clueType).toBe('assigned');
    expect(lead?.owner).toBe('李四');
    expect(lead?.dispatchTarget).toBe('sales');
    expect(lead?.dispatchedAt).toBeTruthy();
    expect(lead?.leadEvents?.some((e) => e.kind === 'dispatch_to_sales' && e.assignee === '李四')).toBe(true);
    const transfers = await svc.getTransferRecords(target.id);
    expect(transfers.some((t) => t.toOwner === '李四')).toBe(true);
  });

  it('dispatchLead pool：回公海、清空 owner', async () => {
    const svc = createMockLeadService();
    const target = MY_LEADS[0];
    await svc.dispatchLead(target.id, { target: 'pool' }, '张三');
    const all = await svc.list();
    const lead = all.find((l) => l.id === target.id);
    expect(lead?.clueType).toBe('public');
    expect(lead?.owner).toBe('');
    expect(lead?.leadEvents?.some((e) => e.kind === 'dispatch_to_pool')).toBe(true);
  });

  it('adjustLevel 升级直接生效；降级只写事件不动 customerLevel', async () => {
    const svc = createMockLeadService();
    const target = MY_LEADS[0];
    await svc.adjustLevel(target.id, 'C', 'A', '张三'); // 升级
    let lead = (await svc.list()).find((l) => l.id === target.id);
    expect(lead?.customerLevel).toBe('A');

    await svc.adjustLevel(target.id, 'A', 'C', '张三'); // 降级
    lead = (await svc.list()).find((l) => l.id === target.id);
    expect(lead?.customerLevel).toBe('A'); // 降级待审核，等级不变
    expect(lead?.leadEvents?.some((e) => e.kind === 'level_change' && e.levelTo === 'C')).toBe(true);
  });

  it('urgeLead / confirmQuality 追加对应事件', async () => {
    const svc = createMockLeadService();
    const target = MY_LEADS[0];
    await svc.urgeLead(target.id, '张三', '催办');
    await svc.confirmQuality(target.id, '管理员', '质检确认：3 人退回');
    const lead = (await svc.list()).find((l) => l.id === target.id);
    expect(lead?.leadEvents?.some((e) => e.kind === 'urge')).toBe(true);
    expect(lead?.leadEvents?.some((e) => e.kind === 'level_audit_result')).toBe(true);
  });
});
