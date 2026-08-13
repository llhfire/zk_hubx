import React, { useCallback } from 'react';
import { Badge, Tag, Button, Typography, Space } from '@arco-design/web-react';
import { IconPlus, IconEdit, IconCaretDown, IconCaretRight } from '@arco-design/web-react/icon';
import { format } from 'date-fns';
import type { DeliveryPlan, SopStep, SopStepStatus, SopMilestone } from './types';

const { Text } = Typography;

/* ---------- Props ---------- */

export interface TaskListProps {
  plan: DeliveryPlan;
  project: Record<string, any>;
  onStepEdit: (step: SopStep) => void;
  onAddCustomStep: (phaseId: string, phaseNo: number) => void;
  expandedPhaseIds: string[];
  onExpandedPhaseIdsChange: (ids: string[]) => void;
  expandedStepIds: string[];
  onExpandedStepIdsChange: (ids: string[]) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}

/* ---------- Status badge helper ---------- */

type BadgeStatus = 'default' | 'processing' | 'success' | 'warning';

const STATUS_MAP: Record<SopStepStatus, { badge: BadgeStatus; text: string }> = {
  pending: { badge: 'default', text: '待开始' },
  in_progress: { badge: 'processing', text: '进行中' },
  completed: { badge: 'success', text: '已完成' },
  skipped: { badge: 'warning', text: '已跳过' },
};

function statusBadge(status: SopStepStatus) {
  const { badge, text } = STATUS_MAP[status];
  return <Badge status={badge} text={text} />;
}

/* ---------- Phase progress ---------- */

function phaseProgress(steps: SopStep[]) {
  const completed = steps.filter((s) => s.status === 'completed').length;
  return `${completed}/${steps.length}`;
}

/* ---------- Chinese ordinal for phase number ---------- */

const CN_ORDINALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

function cnOrdinal(n: number): string {
  if (n >= 1 && n <= 10) return CN_ORDINALS[n - 1];
  return String(n);
}

/* ---------- Milestones within a phase date range ---------- */

function milestonesInPhase(
  milestones: SopMilestone[],
  phaseStart: string,
  phaseEnd: string,
): SopMilestone[] {
  const start = new Date(phaseStart).getTime();
  const end = new Date(phaseEnd).getTime();
  return milestones.filter((m) => {
    const t = new Date(m.date).getTime();
    return t >= start && t <= end;
  });
}

/* ---------- Step detail panel ---------- */

function StepDetailPanel({ step }: { step: SopStep }) {
  const sections: { label: string; value: string }[] = [
    { label: '描述', value: step.description },
    { label: '注意事项', value: step.notes },
    { label: '执行工具', value: step.tools },
    { label: '执行产物', value: step.deliverables },
  ];
  if (step.userNotes) {
    sections.push({ label: '用户备注', value: step.userNotes });
  }

  return (
    <div
      style={{
        padding: '10px 16px 10px 56px',
        background: '#fafbfc',
        borderTop: '1px solid #f0f0f0',
        fontSize: 13,
        color: '#86909c',
      }}
    >
      {sections.map(
        (sec) =>
          sec.value && (
            <div key={sec.label} style={{ marginBottom: 4 }}>
              <Text bold style={{ color: '#86909c', marginRight: 8, fontSize: 12 }}>
                {sec.label}:
              </Text>
              <span>{sec.value}</span>
            </div>
          ),
      )}
    </div>
  );
}

/* ---------- Main component ---------- */

