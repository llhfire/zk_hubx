// 合同模块全局状态。数据层已抽到 services/contractService（数据接缝），
// 这里只是 React 绑定：镜像 service 返回的数据 + 委托操作后刷新。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type {
  CollectionRecord,
  Contract,
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
import { createMockContractService, type ContractService } from '@/services/contractService';

// 兼容旧导入：approvalFlow.test.ts 等仍从本文件 import createInitialApprovalFlow
export { createInitialApprovalFlow } from '@/services/contractService';

interface ContractsContextValue {
  contracts: Contract[];
  loading: boolean;
  getById: (id: string | undefined) => Contract | undefined;
  getNextContractNo: (signingEntity: string) => string;
  createFromWizard: (input: WizardInput) => Promise<Contract>;
  saveDraft: (id: string, formData: ContractFormData) => Promise<void>;
  saveAsVersion: (id: string, formData: ContractFormData, label: string) => Promise<void>;
  saveDocumentPreviewVersion: (id: string, input: { formData: ContractFormData; projectId?: string; createNewVersion?: boolean; changeSummary: string; attachment: ContractVersionAttachment }) => Promise<void>;
  saveVersionWithDetails: (id: string, input: { formData: ContractFormData; label: string; changeTypes: string[]; changeSummary: string; attachments: ContractVersionAttachment[] }) => Promise<void>;
  submitForApproval: (id: string, formData: ContractFormData) => Promise<void>;
  submitLatestVersionForApproval: (id: string, note?: string) => Promise<void>;
  submitVersionForApproval: (id: string, versionNo: string, note?: string, approvalMode?: 'standard' | 'general-manager') => Promise<void>;
  withdrawApproval: (id: string) => Promise<void>;
  approveStep: (id: string, stepIndex: number, comment?: string) => Promise<void>;
  rejectStep: (id: string, stepIndex: number, comment: string) => Promise<void>;
  markMailed: (id: string) => Promise<void>;
  uploadScan: (id: string, files: ScanFile[], note?: string) => Promise<ScanArchiveEntry | null>;
  archiveFinalContract: (id: string, files: ScanFile[], note?: string) => Promise<ScanArchiveEntry | null>;
  uploadWordContract: (id: string, file: Omit<UploadedWordContract, 'uploadedAt' | 'uploadedBy'>) => Promise<void>;
  setPrimaryScan: (id: string, entryId: string) => Promise<void>;
  voidContract: (id: string, reason: string) => Promise<void>;
  addCollection: (contractId: string, record: Omit<CollectionRecord, 'id' | 'contractId'>) => Promise<void>;
  addBlocker: (contractId: string, blocker: Omit<PaymentBlocker, 'id' | 'contractId' | 'createdAt'>) => Promise<void>;
  resolveBlocker: (contractId: string, blockerId: string) => Promise<void>;
  addDunning: (contractId: string, record: Omit<DunningRecord, 'id' | 'contractId'>) => Promise<void>;
}

const ContractsContext = createContext<ContractsContextValue | null>(null);

interface ContractsProviderProps extends PropsWithChildren {
  service?: ContractService;
}

