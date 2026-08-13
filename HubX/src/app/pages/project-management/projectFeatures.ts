import type { Project } from './mockData';

export type FeaturePriority = '高' | '中' | '低';
export type FeatureStatus = '待确认' | '已确认' | '开发中' | '待测试' | '已上线' | '已取消';

export interface ProjectFeatureModule {
  id: string;
  projectId: string;
  name: string;
  description: string;
  owner: string;
  sortOrder: number;
}

export interface ProjectFeature {
  id: string;
  projectId: string;
  moduleId: string;
  name: string;
  description: string;
  priority: FeaturePriority;
  status: FeatureStatus;
  owner: string;
  version: string;
  acceptanceCriteria: string;
  taskIds: string[];
  bugIds: string[];
}

export interface ProjectFeatureSummary {
  totalCount: number;
  pendingCount: number;
  developingCount: number;
  testingCount: number;
  releasedCount: number;
}

export const initialProjectFeatures: ProjectFeature[] = [
  { id: 'feature-1', projectId: '1', moduleId: 'feature-module-1', name: '客户列表筛选', description: '支持按客户名称、手机号和客户标签筛选客户列表。', priority: '高', status: '开发中', owner: '王五', version: 'V1.0', acceptanceCriteria: '筛选条件组合生效，结果与接口返回一致。', taskIds: ['project-task-1'], bugIds: ['bug-2'] },
  { id: 'feature-2', projectId: '1', moduleId: 'feature-module-2', name: '订单详情移动端适配', description: '订单详情页适配小屏设备，底部操作区不得遮挡订单内容。', priority: '中', status: '待测试', owner: '钱九', version: 'V1.0', acceptanceCriteria: '主流移动端尺寸下内容和操作区均可完整查看。', taskIds: ['project-task-2'], bugIds: ['bug-1'] },
  { id: 'feature-3', projectId: '2', moduleId: 'feature-module-3', name: '支付异常提示与重试', description: '支付失败后明确展示失败原因并提供重试入口。', priority: '中', status: '待测试', owner: '钱九', version: 'V1.0', acceptanceCriteria: '异常提示准确、重试入口可用。', taskIds: ['project-task-3'], bugIds: ['bug-3'] },
];

export const initialProjectFeatureModules: ProjectFeatureModule[] = [
  { id: 'feature-module-1', projectId: '1', name: '客户管理', description: '客户资料、标签与客户分层能力。', owner: '李四', sortOrder: 1 },
  { id: 'feature-module-2', projectId: '1', name: '订单管理', description: '订单创建、查询与订单详情能力。', owner: '李四', sortOrder: 2 },
  { id: 'feature-module-3', projectId: '2', name: '支付流程', description: '支付结果、异常提示和重试能力。', owner: '王五', sortOrder: 1 },
];

export function getProjectFeatures(projectId: string) {
  return initialProjectFeatures.filter((feature) => feature.projectId === projectId);
}

export function getProjectFeatureModules(projectId: string) {
  return initialProjectFeatureModules.filter((module) => module.projectId === projectId).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getProjectFeatureSummary(project: Project, features = getProjectFeatures(project.id)): ProjectFeatureSummary {
  return {
    totalCount: features.length,
    pendingCount: features.filter((feature) => feature.status === '待确认' || feature.status === '已确认').length,
    developingCount: features.filter((feature) => feature.status === '开发中').length,
    testingCount: features.filter((feature) => feature.status === '待测试').length,
    releasedCount: features.filter((feature) => feature.status === '已上线').length,
  };
}
