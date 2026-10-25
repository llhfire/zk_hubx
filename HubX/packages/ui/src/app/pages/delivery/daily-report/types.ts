// src/app/pages/daily-report/types.ts

// 模板字段类型
export type FieldType = 'text' | 'textarea' | 'lead-tracking' | 'project-task-list' | 'date' | 'select' | 'number' | 'ad-delivery-table';

// 模板字段定义
export interface TemplateField {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  order: number;
  options?: { label: string; value: string }[];
  placeholder?: string;
  unit?: string;
}

// 日报模板类型
export type DailyTemplateType = 'sales' | 'general' | 'ad-delivery' | 'dev';

// 日报模板
export interface DailyTemplate {
  id: string;
  name: string;
  type: DailyTemplateType;
  description: string;
  fields: TemplateField[];
  isDefault: boolean;
}

// 工作种类
export type WorkKind =
  | 'dev-coding'        // 开发编码
  | 'requirement'       // 需求沟通
  | 'solution-design'   // 方案编写
  | 'project-mgmt'      // 项目管理
  | 'testing'           // 测试验收
  | 'doc-writing'       // 文档编写
  | 'ad-optimization'   // 投放优化
  | 'data-analysis'     // 数据分析
  | 'meeting'           // 会议
  | 'code-review'       // Code Review
  | 'bug-fix'           // Bug 修复
  | 'deploy';           // 部署上线

export const WORK_KIND_LABELS: Record<WorkKind, string> = {
  'dev-coding':      '开发编码',
  'requirement':     '需求沟通',
  'solution-design': '方案编写',
  'project-mgmt':    '项目管理',
  'testing':         '测试验收',
  'doc-writing':     '文档编写',
  'ad-optimization': '投放优化',
  'data-analysis':   '数据分析',
  'meeting':         '会议',
  'code-review':     'Code Review',
  'bug-fix':         'Bug 修复',
  'deploy':          '部署上线',
};

/** 工种 → 能力维度映射（用于员工能力建模经验获取） */
export const WORK_KIND_ABILITY_MAP: Record<WorkKind, { dimension: 'tech' | 'biz' | 'mgmt' | 'tool' | 'domain'; xpPer8h: number }> = {
  'dev-coding':      { dimension: 'tech',   xpPer8h: 3 },
  'requirement':     { dimension: 'biz',    xpPer8h: 2 },
  'solution-design': { dimension: 'biz',    xpPer8h: 2 },
  'project-mgmt':    { dimension: 'mgmt',  xpPer8h: 2 },
  'testing':         { dimension: 'tech',   xpPer8h: 2 },
  'doc-writing':     { dimension: 'biz',    xpPer8h: 1 },
  'ad-optimization': { dimension: 'domain', xpPer8h: 3 },
  'data-analysis':   { dimension: 'domain', xpPer8h: 2 },
  'meeting':         { dimension: 'mgmt',  xpPer8h: 1 },
  'code-review':     { dimension: 'tech',   xpPer8h: 2 },
  'bug-fix':         { dimension: 'tech',   xpPer8h: 2 },
  'deploy':          { dimension: 'tool',   xpPer8h: 2 },
};

// 日报任务归属
export type DailyRelationType = 'project' | 'lead' | 'ad-account' | 'operation' | 'pre-sale-common';

// 日报工作归属
export type WorkAttributionType =
  | 'external-project'
  | 'internal-project'
  | 'department-routine'
  | 'presales-lead';

export type WorkAttributionCategory =
  | 'development'
  | 'operations'
  | 'software-presales'
  | 'immigration-presales'
  | 'promotion'
  | 'ecommerce';

// 成本归集桶
export type DailyCostBucket = 'project' | 'internal-project' | 'lead-pending' | 'operation' | 'ad-operation';

// 岗位日报规则
export interface DailyReportRule {
  position: string;
  templateType: DailyTemplateType;
  relationTypes: DailyRelationType[];
  workKinds: WorkKind[];
  costBucket: DailyCostBucket;
  requireRelation: boolean;
}

// 项目任务（带工种）
export interface ProjectTask {
  id: string;
  projectName: string;
  workKind: WorkKind;
  workAttributionCategory?: WorkAttributionCategory;
  workAttributionType?: WorkAttributionType;
  relationType?: DailyRelationType;
  relationId?: string;
  relationName?: string;
  description: string;
  taskForm?: string;
  hours: number;
}

