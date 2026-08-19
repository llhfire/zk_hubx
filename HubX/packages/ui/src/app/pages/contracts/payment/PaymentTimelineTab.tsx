import { Tag, Typography } from '@arco-design/web-react';
import { periodReceivedAmount, findNextPayPeriod } from './paymentCalc';
import type { Contract } from '../types';

const { Text } = Typography;

interface Props {
  contract: Contract;
}

export function PaymentTimelineTab({ contract }: Props) {
  const plans = contract.paymentPlans ?? [];
  const collections = contract.collectionRecords ?? [];
  const blockers = contract.paymentBlockers ?? [];

  return (
    <div style={{ padding: 'var(--space-4) 0' }}>
      {plans.map((plan, idx) => {
        const received = periodReceivedAmount(plan.periodNo, collections);
        const isSettled = received >= plan.amount;
        const isPending = !isSettled;
        const nextPeriod = findNextPayPeriod(plans, collections);
        const isCurrent = nextPeriod?.periodNo === plan.periodNo;
        const hasBlocker = isCurrent && blockers.some(b => !b.resolvedAt);
        const collRecord = collections.find(c => c.period === plan.periodNo);

        return (
          <div key={plan.periodNo} style={{
            display: 'flex',
            gap: 'var(--space-4)',
            padding: 'var(--space-4)',
            borderLeft: `2px solid ${isSettled ? 'var(--success-300)' : hasBlocker ? 'var(--destructive-300)' : 'var(--color-border-2)'}`,
            marginBottom: idx < plans.length - 1 ? 'var(--space-4)' : 0,
            position: 'relative',
          }}>
            {/* 时间线节点 */}
            <div style={{
              position: 'absolute',
              left: -6,
              top: 'var(--space-4)',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: isSettled ? 'var(--success-500)' : hasBlocker ? 'var(--destructive-500)' : 'var(--color-border-3)',
            }} />

            {/* 内容 */}
            <div style={{ flex: 1, marginLeft: 'var(--space-3)' }}>
              {/* 期次标题 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <Text style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                  [{plan.planName}] ¥{plan.amount.toLocaleString} ({contract.totalAmount > 0 ? Math.round(plan.amount / contract.totalAmount * 100) : 0}%)
                </Text>
                <Tag color={isSettled ? 'green' : hasBlocker ? 'red' : 'blue'} size="small">
                  {isSettled ? '已结清' : hasBlocker ? '阻塞中' : isCurrent ? '待收款' : '待触发'}
                </Tag>
              </div>

              {/* 计划/实际日期 */}
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)' }}>
                <div>计划到期日: {plan.expectedDate}</div>
                {isSettled && collRecord && (
                  <div style={{ color: 'var(--success-500)' }}>
                    实际到账: {collRecord.date} ({collRecord.method}) — 已结清
                  </div>
                )}
                {!isSettled && plan.expectedDate < '2026-08-19' && (
                  <div style={{ color: 'var(--destructive-500)' }}>
                    逾期 {Math.round((new Date('2026-08-19').getTime() - new Date(plan.expectedDate).getTime()) / 86400000)} 天
                  </div>
                )}
              </div>

              {/* 卡点信息 */}
              {hasBlocker && blockers.filter(b => !b.resolvedAt).map(b => (
                <div key={b.id} style={{
                  marginTop: 'var(--space-2)',
                  padding: 'var(--space-3)',
                  background: 'var(--destructive-50)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-sm)',
                }}>
                  <div style={{ color: 'var(--destructive-500)', fontWeight: 'var(--font-weight-medium)' }}>
                    🛑 当前卡点: [{b.type === 'acceptance_stuck' ? '验收卡住' : b.type}] {b.description}
                  </div>
                </div>
              ))}

              {/* 部分回款 */}
              {!isSettled && received > 0 && (
                <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--warning-500)' }}>
                  已部分回款: ¥{received.toLocaleString()} / ¥{plan.amount.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
