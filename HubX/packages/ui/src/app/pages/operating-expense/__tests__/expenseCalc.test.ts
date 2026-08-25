import { describe, expect, it } from 'vitest';
import {
  isPosted,
  postedLedgerTotal,
  directByAttribution,
  categoryStack,
  includeLaborTotal,
  rankByDepartment,
  rankByProject,
  STACK_PRIMARIES,
} from '../expenseCalc';
import { addMonth, rollingMonths, CURRENT_MONTH, isFutureMonth } from '../opexConstants';
import { detectAnomalies } from '../expenseAnomalies';
import type { ExpenseRecord } from '../types';

function makeRecord(overrides: Partial<ExpenseRecord> = {}): ExpenseRecord {
  return {
    id: 'r1',
    expenseNo: 'EXP-202608-001',
    categoryPrimary: 'OFFICE',
    amount: 1000,
    occurDate: '2026-08-01',
    billingMonth: '2026-08',
    attribution: 'pool',
    source: 'manual',
    status: 'posted',
    handler: '张三',
    audit: [],
    ...overrides,
  };
}

describe('isPosted', () => {
  it('posted → true', () => expect(isPosted(makeRecord({ status: 'posted' }))).toBe(true));
  it('pending → false', () => expect(isPosted(makeRecord({ status: 'pending' }))).toBe(false));
  it('voided → false', () => expect(isPosted(makeRecord({ status: 'voided' }))).toBe(false));
});

describe('postedLedgerTotal', () => {
  it('只统计当月 posted', () => {
    const records = [
      makeRecord({ amount: 65000, status: 'posted', billingMonth: '2026-08', attribution: 'pool' }),
      makeRecord({ id: 'r2', amount: 5000, status: 'posted', billingMonth: '2026-08', attribution: 'project' }),
      makeRecord({ id: 'r3', amount: 4800, status: 'pending', billingMonth: '2026-08' }),
      makeRecord({ id: 'r4', amount: 10000, status: 'voided', billingMonth: '2026-08' }),
      makeRecord({ id: 'r5', amount: 1000, status: 'posted', billingMonth: '2026-07' }),
    ];
    expect(postedLedgerTotal(records, '2026-08')).toBe(70000);
  });
});

describe('directByAttribution', () => {
  it('按归属过滤', () => {
    const records = [
      makeRecord({ amount: 65000, attribution: 'pool', billingMonth: '2026-08' }),
      makeRecord({ id: 'r2', amount: 5000, attribution: 'project', billingMonth: '2026-08' }),
    ];
    expect(directByAttribution(records, '2026-08', 'project')).toBe(5000);
    expect(directByAttribution(records, '2026-08', 'pool')).toBe(65000);
  });
});

describe('categoryStack', () => {
  it('按一级科目堆叠，不含 LABOR', () => {
    const records = [
      makeRecord({ categoryPrimary: 'OFFICE', amount: 65000, billingMonth: '2026-08' }),
      makeRecord({ id: 'r2', categoryPrimary: 'TRAVEL', amount: 5000, billingMonth: '2026-08' }),
      makeRecord({ id: 'r3', categoryPrimary: 'LABOR', amount: 99999, billingMonth: '2026-08' }),
    ];
    const stack = categoryStack(records, '2026-08');
    expect(stack.OFFICE).toBe(65000);
    expect(stack.TRAVEL).toBe(5000);
    expect(stack.LABOR).toBeUndefined(); // LABOR 不在 STACK_PRIMARIES 中
  });
});

describe('includeLaborTotal', () => {
  it('含人力 = 台账 + 工资', () => {
    expect(includeLaborTotal(70000, 63000, true)).toBe(133000);
  });
  it('不含人力 = 台账', () => {
    expect(includeLaborTotal(70000, 63000, false)).toBe(70000);
  });
});

describe('rankByDepartment', () => {
  it('按部门排行，无部门不进表', () => {
    const records = [
      makeRecord({ departmentId: 'dept-admin', amount: 100, billingMonth: '2026-08' }),
      makeRecord({ id: 'r2', departmentId: 'dept-admin', amount: 200, billingMonth: '2026-08' }),
      makeRecord({ id: 'r3', amount: 35000, billingMonth: '2026-08' }), // 无部门
      makeRecord({ id: 'r4', departmentId: 'dept-tech', amount: 5500, billingMonth: '2026-08' }),
    ];
    const rank = rankByDepartment(records, '2026-08', (id) => id);
    expect(rank).toHaveLength(2);
    expect(rank[0].key).toBe('dept-tech');
    expect(rank[0].amount).toBe(5500);
    expect(rank[1].key).toBe('dept-admin');
    expect(rank[1].amount).toBe(300);
  });
});

