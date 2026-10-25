import type {
  ApprovalNode,
  Contract,
  ContractApprovalRound,
  ContractApprovalRoundStatus,
  ContractVersion,
} from './types';

export type ContractHistoryEvent =
  | {
      id: string;
      kind: 'version';
      time: string;
      version: ContractVersion;
    }
  | {
      id: string;
      kind: 'approval';
      time: string;
      round: ContractApprovalRound;
    };

function getLatestTime(values: string[], fallback: string) {
  const validValues = values.filter(Boolean);
  if (validValues.length === 0) return fallback;
  return validValues.sort((left, right) => right.localeCompare(left))[0];
}

function getRoundStatus(nodes: ApprovalNode[]): ContractApprovalRoundStatus {
  if (nodes.some(node => node.status === 'rejected')) return 'rejected';
  if (nodes.length > 0 && nodes.every(node => node.status === 'approved')) return 'approved';
  return 'approving';
}

export function getContractApprovalRounds(contract: Contract): ContractApprovalRound[] {
  if (contract.approvalRounds?.length) {
    return [...contract.approvalRounds].sort((left, right) => left.roundNo - right.roundNo);
  }

  const hasProcessedNode = contract.approvalFlow.some(
    node => node.status !== 'pending' || Boolean(node.time),
  );
  if (!hasProcessedNode) return [];

  const latestVersion = contract.versionHistory[contract.versionHistory.length - 1];
  const submittedAt = contract.approvalFlow.find(node => node.step === '发起申请')?.time
    || latestVersion?.createdAt
    || contract.createdAt;

  return [{
    id: `${contract.id}-approval-round-1`,
    roundNo: 1,
    versionNo: contract.approvedVersionNo || latestVersion?.versionNo || 'V1',
    status: getRoundStatus(contract.approvalFlow),
    submittedAt,
    submittedBy: contract.approvalFlow.find(node => node.step === '发起申请')?.approver
      || contract.createdBy,
    updatedAt: getLatestTime(
      contract.approvalFlow.map(node => node.time),
      submittedAt,
    ),
    nodes: contract.approvalFlow.map(node => ({ ...node })),
  }];
}

export function getLatestApprovalRound(contract: Contract) {
  const rounds = getContractApprovalRounds(contract);
  return rounds[rounds.length - 1];
}

export function buildContractHistoryEvents(contract: Contract): ContractHistoryEvent[] {
  const versionEvents: ContractHistoryEvent[] = contract.versionHistory.map(version => ({
    id: `${contract.id}-version-${version.versionNo}`,
    kind: 'version',
    time: version.createdAt,
    version,
  }));
  const approvalEvents: ContractHistoryEvent[] = getContractApprovalRounds(contract).map(round => ({
    id: round.id,
    kind: 'approval',
    time: round.updatedAt || round.submittedAt,
    round,
  }));

  return [...versionEvents, ...approvalEvents].sort((left, right) => {
    const timeComparison = right.time.localeCompare(left.time);
    if (timeComparison !== 0) return timeComparison;
    return right.id.localeCompare(left.id);
  });
}
