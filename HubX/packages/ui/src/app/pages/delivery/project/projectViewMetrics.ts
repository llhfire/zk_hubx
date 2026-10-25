// 项目 360 展示指标：优先用 PROJECT_LIST 补充字段；B3 spawn 的项目不在种子里，从项目+合同+实收派生。

import type { Project } from './mockData';
import type { ProjectListItem } from './types';
import { getProjectCountdown } from './utils';

export function deriveProjectViewMetrics(
  project: Project,
  extras?: {
    customerName?: string;
    contractAmount?: number;
    receivedAmount?: number;
    totalHours?: number;
    budgetHours?: number;
  },
): ProjectListItem {
  const cd = getProjectCountdown(project.startDate, project.expectedEndDate);
  return {
    key: project.id,
    id: project.id,
    projectNo: project.projectNo,
    name: project.name,
    status: project.status,
    priority: project.priority,
    businessLine: project.businessLine,
    entity: project.entity,
    owner: project.owner,
    salesUsers: project.salesUsers,
    progress: project.progress,
    startDate: project.startDate,
    expectedEndDate: project.expectedEndDate,
    latestProgress: project.latestProgress,
    remark: project.remark,
    createdAt: project.createdAt,
    leadId: project.leadId,
    contractId: project.contractId,
    totalHours: extras?.totalHours ?? 0,
    budgetHours: extras?.budgetHours ?? 0,
    bugP0Count: 0,
    bugP1Count: 0,
    daysRemaining: cd.daysRemaining,
    isOverdue: cd.isOverdue,
    healthStatus: cd.isOverdue ? 'danger' : 'normal',
    customerName: extras?.customerName,
    contractAmount: extras?.contractAmount,
    receivedAmount: extras?.receivedAmount,
  };
}
