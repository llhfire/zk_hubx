import { describe, expect, it } from 'vitest';
import { buildInitialContracts } from '../../contracts/mockData';
import {
  buildContractSigningStageSummary,
  buildProjectTimelineStepOrder,
  buildProjectStageSummaries,
  buildSupplementAgreementStageSummary,
  getCurrentProjectStageSummary,
  getPaymentTimelineStep,
} from '../projectStageSummary';
import type { ProjectListItem } from '../types';

const project = {
  id: 'p1', status: '进行中', owner: '李四', progress: 60, leadId: 'l1', blockers: [{
    id: 'b1', projectId: 'p1', title: '客户待提供账号', source: 'customer', severity: 'critical', owner: '李四', resolved: false, createdAt: '2026-08-29',
  }],
} satisfies Pick<ProjectListItem, 'id' | 'status' | 'owner' | 'progress' | 'leadId' | 'blockers'>;

describe('projectStageSummary', () => {
  it('从项目事实派生当前阶段已完成、待办和阻塞', () => {
    const input = {
      project,
      contracts: [],
      collections: [],
      confirmations: [],
      tasks: [],
      contractAmount: 0,
      receivedAmount: 0,
    };
    const current = getCurrentProjectStageSummary(input);
    expect(current.step).toBe('development');
    expect(current.completed.some((item) => item.id === 'development-started')).toBe(true);
    expect(current.pending.some((item) => item.id === 'development-completed')).toBe(true);
    expect(current.blocked).toHaveLength(1);
  });

  it('交付五阶段都有可解释检查项', () => {
    const summaries = buildProjectStageSummaries({
      project: { ...project, blockers: [] }, contracts: [], collections: [], confirmations: [], tasks: [], contractAmount: 0, receivedAmount: 0,
    });
    expect(Object.keys(summaries)).toEqual(['design', 'development', 'testing', 'acceptance', 'closeout']);
    expect(Object.values(summaries).every((summary) => summary.completed.length + summary.pending.length > 0)).toBe(true);
  });

  it('按合同付款条件把期次嵌入合同签订、方案设计和验收步骤', () => {
    const contract = buildInitialContracts().find((item) => item.id === 'pawkey-c1')!;
    const input = {
      project: { ...project, id: 'prod-112', progress: 98, blockers: [] },
      contracts: [contract],
      collections: contract.collectionRecords ?? [],
      confirmations: [],
      tasks: [],
      contractAmount: 100000,
      receivedAmount: 90000,
    };
    const summaries = buildProjectStageSummaries(input);
    const contractStage = buildContractSigningStageSummary(input);

    expect(contractStage?.payments).toHaveLength(1);
    expect(contractStage?.payments[0]).toMatchObject({ label: '首期款', status: 'paid' });
    expect(summaries.design.payments.map((item) => item.label)).toEqual(['二期款', '三期款']);
    expect(summaries.acceptance.payments).toHaveLength(1);
    expect(summaries.acceptance.payments[0]).toMatchObject({ label: '尾款', status: 'pending' });
  });

  it('区分设计确认、开发测试版和测试通过三类付款触发条件', () => {
    const plan = { period: 1, amount: 10000, percentage: 10, expectedDate: '' };
    expect(getPaymentTimelineStep({ ...plan, condition: 'UI 设计确认后支付' })).toBe('design');
    expect(getPaymentTimelineStep({ ...plan, condition: '开发发布测试版后支付' })).toBe('development');
    expect(getPaymentTimelineStep({ ...plan, condition: '测试通过后支付' })).toBe('testing');
  });

  it('将补充协议及其全部回款条件收口到独立步骤', () => {
    const contracts = buildInitialContracts().filter((item) => item.projectId === 'prod-112');
    const mainContract = contracts.find((item) => item.kind !== 'supplement')!;
    const input = {
      project: { ...project, id: 'prod-112', progress: 98, blockers: [] },
      contracts,
      collections: contracts.flatMap((contract) => contract.collectionRecords ?? []),
      confirmations: [],
      tasks: [],
      contractAmount: 144000,
      receivedAmount: 126000,
    };

    const summaries = buildProjectStageSummaries(input);
    const supplementStage = buildSupplementAgreementStageSummary(input);

    expect(summaries.design.payments.map((item) => item.label)).toEqual(['二期款', '三期款']);
    expect(summaries.development.payments).toEqual([]);
    expect(summaries.acceptance.payments.map((item) => item.label)).toEqual(['尾款']);
    expect(supplementStage?.step).toBe('supplement');
    expect(supplementStage?.payments).toHaveLength(4);
    expect(supplementStage?.payments.map((item) => item.amount)).toEqual([14000, 14000, 8000, 8000]);
    expect(supplementStage?.pending.some((item) => item.id === 'supplement-collected')).toBe(true);
    expect(mainContract.kind).toBe('main');
  });

  it('没有有效补充协议时不生成额外步骤', () => {
    const contract = buildInitialContracts().find((item) => item.id === 'pawkey-c1-s1')!;
    const summary = buildSupplementAgreementStageSummary({
      project,
      contracts: [{ ...contract, status: 'voided' }],
      collections: [],
      confirmations: [],
      tasks: [],
      contractAmount: 0,
      receivedAmount: 0,
    });

    expect(summary).toBeNull();
  });

  it('仅在涉及补充协议时将该步骤插入回款结项之前', () => {
    expect(buildProjectTimelineStepOrder({
      includeContractSigning: true,
      includeSupplementAgreement: true,
    })).toEqual(['contract', 'design', 'development', 'testing', 'acceptance', 'supplement', 'closeout']);

    expect(buildProjectTimelineStepOrder({
      includeContractSigning: false,
      includeSupplementAgreement: false,
    })).toEqual(['design', 'development', 'testing', 'acceptance', 'closeout']);
  });
});
