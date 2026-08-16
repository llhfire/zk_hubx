// 报价流程状态机与计算纯函数
// 集中处理：阶段推导、角色权限矩阵、状态迁移、金额汇总、提交校验、切片重组。
// 这里全部是纯函数，便于 Vitest 覆盖；副作用（setState / Message）留在 Context 与页面。

import {
  buildInitialAuditNodes,
  QUOTE_ROLE_ACTORS,
  QUOTE_STAGE_NAMES,
  QUOTE_STATUS_LABELS,
  type AuditNode,
  type EvalSheet,
  type EvaluationUnit,
  type FeatureModule,
  type Quote,
  type QuoteRole,
  type QuoteStage,
  type QuoteStatus,
  type SalesAddedRole,
  type TravelOnsiteConfig,
} from './types';
import type { TodoItem } from '@/app/todos/types';

// ─── 阶段推导 ─────────────────────────────────────────────

/** 报价单当前所处阶段。阶段不落库，始终由 status 推导，避免两份状态打架 */
export function deriveStage(status: QuoteStatus): QuoteStage {
  switch (status) {
    case 'draft':
      return 1;
    case 'feature_confirmed':
      return 2;
    case 'eval_completed':
      // 评估已完成，罗总提交后销售可进行报价配置
      return 3;
    case 'assigned_sales':
    case 'quote_summarized':
    case 'rejected':
      return 3;
    default:
      // auditing / pending_stamp / stamped / sent / deal / pending_followup / voided
      return 4;
  }
}

/** 已经走过的最高阶段——用于阶段导航判断哪些可回看 */
export function maxReachedStage(status: QuoteStatus): QuoteStage {
  return deriveStage(status);
}

export type StageAccess = 'editable' | 'readonly' | 'locked';

/** 每个阶段的责任角色：只有责任角色在当前阶段才可编辑 */
const STAGE_OWNER_ROLES: Record<QuoteStage, QuoteRole[]> = {
  1: ['pm'],
  2: ['tech'],
  3: ['sales'],  // 罗总评估完成后，销售可进行报价配置
  4: ['sales_manager', 'tech', 'decision', 'assistant'],
};

/**
 * 阶段可访问性矩阵。
 * - 未到达的阶段 locked
 * - 到达过但已流转过去的阶段 readonly（可回看）
 * - 当前阶段且角色匹配 editable，角色不匹配则 readonly
 */
export function getStageAccess(quote: Quote, role: QuoteRole, stage: QuoteStage): StageAccess {
  const current = deriveStage(quote.status);
  if (stage > current) return 'locked';
  if (stage < current) return 'readonly';

  // 终态单据一律只读
  if (isTerminalStatus(quote.status)) return 'readonly';

  // 审批阶段进一步按 status 收敛：待盖章只有董助能动
  if (stage === 4) {
    if (quote.status === 'auditing') {
      return ['sales_manager', 'tech', 'decision'].includes(role) ? 'editable' : 'readonly';
    }
    if (quote.status === 'pending_stamp') {
      return role === 'assistant' ? 'editable' : 'readonly';
    }
    if (quote.status === 'stamped' || quote.status === 'sent') {
      // 盖章后由销售登记发送、成交或作废
      return role === 'sales' ? 'editable' : 'readonly';
    }
    return 'readonly';
  }

  return STAGE_OWNER_ROLES[stage].includes(role) ? 'editable' : 'readonly';
}

export function canEditStage(quote: Quote, role: QuoteRole, stage: QuoteStage): boolean {
  return getStageAccess(quote, role, stage) === 'editable';
}

/** 已结束的单据不再接受任何流转 */
export function isTerminalStatus(status: QuoteStatus): boolean {
  return status === 'deal' || status === 'voided';
}

