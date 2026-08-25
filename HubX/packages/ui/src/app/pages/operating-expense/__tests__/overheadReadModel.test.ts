import { describe, expect, it } from 'vitest';
import { laborCostInMonth, projectHoursInMonth, buildOverheadReadModel } from '../overheadReadModel';
import type { ExpenseRecord } from '../types';

describe('laborCostInMonth', () => {
  it('只统计 labor+actual+date所在月', () => {
    const items = [
      { id: 'i1', caseId: 'c1', costCategory: 'labor', sourceType: 'labor', amount: 15000, date: '2026-06-15', endDate: '2026-07-15', status: 'actual' },
      { id: 'i2', caseId: 'c1', costCategory: 'labor', sourceType: 'labor', amount: 8000, date: '2026-08-01', status: 'actual' },
      { id: 'i3', caseId: 'c1', costCategory: 'overhead', sourceType: 'overhead', amount: 2800, date: '2026-08-01', quantityDays: 10, status: 'actual' },
    ];
    expect(laborCostInMonth(items as any, '2026-06')).toBe(15000);
    expect(laborCostInMonth(items as any, '2026-07')).toBe(0); // endDate 不算，只看 date
    expect(laborCostInMonth(items as any, '2026-08')).toBe(8000);
  });
});

describe('projectHoursInMonth', () => {
  it('只有 overhead sourceType 的 quantityDays 贡献工时', () => {
    const items = [
      { id: 'i1', caseId: 'c1', costCategory: 'overhead', sourceType: 'overhead', amount: 2800, date: '2026-08-01', quantityDays: 10, status: 'actual' },
      { id: 'i2', caseId: 'c1', costCategory: 'labor', sourceType: 'labor', amount: 8000, date: '2026-08-01', status: 'actual' },
    ];
    expect(projectHoursInMonth(items as any, '2026-08')).toBe(80); // 10*8
  });

  it('人工项无 quantityDays → 不贡献工时', () => {
    const items = [
      { id: 'i1', caseId: 'c1', costCategory: 'labor', sourceType: 'labor', amount: 8000, date: '2026-08-01', status: 'actual' },
    ];
    expect(projectHoursInMonth(items as any, '2026-08')).toBe(0);
  });
});

describe('buildOverheadReadModel', () => {
  const cases = [
    { id: 'case-001', projectId: 'p1', projectName: '项目A', contractId: 'ct1' },
    { id: 'case-003', projectId: 'p3', projectName: '项目B' },
  ];
  const costItems = [
    { id: 'i1', caseId: 'case-001', costCategory: 'labor', sourceType: 'labor', amount: 23550, date: '2026-08-01', status: 'actual' },
    { id: 'i2', caseId: 'case-001', costCategory: 'overhead', sourceType: 'overhead', amount: 1800, date: '2026-08-01', quantityDays: 21, status: 'actual' },
    { id: 'i3', caseId: 'case-003', costCategory: 'overhead', sourceType: 'overhead', amount: 2800, date: '2026-08-01', quantityDays: 10, status: 'actual' },
  ];
  const records: ExpenseRecord[] = [];

  it('基本计算：hours * rHour = overhead', () => {
    const model = buildOverheadReadModel({
      month: '2026-08',
      records,
      rHour: 10.2,
      pool: 12000,
      capacityHours: 1176,
      cases,
      costItems: costItems as any,
    });
    expect(model.rows).toHaveLength(2);
    // case-001: 21*8=168 hours, overhead=168*10.2
    expect(model.rows[0].hours).toBe(168);
    expect(model.rows[0].overhead).toBeCloseTo(168 * 10.2, 0);
    // case-003: 10*8=80 hours
    expect(model.rows[1].hours).toBe(80);
  });

  it('margin 走 deriveLifecycleMargin，不自算', () => {
    const model = buildOverheadReadModel({
      month: '2026-08',
      records,
      rHour: 10.2,
      pool: 12000,
      capacityHours: 1176,
      cases,
      costItems: costItems as any,
      getContract: () => ({ totalAmount: 205000 }),
      deriveEac: () => 187474,
      deriveLifecycleMargin: (amt, eac) => (amt - eac) / amt,
    });
    expect(model.rows[0].margin).toBeCloseTo((205000 - 187474) / 205000, 5);
  });

  it('无 contract → margin null', () => {
    const model = buildOverheadReadModel({
      month: '2026-08',
      records,
      rHour: 10.2,
      pool: 12000,
      capacityHours: 1176,
      cases: [{ id: 'case-003', projectId: 'p3' }],
      costItems: costItems as any,
    });
    expect(model.rows[0].margin).toBeNull();
  });

  it('hoursOverflow: Σhours > capacityHours → unallocated=0', () => {
    const model = buildOverheadReadModel({
      month: '2026-08',
      records,
      rHour: 10.2,
      pool: 12000,
      capacityHours: 100, // 故意设小
      cases,
      costItems: costItems as any,
    });
    expect(model.hoursOverflow).toBe(true);
    expect(model.unallocated).toBe(0);
  });
});
