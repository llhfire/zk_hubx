import { Card, Tag, Progress } from '@arco-design/web-react';
import type { CSSProperties } from 'react';
import { IconUser } from '@arco-design/web-react/icon';
import type { Contract, PaymentStatus } from '../types';
import { computePaymentStatus, getReceivedAmount, getLatestDunning, getPaymentPeriodLabel } from '../paymentUtils';
import { BLOCKER_TYPE_LABELS } from '../types';

const STATUS_COLORS: Record<PaymentStatus, string> = {
  normal: 'var(--brand-500)',
  upcoming: 'var(--warning-500)',
  overdue: 'var(--destructive-500)',
  blocked: 'var(--destructive-600)',
  settled: 'var(--success-500)',
};

const STATUS_ACCENTS: Record<PaymentStatus, string> = {
  normal: 'var(--brand-500)',
  upcoming: 'var(--warning-500)',
  overdue: 'var(--destructive-500)',
  blocked: 'var(--destructive-600)',
  settled: 'var(--success-500)',
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  normal: '正常',
  upcoming: '即将到期',
  overdue: '已逾期',
  blocked: '卡点阻塞',
  settled: '已结清',
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
      className="payment-lane-card"
      hoverable
      onClick={() => onClick(contract)}
      style={{ '--card-accent': STATUS_ACCENTS[status] } as CSSProperties}
    >
      <div className="payment-lane-card__header">
        <div className="payment-lane-card__project-name" title={contract.current.contractName}>
          {contract.current.contractName || '未命名项目'}
        </div>
        <span className="payment-lane-card__status">{STATUS_LABELS[status]}</span>
      </div>
      <div className="payment-lane-card__contract-meta">
        <span className="payment-lane-card__contract-no">合同编号 {contract.contractNo}</span>
        <span className="payment-lane-card__customer">{contract.current.customerName}</span>
      </div>

      <div className="payment-lane-card__progress">
        <Progress
          percent={pct}
          color={STATUS_COLORS[status]}
          size="small"
          showText={false}
        />
        <div className="payment-lane-card__progress-meta">
          <span style={{ color: STATUS_COLORS[status], fontWeight: 600 }}>
            ¥{received.toLocaleString()} / ¥{total.toLocaleString()}
          </span>
          <span style={{ color: 'var(--grey-400)' }}>{pct}%</span>
        </div>
      </div>

      {pendingPlan && status !== 'settled' && (
        <div className="payment-lane-card__next-payment">
          下期：¥{pendingPlan.amount.toLocaleString()}  {pendingPlan.expectedDate}
        </div>
      )}

      {activeBlockers.length > 0 && (
        <div className="payment-lane-card__blockers">
          {activeBlockers.map(b => (
            <Tag key={b.id} color="red" className="payment-lane-card__blocker">
              {getPaymentPeriodLabel(contract, b.paymentPeriod)} · {BLOCKER_TYPE_LABELS[b.type]}
            </Tag>
          ))}
        </div>
      )}

      {latestDunning && (
        <div className="payment-lane-card__dunning">
          上次催款：{latestDunning.date}  {latestDunning.method}
        </div>
      )}

      <div className="payment-lane-card__owner">
        <IconUser style={{ fontSize: 12 }} />
        {contract.createdBy}
      </div>
    </Card>
  );
}
