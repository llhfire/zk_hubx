// ============================================================
// 项目管理模块 — 共享类型定义（列表页重构）
// ============================================================

// --- 项目状态（保留 8 态） ---
export type ProjectStatus = '未确认' | '未开始' | '进行中' | '已完成' | '验收中' | '搁置' | '延迟' | '催款中';

export const PROJECT_STATUS_LIST: ProjectStatus[] = [
  '未确认', '未开始', '进行中', '验收中', '催款中', '已完成', '搁置', '延迟',
];

export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  '未确认': 'orange',
  '未开始': 'blue',
  '进行中': 'arcoblue',
  '验收中': 'purple',
  '催款中': 'gold',
  '已完成': 'green',
  '搁置': 'gray',
  '延迟': 'red',
};

// --- 项目优先级 ---
export type ProjectPriority = '高' | '中' | '低' | '未设置';

export const PROJECT_PRIORITY_LIST: ProjectPriority[] = ['高', '中', '低', '未设置'];

export const PROJECT_PRIORITY_COLOR: Record<ProjectPriority, string> = {
  '高': 'red',
  '中': 'orange',
  '低': 'blue',
  '未设置': 'gray',
};

// --- 业务线 ---
export type BusinessLine = '外包' | '自研' | '自运营' | '未设置';

export const BUSINESS_LINE_LIST: BusinessLine[] = ['外包', '自研', '自运营', '未设置'];

export const BUSINESS_LINE_COLOR: Record<BusinessLine, string> = {
  '外包': 'blue',
  '自研': 'green',
  '自运营': 'purple',
  '未设置': 'gray',
};

// --- 签约主体 ---
export const COMPANY_ENTITY_LIST = ['中科软齐', '中科软盈', '中科软通', '武汉软艺', '中科网联'] as const;

// --- 健康度 ---
export type HealthStatus = 'normal' | 'warning' | 'danger';

export const HEALTH_LABEL: Record<HealthStatus, string> = {
  normal: '正常',
  warning: '关注',
  danger: '预警',
};

export const HEALTH_COLOR: Record<HealthStatus, string> = {
  normal: 'green',
  warning: 'orange',
  danger: 'red',
};

// --- Kanban 泳道 ---
export type KanbanLane = 'pending_confirm' | 'pending_start' | 'in_progress' | 'in_acceptance' | 'in_billing' | 'completed' | 'shelved';

export interface KanbanLaneConfig {
  key: KanbanLane;
  label: string;
  statuses: ProjectStatus[];
}

export const KANBAN_LANES: KanbanLaneConfig[] = [
  { key: 'pending_confirm', label: '待确认', statuses: ['未确认'] },
  { key: 'pending_start', label: '待启动', statuses: ['未开始'] },
  { key: 'in_progress', label: '开发实施中', statuses: ['进行中'] },
  { key: 'in_acceptance', label: '客户验收中', statuses: ['验收中'] },
  { key: 'in_billing', label: '尾款催收中', statuses: ['催款中'] },
  { key: 'completed', label: '已结项质保', statuses: ['已完成'] },
  { key: 'shelved', label: '搁置/延迟', statuses: ['搁置', '延迟'] },
];

// --- 快捷分栏 ---
export type ProjectQuickFilter =
  | 'all'
  | 'my'
  | 'pending_confirm'
  | 'in_progress'
  | 'at_risk'
  | 'acceptance_billing'
  | 'completed';

export const PROJECT_QUICK_FILTER_LABEL: Record<ProjectQuickFilter, string> = {
  all: '全部项目',
  my: '我负责的',
  pending_confirm: '待确认指派',
  in_progress: '进行中',
  at_risk: '逾期与预警',
  acceptance_billing: '验收与催款',
  completed: '已结项',
};

// --- 交付阶段（售前签约、立项指派是进入交付的前置条件，不属于交付阶段） ---
export type ProjectDeliveryStage = 'design' | 'development' | 'testing' | 'acceptance' | 'closeout';

export const PROJECT_DELIVERY_STAGES: ProjectDeliveryStage[] = ['design', 'development', 'testing', 'acceptance', 'closeout'];

export const PROJECT_DELIVERY_STAGE_LABEL: Record<ProjectDeliveryStage, string> = {
  design: '方案设计',
  development: '开发',
  testing: '测试',
  acceptance: '验收',
  closeout: '回款结项',
};

/** 状态决定商务末段，执行中的项目再用进度定位到具体交付阶段。 */
export function getProjectDeliveryStage(status: ProjectStatus, progress: number): ProjectDeliveryStage {
  if (status === '催款中' || status === '已完成') return 'closeout';
  if (status === '验收中' || progress >= 90) return 'acceptance';
  if (progress >= 70) return 'testing';
  if (progress >= 30) return 'development';
  return 'design';
}

export function getProjectDeliveryStageIndex(status: ProjectStatus, progress: number): number {
  return PROJECT_DELIVERY_STAGES.indexOf(getProjectDeliveryStage(status, progress));
}

// --- 项目阻塞项（关键卡点 / 外部依赖） ---
export type BlockerSource = 'customer' | 'third_party' | 'internal';

export const BLOCKER_SOURCE_LABEL: Record<BlockerSource, string> = {
  customer: '客户侧',
  third_party: '第三方',
  internal: '内部',
};

export type BlockerSeverity = 'critical' | 'major' | 'minor';

export const BLOCKER_SEVERITY_LABEL: Record<BlockerSeverity, string> = {
  critical: '阻塞',
  major: '高风险',
  minor: '关注',
};

