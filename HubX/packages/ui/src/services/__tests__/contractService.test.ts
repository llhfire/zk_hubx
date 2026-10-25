import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@arco-design/web-react', () => ({ Message: { warning: vi.fn() } }));

import { buildInitialContracts } from '../../app/pages/sales/contracts/mockData';
import type { CollectionRecord } from '../../app/pages/sales/contracts/types';
import { registerMainPaymentDualWrite } from '../collectionMutations';
import { createHttpContractService, createMockContractService } from '../contractService';

type Call = { method: string; url: string; body?: unknown };

function jsonResponse(status: number, payload: unknown) {
  return { ok: status < 400, status, json: async () => payload } as Response;
}

function paymentRecord(): Omit<CollectionRecord, 'id' | 'contractId'> {
  return { amount: 100, date: '2026-08-28', method: '银行转账', note: '测试回款' };
}

describe('createHttpContractService addCollection 双写保护', () => {
  const contract = { ...buildInitialContracts()[0], version: 3 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PUT 409 → addCollection 返回 false，双写状态为 contract-failed 且不写台账', async () => {
    const addToLedger = vi.fn(async () => 'ledger-id');
    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      if (String(url).endsWith('/api/contracts/1')) {
        if (init?.method === 'PUT') return jsonResponse(409, { error: 'version conflict' });
        return jsonResponse(200, { contract });
      }
      throw new Error(`unexpected url: ${String(url)}`);
    }) as unknown as typeof fetch;

    const svc = createHttpContractService('http://x');
    expect(await svc.addCollection('1', paymentRecord())).toBe(false);
    const result = await registerMainPaymentDualWrite({
      contractId: '1',
      record: paymentRecord(),
      addToContract: svc.addCollection,
      addToLedger,
    });

    expect(result.status).toBe('contract-failed');
    expect(addToLedger).not.toHaveBeenCalled();
  });

  it('合同 GET 404 → addCollection 返回 false，双写状态为 contract-failed 且不写台账', async () => {
    const addToLedger = vi.fn(async () => 'ledger-id');
    global.fetch = vi.fn(async () => jsonResponse(404, { error: 'not found' })) as unknown as typeof fetch;

    const svc = createHttpContractService('http://x');
    expect(await svc.addCollection('missing', paymentRecord())).toBe(false);
    const result = await registerMainPaymentDualWrite({
      contractId: 'missing',
      record: paymentRecord(),
      addToContract: svc.addCollection,
      addToLedger,
    });

    expect(result.status).toBe('contract-failed');
    expect(addToLedger).not.toHaveBeenCalled();
  });

  it('PUT 500 → addCollection 返回 false，双写状态为 contract-failed 且不写台账', async () => {
    const addToLedger = vi.fn(async () => 'ledger-id');
    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      if (String(url).endsWith('/api/contracts/1')) {
        if (init?.method === 'PUT') return jsonResponse(500, { error: 'server error' });
        return jsonResponse(200, { contract });
      }
      throw new Error(`unexpected url: ${String(url)}`);
    }) as unknown as typeof fetch;

    const svc = createHttpContractService('http://x');
    expect(await svc.addCollection('1', paymentRecord())).toBe(false);
    const result = await registerMainPaymentDualWrite({
      contractId: '1',
      record: paymentRecord(),
      addToContract: svc.addCollection,
      addToLedger,
    });

    expect(result.status).toBe('contract-failed');
    expect(addToLedger).not.toHaveBeenCalled();
  });

  it('成功 → addCollection 返回 true，PUT 含新 collectionRecord，台账使用相同 id', async () => {
    const calls: Call[] = [];
    let ledgerEntry: { id?: string } | undefined;
    global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const call: Call = { method: init?.method ?? 'GET', url: String(url) };
      if (init?.body) call.body = JSON.parse(String(init.body));
      calls.push(call);
      if (String(url).endsWith('/api/contracts/1')) {
        if (init?.method === 'PUT') return jsonResponse(200, { ok: true, version: 4 });
        return jsonResponse(200, { contract });
      }
      throw new Error(`unexpected url: ${String(url)}`);
    }) as unknown as typeof fetch;

    const svc = createHttpContractService('http://x');
    const result = await registerMainPaymentDualWrite({
      contractId: '1',
      projectId: 'project-1',
      record: paymentRecord(),
      addToContract: svc.addCollection,
      addToLedger: async (entry) => {
        ledgerEntry = entry;
        return entry.id!;
      },
    });

    expect(result.status).toBe('ok');
    const put = calls.find((call) => call.method === 'PUT');
    expect(put).toBeTruthy();
    const body = put!.body as { collectionRecords?: CollectionRecord[] };
    const contractRecord = body.collectionRecords?.find((record) => record.id === result.collectionId);
    expect(contractRecord).toMatchObject({ id: result.collectionId, contractId: '1', amount: 100 });
    expect(ledgerEntry?.id).toBe(contractRecord?.id);
  });
});

describe('createMockContractService addCollection', () => {
  it('合同 id 不存在 → 返回 false，list() 不变', async () => {
    const svc = createMockContractService();
    const before = await svc.list();

    expect(await svc.addCollection('missing-contract', paymentRecord())).toBe(false);

    expect(await svc.list()).toEqual(before);
  });
});
