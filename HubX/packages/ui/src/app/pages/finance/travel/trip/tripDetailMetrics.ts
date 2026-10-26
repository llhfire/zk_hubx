import { createElement, type ComponentType, type ReactNode } from 'react';
import {
  IconCalendar,
  IconCompass,
  IconDashboard,
  IconFile,
  IconFolder,
  IconSafe,
} from '@arco-design/web-react/icon';
import type { Trip } from '../types';
import type { MetricItem, MetricTone } from '@/design-system';

function renderMetricTitle(IconComponent: ComponentType<{ className?: string }>, text: string): ReactNode {
  return createElement(
    'span',
    { className: 'trip-metric-card-title' },
    createElement(IconComponent, { className: 'trip-metric-card-icon' }),
    createElement('span', null, text),
  );
}

export type TripMainTabKey =
  | 'expenses'
  | 'reimbursement'
  | 'loan'
  | 'subsidy'
  | 'budget'
  | 'cost';

export type TripSideTabKey = 'itinerary' | 'approval';

export const VALID_MAIN_TABS: readonly TripMainTabKey[] = [
  'expenses',
  'reimbursement',
  'loan',
  'subsidy',
  'budget',
  'cost',
] as const;

export const VALID_SIDE_TABS: readonly TripSideTabKey[] = ['itinerary', 'approval'] as const;

export const MAIN_TAB_LABELS: Record<TripMainTabKey, string> = {
  expenses: '记账流水 & OCR',
  reimbursement: '报销管理',
  loan: '借款台账',
  subsidy: '异地考勤补贴',
  budget: '预算与标准',
  cost: '成本沉淀归集',
};

export const SIDE_TAB_LABELS: Record<TripSideTabKey, string> = {
  itinerary: '旅程轨迹',
  approval: '审批流转',
};

export interface BudgetExecutionInfo {
  rate: number;
  recordedExpense: number;
  estimatedTotalCost: number;
  isOverBudget: boolean;
  tone: MetricTone;
  value: string;
  detail: string;
}

export interface ReimbursementRatioInfo {
  ratioLabel: string;
  detail: string;
  tone: MetricTone;
  offsetAmount: number;
  loanAmount: number;
  reimbursementTotal: number;
  isSettled: boolean;
}

export interface ApprovalComplianceInfo {
  completed: number;
  total: number;
  isAllPassed: boolean;
  hasOverStandard: boolean;
  tone: MetricTone;
  value: string;
  detail: string;
}

export interface CostDepositionInfo {
  totalCost: number;
  targetType: 'project' | 'lead' | 'general';
  targetName: string;
  tone: MetricTone;
  value: string;
  detail: string;
}

export interface TripResolvedLinks {
  applicantLink: string;
  applicantText: string;
  projectLink?: string;
  projectText?: string;
  customerLink?: string;
  customerText?: string;
  leadLink?: string;
  leadText?: string;
}

/** 格式化金额 */
import { formatMoney } from '../../../../utils/money';
export { formatMoney } from '../../../../utils/money';

/** 提取所有旅程段费用总额 */
export function sumRecordedExpenses(trip: Trip): number {
  return trip.itinerarySegments?.reduce(
    (total, segment) => total + (segment.expenses?.reduce((sum, exp) => sum + exp.amount, 0) ?? 0),
    0,
  ) ?? 0;
}

/** 1. 差旅预算执行率 */
export function computeBudgetExecution(trip: Trip): BudgetExecutionInfo {
  const recorded = sumRecordedExpenses(trip);
  const estimated = trip.estimatedTotalCost || 0;
  const rate = estimated > 0 ? Math.round((recorded / estimated) * 100) : 0;
  const isOverBudget = estimated > 0 && recorded > estimated;

  let tone: MetricTone = 'neutral';
  if (isOverBudget) {
    tone = 'danger';
  } else if (rate >= 85) {
    tone = 'warning';
  } else if (recorded > 0) {
    tone = 'success';
  }

  const value = estimated > 0 ? `${rate}%` : '未设预算';
  const detail = isOverBudget
    ? `超支 ${formatMoney(recorded - estimated)} (已录 ${formatMoney(recorded)} / 预算 ${formatMoney(estimated)})`
    : `已录 ${formatMoney(recorded)} / 预算 ${formatMoney(estimated)}`;

  return {
    rate,
    recordedExpense: recorded,
    estimatedTotalCost: estimated,
    isOverBudget,
    tone,
    value,
    detail,
  };
}

