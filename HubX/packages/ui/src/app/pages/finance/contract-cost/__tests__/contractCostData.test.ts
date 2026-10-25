import { describe, expect, it } from 'vitest';
import {
  getHourlyOpCost,
  getHourlyOpSnapshot,
  mockBusinessCosts,
} from '../contractCostData';

describe('合同成本统一口径', () => {
  it('差旅与商务记录使用独立分类', () => {
    const travel = mockBusinessCosts.filter(item => item.costCategory === 'travel');
    const commercial = mockBusinessCosts.filter(item => item.costCategory === 'commercial');

    expect(travel).toHaveLength(1);
    expect(travel[0].category).toBe('交通住宿');
    expect(commercial.every(item => item.category !== '差旅费')).toBe(true);
  });

  it('合同成本读取共享动态公摊快照', () => {
    const snapshot = getHourlyOpSnapshot('2026-05');

    expect(snapshot.pool).toBe(48000);
    expect(snapshot.capacityHours).toBe(912);
    expect(getHourlyOpCost('2026-05')).toBe(snapshot.rate);
    expect(snapshot.rate).toBeCloseTo(48000 / 912, 8);
  });
});
