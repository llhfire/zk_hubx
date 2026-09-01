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
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  const kanbanContracts = useMemo(() => {
    const hasRecoveryBoard = contracts.some((contract) => contract.dataSource === 'recovery-board');
    return contracts
      .filter(c => c.status !== 'voided' && c.status !== 'draft')
      .filter(c => !hasRecoveryBoard || c.dataSource === 'recovery-board')
      .map(contract => withCollectionLedger(contract, collections));
  }, [collections, contracts]);

  const summary = useMemo(() => computeKanbanSummary(kanbanContracts), [kanbanContracts]);
  const selectedContract = useMemo(
    () => kanbanContracts.find((contract) => contract.id === selectedContractId) ?? null,
    [kanbanContracts, selectedContractId],
  );

  const handleCardClick = (contract: Contract) => {
    setSelectedContractId(contract.id);
    setDrawerVisible(true);
  };

  return (
    <div className="payment-lane-board">
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
