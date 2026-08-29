import { describe, expect, it } from 'vitest';
import {
  buildInitialUnits,
  buildQuoteTodos,
  canEditStage,
  computeAddedRoleSubtotal,
  computeAmountBreakdown,
  computeOnsiteSubtotal,
  computeTravelSubtotal,
  computeUnitTotal,
  deriveStage,
  getPendingOwner,
  getPendingRoles,
  getStageAccess,
  groupSubFeatures,
  isExpired,
  nextVersion,
  packModule,
  removeRoleFromUnits,
  resetAuditNodes,
  resolveAuditOutcome,
  sortUnitsByFeatureList,
  sumEvalDays,
  sumEvalDaysByRole,
  TECH_DAILY_RATE,
  ungroupUnit,
  validateBeforeAudit,
  validateFeatureList,
} from '../quoteFlow';
import { buildInitialAuditNodes, type EvalSheet, type FeatureModule, type Quote, type QuoteStatus } from '../types';

const ROLE_KEYS = ['pm_days', 'fe_days', 'be_days'];

function buildModule(): FeatureModule {
  return {
    id: 'm1',
    name: '产品中心',
    sort: 1,
    subFeatures: [
      { id: 'm1-1', name: '分类导航', description: '多级分类' },
      { id: 'm1-2', name: '产品推荐', description: '热门标签' },
      { id: 'm1-3', name: '产品详情', description: '多 SKU' },
    ],
  };
}

function buildEvalSheet(): EvalSheet {
  return {
    id: 'EV-1',
    evaluator: '罗总',
    activeRoles: [
      { key: 'pm_days', name: '产品经理' },
      { key: 'fe_days', name: '前端开发' },
      { key: 'be_days', name: '后端开发' },
    ],
    evaluationUnits: [
      {
        id: 'u1',
        granularity: 'SINGLE',
        moduleName: '产品中心',
        moduleId: 'm1',
        boundSubFeatureIds: ['m1-1'],
        manualWorkload: { pm_days: 1, fe_days: 2, be_days: 3 },
        totalDays: 6,
        riskLevel: 'LOW',
      },
      {
        id: 'u2',
        granularity: 'SINGLE',
        moduleName: '产品中心',
        moduleId: 'm1',
        boundSubFeatureIds: ['m1-2'],
        manualWorkload: { pm_days: 0.5, fe_days: 1.5, be_days: 2 },
        totalDays: 4,
        riskLevel: 'MEDIUM',
      },
    ],
    manualWorkDays: 20,
    techSolutionNote: 'Uni-App + Java',
  };
}

function buildQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'q1',
    quoteNo: 'ZK-20260814-001',
    version: 'v1.0',
    status: 'pending_quote',
    leadId: 'lead-1',
    basicInfo: {
      projectName: '微官网项目',
      projectType: '企业展示',
      creatorName: '张产品',
      techEvaluatorName: '罗总',
      requirementDesc: '',
      customerName: '和昇塑料',
      customerContact: '吴总',
      customerPhone: '159',
      quoteValidityDays: 30,
    },
    featureList: [buildModule()],
    evalSheet: buildEvalSheet(),
    salesAddedRoles: [
      { id: 'ar1', roleName: 'PMO', headcount: 1, days: 5, dailyRate: 800, subtotal: 4000, reason: '现场汇报' },
    ],
    frontendConfig: { platforms: [] },
    backendConfig: { services: [], language: 'Java' },
    travelOnsite: { enableTravel: false, travelSubtotal: 0, enableOnsite: false, onsiteSubtotal: 0 },
    otherCosts: [{ id: 'c1', name: '阿里云', amount: 2000 }],
    summary: {
      totalLaborDays: 15,
      projectWorkDays: 20,
      grandTotalPrice: 12000,
      paymentTerms: [
        { stage: '首付', percent: 50, amount: 6000 },
        { stage: '尾款', percent: 50, amount: 6000 },
      ],
      taxIncluded: true,
      warrantyYears: 1,
    },
    auditNodes: buildInitialAuditNodes(),
    stampNode: { stamperName: '黄海', status: 'LOCKED' },
    salesOwnerName: '张三',
    timeline: [],
    ccSalesNames: ['张三'],
    createdAt: '2026-08-14 10:00',
    updatedAt: '2026-08-14 10:00',
    ...overrides,
  };
}

