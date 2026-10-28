import {
  CountdownTag,
  DateText,
  IconCheckCircleFill,
  IconClockCircle,
  IconExclamationCircleFill,
  MoneyText,
  STATUS_TONE_VARS,
  StatusTag,
  Timeline,
  Typography,
} from '@/design-system';
import type { Contract } from '../types';
import { computePlanStatusRows, getActiveBlockersForPeriod, getPaymentPeriodLabel } from '../paymentUtils';
import { collectionAmountForPeriod } from '../../../../../services/collectionMutations';
import { BLOCKER_TYPE_LABELS } from '../types';

const TimelineItem = Timeline.Item;
const { Text } = Typography;

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
        dot={<IconCheckCircleFill style={{ color: STATUS_TONE_VARS.info.fg }} />}
        label={<DateText value={contract.current.signDate} />}
      >
        签约 · <MoneyText value={contract.current.totalAmount} /> <StatusTag tone="info">已签约</StatusTag>
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
        const overdueDays = Math.floor((Date.now() - new Date(plan.expectedDate).getTime()) / 86400000);
        const status = isPaid
          ? { label: '已到账', tone: 'success' as const }
          : isOverdue
            ? { label: '已逾期', tone: 'danger' as const }
            : { label: '待回款', tone: 'warning' as const };

        return (
          <TimelineItem
            key={plan.period}
            dot={
              isPaid ? (
                <IconCheckCircleFill style={{ color: STATUS_TONE_VARS.success.fg }} />
              ) : isOverdue ? (
                <IconExclamationCircleFill style={{ color: STATUS_TONE_VARS.danger.fg }} />
              ) : (
                <IconClockCircle style={{ color: STATUS_TONE_VARS.warning.fg }} />
              )
            }
            label={<DateText value={plan.expectedDate} />}
          >
            {plan.period === 1 ? '一期' : plan.period === 2 ? '二期' : plan.period === 3 ? '三期' : `${plan.period}期`}
            付款 <MoneyText value={plan.amount} />（{plan.percentage}%） <StatusTag tone={status.tone}>{status.label}</StatusTag>
            {isPaid && planCols.length > 0 && (
              <Text type="secondary">
                实际到账 <MoneyText value={planReceived} tone="success" />
              </Text>
            )}
            {isOverdue && (
              <Text type="secondary">
                <CountdownTag days={-Math.abs(overdueDays)} />
              </Text>
            )}
            {relatedBlockers.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <StatusTag tone="danger">卡点</StatusTag>
                <Text type="secondary">
                  {getPaymentPeriodLabel(contract, b.paymentPeriod)} · {BLOCKER_TYPE_LABELS[b.type]}：{b.title}
                </Text>
              </div>
            ))}
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
