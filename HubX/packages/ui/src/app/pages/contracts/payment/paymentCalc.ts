// ========================================
// 合同回款看板 - 纯函数层
// 所有看板指标从合同原始数据派生，不存汇总
// ========================================

import type {
  Contract,
  PaymentPlanItem,
  CollectionRecord,
  PaymentBlocker,
} from '../types';
import type {
  ForecastCertaintyLevel,
  ForecastNode,
  CashflowMetric,
  KanbanColumn,
  ForecastOverride,
} from './types';
import { CERTAINTY_WEIGHTS } from './types';

// ==================== 看板五态派生 ====================

/**
 * 派生合同在看板中的列状态
 * 优先级：settled > blocked > overdue > upcoming > normal
 */
export function derivePaymentStatus(
  contract: Contract,
  today: string = new Date().toISOString().slice(0, 10),
): KanbanColumn {
  const plans = contract.paymentPlans ?? [];
  const collections = contract.collectionRecords ?? [];
  const blockers = contract.paymentBlockers ?? [];

  // settled: Σ receivedAmount ≥ totalAmount
  const totalReceived = collections.reduce((s, c) => s + c.amount, 0);
  if (totalReceived >= contract.totalAmount) return 'settled';

  // blocked: 存在未解决的活跃卡点
  const activeBlockers = blockers.filter(b => !b.resolvedAt);
  if (activeBlockers.length > 0) return 'blocked';

  // 找当前待付期次（第一个未全额收到的期次）
  const nextPeriod = findNextPayPeriod(plans, collections);
  if (!nextPeriod) return 'settled'; // 所有期次都已收到

  const dueDate = nextPeriod.expectedDate;
  if (!dueDate) return 'normal';

  const diffDays = daysBetween(today, dueDate);

  // overdue: 已过期
  if (diffDays < 0) return 'overdue';

  // upcoming: 7 天内到期
  if (diffDays <= 7) return 'upcoming';

  // normal
  return 'normal';
}

// ==================== 确定性分级 ====================

/**
 * 派生合同付款节点的确定性等级
 */
export function deriveCertaintyLevel(
  contract: Contract,
  projectDelayDays: number = 0,
  hasActiveBlockers: boolean = false,
): ForecastCertaintyLevel {
  if (hasActiveBlockers) return 'blocked';
  if (projectDelayDays > 7) return 'low';
  if (projectDelayDays > 3) return 'medium';
  return 'high';
}

// ==================== 回款进度 ====================

/** 回款进度摘要 */
export function deriveCollectionProgress(contract: Contract): {
  received: number;
  total: number;
  percentage: number;
  remaining: number;
} {
  const total = contract.totalAmount;
  const received = (contract.collectionRecords ?? []).reduce((s, c) => s + c.amount, 0);
  return {
    received,
    total,
    percentage: total > 0 ? Math.round((received / total) * 100) : 0,
    remaining: Math.max(0, total - received),
  };
}

/** 找当前待付期次（第一个未全额收到的） */
export function findNextPayPeriod(
  plans: PaymentPlanItem[],
  collections: CollectionRecord[],
): PaymentPlanItem | null {
  const sorted = [...plans].sort((a, b) => a.periodNo - b.periodNo);
  for (const plan of sorted) {
    const planCollections = collections.filter(c => c.period === plan.periodNo);
    const planReceived = planCollections.reduce((s, c) => s + c.amount, 0);
    if (planReceived < plan.amount) return plan;
  }
  return null;
}

/** 某期次已收金额 */
export function periodReceivedAmount(
  periodNo: number,
  collections: CollectionRecord[],
): number {
  return collections
    .filter(c => c.period === periodNo)
    .reduce((s, c) => s + c.amount, 0);
}

// ==================== 甘特图数据 ====================

