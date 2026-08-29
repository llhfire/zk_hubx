import { useMemo } from 'react';
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
      style={{
        flex: 1,
        minWidth: 220,
        maxWidth: 300,
        background: bg,
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: 14,
          color,
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: `2px solid ${color}`,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{label}</span>
        <span style={{
          background: color,
          color: '#fff',
          borderRadius: 10,
          padding: '0 8px',
          fontSize: 12,
        }}>
          {contracts.length}
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {contracts.map((c) => (
          <PaymentKanbanCard key={c.id} contract={c} onClick={onCardClick} />
        ))}
        {contracts.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--grey-400)', fontSize: 12, padding: 24 }}>
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
    <div style={{ display: 'flex', gap: 12, overflow: 'auto', paddingBottom: 16 }}>
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