export function ContractsProvider({ children, service }: ContractsProviderProps) {
  const svc = useMemo(() => service ?? createMockContractService(), [service]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    svc.list().then((cs) => {
      if (cancelled) return;
      setContracts(cs);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [svc]);

  const refresh = useCallback(async () => {
    setContracts(await svc.list());
  }, [svc]);

  const getById = useCallback((id: string | undefined) => contracts.find((c) => c.id === id), [contracts]);
  const getNextContractNo = useCallback((signingEntity: string) => svc.getNextContractNo(signingEntity), [svc]);

  const createFromWizard = useCallback(async (input: WizardInput): Promise<Contract> => {
    const created = await svc.createFromWizard(input);
    await refresh();
    return created;
  }, [svc, refresh]);

  const saveDraft = useCallback(async (id: string, formData: ContractFormData) => { await svc.saveDraft(id, formData); await refresh(); }, [svc, refresh]);
  const saveAsVersion = useCallback(async (id: string, formData: ContractFormData, label: string) => { await svc.saveAsVersion(id, formData, label); await refresh(); }, [svc, refresh]);
  const saveDocumentPreviewVersion = useCallback(async (id: string, input: Parameters<ContractService['saveDocumentPreviewVersion']>[1]) => { await svc.saveDocumentPreviewVersion(id, input); await refresh(); }, [svc, refresh]);
  const saveVersionWithDetails = useCallback(async (id: string, input: Parameters<ContractService['saveVersionWithDetails']>[1]) => { await svc.saveVersionWithDetails(id, input); await refresh(); }, [svc, refresh]);
  const submitForApproval = useCallback(async (id: string, formData: ContractFormData) => { await svc.submitForApproval(id, formData); await refresh(); }, [svc, refresh]);
  const submitLatestVersionForApproval = useCallback(async (id: string, note?: string) => { await svc.submitLatestVersionForApproval(id, note); await refresh(); }, [svc, refresh]);
  const submitVersionForApproval = useCallback(async (id: string, versionNo: string, note?: string, approvalMode?: 'standard' | 'general-manager') => { await svc.submitVersionForApproval(id, versionNo, note, approvalMode); await refresh(); }, [svc, refresh]);
  const withdrawApproval = useCallback(async (id: string) => { await svc.withdrawApproval(id); await refresh(); }, [svc, refresh]);
  const approveStep = useCallback(async (id: string, stepIndex: number, comment?: string) => { await svc.approveStep(id, stepIndex, comment); await refresh(); }, [svc, refresh]);
  const rejectStep = useCallback(async (id: string, stepIndex: number, comment: string) => { await svc.rejectStep(id, stepIndex, comment); await refresh(); }, [svc, refresh]);
  const markMailed = useCallback(async (id: string) => { await svc.markMailed(id); await refresh(); }, [svc, refresh]);

  const uploadScan = useCallback(async (id: string, files: ScanFile[], note?: string): Promise<ScanArchiveEntry | null> => {
    const entry = await svc.uploadScan(id, files, note);
    await refresh();
    return entry;
  }, [svc, refresh]);

  const archiveFinalContract = useCallback(async (id: string, files: ScanFile[], note?: string): Promise<ScanArchiveEntry | null> => {
    const entry = await svc.archiveFinalContract(id, files, note);
    await refresh();
    return entry;
  }, [svc, refresh]);

  const uploadWordContract = useCallback(async (id: string, file: Omit<UploadedWordContract, 'uploadedAt' | 'uploadedBy'>) => { await svc.uploadWordContract(id, file); await refresh(); }, [svc, refresh]);
  const setPrimaryScan = useCallback(async (id: string, entryId: string) => { await svc.setPrimaryScan(id, entryId); await refresh(); }, [svc, refresh]);
  const voidContract = useCallback(async (id: string, reason: string) => { await svc.voidContract(id, reason); await refresh(); }, [svc, refresh]);
  const addCollection = useCallback(async (contractId: string, record: Omit<CollectionRecord, 'id' | 'contractId'>) => { await svc.addCollection(contractId, record); await refresh(); }, [svc, refresh]);
  const addBlocker = useCallback(async (contractId: string, blocker: Omit<PaymentBlocker, 'id' | 'contractId' | 'createdAt'>) => { await svc.addBlocker(contractId, blocker); await refresh(); }, [svc, refresh]);
  const resolveBlocker = useCallback(async (contractId: string, blockerId: string) => { await svc.resolveBlocker(contractId, blockerId); await refresh(); }, [svc, refresh]);
  const addDunning = useCallback(async (contractId: string, record: Omit<DunningRecord, 'id' | 'contractId'>) => { await svc.addDunning(contractId, record); await refresh(); }, [svc, refresh]);

  const value = useMemo<ContractsContextValue>(() => ({
    contracts, loading, getById, getNextContractNo, createFromWizard,
    saveDraft, saveAsVersion, saveDocumentPreviewVersion, saveVersionWithDetails,
    submitForApproval, submitLatestVersionForApproval, submitVersionForApproval, withdrawApproval,
    approveStep, rejectStep, markMailed, uploadScan, archiveFinalContract, uploadWordContract,
    setPrimaryScan, voidContract, addCollection, addBlocker, resolveBlocker, addDunning,
  }), [
    contracts, loading, getById, getNextContractNo, createFromWizard,
    saveDraft, saveAsVersion, saveDocumentPreviewVersion, saveVersionWithDetails,
    submitForApproval, submitLatestVersionForApproval, submitVersionForApproval, withdrawApproval,
    approveStep, rejectStep, markMailed, uploadScan, archiveFinalContract, uploadWordContract,
    setPrimaryScan, voidContract, addCollection, addBlocker, resolveBlocker, addDunning,
  ]);

  return <ContractsContext.Provider value={value}>{children}</ContractsContext.Provider>;
}

export function useContracts(): ContractsContextValue {
  const ctx = useContext(ContractsContext);
  if (!ctx) throw new Error('useContracts must be used within ContractsProvider');
  return ctx;
}

// 便捷工具：统计各状态合同数（Tab 计数用）
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
