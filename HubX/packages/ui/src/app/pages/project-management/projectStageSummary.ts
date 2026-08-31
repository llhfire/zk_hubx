import { collectionAmountForPeriod, type CollectionLedgerEntry } from '../../../services/collectionMutations';
import type { Contract, PaymentPlanItem } from '../contracts/types';
import {
  getProjectDeliveryStage,
  PROJECT_DELIVERY_STAGES,
  type ProjectConfirmation,
  type ProjectDeliveryStage,
  type ProjectListItem,
} from './types';
import type { ProjectWorkTask } from './projectTasks';

export interface ProjectStageCheck {
  id: string;
  label: string;
  done: boolean;
  target?: { main?: string; side?: string; route?: string };
}

export type ProjectTimelineStep = 'contract' | 'supplement' | ProjectDeliveryStage;

export function buildProjectTimelineStepOrder(input: {
  includeContractSigning: boolean;
  includeSupplementAgreement: boolean;
}): ProjectTimelineStep[] {
  const deliverySteps = PROJECT_DELIVERY_STAGES.flatMap<ProjectTimelineStep>((step) => [
    ...(step === 'closeout' && input.includeSupplementAgreement ? ['supplement' as const] : []),
    step,
  ]);

  return [
    ...(input.includeContractSigning ? ['contract' as const] : []),
    ...deliverySteps,
  ];
}

export interface ProjectStagePayment {
  id: string;
  label: string;
  amount: number;
  percentage: number;
  condition: string;
  receivedAmount: number;
  status: 'paid' | 'partial' | 'pending';
}

export interface ProjectStageSummary {
  step: ProjectTimelineStep;
  completed: ProjectStageCheck[];
  pending: ProjectStageCheck[];
  blocked: ProjectStageCheck[];
  payments: ProjectStagePayment[];
}

export interface ProjectStageSummaryInput {
  project: Pick<ProjectListItem, 'id' | 'status' | 'owner' | 'progress' | 'leadId' | 'blockers'>;
  contracts: Contract[];
  collections: CollectionLedgerEntry[];
  confirmations: ProjectConfirmation[];
  tasks: ProjectWorkTask[];
  contractAmount: number;
  receivedAmount: number;
}

function splitChecks(
  step: ProjectTimelineStep,
  checks: ProjectStageCheck[],
  blocked: ProjectStageCheck[] = [],
  payments: ProjectStagePayment[] = [],
): ProjectStageSummary {
  return {
    step,
    completed: checks.filter((item) => item.done),
    pending: checks.filter((item) => !item.done),
    blocked,
    payments,
  };
}

/** 主合同付款条件决定它嵌入哪一个执行步骤；无法识别的期次统一留在回款结项。 */
export function getPaymentTimelineStep(plan: PaymentPlanItem): ProjectTimelineStep {
  const condition = plan.condition ?? '';
  if (/合同.*(签|生效)|签订.*合同/.test(condition)) return 'contract';
  if (/原型|UI|视觉|方案|需求确认|架构/.test(condition)) return 'design';
  if (/开发.*(完成|发布|测试版)|测试版.*(发布|交付)/.test(condition)) return 'development';
  if (/测试|联调|回归/.test(condition)) return 'testing';
  if (/验收|终验|培训/.test(condition) || plan.periodName === '验收款') return 'acceptance';
  return 'closeout';
}

