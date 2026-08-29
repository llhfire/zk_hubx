/**
 * 合同回款看板 P1 单测 — paymentCalc.ts 纯函数
 */
import { describe, it, expect } from 'vitest';
import {
  derivePaymentStatus,
  deriveCertaintyLevel,
  deriveCollectionProgress,
  findNextPayPeriod,
  periodReceivedAmount,
  buildGanttNodes,
  aggregateCashflow,
  deriveKanbanSummary,
} from '../paymentCalc';
import type { Contract, PaymentPlanItem, CollectionRecord, PaymentBlocker } from '../../types';
import type { ForecastOverride } from '../types';

// ==================== 夹具 ====================

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'c1',
    contractNo: 'HT-001',
    name: '测试合同',
    customerName: '测试客户',
    totalAmount: 100000,
    status: 'active',
    salesOwner: '张三',
    paymentPlans: [
      { periodNo: 1, planName: '首期款', amount: 30000, expectedDate: '2026-06-15', status: 'received' },
      { periodNo: 2, planName: '中期款', amount: 40000, expectedDate: '2026-08-15', status: 'pending' },
      { periodNo: 3, planName: '尾款', amount: 30000, expectedDate: '2026-10-15', status: 'pending' },
    ],
    collectionRecords: [
      { id: 'cr1', contractId: 'c1', amount: 30000, date: '2026-06-20', method: '对公转账', period: 1 },
    ],
    paymentBlockers: [],
    dunningRecords: [],
    ...overrides,
  } as Contract;
}

// ==================== derivePaymentStatus ====================

describe('derivePaymentStatus', () => {
  it('全额到账 → settled', () => {
    const c = makeContract({
      totalAmount: 30000,
      collectionRecords: [{ id: 'cr1', contractId: 'c1', amount: 30000, date: '2026-06-20', method: '对公转账', period: 1 }],
    });
    expect(derivePaymentStatus(c)).toBe('settled');
  });

  it('有未解决卡点 → blocked', () => {
    const c = makeContract({
      paymentBlockers: [{ id: 'b1', contractId: 'c1', type: 'acceptance_stuck', title: '验收卡住', description: '', amountBlocked: 40000, createdAt: '2026-08-01', createdBy: '张三', ownerId: '张三' }],
    });
    expect(derivePaymentStatus(c)).toBe('blocked');
  });

  it('逾期未结清无卡点 → overdue', () => {
    const c = makeContract({
      paymentPlans: [
        { periodNo: 1, planName: '首期款', amount: 30000, expectedDate: '2026-06-15', status: 'received' },
        { periodNo: 2, planName: '中期款', amount: 40000, expectedDate: '2026-08-01', status: 'pending' },
      ],
    });
    expect(derivePaymentStatus(c, '2026-08-10')).toBe('overdue');
  });

  it('7 天内到期 → upcoming', () => {
    const c = makeContract();
    expect(derivePaymentStatus(c, '2026-08-12')).toBe('upcoming');
  });

  it('正常履约期 → normal', () => {
    const c = makeContract();
    expect(derivePaymentStatus(c, '2026-08-01')).toBe('normal');
  });

  it('已解决的卡点不影响状态', () => {
    const c = makeContract({
      paymentBlockers: [{ id: 'b1', contractId: 'c1', type: 'acceptance_stuck', title: '验收卡住', description: '', amountBlocked: 40000, createdAt: '2026-08-01', createdBy: '张三', ownerId: '张三', resolvedAt: '2026-08-05', resolvedBy: '张三' }],
    });
    expect(derivePaymentStatus(c, '2026-08-01')).toBe('normal');
  });
});

// ==================== deriveCertaintyLevel ====================

describe('deriveCertaintyLevel', () => {
  it('有未解决卡点 → blocked', () => {
    expect(deriveCertaintyLevel(makeContract(), 0, true)).toBe('blocked');
  });

  it('交付延期 >7 天 → low', () => {
    expect(deriveCertaintyLevel(makeContract(), 10)).toBe('low');
  });

  it('交付延期 3-7 天 → medium', () => {
    expect(deriveCertaintyLevel(makeContract(), 5)).toBe('medium');
  });

  it('正常推进 → high', () => {
    expect(deriveCertaintyLevel(makeContract(), 0)).toBe('high');
  });
});

// ==================== deriveCollectionProgress ====================