describe('deriveStage', () => {
  const cases: [QuoteStatus, number][] = [
    ['draft', 1],
    ['pending_eval', 2],
    ['pending_quote', 3],
    ['rejected', 3],
    ['auditing', 4],
    ['pending_stamp', 4],
    ['stamped', 4],
    ['sent', 4],
    ['confirmed', 4],
    ['voided', 4],
  ];

  it.each(cases)('%s → 阶段 %i', (status, stage) => {
    expect(deriveStage(status)).toBe(stage);
  });
});

describe('阶段权限矩阵', () => {
  it('未到达的阶段锁定，已过阶段只读', () => {
    const quote = buildQuote({ status: 'pending_quote' });
    expect(getStageAccess(quote, 'sales', 4)).toBe('locked');
    expect(getStageAccess(quote, 'sales', 1)).toBe('readonly');
    expect(getStageAccess(quote, 'sales', 2)).toBe('readonly');
    expect(getStageAccess(quote, 'sales', 3)).toBe('editable');
  });

  it('阶段责任角色之外的人只读', () => {
    const quote = buildQuote({ status: 'pending_eval' });
    expect(canEditStage(quote, 'tech', 2)).toBe(true);
    expect(canEditStage(quote, 'sales', 2)).toBe(false);
    expect(canEditStage(quote, 'pm', 2)).toBe(false);
  });

  it('pending_quote 进入阶段 3，销售可进行报价配置', () => {
    const quote = buildQuote({ status: 'pending_quote' });
    expect(getStageAccess(quote, 'sales', 3)).toBe('editable');
    expect(getStageAccess(quote, 'tech', 3)).toBe('readonly');
  });

  it('审批中只有三位会签人可操作，董助不可', () => {
    const quote = buildQuote({ status: 'auditing' });
    expect(canEditStage(quote, 'sales_manager', 4)).toBe(true);
    expect(canEditStage(quote, 'tech', 4)).toBe(true);
    expect(canEditStage(quote, 'decision', 4)).toBe(true);
    expect(canEditStage(quote, 'assistant', 4)).toBe(false);
    expect(canEditStage(quote, 'sales', 4)).toBe(false);
  });

  it('待盖章只有董助可操作', () => {
    const quote = buildQuote({ status: 'pending_stamp' });
    expect(canEditStage(quote, 'assistant', 4)).toBe(true);
    expect(canEditStage(quote, 'decision', 4)).toBe(false);
  });

  it('已盖章后由销售登记发送', () => {
    const quote = buildQuote({ status: 'stamped' });
    expect(canEditStage(quote, 'sales', 4)).toBe(true);
    expect(canEditStage(quote, 'assistant', 4)).toBe(false);
  });

  it('终态单据任何角色都不可编辑', () => {
    for (const status of ['confirmed', 'voided'] as QuoteStatus[]) {
      const quote = buildQuote({ status });
      for (const role of ['pm', 'tech', 'sales', 'sales_manager', 'decision', 'assistant'] as const) {
        expect(canEditStage(quote, role, 4)).toBe(false);
      }
    }
  });
});

describe('会签结果推导', () => {
  it('全部通过 → 待盖章', () => {
    const nodes = buildInitialAuditNodes().map((n) => ({ ...n, status: 'APPROVED' as const }));
    expect(resolveAuditOutcome(nodes)).toBe('pending_stamp');
  });

  it('任一驳回 → 驳回待修改，即使其他人已通过', () => {
    const nodes = buildInitialAuditNodes();
    nodes[0] = { ...nodes[0], status: 'APPROVED' };
    nodes[1] = { ...nodes[1], status: 'REJECTED' };
    expect(resolveAuditOutcome(nodes)).toBe('rejected');
  });

  it('部分通过仍在审批中', () => {
    const nodes = buildInitialAuditNodes();
    nodes[0] = { ...nodes[0], status: 'APPROVED' };
    expect(resolveAuditOutcome(nodes)).toBe('auditing');
  });

  it('重置后三人全部回到待审批，禁止部分沿用', () => {
    const reset = resetAuditNodes();
    expect(reset).toHaveLength(3);
    expect(reset.every((n) => n.status === 'PENDING')).toBe(true);
    expect(reset.every((n) => !n.auditTime && !n.comment)).toBe(true);
  });
});

