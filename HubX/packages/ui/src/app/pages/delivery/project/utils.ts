// ============================================================
// 项目管理模块 — 工具函数
// ============================================================

import type {
  ProjectListItem,
  ProjectStatus,
  HealthStatus,
  ProjectMetrics,
  BusinessLine,
  ProjectQuickFilter,
  KanbanLane,
  ActivityEvent,
  ActivityEventType,
} from './types';
import { KANBAN_LANES } from './types';

// --- 健康度判断 ---
export function calculateHealthStatus(project: ProjectListItem): HealthStatus {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 逾期 = 预计结束日期 < 今天 且状态非已完成
  const isOverdue = project.expectedEndDate
    ? new Date(project.expectedEndDate) < todayStart && project.status !== '已完成'
    : false;

  // 有 P0 或 P1 Bug
  const hasCriticalBug = project.bugP0Count > 0 || project.bugP1Count > 0;

  if (isOverdue || project.bugP0Count > 0) return 'danger';
  if (hasCriticalBug || project.status === '延迟') return 'warning';
  return 'normal';
}

// --- 工期倒计时 ---
export interface CountdownInfo {
  label: string;
  daysRemaining: number;
  isOverdue: boolean;
}

export function getProjectCountdown(startDate: string, expectedEndDate: string): CountdownInfo {
  if (!expectedEndDate) return { label: '-', daysRemaining: 0, isOverdue: false };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(expectedEndDate);
  const start = new Date(startDate);

  const daysRemaining = Math.ceil((end.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0;

  const startStr = startDate.slice(5, 10);
  const endStr = expectedEndDate.slice(5, 10);

  if (isOverdue) {
    return { label: `${startStr}~${endStr} 逾期${Math.abs(daysRemaining)}天`, daysRemaining, isOverdue: true };
  }
  if (daysRemaining === 0) {
    return { label: `${startStr}~${endStr} 今日到期`, daysRemaining: 0, isOverdue: false };
  }
  return { label: `${startStr}~${endStr} 余${daysRemaining}天`, daysRemaining, isOverdue: false };
}

// --- 指标计算 ---
export function calculateMetrics(projects: ProjectListItem[]): ProjectMetrics {
  const active = projects.filter((p) => p.status !== '已完成');

  const activeByLine: Record<BusinessLine, number> = { '外包': 0, '自研': 0, '自运营': 0, '未设置': 0 };
  active.forEach((p) => { activeByLine[p.businessLine]++; });

  const warningCount = projects.filter((p) => p.healthStatus === 'danger' || p.healthStatus === 'warning').length;
  const pendingConfirmCount = projects.filter((p) => p.status === '未确认').length;

  // 本月工时（从日报聚合，这里用 mock 数据的 totalHours 近似）
  const now = new Date();
  const monthlyHours = projects.reduce((sum, p) => sum + p.totalHours, 0);

  return {
    activeCount: active.length,
    activeByLine,
    warningCount,
    pendingConfirmCount,
    monthlyHours,
  };
}

// --- 快捷分栏筛选 ---
export function applyProjectQuickFilter(
  projects: ProjectListItem[],
  filter: ProjectQuickFilter,
  currentUser: string = '张三',
): ProjectListItem[] {
  switch (filter) {
    case 'all':
      return projects;
    case 'my':
      return projects.filter((p) => p.owner === currentUser);
    case 'pending_confirm':
      return projects.filter((p) => p.status === '未确认');
    case 'in_progress':
      return projects.filter((p) => p.status === '进行中');
    case 'at_risk':
      return projects.filter((p) => p.healthStatus === 'danger' || p.healthStatus === 'warning');
    case 'acceptance_billing':
      return projects.filter((p) => p.status === '验收中' || p.status === '催款中');
    case 'completed':
      return projects.filter((p) => p.status === '已完成');
    default:
      return projects;
  }
}

// --- 快捷分栏计数 ---
export function getProjectQuickFilterCounts(
  projects: ProjectListItem[],
  currentUser: string = '张三',
): Record<ProjectQuickFilter, number> {
  return {
    all: projects.length,
    my: projects.filter((p) => p.owner === currentUser).length,
    pending_confirm: projects.filter((p) => p.status === '未确认').length,
    in_progress: projects.filter((p) => p.status === '进行中').length,
    at_risk: projects.filter((p) => p.healthStatus === 'danger' || p.healthStatus === 'warning').length,
    acceptance_billing: projects.filter((p) => p.status === '验收中' || p.status === '催款中').length,
    completed: projects.filter((p) => p.status === '已完成').length,
  };
}

// --- Kanban 泳道映射 ---
export function getProjectsByKanbanLane(projects: ProjectListItem[]): Record<KanbanLane, ProjectListItem[]> {
  const result: Record<KanbanLane, ProjectListItem[]> = {
    pending_confirm: [],
    pending_start: [],
    in_progress: [],
    in_acceptance: [],
    in_billing: [],
    completed: [],
    shelved: [],
  };

  projects.forEach((p) => {
    const lane = KANBAN_LANES.find((l) => l.statuses.includes(p.status));
    if (lane) {
      result[lane.key].push(p);
    }
  });

  return result;
}

// --- 搜索过滤 ---
export function searchProjects(projects: ProjectListItem[], keyword: string): ProjectListItem[] {
  if (!keyword.trim()) return projects;
  const kw = keyword.toLowerCase().trim();
  return projects.filter((p) =>
    [p.projectNo, p.name, p.customerName, p.owner, p.entity]
      .filter(Boolean)
      .some((t) => t!.toLowerCase().includes(kw))
  );
}

// --- Activity Stream 筛选 ---
export function filterActivities(
  activities: ActivityEvent[],
  types?: ActivityEventType[],
): ActivityEvent[] {
  if (!types || types.length === 0) return activities;
  return activities.filter((a) => types.includes(a.type));
}

// --- 格式化工时 ---
export function formatHours(hours: number): string {
  if (hours >= 1000) return `${(hours / 1000).toFixed(1)}k`;
  return `${hours}h`;
}

// --- 格式化金额 ---
export function formatAmount(amount: number): string {
  if (amount >= 10000) return `¥${(amount / 10000).toFixed(1)}万`;
  return `¥${amount.toLocaleString()}`;
}