describe('deriveCollectionProgress', () => {
  it('已收 30000 / 总 100000 → 30%', () => {
    const p = deriveCollectionProgress(makeContract());
    expect(p.received).toBe(30000);
    expect(p.total).toBe(100000);
    expect(p.percentage).toBe(30);
    expect(p.remaining).toBe(70000);
  });

  it('全额到账 → 100%', () => {
    const c = makeContract({
      totalAmount: 30000,
      collectionRecords: [{ id: 'cr1', contractId: 'c1', amount: 30000, date: '2026-06-20', method: '对公转账', period: 1 }],
    });
    const p = deriveCollectionProgress(c);
    expect(p.percentage).toBe(100);
    expect(p.remaining).toBe(0);
  });
});

// ==================== findNextPayPeriod ====================

describe('findNextPayPeriod', () => {
  it('第1期已收完 → 返回第2期', () => {
    const next = findNextPayPeriod(
      makeContract().paymentPlans!,
      makeContract().collectionRecords!,
    );
    expect(next?.periodNo).toBe(2);
  });

  it('全部收完 → null', () => {
    const plans: PaymentPlanItem[] = [
      { periodNo: 1, planName: '全款', amount: 10000, expectedDate: '2026-06-15', status: 'received' },
    ];
    const colls: CollectionRecord[] = [
      { id: 'cr1', contractId: 'c1', amount: 10000, date: '2026-06-20', method: '对公转账', period: 1 },
    ];
    expect(findNextPayPeriod(plans, colls)).toBeNull();
  });
});

// ==================== buildGanttNodes ====================

describe('buildGanttNodes', () => {
  it('生成正确数量的节点', () => {
    const nodes = buildGanttNodes([makeContract()]);
    expect(nodes).toHaveLength(3); // 3 个期次
  });

  it('已结清节点 isSettled=true', () => {
    const nodes = buildGanttNodes([makeContract()]);
    expect(nodes[0].isSettled).toBe(true);
    expect(nodes[1].isSettled).toBe(false);
  });

  it('有卡点时 isBlocked=true', () => {
    const c = makeContract({
      paymentBlockers: [{ id: 'b1', contractId: 'c1', type: 'acceptance_stuck', title: '验收卡住', description: '', amountBlocked: 40000, createdAt: '2026-08-01', createdBy: '张三', ownerId: '张三' }],
    });
    const nodes = buildGanttNodes([c]);
    expect(nodes[1].isBlocked).toBe(true);
  });

  it('调期记录覆盖 forecastDate', () => {
    const overrides: ForecastOverride[] = [{
      id: 'ov1', contractId: 'c1', periodIndex: 2,
      originalDate: '2026-08-15', newForecastDate: '2026-08-25',
      reason: '客户财务每月25日统批', createdBy: '张三', createdAt: '2026-08-10',
    }];
    const nodes = buildGanttNodes([makeContract()], overrides);
    expect(nodes[1].forecastDate).toBe('2026-08-25');
  });

  it('忽略未设置或无效日期的计划，避免甘特图生成 Invalid Date', () => {
    const contract = makeContract({
      paymentPlans: [
        { periodNo: 1, planName: '首期款', amount: 30000, expectedDate: '', status: 'pending' },
        { periodNo: 2, planName: '中期款', amount: 40000, expectedDate: '2026-02-30', status: 'pending' },
        { periodNo: 3, planName: '尾款', amount: 30000, expectedDate: '2026-10-15', status: 'pending' },
      ],
    });

    const nodes = buildGanttNodes([contract]);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].periodIndex).toBe(3);
    expect(Number.isNaN(new Date(nodes[0].forecastDate).getTime())).toBe(false);
  });
});

// ==================== aggregateCashflow ====================

describe('aggregateCashflow', () => {
  it('按月聚合正确', () => {
    const result = aggregateCashflow(
      [makeContract()],
      ['2026-06', '2026-08', '2026-10'],
    );
    expect(result).toHaveLength(3);
    // 6月有第1期30000计划，已收到
    expect(result[0].month).toBe('2026-06');
    // 8月有第2期40000计划
    expect(result[1].month).toBe('2026-08');
  });
});

// ==================== deriveKanbanSummary ====================

describe('deriveKanbanSummary', () => {
  it('KPI 计算正确', () => {
    const summary = deriveKanbanSummary([makeContract()], '2026-08-01');
    expect(summary.totalContracts).toBe(1);
    expect(summary.totalReceivable).toBe(70000); // 100000 - 30000
  });

  it('逾期金额统计', () => {
    const c = makeContract({
      paymentPlans: [
        { periodNo: 1, planName: '首期款', amount: 30000, expectedDate: '2026-06-15', status: 'received' },
        { periodNo: 2, planName: '中期款', amount: 40000, expectedDate: '2026-07-15', status: 'pending' },
      ],
    });
    const summary = deriveKanbanSummary([c], '2026-08-01');
    expect(summary.overdueAmount).toBe(40000);
  });
});