describe('金额汇总', () => {
  it('技术人天按日均单价折算，增项独立归集', () => {
    const b = computeAmountBreakdown(buildQuote());
    expect(b.techDays).toBe(10);
    expect(b.techLaborCost).toBe(10 * TECH_DAILY_RATE);
    expect(b.addedDays).toBe(5);
    expect(b.addedCost).toBe(4000);
    expect(b.totalLaborDays).toBe(15);
    expect(b.selfPaidSubtotal).toBe(2000);
    // 自费项目不进总价（ADR 0031）
    expect(b.grandTotal).toBe(6000 + 4000);
  });

  it('本单岗位日成本覆盖会进入唯一总价口径', () => {
    const quote = buildQuote({ roleDailyCosts: { pm_days: 1000, fe_days: 800, be_days: 500 } });
    const breakdown = computeAmountBreakdown(quote);
    expect(breakdown.techLaborCost).toBe(1.5 * 1000 + 3.5 * 800 + 5 * 500);
    expect(breakdown.grandTotal).toBe(breakdown.techLaborCost + breakdown.addedCost);
  });

  it('未开启差旅时不计入总价', () => {
    const quote = buildQuote({
      travelOnsite: { enableTravel: false, travelSubtotal: 5000, enableOnsite: false, onsiteSubtotal: 3000 },
    });
    const b = computeAmountBreakdown(quote);
    expect(b.travelSubtotal).toBe(0);
    expect(b.onsiteSubtotal).toBe(0);
  });

  it('占比之和为 1', () => {
    const b = computeAmountBreakdown(buildQuote());
    const sum = b.ratios.labor + b.ratios.travelOnsite + b.ratios.other;
    expect(sum).toBeCloseTo(1, 5);
  });

  it('总价为 0 时占比不产生 NaN', () => {
    const quote = buildQuote({ evalSheet: undefined, salesAddedRoles: [], otherCosts: [] });
    const b = computeAmountBreakdown(quote);
    expect(b.grandTotal).toBe(0);
    expect(b.ratios.labor).toBe(0);
  });

  it('按岗位汇总人天', () => {
    const byRole = sumEvalDaysByRole(buildEvalSheet());
    expect(byRole.pm_days).toBe(1.5);
    expect(byRole.fe_days).toBe(3.5);
    expect(byRole.be_days).toBe(5);
    expect(sumEvalDays(buildEvalSheet())).toBe(10);
  });

  it('行小计只累加当前激活岗位', () => {
    const unit = buildEvalSheet().evaluationUnits[0];
    expect(computeUnitTotal(unit, ROLE_KEYS)).toBe(6);
    expect(computeUnitTotal(unit, ['pm_days'])).toBe(1);
  });

  it('差旅与驻场按明细计算', () => {
    expect(
      computeTravelSubtotal({
        location: '武汉',
        headcount: 2,
        days: 3,
        transportFee: 1000,
        hotelFeePerDay: 300,
        allowancePerDay: 100,
      }),
    ).toBe(1000 * 2 + 400 * 2 * 3);

    expect(
      computeOnsiteSubtotal({ location: '武汉', headcount: 1, days: 5, serviceFeePerDay: 800 }),
    ).toBe(4000);
  });

  it('增项小计 = 人数 × 天数 × 日均单价', () => {
    expect(computeAddedRoleSubtotal({ headcount: 2, days: 5, dailyRate: 800 })).toBe(8000);
  });
});

