import { describe, expect, it } from 'vitest';
import { diffContractEvents, getSigningOpenBridgeIssue, prevSnapshotForWrite, shouldEnsureUnconfirmedProject, type ContractSnapshotEntry } from '../signingOpenEvents';

describe('getSigningOpenBridgeIssue', () => {
  it('正常签约联动保持静默，避免与业务操作 Toast 重复堆叠', () => {
    expect(getSigningOpenBridgeIssue('lead_project_created')).toBeNull();
    expect(getSigningOpenBridgeIssue('contract_project_created', 'HT-001')).toBeNull();
    expect(getSigningOpenBridgeIssue('contract_delivery_started', 'HT-001')).toBeNull();
    expect(getSigningOpenBridgeIssue('contract_waiting_assignment', 'HT-001')).toBeNull();
    expect(getSigningOpenBridgeIssue('contract_relation_updated', 'HT-001')).toBeNull();
  });

  it('只有阻断联动的异常返回一次可见提示', () => {
    expect(getSigningOpenBridgeIssue('contract_missing_project', 'HT-001'))
      .toBe('合同 HT-001 审批通过，但线索下无项目，请先创建项目');
  });
});
import type { Contract } from '../types';

function fakeContract(id: string, extra?: Partial<Contract>): Contract {
  return {
    id,
    contractNo: `ZKRY${id}`,
    leadId: 'lead-1',
    status: 'draft',
    current: { customerName: '测试客户', signingEntity: '中科软艺' },
    createdAt: '2026-08-18',
    ...extra,
  } as Contract;
}

describe('prevSnapshotForWrite', () => {
  it('old 为 null 时返回 {}（首次 INSERT 必须传 {} 才能进 created）', () => {
    const result = prevSnapshotForWrite('c1', null);
    expect(result).toEqual({});
  });

  it('old 存在时返回正确的快照', () => {
    const old: ContractSnapshotEntry = { approvedAt: '2026-08-18', status: 'draft' };
    const result = prevSnapshotForWrite('c1', old);
    expect(result).toEqual({ 'c1': { approvedAt: '2026-08-18', status: 'draft' } });
  });
});

describe('shouldEnsureUnconfirmedProject', () => {
  it('草稿、无项目、有 leadId → 应 spawn', () => {
    const result = shouldEnsureUnconfirmedProject(
      { approvedAt: undefined, status: 'draft', leadId: 'lead-1' },
      false,
    );
    expect(result).toBe(true);
  });

  it('已有项目 → 不应 spawn', () => {
    const result = shouldEnsureUnconfirmedProject(
      { approvedAt: undefined, status: 'draft', leadId: 'lead-1' },
      true,
    );
    expect(result).toBe(false);
  });

  it('无 leadId → 不应 spawn', () => {
    const result = shouldEnsureUnconfirmedProject(
      { approvedAt: undefined, status: 'draft', leadId: undefined },
      false,
    );
    expect(result).toBe(false);
  });

  it('已批准 → 不应 spawn', () => {
    const result = shouldEnsureUnconfirmedProject(
      { approvedAt: '2026-08-18', status: 'draft', leadId: 'lead-1' },
      false,
    );
    expect(result).toBe(false);
  });

  it('已作废 → 不应 spawn', () => {
    const result = shouldEnsureUnconfirmedProject(
      { approvedAt: undefined, status: 'voided', leadId: 'lead-1' },
      false,
    );
    expect(result).toBe(false);
  });
});

describe('diffContractEvents', () => {
  it('首帧（prev = null）→ created/approved/voided 均空', () => {
    const next = [fakeContract('c1')];
    const events = diffContractEvents(null, next);
    expect(events.created).toEqual([]);
    expect(events.approved).toEqual([]);
    expect(events.voided).toEqual([]);
  });

  it('新增非作废合同（草稿也算）→ 进 created', () => {
    const next = [fakeContract('c1'), fakeContract('c2', { status: 'archived' })];
    const events = diffContractEvents({}, next);
    expect(events.created).toHaveLength(2);
    expect(events.created.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('新增即已作废 → 不进 created', () => {
    const next = [fakeContract('c1', { status: 'voided' })];
    const events = diffContractEvents({}, next);
    expect(events.created).toHaveLength(0);
  });

  it('合同从快照消失 → 无事件', () => {
    const prev: Record<string, ContractSnapshotEntry> = {};
    const events = diffContractEvents(prev, []);
    expect(events.created).toHaveLength(0);
    expect(events.approved).toHaveLength(0);
    expect(events.voided).toHaveLength(0);
  });

  it('approvedAt undefined→有 且 status≠voided → 进 approved', () => {
    const prev: Record<string, ContractSnapshotEntry> = { 'c1': { status: 'draft' } };
    const next = [fakeContract('c1', { approvedAt: '2026-08-18 10:00' })];
    const events = diffContractEvents(prev, next);
    expect(events.approved).toHaveLength(1);
    expect(events.approved[0].id).toBe('c1');
  });

  it('voided 合同 approvedAt 首写 → 不进 approved', () => {
    const prev: Record<string, ContractSnapshotEntry> = { 'c1': { status: 'draft' } };
    const next = [fakeContract('c1', { status: 'voided', approvedAt: '2026-08-18 10:00' })];
    const events = diffContractEvents(prev, next);
    expect(events.approved).toHaveLength(0);
  });

  it('撤销审批（approvedAt 有→无）→ 无事件、不报错', () => {
    const prev: Record<string, ContractSnapshotEntry> = { 'c1': { approvedAt: '2026-08-18 10:00', status: 'approved' } };
    const next = [fakeContract('c1')];
    const events = diffContractEvents(prev, next);
    expect(events.created).toHaveLength(0);
    expect(events.approved).toHaveLength(0);
  });

  it('同帧混合：A 新建 + B 批准 → 两个事件都出、互不影响', () => {
    const prev: Record<string, ContractSnapshotEntry> = { 'c-old': { status: 'draft' } };
    const next = [
      fakeContract('c-new'),
      fakeContract('c-old', { approvedAt: '2026-08-18 10:00' }),
    ];
    const events = diffContractEvents(prev, next);
    expect(events.created).toHaveLength(1);
    expect(events.created[0].id).toBe('c-new');
    expect(events.approved).toHaveLength(1);
    expect(events.approved[0].id).toBe('c-old');
  });

  it('status 变为 voided → 进 voided 事件', () => {
    const prev: Record<string, ContractSnapshotEntry> = { 'c1': { status: 'archived' } };
    const next = [fakeContract('c1', { status: 'voided' })];
    const events = diffContractEvents(prev, next);
    expect(events.voided).toHaveLength(1);
    expect(events.voided[0].id).toBe('c1');
  });

  it('首帧 voided 不触发（防刷新误判）', () => {
    const next = [fakeContract('c1', { status: 'voided' })];
    const events = diffContractEvents(null, next);
    expect(events.voided).toHaveLength(0);
  });

  it('已是 voided 再看 → 不重复触发', () => {
    const prev: Record<string, ContractSnapshotEntry> = { 'c1': { status: 'voided' } };
    const next = [fakeContract('c1', { status: 'voided' })];
    const events = diffContractEvents(prev, next);
    expect(events.voided).toHaveLength(0);
  });
});