/** 2. 报销核销比与借款冲抵 */
export function computeReimbursementRatio(trip: Trip): ReimbursementRatioInfo {
  const reimbursements = trip.reimbursements ?? [];
  const reimbursementTotal = reimbursements.reduce((sum, r) => sum + r.totalAmount, 0);
  const hasLoan = Boolean(trip.needLoan && (trip.loanAmount ?? 0) > 0);
  const loanAmount = trip.loanAmount ?? 0;
  const offsetAmount = trip.loans?.reduce((sum, l) => sum + (l.offsetAmount ?? 0), 0) ?? 0;

  if (hasLoan) {
    const isSettled = loanAmount > 0 && offsetAmount >= loanAmount;
    if (isSettled) {
      return {
        ratioLabel: '100% 已结清',
        detail: `借款 ${formatMoney(loanAmount)} 全额冲抵`,
        tone: 'success',
        offsetAmount,
        loanAmount,
        reimbursementTotal,
        isSettled: true,
      };
    }
    if (offsetAmount > 0) {
      const percent = Math.round((offsetAmount / loanAmount) * 100);
      return {
        ratioLabel: `${percent}% 部分冲抵`,
        detail: `已冲抵 ${formatMoney(offsetAmount)} / 借款 ${formatMoney(loanAmount)}`,
        tone: 'warning',
        offsetAmount,
        loanAmount,
        reimbursementTotal,
        isSettled: false,
      };
    }
    if (reimbursementTotal > 0) {
      return {
        ratioLabel: '待冲抵核销',
        detail: `报销 ${formatMoney(reimbursementTotal)} / 借款 ${formatMoney(loanAmount)}`,
        tone: 'warning',
        offsetAmount,
        loanAmount,
        reimbursementTotal,
        isSettled: false,
      };
    }
    return {
      ratioLabel: '借款待冲抵',
      detail: `待提交报销 (借款 ${formatMoney(loanAmount)})`,
      tone: 'neutral',
      offsetAmount,
      loanAmount,
      reimbursementTotal,
      isSettled: false,
    };
  }

  // 无借款模式
  if (trip.status === 'closed') {
    return {
      ratioLabel: '100% 已核销',
      detail: `差旅已归档 (${formatMoney(reimbursementTotal || sumRecordedExpenses(trip))})`,
      tone: 'success',
      offsetAmount: 0,
      loanAmount: 0,
      reimbursementTotal,
      isSettled: true,
    };
  }

  const isPaidOrCompleted = reimbursements.some((r) => r.status === 'paid' || r.status === 'completed');
  if (isPaidOrCompleted) {
    return {
      ratioLabel: '已打款核销',
      detail: `报销款已发放 ${formatMoney(reimbursementTotal)}`,
      tone: 'success',
      offsetAmount: 0,
      loanAmount: 0,
      reimbursementTotal,
      isSettled: true,
    };
  }

  if (reimbursementTotal > 0) {
    return {
      ratioLabel: '报销审批中',
      detail: `申报金额 ${formatMoney(reimbursementTotal)}`,
      tone: 'warning',
      offsetAmount: 0,
      loanAmount: 0,
      reimbursementTotal,
      isSettled: false,
    };
  }

  const recorded = sumRecordedExpenses(trip);
  return {
    ratioLabel: recorded > 0 ? '待提交报销' : '未借款 / 免冲抵',
    detail: recorded > 0 ? `已发生支出 ${formatMoney(recorded)}` : '无需借款且未产生报销',
    tone: 'neutral',
    offsetAmount: 0,
    loanAmount: 0,
    reimbursementTotal: 0,
    isSettled: false,
  };
}

/** 3. 审批合规节点 */
export function computeApprovalCompliance(trip: Trip): ApprovalComplianceInfo {
  const records = trip.approvalRecords ?? [];
  const completed = records.filter((r) => r.status === 'approved').length;
  const total = records.length;
  const isRejected = records.some((r) => r.status === 'rejected');
  const isAllPassed = total > 0 && completed === total;

  // 检查是否有任何费用标记为超标
  const hasOverStandard = Boolean(
    trip.itinerarySegments?.some((seg) => seg.expenses?.some((exp) => exp.isOverStandard)),
  );

  if (isRejected) {
    return {
      completed,
      total,
      isAllPassed: false,
      hasOverStandard,
      tone: 'danger',
      value: '审批驳回',
      detail: '根据审批意见调整后重提',
    };
  }

  if (isAllPassed) {
    return {
      completed,
      total,
      isAllPassed: true,
      hasOverStandard,
      tone: hasOverStandard ? 'warning' : 'success',
      value: `${completed}/${total} 全部通过`,
      detail: hasOverStandard ? '通过 (含超标合规特批)' : '全程符合差旅标准',
    };
  }

  if (total > 0) {
    return {
      completed,
      total,
      isAllPassed: false,
      hasOverStandard,
      tone: 'warning',
      value: `${completed}/${total} 审核中`,
      detail: '当前节点待流转',
    };
  }

  return {
    completed: 0,
    total: 0,
    isAllPassed: false,
    hasOverStandard,
    tone: 'neutral',
    value: '草稿阶段',
    detail: '尚未提交审批流程',
  };
}