describe('提交审批前硬校验', () => {
  it('数据完整时无告警', () => {
    expect(validateBeforeAudit(buildQuote())).toEqual([]);
  });

  it('缺少人天评估时拦截', () => {
    const issues = validateBeforeAudit(buildQuote({ evalSheet: undefined }));
    expect(issues.some((i) => i.code === 'no_eval')).toBe(true);
  });

  it('付款比例不等于 100% 时拦截', () => {
    const quote = buildQuote();
    quote.summary!.paymentTerms = [{ stage: '首付', percent: 60, amount: 0 }];
    const issues = validateBeforeAudit(quote);
    expect(issues.some((i) => i.code === 'payment_percent')).toBe(true);
  });

  it('未配置付款方式时拦截', () => {
    const quote = buildQuote();
    quote.summary!.paymentTerms = [];
    expect(validateBeforeAudit(quote).some((i) => i.code === 'payment_percent')).toBe(true);
  });

  it('开启差旅但金额为 0 时拦截', () => {
    const quote = buildQuote({
      travelOnsite: { enableTravel: true, travelSubtotal: 0, enableOnsite: false, onsiteSubtotal: 0 },
    });
    expect(validateBeforeAudit(quote).some((i) => i.code === 'travel_amount')).toBe(true);
  });

  it('总报价为 0 时拦截', () => {
    const quote = buildQuote({ evalSheet: undefined, salesAddedRoles: [], otherCosts: [] });
    expect(validateBeforeAudit(quote).some((i) => i.code === 'no_price')).toBe(true);
  });

  it('补充报价允许 0 元或负向调整语义，不触发主报价 no_price', () => {
    const quote = buildQuote({ isSupplement: true, evalSheet: undefined, salesAddedRoles: [], otherCosts: [] });
    expect(validateBeforeAudit(quote).some((i) => i.code === 'no_price')).toBe(false);
  });

  it('数字一致性问题为 warning，步骤缺失为 error', () => {
    const warningQuote = buildQuote();
    warningQuote.summary!.paymentTerms = [{ stage: '首付', percent: 90, amount: 0 }];
    expect(validateBeforeAudit(warningQuote).find((i) => i.code === 'payment_percent')?.severity).toBe('warning');
    const errorQuote = buildQuote({ evalSheet: undefined, salesAddedRoles: [], otherCosts: [] });
    expect(validateBeforeAudit(errorQuote).find((i) => i.code === 'no_eval')?.severity).toBe('error');
  });
});

describe('功能清单校验', () => {
  it('空清单被拦截', () => {
    expect(validateFeatureList([]).length).toBeGreaterThan(0);
    expect(validateFeatureList([{ id: 'm', name: '空模块', sort: 1, subFeatures: [] }]).length).toBeGreaterThan(0);
  });

  it('有子功能时可通过校验', () => {
    const module = buildModule();
    expect(validateFeatureList([module])).toEqual([]);
  });
});

