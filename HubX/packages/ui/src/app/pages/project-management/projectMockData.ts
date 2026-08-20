// ============================================================
// 项目管理模块 — 列表页 Mock 数据
// ============================================================

import type {
  ProjectListItem,
  ProjectMetrics,
  ActivityEvent,
} from './types';

// --- 项目列表 Mock ---
export const PROJECT_LIST: ProjectListItem[] = [
  {
    key: '1', id: '1', projectNo: 'PRJ202605001', name: 'A公司CRM系统开发',
    status: '进行中', priority: '高', businessLine: '外包', entity: '中科软艺',
    owner: '李四', salesUsers: ['张三'], progress: 65,
    startDate: '2026-05-01', expectedEndDate: '2026-08-30',
    latestProgress: '完成项目管理底座需求梳理，进入原型确认阶段。',
    remark: '客户重点关注销售跟进、客户管理和项目成本统计。',
    createdAt: '2026-05-01 09:30',
    contractId: '4', customerName: 'A公司',
    totalHours: 468, budgetHours: 600,
    bugP0Count: 0, bugP1Count: 1,
    daysRemaining: 12, isOverdue: false, healthStatus: 'warning',
    contractAmount: 205000, receivedAmount: 123000,
  },
  {
    key: '2', id: '2', projectNo: 'PRJ202605002', name: 'B公司小程序定制开发',
    status: '验收中', priority: '中', businessLine: '外包', entity: '软艺信息',
    owner: '王五', salesUsers: ['李四'], progress: 90,
    startDate: '2026-04-15', expectedEndDate: '2026-08-25',
    latestProgress: '客户已确认首页和订单流程，等待 UI 终稿。',
    remark: '客户对交付时间要求严格。',
    createdAt: '2026-04-15 10:00',
    customerName: 'B公司',
    totalHours: 320, budgetHours: 350,
    bugP0Count: 0, bugP1Count: 0,
    daysRemaining: 5, isOverdue: false, healthStatus: 'normal',
    contractAmount: 120000, receivedAmount: 84000,
  },
  {
    key: '3', id: '3', projectNo: 'PRJ202606001', name: 'C集团OA流程优化',
    status: '进行中', priority: '高', businessLine: '外包', entity: '中科软通',
    owner: '赵六', salesUsers: ['张三'], progress: 45,
    startDate: '2026-06-01', expectedEndDate: '2026-09-15',
    latestProgress: '审批流模块开发中，预计下周完成联调。',
    remark: '',
    createdAt: '2026-06-01 14:00',
    customerName: 'C集团',
    totalHours: 210, budgetHours: 500,
    bugP0Count: 1, bugP1Count: 2,
    daysRemaining: 26, isOverdue: false, healthStatus: 'danger',
    contractAmount: 350000, receivedAmount: 105000,
  },
  {
    key: '4', id: '4', projectNo: 'PRJ202604001', name: 'D公司电商后台重构',
    status: '未确认', priority: '中', businessLine: '外包', entity: '武汉软艺',
    owner: '', salesUsers: ['李四'], progress: 0,
    startDate: '', expectedEndDate: '',
    latestProgress: '合同已审批通过，等待指派项目经理。',
    remark: '',
    createdAt: '2026-08-18 09:00',
    customerName: 'D公司',
    totalHours: 0, budgetHours: 400,
    bugP0Count: 0, bugP1Count: 0,
    daysRemaining: 0, isOverdue: false, healthStatus: 'normal',
    contractAmount: 180000, receivedAmount: 0,
  },
  {
    key: '5', id: '5', projectNo: 'PRJ202603001', name: 'E平台数据分析看板',
    status: '催款中', priority: '低', businessLine: '自研', entity: '中科网联',
    owner: '孙七', salesUsers: ['张三'], progress: 100,
    startDate: '2026-03-10', expectedEndDate: '2026-07-20',
    latestProgress: '终验单已签署，等待尾款到账。',
    remark: '尾款预计8月底到账。',
    createdAt: '2026-03-10 11:00',
    customerName: 'E平台',
    totalHours: 580, budgetHours: 600,
    bugP0Count: 0, bugP1Count: 0,
    daysRemaining: -31, isOverdue: true, healthStatus: 'normal',
    contractAmount: 280000, receivedAmount: 224000,
  },
  {
    key: '6', id: '6', projectNo: 'PRJ202607001', name: 'F公司官网改版',
    status: '搁置', priority: '低', businessLine: '外包', entity: '中科软盈',
    owner: '周八', salesUsers: ['钱九'], progress: 30,
    startDate: '2026-07-01', expectedEndDate: '2026-09-30',
    latestProgress: '客户要求暂停，等待进一步沟通。',
    remark: '客户内部预算调整，项目暂缓。',
    createdAt: '2026-07-01 09:00',
    customerName: 'F公司',
    totalHours: 85, budgetHours: 200,
    bugP0Count: 0, bugP1Count: 0,
    daysRemaining: 41, isOverdue: false, healthStatus: 'normal',
    contractAmount: 60000, receivedAmount: 18000,
  },
  {
    key: '7', id: '7', projectNo: 'PRJ202602001', name: 'G公司APP开发',
    status: '已完成', priority: '高', businessLine: '外包', entity: '中科软艺',
    owner: '李四', salesUsers: ['张三'], progress: 100,
    startDate: '2026-02-01', expectedEndDate: '2026-06-30',
    latestProgress: '项目已结项，进入6个月质保期。',
    remark: '',
    createdAt: '2026-02-01 10:00',
    customerName: 'G公司',
    totalHours: 720, budgetHours: 700,
    bugP0Count: 0, bugP1Count: 0,
    daysRemaining: -51, isOverdue: false, healthStatus: 'normal',
    contractAmount: 420000, receivedAmount: 420000,
  },
  {
    key: '8', id: '8', projectNo: 'PRJ202608001', name: 'H教育平台二期',
    status: '延迟', priority: '高', businessLine: '自研', entity: '中科网联',
    owner: '赵六', salesUsers: [], progress: 55,
    startDate: '2026-05-15', expectedEndDate: '2026-08-15',
    latestProgress: '因技术方案调整，预计延期2周交付。',
    remark: '核心算法需要重新选型。',
    createdAt: '2026-05-15 14:00',
    customerName: '',
    totalHours: 380, budgetHours: 500,
    bugP0Count: 0, bugP1Count: 3,
    daysRemaining: -5, isOverdue: true, healthStatus: 'danger',
    contractAmount: 0, receivedAmount: 0,
  },
];

