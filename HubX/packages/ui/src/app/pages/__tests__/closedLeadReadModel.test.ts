import { describe, expect, it } from 'vitest';
import { seedCollectionsFromContracts } from '../../../services/collectionMutations';
import { buildClosedLeadRows } from '../closedLeadReadModel';
import { buildInitialContracts } from '../contracts/mockData';
import { CLOSED_LEADS } from '../leads/mockData';
import { initialProjects } from '../project-management/mockData';

describe('buildClosedLeadRows', () => {
  it('把已成交线索关联到真实合同、项目和实收台账', () => {
    const contracts = buildInitialContracts();
    const rows = buildClosedLeadRows({
      leads: CLOSED_LEADS,
      contracts,
      projects: initialProjects,
      collections: seedCollectionsFromContracts(contracts),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: '5900',
      contractId: '9',
      contractNo: 'HT202606009',
      contractAmount: 960_000,
      receivedAmount: 384_000,
      projectId: '3',
      projectName: '华信科技内部OA流程优化',
      projectStatus: '进行中',
      closedStatus: '已立项',
    });
  });

  it('没有共享事实时不回退到静态假合同', () => {
    const rows = buildClosedLeadRows({ leads: CLOSED_LEADS, contracts: [], projects: [], collections: [] });
    expect(rows[0]).toMatchObject({ contractNo: '-', contractAmount: 960_000, receivedAmount: 0, projectName: '未立项' });
  });
});
