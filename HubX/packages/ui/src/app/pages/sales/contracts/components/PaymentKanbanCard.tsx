
import type { CSSProperties } from 'react';
import { IconUser } from '@/design-system';
import type { Contract, PaymentStatus } from '../types';
import { computePaymentStatus, getReceivedAmount, getLatestDunning, getPaymentPeriodLabel } from '../paymentUtils';
import { BLOCKER_TYPE_LABELS } from '../types';
import {
  MoneyText,
  STATUS_TONE_VARS,
  StatusTag,
  type StatusMap,
  PaymentProgress,
  SectionCard,
} from '@/design-system';

const PAYMENT_STATUS: StatusMap<PaymentStatus> = {
  normal: { label: '正常', tone: 'info' },
  upcoming: { label: '即将到期', tone: 'warning' },
  overdue: { label: '已逾期', tone: 'danger' },
  blocked: { label: '卡点阻塞', tone: 'danger' },
  settled: { label: '已结清', tone: 'success' },
};

interface Props {
  contract: Contract;
  onClick: (contract: Contract) => void;
}

export function PaymentKanbanCard({ contract, onClick }: Props) {
  const status = computePaymentStatus(contract);
  const total = contract.current.totalAmount;
  const received = getReceivedAmount(contract);
  const latestDunning = getLatestDunning(contract.dunningRecords ?? []);
  const activeBlockers = (contract.paymentBlockers ?? []).filter(b => !b.resolvedAt);
  const statusMeta = PAYMENT_STATUS[status];
  const accent = STATUS_TONE_VARS[statusMeta.tone].fg;

  const pendingPlan = contract.current.paymentPlans?.find((_plan, i) => {
    let acc = 0;
    for (let j = 0; j <= i; j++) acc += (contract.current.paymentPlans?.[j]?.amount ?? 0);
    return received < acc;
  });

  return (
    <SectionCard
      size="small"
      className="payment-lane-card"
      hoverable
      onClick={() => onClick(contract)}
      style={{ '--card-accent': accent } as CSSProperties}
    >
      <div className="payment-lane-card__header">
        <div className="payment-lane-card__project-name" title={contract.current.contractName}>
          {contract.current.contractName || '未命名项目'}
        </div>
        <span className="payment-lane-card__status">{statusMeta.label}</span>
      </div>
      <div className="payment-lane-card__contract-meta">
        <span className="payment-lane-card__contract-no">合同编号 {contract.contractNo}</span>
        <span className="payment-lane-card__customer">{contract.current.customerName}</span>
      </div>

      <PaymentProgress
        className="payment-lane-card__progress"
        received={received}
        total={total}
        tone={statusMeta.tone}
        size="small"
      />

      {pendingPlan && status !== 'settled' && (
        <div className="payment-lane-card__next-payment">
          下期：<MoneyText value={pendingPlan.amount} /> {pendingPlan.expectedDate}
        </div>
      )}

      {activeBlockers.length > 0 && (
        <div className="payment-lane-card__blockers">
          {activeBlockers.map(b => (
            <StatusTag key={b.id} tone="danger" className="payment-lane-card__blocker">
              {getPaymentPeriodLabel(contract, b.paymentPeriod)} · {BLOCKER_TYPE_LABELS[b.type]}
            </StatusTag>
          ))}
        </div>
      )}

      {latestDunning && (
        <div className="payment-lane-card__dunning">
          上次催款：{latestDunning.date}  {latestDunning.method}
        </div>
      )}

      <div className="payment-lane-card__owner">
        <IconUser style={{ fontSize: 'var(--text-xs)' }} />
        {contract.createdBy}
      </div>
    </SectionCard>
  );
}