/** 4. 关联项目成本沉淀 */
export function computeCostDeposition(trip: Trip): CostDepositionInfo {
  const recorded = sumRecordedExpenses(trip);
  const reimbursementTotal = trip.reimbursements?.reduce((sum, r) => sum + r.totalAmount, 0) ?? 0;
  const subsidyAmount = trip.subsidy?.totalAmount ?? 0;
  const totalCost = (reimbursementTotal > 0 ? reimbursementTotal : recorded) + subsidyAmount;

  if (trip.projectId || trip.projectName) {
    const name = trip.projectName || trip.projectId || '关联项目';
    return {
      totalCost,
      targetType: 'project',
      targetName: name,
      tone: 'success',
      value: formatMoney(totalCost),
      detail: `沉淀至项目履约成本 (${name})`,
    };
  }

  if (trip.leadId || trip.leadName) {
    const name = trip.leadName || trip.leadId || '关联线索';
    return {
      totalCost,
      targetType: 'lead',
      targetName: name,
      tone: 'neutral',
      value: formatMoney(totalCost),
      detail: `计入售前拓客获客成本 (${name})`,
    };
  }

  return {
    totalCost,
    targetType: 'general',
    targetName: '通用差旅',
    tone: 'neutral',
    value: formatMoney(totalCost),
    detail: '计入部门公摊管理成本',
  };
}

/** 解析出差单穿透链接与友好文本 */
export function resolveTripLinks(trip: Trip): TripResolvedLinks {
  // 申请人链接
  const applicantId = trip.applicantId || '1';
  const cleanEmpId = applicantId.replace(/^emp-0*/i, '') || '1';
  const applicantLink = `/employees/${cleanEmpId}`;
  const applicantText = trip.applicantName || '申请人';

  // 关联项目链接
  let projectLink: string | undefined;
  let projectText: string | undefined;
  if (trip.projectId || trip.projectName) {
    const pid = (trip.projectId || '1').replace(/^proj-0*/i, '') || '1';
    projectLink = `/projects/${pid}`;
    projectText = trip.projectName || trip.projectId;
  }

  // 关联客户链接
  let customerLink: string | undefined;
  let customerText: string | undefined;
  if (trip.customerId || trip.customerName) {
    const cid = (trip.customerId || 'cust-001').replace(/^cust-0*/i, '') || '1';
    customerLink = `/customers/${cid}`;
    customerText = trip.customerName || trip.customerId;
  }

  // 关联线索链接
  let leadLink: string | undefined;
  let leadText: string | undefined;
  if (trip.leadId || trip.leadName) {
    const lid = trip.leadId || '1';
    leadLink = `/leads/${lid}`;
    leadText = trip.leadName || trip.leadId;
  }

  return {
    applicantLink,
    applicantText,
    projectLink,
    projectText,
    customerLink,
    customerText,
    leadLink,
    leadText,
  };
}