describe('切片重组', () => {
  it('初始评估表为逐项 SINGLE', () => {
    const units = buildInitialUnits([buildModule()], ROLE_KEYS);
    expect(units).toHaveLength(3);
    expect(units.every((u) => u.granularity === 'SINGLE')).toBe(true);
    expect(units[0].manualWorkload.pm_days).toBe(0);
  });

  it('整模块打包收敛为单个 MODULE_PACK 且覆盖全部子功能', () => {
    const module = buildModule();
    const units = buildInitialUnits([module], ROLE_KEYS);
    const packed = packModule(units, module, ROLE_KEYS);
    expect(packed).toHaveLength(1);
    expect(packed[0].granularity).toBe('MODULE_PACK');
    expect(packed[0].boundSubFeatureIds).toEqual(['m1-1', 'm1-2', 'm1-3']);
  });

  it('多项合并生成 SUB_GROUP，未选中项保留为单项', () => {
    const module = buildModule();
    const units = buildInitialUnits([module], ROLE_KEYS);
    const grouped = groupSubFeatures(units, module, ['m1-1', 'm1-2'], ROLE_KEYS, '浏览展示');
    expect(grouped).toHaveLength(2);
    const group = grouped.find((u) => u.granularity === 'SUB_GROUP')!;
    expect(group.boundSubFeatureIds).toEqual(['m1-1', 'm1-2']);
    expect(group.groupName).toBe('浏览展示');
    expect(grouped.filter((u) => u.granularity === 'SINGLE')).toHaveLength(1);
  });

  it('少于两项无法合并', () => {
    const module = buildModule();
    const units = buildInitialUnits([module], ROLE_KEYS);
    expect(groupSubFeatures(units, module, ['m1-1'], ROLE_KEYS)).toBe(units);
  });

  it('跨模块子功能无法合并', () => {
    const module = buildModule();
    const units = buildInitialUnits([module], ROLE_KEYS);
    expect(groupSubFeatures(units, module, ['m1-1', 'other-1'], ROLE_KEYS)).toBe(units);
  });

  it('从打包中拆分还原为逐项', () => {
    const module = buildModule();
    const packed = packModule(buildInitialUnits([module], ROLE_KEYS), module, ROLE_KEYS);
    const result = ungroupUnit(packed, packed[0].id, module, ROLE_KEYS);
    expect(result.units).toHaveLength(3);
    expect(result.units.every((u) => u.granularity === 'SINGLE')).toBe(true);
  });

  it('打包后再合并局部，不丢失剩余子功能', () => {
    const module = buildModule();
    let units = buildInitialUnits([module], ROLE_KEYS);
    units = groupSubFeatures(units, module, ['m1-1', 'm1-2'], ROLE_KEYS);
    // 覆盖到的子功能总数应仍为 3
    const covered = units.flatMap((u) => u.boundSubFeatureIds);
    expect(new Set(covered).size).toBe(3);
  });

  it('SINGLE 单元无法再拆分', () => {
    const module = buildModule();
    const units = buildInitialUnits([module], ROLE_KEYS);
    const result = ungroupUnit(units, units[0].id, module, ROLE_KEYS);
    expect(result.units).toEqual(units);
  });

  it('移除岗位后清掉该列并重算行小计', () => {
    const units = buildEvalSheet().evaluationUnits;
    const next = removeRoleFromUnits(units, 'be_days', ['pm_days', 'fe_days']);
    expect(next[0].manualWorkload.be_days).toBeUndefined();
    expect(next[0].totalDays).toBe(3);
  });

  it('评估单元按功能清单顺序排序', () => {
    const module = buildModule();
    const units = buildInitialUnits([module], ROLE_KEYS).reverse();
    const sorted = sortUnitsByFeatureList(units, [module]);
    expect(sorted.map((u) => u.boundSubFeatureIds[0])).toEqual(['m1-1', 'm1-2', 'm1-3']);
  });
});

describe('版本与待办人', () => {
  it('版本号主版本递增', () => {
    expect(nextVersion('v1.0')).toBe('v2.0');
    expect(nextVersion('v2.0')).toBe('v3.0');
    expect(nextVersion('bad')).toBe('v2.0');
  });

  it('审批中列出尚未表态的会签人', () => {
    const quote = buildQuote({ status: 'auditing' });
    quote.auditNodes[0] = { ...quote.auditNodes[0], status: 'APPROVED' };
    expect(getPendingOwner(quote)).toContain('罗总');
    expect(getPendingOwner(quote)).toContain('闵总');
    expect(getPendingOwner(quote)).not.toContain('黄奕');
  });

  it('各状态都有明确待办人', () => {
    const statuses: QuoteStatus[] = ['draft', 'pending_eval', 'pending_quote', 'pending_stamp', 'stamped'];
    for (const status of statuses) {
      expect(getPendingOwner(buildQuote({ status }))).not.toBe('—');
    }
  });

  it('pending_quote/rejected/stamped/sent 使用 salesOwnerName 而非写死张三', () => {
    const q = buildQuote({ status: 'pending_quote', salesOwnerName: '李四' });
    expect(getPendingOwner(q)).toContain('李四');
    expect(getPendingOwner(q)).not.toContain('张三');
  });
});