/** 当前状态下等着谁处理，列表页「当前待办人」列用 */
export function getPendingOwner(quote: Quote): string {
  switch (quote.status) {
    case 'draft':
      return `${quote.basicInfo.creatorName}（产品经理）`;
    case 'feature_confirmed':
      return `${quote.basicInfo.techEvaluatorName}（技术评估）`;
    case 'eval_completed':
      // 评估完成后，销售可进行报价配置
      return '张三（报价配置）';
    case 'assigned_sales':
    case 'quote_summarized':
    case 'rejected':
      return '张三（报价配置）';
    case 'auditing': {
      const pending = quote.auditNodes.filter((n) => n.status === 'PENDING').map((n) => n.auditorName);
      return pending.length ? `${pending.join('、')}（待会签）` : '—';
    }
    case 'pending_stamp':
      return `${quote.stampNode.stamperName}（待盖章）`;
    case 'stamped':
      return '张三（待发送客户）';
    case 'sent':
      return '张三（待客户确认）';
    default:
      return '—';
  }
}

/** 会签人 auditorId → 报价角色（与 buildInitialAuditNodes 的三人对齐） */
const AUDITOR_ID_TO_ROLE: Record<string, QuoteRole> = {
  huangyi: 'sales_manager',
  luo: 'tech',
  min: 'decision',
};

/**
 * 当前状态等着哪些角色处理（与 getPendingOwner 同口径，但返回角色 key，供"待我处理"过滤/待办推导用）。
 * 终态（deal / voided / pending_followup）返回空数组。
 */
export function getPendingRoles(quote: Quote): QuoteRole[] {
  switch (quote.status) {
    case 'draft':
      return ['pm'];
    case 'feature_confirmed':
      return ['tech'];
    case 'eval_completed':
    case 'assigned_sales':
    case 'quote_summarized':
    case 'rejected':
      return ['sales'];
    case 'auditing':
      return quote.auditNodes
        .filter((n) => n.status === 'PENDING')
        .map((n) => AUDITOR_ID_TO_ROLE[n.auditorId])
        .filter((r): r is QuoteRole => Boolean(r));
    case 'pending_stamp':
      return ['assistant'];
    case 'stamped':
    case 'sent':
      return ['sales'];
    case 'deal':
    case 'voided':
    case 'pending_followup':
      return [];
    default:
      return [];
  }
}

/**
 * 从报价状态派生"轮到我处理"的待办（纯函数，非持久化）。
 * 只返回当前角色 pending 的报价，一条报价对应一条待办。
 */
export function buildQuoteTodos(quotes: Quote[], role: QuoteRole): TodoItem[] {
  const todos: TodoItem[] = [];
  for (const quote of quotes) {
    if (isTerminalStatus(quote.status)) continue;
    if (!getPendingRoles(quote).includes(role)) continue;
    const stage = deriveStage(quote.status);
    todos.push({
      id: `quote-todo-${quote.id}`,
      source: 'quotation',
      sourceId: quote.id,
      module: QUOTE_STAGE_NAMES[stage],
      title: quote.basicInfo.projectName,
      content: `报价 ${quote.quoteNo}，${QUOTE_STATUS_LABELS[quote.status]}，待 ${getPendingOwner(quote)} 处理`,
      assigneeId: role,
      assigneeName: QUOTE_ROLE_ACTORS[role],
      status: 'pending',
      priority: stage === 4 ? 'high' : 'medium',
      createdAt: quote.updatedAt,
      deadline: quote.deadline,
      route: `/quotation/${quote.id}`,
    });
  }
  return todos;
}

// ─── 金额汇总 ─────────────────────────────────────────────

/** 技术人天的内部日均成本，原型阶段按固定值估算 */
export const TECH_DAILY_RATE = 600;

export interface QuoteAmountBreakdown {
  /** 罗总评估的技术人天合计 */
  techDays: number;
  /** 销售增项人天合计（人数 × 天数） */
  addedDays: number;
  totalLaborDays: number;
  /** 技术人力成本 */
  techLaborCost: number;
  /** 增项人力成本 */
  addedCost: number;
  laborSubtotal: number;
  travelSubtotal: number;
  onsiteSubtotal: number;
  otherCostSubtotal: number;
  grandTotal: number;
  /** 各部分占总报价比例，0~1 */
  ratios: { labor: number; travelOnsite: number; other: number };
}

