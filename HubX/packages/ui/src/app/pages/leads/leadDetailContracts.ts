import type { Contract, ContractStatus } from '../contracts/types';
import { CONTRACT_STATUS_COLOR, CONTRACT_STATUS_LABEL } from '../contracts/utils';
import type { LeadDemoContract } from './leadDetailProfiles';

export interface LeadContractCard extends LeadDemoContract {
  contractStatus?: ContractStatus;
  statusColor?: string;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US');
}

export function mapContractToLeadCard(contract: Contract): LeadContractCard {
  const statusLabel = contract.executionStatus ?? CONTRACT_STATUS_LABEL[contract.status];

  return {
    id: contract.id,
    name: contract.current.contractName,
    contractNo: contract.contractNo,
    startDate: contract.current.effectiveDate,
    signDate: contract.current.signDate,
    contractEntity: contract.current.signingEntity,
    signingEntity: contract.current.customerName,
    amount: formatAmount(contract.current.totalAmount),
    receivedAmount: formatAmount(contract.receivedAmount ?? 0),
    paymentMethod: contract.current.paymentMethod,
    totalCost: '-',
    signer: contract.current.customerContact,
    contactPhone: contract.current.customerPhone,
    status: statusLabel,
    createTime: contract.createdAt,
    contractStatus: contract.status,
    statusColor: CONTRACT_STATUS_COLOR[contract.status],
  };
}
