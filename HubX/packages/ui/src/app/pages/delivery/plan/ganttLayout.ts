import type { DeliveryPlan, SopMilestone, SopPhase, SopStep } from './types';

export const GANTT_HEADER_HEIGHT = 40;
export const GANTT_ROW_HEIGHT = 40;
export const GANTT_STEP_DETAIL_HEIGHT = 132;

export type GanttRowItem =
  | {
      kind: 'phase';
      phaseNo: number;
      phaseName: string;
      id: string;
      startDate: string;
      dueDate: string;
      status: string;
    }
  | { kind: 'step'; step: SopStep; phaseNo: number }
  | { kind: 'detail'; stepId: string }
  | { kind: 'milestone'; milestone: SopMilestone; phaseNo: number };

export interface PositionedGanttRow {
  item: GanttRowItem;
  top: number;
  height: number;
}

export function milestonesInPhase(
  milestones: SopMilestone[],
  phase: SopPhase,
  phases: SopPhase[],
): SopMilestone[] {
  return milestones.filter((milestone) => milestonePhaseNo(milestone, phases) === phase.phaseNo);
}

function milestonePhaseNo(milestone: SopMilestone, phases: SopPhase[]): number | undefined {
  const available = new Set(phases.map((phase) => phase.phaseNo));
  const text = `${milestone.name} ${milestone.condition ?? ''}`;
  const semanticCandidates: Array<[RegExp, number]> = [
    [/终验|验收|测试|复测/, 5],
    [/上架|备案|发布|部署|域名|SSL|软著/i, 4],
    [/运维|维护|质保|培训|移交/, 6],
    [/总结|复盘|结项/, 7],
    [/合同签订|合同生效|首期款/, 1],
    [/立项|启动/, 2],
    [/需求|原型|UI|架构|设计|开发|交付|二期款|三期款|四期款|五期款|六期款|七期款|八期款/, 3],
  ];

  if (milestone.source && milestone.source !== 'manual') {
    if (milestone.source === 'contract_signing' && available.has(1)) return 1;
    const matched = semanticCandidates.find(([pattern, phaseNo]) => pattern.test(text) && available.has(phaseNo));
    if (matched) return matched[1];
  }

  const date = new Date(milestone.date).getTime();
  const matchingPhases = phases
    .filter((candidate) => {
      const start = new Date(candidate.startDate).getTime();
      const end = new Date(candidate.dueDate).getTime();
      return date >= start && date <= end;
    })
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  return matchingPhases[0]?.phaseNo;
}

export function buildGanttRowItems(
  plan: DeliveryPlan,
  expandedPhaseIds: string[],
  expandedStepIds: string[],
): GanttRowItem[] {
  const expandedPhases = new Set(expandedPhaseIds);
  const expandedSteps = new Set(expandedStepIds);
  const sortedPhases = [...plan.phases].sort((a, b) => a.phaseNo - b.phaseNo);
  const rows: GanttRowItem[] = [];

  for (const phase of sortedPhases) {
    rows.push({
      kind: 'phase',
      phaseNo: phase.phaseNo,
      phaseName: phase.phaseName,
      id: phase.id,
      startDate: phase.startDate,
      dueDate: phase.dueDate,
      status: phase.status,
    });

    if (!expandedPhases.has(phase.id)) continue;

    const phaseSteps = plan.steps
      .filter((step) => step.phaseId === phase.id)
      .sort((a, b) => a.stepNo.localeCompare(b.stepNo, undefined, { numeric: true }));

    for (const step of phaseSteps) {
      rows.push({ kind: 'step', step, phaseNo: phase.phaseNo });
      if (expandedSteps.has(step.id)) rows.push({ kind: 'detail', stepId: step.id });
    }

    for (const milestone of milestonesInPhase(plan.milestones, phase, plan.phases)) {
      rows.push({ kind: 'milestone', milestone, phaseNo: phase.phaseNo });
    }
  }

  return rows;
}

export function positionGanttRows(rows: GanttRowItem[]): PositionedGanttRow[] {
  let top = 0;
  return rows.map((item) => {
    const height = item.kind === 'detail' ? GANTT_STEP_DETAIL_HEIGHT : GANTT_ROW_HEIGHT;
    const positioned = { item, top, height };
    top += height;
    return positioned;
  });
}

export function getGanttRowsHeight(rows: PositionedGanttRow[]): number {
  const lastRow = rows.at(-1);
  return lastRow ? lastRow.top + lastRow.height : 0;
}
