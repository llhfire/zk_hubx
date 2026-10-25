// src/app/pages/daily-report/templateConfig.ts

import {
  AdDeliveryRow,
  DailyReportRule,
  DailyTemplate,
  LeadTrackingItem,
  UserTemplateConfig,
  WorkKind,
} from './types';

// 销售日报模板
export const salesTemplate: DailyTemplate = {
  id: 'sales-template-default',
  name: '销售日报模板',
  type: 'sales',
  isDefault: true,
  fields: [
    {
      id: 'lead-tracking',
      name: '线索跟进情况',
      type: 'lead-tracking',
      required: false,
      order: 1,
    },
    {
      id: 'assistance-needed',
      name: '需协助事项',
      type: 'textarea',
      required: false,
      order: 2,
    },
    {
      id: 'tomorrow-plan',
      name: '明日工作计划',
      type: 'textarea',
      required: true,
      order: 3,
    },
  ],
};

// 通用日报模板
export const generalTemplate: DailyTemplate = {
  id: 'general-template-default',
  name: '通用日报模板',
  type: 'general',
  isDefault: true,
  fields: [
    {
      id: 'project-tasks',
      name: '任务明细',
      type: 'project-task-list',
      required: false,
      order: 1,
    },
    {
      id: 'today-summary',
      name: '今日总结',
      type: 'textarea',
      required: false,
      order: 2,
    },
    {
      id: 'problems-encountered',
      name: '遇到的问题',
      type: 'textarea',
      required: false,
      order: 3,
    },
    {
      id: 'tomorrow-plan',
      name: '明日工作计划',
      type: 'textarea',
      required: true,
      order: 4,
    },
  ],
};

// 获取用户模板配置（模拟）
export function getUserTemplateConfig(userId: string): UserTemplateConfig | null {
  const configs: Record<string, UserTemplateConfig> = {
    'user-sales-zhangsan': { userId: 'user-sales-zhangsan', templateId: 'sales-template-default' },
  };
  return configs[userId] || null;
}

// 根据用户ID获取模板
export function getUserTemplate(userId: string, userRole: 'sales' | 'other' = 'other'): DailyTemplate {
  const userConfig = getUserTemplateConfig(userId);
  if (userConfig) {
    if (userConfig.templateId === 'sales-template-default') return salesTemplate;
    if (userConfig.templateId === 'general-template-default') return generalTemplate;
  }
  return userRole === 'sales' ? salesTemplate : generalTemplate;
}

// 模拟用户数据
export const mockUsers = [
  { id: 'user-sales-zhangsan', name: '张三', role: 'sales' as const, department: '销售部', position: '销售' },
  { id: 'user-sales-lisi', name: '李四', role: 'sales' as const, department: '销售部', position: '销售' },
  { id: 'user-ad-zhaoliu', name: '赵六', role: 'other' as const, department: '新媒体部门', position: '新媒体' },
  { id: 'user-tech-wangwu', name: '王五', role: 'other' as const, department: '技术部', position: '开发' },
  { id: 'user-admin-qianqi', name: '钱七', role: 'other' as const, department: '行政财务', position: '运营岗位' },
];

const BUSINESS_WORK_KINDS: WorkKind[] = ['dev-coding', 'requirement', 'solution-design', 'project-mgmt', 'testing', 'doc-writing', 'meeting', 'code-review', 'bug-fix', 'deploy'];

export const dailyReportRules: DailyReportRule[] = [
  {
    position: '销售',
    templateType: 'sales',
    relationTypes: ['project', 'lead', 'pre-sale-common'],
    workKinds: ['requirement', 'solution-design', 'meeting'],
    costBucket: 'lead-pending',
    requireRelation: true,
  },
  {
    position: '新媒体',
    templateType: 'ad-delivery',
    relationTypes: ['ad-account', 'lead', 'project'],
    workKinds: ['ad-optimization', 'data-analysis'],
    costBucket: 'ad-operation',
    requireRelation: true,
  },
  {
    position: '开发',
    templateType: 'dev',
    relationTypes: ['project'],
    workKinds: BUSINESS_WORK_KINDS,
    costBucket: 'project',
    requireRelation: true,
  },
  {
    position: '运营岗位',
    templateType: 'general',
    relationTypes: ['operation'],
    workKinds: ['meeting', 'doc-writing', 'data-analysis'],
    costBucket: 'operation',
    requireRelation: false,
  },
];