describe('待办推导（getPendingRoles / buildQuoteTodos）', () => {
  it('各状态对应正确的待处理角色', () => {
    expect(getPendingRoles(buildQuote({ status: 'draft' }))).toEqual(['pm']);
    expect(getPendingRoles(buildQuote({ status: 'pending_eval' }))).toEqual(['tech']);
    expect(getPendingRoles(buildQuote({ status: 'pending_quote' }))).toEqual(['sales']);
    expect(getPendingRoles(buildQuote({ status: 'rejected' }))).toEqual(['sales']);
    expect(getPendingRoles(buildQuote({ status: 'pending_stamp' }))).toEqual(['assistant']);
    expect(getPendingRoles(buildQuote({ status: 'stamped' }))).toEqual(['sales']);
    expect(getPendingRoles(buildQuote({ status: 'sent' }))).toEqual(['sales']);
    expect(getPendingRoles(buildQuote({ status: 'confirmed' }))).toEqual([]);
    expect(getPendingRoles(buildQuote({ status: 'voided' }))).toEqual([]);
  });

  it('审批中只返回未表态的会签人', () => {
    const quote = buildQuote({ status: 'auditing' });
    quote.auditNodes[0] = { ...quote.auditNodes[0], status: 'APPROVED' }; // 黄奕已通过
    expect(getPendingRoles(quote)).toEqual(['tech', 'decision']);
  });

  it('buildQuoteTodos 只生成当前角色待处理的报价待办', () => {
    const quotes = [
      buildQuote({ id: 'q-draft', status: 'draft' }),
      buildQuote({ id: 'q-eval', status: 'pending_eval' }),
      buildQuote({ id: 'q-sales', status: 'pending_quote' }),
    ];
    const salesTodos = buildQuoteTodos(quotes, 'sales');
    expect(salesTodos).toHaveLength(1);
    expect(salesTodos[0].id).toBe('quote-todo-q-sales');
    expect(salesTodos[0].source).toBe('quotation');
    expect(salesTodos[0].route).toBe('/quotation/q-sales');

    const techTodos = buildQuoteTodos(quotes, 'tech');
    expect(techTodos.map((t) => t.id)).toEqual(['quote-todo-q-eval']);
  });

  it('终态报价不生成待办', () => {
    const quotes = [buildQuote({ id: 'q-confirmed', status: 'confirmed' })];
    expect(buildQuoteTodos(quotes, 'sales')).toEqual([]);
  });
});

describe('isExpired 过期判断', () => {
  it('sent + sentAt + 29 天 → 未过期', () => {
    const quote = buildQuote({ status: 'sent', sentAt: '2026-08-01 10:00' });
    expect(isExpired(quote, '2026-08-30')).toBe(false);
  });

  it('sent + sentAt + 30 天 → 过期（默认 30 天）', () => {
    const quote = buildQuote({ status: 'sent', sentAt: '2026-08-01 10:00' });
    expect(isExpired(quote, '2026-08-31')).toBe(true);
  });

  it('自定义有效期 quoteValidityDays=7 覆盖默认', () => {
    const quote = buildQuote({
      status: 'sent',
      sentAt: '2026-08-01 10:00',
      basicInfo: { ...buildQuote().basicInfo, quoteValidityDays: 7 },
    });
    expect(isExpired(quote, '2026-08-07')).toBe(false);
    expect(isExpired(quote, '2026-08-08')).toBe(true);
  });

  it('非 sent 状态恒不过期（含 confirmed）', () => {
    for (const status of ['draft', 'pending_eval', 'auditing', 'stamped', 'confirmed', 'voided'] as QuoteStatus[]) {
      expect(isExpired(buildQuote({ status, sentAt: '2020-01-01 00:00' }), '2030-01-01')).toBe(false);
    }
  });

  it('sentAt 缺失恒不过期', () => {
    const quote = buildQuote({ status: 'sent', sentAt: undefined });
    expect(isExpired(quote, '2030-01-01')).toBe(false);
  });
});
