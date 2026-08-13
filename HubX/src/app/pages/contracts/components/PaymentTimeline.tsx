import { Timeline } from '@arco-design/web-react';
import { IconCheckCircleFill, IconExclamationCircleFill, IconClockCircle } from '@arco-design/web-react/icon';
import type { Contract } from '../types';
import { getReceivedAmount } from '../paymentUtils';
import { BLOCKER_TYPE_LABELS } from '../types';

const TimelineItem = Timeline.Item;

interface Props {
  contract: Contract;
}

export function PaymentTimeline({ contract }: Props) {
  const received = getReceivedAmount(contract);
  const plans = contract.current.paymentPlans ?? [];
  const blockers = contract.paymentBlockers ?? [];

  let accumulatedPlan = 0;

  return (
    <Timeline>
      {/* 签约 */}
      <TimelineItem
        dot={<IconCheckCircleFill style={{ color: '#3b82f6' }} />}
        label={contract.current.signDate}
      >
        签约 · ¥{(contract.current.totalAmount / 10000).toFixed(1)}万
      </TimelineItem>

      {/* 付款节点 */}
      {plans.map((plan) => {
        accumulatedPlan += plan.amount;
        const planCols = (contract.collectionRecords ?? []).filter((col) => {
          const colDate = new Date(col.date);
          const planDate = new Date(plan.expectedDate);
          return colDate <= planDate;
        });
        const planReceived = planCols.reduce((s, c) => s + c.amount, 0);
        const isPaid = planReceived >= plan.amount;
        const isOverdue = !isPaid && new Date() > new Date(new Date(plan.expectedDate).getTime() + 7 * 86400000);
        const relatedBlockers = blockers.filter(b => !b.resolvedAt);

        return (
          <TimelineItem
            key={plan.period}
            dot={
              isPaid ? (
                <IconCheckCircleFill style={{ color: '#10b981' }} />
              ) : isOverdue ? (
                <IconExclamationCircleFill style={{ color: '#ef4444' }} />
              ) : (
                <IconClockCircle style={{ color: '#f59e0b' }} />
              )
            }
            label={plan.expectedDate}
          >
            {plan.period === 1 ? '一期' : plan.period === 2 ? '二期' : plan.period === 3 ? '三期' : `${plan.period}期`}
            付款 ¥{(plan.amount / 10000).toFixed(1)}万（{plan.percentage}%）
            {isPaid && planCols.length > 0 && (
              <div style={{ color: '#10b981', fontSize: 11 }}>
                ✅ 实际到账 ¥{(planReceived / 10000).toFixed(0)}万
              </div>
            )}
            {isOverdue && (
              <div style={{ color: '#ef4444', fontSize: 11 }}>
                ⚠️ 逾期 {Math.floor((Date.now() - new Date(plan.expectedDate).getTime()) / 86400000)} 天
              </div>
            )}
            {relatedBlockers.map(b => (
              <div key={b.id} style={{ color: '#dc2626', fontSize: 10, marginTop: 2 }}>
                🔴 {BLOCKER_TYPE_LABELS[b.type]}：{b.title}
              </div>
            ))}
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
