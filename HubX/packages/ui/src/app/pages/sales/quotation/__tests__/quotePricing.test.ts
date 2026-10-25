import { describe, expect, it } from 'vitest';
import {
  addWorkdays,
  computeProfitRate,
  DEFAULT_MIN_PROFIT_RATE,
  DEFAULT_ROLE_DAILY_COST,
  resolveRoleDailyCost,
  workdaysBetween,
} from '../quotePricing';

describe('computeProfitRate', () => {
  it('正常计算：(总价-增项-岗位成本)/(总价-增项)', () => {
    // 总价 100000，增项 20000，岗位成本 40000
    // 开发售价 = 80000，利润率 = (80000-40000)/80000 = 0.5
    expect(computeProfitRate({ grandTotal: 100000, upliftTotal: 20000, roleCostTotal: 40000 })).toBeCloseTo(0.5, 5);
  });

  it('开发售价 ≤ 0 时返回 null', () => {
    expect(computeProfitRate({ grandTotal: 10000, upliftTotal: 10000, roleCostTotal: 5000 })).toBeNull();
    expect(computeProfitRate({ grandTotal: 5000, upliftTotal: 10000, roleCostTotal: 5000 })).toBeNull();
  });

  it('无增项时：(总价-岗位成本)/总价', () => {
    expect(computeProfitRate({ grandTotal: 100000, upliftTotal: 0, roleCostTotal: 85000 })).toBeCloseTo(0.15, 5);
  });

  it('利润率低于底线 15% 为黄灯场景', () => {
    const rate = computeProfitRate({ grandTotal: 100000, upliftTotal: 0, roleCostTotal: 90000 });
    expect(rate).toBeCloseTo(0.1, 5);
    expect(rate! < DEFAULT_MIN_PROFIT_RATE).toBe(true);
  });

  it('零岗位成本时利润率为 1', () => {
    expect(computeProfitRate({ grandTotal: 100000, upliftTotal: 0, roleCostTotal: 0 })).toBeCloseTo(1, 5);
  });
});

describe('resolveRoleDailyCost 三级解析', () => {
  it('无任何配置时返回默认值', () => {
    expect(resolveRoleDailyCost('fe_days')).toBe(DEFAULT_ROLE_DAILY_COST);
  });

  it('配置优先于默认', () => {
    expect(resolveRoleDailyCost('fe_days', { fe_days: 800 })).toBe(800);
  });

  it('模板覆盖优先于配置', () => {
    expect(resolveRoleDailyCost('fe_days', { fe_days: 800 }, { fe_days: 900 })).toBe(900);
  });

  it('本单覆盖优先于模板', () => {
    expect(resolveRoleDailyCost('fe_days', { fe_days: 800 }, { fe_days: 900 }, { fe_days: 1000 })).toBe(1000);
  });

  it('未覆盖的岗位仍走下级', () => {
    expect(resolveRoleDailyCost('be_days', { fe_days: 800 }, { fe_days: 900 }, { fe_days: 1000 })).toBe(
      DEFAULT_ROLE_DAILY_COST,
    );
  });
});

describe('addWorkdays 工作日加法', () => {
  it('周一加 5 个工作日 → 下周一', () => {
    expect(addWorkdays('2026-08-24', 5)).toBe('2026-08-31'); // 周一+5=下周一
  });

  it('周五加 1 个工作日 → 下周一', () => {
    expect(addWorkdays('2026-08-21', 1)).toBe('2026-08-24'); // 周五+1=周一
  });

  it('周六加 1 个工作日 → 下周二（周六不算工作日，先跳到周日再跳到周一）', () => {
    // 2026-08-22 是周六，加1个工作日：周日不跳，周一跳 → 2026-08-24
    expect(addWorkdays('2026-08-22', 1)).toBe('2026-08-24');
  });

  it('加 0 个工作日 → 当天', () => {
    expect(addWorkdays('2026-08-24', 0)).toBe('2026-08-24');
  });

  it('跨周末：周三加 5 个工作日 → 下周三', () => {
    // 2026-08-19 周三，加5：周四(20)、周五(21)、跳周末、周一(24)、周二(25) → 2026-08-26 周三
    expect(addWorkdays('2026-08-19', 5)).toBe('2026-08-26');
  });
});

describe('workdaysBetween 工作日计数', () => {
  it('周一到周五 → 4 个工作日', () => {
    expect(workdaysBetween('2026-08-24', '2026-08-28')).toBe(4);
  });

  it('跨周末：周五到下周一 → 1 个工作日', () => {
    expect(workdaysBetween('2026-08-21', '2026-08-24')).toBe(1);
  });

  it('同一天 → 0', () => {
    expect(workdaysBetween('2026-08-24', '2026-08-24')).toBe(0);
  });

  it('a > b → 0', () => {
    expect(workdaysBetween('2026-08-25', '2026-08-24')).toBe(0);
  });

  it('整周（周一到下周一）→ 5 个工作日', () => {
    expect(workdaysBetween('2026-08-24', '2026-08-31')).toBe(5);
  });
});