// --- 指标 Mock ---
export const PROJECT_METRICS: ProjectMetrics = {
  activeCount: PROJECT_LIST.filter((p) => p.status !== '已完成').length,
  activeByLine: {
    '外包': PROJECT_LIST.filter((p) => p.businessLine === '外包' && p.status !== '已完成').length,
    '自研': PROJECT_LIST.filter((p) => p.businessLine === '自研' && p.status !== '已完成').length,
    '自运营': PROJECT_LIST.filter((p) => p.businessLine === '自运营' && p.status !== '已完成').length,
  },
  warningCount: PROJECT_LIST.filter((p) => p.healthStatus === 'danger' || p.healthStatus === 'warning').length,
  pendingConfirmCount: PROJECT_LIST.filter((p) => p.status === '未确认').length,
  monthlyHours: 842,
};

// --- Activity Stream Mock ---
export const ACTIVITY_EVENTS: ActivityEvent[] = [
  // PRJ001 的事件
  { id: 'act-1', projectId: '1', type: 'followup', title: '电话跟进', content: '与客户确认原型细节，反馈整体方向正确，局部交互需优化。', operator: '李四', createdAt: '2026-08-20 10:37', isPreSale: false },
  { id: 'act-2', projectId: '1', type: 'milestone', title: '里程碑达成', content: '项目管理底座开发完成，进入原型确认阶段。', operator: '系统', createdAt: '2026-08-19 16:00' },
  { id: 'act-3', projectId: '1', type: 'daily_report', title: '工时日报', content: '王五 前端开发 8h：完成项目列表页复合列+双向冻结。', operator: '王五', createdAt: '2026-08-19 18:00' },
  { id: 'act-4', projectId: '1', type: 'status_change', title: '状态变更', content: '项目状态从「未开始」变更为「进行中」。', operator: '李四', createdAt: '2026-08-15 09:00' },
  { id: 'act-5', projectId: '1', type: 'contract', title: '合同签署', content: '主合同 ZKRY202605010001 已签署，标的额 ¥205,000。', operator: '张三', createdAt: '2026-05-01 10:00', isPreSale: true },
  { id: 'act-6', projectId: '1', type: 'followup', title: '需求确认', content: '客户确认CRM系统核心功能清单，包含销售跟进、客户管理、报价流程。', operator: '张三', createdAt: '2026-04-28 14:00', isPreSale: true },
  { id: 'act-7', projectId: '1', type: 'confirmation', title: '需求确认书签署', content: '客户签署需求确认书V1.0。', operator: '李四', createdAt: '2026-04-25 16:00', isPreSale: true },
  // PRJ003 的事件
  { id: 'act-8', projectId: '3', type: 'followup', title: '联调进展', content: '审批流模块与主流程联调完成80%，剩余异常分支处理。', operator: '赵六', createdAt: '2026-08-20 09:00' },
  { id: 'act-9', projectId: '3', type: 'daily_report', title: '工时日报', content: '赵六 后端开发 7h：审批流异常分支处理。', operator: '赵六', createdAt: '2026-08-19 18:00' },
  // PRJ004 的事件
  { id: 'act-10', projectId: '4', type: 'status_change', title: '项目生成', content: '合同审批通过，自动生成项目记录，等待指派PM。', operator: '系统', createdAt: '2026-08-18 09:00' },
];

/** 按项目ID获取活动事件 */
export function getActivitiesByProjectId(projectId: string): ActivityEvent[] {
  return ACTIVITY_EVENTS.filter((a) => a.projectId === projectId).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
