import { useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { Contract, PaymentStatus } from '../types';
import { computePaymentStatus } from '../paymentUtils';
import { PaymentKanbanCard } from './PaymentKanbanCard';

const COLUMNS: { status: PaymentStatus; label: string; color: string; bg: string }[] = [
  { status: 'normal', label: '正常回款', color: '#3b82f6', bg: '#eff6ff' },
  { status: 'upcoming', label: '即将到期', color: '#f59e0b', bg: '#fffbeb' },
  { status: 'overdue', label: '已逾期', color: '#ef4444', bg: '#fef2f2' },
  { status: 'blocked', label: '卡点阻塞', color: '#dc2626', bg: '#fef2f2' },
  { status: 'settled', label: '已结清', color: '#10b981', bg: '#f0fdf4' },
];

function DraggableCard({ contract, onClick }: { contract: Contract; onClick: (c: Contract) => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'CONTRACT_CARD',
    item: { id: contract.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <PaymentKanbanCard contract={contract} onClick={onClick} />
    </div>
  );
}

function KanbanColumn({
  status,
  label,
  color,
  bg,
  contracts,
  onCardClick,
  onDrop,
}: {
  status: PaymentStatus;
  label: string;
  color: string;
  bg: string;
  contracts: Contract[];
  onCardClick: (c: Contract) => void;
  onDrop: (contractId: string) => void;
}) {
  const [, drop] = useDrop(() => ({
    accept: 'CONTRACT_CARD',
    drop: (item: { id: string }) => onDrop(item.id),
  }));

  return (
    <div
      ref={drop}
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
          fontSize: 13,
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
          fontSize: 11,
        }}>
          {contracts.length}
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {contracts.map((c) => (
          <DraggableCard key={c.id} contract={c} onClick={onCardClick} />
        ))}
        {contracts.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 24 }}>
            拖拽合同到此列
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  contracts: Contract[];
  onCardClick: (contract: Contract) => void;
  onCardDrop: (contractId: string, newStatus: PaymentStatus) => void;
}

export function PaymentKanbanBoard({ contracts, onCardClick, onCardDrop }: Props) {
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
    <DndProvider backend={HTML5Backend}>
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
            onDrop={(contractId) => onCardDrop(contractId, col.status)}
          />
        ))}
      </div>
    </DndProvider>
  );
}