function buildPaymentsByStage(input: ProjectStageSummaryInput): Record<ProjectTimelineStep, ProjectStagePayment[]> {
  const result: Record<ProjectTimelineStep, ProjectStagePayment[]> = {
    contract: [], design: [], development: [], testing: [], acceptance: [], supplement: [], closeout: [],
  };

  const mainContract = input.contracts.find((contract) => contract.kind !== 'supplement') ?? input.contracts[0];
  input.contracts.filter((contract) => contract.status !== 'voided').forEach((contract) => {
    const ledgerRecords = input.collections.filter((record) => record.contractId === contract.id);
    const records = ledgerRecords.length > 0 ? ledgerRecords : (contract.collectionRecords ?? []);
    contract.current.paymentPlans.forEach((plan) => {
      const receivedAmount = records
        .reduce((sum, record) => sum + collectionAmountForPeriod(record, plan.period), 0);
      const status: ProjectStagePayment['status'] = receivedAmount >= plan.amount
        ? 'paid'
        : receivedAmount > 0 ? 'partial' : 'pending';
      // 补充协议的所有回款条件都收口在独立步骤，不再混入主合同的交付阶段。
      const mappedStep = contract.kind === 'supplement' ? 'supplement' : getPaymentTimelineStep(plan);
      const step = mappedStep === 'contract' && contract.id !== mainContract?.id ? 'closeout' : mappedStep;
      result[step].push({
        id: `${contract.id}-payment-${plan.period}`,
        label: plan.periodName || `第 ${plan.period} 期款`,
        amount: plan.amount,
        percentage: plan.percentage,
        condition: plan.condition || '按合同付款计划执行',
        receivedAmount,
        status,
      });
    });
  });

  return result;
}

export function buildProjectStageSummaries(input: ProjectStageSummaryInput): Record<ProjectDeliveryStage, ProjectStageSummary> {
  const mainContract = input.contracts.find((contract) => contract.kind !== 'supplement') ?? input.contracts[0];
  const signedConfirmations = input.confirmations.filter((item) => item.status === '已签署');
  const hasSignedConfirmation = (pattern: RegExp) => signedConfirmations.some((item) => pattern.test(item.type));
  const hasPendingConfirmation = (pattern: RegExp) => input.confirmations.some((item) => pattern.test(item.type) && item.status === '待签署');
  const activeBlockers = (input.project.blockers ?? []).filter((item) => !item.resolved);
  const designTasks = input.tasks.filter((item) => ['产品设计', 'UI 设计'].includes(item.type));
  const developmentTasks = input.tasks.filter((item) => item.type === '开发');
  const testingTasks = input.tasks.filter((item) => item.type === '测试');
  const taskDone = input.tasks.filter((item) => item.status === '已完成').length;
  const allTasksDone = input.tasks.length > 0 && taskDone === input.tasks.length;
  const fullyCollected = input.contractAmount > 0 && input.receivedAmount >= input.contractAmount;
  const paymentsByStage = buildPaymentsByStage(input);

  return {
    design: splitChecks('design', [
      { id: 'design-tasks', label: '已建立原型 / UI 设计任务', done: designTasks.length > 0, target: { main: 'tasks' } },
      { id: 'prototype-confirmed', label: '原型方案已确认', done: hasSignedConfirmation(/原型/), target: { side: 'documents' } },
      { id: 'ui-confirmed', label: 'UI 方案已确认', done: hasSignedConfirmation(/UI|视觉/), target: { side: 'documents' } },
    ], [], paymentsByStage.design),
    development: splitChecks('development', [
      { id: 'development-started', label: '开发任务已建立', done: developmentTasks.length > 0 || input.project.progress >= 30, target: { main: 'tasks' } },
      { id: 'development-completed', label: '开发范围已完成', done: developmentTasks.length > 0 ? developmentTasks.every((item) => item.status === '已完成') : input.project.progress >= 70, target: { main: 'tasks' } },
      { id: 'delivery-progress', label: '交付进度持续更新', done: input.project.progress > 0, target: { main: 'activity' } },
    ], activeBlockers.map((item) => ({ id: `blocker-${item.id}`, label: item.title, done: false, target: { main: 'activity' } })), paymentsByStage.development),
    testing: splitChecks('testing', [
      { id: 'testing-tasks', label: '已建立测试 / 联调任务', done: testingTasks.length > 0 || input.project.progress >= 70, target: { main: 'tasks' } },
      { id: 'testing-completed', label: '测试与回归已完成', done: testingTasks.length > 0 ? testingTasks.every((item) => item.status === '已完成') : input.project.progress >= 90, target: { main: 'tasks' } },
      { id: 'acceptance-materials', label: '验收材料已准备', done: hasPendingConfirmation(/验收|终验/) || hasSignedConfirmation(/验收|终验/) || input.project.progress >= 90, target: { side: 'documents' } },
    ], activeBlockers.map((item) => ({ id: `blocker-${item.id}`, label: item.title, done: false, target: { main: 'activity' } })), paymentsByStage.testing),
    acceptance: splitChecks('acceptance', [
      { id: 'deliverables-ready', label: '交付任务已收口', done: allTasksDone || input.project.progress >= 90, target: { main: 'tasks' } },
      { id: 'acceptance-materials', label: '培训、验收测试及材料已就绪', done: hasPendingConfirmation(/验收|终验/) || hasSignedConfirmation(/验收|终验/) || input.project.progress >= 90, target: { side: 'documents' } },
      { id: 'acceptance-signed', label: '客户验收文件已签署', done: hasSignedConfirmation(/验收|终验/), target: { side: 'documents' } },
    ], activeBlockers.map((item) => ({ id: `blocker-${item.id}`, label: item.title, done: false, target: { main: 'activity' } })), paymentsByStage.acceptance),
    closeout: splitChecks('closeout', [
      { id: 'contract-effective', label: '已有有效主合同', done: Boolean(mainContract && mainContract.status !== 'voided'), target: { main: 'contracts' } },
      { id: 'collection-started', label: '已产生实收记录', done: input.collections.length > 0, target: { main: 'payments' } },
      { id: 'fully-collected', label: '有效标的额已全部回款', done: fullyCollected, target: { main: 'payments' } },
      { id: 'project-completed', label: '项目已结项', done: input.project.status === '已完成', target: { main: 'activity' } },
    ], [], paymentsByStage.closeout),
  };
}

