import type { AdDeliveryReportContent, AdDeliveryWorkItem, DailyReport, DailyReportTask } from './types';
import { getWorkAttributionAccounting } from './workAttribution';

export const WORK_ITEM_LABELS: Record<AdDeliveryWorkItem['type'], string> = {
  lead: '线索相关',
  project: '项目相关',
  ad: '新媒体投放',
  content: '新媒体内容',
  recruiting: '招聘',
  management: '管理工作',
  other: '其他',
  'ad-account': '新媒体投放',
};

function workTarget(item: AdDeliveryWorkItem) {
  return item.relationName || item.projectName || item.position || item.managementType || '其他工作';
}

function taskContent(item: AdDeliveryWorkItem) {
  if (item.type === 'ad' || item.type === 'ad-account') {
    return `归属：${item.relationName || '-'}，渠道：${item.channel}，账户：${item.account}，消耗金额：${item.spend || 0}，总客资数：${item.totalLeads || 0}，有效客资数：${item.validLeads || 0}\n${item.content}`;
  }
  if (item.type === 'content') {
    return `归属：${item.relationName || '-'}，渠道：${item.channel}，数量：${item.quantity || 0}\n${item.content}`;
  }
  if (item.type === 'recruiting') {
    return `招聘岗位：${item.position}，阶段：${item.recruitStage}，候选人数：${item.candidateCount || 0}，面试人数：${item.interviewCount || 0}\n${item.content}`;
  }
  if (item.type === 'management') {
    return `管理事项：${item.managementType}\n${item.content}`;
  }
  return item.content;
}

function makeTasks(report: Omit<DailyReport, 'tasks'>, items: AdDeliveryWorkItem[]): DailyReportTask[] {
  return items.map((item, index) => {
    const isAd = item.type === 'ad' || item.type === 'ad-account';
    const workAttributionType = item.workAttributionType
      || (item.type === 'lead'
        ? 'presales-lead'
        : item.type === 'project'
          ? 'external-project'
          : 'department-routine');
    const accounting = getWorkAttributionAccounting(workAttributionType);
    return {
      id: `${report.id}-task-${index + 1}`,
      reportId: report.id,
      userId: report.userId,
      userName: report.userName,
      department: report.department,
      reportDate: report.reportDate,
      templateType: report.templateType,
      workAttributionCategory: item.workAttributionCategory,
      workAttributionType,
      relationType: accounting.relationType,
      relationId: item.relationId || `${item.projectName || item.type}-${index + 1}`,
      relationName: workTarget(item),
      workKind: item.type === 'lead' ? 'requirement' : item.type === 'project' ? 'project-mgmt' : isAd ? 'ad-optimization' : item.type === 'content' ? 'doc-writing' : item.type === 'recruiting' ? 'meeting' : 'data-analysis',
      content: taskContent(item),
      hours: item.hours,
      costBucket: accounting.costBucket,
    };
  });
}

function makeReport(input: {
  id: string;
  userId: string;
  userName: string;
  department: string;
  reportDate: string;
  items: AdDeliveryWorkItem[];
  assistance?: string;
  tomorrow: string;
}): DailyReport {
  const content: AdDeliveryReportContent = {
    'work-items': input.items,
    'assistance-needed': input.assistance || '',
    'tomorrow-plan': input.tomorrow,
  };
  const base: Omit<DailyReport, 'tasks'> = {
    id: input.id,
    userId: input.userId,
    userName: input.userName,
    department: input.department,
    reportDate: input.reportDate,
    templateId: 'unified-daily-template',
    templateType: 'ad-delivery',
    content,
    status: 'submitted',
    createdAt: `${input.reportDate}T18:00:00+08:00`,
    updatedAt: `${input.reportDate}T18:00:00+08:00`,
  };
  return { ...base, tasks: makeTasks(base, input.items) };
}

