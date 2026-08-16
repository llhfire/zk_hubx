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
