import { describe, expect, it } from 'vitest';
import { initialDeliveryPlans } from '../mockData';

describe('交付计划种子状态', () => {
  it('项目 1 按步骤进度同步板块状态', () => {
    const phases = initialDeliveryPlans['1'].phases;

    expect(phases.find((phase) => phase.phaseNo === 1)?.status).toBe('completed');
    expect(phases.find((phase) => phase.phaseNo === 2)?.status).toBe('completed');
    expect(phases.find((phase) => phase.phaseNo === 3)?.status).toBe('pending');
  });
});
