import {
  collectionAmountForPeriod,
  getCollectionPeriods,
  type CollectionLedgerEntry,
} from '../../../services/collectionMutations';
import type { Contract, ContractStatus, PaymentPlanItem } from '../contracts/types';
import type {
  ActivityEvent,
  ProjectConfirmation,
  ProjectListItem,
  ProjectMeetingMinutes,
} from './types';
import type { ProjectWorkTask } from './projectTasks';

export type ProjectActivityKind =
  | 'contract'
  | 'collection'
  | 'confirmation'
  | 'meeting'
  | 'task'
  | 'followup'
  | 'milestone'
  | 'risk'
  | 'status';

export type ProjectActivitySeverity = 'neutral' | 'success' | 'warning' | 'danger';

export interface ProjectActivityFact {
  label: string;
  value: string;
  tone?: ProjectActivitySeverity;
}

export interface ProjectActivityTarget {
  main?: 'activity' | 'contracts' | 'payments' | 'team' | 'tasks' | 'basic';
  side?: 'follow' | 'meetings' | 'documents' | 'quotation' | 'contract-records' | 'presales' | 'demo' | 'travel' | 'reimbursement';
  route?: string;
  anchor?: string;
}

export type ProjectActivityAction =
  | 'record-collection'
  | 'open-confirmation'
  | 'open-task'
  | 'open-meeting';

export interface ProjectActivityItem {
  id: string;
  projectId: string;
  kind: ProjectActivityKind;
  title: string;
  summary: string;
  operator: string;
  occurredAt: string;
  severity: ProjectActivitySeverity;
  isMajor: boolean;
  facts: ProjectActivityFact[];
  sourceTarget: ProjectActivityTarget;
  primaryAction?: ProjectActivityAction;
  sourceId?: string;
}

export interface BuildProjectActivityInput {
  project: Pick<ProjectListItem, 'id' | 'name' | 'riskLevel' | 'blockers'>;
  contracts: Contract[];
  collections: CollectionLedgerEntry[];
  confirmations: ProjectConfirmation[];
  meetings: ProjectMeetingMinutes[];
  tasks: ProjectWorkTask[];
  ownedEvents: ActivityEvent[];
  now?: Date;
}

const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  draft: '草稿',
  approving: '审批中',
  pending_mail: '待寄出',
  pending_return: '待回寄',
  archived: '已归档',
  voided: '已作废',
};

const CONTRACT_EVENT_TITLE: Record<ContractStatus, string> = {
  draft: '合同草稿已创建',
  approving: '合同已提交审批',
  pending_mail: '合同审批通过',
  pending_return: '合同已寄出，等待回寄',
  archived: '合同扫描件已归档',
  voided: '合同已作废',
};

