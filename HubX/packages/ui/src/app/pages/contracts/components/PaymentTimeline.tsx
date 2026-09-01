import { Timeline } from '@arco-design/web-react';
import { IconCheckCircleFill, IconExclamationCircleFill, IconClockCircle } from '@arco-design/web-react/icon';
import type { Contract } from '../types';
import { computePlanStatusRows, getActiveBlockersForPeriod, getPaymentPeriodLabel } from '../paymentUtils';
import { collectionAmountForPeriod } from '@/services/collectionMutations';
import { BLOCKER_TYPE_LABELS } from '../types';

const TimelineItem = Timeline.Item;

interface Props {
  contract: Contract;
}

export function PaymentTimeline({ contract }: Props) {
  const plans = contract.current.paymentPlans ?? [];
  const planStatusRows = computePlanStatusRows(contract);

  return (
    <Timeline>
      {/* 签约 */}
      <TimelineItem
        dot={<IconCheckCircleFill style={{ color: 'var(--brand-500)' }} />}
        label={contract.current.signDate}
      >
        签约 · ¥{(contract.current.totalAmount / 10000).toFixed(1)}万
      </TimelineItem>

      {/* 付款节点 */}
      {plans.map((plan) => {
        const planRow = planStatusRows.find((row) => row.plan.period === plan.period);
        const planCols = (contract.collectionRecords ?? []).filter((col) => (
          collectionAmountForPeriod(col, plan.period) > 0
        ));
        const planReceived = planRow?.allocated ?? 0;
        const isPaid = planReceived >= plan.amount;
        const expected = new Date(plan.expectedDate);
        const isOverdue = !isPaid && !Number.isNaN(expected.getTime())
          && new Date() > new Date(expected.getTime() + 7 * 86400000);
        const relatedBlockers = getActiveBlockersForPeriod(contract, plan.period);

        return (
          <TimelineItem
            key={plan.period}
            dot={
              isPaid ? (
                <IconCheckCircleFill style={{ color: 'var(--success-500)' }} />
              ) : isOverdue ? (
                <IconExclamationCircleFill style={{ color: 'var(--destructive-500)' }} />
              ) : (
                <IconClockCircle style={{ color: 'var(--warning-500)' }} />
              )
            }
            label={plan.expectedDate}
          >
            {plan.period === 1 ? '一期' : plan.period === 2 ? '二期' : plan.period === 3 ? '三期' : `${plan.period}期`}
            付款 ¥{plan.amount.toLocaleString()}（{plan.percentage}%）
            {isPaid && planCols.length > 0 && (
              <div style={{ color: 'var(--success-500)', fontSize: 12 }}>
                实际到账 ¥{planReceived.toLocaleString()}
              </div>
            )}
            {isOverdue && (
              <div style={{ color: 'var(--destructive-500)', fontSize: 12 }}>
                逾期 {Math.floor((Date.now() - new Date(plan.expectedDate).getTime()) / 86400000)} 天
              </div>
            )}
            {relatedBlockers.map(b => (
              <div key={b.id} style={{ color: 'var(--destructive-600)', fontSize: 12, marginTop: 2 }}>
                卡点：{getPaymentPeriodLabel(contract, b.paymentPeriod)} · {BLOCKER_TYPE_LABELS[b.type]}：{b.title}
              </div>
            ))}
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
