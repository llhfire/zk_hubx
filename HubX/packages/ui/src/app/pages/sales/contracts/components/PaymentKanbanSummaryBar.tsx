import type { ReactNode } from 'react';
import type { KanbanSummary } from '../paymentUtils';
import { MetricCard, MoneyText, type MetricCardTone } from '@/design-system';

const SUMMARY_GROUPS: Array<{
  label: string;
  items: { key: keyof KanbanSummary; label: string; render: (v: number) => ReactNode; tone?: MetricCardTone }[];
}> = [
  {
    label: '经营概览',
    items: [
      { key: 'totalContracts', label: '合同总数', render: (v) => `${v}`, tone: 'default' },
      { key: 'totalReceivable', label: '总应收金额', render: (v) => <MoneyText variant="compact" value={v} />, tone: 'default' },
      { key: 'monthlyCollected', label: '本月已回款', render: (v) => <MoneyText variant="compact" value={v} />, tone: 'success' },
      { key: 'upcomingMonthEstimate', label: '预计本月回款', render: (v) => <MoneyText variant="compact" value={v} />, tone: 'warning' },
    ],
  },
  {
    label: '风险与预期',
    items: [
      { key: 'overdueAmount', label: '逾期金额', render: (v) => <MoneyText variant="compact" value={v} />, tone: 'danger' },
      { key: 'blockedCount', label: '卡点合同数', render: (v) => `${v} 个`, tone: 'danger' },
      { key: 'blockedAmount', label: '卡点总金额', render: (v) => <MoneyText variant="compact" value={v} />, tone: 'danger' },
    ],
  },
];

interface Props {
  summary: KanbanSummary;
}

export function PaymentKanbanSummaryBar({ summary }: Props) {
  return (
    <div className="payment-lane-summary">
      {SUMMARY_GROUPS.map((group) => (
        <section className="payment-lane-summary__group" key={group.label}>
          <div className="payment-lane-summary__group-label">{group.label}</div>
          <div className="payment-lane-summary__items">
            {group.items.map((item) => (
              <MetricCard
                key={item.key}
                className="payment-lane-summary__card"
                label={item.label}
                value={item.render(summary[item.key] as number)}
                tone={item.tone}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
