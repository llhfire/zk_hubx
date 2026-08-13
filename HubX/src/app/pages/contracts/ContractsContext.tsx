// 合同模块的全局状态：内存态 mock 数据 + 操作动作。
//
// 沿用 ReminderContext 的 Provider + hook 模式，避免在多个页面之间手动同步。

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import type {
  ApprovalNode,
  CollectionRecord,
  Contract,
  ContractApprovalRound,
  ContractFormData,
  ContractStatus,
  ContractVersionAttachment,
  DunningRecord,
  PaymentBlocker,
  ScanArchiveEntry,
  ScanFile,
  UploadedWordContract,
  WizardInput,
} from './types';
import { buildInitialContracts } from './mockData';
import { getContractApprovalRounds } from './contractHistory';
import { renderContractDocument } from './templates';
import { canTransitionTo, generateContractNo, getNextVersionNo } from './utils';
import { getContractNumberPrefix } from '../company-entity/companyEntityData';

interface ContractsContextValue {
  contracts: Contract[];
  getById: (id: string | undefined) => Contract | undefined;
  getNextContractNo: (signingEntity: string) => string;
  createFromWizard: (input: WizardInput) => Contract;
  saveDraft: (id: string, formData: ContractFormData) => void;
  saveAsVersion: (id: string, formData: ContractFormData, label: string) => void;
  saveDocumentPreviewVersion: (
    id: string,
    input: {
      formData: ContractFormData;
      projectId?: string;
      createNewVersion?: boolean;
      changeSummary: string;
      attachment: ContractVersionAttachment;
    },
  ) => void;
  saveVersionWithDetails: (
    id: string,
    input: {
      formData: ContractFormData;
      label: string;
      changeTypes: string[];
      changeSummary: string;
      attachments: ContractVersionAttachment[];
    },
  ) => void;
  submitForApproval: (id: string, formData: ContractFormData) => void;
  submitLatestVersionForApproval: (id: string, note?: string) => void;
  submitVersionForApproval: (
    id: string,
    versionNo: string,
    note?: string,
    approvalMode?: 'standard' | 'general-manager',
  ) => void;
  withdrawApproval: (id: string) => void;
  approveStep: (id: string, stepIndex: number, comment?: string) => void;
  rejectStep: (id: string, stepIndex: number, comment: string) => void;
  markMailed: (id: string) => void;
  uploadScan: (
    id: string,
    files: ScanFile[],
    note?: string,
  ) => ScanArchiveEntry | null;
  archiveFinalContract: (
    id: string,
    files: ScanFile[],
    note?: string,
  ) => ScanArchiveEntry | null;
  uploadWordContract: (id: string, file: Omit<UploadedWordContract, 'uploadedAt' | 'uploadedBy'>) => void;
  setPrimaryScan: (id: string, entryId: string) => void;
  voidContract: (id: string, reason: string) => void;
  // 回款操作
  addCollection: (contractId: string, record: Omit<CollectionRecord, 'id' | 'contractId'>) => void;
  addBlocker: (contractId: string, blocker: Omit<PaymentBlocker, 'id' | 'contractId' | 'createdAt'>) => void;
  resolveBlocker: (contractId: string, blockerId: string) => void;
  addDunning: (contractId: string, record: Omit<DunningRecord, 'id' | 'contractId'>) => void;
}

const ContractsContext = createContext<ContractsContextValue | null>(null);

const DEFAULT_APPROVERS: Record<ApprovalNode['step'], string> = {
  发起申请: '张三',
  商务审核: '王经理 - 商务主管',
  财务审核: '陈财务 - 财务总监',
  法务审核: '赵律师 - 法务部',
  总经理审批: '赵总 - 总经理',
};

export function createInitialApprovalFlow(
  mode: 'standard' | 'general-manager' = 'standard',
): ApprovalNode[] {
  const steps: ApprovalNode['step'][] = mode === 'general-manager'
    ? ['发起申请', '总经理审批']
    : ['发起申请', '商务审核', '财务审核', '法务审核'];

  return steps.map((step) => ({
    step,
    approver: DEFAULT_APPROVERS[step],
    status: 'pending',
    time: '',
    comment: '',
  }));
}