/** 构建强化型步进条各步骤信息 */
export function buildEnhancedProcessSteps(trip: Trip) {
  const records = trip.approvalRecords ?? [];
  const completed = records.filter((r) => r.status === 'approved').length;
  const total = records.length;

  const approvalDesc = total > 0
    ? (completed === total ? `${completed}/${total} 已全审通过` : `${completed}/${total} 审批中`)
    : '待发起审批';

  const readyDesc = trip.status === 'approved'
    ? '合规通过 · 待启程'
    : (['in_progress', 'to_reimburse', 'closed'].includes(trip.status) ? '已启程' : '待审批通过');

  const travelDesc = trip.status === 'in_progress'
    ? `${trip.days}天行程进行中`
    : (['to_reimburse', 'closed'].includes(trip.status)
        ? `${trip.days}天行程已完成`
        : `${trip.startDate || '待定'} 出发`);

  const hasLoan = Boolean(trip.needLoan && (trip.loanAmount ?? 0) > 0);
  const reimbDesc = trip.status === 'to_reimburse'
    ? '待冲抵与报销'
    : (trip.status === 'closed'
        ? '报销核销已完成'
        : (hasLoan ? `借款 ${formatMoney(trip.loanAmount!)} 待冲抵` : '无需借款'));

  const closedDesc = trip.status === 'closed'
    ? `${trip.updateDate || '已完成'} 已归档`
    : '待结项归档';

  return [
    { key: 'draft', title: '申请填写', description: trip.createDate ? `${trip.createDate} 提交` : '草稿完善中' },
    { key: 'approval', title: '审批核决', description: approvalDesc },
    { key: 'ready', title: '待出发', description: readyDesc },
    { key: 'travel', title: '出差执行', description: travelDesc },
    { key: 'reimburse', title: '报销核销', description: reimbDesc },
    { key: 'closed', title: '归档结项', description: closedDesc },
  ];
}

/** 构建标准 6 维 MetricGrid 项（点击双向驱动切换对应左右 Tab） */
export function buildTripProcessMetrics(
  trip: Trip,
  onNavigateTab?: (target: { main?: TripMainTabKey; side?: TripSideTabKey }) => void,
): MetricItem[] {
  const budget = computeBudgetExecution(trip);
  const reimb = computeReimbursementRatio(trip);
  const approval = computeApprovalCompliance(trip);
  const cost = computeCostDeposition(trip);

  const destinationText = trip.destinations?.join('、') || '—';
  const scheduleDetail = trip.startDate && trip.endDate
    ? `${trip.days}天 (${trip.startDate.slice(5)} ~ ${trip.endDate.slice(5)})`
    : `${trip.days}天`;

  const subsidy = trip.subsidy;
  const subsidyValue = subsidy ? formatMoney(subsidy.totalAmount) : `${trip.days}天`;
  const subsidyDetail = subsidy
    ? (subsidy.isPaid ? '已随工资打款发放' : `${subsidy.days}天 · 待随当月薪资发放`)
    : '根据异地打卡核定补贴';
  const subsidyTone: MetricTone = subsidy?.isPaid ? 'success' : 'neutral';

  return [
    {
      key: 'schedule',
      label: renderMetricTitle(IconCompass, '行程与周期'),
      value: destinationText,
      detail: scheduleDetail,
      tone: 'neutral',
      onClick: onNavigateTab ? () => onNavigateTab({ side: 'itinerary' }) : undefined,
      ariaLabel: '查看旅程轨迹时间线',
    },
    {
      key: 'budget',
      label: renderMetricTitle(IconDashboard, '差旅预算执行率'),
      value: budget.value,
      detail: budget.detail,
      tone: budget.tone,
      onClick: onNavigateTab ? () => onNavigateTab({ main: 'expenses' }) : undefined,
      ariaLabel: '查看支出明细与记账流水',
    },
    {
      key: 'reimbursement',
      label: renderMetricTitle(IconFile, '报销核销比'),
      value: reimb.ratioLabel,
      detail: reimb.detail,
      tone: reimb.tone,
      onClick: onNavigateTab ? () => onNavigateTab({ main: 'reimbursement' }) : undefined,
      ariaLabel: '查看报销与借款冲抵',
    },
    {
      key: 'approval',
      label: renderMetricTitle(IconSafe, '审批合规节点'),
      value: approval.value,
      detail: approval.detail,
      tone: approval.tone,
      onClick: onNavigateTab ? () => onNavigateTab({ side: 'approval' }) : undefined,
      ariaLabel: '查看审批轨迹时间线',
    },
    {
      key: 'cost',
      label: renderMetricTitle(IconFolder, '关联成本沉淀'),
      value: cost.value,
      detail: cost.detail,
      tone: cost.tone,
      onClick: onNavigateTab ? () => onNavigateTab({ main: 'cost' }) : undefined,
      ariaLabel: '查看成本归集与预算偏差',
    },
    {
      key: 'subsidy',
      label: renderMetricTitle(IconCalendar, '差旅补贴核定'),
      value: subsidyValue,
      detail: subsidyDetail,
      tone: subsidyTone,
      onClick: onNavigateTab ? () => onNavigateTab({ main: 'subsidy' }) : undefined,
      ariaLabel: '查看异地考勤补贴',
    },
  ];
}
