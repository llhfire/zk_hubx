// src/app/pages/delivery-plan/GanttChart.tsx

import React, { useMemo } from 'react';
import { Radio } from '@arco-design/web-react';
import type { DeliveryPlan, SopStep, GanttZoomLevel } from './types';
import { PHASE_COLORS, PHASE_COLORS_LIGHT } from './constants';
import { isStepOverdue } from './utils';
import {
  parseISO,
  differenceInDays,
  format,
  addDays,
  startOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  startOfMonth,
  isWeekend,
} from 'date-fns';

/* ---------- Props ---------- */

export interface GanttChartProps {
  plan: DeliveryPlan;
  zoomLevel: GanttZoomLevel;
  onZoomLevelChange: (level: GanttZoomLevel) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}

/* ---------- Constants ---------- */

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 40;
const BUFFER_DAYS = 7;
const PX_PER_DAY: Record<GanttZoomLevel, number> = {
  day: 40,
  week: 20,
  month: 8,
};

const ZOOM_OPTIONS: { label: string; value: GanttZoomLevel }[] = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
];

/* ---------- Milestones within a phase date range ---------- */

function milestonesInPhase(
  milestones: DeliveryPlan['milestones'],
  phaseStart: string,
  phaseEnd: string,
): DeliveryPlan['milestones'] {
  const start = new Date(phaseStart).getTime();
  const end = new Date(phaseEnd).getTime();
  return milestones.filter((m) => {
    const t = new Date(m.date).getTime();
    return t >= start && t <= end;
  });
}

/* ---------- Row items (mirrors TaskList order) ---------- */

type RowItem =
  | { kind: 'phase'; phaseNo: number; phaseName: string; id: string; startDate: string; dueDate: string; status: string }
  | { kind: 'step'; step: SopStep; phaseNo: number }
  | { kind: 'milestone'; milestone: DeliveryPlan['milestones'][number]; phaseNo: number };

function buildRowItems(plan: DeliveryPlan): RowItem[] {
  const { phases, steps, milestones } = plan;
  const sortedPhases = [...phases].sort((a, b) => a.phaseNo - b.phaseNo);
  const rows: RowItem[] = [];

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

    const phaseSteps = steps
      .filter((s) => s.phaseId === phase.id)
      .sort((a, b) => a.stepNo.localeCompare(b.stepNo, undefined, { numeric: true }));

    for (const step of phaseSteps) {
      rows.push({ kind: 'step', step, phaseNo: phase.phaseNo });
    }

    const phaseMilestones = milestonesInPhase(milestones, phase.startDate, phase.dueDate);
    for (const milestone of phaseMilestones) {
      rows.push({ kind: 'milestone', milestone, phaseNo: phase.phaseNo });
    }
  }

  return rows;
}

/* ---------- Main component ---------- */

