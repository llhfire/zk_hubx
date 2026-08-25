// 回款实收台账服务（数据接缝，B4）。
// 期次计划仍读合同 paymentPlans；本服务只存实际到账款（collections 表）。
//  - α：createMockCollectionService() —— 从合同 mock 的 collectionRecords 抽种子
//  - β：createHttpCollectionService(baseUrl) —— /api/collections

import { Message } from '@arco-design/web-react';
import { buildInitialContracts } from '@/app/pages/contracts/mockData';
import {
  buildCollectionRecord,
  generateCollectionId,
  seedCollectionsFromContracts,
  type CollectionLedgerEntry,
} from './collectionMutations';

export interface CollectionService {
  list(): Promise<CollectionLedgerEntry[]>;
  listByContract(contractId: string): Promise<CollectionLedgerEntry[]>;
  add(input: Omit<CollectionLedgerEntry, 'id'> & { id?: string }): Promise<string>;
}

export function createMockCollectionService(): CollectionService {
  let records: CollectionLedgerEntry[] = seedCollectionsFromContracts(buildInitialContracts());

  return {
    list: async () => records,
    listByContract: async (contractId) => records.filter((r) => r.contractId === contractId),
    add: async (input) => {
      const rec = buildCollectionRecord({ ...input, id: input.id || generateCollectionId() });
      records = [rec, ...records];
      return rec.id;
    },
  };
}

export function createHttpCollectionService(baseUrl: string, opts?: { actor?: string }): CollectionService {
  const api = (p: string) => `${baseUrl}${p}`;

  async function getList(): Promise<CollectionLedgerEntry[]> {
    const r = await fetch(api('/api/collections'));
    const d = (await r.json()) as { collections?: CollectionLedgerEntry[] };
    return d.collections ?? [];
  }

  return {
    list: getList,
    listByContract: async (contractId) => {
      const r = await fetch(api(`/api/collections?contractId=${encodeURIComponent(contractId)}`));
      const d = (await r.json()) as { collections?: CollectionLedgerEntry[] };
      return d.collections ?? [];
    },
    add: async (input) => {
      const r = await fetch(api('/api/collections'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(opts?.actor ? { 'X-Actor': opts.actor } : {}) },
        body: JSON.stringify(input),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        Message.error(d.error || '登记实收失败');
        return '';
      }
      const d = (await r.json()) as { id?: string };
      return d.id ?? '';
    },
  };
}