const TaskList: React.FC<TaskListProps> = ({
  plan,
  project,
  onStepEdit,
  onAddCustomStep,
  expandedPhaseIds,
  onExpandedPhaseIdsChange,
  expandedStepIds,
  onExpandedStepIdsChange,
  scrollRef,
}) => {
  const { phases, steps, milestones } = plan;

  /* Sorted phases */
  const sortedPhases = [...phases].sort((a, b) => a.phaseNo - b.phaseNo);

  /* Toggle helpers */
  const togglePhase = useCallback(
    (phaseId: string) => {
      const next = expandedPhaseIds.includes(phaseId)
        ? expandedPhaseIds.filter((id) => id !== phaseId)
        : [...expandedPhaseIds, phaseId];
      onExpandedPhaseIdsChange(next);
    },
    [expandedPhaseIds, onExpandedPhaseIdsChange],
  );

  const toggleStep = useCallback(
    (stepId: string) => {
      const next = expandedStepIds.includes(stepId)
        ? expandedStepIds.filter((id) => id !== stepId)
        : [...expandedStepIds, stepId];
      onExpandedStepIdsChange(next);
    },
    [expandedStepIds, onExpandedStepIdsChange],
  );

  const handleStepDoubleClick = useCallback(
    (step: SopStep) => {
      onStepEdit(step);
    },
    [onStepEdit],
  );

  return (
    <div
      ref={scrollRef}
      style={{
        height: '100%',
        overflowY: 'auto',
        borderRight: '1px solid #e5e6eb',
        background: '#fff',
      }}
    >
      {sortedPhases.map((phase) => {
        const isPhaseExpanded = expandedPhaseIds.includes(phase.id);
        const phaseSteps = steps
          .filter((s) => s.phaseId === phase.id)
          .sort((a, b) => a.stepNo.localeCompare(b.stepNo, undefined, { numeric: true }));
        const phaseMilestones = milestonesInPhase(milestones, phase.startDate, phase.dueDate);

        return (
          <div key={phase.id}>
            {/* ---- Phase row ---- */}
            <div
              onClick={() => togglePhase(phase.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 12px',
                background: '#f7f8fa',
                borderBottom: '1px solid #e5e6eb',
                cursor: 'pointer',
                userSelect: 'none',
                gap: 8,
              }}
            >
              {/* Collapse arrow */}
              <span style={{ flexShrink: 0, width: 16, textAlign: 'center', color: '#86909c' }}>
                {isPhaseExpanded ? <IconCaretDown /> : <IconCaretRight />}
              </span>

              {/* Phase name */}
              <Text bold style={{ fontSize: 14, flexShrink: 0, marginRight: 4 }}>
                {cnOrdinal(phase.phaseNo)}、{phase.phaseName}
              </Text>

              {/* Spacer */}
              <span style={{ flex: 1 }} />

              {/* Manager */}
              <Text style={{ fontSize: 12, color: '#86909c', flexShrink: 0 }}>
                {phase.manager}
              </Text>

              {/* Status badge */}
              <span style={{ flexShrink: 0 }}>{statusBadge(phase.status)}</span>

              {/* Progress */}
              <Text style={{ fontSize: 12, color: '#86909c', flexShrink: 0 }}>
                {phaseProgress(phaseSteps)}
              </Text>

              {/* Add custom step button */}
              <Button
                type="text"
                size="mini"
                icon={<IconPlus />}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddCustomStep(phase.id, phase.phaseNo);
                }}
                style={{ flexShrink: 0, color: '#86909c' }}
              />
            </div>

            {/* ---- Expanded content: steps + milestones ---- */}
            {isPhaseExpanded && (
              <div>
                {phaseSteps.map((step) => {
                  const isStepExpanded = expandedStepIds.includes(step.id);

                  return (
                    <div key={step.id}>
                      {/* Step row */}
                      <div
                        onClick={() => toggleStep(step.id)}
                        onDoubleClick={() => handleStepDoubleClick(step)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px 8px 36px',
                          background: '#fff',
                          borderBottom: '1px solid #f0f0f0',
                          cursor: 'pointer',
                          userSelect: 'none',
                          gap: 8,
                          minHeight: 40,
                        }}
                      >
                        {/* Step number + name */}
                        <span style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <Text style={{ marginRight: 4 }}>{step.stepNo}</Text>
                          <Text>{step.stepName}</Text>
                          {step.isCustom && (
                            <Tag color="orange" size="small" style={{ marginLeft: 6 }}>
                              自
                            </Tag>
                          )}
                        </span>

                        {/* Assignee */}
                        <Text style={{ fontSize: 12, color: '#86909c', flexShrink: 0 }}>
                          {step.assignee}
                        </Text>

                        {/* Status badge */}
                        <span style={{ flexShrink: 0 }}>{statusBadge(step.status)}</span>

                        {/* Edit icon */}
                        <Button
                          type="text"
                          size="mini"
                          icon={<IconEdit />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onStepEdit(step);
                          }}
                          style={{ flexShrink: 0, color: '#c9cdd4' }}
                        />
                      </div>

                      {/* Step detail panel */}
                      {isStepExpanded && <StepDetailPanel step={step} />}
                    </div>
                  );
                })}

                {/* Milestones */}
                {phaseMilestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px 8px 36px',
                      background: '#f0f7ff',
                      borderBottom: '1px solid #e5e6eb',
                      gap: 8,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>💎</span>
                    <Text style={{ flex: 1 }}>{milestone.name}</Text>
                    <Text style={{ fontSize: 12, color: '#86909c', flexShrink: 0 }}>
                      {format(new Date(milestone.date), 'yyyy-MM-dd')}
                    </Text>
                    <span style={{ flexShrink: 0 }}>{milestone.completed ? '✅' : '⏳'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TaskList;