export function computeAmountBreakdown(quote: Quote): QuoteAmountBreakdown {
  const techDays = sumEvalDays(quote.evalSheet);
  const addedDays = quote.salesAddedRoles.reduce((s, r) => s + r.headcount * r.days, 0);
  const techLaborCost = techDays * TECH_DAILY_RATE;
  const addedCost = quote.salesAddedRoles.reduce((s, r) => s + r.subtotal, 0);
  const laborSubtotal = techLaborCost + addedCost;
  const travelSubtotal = quote.travelOnsite.enableTravel ? quote.travelOnsite.travelSubtotal : 0;
  const onsiteSubtotal = quote.travelOnsite.enableOnsite ? quote.travelOnsite.onsiteSubtotal : 0;
  const otherCostSubtotal = quote.otherCosts.reduce((s, c) => s + c.amount, 0);
  const grandTotal = laborSubtotal + travelSubtotal + onsiteSubtotal + otherCostSubtotal;

  const safe = (n: number) => (grandTotal > 0 ? n / grandTotal : 0);
  return {
    techDays,
    addedDays,
    totalLaborDays: techDays + addedDays,
    techLaborCost,
    addedCost,
    laborSubtotal,
    travelSubtotal,
    onsiteSubtotal,
    otherCostSubtotal,
    grandTotal,
    ratios: {
      labor: safe(laborSubtotal),
      travelOnsite: safe(travelSubtotal + onsiteSubtotal),
      other: safe(otherCostSubtotal),
    },
  };
}

/** 评估表总人天 */
export function sumEvalDays(evalSheet?: EvalSheet): number {
  if (!evalSheet) return 0;
  return round1(evalSheet.evaluationUnits.reduce((s, u) => s + u.totalDays, 0));
}

/** 按岗位汇总人天，底部「产品 3.0 + UI 4.0 + ...」用 */
export function sumEvalDaysByRole(evalSheet?: EvalSheet): Record<string, number> {
  const result: Record<string, number> = {};
  if (!evalSheet) return result;
  for (const role of evalSheet.activeRoles) {
    result[role.key] = round1(
      evalSheet.evaluationUnits.reduce((s, u) => s + (u.manualWorkload[role.key] ?? 0), 0),
    );
  }
  return result;
}

/** 单个评估单元的行小计 = 当前激活岗位工时之和 */
export function computeUnitTotal(unit: EvaluationUnit, activeRoleKeys: string[]): number {
  return round1(activeRoleKeys.reduce((s, key) => s + (unit.manualWorkload[key] ?? 0), 0));
}

/** 人天保留 1 位小数，避免浮点误差堆积 */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeTravelSubtotal(detail: TravelOnsiteConfig['travelDetail']): number {
  if (!detail) return 0;
  const { headcount, days, transportFee, hotelFeePerDay, allowancePerDay } = detail;
  return round2(transportFee * headcount + (hotelFeePerDay + allowancePerDay) * headcount * days);
}

export function computeOnsiteSubtotal(detail: TravelOnsiteConfig['onsiteDetail']): number {
  if (!detail) return 0;
  return round2(detail.serviceFeePerDay * detail.headcount * detail.days);
}

export function computeAddedRoleSubtotal(role: Pick<SalesAddedRole, 'headcount' | 'days' | 'dailyRate'>): number {
  return round2(role.headcount * role.days * role.dailyRate);
}

// ─── 提交审批前的一致性硬校验 ──────────────────────────────

export interface ValidationIssue {
  /** 对应文档中的校验编号，便于界面按序展示 */
  code: 'labor_days' | 'cost_sum' | 'payment_percent' | 'travel_amount' | 'no_eval' | 'no_price';
  message: string;
}

/**
 * 工作台三 Step7 提交前硬校验：
 * 1 ∑分项人天 = 总人天；2 ∑成本小计 = 项目总报价；
 * 3 付款阶段比例合计 = 100%；4 开启差旅/驻场时金额必须 > 0。
 */
