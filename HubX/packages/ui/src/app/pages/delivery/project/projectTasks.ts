import type { Project } from './mockData';

export type ProjectTaskPriority = '高' | '中' | '低';
export type ProjectTaskStatus = '未开始' | '进行中' | '已完成' | '已搁置' | '已逾期' | '已取消';
export type ProjectTaskType = '开发' | 'UI 设计' | '产品设计' | '测试' | '账号注册' | 'bug';

export const PROJECT_TASK_TYPES: ProjectTaskType[] = ['开发', 'UI 设计', '产品设计', '测试', '账号注册', 'bug'];

export interface ProjectTaskLog {
  id: string;
  status: ProjectTaskStatus;
  operator: string;
  assignee: string;
  progress: number;
  time: string;
  comment: string;
}

export interface ProjectWorkTask {
  id: string;
  projectId: string;
  title: string;
  type: ProjectTaskType;
  priority: ProjectTaskPriority;
  status: ProjectTaskStatus;
  assignee: string;
  collaborators: string[];
  plannedEndDate: string;
  progress: number;
  description: string;
  logs: ProjectTaskLog[];
}

export interface ProjectTaskSummary {
  totalCount: number;
  pendingCount: number;
  inProgressCount: number;
  overdueCount: number;
  completedCount: number;
}