export const BLOCKER_SEVERITY_COLOR: Record<BlockerSeverity, string> = {
  critical: 'red',
  major: 'orange',
  minor: 'blue',
};

export interface ProjectBlocker {
  id: string;
  projectId: string;
  /** 阻塞描述 */
  title: string;
  /** 来源：客户侧 / 第三方 / 内部 */
  source: BlockerSource;
  /** 严重程度 */
  severity: BlockerSeverity;
  /** 客户承诺 ETA（可选） */
  customerEta?: string;
  /** 预计解除日期 */
  expectedResolveDate?: string;
  /** 责任人 */
  owner?: string;
  /** 状态 */
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

// --- 项目风险等级 ---
export type ProjectRiskLevel = 'high' | 'medium' | 'low' | 'none';

export const PROJECT_RISK_LEVEL_LABEL: Record<ProjectRiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
  none: '无风险',
};

export const PROJECT_RISK_LEVEL_COLOR: Record<ProjectRiskLevel, string> = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
  none: 'green',
};

// --- 项目列表项 ---
export interface ProjectListItem {
  key: string;
  id: string;
  projectNo: string;
  /** 生产站原始项目 id；纯演示夹具不设置 */
  sourceProjectId?: number;
  sourceSystem?: 'production' | 'demo';
  name: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  businessLine: BusinessLine;
  entity: string;
  owner: string;
  salesUsers: string[];
  progress: number;
  startDate: string;
  expectedEndDate: string;
  latestProgress: string;
  remark: string;
  createdAt: string;
  leadId?: string;
  contractId?: string;

  // 阶段 D 扩展：阻塞项 + 风险
  blockers?: ProjectBlocker[];
  riskLevel?: ProjectRiskLevel;
  riskNote?: string;
  acceptanceCriteria?: string[];

  // 计算字段
  totalHours: number;        // 累计工时
  budgetHours: number;       // 预算工时
  bugP0Count: number;        // P0 Bug 数
  bugP1Count: number;        // P1 Bug 数
  daysRemaining: number;     // 剩余天数
  isOverdue: boolean;        // 是否逾期
  healthStatus: HealthStatus; // 健康度
  customerName?: string;     // 关联客户名
  contractAmount?: number;   // 合同金额
  receivedAmount?: number;   // 已回款金额
}

// --- 指标数据 ---
export interface ProjectMetrics {
  activeCount: number;       // 活跃项目总数
  activeByLine: Record<BusinessLine, number>; // 按业务线拆分
  warningCount: number;      // 健康度预警数
  pendingConfirmCount: number; // 待确认指派数
  monthlyHours: number;      // 本月工时
}

// --- 附件 ---
export interface ProjectAttachment {
  id: string;
  name: string;
  size: string;
  url?: string;
}

// --- 跟进记录 ---
export interface ProjectFollowUp {
  id: string;
  projectId: string;
  status: ProjectStatus;
  progress: number;
  content: string;
  attachments: ProjectAttachment[];
  operator: string;
  createdAt: string;
}

// --- 日报 ---
export interface ProjectDailyReport {
  id: string;
  projectId: string;
  date: string;
  projectName: string;
  personName: string;
  position: string;
  hours: number;
  workNature?: string;
  workContent: string;
  riskFeedback: string;
}

// --- Activity Stream 事件类型 ---
export type ActivityEventType =
  | 'followup'
  | 'meeting'
  | 'confirmation'
  | 'milestone'
  | 'daily_report'
  | 'contract'
  | 'status_change';

export const ACTIVITY_EVENT_LABEL: Record<ActivityEventType, string> = {
  followup: '跟进记录',
  meeting: '会议纪要',
  confirmation: '客户确认书',
  milestone: '里程碑达成',
  daily_report: '工时日报',
  contract: '合同/报价',
  status_change: '状态变更',
};

export const ACTIVITY_EVENT_ICON: Record<ActivityEventType, string> = {
  followup: '💬',
  meeting: '📝',
  confirmation: '✅',
  milestone: '🎯',
  daily_report: '⏱️',
  contract: '📄',
  status_change: '🔄',
};

export interface ActivityEvent {
  id: string;
  projectId: string;
  type: ActivityEventType;
  title: string;
  content: string;
  operator: string;
  createdAt: string;
  /** 关联线索的事件（售前阶段） */
  isPreSale?: boolean;
  /** 是否是关键事件；普通跟进不投影进项目动态 */
  isMajor?: boolean;
  /** 跟进时选择的关键节点 */
  milestoneTag?: string;
  /** 项目拥有事件的强调级别 */
  severity?: 'neutral' | 'success' | 'warning' | 'danger';
}

/** 项目会议纪要（详情域台账，按 projectId 组织） */
export interface ProjectMeetingMinutes {
  id: string;
  projectId: string;
  subject: string;
  meetingTime: string;
  employeeAttendees: string[];
  externalAttendees: string[];
  minutes: string;
  recorder: string;
}

/** 项目确认书（需求确认/原型确认/终验单等，按 projectId 组织） */
export interface ProjectConfirmation {
  id: string;
  projectId: string;
  type: string;
  status: '已签署' | '待签署';
  signer: string;
  signDate: string;
  attachment: string;
}

/** 项目演示环境（原型/测试/预发布，按 projectId 组织） */
export interface ProjectDemoEnv {
  id: string;
  projectId: string;
  env: '原型演示' | '测试环境' | '预发布环境' | '正式环境';
  url: string;
  description: string;
}
