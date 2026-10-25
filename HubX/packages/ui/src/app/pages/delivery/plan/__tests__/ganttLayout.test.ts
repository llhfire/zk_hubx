import { describe, expect, it } from 'vitest';
import type { DeliveryPlan } from '../types';
import {
  GANTT_ROW_HEIGHT,
  GANTT_STEP_DETAIL_HEIGHT,
  buildGanttRowItems,
  getGanttRowsHeight,
  positionGanttRows,
} from '../ganttLayout';

const plan: DeliveryPlan = {
  projectId: 'project-1',
  deliveryType: 'APP',
  phases: [
    {
      id: 'phase-1', projectId: 'project-1', phaseNo: 1, phaseName: '合同交接',
      manager: '负责人', status: 'completed', startDate: '2026-06-01', dueDate: '2026-06-05',
    },
    {
      id: 'phase-2', projectId: 'project-1', phaseNo: 2, phaseName: '启动准备',
      manager: '负责人', status: 'pending', startDate: '2026-06-06', dueDate: '2026-06-10',
    },
  ],
  steps: [
    {
      id: 'step-1.1', phaseId: 'phase-1', projectId: 'project-1', stepNo: '1.1',
      stepName: '合同接收', department: '销售部', assignee: '销售', status: 'completed',
      startDate: '2026-06-01', dueDate: '2026-06-02', deliverables: '', description: '',
      notes: '', tools: '', isCustom: false, isEvergreen: false, userNotes: '',
    },
    {
      id: 'step-2.1', phaseId: 'phase-2', projectId: 'project-1', stepNo: '2.1',
      stepName: '项目立项', department: '产品部', assignee: '产品', status: 'pending',
      startDate: '2026-06-06', dueDate: '2026-06-08', deliverables: '', description: '',
      notes: '', tools: '', isCustom: false, isEvergreen: false, userNotes: '',
    },
  ],
  milestones: [
    { id: 'milestone-1', projectId: 'project-1', name: '合同签订', date: '2026-06-03', completed: true },
  ],
};

describe('甘特图行布局', () => {
  it('折叠板块时甘特图同步隐藏该板块的步骤和里程碑', () => {
    const rows = buildGanttRowItems(plan, ['phase-2'], []);

    expect(rows.map((row) => row.kind)).toEqual(['phase', 'phase', 'step']);
  });

  it('展开步骤详情时为右侧时间轴保留相同高度', () => {
    const rows = buildGanttRowItems(plan, ['phase-1', 'phase-2'], ['step-1.1']);
    const positionedRows = positionGanttRows(rows);
    const detailRow = positionedRows.find((row) => row.item.kind === 'detail');
    const milestoneRow = positionedRows.find((row) => row.item.kind === 'milestone');

    expect(detailRow).toMatchObject({ top: GANTT_ROW_HEIGHT * 2, height: GANTT_STEP_DETAIL_HEIGHT });
    expect(milestoneRow?.top).toBe(GANTT_ROW_HEIGHT * 2 + GANTT_STEP_DETAIL_HEIGHT);
    expect(getGanttRowsHeight(positionedRows)).toBe(
      GANTT_ROW_HEIGHT * 5 + GANTT_STEP_DETAIL_HEIGHT,
    );
  });
});
