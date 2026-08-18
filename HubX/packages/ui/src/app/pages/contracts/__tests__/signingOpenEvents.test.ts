import { describe, expect, it } from 'vitest';
import { diffContractEvents } from '../signingOpenEvents';
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

describe('diffContractEvents', () => {
  it('首帧（prev = null）→ created/approved 均空', () => {
    const next = [fakeContract('c1')];
    const events = diffContractEvents(null, next);
    expect(events.created).toEqual([]);
    expect(events.approved).toEqual([]);
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
    const prev = { 'c1': undefined };
    const events = diffContractEvents(prev, []);
    expect(events.created).toHaveLength(0);
    expect(events.approved).toHaveLength(0);
  });

  it('approvedAt undefined→有 且 status≠voided → 进 approved', () => {
    const prev = { 'c1': undefined };
    const next = [fakeContract('c1', { approvedAt: '2026-08-18 10:00' })];
    const events = diffContractEvents(prev, next);
    expect(events.approved).toHaveLength(1);
    expect(events.approved[0].id).toBe('c1');
  });

  it('voided 合同 approvedAt 首写 → 不进 approved', () => {
    const prev = { 'c1': undefined };
    const next = [fakeContract('c1', { status: 'voided', approvedAt: '2026-08-18 10:00' })];
    const events = diffContractEvents(prev, next);
    expect(events.approved).toHaveLength(0);
  });

  it('撤销审批（approvedAt 有→无）→ 无事件、不报错', () => {
    const prev = { 'c1': '2026-08-18 10:00' };
    const next = [fakeContract('c1')];
    const events = diffContractEvents(prev, next);
    expect(events.created).toHaveLength(0);
    expect(events.approved).toHaveLength(0);
  });

  it('同帧混合：A 新建 + B 批准 → 两个事件都出、互不影响', () => {
    const prev = { 'c-old': undefined };
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
});
