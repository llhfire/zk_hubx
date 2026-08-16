// 合同域数据访问服务（数据接缝，与报价域 quotationService 同模式）。
// UI 只依赖本接口；α版注入 mock，β版注入 http（后续接 /api/contracts）。
// 业务逻辑（状态机/版本/审批/扫描/回款）抽在这里，mock 与 http 共用口径。

import { buildInitialContracts } from '@/app/pages/contracts/mockData';
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
  ScanFile,
  UploadedWordContract,
  WizardInput,
} from '@/app/pages/contracts/types';

export interface ContractService {
  list(): Promise<Contract[]>;
  getById(id: string | undefined): Promise<Contract | undefined>;
  getNextContractNo(signingEntity: string): string;
  createFromWizard(input: WizardInput): Promise<Contract>;
  saveDraft(id: string, formData: ContractFormData): Promise<void>;
  saveAsVersion(id: string, formData: ContractFormData, label: string): Promise<void>;
  saveDocumentPreviewVersion(id: string, input: { formData: ContractFormData; projectId?: string; createNewVersion?: boolean; changeSummary: string; attachment: ContractVersionAttachment }): Promise<void>;
  saveVersionWithDetails(id: string, input: { formData: ContractFormData; label: string; changeTypes: string[]; changeSummary: string; attachments: ContractVersionAttachment[] }): Promise<void>;
  submitForApproval(id: string, formData: ContractFormData): Promise<void>;
  submitLatestVersionForApproval(id: string, note?: string): Promise<void>;
  submitVersionForApproval(id: string, versionNo: string, note?: string, approvalMode?: 'standard' | 'general-manager'): Promise<void>;
  withdrawApproval(id: string): Promise<void>;
  approveStep(id: string, stepIndex: number, comment?: string): Promise<void>;
  rejectStep(id: string, stepIndex: number, comment: string): Promise<void>;
  markMailed(id: string): Promise<void>;
  uploadScan(id: string, files: ScanFile[], note?: string): Promise<ScanArchiveEntry | null>;
  archiveFinalContract(id: string, files: ScanFile[], note?: string): Promise<ScanArchiveEntry | null>;
  uploadWordContract(id: string, file: Omit<UploadedWordContract, 'uploadedAt' | 'uploadedBy'>): Promise<void>;
  setPrimaryScan(id: string, entryId: string): Promise<void>;
  voidContract(id: string, reason: string): Promise<void>;
  addCollection(contractId: string, record: Omit<CollectionRecord, 'id' | 'contractId'>): Promise<void>;
  addBlocker(contractId: string, blocker: Omit<PaymentBlocker, 'id' | 'contractId' | 'createdAt'>): Promise<void>;
  resolveBlocker(contractId: string, blockerId: string): Promise<void>;
  addDunning(contractId: string, record: Omit<DunningRecord, 'id' | 'contractId'>): Promise<void>;
}

const DEFAULT_APPROVERS: Record<ApprovalNode['step'], string> = {
  发起申请: '张三',
  商务审核: '王经理 - 商务主管',
  财务审核: '陈财务 - 财务总监',
  法务审核: '赵律师 - 法务部',
  总经理审批: '赵总 - 总经理',
};

export function createInitialApprovalFlow(mode: 'standard' | 'general-manager' = 'standard'): ApprovalNode[] {
  const steps: ApprovalNode['step'][] = mode === 'general-manager'
    ? ['发起申请', '总经理审批']
    : ['发起申请', '商务审核', '财务审核', '法务审核'];
  return steps.map((step) => ({ step, approver: DEFAULT_APPROVERS[step], status: 'pending', time: '', comment: '' }));
}