export const mockDailyReports: DailyReport[] = [
  makeReport({
    id: 'daily-1',
    userId: 'emp-sales-zhangsan',
    userName: '张三',
    department: '销售部',
    reportDate: '2026-07-08',
    items: [
      { id: 'wi-1', type: 'lead', workAttributionType: 'presales-lead', relationId: 'lead-1', relationName: 'A公司CRM系统开发需求', hours: 2, content: '电话确认预算和上线时间，客户希望本周安排一次产品演示。' },
      { id: 'wi-2', type: 'project', workAttributionType: 'internal-project', relationId: '3', relationName: '内部OA流程优化', hours: 1.5, content: '整理客户侧日报模块需求，补充销售视角的线索工时归属说明。' },
    ],
    assistance: '需要产品同事明天一起参加客户演示。',
    tomorrow: '准备阿里巴巴演示材料，继续确认内部 OA 报价范围。',
  }),
  makeReport({
    id: 'daily-2',
    userId: 'emp-media-zhaoliu',
    userName: '赵六',
    department: '新媒体部门',
    reportDate: '2026-07-08',
    items: [
      { id: 'wi-3', type: 'ad', workAttributionType: 'department-routine', relationId: 'routine-promotion', relationName: '推广中心日常', channel: '百度', account: '百度软艺', spend: 680, totalLeads: 18, validLeads: 9, hours: 3, content: '优化软件开发关键词出价，暂停 4 个无效词，新增 12 个长尾词。' },
      { id: 'wi-4', type: 'content', workAttributionType: 'department-routine', relationId: 'routine-mcn', relationName: 'MCN 传媒日常', channel: '小红书', quantity: 3, hours: 2, content: '完成 3 篇 IP 打造笔记初稿，调整封面标题和首图文案。' },
    ],
    assistance: '需要设计支持小红书封面模板。',
    tomorrow: '继续跟踪百度线索质量，发布小红书内容。',
  }),
  makeReport({
    id: 'daily-3',
    userId: 'emp-admin-qianqi',
    userName: '钱七',
    department: '行政财务',
    reportDate: '2026-07-08',
    items: [
      { id: 'wi-5', type: 'recruiting', workAttributionType: 'department-routine', relationId: 'routine-hr-recruiting', relationName: '人员招聘', position: '前端开发', recruitStage: '面试安排', candidateCount: 8, interviewCount: 3, hours: 2.5, content: '筛选前端简历 8 份，约面 3 人，已同步面试时间。' },
      { id: 'wi-6', type: 'management', workAttributionType: 'department-routine', relationId: 'routine-admin', relationName: '行政管理', managementType: '流程制度', hours: 1.5, content: '整理日报填写规范，补充工时和成本归属说明。' },
      { id: 'wi-7', type: 'other', workAttributionType: 'department-routine', relationId: 'routine-other', relationName: '其他', hours: 1, content: '归档 6 月费用票据并核对缺失附件。' },
    ],
    tomorrow: '继续跟进候选人面试反馈，完善行政资料归档。',
  }),
  makeReport({
    id: 'daily-4',
    userId: 'emp-tech-wangwu',
    userName: '王五',
    department: '技术部',
    reportDate: '2026-07-07',
    items: [
      { id: 'wi-8', type: 'project', workAttributionType: 'internal-project', relationId: '3', relationName: '内部OA流程优化', hours: 5.5, content: '完成日报弹窗统一工作项的数据结构和提交任务明细生成。' },
      { id: 'wi-9', type: 'management', workAttributionType: 'department-routine', relationId: 'routine-internal-meeting', relationName: '内部会议', managementType: '进度跟进', hours: 1, content: '同步日报模块下一步开发范围和风险点。' },
    ],
    tomorrow: '联调日报列表和项目视图中的任务明细展示。',
  }),
];

export const mockDailyReportOrgData = [
  {
    title: '销售部',
    key: 'dept-sales',
    total: 2,
    reported: 1,
    unreported: 1,
    children: [
      { title: '张三', key: 'emp-sales-zhangsan', isLeaf: true, reported: true },
      { title: '李四', key: 'emp-sales-lisi', isLeaf: true, reported: false },
    ],
  },
  {
    title: '新媒体部门',
    key: 'dept-media',
    total: 1,
    reported: 1,
    unreported: 0,
    children: [
      { title: '赵六', key: 'emp-media-zhaoliu', isLeaf: true, reported: true },
    ],
  },
  {
    title: '行政财务',
    key: 'dept-admin',
    total: 1,
    reported: 1,
    unreported: 0,
    children: [
      { title: '钱七', key: 'emp-admin-qianqi', isLeaf: true, reported: true },
    ],
  },
  {
    title: '技术部',
    key: 'dept-tech',
    total: 1,
    reported: 1,
    unreported: 0,
    children: [
      { title: '王五', key: 'emp-tech-wangwu', isLeaf: true, reported: true },
    ],
  },
];

export const mockDailyReportsByEmployee = mockDailyReports.reduce<Record<string, DailyReport[]>>((result, report) => {
  result[report.userId] = [...(result[report.userId] || []), report];
  return result;
}, {});

export function getDailyReportWorkItems(report: DailyReport): AdDeliveryWorkItem[] {
  return ((report.content as AdDeliveryReportContent)['work-items'] || []) as AdDeliveryWorkItem[];
}

export function getDailyReportTotalHours(report: DailyReport) {
  return (report.tasks || []).reduce((sum, task) => sum + (task.hours || 0), 0);
}

export function getDailyReportWorkTypeText(report: DailyReport) {
  const labels = Array.from(new Set(getDailyReportWorkItems(report).map(item => WORK_ITEM_LABELS[item.type])));
  return labels.join('、') || '-';
}

export function getDailyReportTemplateLabel(report: DailyReport) {
  return report.templateType === 'ad-delivery' ? '统一日报' : report.templateType === 'sales' ? '销售日报' : report.templateType === 'dev' ? '开发日报' : '通用日报';
}
