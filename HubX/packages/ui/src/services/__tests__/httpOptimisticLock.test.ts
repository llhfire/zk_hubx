// β 数据底座（ADR-0094）：http 服务乐观锁行为单测。
// 覆盖：GET 注入的 version 随 PUT 回传；409 冲突时提示且不抛错（Context refresh 拿最新）。
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@arco-design/web-react', () => ({ Message: { warning: vi.fn() } }));

import { Message } from '@arco-design/web-react';
import { createHttpQuotationService } from '../quotationService';
import type { Quote } from '@/app/pages/quotation/types';

function makeQuote(overrides: Partial<Quote> = {}): Quote & { version?: number } {
  return {
    id: 'q-test-1',
    quoteNo: 'QT-2026-1',
    version: 'v1.0',
    status: 'pending_quote',
    leadId: 'lead-1',
    basicInfo: {
      projectName: '并发测试项目',
      projectType: '企业展示',
      creatorName: '张产品',
      techEvaluatorName: '罗总',
      requirementDesc: '',
      customerName: '测试客户',
      customerContact: '',
      customerPhone: '',
      quoteValidityDays: 30,
    },
    featureList: [],
    endpointConfigs: [],
    salesAddedRoles: [],
    frontendConfig: { platforms: [] },
    backendConfig: { services: [], language: '' },
    travelOnsite: { enableTravel: false, travelSubtotal: 0, enableOnsite: false, onsiteSubtotal: 0 },
    otherCosts: [],
    auditNodes: [],
    stampNode: { stamperName: '黄海', status: 'LOCKED' },
    timeline: [],
    salesOwnerName: '张三',
    ccSalesNames: [],
    createdAt: '2026-08-21 10:00',
    updatedAt: '2026-08-21 10:00',
    ...overrides,
  } as Quote & { version?: number };
}

type Call = { method: string; url: string; body?: unknown; headers?: Record<string, string> };

function jsonResponse(status: number, payload: unknown) {
  return { ok: status < 400, status, json: async () => payload } as Response;
}

describe('createHttpQuotationService 乐观锁（ADR-0094）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET 拿到的 version 随 PUT 请求体回传', async () => {
    const calls: Call[] = [];
    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      calls.push({ method: init?.method ?? 'GET', url: u, body: init?.body ? JSON.parse(String(init.body)) : undefined, headers: init?.headers as Record<string, string> });
      if (u.endsWith('/api/quotes/q-test-1')) {
        if (init?.method === 'PUT') return jsonResponse(200, { ok: true, version: 4 });
        return jsonResponse(200, { quote: makeQuote({ version: 3 }) });
      }
      throw new Error(`unexpected url: ${u}`);
    }) as unknown as typeof fetch;

    const svc = createHttpQuotationService('http://x', { actor: '张三' });
    await svc.updateQuote('q-test-1', (q) => q);

    const put = calls.find((c) => c.method === 'PUT');
    expect(put).toBeTruthy();
    expect((put!.body as Record<string, unknown>).version).toBe(3);
    // X-Actor 随写请求上报
    expect(put!.headers?.['X-Actor']).toBe('张三');
    // 无冲突：不提示
    expect(Message.warning).not.toHaveBeenCalled();
  });

  it('409 冲突：提示用户且不抛错（写入被放弃，等 Context refresh 拉最新）', async () => {
    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/api/quotes/q-test-1')) {
        if (init?.method === 'PUT') return jsonResponse(409, { error: 'version conflict', currentVersion: 7 });
        return jsonResponse(200, { quote: makeQuote({ version: 3 }) });
      }
      throw new Error(`unexpected url: ${u}`);
    }) as unknown as typeof fetch;

    const svc = createHttpQuotationService('http://x');
    // 不抛错 = Context 的 refresh 照常执行，界面回到服务端最新状态
    await expect(svc.submitEval('q-test-1')).resolves.toBeUndefined();
    expect(Message.warning).toHaveBeenCalledTimes(1);
  });

  it('createNewVersion 冲突时返回原 id（防御分支：新版本未写成不能导航到空 id）', async () => {
    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (init?.method === 'PUT' && u.includes('/api/quotes/')) return jsonResponse(409, { error: 'version conflict' });
      if (u.endsWith('/api/quotes/q-test-1')) return jsonResponse(200, { quote: makeQuote({ version: 3 }) });
      throw new Error(`unexpected url: ${u}`);
    }) as unknown as typeof fetch;

    const svc = createHttpQuotationService('http://x');
    await expect(svc.createNewVersion('q-test-1')).resolves.toBe('q-test-1');
  });
});