function nowString(): string {
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

export function createMockContractService(): ContractService {
  let contracts: Contract[] = buildInitialContracts();
  const contractNoSequences: Record<string, number> = {};

  function allocateContractNo(signingEntity: string): string {
    const now = new Date();
    const prefix = getContractNumberPrefix(signingEntity);
    const key = generateContractNo(now, 0, prefix).slice(0, -3);
    const next = (contractNoSequences[key] ?? 0) + 1;
    contractNoSequences[key] = next;
    return generateContractNo(now, next, prefix);
  }

  function getNextContractNo(signingEntity: string): string {
    const now = new Date();
    const prefix = getContractNumberPrefix(signingEntity);
    const key = generateContractNo(now, 0, prefix).slice(0, -3);
    const next = (contractNoSequences[key] ?? 0) + 1;
    return generateContractNo(now, next, prefix);
  }

  function updateContract(id: string, mutate: (c: Contract) => Contract) {
    contracts = contracts.map((c) => (c.id === id ? { ...mutate(c), updatedAt: nowString() } : c));
  }

  function withdrawLatestApprovingRound(c: Contract): Contract {
    const rounds = getContractApprovalRounds(c).map((round, i, arr) =>
      i === arr.length - 1 && round.status === 'approving'
        ? { ...round, status: 'withdrawn' as const, updatedAt: nowString() }
        : round,
    );
    return { ...c, approvalRounds: rounds };
  }

  return {
    list: async () => contracts,
    getById: async (id) => contracts.find((c) => c.id === id),
    getNextContractNo: (signingEntity) => getNextContractNo(signingEntity),

    createFromWizard: async (input) => {
      const id = `c${Date.now()}`;
      const now = nowString();
      const formData = input.formData;
      const newContract: Contract = {
        id,
        contractNo: allocateContractNo(formData.signingEntity),
        status: 'draft',
        leadId: input.leadId,
        quoteId: input.quoteId,
        projectId: input.projectId,
        current: formData,
        versionHistory: [{ versionNo: 'V1', formData, renderedHtml: renderContractDocument(formData), label: '首次保存草稿', createdAt: now, createdBy: '张三' }],
        approvalFlow: createInitialApprovalFlow(),
        approvalRounds: [],
        archivedScans: [],
        createdAt: now,
        createdBy: '张三',
        updatedAt: now,
      };
      contracts = [newContract, ...contracts];
      return newContract;
    },

    saveDraft: async (id, formData) => {
      updateContract(id, (c) => ({
        ...c,
        contractNo: c.status === 'draft' && c.current.signingEntity !== formData.signingEntity
          ? allocateContractNo(formData.signingEntity)
          : c.contractNo,
        current: formData,
      }));
    },

    saveAsVersion: async (id, formData, label) => {
      updateContract(id, (c) => {
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
      });
    },

    saveDocumentPreviewVersion: async (id, { formData, projectId, createNewVersion = false, changeSummary, attachment }) => {
      updateContract(id, (c) => {
        if (c.status !== 'draft') return c;
        const now = nowString();
        const versionData = { formData, renderedHtml: renderContractDocument(formData), label: '合同预览提交', changeSummary: changeSummary.trim(), attachments: [attachment], createdAt: now, createdBy: '张三' };
        const isInitial = c.versionHistory.length === 1 && c.versionHistory[0].versionNo === 'V1';
        const versionHistory = isInitial && !createNewVersion
          ? [{ ...c.versionHistory[0], ...versionData }]
          : [...c.versionHistory, { versionNo: getNextVersionNo(c.versionHistory.map((v) => v.versionNo)), ...versionData }];
        return { ...c, projectId: projectId ?? c.projectId, current: formData, versionHistory };
      });
    },

    saveVersionWithDetails: async (id, input) => {
      updateContract(id, (c) => {
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
      });
    },

    submitForApproval: async (id, formData) => {
      updateContract(id, (c) => {
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
      });
    },

    submitLatestVersionForApproval: async (id, note = '') => {
      updateContract(id, (c) => {
        if (c.status === 'voided') return c;
        const latest = c.versionHistory[c.versionHistory.length - 1];
        if (!latest || latest.versionNo === c.approvedVersionNo) return c;
        const approvalRounds = getContractApprovalRounds(c);
        if (approvalRounds[approvalRounds.length - 1]?.status === 'approving') return c;
        const now = nowString();
        const flow = createInitialApprovalFlow();
        flow[0] = { ...flow[0], status: 'approved', time: now, comment: note.trim() || '提交合同审批' };
        return { ...c, status: 'approving', approvalFlow: flow, approvalRounds: [...approvalRounds, buildApprovalRound(c, latest.versionNo, flow, now)] };
      });
    },

    submitVersionForApproval: async (id, versionNo, note = '', approvalMode = 'standard') => {
      updateContract(id, (c) => {
        if (c.status === 'voided' || versionNo === c.approvedVersionNo) return c;
        const version = c.versionHistory.find((v) => v.versionNo === versionNo);
        if (!version) return c;
        const approvalRounds = getContractApprovalRounds(c);
        if (approvalRounds.some((r) => r.status === 'approving')) return c;
        const now = nowString();
        const flow = createInitialApprovalFlow(approvalMode);
        flow[0] = { ...flow[0], status: 'approved', time: now, comment: note.trim() || '提交合同审批' };
        return { ...c, status: 'approving', approvalFlow: flow, approvalRounds: [...approvalRounds, buildApprovalRound(c, version.versionNo, flow, now)] };
      });
    },

    withdrawApproval: async (id) => {
      updateContract(id, (c) => {
        if (c.status !== 'approving') return c;
        return { ...withdrawLatestApprovingRound(c), status: 'draft', approvalFlow: createInitialApprovalFlow() };
      });
    },

    approveStep: async (id, stepIndex, comment = '同意') => {
      updateContract(id, (c) => {
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
      });
    },

    rejectStep: async (id, stepIndex, comment) => {
      updateContract(id, (c) => {
        if (c.status !== 'approving') return c;
        const now = nowString();
        const flow = c.approvalFlow.map((n, i) => (i === stepIndex ? { ...n, status: 'rejected' as const, time: now, comment } : n));
        const approvalRounds = getContractApprovalRounds(c).map((round, i, arr) => (i === arr.length - 1 ? { ...round, status: 'rejected' as const, updatedAt: now, nodes: flow.map((node) => ({ ...node })) } : round));
        return { ...c, approvalFlow: flow, approvalRounds, status: 'draft' };
      });
    },

    markMailed: async (id) => {
      updateContract(id, (c) => {
        if (!canTransitionTo(c.status, 'pending_return')) return c;
        return { ...c, status: 'pending_return', mailedAt: nowString() };
      });
    },

    uploadScan: async (id, files, note) => {
      const contract = contracts.find((c) => c.id === id);
      if (!contract) return null;
      const isFirstArchive = contract.status === 'pending_return';
      const isSupplemental = contract.status === 'archived';
      if (!isFirstArchive && !isSupplemental) return null;
      const entry: ScanArchiveEntry = { id: `scan-${Date.now()}`, files, uploadedAt: nowString(), uploadedBy: '李四', isPrimary: true, linkedVersionNo: contract.approvedVersionNo ?? 'V1', note };
      updateContract(id, (c) => ({
        ...c,
        archivedScans: [...c.archivedScans.map((s) => ({ ...s, isPrimary: false })), entry],
        status: isFirstArchive ? 'archived' : c.status,
      }));
      return entry;
    },

    archiveFinalContract: async (id, files, note) => {
      const contract = contracts.find((c) => c.id === id);
      if (!contract?.approvedVersionNo || contract.status === 'voided' || files.length === 0) return null;
      const entry: ScanArchiveEntry = { id: `final-archive-${Date.now()}`, files, uploadedAt: nowString(), uploadedBy: '张三', isPrimary: true, linkedVersionNo: contract.approvedVersionNo, note };
      updateContract(id, (c) => ({ ...c, archivedScans: [...c.archivedScans.map((s) => ({ ...s, isPrimary: false })), entry] }));
      return entry;
    },

    uploadWordContract: async (id, file) => {
      updateContract(id, (contract) => {
        if (contract.uploadedWordContract?.blobUrl) URL.revokeObjectURL(contract.uploadedWordContract.blobUrl);
        return { ...contract, uploadedWordContract: { ...file, uploadedAt: nowString(), uploadedBy: '当前用户' } };
      });
    },

    setPrimaryScan: async (id, entryId) => {
      updateContract(id, (c) => ({ ...c, archivedScans: c.archivedScans.map((s) => ({ ...s, isPrimary: s.id === entryId })) }));
    },

    voidContract: async (id, reason) => {
      updateContract(id, (c) => {
        if (!canTransitionTo(c.status, 'voided')) return c;
        return { ...c, status: 'voided', current: { ...c.current, contractContent: c.current.contractContent + `\n\n[作废原因] ${reason}` } };
      });
    },

    addCollection: async (contractId, record) => {
      updateContract(contractId, (c) => {
        const records = [...(c.collectionRecords ?? []), { ...record, id: `col-${Date.now()}`, contractId }];
        return { ...c, collectionRecords: records, receivedAmount: records.reduce((s, r) => s + r.amount, 0) };
      });
    },

    addBlocker: async (contractId, blocker) => {
      updateContract(contractId, (c) => ({ ...c, paymentBlockers: [...(c.paymentBlockers ?? []), { ...blocker, id: `blocker-${Date.now()}`, contractId, createdAt: nowString() }] }));
    },

    resolveBlocker: async (contractId, blockerId) => {
      updateContract(contractId, (c) => ({ ...c, paymentBlockers: (c.paymentBlockers ?? []).map((b) => (b.id === blockerId ? { ...b, resolvedAt: nowString(), resolvedBy: '当前用户' } : b)) }));
    },

    addDunning: async (contractId, record) => {
      updateContract(contractId, (c) => ({ ...c, dunningRecords: [...(c.dunningRecords ?? []), { ...record, id: `dun-${Date.now()}`, contractId }] }));
    },
  };
}
