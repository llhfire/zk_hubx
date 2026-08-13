// src/app/pages/delivery-plan/DeliveryProgressCard.tsx

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card, Typography } from '@arco-design/web-react';
import type { DeliveryPlan } from './types';
import { PHASE_COLORS, PHASE_COLORS_LIGHT, SOP_PHASES } from './constants';
import { calcOverallCompletion, calcPhaseCompletion } from './utils';
import { initialDeliveryPlans } from './mockData';

const { Text } = Typography;

interface DeliveryProgressCardProps {
  projectId: string;
  onClick: () => void;
}

/** 空状态：全灰环 + 0% */
function buildEmptyPieData() {
  return SOP_PHASES.map((p) => ({
    name: p.phaseName,
    value: 1,
    fill: PHASE_COLORS_LIGHT[p.phaseNo],
  }));
}

/** 有计划时：每个板块生成 completed + remaining 两段 */
function buildProgressPieData(plan: DeliveryPlan) {
  return plan.phases.flatMap((phase) => {
    const phaseSteps = plan.steps.filter((s) => s.phaseId === phase.id);
    const completion = calcPhaseCompletion(phaseSteps);
    return [
      {
        name: `${phase.phaseName}完成`,
        value: Math.max(completion, 0.001),
        fill: PHASE_COLORS[phase.phaseNo],
      },
      {
        name: `${phase.phaseName}剩余`,
        value: Math.max(1 - completion, 0.001),
        fill: PHASE_COLORS_LIGHT[phase.phaseNo],
      },
    ];
  });
}

export function DeliveryProgressCard({ projectId, onClick }: DeliveryProgressCardProps) {
  const plan = initialDeliveryPlans[projectId];

  const { pieData, completionPct } = useMemo(() => {
    if (!plan) {
      return { pieData: buildEmptyPieData(), completionPct: 0 };
    }
    return {
      pieData: buildProgressPieData(plan),
      completionPct: Math.round(calcOverallCompletion(plan.phases, plan.steps) * 100),
    };
  }, [plan]);

  return (
    <Card
      title="交付进度"
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      hoverable
    >
      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <ResponsiveContainer width="100%" height={100}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={48}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              animationBegin={0}
              animationDuration={600}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* 中心百分比 */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: '22px', color: 'var(--color-text-1)' }}>
            {completionPct}%
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px 12px',
          justifyContent: 'center',
          marginTop: 8,
        }}
      >
        {SOP_PHASES.map((p) => (
          <div key={p.phaseNo} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: plan ? PHASE_COLORS[p.phaseNo] : 'var(--color-text-4)',
                flexShrink: 0,
              }}
            />
            <Text style={{ fontSize: 11, color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>
              {p.phaseName}
            </Text>
          </div>
        ))}
      </div>

      {/* 空状态提示 */}
      {!plan && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Text style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
            点击生成交付计划
          </Text>
        </div>
      )}
    </Card>
  );
}
