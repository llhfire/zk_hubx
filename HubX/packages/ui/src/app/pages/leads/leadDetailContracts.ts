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

// ─── U4：线索侧合同/回款入口纯函数 ──────────────────────

/** 过滤该线索全部合同，排序：主合同优先、草稿在前、作废沉底 */
export function pickLeadContracts(contracts: Contract[], leadId: string): Contract[] {
  return contracts
    .filter((c) => c.leadId === leadId)
    .sort((a, b) => {
      // 主合同优先
      const aMain = a.kind === 'main' || a.kind === undefined ? 0 : 1;
      const bMain = b.kind === 'main' || b.kind === undefined ? 0 : 1;
      if (aMain !== bMain) return aMain - bMain;
      // 作废沉底
      if (a.status === 'voided' && b.status !== 'voided') return 1;
      if (a.status !== 'voided' && b.status === 'voided') return -1;
      // 草稿/approving 在前
      const statusOrder: Record<string, number> = { draft: 0, approving: 1, archived: 2, voided: 3 };
      return (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
    });
}

export type LeadContractViewState = 'empty' | 'draft-only' | 'approved';

/** 驱动回款 Tab 空态与登记跳转 */
export function leadContractViewState(contracts: Contract[]): LeadContractViewState {
  if (contracts.length === 0) return 'empty';
  const hasApproved = contracts.some((c) => c.status === 'archived' || c.approvedAt);
  return hasApproved ? 'approved' : 'draft-only';
}
