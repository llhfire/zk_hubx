import { describe, it, expect } from 'vitest';
import { computePaymentStatus, computeKanbanSummary, computePlanStatusRows, effectiveAmount, getLatestDunning, getPaymentPeriodLabel, PLAN_STATUS_META } from '../paymentUtils';
import type { Contract } from '../types';
import { buildRecoveryBoardContracts } from '../recoveryBoardData';

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'test-1',
    contractNo: 'CT202607001',
    status: 'archived',
    current: {
      contractName: '测试合同',
      productCategory: '软件开发',
      signingEntity: '北京科技',
      customerName: '测试客户',
      customerContact: '张经理',
      customerPhone: '13800138000',
      customerEmail: '',
      customerAddress: '',
      customerTaxNo: '',
      bankName: '',
      bankAccount: '',
      contractContent: '',
      signDate: '2026-01-01',
      effectiveDate: '2026-01-01',
      endDate: '2026-12-31',
      paymentMethod: '对公',
      totalAmount: 100000,
      rebateAmount: 0,
      paymentPlans: [
        { period: 1, expectedDate: '2026-03-01', amount: 50000, percentage: 50 },
        { period: 2, expectedDate: '2026-06-01', amount: 50000, percentage: 50 },
      ],
      templateId: 'software_sales',
    },
    versionHistory: [],
    approvalFlow: [],
    archivedScans: [],
    createdAt: '2026-01-01',
    createdBy: '张三',
    updatedAt: '2026-01-01',
    collectionRecords: [],
    paymentBlockers: [],
    dunningRecords: [],
    ...overrides,
  };
}

describe('computePaymentStatus', () => {
  it('returns settled when all paid', () => {
    const c = makeContract({
      collectionRecords: [
        { id: '1', contractId: 'test-1', amount: 100000, date: '2026-06-01', method: '汇款', note: '' },
      ],
    });
    expect(computePaymentStatus(c)).toBe('settled');
  });

  it('returns blocked when there are unresolved blockers', () => {
    const c = makeContract({
      paymentBlockers: [
        { id: 'b1', contractId: 'test-1', type: 'customer_delay', title: '拖', description: '', amountBlocked: 50000, createdAt: '' },
      ],
    });
    expect(computePaymentStatus(c)).toBe('blocked');
  });

  it('卡点按付款期次生效，已结清期次的卡点不阻塞合同', () => {
    const settledPeriodBlocker = makeContract({
      collectionRecords: [{ id: '1', contractId: 'test-1', amount: 50000, date: '2026-03-01', method: '汇款', note: '', period: 1 }],
      paymentBlockers: [{ id: 'b1', contractId: 'test-1', paymentPeriod: 1, type: 'acceptance_stuck', title: '首期卡点', description: '', amountBlocked: 50000, createdAt: '2026-08-01' }],
    });
    const openPeriodBlocker = makeContract({
      collectionRecords: [{ id: '1', contractId: 'test-1', amount: 50000, date: '2026-03-01', method: '汇款', note: '', period: 1 }],
      paymentBlockers: [{ id: 'b2', contractId: 'test-1', paymentPeriod: 2, type: 'acceptance_stuck', title: '中期卡点', description: '', amountBlocked: 50000, createdAt: '2026-08-01' }],
    });

    expect(computePaymentStatus(settledPeriodBlocker, new Date('2026-08-01'))).toBe('overdue');
    expect(computePaymentStatus(openPeriodBlocker, new Date('2026-08-01'))).toBe('blocked');
    expect(getPaymentPeriodLabel(openPeriodBlocker, 2)).toBe('第2期 · 付款');
  });

  it('returns overdue when payment date passed with 7-day buffer', () => {
    const c = makeContract({
      collectionRecords: [
        { id: '1', contractId: 'test-1', amount: 30000, date: '2026-03-01', method: '汇款', note: '' },
      ],
    });
    expect(computePaymentStatus(c, new Date('2026-07-01'))).toBe('overdue');
  });

  it('returns normal when within 7-day buffer', () => {
    const c = makeContract({
      collectionRecords: [
        { id: '1', contractId: 'test-1', amount: 50000, date: '2026-03-01', method: '汇款', note: '' },
      ],
    });
    expect(computePaymentStatus(c, new Date('2026-06-05'))).toBe('normal');
  });

  it('returns upcoming when next payment within 7 days', () => {
    const c = makeContract();
    expect(computePaymentStatus(c, new Date('2026-02-25'))).toBe('upcoming');
  });
});

describe('computeKanbanSummary', () => {
  it('calculates summary correctly', () => {
    const c1 = makeContract({
      collectionRecords: [
        { id: '1', contractId: 'test-1', amount: 100000, date: '2026-07-01', method: '', note: '' },
      ],
    });
    const c2 = makeContract({
      id: 'test-2',
      contractNo: 'CT202607002',
      current: {
        ...makeContract().current,
        totalAmount: 200000,
        paymentPlans: [
          { period: 1, expectedDate: '2026-08-01', amount: 200000, percentage: 100 },
        ],
      },
    });
    const summary = computeKanbanSummary([c1, c2], new Date('2026-07-15'));
    expect(summary.totalContracts).toBe(2);
    expect(summary.totalReceivable).toBe(300000);
    expect(summary.monthlyCollected).toBe(100000);
    expect(summary.upcomingMonthEstimate).toBe(200000);
  });
});

