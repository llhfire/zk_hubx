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

    expect(rows).toHaveLength(3);
    expect(rows.find((row) => row.id === '5912')).toMatchObject({
      contractId: '13',
      contractNo: 'HT202608013',
      contractAmount: 20_000,
      receivedAmount: 10_000,
      projectId: '13',
      projectName: '小红书插件Agent',
      projectStatus: '进行中',
      closedStatus: '已立项',
    });
    expect(rows.find((row) => row.id === '5866')).toMatchObject({
      contractId: '14',
      contractNo: 'HT202607014',
      contractAmount: 18_000,
      receivedAmount: 9_000,
      projectId: '14',
      projectName: '汽车配件索赔管理系统',
      projectStatus: '进行中',
      closedStatus: '已立项',
    });
  });

  it('没有共享事实时不回退到静态假合同', () => {
    const rows = buildClosedLeadRows({ leads: CLOSED_LEADS, contracts: [], projects: [], collections: [] });
    expect(rows).toHaveLength(3);
    rows.forEach((row) => {
      expect(row).toMatchObject({ contractNo: '-', contractAmount: 0, receivedAmount: 0, projectName: '未立项' });
    });
  });
});