/** 从合同列表构建甘特图节点 */
export function buildGanttNodes(
  contracts: Contract[],
  overrides: ForecastOverride[] = [],
  projectDelayMap: Record<string, number> = {},
): ForecastNode[] {
  const nodes: ForecastNode[] = [];

  for (const contract of contracts) {
    const plans = contract.paymentPlans ?? [];
    const collections = contract.collectionRecords ?? [];
    const blockers = contract.paymentBlockers ?? [];
    const hasBlockers = blockers.some(b => !b.resolvedAt);
    const contractOverrides = overrides.filter(o => o.contractId === contract.id);

    for (const plan of plans) {
      const received = periodReceivedAmount(plan.periodNo, collections);
      const isSettled = received >= plan.amount;
      const isBlocked = hasBlockers && !isSettled;
      const delayDays = projectDelayMap[contract.projectId ?? ''] ?? 0;

      // 查找调期记录
      const override = contractOverrides.find(o => o.periodIndex === plan.periodNo);
      const forecastDate = override?.newForecastDate ?? plan.expectedDate;

      // 未设置明确日期的付款计划不能进入时间轴。这里不虚构日期，同时避免
      // gantt-task-react 收到 Invalid Date 后让整个预测页崩溃。
      const parsedForecastDate = new Date(`${forecastDate}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(forecastDate ?? '')
        || Number.isNaN(parsedForecastDate.getTime())
        || parsedForecastDate.toISOString().slice(0, 10) !== forecastDate) {
        continue;
      }

      nodes.push({
        nodeId: `${contract.id}-p${plan.periodNo}`,
        contractId: contract.id,
        contractNo: contract.contractNo,
        contractName: contract.name,
        customerName: contract.customerName,
        salesOwner: contract.salesOwner ?? '',
        projectManager: contract.projectManager,
        periodIndex: plan.periodNo,
        periodName: plan.planName ?? `第${plan.periodNo}期`,
        amount: plan.amount,
        percentage: contract.totalAmount > 0 ? Math.round((plan.amount / contract.totalAmount) * 100) : 0,
        plannedDate: plan.expectedDate,
        forecastDate,
        actualDate: isSettled ? collections.find(c => c.period === plan.periodNo)?.date : undefined,
        linkedProjectId: contract.projectId,
        certaintyLevel: deriveCertaintyLevel(contract, delayDays, hasBlockers),
        deliveryDelayDays: delayDays > 0 ? delayDays : undefined,
        riskReason: delayDays > 7 ? `交付延期${delayDays}天` : undefined,
        isSettled,
        isBlocked,
      });
    }
  }

  return nodes;
}

// ==================== 现金流聚合 ====================

/**
 * 按月按确定性分级聚合现金流
 */
export function aggregateCashflow(
  contracts: Contract[],
  months: string[],
  overrides: ForecastOverride[] = [],
  projectDelayMap: Record<string, number> = {},
): CashflowMetric[] {
  const nodes = buildGanttNodes(contracts, overrides, projectDelayMap);

  return months.map(month => {
    const monthNodes = nodes.filter(n => n.forecastDate.startsWith(month));
    const monthCollections = contracts
      .flatMap(c => c.collectionRecords ?? [])
      .filter(c => c.date.startsWith(month));

    const totalPlanned = monthNodes.reduce((s, n) => s + n.amount, 0);
    const receivedAmount = monthCollections.reduce((s, c) => s + c.amount, 0);

    let highCertaintyAmount = 0;
    let mediumCertaintyAmount = 0;
    let lowCertaintyAmount = 0;
    let blockedAmount = 0;

    for (const node of monthNodes) {
      if (node.isSettled) {
        highCertaintyAmount += node.amount;
        continue;
      }
      const weight = CERTAINTY_WEIGHTS[node.certaintyLevel];
      const weighted = node.amount * weight;
      switch (node.certaintyLevel) {
        case 'high': highCertaintyAmount += weighted; break;
        case 'medium': mediumCertaintyAmount += weighted; break;
        case 'low': lowCertaintyAmount += weighted; break;
        case 'blocked': blockedAmount += node.amount; break;
      }
    }

    const totalForecast = highCertaintyAmount + mediumCertaintyAmount + lowCertaintyAmount;

    return {
      month,
      totalPlanned,
      totalForecast,
      highCertaintyAmount,
      mediumCertaintyAmount,
      lowCertaintyAmount,
      blockedAmount,
      receivedAmount,
    };
  });
}

// ==================== KPI 摘要 ====================

/** 看板 7 大 KPI */
export function deriveKanbanSummary(
  contracts: Contract[],
  today: string = new Date().toISOString().slice(0, 10),
): {
  totalContracts: number;
  totalReceivable: number;
  monthReceived: number;
  monthForecast: number;
  upcomingAmount: number;
  overdueAmount: number;
  blockedAmount: number;
} {
  const currentMonth = today.slice(0, 7);
  let totalReceivable = 0;
  let monthReceived = 0;
  let monthForecast = 0;
  let upcomingAmount = 0;
  let overdueAmount = 0;
  let blockedAmount = 0;

  for (const contract of contracts) {
    const progress = deriveCollectionProgress(contract);
    totalReceivable += progress.remaining;

    // 当月已回款
    const monthColls = (contract.collectionRecords ?? [])
      .filter(c => c.date.startsWith(currentMonth));
    monthReceived += monthColls.reduce((s, c) => s + c.amount, 0);

    // 当月待收（按计划）
    const monthPlans = (contract.paymentPlans ?? [])
      .filter(p => p.expectedDate.startsWith(currentMonth));
    monthForecast += monthPlans.reduce((s, p) => s + p.amount, 0);

    const status = derivePaymentStatus(contract, today);
    const nextPeriod = findNextPayPeriod(contract.paymentPlans ?? [], contract.collectionRecords ?? []);
    const periodAmount = nextPeriod?.amount ?? 0;

    switch (status) {
      case 'upcoming': upcomingAmount += periodAmount; break;
      case 'overdue': overdueAmount += periodAmount; break;
      case 'blocked': {
        const activeBlockers = (contract.paymentBlockers ?? []).filter(b => !b.resolvedAt);
        blockedAmount += activeBlockers.reduce((s, b) => s + b.amountBlocked, 0);
        break;
      }
    }
  }

  return {
    totalContracts: contracts.length,
    totalReceivable,
    monthReceived,
    monthForecast,
    upcomingAmount,
    overdueAmount,
    blockedAmount,
  };
}

// ==================== 工具函数 ====================

/** 两个日期之间的天数（正 = to 在后，负 = to 在前） */
function daysBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
