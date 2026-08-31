// src/app/pages/delivery-plan/mockData.ts

import type { DeliveryPlan, SopStep } from './types';
import { derivePhaseStatus, generateDeliveryPlan } from './utils';
import { buildInitialContracts } from '../contracts/mockData';
import { generateDeliveryPlanFromContract } from './contractBasis';

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
// 帕奇宠 C 端一期：APP 双端交付
// ──────────────────────────────────────

const pawkeyProjectData: Record<string, unknown> = {
  id: 'prod-112',
  startDate: '2026-06-08',
  owner: '何江奇',
  productUsers: ['何江奇'],
  salesUsers: ['黄奕'],
  uiUsers: ['周雨桐'],
  frontendUsers: ['林子涵'],
  backendUsers: ['陈周伟'],
  opsUsers: ['郭启明'],
  testUsers: ['蒋梦婷'],
  legalUsers: ['黄奕'],
};

const pawkeyContract = buildInitialContracts().find((contract) => contract.id === 'pawkey-c1');
if (!pawkeyContract) throw new Error('帕奇宠主合同 mock 缺失');

const pawkeyPlan = generateDeliveryPlanFromContract(
  pawkeyContract,
  pawkeyProjectData,
  [1, 2, 3, 5],
);

const pawkeyStepOverrides: Record<string, Partial<SopStep>> = {
  '1.1': { status: 'completed', startDate: '2026-06-01', dueDate: '2026-06-03', assignee: '黄奕' },
  '1.2': {
    status: 'completed', startDate: '2026-06-02', dueDate: '2026-06-04', assignee: '何江奇',
    userNotes: '核对主合同及两份补充协议的交付范围、付款节点与验收边界。',
  },
  '1.3': { status: 'completed', startDate: '2026-06-04', dueDate: '2026-06-08', assignee: '何江奇' },
  '1.4': { status: 'completed', startDate: '2026-06-04', dueDate: '2026-06-05', assignee: '陈周伟' },
  '1.5': { status: 'completed', startDate: '2026-06-08', dueDate: '2026-06-08', assignee: '黄奕' },
  '2.1': { status: 'completed', startDate: '2026-06-05', dueDate: '2026-06-08', assignee: '何江奇' },
  '2.2': { status: 'completed', startDate: '2026-06-08', dueDate: '2026-06-09', assignee: '何江奇' },
  '2.3': {
    status: 'completed', startDate: '2026-06-08', dueDate: '2026-06-10', assignee: '何江奇',
    userNotes: '建立需求、设计、开发、测试、终验五类基线及变更留痕。',
  },
  '2.4': { status: 'completed', startDate: '2026-06-08', dueDate: '2026-06-10', assignee: '郭启明' },
  '3.1': {
    stepName: '一期产品需求与边界说明', status: 'completed',
    startDate: '2026-06-08', dueDate: '2026-06-12', assignee: '何江奇',
  },
  '3.2': {
    stepName: 'C 端信息架构与核心体验原型', status: 'completed',
    startDate: '2026-06-15', dueDate: '2026-06-24', assignee: '何江奇',
  },
  '3.3': {
    status: 'completed', startDate: '2026-06-24', dueDate: '2026-06-28', assignee: '何江奇',
    userNotes: '核心体验原型已完成甲方确认并形成评审纪要。',
  },
  '3.4': {
    stepName: '系统架构与接口边界设计', status: 'completed',
    startDate: '2026-06-29', dueDate: '2026-07-20', assignee: '陈周伟',
  },
  '3.5': {
    stepName: '高保真 UI 与视觉规范', status: 'completed',
    startDate: '2026-06-29', dueDate: '2026-07-12', assignee: '周雨桐',
  },
  '3.6': {
    status: 'completed', startDate: '2026-07-12', dueDate: '2026-07-15', assignee: '周雨桐',
    userNotes: '一期 UI 视觉方案已确认，设计资源与标注同步完成。',
  },
  '3.7': {
    stepName: '双端交付执行与每日跟进', status: 'completed',
    startDate: '2026-07-16', dueDate: '2026-08-25', assignee: '何江奇',
  },
  '3.8': {
    status: 'completed', startDate: '2026-06-08', dueDate: '2026-08-25', assignee: '何江奇',
    userNotes: '两次范围变更均已完成评估、报价、补充协议签署与排期回写。',
  },
  '3.9': {
    stepName: '原型、UI、架构与候选版本阶段交付', status: 'completed',
    startDate: '2026-06-28', dueDate: '2026-08-25', assignee: '何江奇',
  },
  '3.10': {
    status: 'completed', startDate: '2026-06-05', dueDate: '2026-08-13', assignee: '黄奕',
    userNotes: '累计回款 12.6 万元，主合同及 AI 补充协议尾款随终验节点继续跟进。',
  },
  '5.1': {
    stepName: 'iOS / Android 核心体验全量回归', status: 'completed',
    startDate: '2026-08-20', dueDate: '2026-08-26', assignee: '蒋梦婷',
  },
  '5.2': {
    stepName: '双端兼容、安全与权限专项验证', status: 'completed',
    startDate: '2026-08-21', dueDate: '2026-08-26', assignee: '蒋梦婷',
  },
  '5.3': {
    stepName: '一期终验材料预审', status: 'completed',
    startDate: '2026-08-27', dueDate: '2026-08-27', assignee: '何江奇',
    userNotes: '终验功能清单、测试报告、版本说明和交付物目录已提交甲方预审。',
  },
  '5.4': {
    stepName: '候选版本问题修复与复测', status: 'completed',
    startDate: '2026-08-28', dueDate: '2026-08-29', assignee: '蒋梦婷',
    userNotes: '无 P0 阻断问题；2 项 P1 已纳入终验遗留跟踪并完成责任确认。',
  },
  '5.5': {
    stepName: '甲方终验功能清单确认', status: 'in_progress',
    startDate: '2026-08-27', dueDate: '2026-09-05', assignee: '何江奇',
    userNotes: '甲方正在审查终验清单，计划 9 月 3 日闭环意见、9 月 5 日完成签署归档。',
  },
};

for (const step of pawkeyPlan.steps) {
  const override = pawkeyStepOverrides[step.stepNo];
  if (!override) continue;
  const generatedNotes = step.userNotes;
  Object.assign(step, override);
  if (generatedNotes && override.userNotes) {
    step.userNotes = `${generatedNotes}\n${override.userNotes}`;
  }
}

for (const milestone of pawkeyPlan.milestones) {
  if (milestone.source === 'contract_delivery' && milestone.name !== '一期终验单签署') {
    milestone.completed = true;
  }
}

for (const phase of pawkeyPlan.phases) {
  const phaseSteps = pawkeyPlan.steps.filter((step) => step.phaseId === phase.id);
  const dates = phaseSteps.flatMap((step) => [step.startDate, step.dueDate]).filter(Boolean).sort();
  phase.status = derivePhaseStatus(phaseSteps);
  phase.startDate = dates[0] ?? phase.startDate;
  phase.dueDate = dates.at(-1) ?? phase.dueDate;
}

// ──────────────────────────────────────
// 导出
// ──────────────────────────────────────

export const initialDeliveryPlans: Record<string, DeliveryPlan> = {
  '1': plan1,
  '2': plan2,
  '3': plan3,
  'prod-112': pawkeyPlan,
};
