// src/app/pages/delivery-plan/utils.ts

import type {
  DeliveryType,
  SopStepStatus,
  SopPhaseStatus,
  SopPhase,
  SopStep,
  SopMilestone,
  DeliveryPlan,
  DeliveryConfig,
  GanttZoomLevel,
} from './types';

import {
  STATUS_PRIORITY,
  DELIVERY_TYPE_PHASE4_STEPS,
  DELIVERY_TYPE_STEP_NAME_OVERRIDES,
  PHASE_MANAGER_FIELD,
  ROLE_TO_PROJECT_FIELD,
  SOP_PHASES,
} from './constants';

import {
  SOP_STEP_TEMPLATES,
  SOP_STEP_DEPENDENCIES,
  SOP_PHASE_DEPENDENCIES,
  SOP_TEMPLATE_VERSION,
} from './sopTemplate';

// ────────────────────────────────
// 1. addBusinessDays
// ────────────────────────────────

/**
 * 在给定日期上增加指定工作日数，跳过周末。
 * 如果起始日期是周末，0 天时移到下一个工作日；
 * 正数天时从起始日期向后计数，遇到周末自动跳过。
 */
export function addBusinessDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00');

  if (days === 0) {
    // 0 天：如果起始日是周末则移到下一个工作日
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }
    return formatDate(date);
  }

  // 从起始日期逐天前进，只在工作日计数
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      added++;
    }
  }

  return formatDate(date);
}

/** 格式化日期为 YYYY-MM-DD */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 比较两个日期字符串的大小，返回较大者 */
function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

// ────────────────────────────────
// 2. filterPhase4Steps
// ────────────────────────────────

/**
 * 根据交付类型返回板块四适用的步骤模板列表（去重、保持顺序、应用名称覆盖）。
 */
export function filterPhase4Steps(deliveryType: DeliveryType): SopStepTemplate[] {
  const stepNos = DELIVERY_TYPE_PHASE4_STEPS[deliveryType];
  const overrides = DELIVERY_TYPE_STEP_NAME_OVERRIDES[deliveryType] ?? {};

  const phase4Templates = SOP_STEP_TEMPLATES.filter((t) => t.phaseNo === 4);

  const result: SopStepTemplate[] = [];
  for (const tmpl of phase4Templates) {
    if (stepNos.includes(tmpl.stepNo)) {
      const name = overrides[tmpl.stepNo] ?? tmpl.stepName;
      result.push({ ...tmpl, stepName: name });
    }
  }

  return result;
}

// ────────────────────────────────
// 3. derivePhaseStatus
// ────────────────────────────────

/**
 * 从步骤列表推导板块状态：取优先级最低（最落后）的状态。
 * - 所有步骤 completed 或 skipped → completed
 * - 否则取最低优先级状态
 * - 空 → pending
 */
export function derivePhaseStatus(steps: SopStep[]): SopPhaseStatus {
  if (steps.length === 0) return 'pending';

  // 全部完成或跳过时视为已完成
  const allCompletedOrSkipped = steps.every(
    (s) => s.status === 'completed' || s.status === 'skipped',
  );
  if (allCompletedOrSkipped) return 'completed';

  // 否则取最低优先级（最落后）的状态
  let minPriority = Infinity;
  let minStatus: SopPhaseStatus = 'pending';

  for (const step of steps) {
    const p = STATUS_PRIORITY[step.status] ?? 0;
    if (p < minPriority) {
      minPriority = p;
      minStatus = step.status;
    }
  }

  return minStatus;
}

// ────────────────────────────────
// 4. calcPhaseCompletion
// ────────────────────────────────

/**
 * 计算板块完成率。
 * - skipped 排除在分母之外
 * - completed = 1, in_progress = 0.5, pending = 0
 * - 全部 skipped 或空 → 1
 */
export function calcPhaseCompletion(steps: SopStep[]): number {
  const effectiveSteps = steps.filter((s) => s.status !== 'skipped');
  if (effectiveSteps.length === 0) return 1;

  let total = 0;
  for (const step of effectiveSteps) {
    if (step.status === 'completed') total += 1;
    else if (step.status === 'in_progress') total += 0.5;
    // pending = 0
  }

  return total / effectiveSteps.length;
}

// ────────────────────────────────
// 5. mapRoleToProjectMember
// ────────────────────────────────

/**
 * 将 SOP 角色映射到项目成员姓名。
 * 如果该角色对应字段为空或不存在，返回角色名本身。
 */
export function mapRoleToProjectMember(role: string, project: Record<string, any>): string {
  const field = ROLE_TO_PROJECT_FIELD[role];
  if (!field) return role;

  const value = project[field];
  if (value == null) return role;

  // 数组型字段（如 productUsers）
  if (Array.isArray(value)) {
    if (value.length === 0) return role;
    return value[0];
  }

  // 字符串型字段（如 owner）
  if (typeof value === 'string') {
    if (value.trim() === '') return role;
    return value;
  }

  return role;
}

