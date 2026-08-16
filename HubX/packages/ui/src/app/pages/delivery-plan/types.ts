// src/app/pages/delivery-plan/types.ts

/** 交付类型：决定板块四适用步骤 */
export type DeliveryType =
  | '网站'
  | '小程序'
  | 'APP'
  | '网站+小程序'
  | '网站+APP'
  | '小程序+APP'
  | '全平台';

export const DELIVERY_TYPES: DeliveryType[] = [
  '网站',
  '小程序',
  'APP',
  '网站+小程序',
  '网站+APP',
  '小程序+APP',
  '全平台',
];

/** 步骤状态 */
export type SopStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

/** 板块状态（自动推导） */
export type SopPhaseStatus = SopStepStatus;

/** 板块 */
export interface SopPhase {
  id: string;
  projectId: string;
  phaseNo: number;
  phaseName: string;
  manager: string;
  status: SopPhaseStatus;
  startDate: string;
  dueDate: string;
}

/** 步骤 */
export interface SopStep {
  id: string;
  phaseId: string;
  projectId: string;
  stepNo: string;
  stepName: string;
  department: string;
  assignee: string;
  status: SopStepStatus;
  startDate: string;
  dueDate: string;
  deliverables: string;
  description: string;
  notes: string;
  tools: string;
  isCustom: boolean;
  isEvergreen: boolean;
  userNotes: string;
}

/** 里程碑 */
export interface SopMilestone {
  id: string;
  projectId: string;
  name: string;
  date: string;
  completed: boolean;
}

/** 交付计划（一个项目的完整交付计划） */
export interface DeliveryPlan {
  projectId: string;
  phases: SopPhase[];
  steps: SopStep[];
  milestones: SopMilestone[];
  deliveryType: DeliveryType;
  contractId?: string;
}

/** 生成配置 */
export interface DeliveryConfig {
  selectedPhases: number[];
  deliveryType: DeliveryType;
  contractId?: string;
}

/** 甘特图缩放粒度 */
export type GanttZoomLevel = 'day' | 'week' | 'month';