export function getDailyReportRuleForUser(userId: string): DailyReportRule {
  const user = mockUsers.find(u => u.id === userId);
  return dailyReportRules.find(rule => rule.position === user?.position) || dailyReportRules[dailyReportRules.length - 1];
}

// 获取线索跟进数据（模拟）
export function getSalesDailyLeadsData(userId: string, date: Date): LeadTrackingItem[] {
  const mockLeads: LeadTrackingItem[] = [
    {
      leadId: 'lead-1',
      leadName: '阿里巴巴-企业管理系统',
      level: 'S',
      statusChanges: ['意向低 → 意向高'],
      followRecords: ['今天电话沟通，对方表示有合作意向，希望进一步演示产品。'],
      hours: 0,
    },
    {
      leadId: 'lead-2',
      leadName: '腾讯-云服务平台',
      level: 'A',
      statusChanges: [],
      followRecords: ['下午发送了产品资料包，对方已确认收到。'],
      hours: 0,
    },
    {
      leadId: 'lead-3',
      leadName: '字节跳动-协作工具',
      level: 'B',
      statusChanges: ['初步建联 → 已出demo'],
      followRecords: ['上午进行线上demo演示，对方反馈积极。'],
      hours: 0,
    },
  ];
  return mockLeads;
}

// 投放日报模板
export const adDeliveryTemplate: DailyTemplate = {
  id: 'ad-delivery-template-default',
  name: '新媒体日报模板',
  type: 'ad-delivery',
  description: '新媒体部门使用，记录投放、内容制作与其他工作',
  isDefault: true,
  fields: [
    { id: 'work-items',          name: '工作项',       type: 'ad-delivery-table', required: true,  order: 1 },
    { id: 'assistance-needed',   name: '需协助事项',   type: 'textarea',          required: false, order: 2 },
    { id: 'tomorrow-plan',       name: '明日工作计划', type: 'textarea',          required: true,  order: 3 },
  ],
};

// 开发日报模板
export const devTemplate: DailyTemplate = {
  id: 'dev-template-default',
  name: '开发日报模板',
  type: 'dev',
  description: '研发人员使用，包含工种/项目/工时规范字段',
  isDefault: true,
  fields: [
    { id: 'work-kind',            name: '主要工种',    type: 'select',            required: true,  order: 1 },
    { id: 'project-tasks',        name: '项目任务',    type: 'project-task-list', required: true,  order: 2 },
    { id: 'code-progress',        name: '代码进展',    type: 'textarea',          required: false, order: 3 },
    { id: 'problems-encountered', name: '遇到的问题',  type: 'textarea',          required: false, order: 4 },
    { id: 'tomorrow-plan',        name: '明日工作计划', type: 'textarea',          required: true,  order: 5 },
  ],
};

// 所有可用模板
export const allTemplates: DailyTemplate[] = [salesTemplate, generalTemplate, adDeliveryTemplate, devTemplate];

// 判断是否为销售人员
export function isSalesUser(userId: string): boolean {
  const user = mockUsers.find(u => u.id === userId);
  return user?.role === 'sales';
}

// 判断是否为投放人员
export function isAdDeliveryUser(userId: string): boolean {
  return userId.startsWith('user-ad-');
}

// 判断是否为研发人员
export function isDevUser(userId: string): boolean {
  return userId.startsWith('user-dev-') || userId.startsWith('user-tech-');
}

// 根据用户角色智能选择默认模板
export function getDefaultTemplateForUser(userId: string): DailyTemplate {
  const rule = getDailyReportRuleForUser(userId);
  return allTemplates.find(template => template.type === rule.templateType) || generalTemplate;
}

// 模拟投放数据
export function getAdDeliveryMockData(): AdDeliveryRow[] {
  return [
    { id: 'ad-1', platform: '百度推广', account: '主账户', spend: 3200, impression: 128000, click: 3200, leads: 28, hours: 0 },
    { id: 'ad-2', platform: '抖音',     account: '品牌账户', spend: 5600, impression: 280000, click: 8400, leads: 45, hours: 0 },
    { id: 'ad-3', platform: '小红书',   account: '运营账户', spend: 1800, impression: 95000,  click: 2100, leads: 18, hours: 0 },
  ];
}