export const initialProjectTasks: ProjectWorkTask[] = [
  {
    id: 'project-task-1', projectId: '1', title: '客户管理列表筛选交互开发', type: '开发', priority: '高', status: '进行中', assignee: '王五', collaborators: ['赵六'], plannedEndDate: '2026-08-05', progress: 60,
    description: '完成客户名称、手机号、标签筛选以及列表分页交互，并与接口联调。',
    logs: [
      { id: 'project-task-1-log-1', status: '未开始', operator: '李四', assignee: '王五', progress: 0, time: '2026-07-28 10:00', comment: '已拆分任务并指派开发。' },
      { id: 'project-task-1-log-2', status: '进行中', operator: '王五', assignee: '王五', progress: 60, time: '2026-07-29 16:30', comment: '列表与基础筛选已完成，正在联调接口。' },
    ],
  },
  {
    id: 'project-task-2', projectId: '1', title: '订单模块测试用例设计', type: '测试', priority: '中', status: '未开始', assignee: '钱九', collaborators: [], plannedEndDate: '2026-08-07', progress: 0,
    description: '覆盖订单创建、状态变更、退款及异常提示等核心场景。',
    logs: [{ id: 'project-task-2-log-1', status: '未开始', operator: '李四', assignee: '钱九', progress: 0, time: '2026-07-30 09:20', comment: '需求已确认，待开发完成后补充测试用例。' }],
  },
  {
    id: 'project-task-3', projectId: '2', title: '支付失败页视觉验收', type: 'UI 设计', priority: '中', status: '已完成', assignee: '钱九', collaborators: ['孙七'], plannedEndDate: '2026-08-02', progress: 100,
    description: '核对支付失败页的提示文案、重试入口和移动端适配。',
    logs: [{ id: 'project-task-3-log-1', status: '已完成', operator: '王五', assignee: '钱九', progress: 100, time: '2026-07-30 11:00', comment: '已部署预发布环境，请测试验收。' }],
  },
  {
    id: 'pawkey-task-1', projectId: 'prod-112', title: '用户研究与一期产品边界梳理', type: '产品设计', priority: '高', status: '已完成', assignee: '何江奇', collaborators: ['黄奕'], plannedEndDate: '2026-06-12', progress: 100,
    description: '完成目标用户、核心场景、体验原则、一期目标与非目标的产品边界定义。',
    logs: [{ id: 'pawkey-task-1-log-1', status: '已完成', operator: '何江奇', assignee: '何江奇', progress: 100, time: '2026-06-12 18:00', comment: '需求范围确认书已由甲方签署。' }],
  },
  {
    id: 'pawkey-task-2', projectId: 'prod-112', title: 'C 端信息架构与核心体验原型', type: '产品设计', priority: '高', status: '已完成', assignee: '何江奇', collaborators: ['周雨桐'], plannedEndDate: '2026-06-28', progress: 100,
    description: '输出宠物建档、成长记录、陪伴互动、生命流与分享链路的完整交互原型。',
    logs: [{ id: 'pawkey-task-2-log-1', status: '已完成', operator: '何江奇', assignee: '何江奇', progress: 100, time: '2026-06-28 17:20', comment: '原型确认书已回收，12 项调整纳入设计基线。' }],
  },
  {
    id: 'pawkey-task-3', projectId: 'prod-112', title: '高保真 UI 与视觉规范', type: 'UI 设计', priority: '高', status: '已完成', assignee: '周雨桐', collaborators: ['何江奇'], plannedEndDate: '2026-07-15', progress: 100,
    description: '完成核心页面高保真设计、组件规范、动效说明和双端适配标注。',
    logs: [{ id: 'pawkey-task-3-log-1', status: '已完成', operator: '周雨桐', assignee: '周雨桐', progress: 100, time: '2026-07-15 18:10', comment: 'UI 设计确认书已签署。' }],
  },
  {
    id: 'pawkey-task-4', projectId: 'prod-112', title: '系统架构与接口边界设计', type: '开发', priority: '高', status: '已完成', assignee: '陈周伟', collaborators: ['林子涵'], plannedEndDate: '2026-07-20', progress: 100,
    description: '设计客户端、业务服务、内容服务、媒体资源与 AI 能力接入边界及部署建议。',
    logs: [{ id: 'pawkey-task-4-log-1', status: '已完成', operator: '陈周伟', assignee: '陈周伟', progress: 100, time: '2026-07-20 16:40', comment: '系统架构设计通过甲方技术评审。' }],
  },
  {
    id: 'pawkey-task-5', projectId: 'prod-112', title: 'iOS / Android 适配与交付包复核', type: '测试', priority: '高', status: '已完成', assignee: '林子涵', collaborators: ['蒋梦婷', '郭启明'], plannedEndDate: '2026-08-29', progress: 100,
    description: '完成双端适配回归、构建说明、账号清单和发布检查表。',
    logs: [{ id: 'pawkey-task-5-log-1', status: '已完成', operator: '蒋梦婷', assignee: '林子涵', progress: 100, time: '2026-08-29 16:30', comment: '双端核心流程回归完成，无 P0。' }],
  },
  {
    id: 'pawkey-task-6', projectId: 'prod-112', title: '甲方终验功能清单意见闭环', type: '产品设计', priority: '高', status: '进行中', assignee: '何江奇', collaborators: ['陈周伟', '周雨桐'], plannedEndDate: '2026-09-03', progress: 90,
    description: '接收甲方终验审查意见，区分一期缺口、体验优化和二期需求并完成闭环。',
    logs: [{ id: 'pawkey-task-6-log-1', status: '进行中', operator: '何江奇', assignee: '何江奇', progress: 90, time: '2026-08-29 17:30', comment: '终验功能清单已提交，等待甲方最终审查结论。' }],
  },
  {
    id: 'pawkey-task-7', projectId: 'prod-112', title: '终验材料归档与项目交接', type: '产品设计', priority: '中', status: '进行中', assignee: '郭启明', collaborators: ['何江奇', '黄奕'], plannedEndDate: '2026-09-05', progress: 80,
    description: '完成终验单签署、交付物归档、账号移交、项目复盘和质保责任说明。',
    logs: [{ id: 'pawkey-task-7-log-1', status: '进行中', operator: '郭启明', assignee: '郭启明', progress: 80, time: '2026-08-27 18:10', comment: '交付物索引已完成，待终验单回签后封档。' }],
  },
];

export function getProjectTasks(projectId: string) {
  return initialProjectTasks.filter((task) => task.projectId === projectId);
}

export function getProjectTaskSummary(project: Project, tasks = getProjectTasks(project.id)): ProjectTaskSummary {
  const today = new Date().toISOString().slice(0, 10);
  return {
    totalCount: tasks.length,
    pendingCount: tasks.filter((task) => task.status === '未开始').length,
    inProgressCount: tasks.filter((task) => task.status === '进行中' || task.status === '已搁置').length,
    overdueCount: tasks.filter((task) => task.status !== '已完成' && task.plannedEndDate < today).length,
    completedCount: tasks.filter((task) => task.status === '已完成').length,
  };
}
