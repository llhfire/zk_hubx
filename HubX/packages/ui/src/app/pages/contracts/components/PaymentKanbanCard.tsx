import { Card, Tag, Progress } from '@arco-design/web-react';
import { IconUser } from '@arco-design/web-react/icon';
import type { Contract, PaymentStatus } from '../types';
import { computePaymentStatus, getReceivedAmount, getLatestDunning } from '../paymentUtils';
import { BLOCKER_TYPE_LABELS } from '../types';

const STATUS_COLORS: Record<PaymentStatus, string> = {
  normal: 'var(--brand-500)',
  upcoming: 'var(--warning-500)',
  overdue: 'var(--destructive-500)',
  blocked: 'var(--destructive-600)',
  settled: 'var(--success-500)',
};

const STATUS_BORDER_COLORS: Record<PaymentStatus, string> = {
  normal: 'var(--brand-500)',
  upcoming: 'var(--warning-500)',
  overdue: 'var(--destructive-500)',
  blocked: 'var(--destructive-600)',
  settled: 'var(--success-500)',
};

interface Props {
  contract: Contract;
  onClick: (contract: Contract) => void;
}

export function PaymentKanbanCard({ contract, onClick }: Props) {
  const status = computePaymentStatus(contract);
  const total = contract.current.totalAmount;
  const received = getReceivedAmount(contract);
  const pct = total > 0 ? Math.round((received / total) * 100) : 0;
  const latestDunning = getLatestDunning(contract.dunningRecords ?? []);
  const activeBlockers = (contract.paymentBlockers ?? []).filter(b => !b.resolvedAt);

  const pendingPlan = contract.current.paymentPlans?.find((_plan, i) => {
    let acc = 0;
    for (let j = 0; j <= i; j++) acc += (contract.current.paymentPlans?.[j]?.amount ?? 0);
    return received < acc;
  });

  return (
    <Card
      size="small"
      hoverable
      onClick={() => onClick(contract)}
      style={{
        marginBottom: 12,
        borderLeft: `3px solid ${STATUS_BORDER_COLORS[status]}`,
        cursor: 'pointer',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
        {contract.contractNo}
      </div>
      <div style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 8 }}>
        {contract.current.customerName}
      </div>

      <div style={{ marginBottom: 8 }}>
        <Progress
          percent={pct}
          color={STATUS_COLORS[status]}
          size="small"
          showText={false}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
          <span style={{ color: STATUS_COLORS[status], fontWeight: 600 }}>
            ¥{(received / 10000).toFixed(1)}万 / ¥{(total / 10000).toFixed(1)}万
          </span>
          <span style={{ color: 'var(--grey-400)' }}>{pct}%</span>
        </div>
      </div>

      {pendingPlan && status !== 'settled' && (
        <div style={{ fontSize: 12, color: 'var(--grey-500)', marginBottom: 6 }}>
          下期：¥{(pendingPlan.amount / 10000).toFixed(1)}万  {pendingPlan.expectedDate}
        </div>
      )}

      {activeBlockers.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          {activeBlockers.map(b => (
            <Tag key={b.id} color="red" style={{ fontSize: 12, marginBottom: 2 }}>
              {BLOCKER_TYPE_LABELS[b.type]}
            </Tag>
          ))}
        </div>
      )}

      {latestDunning && (
        <div style={{ fontSize: 12, color: 'var(--grey-400)', marginBottom: 4 }}>
          上次催款：{latestDunning.date}  {latestDunning.method}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--grey-500)' }}>
        <IconUser style={{ fontSize: 12 }} />
        {contract.createdBy}
      </div>
    </Card>
  );
}
