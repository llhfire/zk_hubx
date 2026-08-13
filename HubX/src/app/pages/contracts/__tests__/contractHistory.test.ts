import { describe, expect, it } from 'vitest';
import {
  buildContractHistoryEvents,
  getContractApprovalRounds,
} from '../contractHistory';
import { buildInitialContracts } from '../mockData';
import type { Contract } from '../types';

describe('contractHistory', () => {
  it('infers an approval round for legacy contract data', () => {
    const contract = buildInitialContracts()[0];
    const rounds = getContractApprovalRounds(contract);

    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toMatchObject({
      roundNo: 1,
      versionNo: 'V2',
      status: 'approved',
      updatedAt: '2026-03-14 11:00',
    });
  });

  it('sorts contract versions and approval rounds by latest activity first', () => {
    const baseContract = buildInitialContracts()[0];
    const contract: Contract = {
      ...baseContract,
      approvalRounds: [
        {
          id: 'round-1',
          roundNo: 1,
          versionNo: 'V1',
          status: 'rejected',
          submittedAt: '2026-03-10 12:00',
          submittedBy: '张三',
          updatedAt: '2026-03-11 09:00',
          nodes: baseContract.approvalFlow,
        },
        {
          id: 'round-2',
          roundNo: 2,
          versionNo: 'V2',
          status: 'approved',
          submittedAt: '2026-03-12 16:30',
          submittedBy: '张三',
          updatedAt: '2026-03-14 11:00',
          nodes: baseContract.approvalFlow,
        },
      ],
    };

    const events = buildContractHistoryEvents(contract);

    expect(events.map(event => event.id)).toEqual([
      'round-2',
      `${contract.id}-version-V2`,
      'round-1',
      `${contract.id}-version-V1`,
    ]);
  });
});
