import type {
  BusinessLine,
  HealthStatus,
  ProjectListItem,
  ProjectPriority,
  ProjectStatus,
} from './types';
import {
  PRODUCTION_PROJECT_SNAPSHOT,
  type ProductionProjectRecord,
  type ProductionProjectTag,
} from './productionProjectSnapshot';

const SNAPSHOT_DATE = '2026-08-29';

/**
 * 旧 mock 中已有合同、回款、日报联动的 6 个项目沿用本地 id。
 * 其余生产项目使用 prod-{生产 id}，防止与演示夹具碰撞。
 */
const LOCAL_ID_BY_SOURCE_ID: Record<number, string> = {
  76: '11',
  88: '10',
  113: '15',
  121: '12',
  123: '14',
  126: '13',
};

const PROJECT_STATUSES: ProjectStatus[] = [
  '未确认', '未开始', '进行中', '已完成', '验收中', '搁置', '延迟', '催款中',
];

function getText(value: ProductionProjectTag | string | null): string {
  if (!value) return '';
  return typeof value === 'string' ? value : value.name;
}

function mapStatus(value: ProductionProjectRecord['pro_status_text']): ProjectStatus {
  const text = getText(value);
  return PROJECT_STATUSES.includes(text as ProjectStatus) ? text as ProjectStatus : '未确认';
}

function mapPriority(value: ProductionProjectRecord['pro_priority_text']): ProjectPriority {
  const text = getText(value);
  return text === '高' || text === '中' || text === '低' ? text : '未设置';
}

function mapBusinessLine(value: ProductionProjectRecord['business_line_text']): BusinessLine {
  const text = getText(value);
  return text === '外包' || text === '自研' || text === '自运营' ? text : '未设置';
}

function parseNumber(value: number | string | null): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCountdown(expectedEndDate: string, status: ProjectStatus): { daysRemaining: number; isOverdue: boolean } {
  if (!expectedEndDate) return { daysRemaining: 0, isOverdue: false };

  const oneDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.ceil(
    (new Date(`${expectedEndDate}T00:00:00+08:00`).getTime() - new Date(`${SNAPSHOT_DATE}T00:00:00+08:00`).getTime()) / oneDay,
  );
  return {
    daysRemaining,
    isOverdue: daysRemaining < 0 && status !== '已完成',
  };
}

function getHealthStatus(status: ProjectStatus, progress: number, isOverdue: boolean): HealthStatus {
  if (isOverdue && progress < 100) return 'danger';
  if (isOverdue || status === '搁置' || status === '催款中' || status === '延迟') return 'warning';
  return 'normal';
}

function toProjectListItem(record: ProductionProjectRecord): ProjectListItem {
  const id = LOCAL_ID_BY_SOURCE_ID[record.id] ?? `prod-${record.id}`;
  const status = mapStatus(record.pro_status_text);
  const progress = Math.max(0, Math.min(100, parseNumber(record.total_process)));
  const expectedEndDate = record.end_time ?? '';
  const { daysRemaining, isOverdue } = getCountdown(expectedEndDate, status);

  return {
    key: id,
    id,
    projectNo: `PRJ-${record.id}`,
    sourceProjectId: record.id,
    sourceSystem: 'production',
    name: record.name,
    status,
    priority: mapPriority(record.pro_priority_text),
    businessLine: mapBusinessLine(record.business_line_text),
    entity: record.company_name ?? '未设置',
    owner: record.leader_realname ?? '',
    salesUsers: record.saleor_realname ? [record.saleor_realname] : [],
    progress,
    startDate: record.start_time ?? '',
    expectedEndDate,
    latestProgress: record.last_record ?? '暂无进展记录',
    remark: record.project_remark ?? '',
    createdAt: record.create_time,
    totalHours: parseNumber(record.used_work_hours),
    budgetHours: 0,
    bugP0Count: 0,
    bugP1Count: 0,
    daysRemaining,
    isOverdue,
    healthStatus: getHealthStatus(status, progress, isOverdue),
    riskLevel: isOverdue && progress < 100 ? 'high' : isOverdue ? 'medium' : 'none',
    riskNote: isOverdue ? `截至 ${SNAPSHOT_DATE} 已超过预计结束日期` : undefined,
  };
}

export const PRODUCTION_PROJECT_LIST: ProjectListItem[] = PRODUCTION_PROJECT_SNAPSHOT.map(toProjectListItem);

export const PRODUCTION_PROJECT_SOURCE_IDS = PRODUCTION_PROJECT_SNAPSHOT.map((project) => project.id);

