import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { Contract, PaymentStatus } from '../types';
import { computePaymentStatus } from '../paymentUtils';
import { PaymentKanbanCard } from './PaymentKanbanCard';

const COLUMNS: { status: PaymentStatus; label: string; color: string; bg: string }[] = [
  { status: 'normal', label: '正常回款', color: 'var(--brand-500)', bg: 'var(--brand-50)' },
  { status: 'upcoming', label: '即将到期', color: 'var(--warning-500)', bg: 'var(--warning-50)' },
  { status: 'overdue', label: '已逾期', color: 'var(--destructive-500)', bg: 'var(--destructive-50)' },
  { status: 'blocked', label: '卡点阻塞', color: 'var(--destructive-600)', bg: 'var(--destructive-50)' },
  { status: 'settled', label: '已结清', color: 'var(--success-500)', bg: 'var(--success-50)' },
];

function KanbanColumn({
  status,
  label,
  color,
  bg,
  contracts,
  onCardClick,
}: {
  status: PaymentStatus;
  label: string;
  color: string;
  bg: string;
  contracts: Contract[];
  onCardClick: (c: Contract) => void;
}) {
  return (
    <div
      className="payment-lane-column"
      style={{ '--lane-accent': color, '--lane-surface': bg } as CSSProperties}
    >
      <div className="payment-lane-column__header">
        <span className="payment-lane-column__label">{label}</span>
        <span className="payment-lane-column__count">
          {contracts.length}
        </span>
      </div>
      <div className="payment-lane-column__body">
        {contracts.map((c) => (
          <PaymentKanbanCard key={c.id} contract={c} onClick={onCardClick} />
        ))}
        {contracts.length === 0 && (
          <div className="payment-lane-column__empty">
            暂无合同
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  contracts: Contract[];
  onCardClick: (contract: Contract) => void;
}

export function PaymentKanbanBoard({ contracts, onCardClick }: Props) {
  const grouped = useMemo(() => {
    const map: Record<PaymentStatus, Contract[]> = {
      normal: [],
      upcoming: [],
      overdue: [],
      blocked: [],
      settled: [],
    };
    contracts.forEach((c) => {
      if (c.status === 'voided') return;
      const status = computePaymentStatus(c);
      map[status].push(c);
    });
    return map;
  }, [contracts]);

  return (
    <div className="payment-lane-grid">
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.status}
          status={col.status}
          label={col.label}
          color={col.color}
          bg={col.bg}
          contracts={grouped[col.status]}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
}
