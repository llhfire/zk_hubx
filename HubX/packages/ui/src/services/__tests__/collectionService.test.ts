import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Message } from '@arco-design/web-react';

vi.mock('@arco-design/web-react', () => ({ Message: { warning: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import { buildInitialContracts } from '@/app/pages/contracts/mockData';
import { collectionsForProject, seedCollectionsFromContracts, sumReceived, registerMainPaymentDualWrite } from '../collectionMutations';
import { createMockCollectionService, createHttpCollectionService } from '../collectionService';

function jsonResponse(status: number, payload: unknown) {
  return { ok: status < 400, status, json: async () => payload } as Response;
}

describe('collectionMutations', () => {
  it('种子合同 id 覆盖嵌套 collectionRecords.contractId', () => {
    const seeded = seedCollectionsFromContracts(buildInitialContracts());
    expect(seeded.length).toBeGreaterThan(0);
    expect(seeded.every((r) => buildInitialContracts().some((c) => c.id === r.contractId))).toBe(true);
    expect(sumReceived(seeded)).toBeGreaterThan(0);
  });

  it('collectionsForProject 按合同 id 切片', () => {
    const seeded = seedCollectionsFromContracts(buildInitialContracts());
    const of1 = collectionsForProject(seeded, { contractIds: ['1'] });
    expect(of1.length).toBeGreaterThan(0);
    expect(of1.every((r) => r.contractId === '1')).toBe(true);
  });
});

describe('registerMainPaymentDualWrite', () => {
  it('两边成功 → { status: "ok", collectionId }', async () => {
    const result = await registerMainPaymentDualWrite({
      contractId: 'c1',
      projectId: 'p1',
      record: { amount: 100, date: '2026-08-22', method: '银行转账', note: '' },
      addToContract: async () => true,
      addToLedger: async () => 'col-1',
    });
    expect(result.status).toBe('ok');
    expect(result.collectionId).toMatch(/^col-/);
  });

  it('addToContract 返回 false → { status: "contract-failed" }，不调用 addToLedger', async () => {
    const addToLedger = vi.fn(async () => 'col-1');
    const result = await registerMainPaymentDualWrite({
      contractId: 'c1',
      record: { amount: 100, date: '2026-08-22', method: '银行转账', note: '' },
      addToContract: async () => false,
      addToLedger,
    });
    expect(result.status).toBe('contract-failed');
    expect(addToLedger).not.toHaveBeenCalled();
    expect(result.collectionId).toMatch(/^col-/);
  });

  it('addToLedger 返回空字符串 → { status: "ledger-failed" }', async () => {
    const result = await registerMainPaymentDualWrite({
      contractId: 'c1',
      record: { amount: 100, date: '2026-08-22', method: '银行转账', note: '' },
      addToContract: async () => true,
      addToLedger: async () => '',
    });
    expect(result.status).toBe('ledger-failed');
    expect(result.collectionId).toMatch(/^col-/);
  });

  it('两边传入的 id 相同', async () => {
    let contractId: string | undefined;
    let ledgerId: string | undefined;
    await registerMainPaymentDualWrite({
      contractId: 'c1',
      record: { amount: 100, date: '2026-08-22', method: '银行转账', note: '' },
      addToContract: async (_cid, r) => { contractId = r.id; return true; },
      addToLedger: async (r) => { ledgerId = r.id; return 'col-1'; },
    });
    expect(contractId).toBe(ledgerId);
  });

  it('无 projectId 时使用 ap-{contractId}', async () => {
    let capturedProjectId: string | undefined;
    await registerMainPaymentDualWrite({
      contractId: 'c1',
      record: { amount: 100, date: '2026-08-22', method: '银行转账', note: '' },
      addToContract: async () => true,
      addToLedger: async (r) => { capturedProjectId = r.projectId; return 'col-1'; },
    });
    expect(capturedProjectId).toBe('ap-c1');
  });
});

describe('createMockCollectionService', () => {
  it('list 含合同种子实收', async () => {
    const svc = createMockCollectionService();
    const all = await svc.list();
    expect(all.length).toBeGreaterThan(0);
    const added = await svc.add({ contractId: '1', amount: 100, date: '2026-08-22', method: '银行汇款', note: '测试' });
    expect(added).toMatch(/^col-/);
    const next = await svc.listByContract('1');
    expect(next.some((r) => r.id === added)).toBe(true);
  });
});

describe('createHttpCollectionService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('list / add 走 /api/collections，写请求带 X-Actor', async () => {
    const calls: Array<{ method: string; url: string; headers?: Record<string, string> }> = [];
    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      calls.push({ method: init?.method ?? 'GET', url: u, headers: init?.headers as Record<string, string> });
      if (u.includes('/api/collections') && init?.method === 'POST') return jsonResponse(200, { id: 'col-SRV-1' });
      if (u.includes('/api/collections')) return jsonResponse(200, { collections: [{ id: 'col-1', contractId: '1', amount: 100, date: '2026-04-14', method: '银行汇款', note: '' }] });
      throw new Error(`unexpected url: ${u}`);
    }) as unknown as typeof fetch;

    const svc = createHttpCollectionService('http://x', { actor: '财务' });
    const list = await svc.list();
    expect(list[0].id).toBe('col-1');
    const id = await svc.add({ contractId: '1', amount: 200, date: '2026-08-22', method: '银行汇款', note: '' });
    expect(id).toBe('col-SRV-1');
    const post = calls.find((c) => c.method === 'POST');
    expect(post?.headers?.['X-Actor']).toBe('财务');
  });
});
