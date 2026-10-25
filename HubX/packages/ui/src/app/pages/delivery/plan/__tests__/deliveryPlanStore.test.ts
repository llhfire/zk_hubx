import { afterEach, describe, expect, it } from 'vitest';
import { getDeliveryPlan, hasDeliveryPlan, removeDeliveryPlan, saveDeliveryPlan } from '../deliveryPlanStore';
import type { DeliveryPlan } from '../types';

const PROJECT_ID = 'delivery-store-test';

const plan: DeliveryPlan = {
  projectId: PROJECT_ID,
  phases: [],
  steps: [],
  milestones: [],
  deliveryType: '网站',
};

afterEach(() => removeDeliveryPlan(PROJECT_ID));

describe('交付计划共享存储', () => {
  it('保存后可被其他页面读取', () => {
    saveDeliveryPlan(plan);

    expect(hasDeliveryPlan(PROJECT_ID)).toBe(true);
    expect(getDeliveryPlan(PROJECT_ID)).toEqual(plan);
  });

  it('删除后不再返回计划', () => {
    saveDeliveryPlan(plan);
    removeDeliveryPlan(PROJECT_ID);

    expect(getDeliveryPlan(PROJECT_ID)).toBeUndefined();
  });
});
