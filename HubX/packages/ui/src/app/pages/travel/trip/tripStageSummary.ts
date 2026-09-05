import type { Trip } from '../types';
import {
  computeBudgetExecution,
  computeReimbursementRatio,
  formatMoney,
  sumRecordedExpenses,
  type TripMainTabKey,
  type TripSideTabKey,
} from './tripDetailMetrics';

export interface TripStageCheck {
  id: string;
  label: string;
  done: boolean;
  target?: { main?: TripMainTabKey; side?: TripSideTabKey };
}

export interface TripStageMetricHighlight {
  label: string;
  value: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral';
}

export interface TripStageSummary {
  key: 'draft' | 'approval' | 'ready' | 'travel' | 'reimburse' | 'closed';
  label: string;
  statusText?: string;
  highlights?: TripStageMetricHighlight[];
  completed: TripStageCheck[];
  pending: TripStageCheck[];
  tips?: string;
}

export function buildTripStageSummaries(trip: Trip): TripStageSummary[] {
  const records = trip.approvalRecords ?? [];
  const completedApprovals = records.filter((r) => r.status === 'approved');
  const totalApprovals = records.length;

  const recordedCost = sumRecordedExpenses(trip);
  const budgetInfo = computeBudgetExecution(trip);
  const reimbRatioInfo = computeReimbursementRatio(trip);
  const destination = trip.destinations?.[0] || '杭州';
  const hasLoan = Boolean(trip.needLoan && (trip.loanAmount ?? 0) > 0);
  const loanAmount = trip.loanAmount ?? 0;
  const offsetAmount = trip.loans?.reduce((sum, l) => sum + (l.offsetAmount ?? 0), 0) ?? 0;
  const reimbursements = trip.reimbursements ?? [];
  const totalReimbursed = reimbursements.reduce((sum, r) => sum + r.totalAmount, 0);

  // 1. 申请填写
  const isDraftSubmitted = trip.status !== 'draft';
  const draftSummary: TripStageSummary = {
    key: 'draft',
    label: '申请填写',
    statusText: isDraftSubmitted ? (trip.createDate ? `${trip.createDate.slice(5)} 提交` : '已提交') : '完善中',
    highlights: [
      { label: '目的地', value: trip.destinations.join('、') || '未指定' },
      { label: '预估预算', value: formatMoney(trip.estimatedTotalCost || 0) },
    ],
    completed: [
      { id: 'd-1', label: `出差事由：${trip.purpose}`, done: true, target: { main: 'budget' } },
      { id: 'd-2', label: `申请人：${trip.applicantName}（${trip.department || '销售部'}）`, done: true },
      {
        id: 'd-3',
        label: `归集对象：${trip.projectName || trip.leadName || '日常管理公摊'}`,
        done: true,
        target: { main: 'cost' },
      },
    ],
    pending: isDraftSubmitted
      ? []
      : [{ id: 'd-pending', label: '核对行程规划并提交审批', done: false, target: { main: 'budget' } }],
    tips: isDraftSubmitted ? '申请已正式提交，等待各级负责人审批' : '请核对出差路线与预算后提交审批',
  };

  // 2. 审批核决
  const isAllApproved = totalApprovals > 0 && completedApprovals.length === totalApprovals;
  const approvalStatusText = trip.status === 'rejected'
    ? '已驳回'
    : totalApprovals > 0
      ? (isAllApproved ? '已全审通过' : `${completedApprovals.length}/${totalApprovals} 审批中`)
      : '待发起';

  const approvalSummary: TripStageSummary = {
    key: 'approval',
    label: '审批核决',
    statusText: approvalStatusText,
    highlights: [
      {
        label: '审批进度',
        value: totalApprovals > 0 ? `${completedApprovals.length}/${totalApprovals} 节点` : '0/0',
        tone: isAllApproved ? 'success' : 'neutral',
      },
      {
        label: '合规校验',
        value: isAllApproved ? '合规通过' : '审核中',
        tone: isAllApproved ? 'success' : 'warning',
      },
    ],
    completed: completedApprovals.map((rec) => ({
      id: `app-done-${rec.id}`,
      label: `${rec.approver || '审批人'}（${rec.step || '节点'}）· ${rec.time ? rec.time.slice(5) : '已同意'}`,
      done: true,
      target: { side: 'approval' },
    })),
    pending: records
      .filter((r) => r.status !== 'approved')
      .map((rec) => ({
        id: `app-wait-${rec.id}`,
        label: `待 ${rec.approver || '审批人'}（${rec.step || '节点'}）审批`,
        done: false,
        target: { side: 'approval' },
      })),
    tips: '点击可直接在右侧时间线查看完整审批流转与特批留痕',
  };

  // 3. 待出发
  const isReady = ['approved', 'in_progress', 'to_reimburse', 'closed'].includes(trip.status);
  const readyStatusText = trip.status === 'approved'
    ? '待启程'
    : (['in_progress', 'to_reimburse', 'closed'].includes(trip.status) ? '已启程' : '待通过');

  const readySummary: TripStageSummary = {
    key: 'ready',
    label: '待出发',
    statusText: readyStatusText,
    highlights: [
      { label: '标准限额', value: `${destination} · 标准已校验`, tone: 'success' },
      {
        label: '备用借款',
        value: hasLoan ? formatMoney(loanAmount) : '无需借款',
        tone: hasLoan ? 'neutral' : 'neutral',
      },
    ],
    completed: [
      {
        id: 'r-1',
        label: `差旅标准合规核验：${destination}（二线城市标准）`,
        done: isReady,
        target: { main: 'budget' },
      },
      {
        id: 'r-2',
        label: hasLoan ? `出差备用借款审批与发放（${formatMoney(loanAmount)}）` : '无需申请备用金借款',
        done: isReady,
        target: { main: 'loan' },
      },
      {
        id: 'r-3',
        label: `航段规划已就绪（共 ${trip.itinerarySegments?.length || 0} 个航段）`,
        done: (trip.itinerarySegments?.length || 0) > 0,
        target: { side: 'itinerary' },
      },
    ],
    pending: trip.status === 'approved'
      ? [{ id: 'r-start', label: '启程出发时请在右上角点击“开始出差”', done: false }]
      : [],
    tips: trip.status === 'approved' ? '出发时标记“开始出差”，系统将自动开始统计异地打卡与考勤补贴' : undefined,
  };

  // 4. 出差执行
  const isTraveling = trip.status === 'in_progress';
  const travelCompleted = ['to_reimburse', 'closed'].includes(trip.status);
  const travelStatusText = isTraveling
    ? `${trip.days}天进行中`
    : (travelCompleted ? `${trip.days}天已完成` : '待启程');

  const travelSummary: TripStageSummary = {
    key: 'travel',
    label: '出差执行',
    statusText: travelStatusText,
    highlights: [
      { label: '预算执行', value: budgetInfo.value, tone: budgetInfo.tone },
      { label: '已录开销', value: formatMoney(recordedCost) },
    ],
    completed: [
      {
        id: 't-1',
        label: `记账流水：已记录 ${formatMoney(recordedCost)}`,
        done: recordedCost > 0,
        target: { main: 'expenses' },
      },
      {
        id: 't-2',
        label: `异地考勤补贴核定：${trip.subsidy?.days || trip.days}天（${formatMoney(trip.subsidy?.totalAmount || 0)}）`,
        done: Boolean(trip.subsidy),
        target: { main: 'subsidy' },
      },
      {
        id: 't-3',
        label: `全程路线足迹执行（${trip.itinerarySegments?.length || 0} 航段）`,
        done: travelCompleted,
        target: { side: 'itinerary' },
      },
    ],
    pending: isTraveling
      ? [{ id: 't-finish', label: '行程返程后请在右上角点击“结束出差”', done: false }]
      : [],
    tips: isTraveling ? '出差执行中可随时使用 OCR 识别发票并直接生成记账流水' : undefined,
  };

  // 5. 报销核销
  const isSettled = reimbRatioInfo.isSettled || (!hasLoan && totalReimbursed > 0);
  const reimbStatusText = trip.status === 'to_reimburse'
    ? '待核销'
    : (trip.status === 'closed' ? '已核销' : (hasLoan ? '借款待冲' : '待报销'));

  const reimbSummary: TripStageSummary = {
    key: 'reimburse',
    label: '报销核销',
    statusText: reimbStatusText,
    highlights: [
      { label: '报销申报', value: formatMoney(totalReimbursed) },
      {
        label: '借款冲抵',
        value: hasLoan ? (isSettled ? '已全额结清' : `待冲 ${formatMoney(loanAmount - offsetAmount)}`) : '无需借款',
        tone: isSettled ? 'success' : (hasLoan ? 'warning' : 'neutral'),
      },
    ],
    completed: [
      {
        id: 'rem-1',
        label: `报销申请提报与票据合规校验（${formatMoney(totalReimbursed)}）`,
        done: totalReimbursed > 0,
        target: { main: 'reimbursement' },
      },
      {
        id: 'rem-2',
        label: hasLoan
          ? (isSettled ? `借款 ${formatMoney(loanAmount)} 已全额冲抵结清` : `已冲抵 ${formatMoney(offsetAmount)} / 借款 ${formatMoney(loanAmount)}`)
          : '无需借款冲账',
        done: isSettled || !hasLoan,
        target: { main: 'loan' },
      },
      {
        id: 'rem-3',
        label: trip.subsidy?.isPaid ? '差旅异地补贴已随工资打款' : '差旅异地补贴待随当月薪资发放',
        done: Boolean(trip.subsidy?.isPaid),
        target: { main: 'subsidy' },
      },
    ],
    pending: trip.status === 'to_reimburse'
      ? [{ id: 'rem-close', label: '核销完成后请在右上角点击“结项归档”', done: false }]
      : [],
    tips: trip.status === 'to_reimburse' ? '差旅结束后请在 5 个工作日内完成报销提报与借款冲抵' : undefined,
  };

  // 6. 归档结项
  const isClosed = trip.status === 'closed';
  const closedSummary: TripStageSummary = {
    key: 'closed',
    label: '归档结项',
    statusText: isClosed ? '已归档' : '待结项',
    highlights: [
      { label: '归属对象', value: trip.projectName || trip.leadName || '部门管理' },
      { label: '最终沉淀', value: formatMoney(recordedCost || totalReimbursed) },
    ],
    completed: [
      {
        id: 'c-1',
        label: '出差周期全流程执行完毕并闭环',
        done: isClosed,
        target: { main: 'cost' },
      },
      {
        id: 'c-2',
        label: `关联成本沉淀归集入账（${trip.projectName || trip.leadName || '日常管理'}）`,
        done: isClosed,
        target: { main: 'cost' },
      },
    ],
    pending: isClosed
      ? []
      : [{ id: 'c-wait', label: '等待报销审批与借款平账后归档', done: false }],
    tips: isClosed ? '已结项差旅支持一键打印完整凭证并纳入企业全链路财务审计' : undefined,
  };

  return [
    draftSummary,
    approvalSummary,
    readySummary,
    travelSummary,
    reimbSummary,
    closedSummary,
  ];
}