// ────────────────────────────────
// 6. mapPhaseManager
// ────────────────────────────────

/**
 * 根据板块号映射板块主管姓名。
 * 如果对应角色字段为空，返回 "字段名（未指定）"。
 */
export function mapPhaseManager(phaseNo: number, project: Record<string, any>): string {
  const field = PHASE_MANAGER_FIELD[phaseNo];
  if (!field) return '';

  const value = project[field];
  if (value == null) return `${field}（未指定）`;

  if (Array.isArray(value)) {
    if (value.length === 0) return `${field}（未指定）`;
    return value[0];
  }

  if (typeof value === 'string') {
    if (value.trim() === '') return `${field}（未指定）`;
    return value;
  }

  return `${field}（未指定）`;
}

// ────────────────────────────────
// 7. isStepOverdue
// ────────────────────────────────

/**
 * 判断步骤是否逾期。
 * 只有 pending 或 in_progress 状态，且 dueDate < today 才算逾期。
 */
export function isStepOverdue(step: SopStep, today: string): boolean {
  if (step.status === 'completed' || step.status === 'skipped') return false;
  return step.dueDate < today;
}

// ────────────────────────────────
// 8. calcOverallCompletion
// ────────────────────────────────

/**
 * 计算整体完成率：所有板块完成率的算术平均值。
 */
export function calcOverallCompletion(phases: SopPhase[], allSteps: SopStep[]): number {
  if (phases.length === 0) return 1;

  let total = 0;
  for (const phase of phases) {
    const phaseSteps = allSteps.filter((s) => s.phaseId === phase.id);
    total += calcPhaseCompletion(phaseSteps);
  }

  return total / phases.length;
}

// ────────────────────────────────
// 9. getDefaultZoomLevel
// ────────────────────────────────

/**
 * 根据总天数返回默认甘特图缩放粒度。
 * ≤30 → day, ≤90 → week, >90 → month
 */
export function getDefaultZoomLevel(totalDays: number): GanttZoomLevel {
  if (totalDays <= 30) return 'day';
  if (totalDays <= 90) return 'week';
  return 'month';
}

// ────────────────────────────────
// 10. generateDeliveryPlan
// ────────────────────────────────

/** 拓扑排序：按依赖顺序处理板块 */
function topologicalSortPhases(phaseNos: number[]): number[] {
  const visited = new Set<number>();
  const result: number[] = [];

  function visit(no: number) {
    if (visited.has(no)) return;
    visited.add(no);

    const deps = SOP_PHASE_DEPENDENCIES[no] ?? [];
    for (const dep of deps) {
      if (phaseNos.includes(dep)) {
        visit(dep);
      }
    }
    result.push(no);
  }

  for (const no of phaseNos) {
    visit(no);
  }

  return result;
}

/**
 * 获取指定板块的步骤模板列表。
 * 板块四根据交付类型过滤，其余板块返回全部。
 */
function getStepTemplatesForPhase(phaseNo: number, deliveryType: DeliveryType) {
  if (phaseNo === 4) {
    return filterPhase4Steps(deliveryType);
  }
  return SOP_STEP_TEMPLATES.filter((t) => t.phaseNo === phaseNo);
}

/**
 * 核心函数：根据配置生成完整的交付计划。
 */
