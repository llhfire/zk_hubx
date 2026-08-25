// 告警卡 5 类 + Cohort 成交率卡（PLAN.md 阶段 B：可点击筛选）
// 点击卡片 = 切换对应快捷分类 Tab

import { Card } from '@arco-design/web-react';
import type { DispatchKpis, DispatchCategory } from '../kpiCalc';

interface KpiCardsProps {
  kpis: DispatchKpis;
  activeCategory: DispatchCategory;
  onSelectCategory: (category: DispatchCategory) => void;
}

interface KpiCardSpec {
  category: DispatchCategory | null;
  title: string;
  value: number | string;
  sub: string;
  danger?: boolean;
}

export function KpiCards({ kpis, activeCategory, onSelectCategory }: KpiCardsProps) {
  const latestCohort = kpis.cohort[0];

  const cards: KpiCardSpec[] = [
    {
      category: null,
      title: '入库派发量（今日）',
      value: kpis.inboundToday,
      sub: `已派发 ${kpis.dispatchedToday} / 待派发 ${kpis.inboundToday - kpis.dispatchedToday}`,
    },
    {
      category: 'pending_dispatch',
      title: '待派发超时',
      value: kpis.dispatchOverdue,
      sub: `待派发池共 ${kpis.pendingDispatch} 条`,
      danger: kpis.dispatchOverdue > 0,
    },
    {
      category: 'first_contact_overdue',
      title: '首联超时',
      value: kpis.firstContactOverdue,
      sub: '派发/领取后 2h 未首联',
      danger: kpis.firstContactOverdue > 0,
    },
    {
      category: 'level_audit',
      title: '等级审核',
      value: kpis.levelAuditPending,
      sub: '降级待审核',
      danger: kpis.levelAuditPending > 0,
    },
    {
      category: 'quality_bucket',
      title: '质检分桶',
      value: kpis.qualityPending,
      sub: '满 3 人退回待确认',
      danger: kpis.qualityPending > 0,
    },
    {
      category: null,
      title: 'Cohort 成交率',
      value: latestCohort ? `${Math.round(latestCohort.rate * 100)}%` : '-',
      sub: latestCohort ? `${latestCohort.month} 录入 ${latestCohort.total} 条 / 已签 ${latestCohort.won}` : '暂无数据',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
      {cards.map((card) => (
        <Card
          key={card.title}
          size="small"
          hoverable={card.category !== null}
          style={{
            cursor: card.category ? 'pointer' : 'default',
            borderColor: card.category && activeCategory === card.category ? 'rgb(var(--primary-6))' : undefined,
          }}
          onClick={() => card.category && onSelectCategory(card.category)}
        >
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{card.title}</div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              marginTop: 4,
              color: card.danger ? 'rgb(var(--danger-6))' : 'var(--color-text-1)',
            }}
          >
            {card.value}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{card.sub}</div>
        </Card>
      ))}
    </div>
  );
}