export function buildContractSigningStageSummary(input: ProjectStageSummaryInput): ProjectStageSummary | null {
  const mainContract = input.contracts.find((contract) => contract.kind !== 'supplement') ?? input.contracts[0];
  const payments = buildPaymentsByStage(input).contract;
  if (!mainContract || payments.length === 0) return null;

  return splitChecks('contract', [
    { id: 'contract-created', label: '主合同已创建', done: true, target: { main: 'contracts' } },
    { id: 'contract-signed', label: '合同已签订并归档', done: mainContract.status === 'archived', target: { main: 'contracts' } },
    { id: 'initial-payment', label: '合同签订触发款已足额到账', done: payments.every((item) => item.status === 'paid'), target: { main: 'payments' } },
  ], [], payments);
}

export function buildSupplementAgreementStageSummary(input: ProjectStageSummaryInput): ProjectStageSummary | null {
  const supplements = input.contracts.filter((contract) => contract.kind === 'supplement' && contract.status !== 'voided');
  if (supplements.length === 0) return null;

  const archivedCount = supplements.filter((contract) => contract.status === 'archived').length;
  const payments = buildPaymentsByStage(input).supplement;
  const checks: ProjectStageCheck[] = [
    {
      id: 'supplement-created',
      label: `已创建补充协议（${supplements.length} 份）`,
      done: true,
      target: { main: 'contracts' },
    },
    {
      id: 'supplement-archived',
      label: `补充协议已签订并归档（${archivedCount}/${supplements.length} 份）`,
      done: archivedCount === supplements.length,
      target: { main: 'contracts' },
    },
  ];

  if (payments.length > 0) {
    checks.push({
      id: 'supplement-collected',
      label: '补充协议已全部回款',
      done: payments.every((payment) => payment.status === 'paid'),
      target: { main: 'payments' },
    });
  }

  return splitChecks('supplement', checks, [], payments);
}

export function getCurrentProjectStageSummary(
  input: ProjectStageSummaryInput,
): ProjectStageSummary {
  const summaries = buildProjectStageSummaries(input);
  return summaries[getProjectDeliveryStage(input.project.status, input.project.progress)];
}