const GanttChart: React.FC<GanttChartProps> = ({
  plan,
  zoomLevel,
  onZoomLevelChange,
  scrollRef,
}) => {
  const pxPerDay = PX_PER_DAY[zoomLevel];

  /* ---- Timeline date range ---- */
  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    const { steps, milestones } = plan;
    const allDates: string[] = [];

    for (const s of steps) {
      if (s.startDate) allDates.push(s.startDate);
      if (s.dueDate) allDates.push(s.dueDate);
    }
    for (const m of milestones) {
      if (m.date) allDates.push(m.date);
    }

    if (allDates.length === 0) {
      const today = format(new Date(), 'yyyy-MM-dd');
      allDates.push(today);
    }

    allDates.sort();
    const start = addDays(parseISO(allDates[0]), -BUFFER_DAYS);
    const end = addDays(parseISO(allDates[allDates.length - 1]), BUFFER_DAYS);
    const days = differenceInDays(end, start) + 1;

    return { timelineStart: start, timelineEnd: end, totalDays: days };
  }, [plan]);

  const totalWidth = totalDays * pxPerDay;

  /* ---- Row items ---- */
  const rowItems = useMemo(() => buildRowItems(plan), [plan]);

  /* ---- Today line position ---- */
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayOffset = differenceInDays(new Date(), timelineStart) * pxPerDay;

  /* ---- Date scale columns ---- */
  const dateScale = useMemo(() => {
    const interval = { start: timelineStart, end: timelineEnd };

    if (zoomLevel === 'day') {
      const days = eachDayOfInterval(interval);
      return days.map((d) => {
        const weekend = isWeekend(d);
        const offset = differenceInDays(d, timelineStart) * pxPerDay;
        return {
          label: weekend ? '' : format(d, 'M/d'),
          offset,
          width: pxPerDay,
          weekend,
        };
      });
    }

    if (zoomLevel === 'week') {
      const weeks = eachWeekOfInterval(interval, { weekStartsOn: 1 });
      return weeks.map((w, i) => {
        const offset = differenceInDays(w, timelineStart) * pxPerDay;
        const weekEnd = addDays(w, 6);
        const width = (differenceInDays(
          weekEnd > timelineEnd ? timelineEnd : weekEnd,
          w,
        ) + 1) * pxPerDay;
        return {
          label: format(w, 'M/d'),
          offset,
          width,
          weekend: false,
        };
      });
    }

    // month zoom
    const months = eachMonthOfInterval(interval);
    return months.map((m) => {
      const offset = differenceInDays(m, timelineStart) * pxPerDay;
      const monthEnd = addDays(addDays(startOfMonth(addMonths(m, 1)), -1), 1);
      const clampedEnd = monthEnd > timelineEnd ? timelineEnd : monthEnd;
      const width = (differenceInDays(clampedEnd, m)) * pxPerDay;
      return {
        label: format(m, 'yyyy-M'),
        offset,
        width: Math.max(width, pxPerDay),
        weekend: false,
      };
    });
  }, [timelineStart, timelineEnd, zoomLevel, pxPerDay]);

  /* ---- Helper: date → pixel offset ---- */
  const dateToOffset = (dateStr: string): number => {
    return differenceInDays(parseISO(dateStr), timelineStart) * pxPerDay;
  };

  const dateToWidth = (startStr: string, endStr: string): number => {
    return (differenceInDays(parseISO(endStr), parseISO(startStr)) + 1) * pxPerDay;
  };

  /* ---- Render ---- */

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100%',
        background: '#fff',
      }}
    >
      {/* Zoom buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #e5e6eb',
          flexShrink: 0,
        }}
      >
        <Radio.Group
          type="button"
          value={zoomLevel}
          onChange={(val) => onZoomLevelChange(val as GanttZoomLevel)}
          size="small"
        >
          {ZOOM_OPTIONS.map((opt) => (
            <Radio key={opt.value} value={opt.value}>
              {opt.label}
            </Radio>
          ))}
        </Radio.Group>
      </div>

      {/* Scrollable area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <div style={{ width: totalWidth, position: 'relative', minHeight: '100%' }}>
          {/* ---- Date scale header (sticky) ---- */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              height: HEADER_HEIGHT,
              background: '#fafbfc',
              borderBottom: '1px solid #e5e6eb',
              display: 'flex',
              alignItems: 'flex-end',
            }}
          >
            {dateScale.map((col, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: col.offset,
                  width: col.width,
                  fontSize: 11,
                  color: col.weekend ? '#c9cdd4' : '#86909c',
                  textAlign: 'center',
                  paddingBottom: 6,
                  borderRight: '1px solid #f0f0f0',
                  background: col.weekend ? '#f7f8fa' : '#fafbfc',
                  height: HEADER_HEIGHT,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                }}
              >
                {col.label}
              </div>
            ))}
          </div>

          {/* ---- Row area ---- */}
          <div style={{ position: 'relative' }}>
            {/* Today line */}
            {todayOffset >= 0 && todayOffset <= totalWidth && (
              <div
                style={{
                  position: 'absolute',
                  left: todayOffset,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  borderLeft: '2px dashed rgb(var(--red-6))',
                  zIndex: 5,
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: -HEADER_HEIGHT + 4,
                    left: 4,
                    fontSize: 10,
                    color: 'rgb(var(--red-6))',
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                  }}
                >
                  今日
                </span>
              </div>
            )}

            {/* Rows */}
            {rowItems.map((item, rowIdx) => {
              const top = rowIdx * ROW_HEIGHT;

              if (item.kind === 'phase') {
                const barLeft = dateToOffset(item.startDate);
                const barWidth = dateToWidth(item.startDate, item.dueDate);
                const bgColor = PHASE_COLORS_LIGHT[item.phaseNo] || '#e8f3ff';

                return (
                  <div
                    key={item.id}
                    style={{
                      position: 'absolute',
                      top,
                      left: 0,
                      right: 0,
                      height: ROW_HEIGHT,
                      background: '#f7f8fa',
                      borderBottom: '1px solid #e5e6eb',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: barLeft,
                        top: 6,
                        width: barWidth,
                        height: ROW_HEIGHT - 12,
                        background: bgColor,
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#4e5969',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.phaseName}
                    </div>
                  </div>
                );
              }

              if (item.kind === 'step') {
                const step = item.step;
                const barLeft = dateToOffset(step.startDate);
                const barWidth = dateToWidth(step.startDate, step.dueDate);
                const overdue = isStepOverdue(step, todayStr);
                const color = PHASE_COLORS[item.phaseNo] || '#165dff';
                const isSkipped = step.status === 'skipped';

                /* Bar style */
                let barBg = color;
                if (overdue) barBg = 'rgb(var(--red-6))';

                const evergreenPattern = step.isEvergreen
                  ? `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.25) 4px, rgba(255,255,255,0.25) 8px)`
                  : undefined;

                return (
                  <div
                    key={step.id}
                    style={{
                      position: 'absolute',
                      top,
                      left: 0,
                      right: 0,
                      height: ROW_HEIGHT,
                      background: '#fff',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: barLeft,
                        top: 8,
                        width: barWidth,
                        height: ROW_HEIGHT - 16,
                        background: isSkipped
                          ? `${barBg}44`
                          : evergreenPattern
                            ? evergreenPattern
                            : barBg,
                        backgroundColor: isSkipped ? undefined : barBg,
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: 6,
                        paddingRight: 4,
                        fontSize: 11,
                        color: '#fff',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        opacity: isSkipped ? 0.5 : 1,
                        border: step.isEvergreen ? '2px dashed rgba(255,255,255,0.6)' : 'none',
                        textDecoration: isSkipped ? 'line-through' : 'none',
                      }}
                    >
                      {step.isCustom && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 14,
                            height: 14,
                            borderRadius: 2,
                            background: 'rgba(255,255,255,0.35)',
                            fontSize: 9,
                            fontWeight: 700,
                            marginRight: 3,
                            flexShrink: 0,
                          }}
                        >
                          C
                        </span>
                      )}
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          textDecoration: isSkipped ? 'line-through' : 'none',
                        }}
                      >
                        {step.stepName}
                      </span>
                      {overdue && (
                        <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 13 }}>
                          ⚠
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              // Milestone
              if (item.kind === 'milestone') {
                const milestone = item.milestone;
                const diamondLeft = dateToOffset(milestone.date);
                const diamondColor = milestone.completed ? '#f7ba1e' : '#c9cdd4';
                const diamondSize = 16;

                return (
                  <div
                    key={milestone.id}
                    style={{
                      position: 'absolute',
                      top,
                      left: 0,
                      right: 0,
                      height: ROW_HEIGHT,
                      background: '#f0f7ff',
                      borderBottom: '1px solid #e5e6eb',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: diamondLeft - diamondSize / 2,
                        top: (ROW_HEIGHT - diamondSize) / 2,
                        width: diamondSize,
                        height: diamondSize,
                        background: diamondColor,
                        transform: 'rotate(45deg)',
                        borderRadius: 2,
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        left: diamondLeft + diamondSize / 2 + 4,
                        top: 0,
                        height: ROW_HEIGHT,
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 11,
                        color: '#4e5969',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {milestone.name}
                    </span>
                  </div>
                );
              }

              return null;
            })}

            {/* Bottom spacer to ensure last row is fully visible */}
            <div style={{ height: rowItems.length * ROW_HEIGHT }} />
          </div>
        </div>
      </div>
    </div>
  );
};

/** Helper: add months to a date (simple version) */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export default GanttChart;