const money = (value: number) => `¥${Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;

function contractEventTime(contract: Contract): string {
  if (contract.status === 'archived') {
    return [...contract.archivedScans].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0]?.uploadedAt || contract.updatedAt;
  }
  if (contract.status === 'pending_return') return contract.mailedAt || contract.updatedAt;
  if (contract.status === 'pending_mail') return contract.approvedAt || contract.updatedAt;
  if (contract.status === 'approving') {
    return [...(contract.approvalRounds ?? [])].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]?.submittedAt || contract.updatedAt;
  }
  return contract.status === 'draft' ? contract.createdAt : contract.updatedAt;
}

function projectContractLabel(contract: Contract): string {
  return contract.kind === 'supplement' ? '补充合同' : '主合同';
}

function buildContractItems(contracts: Contract[]): ProjectActivityItem[] {
  return contracts.map((contract) => ({
    id: `contract-${contract.id}-${contract.status}`,
    projectId: contract.projectId || '',
    kind: 'contract',
    title: CONTRACT_EVENT_TITLE[contract.status],
    summary: `${projectContractLabel(contract)} ${contract.contractNo} 当前为${CONTRACT_STATUS_LABEL[contract.status]}。`,
    operator: contract.status === 'draft' ? contract.createdBy : '系统',
    occurredAt: contractEventTime(contract),
    severity: contract.status === 'voided' ? 'danger' : contract.status === 'archived' ? 'success' : contract.status === 'approving' ? 'warning' : 'neutral',
    isMajor: ['pending_mail', 'pending_return', 'archived', 'voided'].includes(contract.status),
    facts: [
      { label: '合同编号', value: contract.contractNo },
      { label: '合同金额', value: money(contract.current.totalAmount) },
      { label: '当前状态', value: CONTRACT_STATUS_LABEL[contract.status] },
    ],
    sourceTarget: { side: 'contract-records', route: `/contracts/${contract.id}` },
    sourceId: contract.id,
  }));
}

function periodLabel(plan: PaymentPlanItem | undefined, period: number | 'other' | undefined): string {
  if (plan?.periodName) return plan.periodName;
  if (period === 'other' || period === undefined) return '其他款项';
  return `第 ${period} 期`;
}

function collectionsByPeriod(collections: CollectionLedgerEntry[], contractId: string, period: number) {
  return collections
    .filter((item) => item.contractId === contractId)
    .reduce((sum, item) => sum + collectionAmountForPeriod(item, period), 0);
}

function buildCollectionItems(
  contracts: Contract[],
  collections: CollectionLedgerEntry[],
  today: string,
): ProjectActivityItem[] {
  const contractById = new Map(contracts.map((contract) => [contract.id, contract]));
  const received = collections.map<ProjectActivityItem>((collection) => {
    const contract = contractById.get(collection.contractId);
    const periods = getCollectionPeriods(collection);
    const plans = contract?.current.paymentPlans.filter((item) => periods.includes(item.period)) ?? [];
    const labels = plans.map((plan) => periodLabel(plan, plan.period));
    const expected = plans.length > 0 ? plans.reduce((sum, plan) => sum + plan.amount, 0) : collection.amount;
    return {
      id: `collection-${collection.id}`,
      projectId: collection.projectId || contract?.projectId || '',
      kind: 'collection',
      title: `${labels.length > 0 ? labels.join('、') : '其他款项'}${labels.length > 1 ? '合并' : ''}到账`,
      summary: collection.note || `${projectContractLabel(contract ?? ({ kind: 'main' } as Contract))}已登记一笔实收。`,
      operator: '财务',
      occurredAt: collection.date,
      severity: 'success',
      isMajor: false,
      facts: [
        { label: '应收', value: money(expected) },
        { label: '本次实收', value: money(collection.amount), tone: 'success' },
        { label: '本期差额', value: money(Math.max(0, expected - collection.amount)) },
        { label: '到账方式', value: collection.method || '未记录' },
      ],
      sourceTarget: { main: 'payments' },
      sourceId: collection.id,
    };
  });

  const overdue = contracts.flatMap<ProjectActivityItem>((contract) => {
    if (contract.status === 'voided') return [];
    return contract.current.paymentPlans.flatMap((plan) => {
      const actual = collectionsByPeriod(collections, contract.id, plan.period);
      if (!plan.expectedDate || plan.expectedDate >= today || actual >= plan.amount) return [];
      return [{
        id: `collection-overdue-${contract.id}-${plan.period}`,
        projectId: contract.projectId || '',
        kind: 'collection',
        title: `${periodLabel(plan, plan.period)}已逾期`,
        summary: `计划回款日为 ${plan.expectedDate}，当前仍有 ${money(plan.amount - actual)} 未到账。`,
        operator: '系统',
        occurredAt: `${plan.expectedDate} 23:59`,
        severity: 'danger',
        isMajor: false,
        facts: [
          { label: '计划应收', value: money(plan.amount) },
          { label: '实际到账', value: money(actual) },
          { label: '待回款', value: money(plan.amount - actual), tone: 'danger' },
          { label: '计划日期', value: plan.expectedDate },
        ],
        sourceTarget: { main: 'payments' },
        primaryAction: 'record-collection',
        sourceId: contract.id,
      }];
    });
  });

  return [...received, ...overdue];
}

function buildConfirmationItems(confirmations: ProjectConfirmation[]): ProjectActivityItem[] {
  return confirmations
    .filter((confirmation) => confirmation.status === '已签署')
    .map((confirmation) => ({
      id: `confirmation-${confirmation.id}`,
      projectId: confirmation.projectId,
      kind: 'confirmation',
      title: `${confirmation.type}已签署`,
      summary: confirmation.attachment ? `签署文件 ${confirmation.attachment} 已回收。` : '签署结果已登记。',
      operator: confirmation.signer || '客户',
      occurredAt: confirmation.signDate,
      severity: 'success',
      isMajor: true,
      facts: [
        { label: '确认书', value: confirmation.type },
        { label: '签署状态', value: confirmation.status, tone: 'success' },
        { label: '签署日期', value: confirmation.signDate || '未记录' },
        { label: '文件', value: confirmation.attachment || '无附件' },
      ],
      sourceTarget: { side: 'documents' },
      primaryAction: 'open-confirmation',
      sourceId: confirmation.id,
    }));
}

function buildMeetingItems(meetings: ProjectMeetingMinutes[]): ProjectActivityItem[] {
  return meetings.map((meeting) => ({
    id: `meeting-${meeting.id}`,
    projectId: meeting.projectId,
    kind: 'meeting',
    title: `会议纪要已归档：${meeting.subject}`,
    summary: meeting.minutes,
    operator: meeting.recorder,
    occurredAt: meeting.meetingTime,
    severity: 'neutral',
    isMajor: false,
    facts: [
      { label: '内部参会', value: meeting.employeeAttendees.join('、') || '未记录' },
      { label: '外部参会', value: meeting.externalAttendees.join('、') || '无' },
      { label: '行动项', value: '未接行动项台账' },
    ],
    sourceTarget: { side: 'meetings' },
    primaryAction: 'open-meeting',
    sourceId: meeting.id,
  }));
}

function buildTaskItems(tasks: ProjectWorkTask[], today: string): ProjectActivityItem[] {
  return tasks.flatMap<ProjectActivityItem>((task) => {
    const history = task.logs
      .filter((log) => ['已完成', '已搁置', '已逾期'].includes(log.status))
      .map<ProjectActivityItem>((log) => ({
        id: `task-${task.id}-${log.id}`,
        projectId: task.projectId,
        kind: 'task',
        title: log.status === '已完成' ? `任务已完成：${task.title}` : `任务${log.status.slice(1)}：${task.title}`,
        summary: log.comment || task.description,
        operator: log.operator,
        occurredAt: log.time,
        severity: log.status === '已完成' ? 'success' : log.status === '已逾期' ? 'danger' : 'warning',
        isMajor: false,
        facts: [
          { label: '负责人', value: log.assignee || task.assignee },
          { label: '截止日期', value: task.plannedEndDate },
          { label: '状态', value: log.status },
          { label: '完成进度', value: `${log.progress}%` },
        ],
        sourceTarget: { main: 'tasks', route: `/projects/${task.projectId}/work-items?tab=tasks` },
        primaryAction: 'open-task',
        sourceId: task.id,
      }));

    const hasOverdueLog = task.logs.some((log) => log.status === '已逾期');
    if (task.status !== '已完成' && task.plannedEndDate && task.plannedEndDate < today && !hasOverdueLog) {
      history.push({
        id: `task-overdue-${task.id}-${task.plannedEndDate}`,
        projectId: task.projectId,
        kind: 'task',
        title: `任务已逾期：${task.title}`,
        summary: `计划完成日期为 ${task.plannedEndDate}，当前状态为${task.status}。`,
        operator: '系统',
        occurredAt: `${task.plannedEndDate} 23:59`,
        severity: 'danger',
        isMajor: false,
        facts: [
          { label: '负责人', value: task.assignee },
          { label: '截止日期', value: task.plannedEndDate, tone: 'danger' },
          { label: '当前状态', value: task.status },
          { label: '完成进度', value: `${task.progress}%` },
        ],
        sourceTarget: { main: 'tasks', route: `/projects/${task.projectId}/work-items?tab=tasks` },
        primaryAction: 'open-task',
        sourceId: task.id,
      });
    }
    return history;
  });
}

const LEGACY_KEY_FOLLOWUP = /确认|决策|验收|催收|交付|签署|上线|里程碑|现场/;

function buildOwnedItems(events: ActivityEvent[], hasContracts: boolean, hasConfirmations: boolean): ProjectActivityItem[] {
  return events.flatMap<ProjectActivityItem>((event) => {
    if (event.type === 'daily_report' || event.type === 'meeting') return [];
    if (event.type === 'contract' && hasContracts) return [];
    if (event.type === 'confirmation' && hasConfirmations) return [];
    if (event.type === 'followup' && !event.isMajor && !LEGACY_KEY_FOLLOWUP.test(event.title)) return [];

    const kind: ProjectActivityKind = event.type === 'status_change'
      ? 'status'
      : event.type === 'confirmation'
      ? 'confirmation'
      : event.type === 'contract'
      ? 'contract'
      : event.type === 'milestone'
      ? 'milestone'
      : 'followup';
    const isMajor = Boolean(event.isMajor || ['milestone', 'confirmation', 'contract', 'status_change'].includes(event.type));
    return [{
      id: `owned-${event.id}`,
      projectId: event.projectId,
      kind,
      title: event.title,
      summary: event.content,
      operator: event.operator,
      occurredAt: event.createdAt,
      severity: event.severity || (kind === 'milestone' || kind === 'confirmation' ? 'success' : 'neutral'),
      isMajor,
      facts: event.milestoneTag ? [{ label: '关键节点', value: event.milestoneTag }] : [],
      sourceTarget: kind === 'followup' ? { side: 'follow' } : { main: 'activity' },
      sourceId: event.id,
    }];
  });
}

function buildRiskItems(project: BuildProjectActivityInput['project']): ProjectActivityItem[] {
  return (project.blockers ?? []).map((blocker) => ({
    id: `risk-${blocker.id}-${blocker.resolved ? 'resolved' : 'active'}`,
    projectId: project.id,
    kind: 'risk',
    title: blocker.resolved ? `阻塞已解除：${blocker.title}` : `项目阻塞：${blocker.title}`,
    summary: blocker.resolved
      ? `由 ${blocker.resolvedBy || '项目成员'} 于 ${blocker.resolvedAt || '未记录时间'} 解除。`
      : `来源为${blocker.source === 'customer' ? '客户侧' : blocker.source === 'third_party' ? '第三方' : '内部'}，需要持续处理。`,
    operator: blocker.resolved ? blocker.resolvedBy || '项目成员' : blocker.owner || '待指派',
    occurredAt: blocker.resolvedAt || blocker.createdAt,
    severity: blocker.resolved ? 'success' : blocker.severity === 'critical' ? 'danger' : 'warning',
    isMajor: !blocker.resolved && blocker.severity !== 'minor',
    facts: [
      { label: '责任人', value: blocker.owner || '待指派' },
      { label: '预计解除', value: blocker.expectedResolveDate || blocker.customerEta || '未设置' },
      { label: '状态', value: blocker.resolved ? '已解除' : '处理中' },
    ],
    sourceTarget: { main: 'activity', anchor: 'project-risk' },
    sourceId: blocker.id,
  }));
}

/**
 * 项目动态是跨域事实的只读投影（ADR-0097）。
 * adapters 只读取各域事实；去重键由来源类型 + 来源 id + 语义状态组成。
 */
export function buildProjectActivity(input: BuildProjectActivityInput): ProjectActivityItem[] {
  const today = (input.now ?? new Date()).toISOString().slice(0, 10);
  const items = [
    ...buildContractItems(input.contracts),
    ...buildCollectionItems(input.contracts, input.collections, today),
    ...buildConfirmationItems(input.confirmations),
    ...buildMeetingItems(input.meetings),
    ...buildTaskItems(input.tasks, today),
    ...buildOwnedItems(input.ownedEvents, input.contracts.length > 0, input.confirmations.length > 0),
    ...buildRiskItems(input.project),
  ].filter((item) => item.projectId === input.project.id || !item.projectId);

  return Array.from(new Map(items.map((item) => [item.id, item])).values())
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id));
}

export function onlyMajorActivity(items: ProjectActivityItem[]): ProjectActivityItem[] {
  return items.filter((item) => item.isMajor);
}

export interface ProjectActivityGroup {
  key: string;
  label: string;
  items: ProjectActivityItem[];
}

export function groupProjectActivity(items: ProjectActivityItem[], now = new Date()): ProjectActivityGroup[] {
  const today = now.toISOString().slice(0, 10);
  const yesterdayDate = new Date(now);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  const groups = new Map<string, ProjectActivityItem[]>();
  items.forEach((item) => {
    const date = item.occurredAt.slice(0, 10);
    groups.set(date, [...(groups.get(date) ?? []), item]);
  });
  return Array.from(groups.entries()).map(([key, groupItems]) => ({
    key,
    label: key === today ? '今天' : key === yesterday ? '昨天' : key,
    items: groupItems,
  }));
}

export function getProjectActivityPendingCounts(input: {
  confirmations: ProjectConfirmation[];
  contracts: Contract[];
  travels: Array<{ status: string }>;
  reimbursements: Array<{ status: string }>;
}) {
  return {
    documents: input.confirmations.filter((item) => item.status === '待签署').length,
    contracts: input.contracts.filter((item) => ['approving', 'pending_return'].includes(item.status)).length,
    travel: input.travels.filter((item) => item.status === '待审批').length,
    reimbursement: input.reimbursements.filter((item) => item.status === '待审批').length,
  };
}
