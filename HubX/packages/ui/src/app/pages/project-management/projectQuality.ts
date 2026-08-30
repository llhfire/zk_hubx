import type { Project } from './mockData';

export type BugPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type BugStatus = '新建' | '修复中' | '待验证' | '已关闭';

export interface BugFlowLog {
  id: string;
  status: BugStatus;
  operator: string;
  assignee: string;
  time: string;
  comment: string;
}

export interface ProjectBug {
  id: string;
  projectId: string;
  title: string;
  module: string;
  priority: BugPriority;
  status: BugStatus;
  reporter: string;
  assignee: string;
  environment: string;
  description: string;
  flowLogs: BugFlowLog[];
}

export interface BugSummary {
  status: '正常' | '关注' | '预警';
  openCount: number;
  newCount: number;
  fixingCount: number;
  verifyingCount: number;
}

export const initialProjectBugs: ProjectBug[] = [
  {
    id: 'bug-1', projectId: '1', title: '订单页在小屏设备上操作区遮挡', module: '订单管理', priority: 'P1', status: '修复中',
    reporter: '钱九', assignee: '王五', environment: '测试环境',
    description: '在小屏设备打开订单详情并滚动至页面底部时，底部操作区会遮挡最后一条订单信息。',
    flowLogs: [
      { id: 'bug-1-log-1', status: '新建', operator: '钱九', assignee: '王五', time: '2026-07-25 10:20', comment: '内部测试发现并提交。' },
      { id: 'bug-1-log-2', status: '修复中', operator: '王五', assignee: '王五', time: '2026-07-25 14:10', comment: '已确认问题，开始调整移动端布局。' },
    ],
  },
  {
    id: 'bug-2', projectId: '1', title: '客户列表按手机号搜索无结果', module: '客户管理', priority: 'P2', status: '新建',
    reporter: '李四', assignee: '赵六', environment: '测试环境',
    description: '客户列表输入已存在客户的手机号并搜索后，列表未返回对应记录。',
    flowLogs: [{ id: 'bug-2-log-1', status: '新建', operator: '李四', assignee: '赵六', time: '2026-07-26 16:40', comment: '项目联调时发现。' }],
  },
  {
    id: 'bug-3', projectId: '2', title: '支付结果页缺少异常提示文案', module: '支付流程', priority: 'P2', status: '待验证',
    reporter: '钱九', assignee: '王五', environment: '正式环境',
    description: '模拟支付失败后返回支付结果页，页面只展示通用失败状态，缺少异常原因和重试引导。',
    flowLogs: [
      { id: 'bug-3-log-1', status: '新建', operator: '钱九', assignee: '王五', time: '2026-07-20 09:30', comment: '客户预验收反馈。' },
      { id: 'bug-3-log-2', status: '修复中', operator: '王五', assignee: '王五', time: '2026-07-20 14:30', comment: '补充失败提示文案和重试入口。' },
      { id: 'bug-3-log-3', status: '待验证', operator: '王五', assignee: '钱九', time: '2026-07-22 11:10', comment: '已部署预发布环境，请测试验证。' },
    ],
  },
  {
    id: 'bug-4', projectId: '3', title: '会签节点重复提交后审批人显示异常', module: '审批管理', priority: 'P1', status: '新建',
    reporter: '钱九', assignee: '赵六', environment: '测试环境',
    description: '同一审批节点重复提交两次后，查看审批人列表时出现了重复记录。',
    flowLogs: [{ id: 'bug-4-log-1', status: '新建', operator: '钱九', assignee: '赵六', time: '2026-07-29 15:20', comment: '回归测试发现。' }],
  },
  {
    id: 'pawkey-bug-1', projectId: 'prod-112', title: 'Android 系统字体放大后宠物档案信息错位', module: '宠物档案', priority: 'P1', status: '待验证',
    reporter: '蒋梦婷', assignee: '林子涵', environment: '预发布环境',
    description: '系统字体设置为最大时，宠物档案头部昵称和年龄标签发生重叠。',
    flowLogs: [
      { id: 'pawkey-bug-1-log-1', status: '新建', operator: '蒋梦婷', assignee: '林子涵', time: '2026-08-26 15:20', comment: '多机型适配回归发现。' },
      { id: 'pawkey-bug-1-log-2', status: '修复中', operator: '林子涵', assignee: '林子涵', time: '2026-08-28 11:10', comment: '改为弹性布局并限制信息区最小高度。' },
      { id: 'pawkey-bug-1-log-3', status: '待验证', operator: '林子涵', assignee: '蒋梦婷', time: '2026-08-29 10:30', comment: '修复包已部署预发布环境。' },
    ],
  },
  {
    id: 'pawkey-bug-2', projectId: 'prod-112', title: '首次拒绝相册权限后分享图保存提示不完整', module: '内容分享', priority: 'P1', status: '修复中',
    reporter: '蒋梦婷', assignee: '林子涵', environment: 'iOS 测试环境',
    description: '首次拒绝相册权限后再次保存分享图，只提示失败，缺少跳转系统设置的引导。',
    flowLogs: [
      { id: 'pawkey-bug-2-log-1', status: '新建', operator: '蒋梦婷', assignee: '林子涵', time: '2026-08-27 14:40', comment: '终验主流程回归发现。' },
      { id: 'pawkey-bug-2-log-2', status: '修复中', operator: '林子涵', assignee: '林子涵', time: '2026-08-29 13:20', comment: '已补充权限说明与前往设置操作。' },
    ],
  },
  {
    id: 'pawkey-bug-3', projectId: 'prod-112', title: '生命流长图分享底部留白异常', module: '生命流', priority: 'P2', status: '已关闭',
    reporter: '蒋梦婷', assignee: '林子涵', environment: '测试环境', description: '生命流内容超过 20 条时，生成的分享长图底部出现额外留白。',
    flowLogs: [{ id: 'pawkey-bug-3-log-1', status: '已关闭', operator: '蒋梦婷', assignee: '林子涵', time: '2026-08-25 17:10', comment: '已修复并完成回归。' }],
  },
  {
    id: 'pawkey-bug-4', projectId: 'prod-112', title: '弱网下互动反馈重复出现', module: '陪伴互动', priority: 'P2', status: '已关闭',
    reporter: '蒋梦婷', assignee: '陈周伟', environment: '测试环境', description: '弱网重试时互动结果偶发重复展示，已通过请求幂等键修复。',
    flowLogs: [{ id: 'pawkey-bug-4-log-1', status: '已关闭', operator: '蒋梦婷', assignee: '陈周伟', time: '2026-08-24 18:00', comment: '弱网专项回归通过。' }],
  },
];

export function getProjectBugs(projectId: string) {
  return initialProjectBugs.filter((bug) => bug.projectId === projectId);
}

export function getProjectBugSummary(project: Project, bugs = getProjectBugs(project.id)): BugSummary {
  const openBugs = bugs.filter((bug) => bug.status !== '已关闭');
  const p0OrP1Count = openBugs.filter((bug) => bug.priority === 'P0' || bug.priority === 'P1').length;
  return {
    status: p0OrP1Count > 0 ? '预警' : '正常',
    openCount: openBugs.length,
    newCount: openBugs.filter((bug) => bug.status === '新建').length,
    fixingCount: openBugs.filter((bug) => bug.status === '修复中').length,
    verifyingCount: openBugs.filter((bug) => bug.status === '待验证').length,
  };
}
