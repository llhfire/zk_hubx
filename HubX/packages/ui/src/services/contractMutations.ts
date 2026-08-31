// 合同域「状态变更」共享纯函数：mock 与 http 两个 service 复用同一套业务逻辑。
// 每个 applyXxx 接收当前合同 + 参数，返回变更后的合同（不含 updatedAt，由外层统一加）。

import { getContractApprovalRounds } from '@/app/pages/contracts/contractHistory';
import { renderContractDocument } from '@/app/pages/contracts/templates';
import { canTransitionTo, generateContractNo, getNextVersionNo } from '@/app/pages/contracts/utils';
import { getContractNumberPrefix } from '@/app/pages/company-entity/companyEntityData';
import type {
  ApprovalNode,
  CollectionRecord,
  Contract,
  ContractApprovalRound,
  ContractFormData,
  ContractVersionAttachment,
  DunningRecord,
  PaymentBlocker,
  ScanArchiveEntry,
  UploadedWordContract,
  WizardInput,
} from '@/app/pages/contracts/types';

const DEFAULT_APPROVERS: Record<ApprovalNode['step'], string> = {
  发起申请: '张三',
  商务审核: '王经理 - 商务主管',
  财务审核: '陈财务 - 财务总监',
  法务审核: '赵律师 - 法务部',
  总经理审批: '赵总 - 总经理',
};

export function createInitialApprovalFlow(mode: 'standard' | 'general-manager' = 'general-manager'): ApprovalNode[] {
  const steps: ApprovalNode['step'][] = mode === 'general-manager'
    ? ['发起申请', '总经理审批']
    : ['发起申请', '商务审核', '财务审核', '法务审核'];
  return steps.map((step) => ({ step, approver: DEFAULT_APPROVERS[step], status: 'pending', time: '', comment: '' }));
}