export function generateDeliveryPlan(
  config: DeliveryConfig,
  project: Record<string, any>,
  contractSignDate?: string,
  contractMilestones?: { name: string; date: string; completed: boolean }[],
): DeliveryPlan {
  const { selectedPhases, deliveryType, contractId } = config;
  const projectId: string = project.id ?? '';

  const sortedPhases = topologicalSortPhases(selectedPhases);

  const phases: SopPhase[] = [];
  const steps: SopStep[] = [];
  const phaseEndDates: Record<number, string> = {};

  // 板块 ID 生成
  const phaseIdMap: Record<number, string> = {};

  for (const phaseNo of sortedPhases) {
    const phaseId = `phase-${phaseNo}`;
    phaseIdMap[phaseNo] = phaseId;

    // 确定板块锚定日期
    let anchorDate: string;
    const deps = SOP_PHASE_DEPENDENCIES[phaseNo] ?? [];
    const selectedDeps = deps.filter((d) => selectedPhases.includes(d));

    if (phaseNo === 1 && contractSignDate) {
      anchorDate = contractSignDate;
    } else if (selectedDeps.length > 0) {
      // 使用最晚的依赖板块结束日期 + 1 个工作日
      let latestEnd = '';
      for (const depNo of selectedDeps) {
        latestEnd = maxDate(latestEnd, phaseEndDates[depNo] ?? '');
      }
      anchorDate = addBusinessDays(latestEnd, 1);
    } else {
      anchorDate = project.startDate ?? '2026-06-15';
    }

    // 获取该板块的步骤模板
    const stepTemplates = getStepTemplatesForPhase(phaseNo, deliveryType);

    // 记录每个步骤的日期，用于依赖计算
    const stepDates: Record<string, { start: string; due: string }> = {};

    // 第一遍：计算所有非 evergreen 步骤的日期
    for (const tmpl of stepTemplates) {
      if (tmpl.isEvergreen) continue;

      const stepDeps = SOP_STEP_DEPENDENCIES[tmpl.stepNo] ?? [];
      const selectedStepDeps = stepDeps.filter((depNo) =>
        stepTemplates.some((t) => t.stepNo === depNo),
      );

      let startDate: string;
      if (selectedStepDeps.length > 0) {
        // 使用最晚的依赖步骤结束日期 + 1 个工作日
        let latestDepEnd = '';
        for (const depStepNo of selectedStepDeps) {
          const depDate = stepDates[depStepNo];
          if (depDate) {
            latestDepEnd = maxDate(latestDepEnd, depDate.due);
          }
        }
        if (latestDepEnd) {
          startDate = addBusinessDays(latestDepEnd, 1);
        } else {
          startDate = anchorDate;
        }
      } else {
        startDate = anchorDate;
      }

      const dueDate = addBusinessDays(startDate, tmpl.durationDays - 1);
      stepDates[tmpl.stepNo] = { start: startDate, due: dueDate };
    }

    // 找出板块内非 evergreen 步骤的最晚结束日期
    let maxEndDate = anchorDate;
    for (const tmpl of stepTemplates) {
      if (tmpl.isEvergreen) continue;
      const d = stepDates[tmpl.stepNo];
      if (d) {
        maxEndDate = maxDate(maxEndDate, d.due);
      }
    }

    // 第二遍：设置 evergreen 步骤的日期
    for (const tmpl of stepTemplates) {
      if (!tmpl.isEvergreen) continue;
      stepDates[tmpl.stepNo] = { start: anchorDate, due: maxEndDate };
    }

    // 创建 SopStep 对象
    for (const tmpl of stepTemplates) {
      const d = stepDates[tmpl.stepNo]!;
      const assignee = mapRoleToProjectMember(tmpl.assigneeRole, project);

      steps.push({
        id: `step-${tmpl.stepNo}`,
        phaseId,
        projectId,
        stepNo: tmpl.stepNo,
        stepName: tmpl.stepName,
        department: tmpl.department,
        assignee,
        status: 'pending',
        startDate: d.start,
        dueDate: d.due,
        deliverables: tmpl.deliverables,
        description: tmpl.description,
        notes: tmpl.notes,
        tools: tmpl.tools,
        isCustom: false,
        isEvergreen: tmpl.isEvergreen,
        userNotes: '',
      });
    }

    // 推导板块日期范围
    let phaseStart = anchorDate;
    let phaseEnd = anchorDate;
    for (const d of Object.values(stepDates)) {
      phaseStart = phaseStart <= d.start ? phaseStart : d.start;
      phaseEnd = maxDate(phaseEnd, d.due);
    }

    const manager = mapPhaseManager(phaseNo, project);
    const phaseInfo = SOP_PHASES.find((p) => p.phaseNo === phaseNo);

    phases.push({
      id: phaseId,
      projectId,
      phaseNo,
      phaseName: phaseInfo?.phaseName ?? `板块 ${phaseNo}`,
      manager,
      status: 'pending',
      startDate: phaseStart,
      dueDate: phaseEnd,
    });

    phaseEndDates[phaseNo] = phaseEnd;
  }

  // 生成里程碑
  const milestones: SopMilestone[] = (contractMilestones ?? []).map((m, i) => ({
    id: `milestone-${i + 1}`,
    projectId,
    name: m.name,
    date: m.date,
    completed: m.completed,
  }));

  return {
    projectId,
    phases,
    steps,
    milestones,
    deliveryType,
    contractId,
  };
}

// ────────────────────────────────
// 11. appendPhasesToPlan
// ────────────────────────────────

/**
 * 向已有交付计划追加新的板块。
 * 已存在的板块不会重复添加。
 */
export function appendPhasesToPlan(
  existingPlan: DeliveryPlan,
  newPhaseNos: number[],
  project: Record<string, any>,
  deliveryType: DeliveryType,
  contractSignDate?: string,
  contractMilestones?: { name: string; date: string; completed: boolean }[],
): DeliveryPlan {
  // 过滤掉已存在的板块
  const existingPhaseNos = existingPlan.phases.map((p) => p.phaseNo);
  const trulyNew = newPhaseNos.filter((n) => !existingPhaseNos.includes(n));

  if (trulyNew.length === 0) return existingPlan;

  // 合并已有板块编号与新板块编号
  const allPhaseNos = [...existingPhaseNos, ...trulyNew];

  // 重新生成完整计划以保证依赖关系正确
  const newConfig: DeliveryConfig = {
    selectedPhases: allPhaseNos,
    deliveryType,
    contractId: existingPlan.contractId,
  };

  const newPlan = generateDeliveryPlan(
    newConfig,
    project,
    contractSignDate,
    contractMilestones,
  );

  // 保留已有板块中可能被更新的状态等数据
  // 简化处理：直接返回新生成的计划
  return newPlan;
}
