import { describe, expect, it } from 'vitest';
import { initialDeliveryPlans } from '../mockData';
import { calcOverallCompletion } from '../utils';

describe('交付计划种子状态', () => {
  it('项目 1 按步骤进度同步板块状态', () => {
    const phases = initialDeliveryPlans['1'].phases;

    expect(phases.find((phase) => phase.phaseNo === 1)?.status).toBe('completed');
    expect(phases.find((phase) => phase.phaseNo === 2)?.status).toBe('completed');
    expect(phases.find((phase) => phase.phaseNo === 3)?.status).toBe('pending');
  });

  it('帕奇宠 C 端一期生成与项目台账一致的 APP 交付计划', () => {
    const plan = initialDeliveryPlans['prod-112'];

    expect(plan).toMatchObject({
      projectId: 'prod-112',
      deliveryType: 'APP',
      contractId: 'pawkey-c1',
    });
    expect(plan.phases.map((phase) => phase.phaseNo)).toEqual([1, 2, 3, 5]);
    expect(plan.phases.slice(0, 3).every((phase) => phase.status === 'completed')).toBe(true);
    expect(plan.phases.find((phase) => phase.phaseNo === 5)).toMatchObject({
      status: 'in_progress',
      startDate: '2026-08-20',
      dueDate: '2026-09-05',
    });
    expect(plan.steps).toHaveLength(24);
    expect(plan.steps.find((step) => step.stepNo === '3.4')).toMatchObject({
      stepName: '系统架构与接口边界设计',
      assignee: '陈周伟',
      status: 'completed',
    });
    expect(plan.steps.find((step) => step.stepNo === '5.5')).toMatchObject({
      stepName: '甲方终验功能清单确认',
      assignee: '何江奇',
      status: 'in_progress',
      dueDate: '2026-09-05',
    });
    expect(plan.milestones).toHaveLength(9);
    expect(plan.milestones.filter((milestone) => milestone.completed)).toHaveLength(7);
    expect(plan.contractBasis).toMatchObject({
      contractId: 'pawkey-c1',
      subjectCategory: '产品设计与系统架构设计',
    });
    expect(Math.round(calcOverallCompletion(plan.phases, plan.steps) * 100)).toBe(98);
  });
});
