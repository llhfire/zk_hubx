// src/app/pages/delivery-plan/mockData.ts

import type { DeliveryPlan } from './types';
import { derivePhaseStatus, generateDeliveryPlan } from './utils';

function syncPhaseStatuses(plan: DeliveryPlan): void {
  for (const phase of plan.phases) {
    phase.status = derivePhaseStatus(plan.steps.filter((step) => step.phaseId === phase.id));
  }
}

// ──────────────────────────────────────
// Project 1：A公司CRM系统开发
// ──────────────────────────────────────

const project1Config = {
  selectedPhases: [1, 2, 3, 4, 5, 6, 7] as number[],
  deliveryType: '网站+小程序' as const,
  contractId: '4',
};

const project1Data: Record<string, any> = {
  id: '1',
  startDate: '2026-05-01',
  owner: '李四',
  productUsers: ['李四'],
  salesUsers: ['张三'],
  uiUsers: ['孙七'],
  frontendUsers: ['王五'],
  backendUsers: ['赵六'],
  opsUsers: ['周八'],
  testUsers: ['钱九'],
  legalUsers: ['张三'],
};

const project1Milestones = [
  { name: '项目立项', completed: true, date: '2026-05-05' },
  { name: '原型确认', completed: true, date: '2026-05-20' },
  { name: '一期交付', completed: false, date: '2026-06-15' },
];

const plan1 = generateDeliveryPlan(
  project1Config,
  project1Data,
  '2026-04-28',
  project1Milestones,
);

// 标记步骤状态
const project1CompletedSteps = [
  '1.1', '1.2', '1.3', '1.4', '1.5',
  '2.1', '2.2', '2.3', '2.4',
  '3.1', '3.2', '3.3',
];
const project1InProgressSteps = ['3.4'];

for (const step of plan1.steps) {
  if (project1CompletedSteps.includes(step.stepNo)) {
    step.status = 'completed';
  } else if (project1InProgressSteps.includes(step.stepNo)) {
    step.status = 'in_progress';
  }
}

// 标记里程碑完成
for (const milestone of plan1.milestones) {
  if (milestone.name === '项目立项' || milestone.name === '原型确认') {
    milestone.completed = true;
  }
}
syncPhaseStatuses(plan1);

// ──────────────────────────────────────
// Project 2：B公司小程序定制开发
// ──────────────────────────────────────

const project2Config = {
  selectedPhases: [1, 2, 3, 4, 5, 6, 7] as number[],
  deliveryType: '小程序' as const,
  contractId: '2',
};

const project2Data: Record<string, any> = {
  id: '2',
  startDate: '2026-04-10',
  owner: '王五',
  productUsers: ['孙七'],
  salesUsers: ['李四'],
  uiUsers: ['周八'],
  frontendUsers: ['王五'],
  backendUsers: ['赵六'],
  opsUsers: ['王五'],
  testUsers: ['钱九'],
  legalUsers: [],
};

const project2Milestones = [
  { name: '需求确认', completed: true, date: '2026-04-20' },
  { name: '开发完成', completed: true, date: '2026-05-10' },
  { name: '验收通过', completed: false, date: '2026-05-18' },
];

const plan2 = generateDeliveryPlan(
  project2Config,
  project2Data,
  '2026-04-08',
  project2Milestones,
);

// 标记步骤状态
const project2PendingSteps = [
  '6.3', '6.4', '6.5',
  '7.1', '7.2', '7.3', '7.4', '7.5',
];
const project2InProgressSteps = ['6.1', '6.2'];

for (const step of plan2.steps) {
  if (project2PendingSteps.includes(step.stepNo)) {
    step.status = 'pending';
  } else if (project2InProgressSteps.includes(step.stepNo)) {
    step.status = 'in_progress';
  } else {
    step.status = 'completed';
  }
}
syncPhaseStatuses(plan2);

// ──────────────────────────────────────
// Project 3：华信科技内部OA流程优化
// ──────────────────────────────────────

const project3Config = {
  selectedPhases: [1, 2, 3, 4, 5, 6, 7] as number[],
  deliveryType: '网站' as const,
};

const project3Data: Record<string, any> = {
  id: '3',
  startDate: '2026-06-18',
  owner: '李四',
  productUsers: ['李四'],
  salesUsers: ['张三'],
  uiUsers: ['孙七'],
  frontendUsers: ['王五'],
  backendUsers: ['赵六'],
  opsUsers: ['周八'],
  testUsers: ['钱九'],
  legalUsers: [],
};

const project3Milestones = [
  { name: '项目启动', completed: true, date: '2026-06-20' },
  { name: '原型确认', completed: true, date: '2026-07-10' },
  { name: '一期版本交付', completed: false, date: '2026-08-20' },
  { name: '验收上线', completed: false, date: '2026-10-30' },
];

const plan3 = generateDeliveryPlan(
  project3Config,
  project3Data,
  '2026-06-10',
  project3Milestones,
);

const project3CompletedSteps = [
  '1.1', '1.2', '1.3', '1.4', '1.5',
  '2.1', '2.2', '2.3', '2.4',
  '3.1', '3.2', '3.3',
  '4.1', '4.2', '4.3', '4.7',
];
const project3InProgressSteps = ['3.4'];

for (const step of plan3.steps) {
  if (project3CompletedSteps.includes(step.stepNo)) {
    step.status = 'completed';
  } else if (project3InProgressSteps.includes(step.stepNo)) {
    step.status = 'in_progress';
  }
}

const project3TechnicalDesignStep = plan3.steps.find(step => step.stepNo === '3.4');
if (project3TechnicalDesignStep) {
  project3TechnicalDesignStep.dueDate = '2026-07-25';
}
syncPhaseStatuses(plan3);

// ──────────────────────────────────────
// 导出
// ──────────────────────────────────────

export const initialDeliveryPlans: Record<string, DeliveryPlan> = {
  '1': plan1,
  '2': plan2,
  '3': plan3,
};
