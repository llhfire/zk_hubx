// 交付计划跨页数据接缝（阶段 3）。
// 读写收口成显式 API，让「合同批准触发交付启动」与交付计划页的配置、步骤编辑和删除走同一份模块状态，
// 项目域仍是内存 mock，未接 HTTP，接后端时再抽 services。

import { initialDeliveryPlans } from './mockData';
import type { DeliveryPlan } from './types';

export function getDeliveryPlan(projectId: string | undefined): DeliveryPlan | undefined {
  if (!projectId) return undefined;
  return initialDeliveryPlans[projectId];
}

export function hasDeliveryPlan(projectId: string | undefined): boolean {
  return Boolean(getDeliveryPlan(projectId));
}

export function saveDeliveryPlan(plan: DeliveryPlan): void {
  initialDeliveryPlans[plan.projectId] = plan;
}

export function removeDeliveryPlan(projectId: string): void {
  delete initialDeliveryPlans[projectId];
}