describe('rankByProject', () => {
  it('仅项目归属且有 projectId 进排行', () => {
    const records = [
      makeRecord({ attribution: 'project', projectId: 'p1', amount: 5500, billingMonth: '2026-08' }),
      makeRecord({ id: 'r2', attribution: 'pool', amount: 35000, billingMonth: '2026-08' }),
    ];
    const rank = rankByProject(records, '2026-08', (id) => id);
    expect(rank).toHaveLength(1);
    expect(rank[0].key).toBe('p1');
  });
});

describe('STACK_PRIMARIES', () => {
  it('8 个可录入科目，不含 LABOR', () => {
    expect(STACK_PRIMARIES).toHaveLength(8);
    expect(STACK_PRIMARIES).not.toContain('LABOR');
  });
});

describe('opexConstants', () => {
  it('CURRENT_MONTH = 2026-08', () => {
    expect(CURRENT_MONTH).toBe('2026-08');
  });

  it('rollingMonths 返回 7 个月', () => {
    const months = rollingMonths();
    expect(months).toHaveLength(7);
    expect(months[0]).toBe('2026-05');
    expect(months[3]).toBe('2026-08');
    expect(months[6]).toBe('2026-11');
  });

  it('addMonth 加减', () => {
    expect(addMonth('2026-08', -1)).toBe('2026-07');
    expect(addMonth('2026-01', -1)).toBe('2025-12');
    expect(addMonth('2026-12', 1)).toBe('2027-01');
  });

  it('isFutureMonth', () => {
    expect(isFutureMonth('2026-09')).toBe(true);
    expect(isFutureMonth('2026-08')).toBe(false);
    expect(isFutureMonth('2026-07')).toBe(false);
  });
});

describe('detectAnomalies', () => {
  it('科目环比增幅 > 30% 报一条', () => {
    const records = [
      makeRecord({ categoryPrimary: 'PROMOTION', amount: 15000, billingMonth: '2026-08' }),
      makeRecord({ id: 'r2', categoryPrimary: 'PROMOTION', amount: 10000, billingMonth: '2026-07' }),
    ];
    const anomalies = detectAnomalies({ records, templates: [], currentMonth: '2026-08', today: '2026-08-21' });
    const momAnomalies = anomalies.filter((a) => a.kind === 'category_mom');
    expect(momAnomalies).toHaveLength(1);
    expect(momAnomalies[0].title).toContain('PROMOTION');
  });

  it('下降不报', () => {
    const records = [
      makeRecord({ categoryPrimary: 'OFFICE', amount: 5000, billingMonth: '2026-08' }),
      makeRecord({ id: 'r2', categoryPrimary: 'OFFICE', amount: 10000, billingMonth: '2026-07' }),
    ];
    const anomalies = detectAnomalies({ records, templates: [], currentMonth: '2026-08' });
    expect(anomalies.filter((a) => a.kind === 'category_mom')).toHaveLength(0);
  });

  it('浮动待确认逾期', () => {
    const records = [
      makeRecord({
        status: 'pending',
        source: 'template',
        templateId: 'tpl-1',
        billingMonth: '2026-08',
      }),
    ];
    const templates = [
      { id: 'tpl-1', name: '水电', kind: 'variable' as const, active: true, billingDay: 15, amount: 0, categoryPrimary: 'OTHER' as const, categorySecondary: '', billingCycle: 'monthly' as const, startMonth: '2026-01', attribution: 'pool' as const, priceHistory: [] },
    ];
    const anomalies = detectAnomalies({ records, templates, currentMonth: '2026-08', today: '2026-08-21' });
    expect(anomalies.filter((a) => a.kind === 'variable_overdue')).toHaveLength(1);
  });

  it('无第四种 kind', () => {
    const anomalies = detectAnomalies({ records: [], templates: [] });
    const validKinds = ['category_mom', 'fixed_not_generated', 'variable_overdue'];
    expect(anomalies.every((a) => validKinds.includes(a.kind))).toBe(true);
  });
});
