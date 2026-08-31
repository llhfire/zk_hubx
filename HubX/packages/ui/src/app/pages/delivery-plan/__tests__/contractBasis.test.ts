import { describe, expect, it } from 'vitest';
import { buildInitialContracts } from '../../contracts/mockData';
import {
  buildContractBasis,
  deriveDeliveryConfigFromContract,
  generateDeliveryPlanFromContract,
} from '../contractBasis';
import { buildGanttRowItems } from '../ganttLayout';

const pawkeyContract = buildInitialContracts().find((contract) => contract.id === 'pawkey-c1');
if (!pawkeyContract) throw new Error('测试依赖的帕奇宠主合同缺失');

const project = {
  id: 'prod-112',
  startDate: '2026-06-08',
  owner: '何江奇',
  productUsers: ['何江奇'],
  salesUsers: ['黄奕'],
  uiUsers: ['周雨桐'],
  backendUsers: ['陈周伟'],
  testUsers: ['蒋梦婷'],
  opsUsers: ['郭启明'],
};

describe('合同驱动交付计划', () => {
  it('从合同标的推导交付类型和适用 SOP 板块', () => {
    expect(deriveDeliveryConfigFromContract(pawkeyContract)).toEqual({
      selectedPhases: [1, 2, 3, 5],
      deliveryType: 'APP',
      contractId: 'pawkey-c1',
    });
  });

  it('将付款条件与交付条件保存为可追溯生成依据', () => {
    const basis = buildContractBasis(pawkeyContract);

    expect(basis).toMatchObject({
      contractId: 'pawkey-c1',
      contractName: '帕奇宠C端需求调研及原型设计',
      subjectCategory: '产品设计与系统架构设计',
    });
    expect(basis.paymentConditions).toHaveLength(4);
    expect(basis.paymentConditions.filter((item) => item.completed)).toHaveLength(3);
    expect(basis.deliveryConditions).toHaveLength(4);
    expect(basis.deliveryConditions.at(-1)).toMatchObject({
      name: '一期终验单签署',
      expectedDate: '2026-08-28',
    });
  });

  it('用标准 SOP 生成骨架，并把合同条件写入步骤与里程碑', () => {
    const plan = generateDeliveryPlanFromContract(pawkeyContract, project);

    expect(plan.phases.map((phase) => phase.phaseNo)).toEqual([1, 2, 3, 5]);
    expect(plan.contractBasis?.contractId).toBe('pawkey-c1');
    expect(plan.milestones).toHaveLength(9);
    expect(plan.milestones.filter((item) => item.source === 'contract_payment')).toHaveLength(4);
    expect(plan.milestones.filter((item) => item.source === 'contract_delivery')).toHaveLength(4);
    expect(plan.steps.find((step) => step.stepNo === '1.2')?.userNotes).toContain('合同标的');
    expect(plan.steps.find((step) => step.stepNo === '3.10')?.userNotes).toContain('首期款 50%');
    expect(plan.steps.find((step) => step.stepNo === '5.3')?.userNotes).toContain('一期终验单签署');
    expect(
      buildGanttRowItems(plan, plan.phases.map((phase) => phase.id), [])
        .filter((row) => row.kind === 'milestone'),
    ).toHaveLength(plan.milestones.length);
  });
});