function nowString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function buildApprovalRound(
  contract: Contract,
  versionNo: string,
  flow: ApprovalNode[],
  submittedAt: string,
): ContractApprovalRound {
  const previousRounds = getContractApprovalRounds(contract);
  const roundNo = previousRounds.reduce(
    (maxRound, round) => Math.max(maxRound, round.roundNo),
    0,
  ) + 1;

  return {
    id: `${contract.id}-approval-round-${roundNo}-${Date.now()}`,
    roundNo,
    versionNo,
    status: 'approving',
    submittedAt,
    submittedBy: flow[0]?.approver || '张三',
    updatedAt: submittedAt,
    nodes: flow.map(node => ({ ...node })),
  };
}

export function ContractsProvider({ children }: PropsWithChildren) {
  const [contracts, setContracts] = useState<Contract[]>(() => buildInitialContracts());
  const contractNoSequencesRef = useRef<Record<string, number>>({});

  const getById = useCallback(
    (id: string | undefined) => contracts.find((c) => c.id === id),
    [contracts],
  );

  const getNextContractNo = useCallback((signingEntity: string) => {
    const now = new Date();
    const prefix = getContractNumberPrefix(signingEntity);
    const sequenceKey = generateContractNo(now, 0, prefix).slice(0, -3);
    const nextSequence = (contractNoSequencesRef.current[sequenceKey] ?? 0) + 1;
    return generateContractNo(now, nextSequence, prefix);
  }, []);

  const allocateContractNo = useCallback((signingEntity: string) => {
    const now = new Date();
    const prefix = getContractNumberPrefix(signingEntity);
    const sequenceKey = generateContractNo(now, 0, prefix).slice(0, -3);
    const nextSequence = (contractNoSequencesRef.current[sequenceKey] ?? 0) + 1;
    contractNoSequencesRef.current[sequenceKey] = nextSequence;
    return generateContractNo(now, nextSequence, prefix);
  }, []);

  // 给单个合同应用一个变更，并自动更新 updatedAt。
  const updateContract = useCallback(
    (id: string, mutate: (c: Contract) => Contract) => {
      setContracts((prev) =>
        prev.map((c) =>
          c.id === id ? { ...mutate(c), updatedAt: nowString() } : c,
        ),
      );
    },
    [],
  );

  const createFromWizard = useCallback((input: WizardInput): Contract => {
    const id = `c${Date.now()}`;
    const now = nowString();
    const formData = input.formData;
    const v1 = {
      versionNo: 'V1',
      formData,
      renderedHtml: renderContractDocument(formData),
      label: '首次保存草稿',
      createdAt: now,
      createdBy: '张三',
    };
    const newContract: Contract = {
      id,
      contractNo: allocateContractNo(formData.signingEntity),
      status: 'draft',
      leadId: input.leadId,
      quoteId: input.quoteId,
      projectId: input.projectId,
      current: formData,
      versionHistory: [v1],
      approvalFlow: createInitialApprovalFlow(),
      approvalRounds: [],
      archivedScans: [],
      createdAt: now,
      createdBy: '张三',
      updatedAt: now,
    };
    setContracts((prev) => [newContract, ...prev]);
    return newContract;
  }, [allocateContractNo]);

  const saveDraft = useCallback(
    (id: string, formData: ContractFormData) => {
      updateContract(id, (c) => ({
        ...c,
        contractNo: c.status === 'draft' && c.current.signingEntity !== formData.signingEntity
          ? allocateContractNo(formData.signingEntity)
          : c.contractNo,
        current: formData,
      }));
    },
    [allocateContractNo, updateContract],
  );

  const saveAsVersion = useCallback(
    (id: string, formData: ContractFormData, label: string) => {
      updateContract(id, (c) => {
        if (c.status === 'voided') return c;
        const now = nowString();
        const versionNo = getNextVersionNo(c.versionHistory.map((v) => v.versionNo));
        const newVersion = {
          versionNo,
          formData,
          renderedHtml: renderContractDocument(formData),
          label: label || `手动保存`,
          createdAt: now,
          createdBy: '张三',
        };
        const approvalRounds = getContractApprovalRounds(c).map((round, index, rounds) => (
          index === rounds.length - 1 && round.status === 'approving'
            ? { ...round, status: 'withdrawn' as const, updatedAt: now }
            : round
        ));
        return {
          ...c,
          status: 'draft',
          current: formData,
          versionHistory: [...c.versionHistory, newVersion],
          approvalRounds,
          approvalFlow: c.status === 'approving' ? createInitialApprovalFlow() : c.approvalFlow,
        };
      });
    },
    [updateContract],
  );

  const saveDocumentPreviewVersion = useCallback(
    (
      id: string,
      {
        formData,
        projectId,
        createNewVersion = false,
        changeSummary,
        attachment,
      }: {
        formData: ContractFormData;
        projectId?: string;
        changeSummary: string;
        attachment: ContractVersionAttachment;
      },
    ) => {
      updateContract(id, (c) => {
        if (c.status !== 'draft') return c;

        const now = nowString();
        const versionData = {
          formData,
          renderedHtml: renderContractDocument(formData),
          label: '合同预览提交',
          changeSummary: changeSummary.trim(),
          attachments: [attachment],
          createdAt: now,
          createdBy: '张三',
        };
        const isInitialVersion = c.versionHistory.length === 1
          && c.versionHistory[0].versionNo === 'V1';
        const versionHistory = isInitialVersion && !createNewVersion
          ? [{ ...c.versionHistory[0], ...versionData }]
          : [
              ...c.versionHistory,
              {
                versionNo: getNextVersionNo(c.versionHistory.map((version) => version.versionNo)),
                ...versionData,
              },
            ];

        return { ...c, projectId: projectId ?? c.projectId, current: formData, versionHistory };
      });
    },
    [updateContract],
  );

  const saveVersionWithDetails = useCallback(
    (
      id: string,
      input: {
        formData: ContractFormData;
        label: string;
        changeTypes: string[];
        changeSummary: string;
        attachments: ContractVersionAttachment[];
      },
    ) => {
      updateContract(id, (c) => {
        if (c.status === 'voided') return c;
        const now = nowString();
        const versionNo = getNextVersionNo(c.versionHistory.map((version) => version.versionNo));
        const approvalRounds = getContractApprovalRounds(c).map((round, index, rounds) => (
          index === rounds.length - 1 && round.status === 'approving'
            ? { ...round, status: 'withdrawn' as const, updatedAt: now }
            : round
        ));

        return {
          ...c,
          status: 'draft',
          current: input.formData,
          versionHistory: [...c.versionHistory, {
            versionNo,
            formData: input.formData,
            renderedHtml: renderContractDocument(input.formData),
            label: input.label || '合同内容修改',
            createdAt: now,
            createdBy: '张三',
            changeTypes: input.changeTypes,
            changeSummary: input.changeSummary,
            attachments: input.attachments,
          }],
          approvalRounds,
          approvalFlow: c.status === 'approving' ? createInitialApprovalFlow() : c.approvalFlow,
        };
      });
    },
    [updateContract],
  );

  const submitForApproval = useCallback(
    (id: string, formData: ContractFormData) => {
      updateContract(id, (c) => {
        if (!canTransitionTo(c.status, 'approving') && c.status !== 'draft') return c;
        const now = nowString();
        const versionNo = getNextVersionNo(c.versionHistory.map((v) => v.versionNo));
        const approvalRounds = getContractApprovalRounds(c);
        const isResubmit = approvalRounds.some(round => round.status === 'rejected');
        const submission = {
          versionNo,
          formData,
          renderedHtml: renderContractDocument(formData),
          label: isResubmit ? '驳回后再次提交' : '提交审批前自动保存',
          createdAt: now,
          createdBy: '张三',
        };
        const flow = createInitialApprovalFlow();
        // 第 1 节点 "发起申请" 直接置为 approved
        flow[0] = { ...flow[0], status: 'approved', time: now, comment: '提交合同审批' };
        const approvalRound = buildApprovalRound(c, versionNo, flow, now);
        return {
          ...c,
          status: 'approving',
          current: formData,
          versionHistory: [...c.versionHistory, submission],
          approvalFlow: flow,
          approvalRounds: [...approvalRounds, approvalRound],
        };
      });
    },
    [updateContract],
  );

  const submitLatestVersionForApproval = useCallback(
    (id: string, note = '') => {
      updateContract(id, (c) => {
        if (c.status === 'voided') return c;
        const latestVersion = c.versionHistory[c.versionHistory.length - 1];
        if (!latestVersion || latestVersion.versionNo === c.approvedVersionNo) return c;

        const approvalRounds = getContractApprovalRounds(c);
        const latestRound = approvalRounds[approvalRounds.length - 1];
        if (latestRound?.status === 'approving') return c;

        const now = nowString();
        const flow = createInitialApprovalFlow();
        flow[0] = {
          ...flow[0],
          status: 'approved',
          time: now,
          comment: note.trim() || '提交合同审批',
        };
        const approvalRound = buildApprovalRound(c, latestVersion.versionNo, flow, now);

        return {
          ...c,
          status: 'approving',
          approvalFlow: flow,
          approvalRounds: [...approvalRounds, approvalRound],
        };
      });
    },
    [updateContract],
  );

  const submitVersionForApproval = useCallback(
    (id: string, versionNo: string, note = '', approvalMode: 'standard' | 'general-manager' = 'standard') => {
      updateContract(id, (c) => {
        if (c.status === 'voided' || versionNo === c.approvedVersionNo) return c;
        const version = c.versionHistory.find(item => item.versionNo === versionNo);
        if (!version) return c;

        const approvalRounds = getContractApprovalRounds(c);
        if (approvalRounds.some(round => round.status === 'approving')) return c;

        const now = nowString();
        const flow = createInitialApprovalFlow(approvalMode);
        flow[0] = {
          ...flow[0],
          status: 'approved',
          time: now,
          comment: note.trim() || '提交合同审批',
        };
        const approvalRound = buildApprovalRound(c, version.versionNo, flow, now);

        return {
          ...c,
          status: 'approving',
          approvalFlow: flow,
          approvalRounds: [...approvalRounds, approvalRound],
        };
      });
    },
    [updateContract],
  );

  const withdrawApproval = useCallback(
    (id: string) => {
      updateContract(id, (c) => {
        if (c.status !== 'approving') return c;
        const now = nowString();
        const approvalRounds = getContractApprovalRounds(c).map((round, index, rounds) => (
          index === rounds.length - 1 && round.status === 'approving'
            ? { ...round, status: 'withdrawn' as const, updatedAt: now }
            : round
        ));
        return {
          ...c,
          status: 'draft',
          approvalFlow: createInitialApprovalFlow(),
          approvalRounds,
        };
      });
    },
    [updateContract],
  );

  const approveStep = useCallback(
    (id: string, stepIndex: number, comment = '同意') => {
      updateContract(id, (c) => {
        const now = nowString();
        const flow = c.approvalFlow.map((n, i) =>
          i === stepIndex ? { ...n, status: 'approved' as const, time: now, comment } : n,
        );
        const allApproved = flow.every((n) => n.status === 'approved');
        const approvalRounds = getContractApprovalRounds(c);
        const latestRound = approvalRounds[approvalRounds.length - 1];
        const updatedRounds = approvalRounds.map((round, index) => (
          index === approvalRounds.length - 1
            ? {
                ...round,
                status: allApproved ? 'approved' as const : 'approving' as const,
                updatedAt: now,
                nodes: flow.map(node => ({ ...node })),
              }
            : round
        ));
        if (allApproved && canTransitionTo(c.status, 'pending_mail')) {
          const lastVersion = c.versionHistory[c.versionHistory.length - 1];
          return {
            ...c,
            approvalFlow: flow,
            approvalRounds: updatedRounds,
            status: 'pending_mail',
            approvedVersionNo: latestRound?.versionNo || lastVersion?.versionNo,
            approvedAt: now,
          };
        }
        return { ...c, approvalFlow: flow, approvalRounds: updatedRounds };
      });
    },
    [updateContract],
  );

  const rejectStep = useCallback(
    (id: string, stepIndex: number, comment: string) => {
      updateContract(id, (c) => {
        if (c.status !== 'approving') return c;
        const now = nowString();
        const flow = c.approvalFlow.map((n, i) =>
          i === stepIndex ? { ...n, status: 'rejected' as const, time: now, comment } : n,
        );
        const approvalRounds = getContractApprovalRounds(c).map((round, index, rounds) => (
          index === rounds.length - 1
            ? {
                ...round,
                status: 'rejected' as const,
                updatedAt: now,
                nodes: flow.map(node => ({ ...node })),
              }
            : round
        ));
        return {
          ...c,
          approvalFlow: flow,
          approvalRounds,
          status: 'draft',
        };
      });
    },
    [updateContract],
  );

  const markMailed = useCallback(
    (id: string) => {
      updateContract(id, (c) => {
        if (!canTransitionTo(c.status, 'pending_return')) return c;
        return { ...c, status: 'pending_return', mailedAt: nowString() };
      });
    },
    [updateContract],
  );

  const uploadScan = useCallback(
    (id: string, files: ScanFile[], note?: string): ScanArchiveEntry | null => {
      const contract = contracts.find((c) => c.id === id);
      if (!contract) return null;
      // 上传扫描件触发首次归档；已归档时是补充扫描件。
      const isFirstArchive = contract.status === 'pending_return';
      const isSupplemental = contract.status === 'archived';
      if (!isFirstArchive && !isSupplemental) return null;

      const entry: ScanArchiveEntry = {
        id: `scan-${Date.now()}`,
        files,
        uploadedAt: nowString(),
        uploadedBy: '李四',
        isPrimary: true,
        linkedVersionNo: contract.approvedVersionNo ?? 'V1',
        note,
      };

      updateContract(id, (c) => {
        const archivedScans = c.archivedScans.map((s) => ({ ...s, isPrimary: false }));
        archivedScans.push(entry);
        return {
          ...c,
          archivedScans,
          status: isFirstArchive ? 'archived' : c.status,
        };
      });
      return entry;
    },
    [contracts, updateContract],
  );

  const archiveFinalContract = useCallback(
    (id: string, files: ScanFile[], note?: string): ScanArchiveEntry | null => {
      const contract = contracts.find((c) => c.id === id);
      if (!contract?.approvedVersionNo || contract.status === 'voided' || files.length === 0) {
        return null;
      }

      const entry: ScanArchiveEntry = {
        id: `final-archive-${Date.now()}`,
        files,
        uploadedAt: nowString(),
        uploadedBy: '张三',
        isPrimary: true,
        linkedVersionNo: contract.approvedVersionNo,
        note,
      };

      updateContract(id, (c) => ({
        ...c,
        archivedScans: [
          ...c.archivedScans.map(scan => ({ ...scan, isPrimary: false })),
          entry,
        ],
      }));
      return entry;
    },
    [contracts, updateContract],
  );

  const setPrimaryScan = useCallback(
    (id: string, entryId: string) => {
      updateContract(id, (c) => ({
        ...c,
        archivedScans: c.archivedScans.map((s) => ({ ...s, isPrimary: s.id === entryId })),
      }));
    },
    [updateContract],
  );

  const uploadWordContract = useCallback(
    (id: string, file: Omit<UploadedWordContract, 'uploadedAt' | 'uploadedBy'>) => {
      updateContract(id, contract => {
        if (contract.uploadedWordContract?.blobUrl) {
          URL.revokeObjectURL(contract.uploadedWordContract.blobUrl);
        }
        return {
          ...contract,
          uploadedWordContract: {
            ...file,
            uploadedAt: nowString(),
            uploadedBy: '当前用户',
          },
        };
      });
    },
    [updateContract],
  );

  const voidContract = useCallback(
    (id: string, reason: string) => {
      updateContract(id, (c) => {
        if (!canTransitionTo(c.status, 'voided')) return c;
        // 把作废原因记到最近一条审批节点的 comment 里（演示用）
        const flow = [...c.approvalFlow];
        return { ...c, status: 'voided', approvalFlow: flow, current: { ...c.current, contractContent: c.current.contractContent + `\n\n[作废原因] ${reason}` } };
      });
    },
    [updateContract],
  );

  const addCollection = useCallback(
    (contractId: string, record: Omit<CollectionRecord, 'id' | 'contractId'>) => {
      updateContract(contractId, (c) => {
        const newRecord: CollectionRecord = {
          ...record,
          id: `col-${Date.now()}`,
          contractId,
        };
        const records = [...(c.collectionRecords ?? []), newRecord];
        const received = records.reduce((s, r) => s + r.amount, 0);
        return { ...c, collectionRecords: records, receivedAmount: received };
      });
    },
    [updateContract],
  );

  const addBlocker = useCallback(
    (contractId: string, blocker: Omit<PaymentBlocker, 'id' | 'contractId' | 'createdAt'>) => {
      updateContract(contractId, (c) => {
        const newBlocker: PaymentBlocker = {
          ...blocker,
          id: `blocker-${Date.now()}`,
          contractId,
          createdAt: nowString(),
        };
        return { ...c, paymentBlockers: [...(c.paymentBlockers ?? []), newBlocker] };
      });
    },
    [updateContract],
  );

  const resolveBlocker = useCallback(
    (contractId: string, blockerId: string) => {
      updateContract(contractId, (c) => ({
        ...c,
        paymentBlockers: (c.paymentBlockers ?? []).map((b) =>
          b.id === blockerId ? { ...b, resolvedAt: nowString(), resolvedBy: '当前用户' } : b,
        ),
      }));
    },
    [updateContract],
  );

  const addDunning = useCallback(
    (contractId: string, record: Omit<DunningRecord, 'id' | 'contractId'>) => {
      updateContract(contractId, (c) => {
        const newRecord: DunningRecord = { ...record, id: `dun-${Date.now()}`, contractId };
        return { ...c, dunningRecords: [...(c.dunningRecords ?? []), newRecord] };
      });
    },
    [updateContract],
  );

  const value = useMemo<ContractsContextValue>(
    () => ({
      contracts,
      getById,
      getNextContractNo,
      createFromWizard,
      saveDraft,
      saveAsVersion,
      saveDocumentPreviewVersion,
      saveVersionWithDetails,
      submitForApproval,
      submitLatestVersionForApproval,
      submitVersionForApproval,
      withdrawApproval,
      approveStep,
      rejectStep,
      markMailed,
      uploadScan,
      archiveFinalContract,
      uploadWordContract,
      setPrimaryScan,
      voidContract,
      addCollection,
      addBlocker,
      resolveBlocker,
      addDunning,
    }),
    [
      addBlocker,
      addCollection,
      addDunning,
      approveStep,
      contracts,
      createFromWizard,
      getById,
      getNextContractNo,
      markMailed,
      rejectStep,
      resolveBlocker,
      saveAsVersion,
      saveDocumentPreviewVersion,
      saveDraft,
      saveVersionWithDetails,
      setPrimaryScan,
      submitForApproval,
      submitLatestVersionForApproval,
      submitVersionForApproval,
      uploadScan,
      archiveFinalContract,
      uploadWordContract,
      voidContract,
      withdrawApproval,
    ],
  );

  return <ContractsContext.Provider value={value}>{children}</ContractsContext.Provider>;
}

export function useContracts(): ContractsContextValue {
  const ctx = useContext(ContractsContext);
  if (!ctx) throw new Error('useContracts must be used within ContractsProvider');
  return ctx;
}

// 便捷工具：把 ContractStatus 数组中的 statuses 数过来（用于 Tab 计数等）
export function countByStatus(contracts: Contract[]): Record<ContractStatus, number> {
  const counts: Record<ContractStatus, number> = {
    draft: 0,
    approving: 0,
    pending_mail: 0,
    pending_return: 0,
    archived: 0,
    voided: 0,
  };
  contracts.forEach((c) => {
    counts[c.status] = (counts[c.status] ?? 0) + 1;
  });
  return counts;
}