export function nowString(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function buildApprovalRound(contract: Contract, versionNo: string, flow: ApprovalNode[], submittedAt: string): ContractApprovalRound {
  const roundNo = getContractApprovalRounds(contract).reduce((m, r) => Math.max(m, r.roundNo), 0) + 1;
  return {
    id: `${contract.id}-approval-round-${roundNo}-${Date.now()}`,
    roundNo,
    versionNo,
    status: 'approving',
    submittedAt,
    submittedBy: flow[0]?.approver || '张三',
    updatedAt: submittedAt,
    nodes: flow.map((node) => ({ ...node })),
  };
}

function withdrawLatestApprovingRound(c: Contract): Contract {
  const rounds = getContractApprovalRounds(c).map((round, i, arr) =>
    i === arr.length - 1 && round.status === 'approving'
      ? { ...round, status: 'withdrawn' as const, updatedAt: nowString() }
      : round,
  );
  return { ...c, approvalRounds: rounds };
}

export function nextContractNo(signingEntity: string, seq: number): string {
  const prefix = getContractNumberPrefix(signingEntity);
  return generateContractNo(new Date(), seq, prefix);
}

export function applyCreateFromWizard(input: WizardInput, id: string, contractNo: string, now: string): Contract {
  const formData = { ...input.formData, contractNo };
  if (input.kind === 'supplement') {
    if (!input.parentContractId) throw new Error('补充合同必须关联主合同');
    if (!input.sourceQuoteId) throw new Error('补充合同必须来源于已确认的补充报价');
    if (!formData.totalAmount) throw new Error('补充合同变更金额不能为 0');
  }
  return {
    id,
    contractNo,
    status: 'draft',
    kind: input.kind ?? 'main',
    parentContractId: input.parentContractId,
    sourceQuoteId: input.sourceQuoteId,
    leadId: input.leadId,
    quoteId: input.quoteId,
    projectId: input.projectId,
    customerId: input.customerId,
    customerSnapshot: input.customerSnapshot,
    current: formData,
    versionHistory: [{ versionNo: 'V1', formData, renderedHtml: renderContractDocument(formData), label: '首次保存草稿', createdAt: now, createdBy: '张三' }],
    approvalFlow: createInitialApprovalFlow(),
    approvalRounds: [],
    archivedScans: [],
    createdAt: now,
    createdBy: '张三',
    updatedAt: now,
  };
}

export function applySaveDraft(c: Contract, formData: ContractFormData, reallocatedNo: string | null): Contract {
  const contractNo = c.status === 'draft' && c.current.signingEntity !== formData.signingEntity
    ? (reallocatedNo ?? c.contractNo)
    : c.contractNo;
  return {
    ...c,
    contractNo,
    current: { ...formData, contractNo },
  };
}

export function applySaveAsVersion(c: Contract, formData: ContractFormData, label: string): Contract {
  if (c.status === 'voided') return c;
  const now = nowString();
  const versionNo = getNextVersionNo(c.versionHistory.map((v) => v.versionNo));
  const next = withdrawLatestApprovingRound(c);
  return {
    ...next,
    status: 'draft',
    current: formData,
    versionHistory: [...c.versionHistory, { versionNo, formData, renderedHtml: renderContractDocument(formData), label: label || '手动保存', createdAt: now, createdBy: '张三' }],
    approvalFlow: c.status === 'approving' ? createInitialApprovalFlow() : c.approvalFlow,
  };
}

export function applySaveDocumentPreviewVersion(c: Contract, input: { formData: ContractFormData; projectId?: string; createNewVersion?: boolean; changeSummary: string; attachment: ContractVersionAttachment }): Contract {
  if (c.status !== 'draft') return c;
  const now = nowString();
  const { formData, projectId, createNewVersion = false, changeSummary, attachment } = input;
  const versionData = { formData, renderedHtml: renderContractDocument(formData), label: '合同预览提交', changeSummary: changeSummary.trim(), attachments: [attachment], createdAt: now, createdBy: '张三' };
  const isInitial = c.versionHistory.length === 1 && c.versionHistory[0].versionNo === 'V1';
  const versionHistory = isInitial && !createNewVersion
    ? [{ ...c.versionHistory[0], ...versionData }]
    : [...c.versionHistory, { versionNo: getNextVersionNo(c.versionHistory.map((v) => v.versionNo)), ...versionData }];
  return { ...c, projectId: projectId ?? c.projectId, current: formData, versionHistory };
}

export function applySaveVersionWithDetails(c: Contract, input: { formData: ContractFormData; label: string; changeTypes: string[]; changeSummary: string; attachments: ContractVersionAttachment[] }): Contract {
  if (c.status === 'voided') return c;
  const now = nowString();
  const versionNo = getNextVersionNo(c.versionHistory.map((v) => v.versionNo));
  const next = withdrawLatestApprovingRound(c);
  return {
    ...next,
    status: 'draft',
    current: input.formData,
    versionHistory: [...c.versionHistory, {
      versionNo, formData: input.formData, renderedHtml: renderContractDocument(input.formData),
      label: input.label || '合同内容修改', createdAt: now, createdBy: '张三',
      changeTypes: input.changeTypes, changeSummary: input.changeSummary, attachments: input.attachments,
    }],
    approvalFlow: c.status === 'approving' ? createInitialApprovalFlow() : c.approvalFlow,
  };
}

export function applySubmitForApproval(c: Contract, formData: ContractFormData): Contract {
  if (!canTransitionTo(c.status, 'approving') && c.status !== 'draft') return c;
  const now = nowString();
  const versionNo = getNextVersionNo(c.versionHistory.map((v) => v.versionNo));
  const approvalRounds = getContractApprovalRounds(c);
  const isResubmit = approvalRounds.some((r) => r.status === 'rejected');
  const flow = createInitialApprovalFlow();
  flow[0] = { ...flow[0], status: 'approved', time: now, comment: '提交合同审批' };
  return {
    ...c,
    status: 'approving',
    current: formData,
    versionHistory: [...c.versionHistory, { versionNo, formData, renderedHtml: renderContractDocument(formData), label: isResubmit ? '驳回后再次提交' : '提交审批前自动保存', createdAt: now, createdBy: '张三' }],
    approvalFlow: flow,
    approvalRounds: [...approvalRounds, buildApprovalRound(c, versionNo, flow, now)],
  };
}

export function applySubmitLatestVersionForApproval(c: Contract, note = ''): Contract {
  if (c.status === 'voided') return c;
  const latest = c.versionHistory[c.versionHistory.length - 1];
  if (!latest || latest.versionNo === c.approvedVersionNo) return c;
  const approvalRounds = getContractApprovalRounds(c);
  if (approvalRounds[approvalRounds.length - 1]?.status === 'approving') return c;
  const now = nowString();
  const flow = createInitialApprovalFlow();
  flow[0] = { ...flow[0], status: 'approved', time: now, comment: note.trim() || '提交合同审批' };
  return { ...c, status: 'approving', approvalFlow: flow, approvalRounds: [...approvalRounds, buildApprovalRound(c, latest.versionNo, flow, now)] };
}

export function applySubmitVersionForApproval(c: Contract, versionNo: string, note = '', approvalMode: 'standard' | 'general-manager' = 'general-manager'): Contract {
  if (c.status === 'voided' || versionNo === c.approvedVersionNo) return c;
  const version = c.versionHistory.find((v) => v.versionNo === versionNo);
  if (!version) return c;
  const approvalRounds = getContractApprovalRounds(c);
  if (approvalRounds.some((r) => r.status === 'approving')) return c;
  const now = nowString();
  const flow = createInitialApprovalFlow(approvalMode);
  flow[0] = { ...flow[0], status: 'approved', time: now, comment: note.trim() || '提交合同审批' };
  return { ...c, status: 'approving', approvalFlow: flow, approvalRounds: [...approvalRounds, buildApprovalRound(c, version.versionNo, flow, now)] };
}

export function applyWithdrawApproval(c: Contract): Contract {
  if (c.status !== 'approving') return c;
  return { ...withdrawLatestApprovingRound(c), status: 'draft', approvalFlow: createInitialApprovalFlow() };
}

export function applyApproveStep(c: Contract, stepIndex: number, comment = '同意'): Contract {
  const now = nowString();
  const flow = c.approvalFlow.map((n, i) => (i === stepIndex ? { ...n, status: 'approved' as const, time: now, comment } : n));
  const allApproved = flow.every((n) => n.status === 'approved');
  const approvalRounds = getContractApprovalRounds(c);
  const latestRound = approvalRounds[approvalRounds.length - 1];
  const updatedRounds = approvalRounds.map((round, i) => (i === approvalRounds.length - 1 ? { ...round, status: allApproved ? 'approved' as const : 'approving' as const, updatedAt: now, nodes: flow.map((node) => ({ ...node })) } : round));
  if (allApproved && canTransitionTo(c.status, 'pending_mail')) {
    const lastVersion = c.versionHistory[c.versionHistory.length - 1];
    return { ...c, approvalFlow: flow, approvalRounds: updatedRounds, status: 'pending_mail', approvedVersionNo: latestRound?.versionNo || lastVersion?.versionNo, approvedAt: now };
  }
  return { ...c, approvalFlow: flow, approvalRounds: updatedRounds };
}

export function applyRejectStep(c: Contract, stepIndex: number, comment: string): Contract {
  if (c.status !== 'approving') return c;
  const now = nowString();
  const flow = c.approvalFlow.map((n, i) => (i === stepIndex ? { ...n, status: 'rejected' as const, time: now, comment } : n));
  const approvalRounds = getContractApprovalRounds(c).map((round, i, arr) => (i === arr.length - 1 ? { ...round, status: 'rejected' as const, updatedAt: now, nodes: flow.map((node) => ({ ...node })) } : round));
  return { ...c, approvalFlow: flow, approvalRounds, status: 'draft' };
}

export function applyMarkMailed(c: Contract): Contract {
  if (!canTransitionTo(c.status, 'pending_return')) return c;
  return { ...c, status: 'pending_return', mailedAt: nowString() };
}

export function applyUploadScan(c: Contract, entry: ScanArchiveEntry, isFirstArchive: boolean): Contract {
  return {
    ...c,
    archivedScans: [...c.archivedScans.map((s) => ({ ...s, isPrimary: false })), entry],
    status: isFirstArchive ? 'archived' : c.status,
  };
}

export function applyArchiveFinalContract(c: Contract, entry: ScanArchiveEntry): Contract {
  return { ...c, archivedScans: [...c.archivedScans.map((s) => ({ ...s, isPrimary: false })), entry] };
}

export function applyUploadWordContract(c: Contract, file: Omit<UploadedWordContract, 'uploadedAt' | 'uploadedBy'>): Contract {
  if (c.uploadedWordContract?.blobUrl) URL.revokeObjectURL(c.uploadedWordContract.blobUrl);
  return { ...c, uploadedWordContract: { ...file, uploadedAt: nowString(), uploadedBy: '当前用户' } };
}

export function applySetPrimaryScan(c: Contract, entryId: string): Contract {
  return { ...c, archivedScans: c.archivedScans.map((s) => ({ ...s, isPrimary: s.id === entryId })) };
}

export function applyVoidContract(c: Contract, reason: string): Contract {
  if (!canTransitionTo(c.status, 'voided')) return c;
  return { ...c, status: 'voided', current: { ...c.current, contractContent: c.current.contractContent + `\n\n[作废原因] ${reason}` } };
}

export function applyAddCollection(
  c: Contract,
  record: Omit<CollectionRecord, 'id' | 'contractId'> & { id?: string },
  contractId: string,
): Contract {
  const id = record.id ?? `col-${Date.now()}`;
  const current = c.collectionRecords ?? [];
  // 双写和补偿重试必须沿用同一流水 ID；已存在时按 INSERT OR IGNORE 处理。
  if (current.some((item) => item.id === id)) return c;
  const records = [...current, { ...record, id, contractId }];
  return { ...c, collectionRecords: records, receivedAmount: records.reduce((s, r) => s + r.amount, 0) };
}

export function applyAddBlocker(c: Contract, blocker: Omit<PaymentBlocker, 'id' | 'contractId' | 'createdAt'>, contractId: string): Contract {
  return { ...c, paymentBlockers: [...(c.paymentBlockers ?? []), { ...blocker, id: `blocker-${Date.now()}`, contractId, createdAt: nowString() }] };
}

export function applyResolveBlocker(c: Contract, blockerId: string): Contract {
  return { ...c, paymentBlockers: (c.paymentBlockers ?? []).map((b) => (b.id === blockerId ? { ...b, resolvedAt: nowString(), resolvedBy: '当前用户' } : b)) };
}

export function applyAddDunning(c: Contract, record: Omit<DunningRecord, 'id' | 'contractId'>, contractId: string): Contract {
  return { ...c, dunningRecords: [...(c.dunningRecords ?? []), { ...record, id: `dun-${Date.now()}`, contractId }] };
}
