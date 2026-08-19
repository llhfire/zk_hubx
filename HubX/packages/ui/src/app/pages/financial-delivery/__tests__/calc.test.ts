/**
 * 精益交付 L1 单测 — calc.ts 纯函数
 * 夹具写在测试文件内，不读真实 mock
 */
import { describe, it, expect } from 'vitest';
import {
  deriveTotalCost,
  deriveEac,
  deriveRevenue,
  deriveContractAmount,
  deriveLifecycleMargin,
  deriveCollectedMargin,
  deriveWip,
  deriveHealth,
  deriveCostStructure,
  sumEvalDaysByLeanRole,
  deriveQuotationTotals,
  simulateSensitivity,
  canTransit,
  suggestCollecting,
  COST_DAY_RATES,
  ROLE_PRICES,
  EVAL_ROLE_MAP,
  WIP_DAYS_YELLOW,
  OVERHEAD_RATE,
} from '../calc';
import type { CaseCostItem, CaseStatus, EvalSheet, QuotationAtoms } from '../types';

// ==================== 常量 ====================

describe('常量', () => {
  it('OVERHEAD_RATE = 35', () => {
    expect(OVERHEAD_RATE).toBe(35);
  });

  it('WIP_DAYS_YELLOW = 14', () => {
    expect(WIP_DAYS_YELLOW).toBe(14);
  });

  it('COST_DAY_RATES 有 6 个角色', () => {
    expect(Object.keys(COST_DAY_RATES)).toHaveLength(6);
  });

  it('EVAL_ROLE_MAP pm_days → product', () => {
    expect(EVAL_ROLE_MAP.pm_days).toBe('product');
  });
});

// ==================== 派生函数 ====================

describe('deriveTotalCost / deriveEac', () => {
  const items: CaseCostItem[] = [
    { id: '1', caseId: 'c', sourceType: 'manual', costCategory: 'labor', costType: 't', amount: 100, date: '2026-01', status: 'actual', createdAt: '' },
    { id: '2', caseId: 'c', sourceType: 'manual', costCategory: 'labor', costType: 't', amount: 40, date: '2026-02', status: 'forecast', createdAt: '' },
  ];

  it('totalCost = Σ actual = 100', () => {
    expect(deriveTotalCost(items)).toBe(100);
  });

  it('EAC = Σ all = 140', () => {
    expect(deriveEac(items)).toBe(140);
  });
});

describe('deriveRevenue', () => {
  it('Σ 回款', () => {
    expect(deriveRevenue([{ amount: 50 }, { amount: 30 }])).toBe(80);
  });

  it('空数组 = 0', () => {
    expect(deriveRevenue([])).toBe(0);
  });
});

describe('deriveContractAmount', () => {
  it('主合同 + 已归档未作废补充', () => {
    expect(deriveContractAmount(200000, [
      { amount: 20000, archived: true, voided: false },
      { amount: 5000, archived: true, voided: true },
      { amount: 10000, archived: false, voided: false },
    ])).toBe(220000);
  });

  it('无补充 = 主合同额', () => {
    expect(deriveContractAmount(185000, [])).toBe(185000);
  });
});

describe('deriveLifecycleMargin', () => {
  it('标的额 200、EAC 140 → 30%', () => {
    expect(deriveLifecycleMargin(200, 140)).toBeCloseTo(0.3, 5);
  });

  it('标的额 ≤ 0 → null', () => {
    expect(deriveLifecycleMargin(0, 100)).toBeNull();
  });
});

describe('deriveCollectedMargin', () => {
  it('回款 0 → null', () => {
    expect(deriveCollectedMargin(0, 80)).toBeNull();
  });

  it('回款 200、actual 140 → 30%', () => {
    expect(deriveCollectedMargin(200, 140)).toBeCloseTo(0.3, 5);
  });
});

describe('deriveWip', () => {
  it('actual 80、回款 0 → value=80', () => {
    const wip = deriveWip(80, 0, null, '2026-08-01');
    expect(wip.value).toBe(80);
  });

  it('actual ≤ 回款 → value=0', () => {
    const wip = deriveWip(80, 100, '2026-07-01', '2026-08-01');
    expect(wip.value).toBe(0);
    expect(wip.days).toBe(0);
  });
});

describe('deriveHealth', () => {
  it('margin 达标、无红条件 → 绿', () => {
    expect(deriveHealth(0.35, 0.3, 140, 350000, 10)).toBe('green');
  });

  it('margin < target → 红', () => {
    expect(deriveHealth(0.25, 0.3, 140, 350000, 10)).toBe('red');
  });

  it('EAC > budgetCap → 红', () => {
    expect(deriveHealth(0.35, 0.3, 400000, 350000, 10)).toBe('red');
  });

  it('WIP days=15、无红条件 → 黄', () => {
    expect(deriveHealth(0.35, 0.3, 140, 350000, 15)).toBe('yellow');
  });

  it('红优先于黄（margin 不达标 + wip 过长）', () => {
    expect(deriveHealth(0.2, 0.3, 140, 350000, 20)).toBe('red');
  });
});

