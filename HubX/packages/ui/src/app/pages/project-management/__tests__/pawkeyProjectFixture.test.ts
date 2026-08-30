import { describe, expect, it } from 'vitest';
import { buildInitialContracts } from '../../contracts/mockData';
import { effectiveAmount } from '../../contracts/paymentUtils';
import { getLeadDetailProfile } from '../../leads/leadDetailProfiles';
import { initialQuotes } from '../../quotation/mockData';
import {
  initialDailyReports,
  initialDocuments,
  initialFollowUps,
  initialProjects,
} from '../mockData';
import {
  getActivitiesByProjectId,
  getConfirmationsByProjectId,
  getDemoEnvsByProjectId,
  getMeetingsByProjectId,
  PROJECT_LIST,
} from '../projectMockData';
import { getProjectBugs } from '../projectQuality';
import { getProjectTasks } from '../projectTasks';

const PROJECT_ID = 'prod-112';

describe('帕奇宠 C 端一期完整演示夹具', () => {
  it('保留生产快照主数据，并补齐详情关联键和管理口径', () => {
    const project = PROJECT_LIST.find((item) => item.id === PROJECT_ID);
    const detailProject = initialProjects.find((item) => item.id === PROJECT_ID);

    expect(project).toMatchObject({
      sourceProjectId: 112,
      name: '帕奇宠C端一期',
      progress: 98,
      totalHours: 2045.5,
      budgetHours: 2240,
      leadId: 'pawkey-lead-5942',
      contractId: 'pawkey-c1',
      customerName: '重庆绮算法科技有限公司',
      contractAmount: 144000,
      receivedAmount: 126000,
      bugP0Count: 0,
      bugP1Count: 2,
      riskLevel: 'medium',
    });
    expect(project?.blockers).toHaveLength(1);
    expect(project?.acceptanceCriteria).toHaveLength(4);
    expect(detailProject?.uiUsers).toContain('周雨桐');
    expect(detailProject?.backendUsers).toContain('陈周伟');
  });

  it('主合同、两份补充合同及对应回款形成完整有效标的额', () => {
    const contracts = buildInitialContracts().filter((item) => item.projectId === PROJECT_ID);
    const contract = contracts.find((item) => item.id === 'pawkey-c1');
    const supplements = contracts.filter((item) => item.kind === 'supplement');
    const quote = initialQuotes.find((item) => item.id === 'pawkey-q1');
    const supplementQuotes = initialQuotes.filter((item) => item.isSupplement && item.leadId === 'pawkey-lead-5942');
    const lead = getLeadDetailProfile('pawkey-lead-5942', '');

    expect(contract).toMatchObject({ leadId: 'pawkey-lead-5942', projectId: PROJECT_ID, quoteId: 'pawkey-q1' });
    expect(contract?.current.totalAmount).toBe(100000);
    expect(contract?.collectionRecords?.reduce((sum, item) => sum + item.amount, 0)).toBe(90000);
    expect(contract?.paymentBlockers?.[0].amountBlocked).toBe(10000);
    expect(supplements).toHaveLength(2);
    expect(supplements.map((item) => item.current.totalAmount)).toEqual([28000, 16000]);
    expect(supplements.map((item) => item.sourceQuoteId)).toEqual(['pawkey-sq1', 'pawkey-sq2']);
    expect(effectiveAmount(contract!, supplements)).toBe(144000);
    expect(contracts.flatMap((item) => item.collectionRecords ?? []).reduce((sum, item) => sum + item.amount, 0)).toBe(126000);
    expect(supplementQuotes.map((item) => item.generatedContractId)).toEqual(['pawkey-c1-s1', 'pawkey-c1-s2']);
    expect(quote).toMatchObject({ leadId: 'pawkey-lead-5942', contractId: 'pawkey-c1', status: 'confirmed' });
    expect(quote?.summary?.grandTotalPrice).toBe(100000);
    expect(lead.leadInfo.customer).toBe('重庆绮算法科技有限公司');
  });

  it('详情页每个业务台账都有可查看数据', () => {
    expect(getProjectTasks(PROJECT_ID)).toHaveLength(7);
    expect(getProjectBugs(PROJECT_ID)).toHaveLength(4);
    expect(getProjectBugs(PROJECT_ID).filter((bug) => bug.priority === 'P1' && bug.status !== '已关闭')).toHaveLength(2);
    expect(initialDailyReports.filter((item) => item.projectId === PROJECT_ID)).toHaveLength(10);
    expect(initialFollowUps.filter((item) => item.projectId === PROJECT_ID)).toHaveLength(6);
    expect(initialDocuments.filter((item) => item.projectId === PROJECT_ID)).toHaveLength(6);
    expect(getMeetingsByProjectId(PROJECT_ID)).toHaveLength(4);
    expect(getConfirmationsByProjectId(PROJECT_ID)).toHaveLength(5);
    expect(getDemoEnvsByProjectId(PROJECT_ID)).toHaveLength(4);
    expect(getActivitiesByProjectId(PROJECT_ID)).toHaveLength(6);
  });
});
