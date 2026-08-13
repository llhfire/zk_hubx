import { useState, useMemo } from 'react';
import { useContracts } from './ContractsContext';
import { PaymentKanbanSummaryBar } from './components/PaymentKanbanSummaryBar';
import { PaymentKanbanBoard } from './components/PaymentKanbanBoard';
import { PaymentKanbanSideDrawer } from './components/PaymentKanbanSideDrawer';
import { computeKanbanSummary } from './paymentUtils';
import type { Contract, PaymentStatus } from './types';

export default function PaymentKanban() {
  const { contracts } = useContracts();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const kanbanContracts = useMemo(
    () => contracts.filter(c => c.status !== 'voided' && c.status !== 'draft'),
    [contracts],
  );

  const summary = useMemo(() => computeKanbanSummary(kanbanContracts), [kanbanContracts]);

  const handleCardClick = (contract: Contract) => {
    setSelectedContract(contract);
    setDrawerVisible(true);
  };

  const handleCardDrop = (_contractId: string, _newStatus: PaymentStatus) => {
    // 拖拽切换列——后续版本可扩展为实际状态变更逻辑
  };

  return (
    <div style={{ padding: 0 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>合同回款看板</h2>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
          拖拽合同卡片切换回款状态，点击卡片查看回款详情
        </p>
      </div>

      <PaymentKanbanSummaryBar summary={summary} />

      <PaymentKanbanBoard
        contracts={kanbanContracts}
        onCardClick={handleCardClick}
        onCardDrop={handleCardDrop}
      />

      <PaymentKanbanSideDrawer
        visible={drawerVisible}
        contract={selectedContract}
        onClose={() => setDrawerVisible(false)}
      />
    </div>
  );
}