export function validateBeforeAudit(quote: Quote): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const breakdown = computeAmountBreakdown(quote);

  if (!quote.evalSheet || quote.evalSheet.evaluationUnits.length === 0) {
    issues.push({ code: 'no_eval', message: '缺少技术人天评估数据，无法提交审批' });
  }

  // 校验 1：分项人天之和须等于汇总人天
  const techByRole = Object.values(sumEvalDaysByRole(quote.evalSheet)).reduce((s, n) => s + n, 0);
  if (quote.evalSheet && Math.abs(round1(techByRole) - breakdown.techDays) > 0.05) {
    issues.push({
      code: 'labor_days',
      message: `分项人天合计 ${round1(techByRole)} 与总人天 ${breakdown.techDays} 不一致`,
    });
  }

  // 校验 2：各成本小计之和须等于总报价
  const costSum = round2(
    breakdown.laborSubtotal + breakdown.travelSubtotal + breakdown.onsiteSubtotal + breakdown.otherCostSubtotal,
  );
  if (Math.abs(costSum - round2(breakdown.grandTotal)) > 0.01) {
    issues.push({ code: 'cost_sum', message: `成本小计之和 ${costSum} 与项目总报价 ${breakdown.grandTotal} 不一致` });
  }

  if (breakdown.grandTotal <= 0) {
    issues.push({ code: 'no_price', message: '项目总报价必须大于 0' });
  }

  // 校验 3：付款比例合计必须精确等于 100%
  const terms = quote.summary?.paymentTerms ?? [];
  if (terms.length === 0) {
    issues.push({ code: 'payment_percent', message: '请配置付款方式' });
  } else {
    const percentSum = round2(terms.reduce((s, t) => s + t.percent, 0));
    if (Math.abs(percentSum - 100) > 0.01) {
      issues.push({ code: 'payment_percent', message: `付款阶段比例合计为 ${percentSum}%，必须等于 100%` });
    }
  }

  // 校验 4：开启差旅/驻场则金额必须大于 0
  if (quote.travelOnsite.enableTravel && quote.travelOnsite.travelSubtotal <= 0) {
    issues.push({ code: 'travel_amount', message: '已开启出差配置，差旅费用必须大于 0' });
  }
  if (quote.travelOnsite.enableOnsite && quote.travelOnsite.onsiteSubtotal <= 0) {
    issues.push({ code: 'travel_amount', message: '已开启驻场配置，驻场费用必须大于 0' });
  }

  return issues;
}

