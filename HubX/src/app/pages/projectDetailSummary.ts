import type { DeliveryPlan } from './delivery-plan/types';
import {
  calcOverallCompletion,
  derivePhaseStatus,
  isStepOverdue,
} from './delivery-plan/utils';
import type { Project, ProjectMemberHours } from './project-management/mockData';

export type SummaryRiskLevel = '正常' | '注意' | '预警' | '严重';

export interface ProjectSummaryCard {
  key: 'delivery' | 'owner' | 'deadline' | 'hours';
  title: string;
  value: string;
  alert: string;
  detail: string;
  level: SummaryRiskLevel;
}

interface BuildProjectSummaryCardsInput {
  project: Project;
  allProjects: Project[];
  deliveryPlan?: DeliveryPlan;
  memberHours: ProjectMemberHours[];
  totalHours: number;
  today: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function diffDays(from: string, to: string) {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / DAY_MS);
}

function formatConcurrentProjectNames(projects: Project[]) {
  if (projects.length <= 2) {
    return projects.map((item) => item.name).join('、');
  }
  return `${projects.slice(0, 2).map((item) => item.name).join('、')} 等 ${projects.length} 个`;
}

function buildDeliveryCard(
  project: Project,
  deliveryPlan: DeliveryPlan | undefined,
  today: string,
): ProjectSummaryCard {
  if (!deliveryPlan) {
    return {
      key: 'delivery',
      title: '交付进度',
      value: '暂无计划',
      alert: '暂未生成交付计划',
      detail: '无法识别延期步骤',
      level: '注意',
    };
  }

  const completionPct = Math.round(
    calcOverallCompletion(deliveryPlan.phases, deliveryPlan.steps) * 100,
  );

  const phaseSummaries = deliveryPlan.phases.map((phase) => {
    const phaseSteps = deliveryPlan.steps.filter(
      (step) => step.phaseId === phase.id,
    );
    return {
      phase,
      status: derivePhaseStatus(phaseSteps),
    };
  });

  const currentPhase =
    phaseSummaries.find((item) => item.status === 'in_progress')?.phase ??
    phaseSummaries.find((item) => item.status === 'pending')?.phase ??
    deliveryPlan.phases[deliveryPlan.phases.length - 1];

  const overdueSteps = deliveryPlan.steps
    .filter((step) => isStepOverdue(step, today))
    .map((step) => ({
      step,
      overdueDays: diffDays(step.dueDate, today),
    }))
    .sort((left, right) => right.overdueDays - left.overdueDays);

  if (overdueSteps.length > 0) {
    const worst = overdueSteps[0];
    const nextMilestone = deliveryPlan.milestones
      .filter((item) => !item.completed)
      .sort((left, right) => left.date.localeCompare(right.date))[0];

    return {
      key: 'delivery',
      title: '交付进度',
      value: `${currentPhase.phaseName} / ${completionPct}%`,
      alert: `${worst.step.stepName}逾期 ${worst.overdueDays} 天`,
      detail: nextMilestone
        ? `下一里程碑：${nextMilestone.name}（${nextMilestone.date}）`
        : '暂无未完成里程碑',
      level: worst.overdueDays >= 7 ? '严重' : '预警',
    };
  }

  const nearestStep = deliveryPlan.steps
    .filter(
      (step) => step.status === 'pending' || step.status === 'in_progress',
    )
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))[0];

  return {
    key: 'delivery',
    title: '交付进度',
    value: `${currentPhase.phaseName} / ${completionPct}%`,
    alert: '当前无逾期',
    detail: nearestStep
      ? `最接近到期：${nearestStep.stepName}（${nearestStep.dueDate}）`
      : '当前无进行中的交付任务',
    level: '正常',
  };
}

function buildOwnerCard(
  project: Project,
  allProjects: Project[],
): ProjectSummaryCard {
  const concurrentHighPriorityProjects = allProjects.filter((item) => {
    return (
      item.id !== project.id &&
      item.owner === project.owner &&
      item.priority === '高' &&
      item.status !== '已完成'
    );
  });

  if (concurrentHighPriorityProjects.length === 0) {
    return {
      key: 'owner',
      title: '负责人',
      value: project.owner,
      alert: '当前无高优并行项目',
      detail: '当前项目可优先推进',
      level: '正常',
    };
  }

  const count = concurrentHighPriorityProjects.length;
  const level: SummaryRiskLevel =
    count >= 3 ? '严重' : count >= 2 ? '预警' : '注意';

  return {
    key: 'owner',
    title: '负责人',
    value: project.owner,
    alert: `另有 ${count} 个高优项目并行`,
    detail: formatConcurrentProjectNames(concurrentHighPriorityProjects),
    level,
  };
}

function buildDeadlineCard(
  project: Project,
  today: string,
): ProjectSummaryCard {
  if (!project.expectedEndDate) {
    return {
      key: 'deadline',
      title: '交付时间',
      value: '未设置',
      alert: '未设置交付日期',
      detail: '无法判断剩余/逾期时间',
      level: '注意',
    };
  }

  const remainingDays = diffDays(today, project.expectedEndDate);

  if (remainingDays < 0) {
    return {
      key: 'deadline',
      title: '交付时间',
      value: `已逾期 ${Math.abs(remainingDays)} 天`,
      alert: `合同约定交付日：${project.expectedEndDate}`,
      detail: '已逾期',
      level: '严重',
    };
  }

  if (remainingDays <= 7) {
    return {
      key: 'deadline',
      title: '交付时间',
      value: `剩余 ${remainingDays} 天`,
      alert: `合同约定交付日：${project.expectedEndDate}`,
      detail: '临近交付',
      level: '预警',
    };
  }

  return {
    key: 'deadline',
    title: '交付时间',
    value: `剩余 ${remainingDays} 天`,
    alert: `合同约定交付日：${project.expectedEndDate}`,
    detail: '时间充足',
    level: '正常',
  };
}

function buildHoursCard(
  memberHours: ProjectMemberHours[],
  totalHours: number,
): ProjectSummaryCard {
  if (memberHours.length === 0 || totalHours === 0) {
    return {
      key: 'hours',
      title: '总工时',
      value: '0H',
      alert: '暂无工时记录',
      detail: '暂无高消耗成员',
      level: '注意',
    };
  }

  const topMembers = [...memberHours]
    .sort((left, right) => right.hours - left.hours)
    .slice(0, 3);

  const topHours = topMembers.reduce((sum, item) => sum + item.hours, 0);
  const concentration = Math.round((topHours / totalHours) * 100);
  const alert = topMembers
    .map((item) => `${item.personName} ${item.hours}H`)
    .join(' / ');
  const level: SummaryRiskLevel =
    concentration >= 80 ? '预警' : concentration >= 60 ? '注意' : '正常';

  return {
    key: 'hours',
    title: '总工时',
    value: `${totalHours}H`,
    alert,
    detail: `前三成员占比 ${concentration}%`,
    level,
  };
}

export function buildProjectSummaryCards(
  input: BuildProjectSummaryCardsInput,
): ProjectSummaryCard[] {
  const { project, allProjects, deliveryPlan, memberHours, totalHours, today } =
    input;

  return [
    buildDeliveryCard(project, deliveryPlan, today),
    buildOwnerCard(project, allProjects),
    buildDeadlineCard(project, today),
    buildHoursCard(memberHours, totalHours),
  ];
}