describe('deriveCostStructure', () => {
  it('按 costCategory 汇总', () => {
    const items: CaseCostItem[] = [
      { id: '1', caseId: 'c', sourceType: 'manual', costCategory: 'labor', costType: 't', amount: 100, date: '2026-01', status: 'actual', createdAt: '' },
      { id: '2', caseId: 'c', sourceType: 'manual', costCategory: 'labor', costType: 't', amount: 50, date: '2026-02', status: 'forecast', createdAt: '' },
      { id: '3', caseId: 'c', sourceType: 'manual', costCategory: 'commercial', costType: 't', amount: 30, date: '2026-01', status: 'actual', createdAt: '' },
    ];
    const result = deriveCostStructure(items);
    expect(result.labor).toEqual({ actual: 100, forecast: 50 });
    expect(result.commercial).toEqual({ actual: 30, forecast: 0 });
  });
});

// ==================== 报价相关 ====================

describe('sumEvalDaysByLeanRole', () => {
  it('pm_days 2 + arch_days 1 → product=2, other=1', () => {
    const evalSheet: EvalSheet = { evalDays: { pm_days: 2, arch_days: 1 } };
    const result = sumEvalDaysByLeanRole(evalSheet);
    expect(result.product).toBe(2);
    expect(result.other).toBe(1);
    expect(result.frontend).toBe(0);
  });
});

describe('deriveQuotationTotals', () => {
  it('产品 10 天×1000、服务 5000、代收 2000、加成 0', () => {
    const atoms: QuotationAtoms = {
      roleDays: { product: 10, design: 0, frontend: 0, backend: 0, test: 0, other: 0 },
      rolePrices: { product: 1000, design: 800, frontend: 1200, backend: 1200, test: 600, other: 800 },
      marginRate: 0,
      serviceItems: [
        { description: '驻场', amount: 5000, isPassthrough: false },
        { description: '云服务器', amount: 2000, isPassthrough: true },
      ],
    };
    const result = deriveQuotationTotals(atoms);
    expect(result.featureQuote).toBe(10000);
    expect(result.serviceTotal).toBe(5000);
    expect(result.passthroughTotal).toBe(2000);
    expect(result.totalAmount).toBe(15000); // 10000×(1+0) + 5000
  });
});

// ==================== 模拟器 ====================

describe('simulateSensitivity', () => {
  it('范围 50%：forecast 人力 80、actual 人力 100、商务 forecast 20', () => {
    const items: CaseCostItem[] = [
      { id: '1', caseId: 'c', sourceType: 'manual', costCategory: 'labor', costType: 't', amount: 100, date: '', status: 'actual', createdAt: '' },
      { id: '2', caseId: 'c', sourceType: 'manual', costCategory: 'labor', costType: 't', amount: 80, date: '', status: 'forecast', createdAt: '' },
      { id: '3', caseId: 'c', sourceType: 'manual', costCategory: 'commercial', costType: 't', amount: 20, date: '', status: 'forecast', createdAt: '' },
    ];
    const result = simulateSensitivity(items, 200, 0.5, 0.3);
    // EAC = 100 + 80×0.5 + 20 = 160
    expect(result.eac).toBe(160);
    // margin = (200-160)/200 = 0.2
    expect(result.margin).toBeCloseTo(0.2, 5);
  });

  it('底价 target=30%、EAC=140 → 140/0.7≈200', () => {
    const items: CaseCostItem[] = [
      { id: '1', caseId: 'c', sourceType: 'manual', costCategory: 'labor', costType: 't', amount: 140, date: '', status: 'actual', createdAt: '' },
    ];
    const result = simulateSensitivity(items, 200, 1, 0.3);
    expect(result.floorPrice).toBeCloseTo(200, 0);
  });
});

// ==================== 状态机 ====================

describe('canTransit', () => {
  it('completed → in_progress = false', () => {
    expect(canTransit('completed' as CaseStatus, 'in_progress' as CaseStatus)).toBe(false);
  });

  it('drafting → quoting = true', () => {
    expect(canTransit('drafting' as CaseStatus, 'quoting' as CaseStatus)).toBe(true);
  });

  it('in_progress → collecting = true', () => {
    expect(canTransit('in_progress' as CaseStatus, 'collecting' as CaseStatus)).toBe(true);
  });
});

describe('suggestCollecting', () => {
  it('逾期未收到期次 + in_progress → true', () => {
    const plans = [
      { dueDate: '2026-07-01', amount: 50000 },
      { dueDate: '2026-09-01', amount: 50000 },
    ];
    const collections = [{ amount: 0 }];
    expect(suggestCollecting('in_progress' as CaseStatus, plans, collections, '2026-08-01')).toBe(true);
  });

  it('已足额收到 → false', () => {
    const plans = [{ dueDate: '2026-07-01', amount: 50000 }];
    const collections = [{ amount: 50000 }];
    expect(suggestCollecting('in_progress' as CaseStatus, plans, collections, '2026-08-01')).toBe(false);
  });

  it('completed 状态不建议催款', () => {
    expect(suggestCollecting('completed' as CaseStatus, [], [], '2026-08-01')).toBe(false);
  });
});
