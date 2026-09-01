import { Card } from '@arco-design/web-react';
import type { CSSProperties } from 'react';
import type { KanbanSummary } from '../paymentUtils';

const SUMMARY_GROUPS: Array<{
  label: string;
  items: { key: keyof KanbanSummary; label: string; format: (v: number) => string; color: string }[];
}> = [
  {
    label: '经营概览',
    items: [
      { key: 'totalContracts', label: '合同总数', format: (v) => `${v}`, color: 'var(--brand-500)' },
      { key: 'totalReceivable', label: '总应收金额', format: (v) => `¥${(v / 10000).toFixed(1)}万`, color: 'var(--chart-5)' },
      { key: 'monthlyCollected', label: '本月已回款', format: (v) => `¥${(v / 10000).toFixed(1)}万`, color: 'var(--success-500)' },
      { key: 'upcomingMonthEstimate', label: '预计本月回款', format: (v) => `¥${(v / 10000).toFixed(1)}万`, color: 'var(--warning-500)' },
    ],
  },
  {
    label: '风险与预期',
    items: [
      { key: 'overdueAmount', label: '逾期金额', format: (v) => `¥${(v / 10000).toFixed(1)}万`, color: 'var(--destructive-500)' },
      { key: 'blockedCount', label: '卡点合同数', format: (v) => `${v} 个`, color: 'var(--destructive-600)' },
      { key: 'blockedAmount', label: '卡点总金额', format: (v) => `¥${(v / 10000).toFixed(1)}万`, color: 'var(--destructive-700)' },
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
              <Card
                key={item.key}
                className="payment-lane-summary__card"
                size="small"
                style={{ '--metric-accent': item.color } as CSSProperties}
              >
                <div className="payment-lane-summary__label">{item.label}</div>
                <div className="payment-lane-summary__value">
                  {item.format(summary[item.key] as number)}
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
