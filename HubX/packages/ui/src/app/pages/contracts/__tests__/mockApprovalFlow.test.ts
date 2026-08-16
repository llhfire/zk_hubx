import { describe, expect, it } from 'vitest';
import { buildInitialContracts } from '../mockData';

const STANDARD_STEPS = ['商务审核', '财务审核', '法务审核'];

describe('buildInitialContracts 审批流收敛', () => {
  it('所有 mock 合同的审批流都不含标准多级审核节点，且都含总经理审批', () => {
    for (const contract of buildInitialContracts()) {
      const steps = contract.approvalFlow.map((node) => node.step);
      for (const step of STANDARD_STEPS) {
        expect(steps, `${contract.contractNo} 不应包含 ${step}`).not.toContain(step);
      }
      expect(steps, `${contract.contractNo} 应包含 总经理审批`).toContain('总经理审批');
    }
  });

  it('审批中的合同 6 停在总经理审批待审', () => {
    const contract6 = buildInitialContracts().find((contract) => contract.id === '6');
    expect(contract6).toBeDefined();
    const pendingSteps = contract6!.approvalFlow.filter((node) => node.status === 'pending').map((node) => node.step);
    expect(pendingSteps).toEqual(['总经理审批']);
  });
});