describe('effectiveAmount', () => {
  it('只把已归档补充合同计入有效标的额，并支持负向变更', () => {
    const main = makeContract();
    const archivedIncrease = makeContract({
      id: 'supplement-1', kind: 'supplement', parentContractId: main.id,
      current: { ...main.current, totalAmount: 20_000 },
    });
    const archivedDecrease = makeContract({
      id: 'supplement-2', kind: 'supplement', parentContractId: main.id,
      current: { ...main.current, totalAmount: -5_000 },
    });
    const draft = makeContract({
      id: 'supplement-3', kind: 'supplement', parentContractId: main.id, status: 'draft',
      current: { ...main.current, totalAmount: 30_000 },
    });
    const voided = makeContract({
      id: 'supplement-4', kind: 'supplement', parentContractId: main.id, status: 'voided',
      current: { ...main.current, totalAmount: 40_000 },
    });

    expect(effectiveAmount(main, [archivedIncrease, archivedDecrease, draft, voided])).toBe(115_000);
  });
});

describe('getLatestDunning', () => {
  it('returns latest dunning record', () => {
    const records = [
      { id: '1', contractId: 't1', date: '2026-06-01', method: '电话', contactPerson: '王', result: '', nextPlan: '' },
      { id: '2', contractId: 't1', date: '2026-06-28', method: '微信', contactPerson: '王', result: '', nextPlan: '' },
    ];
    expect(getLatestDunning(records)?.id).toBe('2');
  });

  it('returns null for empty array', () => {
    expect(getLatestDunning([])).toBeNull();
  });
});

describe('computePlanStatusRows（阶段 3 回款 Tab）', () => {
  it('中铁安全信息化平台按期次关联到账，尾款不能被前两期累计金额误判为已收', () => {
    const contract = buildRecoveryBoardContracts().find((item) => item.current.customerName === '中国铁建电气化局集团有限公司');
    expect(contract).toBeDefined();
    const rows = computePlanStatusRows(contract!, new Date('2026-09-02'));
    expect(rows.map((row) => row.allocated)).toEqual([11_500, 9_200, 0]);
    expect(rows.map((row) => row.status)).toEqual(['paid', 'paid', 'overdue']);
  });

  it('已回款按期次顺序分摊：第一期收足、第二期未收且未到期为待收', () => {
    const c = makeContract();
    (c as unknown as { collectionRecords: Array<{ amount: number }> }).collectionRecords = [
      { amount: 50000 },
    ];
    const rows = computePlanStatusRows(c, new Date('2026-04-01'));
    expect(rows[0].status).toBe('paid');
    expect(rows[0].allocated).toBe(50000);
    expect(rows[1].status).toBe('pending');
    expect(rows[1].allocated).toBe(0);
  });

  it('部分到账且超期 -> 逾期；7 天内到期 -> 即将到期', () => {
    const c = makeContract();
    (c as unknown as { collectionRecords: Array<{ amount: number }> }).collectionRecords = [
      { amount: 10000 },
    ];
    // 第一期 2026-03-01，now=2026-03-05 距到期 7 天内：部分到账
    const rowsSoon = computePlanStatusRows(c, new Date('2026-03-05'));
    expect(rowsSoon[0].status).toBe('partial');
    // now=2026-03-20 已超预计日期+缓冲：逾期
    const rowsLate = computePlanStatusRows(c, new Date('2026-03-20'));
    expect(rowsLate[0].status).toBe('overdue');
  });

  it('全部收足后每一期都是已收', () => {
    const c = makeContract();
    (c as unknown as { collectionRecords: Array<{ amount: number }> }).collectionRecords = [
      { amount: 50000 },
      { amount: 50000 },
    ];
    const rows = computePlanStatusRows(c, new Date('2026-07-01'));
    expect(rows.every((r) => r.status === 'paid')).toBe(true);
  });

  it('一笔两期合付按明确分配更新两期状态，不重复计算金额', () => {
    const c = makeContract({
      collectionRecords: [{
        id: 'multi-1', contractId: 'test-1', amount: 70_000, date: '2026-04-01', method: '汇款', note: '',
        periods: [1, 2],
        periodAllocations: [{ period: 1, amount: 50_000 }, { period: 2, amount: 20_000 }],
      }],
    });

    const rows = computePlanStatusRows(c, new Date('2026-04-01'));
    expect(rows.map((row) => row.allocated)).toEqual([50_000, 20_000]);
    expect(rows.map((row) => row.status)).toEqual(['paid', 'partial']);
    expect(PLAN_STATUS_META.partial.label).toBe('部分已收');
  });

  it('指定第二期的实收不会错误冲抵第一期', () => {
    const c = makeContract({
      collectionRecords: [{ id: 'period-2', contractId: 'test-1', period: 2, amount: 50_000, date: '2026-06-01', method: '汇款', note: '' }],
    });

    const rows = computePlanStatusRows(c, new Date('2026-04-01'));
    expect(rows.map((row) => row.allocated)).toEqual([0, 50_000]);
  });
});