/** 工作台一提交功能清单前的校验 */
export function validateFeatureList(featureList: FeatureModule[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const hasSub = featureList.some((m) => m.subFeatures.length > 0);
  if (featureList.length === 0 || !hasSub) {
    issues.push({ code: 'no_eval', message: '至少需要 1 个功能模块及 1 个子功能' });
  }
  return issues;
}

// ─── 状态迁移 ─────────────────────────────────────────────

/** 审批会签结果推导：任一驳回 → rejected；全部通过 → pending_stamp；否则继续 auditing */
export function resolveAuditOutcome(nodes: AuditNode[]): QuoteStatus {
  if (nodes.some((n) => n.status === 'REJECTED')) return 'rejected';
  if (nodes.every((n) => n.status === 'APPROVED')) return 'pending_stamp';
  return 'auditing';
}

/**
 * 驳回后全员重审重置：清空所有审批记录，禁止部分沿用。
 * 提交审批与重新提交都走这里，保证三人重新会签。
 */
export function resetAuditNodes(): AuditNode[] {
  return buildInitialAuditNodes();
}

/** 版本号递增：v1.0 → v2.0 */
export function nextVersion(version: string): string {
  const match = /^v(\d+)\.(\d+)$/.exec(version);
  if (!match) return 'v2.0';
  return `v${Number(match[1]) + 1}.0`;
}

// ─── 切片重组（工作台二核心机制）────────────────────────────

/** 空工时表，按当前激活岗位建零值 */
function emptyWorkload(activeRoleKeys: string[]): Record<string, number> {
  return activeRoleKeys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

/**
 * 模式 A 整模块打包：该模块下所有评估单元收敛为一个 MODULE_PACK 单元。
 * 累加原有工时，保留总值。
 */
export function packModule(
  units: EvaluationUnit[],
  module: FeatureModule,
  activeRoleKeys: string[],
): EvaluationUnit[] {
  const subIds = module.subFeatures.map((f) => f.id);
  const rest = units.filter((u) => !u.boundSubFeatureIds.some((id) => subIds.includes(id)));

  // 累加被合并单元的数值
  const mergedWorkload = emptyWorkload(activeRoleKeys);
  for (const unit of units) {
    if (unit.boundSubFeatureIds.some((id) => subIds.includes(id))) {
      for (const key of activeRoleKeys) {
        mergedWorkload[key] = (mergedWorkload[key] ?? 0) + (unit.manualWorkload[key] ?? 0);
      }
    }
  }

  const packed: EvaluationUnit = {
    id: `unit-pack-${module.id}`,
    granularity: 'MODULE_PACK',
    moduleName: module.name,
    moduleId: module.id,
    boundSubFeatureIds: subIds,
    manualWorkload: mergedWorkload,
    totalDays: computeUnitTotal({ manualWorkload: mergedWorkload, totalDays: 0 } as EvaluationUnit, activeRoleKeys),
    riskLevel: 'LOW',
  };
  return [...rest, packed];
}

/**
 * 模式 B 模块内多项合并：把选中的 N 个子功能并成一个 SUB_GROUP 单元。
 * 仅允许同模块内合并，跨模块合并直接返回原数组（调用方负责提示）。
 */
export function groupSubFeatures(
  units: EvaluationUnit[],
  module: FeatureModule,
  subFeatureIds: string[],
  activeRoleKeys: string[],
  groupName?: string,
): EvaluationUnit[] {
  if (subFeatureIds.length < 2) return units;
  const moduleSubIds = module.subFeatures.map((f) => f.id);
  if (!subFeatureIds.every((id) => moduleSubIds.includes(id))) return units;

  // 剔除被合并子功能所在的旧单元，同时保留旧单元中未被选中的子功能为单项
  const rest: EvaluationUnit[] = [];
  for (const unit of units) {
    const overlap = unit.boundSubFeatureIds.filter((id) => subFeatureIds.includes(id));
    if (overlap.length === 0) {
      rest.push(unit);
      continue;
    }
    const remaining = unit.boundSubFeatureIds.filter((id) => !subFeatureIds.includes(id));
    // 旧单元里剩下的子功能退回单项，避免工时凭空消失或被吞掉
    for (const id of remaining) {
      const sub = module.subFeatures.find((f) => f.id === id);
      rest.push(makeSingleUnit(module, id, sub?.name, activeRoleKeys));
    }
  }

  // 合并时累加被合并子功能的数值（遍历原始 units 数组）
  const mergedWorkload = emptyWorkload(activeRoleKeys);
  for (const unit of units) {
    const overlap = unit.boundSubFeatureIds.filter((id) => subFeatureIds.includes(id));
    if (overlap.length > 0) {
      for (const key of activeRoleKeys) {
        mergedWorkload[key] = (mergedWorkload[key] ?? 0) + (unit.manualWorkload[key] ?? 0);
      }
    }
  }

  const grouped: EvaluationUnit = {
    id: `unit-group-${module.id}-${subFeatureIds.join('_')}`,
    granularity: 'SUB_GROUP',
    moduleName: module.name,
    moduleId: module.id,
    boundSubFeatureIds: [...subFeatureIds],
    groupName: groupName || '切片组',
    manualWorkload: mergedWorkload,
    totalDays: computeUnitTotal({ manualWorkload: mergedWorkload, totalDays: 0 } as EvaluationUnit, activeRoleKeys),
    riskLevel: 'LOW',
  };
  return [...rest, grouped];
}

/** 拆分还原：把打包/合并单元解散为逐项独立的 SINGLE 单元，并实现寄存值机制 */
export function ungroupUnit(
  units: EvaluationUnit[],
  unitId: string,
  module: FeatureModule,
  activeRoleKeys: string[],
): { units: EvaluationUnit[]; activateUnitId?: string } {
  const target = units.find((u) => u.id === unitId);
  if (!target || target.granularity === 'SINGLE') return { units };
  const targetIndex = units.findIndex((u) => u.id === unitId);
  const rest = units.filter((u) => u.id !== unitId);
  let activateUnitId: string | undefined;
  const ungroupedSubIds = target.boundSubFeatureIds;
  const singles = target.boundSubFeatureIds.map((id, index) => {
    const sub = module.subFeatures.find((f) => f.id === id);
    const unit = makeSingleUnit(module, id, sub?.name, activeRoleKeys);
    // 第一行作为寄存行，继承原来的总值
    if (index === 0) {
      unit.manualWorkload = { ...target.manualWorkload };
      unit.totalDays = target.totalDays;
      unit.isRemainder = true; // 标记为寄存行
      unit.ungroupedSubIds = ungroupedSubIds; // 存储解除合并的子功能 ID
    } else if (index === 1) {
      // 第二行作为激活行
      activateUnitId = unit.id;
    }
    return unit;
  });
  // 将 singles 插入到原来 target 的位置
  const result = [...rest];
  result.splice(targetIndex, 0, ...singles);
  return { units: result, activateUnitId };
}

function makeSingleUnit(
  module: FeatureModule,
  subFeatureId: string,
  subName: string | undefined,
  activeRoleKeys: string[],
): EvaluationUnit {
  return {
    id: `unit-single-${subFeatureId}`,
    granularity: 'SINGLE',
    moduleName: module.name,
    moduleId: module.id,
    boundSubFeatureIds: [subFeatureId],
    groupName: subName,
    manualWorkload: emptyWorkload(activeRoleKeys),
    totalDays: 0,
    riskLevel: 'LOW',
  };
}

/** 从功能清单生成初始评估表：每个子功能一条 SINGLE 单元 */
export function buildInitialUnits(featureList: FeatureModule[], activeRoleKeys: string[]): EvaluationUnit[] {
  return featureList.flatMap((module) =>
    module.subFeatures.map((sub) => makeSingleUnit(module, sub.id, sub.name, activeRoleKeys)),
  );
}

/** 从现有评估单元恢复为单项评估，保留原有数值 */
export function restoreToSingleUnits(
  currentUnits: EvaluationUnit[],
  featureList: FeatureModule[],
  activeRoleKeys: string[],
): EvaluationUnit[] {
  // 构建子功能 ID 到原有数值的映射
  const subFeatureValues = new Map<string, Record<string, number>>();
  for (const unit of currentUnits) {
    for (const subId of unit.boundSubFeatureIds) {
      subFeatureValues.set(subId, { ...unit.manualWorkload });
    }
  }

  // 构建模块 ID 到合并单元的映射
  const moduleUnits = new Map<string, EvaluationUnit>();
  for (const unit of currentUnits) {
    if (unit.granularity === 'MODULE_PACK' || unit.granularity === 'SUB_GROUP') {
      moduleUnits.set(unit.moduleId!, unit);
    }
  }

  return featureList.flatMap((module) => {
    const packedUnit = moduleUnits.get(module.id);
    return module.subFeatures.map((sub) => {
      const unit = makeSingleUnit(module, sub.id, sub.name, activeRoleKeys);
      // 恢复原有数值
      const originalWorkload = subFeatureValues.get(sub.id);
      if (originalWorkload) {
        unit.manualWorkload = { ...originalWorkload };
        unit.totalDays = computeUnitTotal({ ...unit, manualWorkload: originalWorkload }, activeRoleKeys);
      }
      return unit;
    });
  });
}

/** 从打包/合并单元恢复为单项评估，使用寄存值机制 */
export function ungroupPackedUnit(
  units: EvaluationUnit[],
  unitId: string,
  module: FeatureModule,
  activeRoleKeys: string[],
): { units: EvaluationUnit[]; activateUnitId?: string } {
  const target = units.find((u) => u.id === unitId);
  if (!target || target.granularity === 'SINGLE') return { units };
  const targetIndex = units.findIndex((u) => u.id === unitId);
  const rest = units.filter((u) => u.id !== unitId);

  // 计算所有子功能原始值的总和
  const originalTotal = emptyWorkload(activeRoleKeys);
  const subFeatureValues = new Map<string, Record<string, number>>();
  for (const unit of units) {
    for (const subId of unit.boundSubFeatureIds) {
      if (module.subFeatures.some((f) => f.id === subId)) {
        subFeatureValues.set(subId, { ...unit.manualWorkload });
        for (const key of activeRoleKeys) {
          originalTotal[key] = (originalTotal[key] ?? 0) + (unit.manualWorkload[key] ?? 0);
        }
      }
    }
  }

  // 检查合并后的值是否等于原始值总和
  let isModified = false;
  for (const key of activeRoleKeys) {
    if (Math.abs((target.manualWorkload[key] ?? 0) - (originalTotal[key] ?? 0)) > 0.01) {
      isModified = true;
      break;
    }
  }

  let activateUnitId: string | undefined;
  const ungroupedSubIds = target.boundSubFeatureIds;
  const singles = target.boundSubFeatureIds.map((id, index) => {
    const sub = module.subFeatures.find((f) => f.id === id);
    const unit = makeSingleUnit(module, id, sub?.name, activeRoleKeys);

    if (isModified) {
      // 如果修改过数值，使用寄存值机制
      if (index === 0) {
        // 第一行作为寄存行，继承修改后的总值
        unit.manualWorkload = { ...target.manualWorkload };
        unit.totalDays = target.totalDays;
        unit.isRemainder = true;
        unit.ungroupedSubIds = ungroupedSubIds;
      } else if (index === 1) {
        // 第二行作为激活行
        activateUnitId = unit.id;
      }
    } else {
      // 如果没有修改过数值，恢复原始值
      const originalWorkload = subFeatureValues.get(id);
      if (originalWorkload) {
        unit.manualWorkload = { ...originalWorkload };
        unit.totalDays = computeUnitTotal({ ...unit, manualWorkload: originalWorkload }, activeRoleKeys);
      }
    }
    return unit;
  });

  // 将 singles 插入到原来 target 的位置
  const result = [...rest];
  result.splice(targetIndex, 0, ...singles);
  return { units: result, activateUnitId };
}

/** 移除岗位列时清掉该列工时并重算行小计 */
export function removeRoleFromUnits(units: EvaluationUnit[], roleKey: string, remainingRoleKeys: string[]): EvaluationUnit[] {
  return units.map((unit) => {
    const { [roleKey]: _removed, ...rest } = unit.manualWorkload;
    const next = { ...unit, manualWorkload: rest };
    return { ...next, totalDays: computeUnitTotal(next, remainingRoleKeys) };
  });
}

/** 评估单元在表格中的展示顺序：按模块 sort，再按粒度与绑定的首个子功能 */
export function sortUnitsByFeatureList(units: EvaluationUnit[], featureList: FeatureModule[]): EvaluationUnit[] {
  const moduleOrder = new Map(featureList.map((m, idx) => [m.id, idx]));
  const subOrder = new Map<string, number>();
  featureList.forEach((m, mIdx) => {
    m.subFeatures.forEach((f, fIdx) => subOrder.set(f.id, mIdx * 1000 + fIdx));
  });
  return [...units].sort((a, b) => {
    const am = moduleOrder.get(a.moduleId ?? '') ?? 999;
    const bm = moduleOrder.get(b.moduleId ?? '') ?? 999;
    if (am !== bm) return am - bm;
    const as = subOrder.get(a.boundSubFeatureIds[0] ?? '') ?? 0;
    const bs = subOrder.get(b.boundSubFeatureIds[0] ?? '') ?? 0;
    return as - bs;
  });
}
