import { useState, useMemo } from 'react';
import { useContracts } from './ContractsContext';
import { useCollections } from '@/app/collections/CollectionContext';
import { withCollectionLedger } from '@/services/collectionMutations';
import { PaymentKanbanSummaryBar } from './components/PaymentKanbanSummaryBar';
import { PaymentKanbanBoard } from './components/PaymentKanbanBoard';
import { PaymentKanbanSideDrawer } from './components/PaymentKanbanSideDrawer';
import { computeKanbanSummary } from './paymentUtils';
import type { Contract } from './types';

export default function PaymentKanban() {
  const { contracts } = useContracts();
  const { collections } = useCollections();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const kanbanContracts = useMemo(
    () => contracts
      .filter(c => c.status !== 'voided' && c.status !== 'draft')
      .map(contract => withCollectionLedger(contract, collections)),
    [collections, contracts],
  );

  const summary = useMemo(() => computeKanbanSummary(kanbanContracts), [kanbanContracts]);

  const handleCardClick = (contract: Contract) => {
    setSelectedContract(contract);
    setDrawerVisible(true);
  };

  return (
    <div className="payment-lane-board">
      <div>
        <h2 className="payment-lane-board__title">回款合同泳道</h2>
        <p className="payment-lane-board__description">
          按正常、到期、逾期、阻塞和结清状态总览合同，点击卡片查看回款详情。
        </p>
      </div>

      <PaymentKanbanSummaryBar summary={summary} />

      <PaymentKanbanBoard
        contracts={kanbanContracts}
        onCardClick={handleCardClick}
      />

      <PaymentKanbanSideDrawer
        visible={drawerVisible}
        contract={selectedContract}
        onClose={() => setDrawerVisible(false)}
      />
    </div>
  );
}