// 线索跟进情况
export interface LeadTrackingItem {
  leadId: string;
  leadName: string;
  level: 'S' | 'A' | 'B' | 'C';
  statusChanges: string[];
  followRecords: string[];
  hours?: number;
}

export interface SalesWorkItem {
  id: string;
  type: 'lead' | 'project';
  workAttributionCategory?: WorkAttributionCategory;
  workAttributionType?: WorkAttributionType;
  relationId?: string;
  relationName?: string;
  leadId?: string;
  leadName?: string;
  projectId?: string;
  projectName?: string;
  content: string;
  hours: number;
  /** 工作性质，如：线索跟进 / 报价沟通 / 合同推进 等 */
  workNature?: string;
  riskFeedback?: string;
}

export interface AdDeliveryWorkItem {
  id: string;
  type: 'lead' | 'project' | 'ad' | 'content' | 'recruiting' | 'management' | 'other' | 'ad-account';
  workAttributionCategory?: WorkAttributionCategory;
  workAttributionType?: WorkAttributionType;
  relationId?: string;
  relationName?: string;
  projectName?: string;
  channel?: string;
  quantity?: number;
  position?: string;
  recruitStage?: string;
  candidateCount?: number;
  interviewCount?: number;
  managementType?: string;
  platform?: string;
  account?: string;
  spend?: number;
  impression?: number;
  click?: number;
  leads?: number;
  totalLeads?: number;
  validLeads?: number;
  content: string;
  hours: number;
}

// 投放数据行
export interface AdDeliveryRow {
  id: string;
  platform: string;    // 百度/抖音/小红书/微信/淘宝
  account: string;     // 账户名
  spend: number;       // 消耗（元）
  impression: number;  // 展示
  click: number;       // 点击
  leads: number;       // 线索数
  hours?: number;      // 投放工时
}

// 日报任务明细
export interface DailyReportTask {
  id: string;
  reportId: string;
  userId: string;
  userName: string;
  department: string;
  reportDate: string;
  templateType: DailyTemplateType;
  workAttributionCategory?: WorkAttributionCategory;
  workAttributionType?: WorkAttributionType;
  relationType: DailyRelationType;
  relationId: string;
  relationName: string;
  workKind: WorkKind;
  content: string;
  hours: number;
  costBucket: DailyCostBucket;
}

// 销售日报内容
export interface SalesReportContent {
  'work-items'?: SalesWorkItem[];
  'lead-tracking'?: LeadTrackingItem[];
  'assistance-needed'?: string;
  'tomorrow-plan'?: string;
}

// 通用日报内容（扩展：增加 work-kind + project + hours 规范）
export interface GeneralReportContent {
  'work-kind'?: WorkKind;
  'project-tasks'?: ProjectTask[];
  'today-summary'?: string;
  'problems-encountered'?: string;
  'tomorrow-plan'?: string;
}

// 投放日报内容
export interface AdDeliveryReportContent {
  'work-items'?: AdDeliveryWorkItem[];
  'ad-delivery-data'?: AdDeliveryRow[];
  'optimization-actions'?: string;
  'today-summary'?: string;
  'assistance-needed'?: string;
  'tomorrow-plan'?: string;
}

// 开发日报内容
export interface DevReportContent {
  'work-kind'?: WorkKind;
  'project-tasks'?: ProjectTask[];
  'code-progress'?: string;
  'problems-encountered'?: string;
  'tomorrow-plan'?: string;
}

// 日报类型（联合类型）
export type DailyReportContent = SalesReportContent | GeneralReportContent | AdDeliveryReportContent | DevReportContent;

// 日报
export interface DailyReport {
  id: string;
  userId: string;
  userName: string;
  department: string;
  reportDate: string;
  templateId: string;
  templateType: DailyTemplateType;
  content: DailyReportContent;
  tasks?: DailyReportTask[];
  status: 'draft' | 'submitted' | 'reviewed' | 'locked';
  createdAt: string;
  updatedAt: string;
  hasUnreadComments?: boolean;
}

// 日报评论
export interface DailyReportComment {
  id: string;
  reportId: string;
  userId: string;
  userName: string;
  content: string;
  mentionedUsers: string[];
  createdAt: string;
  readBy: string[];
}

// 用户模板配置
export interface UserTemplateConfig {
  userId: string;
  templateId: string;
}
