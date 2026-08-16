// 合同域数据访问服务（数据接缝）。
// UI 只依赖本接口；α版注入 mock，β版注入 http（/api/contracts）。业务逻辑在 contractMutations.ts 共用。

import { buildInitialContracts } from '@/app/pages/contracts/mockData';
import {
  applyAddBlocker,
  applyAddCollection,
  applyAddDunning,
  applyApproveStep,
  applyArchiveFinalContract,
  applyCreateFromWizard,
  applyMarkMailed,
  applyRejectStep,
  applyResolveBlocker,
  applySaveAsVersion,
  applySaveDocumentPreviewVersion,
  applySaveDraft,
  applySaveVersionWithDetails,
  applySetPrimaryScan,
  applySubmitForApproval,
  applySubmitLatestVersionForApproval,
  applySubmitVersionForApproval,
  applyUploadScan,
  applyUploadWordContract,
  applyVoidContract,
  applyWithdrawApproval,
  createInitialApprovalFlow,
  nowString,
} from './contractMutations';
import type {
  CollectionRecord,
  Contract,
  ContractFormData,
  ContractVersionAttachment,
  DunningRecord,
  PaymentBlocker,
  ScanArchiveEntry,
  ScanFile,
  UploadedWordContract,
  WizardInput,
} from '@/app/pages/contracts/types';
import { getContractNumberPrefix } from '@/app/pages/company-entity/companyEntityData';
import { generateContractNo } from '@/app/pages/contracts/utils';

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

export { createInitialApprovalFlow } from './contractMutations';

export function createMockContractService(): ContractService {
  let contracts: Contract[] = buildInitialContracts();
  const seq: Record<string, number> = {};

  function allocateNo(signingEntity: string): string {
    const now = new Date();
    const prefix = getContractNumberPrefix(signingEntity);
    const key = generateContractNo(now, 0, prefix).slice(0, -3);
    const next = (seq[key] ?? 0) + 1;
    seq[key] = next;
    return generateContractNo(now, next, prefix);
  }

  function previewNo(signingEntity: string): string {
    const now = new Date();
    const prefix = getContractNumberPrefix(signingEntity);
    const key = generateContractNo(now, 0, prefix).slice(0, -3);
    return generateContractNo(now, (seq[key] ?? 0) + 1, prefix);
  }

  function update(id: string, mutate: (c: Contract) => Contract) {
    contracts = contracts.map((c) => (c.id === id ? { ...mutate(c), updatedAt: nowString() } : c));
  }

  return {
    list: async () => contracts,
    getById: async (id) => contracts.find((c) => c.id === id),
    getNextContractNo: previewNo,

    createFromWizard: async (input) => {
      const c = applyCreateFromWizard(input, `c${Date.now()}`, allocateNo(input.formData.signingEntity), nowString());
      contracts = [c, ...contracts];
      return c;
    },

    saveDraft: async (id, formData) => {
      const cur = contracts.find((c) => c.id === id);
      const reallocated = cur && cur.status === 'draft' && cur.current.signingEntity !== formData.signingEntity
        ? allocateNo(formData.signingEntity)
        : null;
      update(id, (c) => applySaveDraft(c, formData, reallocated));
    },
    saveAsVersion: async (id, formData, label) => update(id, (c) => applySaveAsVersion(c, formData, label)),
    saveDocumentPreviewVersion: async (id, input) => update(id, (c) => applySaveDocumentPreviewVersion(c, input)),
    saveVersionWithDetails: async (id, input) => update(id, (c) => applySaveVersionWithDetails(c, input)),
    submitForApproval: async (id, formData) => update(id, (c) => applySubmitForApproval(c, formData)),
    submitLatestVersionForApproval: async (id, note) => update(id, (c) => applySubmitLatestVersionForApproval(c, note)),
    submitVersionForApproval: async (id, versionNo, note, mode) => update(id, (c) => applySubmitVersionForApproval(c, versionNo, note, mode)),
    withdrawApproval: async (id) => update(id, applyWithdrawApproval),
    approveStep: async (id, stepIndex, comment) => update(id, (c) => applyApproveStep(c, stepIndex, comment)),
    rejectStep: async (id, stepIndex, comment) => update(id, (c) => applyRejectStep(c, stepIndex, comment)),
    markMailed: async (id) => update(id, applyMarkMailed),

    uploadScan: async (id, files, note) => {
      const cur = contracts.find((c) => c.id === id);
      if (!cur) return null;
      const isFirst = cur.status === 'pending_return';
      const isSupplemental = cur.status === 'archived';
      if (!isFirst && !isSupplemental) return null;
      const entry: ScanArchiveEntry = { id: `scan-${Date.now()}`, files, uploadedAt: nowString(), uploadedBy: '李四', isPrimary: true, linkedVersionNo: cur.approvedVersionNo ?? 'V1', note };
      update(id, (c) => applyUploadScan(c, entry, isFirst));
      return entry;
    },

    archiveFinalContract: async (id, files, note) => {
      const cur = contracts.find((c) => c.id === id);
      if (!cur?.approvedVersionNo || cur.status === 'voided' || files.length === 0) return null;
      const entry: ScanArchiveEntry = { id: `final-archive-${Date.now()}`, files, uploadedAt: nowString(), uploadedBy: '张三', isPrimary: true, linkedVersionNo: cur.approvedVersionNo, note };
      update(id, (c) => applyArchiveFinalContract(c, entry));
      return entry;
    },

    uploadWordContract: async (id, file) => update(id, (c) => applyUploadWordContract(c, file)),
    setPrimaryScan: async (id, entryId) => update(id, (c) => applySetPrimaryScan(c, entryId)),
    voidContract: async (id, reason) => update(id, (c) => applyVoidContract(c, reason)),
    addCollection: async (contractId, record) => update(contractId, (c) => applyAddCollection(c, record, contractId)),
    addBlocker: async (contractId, blocker) => update(contractId, (c) => applyAddBlocker(c, blocker, contractId)),
    resolveBlocker: async (contractId, blockerId) => update(contractId, (c) => applyResolveBlocker(c, blockerId)),
    addDunning: async (contractId, record) => update(contractId, (c) => applyAddDunning(c, record, contractId)),
  };
}

export function createHttpContractService(baseUrl: string): ContractService {
  const api = (p: string) => `${baseUrl}${p}`;

  async function getList(): Promise<Contract[]> {
    const r = await fetch(api('/api/contracts'));
    const d = (await r.json()) as { contracts?: Contract[] };
    return d.contracts ?? [];
  }

  async function getOne(id: string): Promise<Contract | undefined> {
    const r = await fetch(api(`/api/contracts/${id}`));
    if (!r.ok) return undefined;
    const d = (await r.json()) as { contract?: Contract };
    return d.contract;
  }

  async function saveOne(contract: Contract): Promise<void> {
    await fetch(api(`/api/contracts/${contract.id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contract),
    });
  }

  async function mutate(id: string, fn: (c: Contract) => Contract): Promise<void> {
    const c = await getOne(id);
    if (c) await saveOne({ ...fn(c), updatedAt: nowString() });
  }

  return {
    list: getList,
    getById: getOne,
    getNextContractNo: (signingEntity) => generateContractNo(new Date(), 1, getContractNumberPrefix(signingEntity)),

    createFromWizard: async (input) => {
      const c = applyCreateFromWizard(input, `c${Date.now()}`, generateContractNo(new Date(), Math.floor(Date.now() / 1000) % 1000, getContractNumberPrefix(input.formData.signingEntity)), nowString());
      await saveOne(c);
      return c;
    },

    saveDraft: async (id, formData) => {
      const c = await getOne(id);
      if (!c) return;
      const reallocated = c.status === 'draft' && c.current.signingEntity !== formData.signingEntity
        ? generateContractNo(new Date(), Math.floor(Date.now() / 1000) % 1000, getContractNumberPrefix(formData.signingEntity))
        : null;
      await saveOne({ ...applySaveDraft(c, formData, reallocated), updatedAt: nowString() });
    },
    saveAsVersion: async (id, formData, label) => mutate(id, (c) => applySaveAsVersion(c, formData, label)),
    saveDocumentPreviewVersion: async (id, input) => mutate(id, (c) => applySaveDocumentPreviewVersion(c, input)),
    saveVersionWithDetails: async (id, input) => mutate(id, (c) => applySaveVersionWithDetails(c, input)),
    submitForApproval: async (id, formData) => mutate(id, (c) => applySubmitForApproval(c, formData)),
    submitLatestVersionForApproval: async (id, note) => mutate(id, (c) => applySubmitLatestVersionForApproval(c, note)),
    submitVersionForApproval: async (id, versionNo, note, mode) => mutate(id, (c) => applySubmitVersionForApproval(c, versionNo, note, mode)),
    withdrawApproval: async (id) => mutate(id, applyWithdrawApproval),
    approveStep: async (id, stepIndex, comment) => mutate(id, (c) => applyApproveStep(c, stepIndex, comment)),
    rejectStep: async (id, stepIndex, comment) => mutate(id, (c) => applyRejectStep(c, stepIndex, comment)),
    markMailed: async (id) => mutate(id, applyMarkMailed),

    uploadScan: async (id, files, note) => {
      const cur = await getOne(id);
      if (!cur) return null;
      const isFirst = cur.status === 'pending_return';
      const isSupplemental = cur.status === 'archived';
      if (!isFirst && !isSupplemental) return null;
      const entry: ScanArchiveEntry = { id: `scan-${Date.now()}`, files, uploadedAt: nowString(), uploadedBy: '李四', isPrimary: true, linkedVersionNo: cur.approvedVersionNo ?? 'V1', note };
      await saveOne({ ...applyUploadScan(cur, entry, isFirst), updatedAt: nowString() });
      return entry;
    },

    archiveFinalContract: async (id, files, note) => {
      const cur = await getOne(id);
      if (!cur?.approvedVersionNo || cur.status === 'voided' || files.length === 0) return null;
      const entry: ScanArchiveEntry = { id: `final-archive-${Date.now()}`, files, uploadedAt: nowString(), uploadedBy: '张三', isPrimary: true, linkedVersionNo: cur.approvedVersionNo, note };
      await saveOne({ ...applyArchiveFinalContract(cur, entry), updatedAt: nowString() });
      return entry;
    },

    uploadWordContract: async (id, file) => mutate(id, (c) => applyUploadWordContract(c, file)),
    setPrimaryScan: async (id, entryId) => mutate(id, (c) => applySetPrimaryScan(c, entryId)),
    voidContract: async (id, reason) => mutate(id, (c) => applyVoidContract(c, reason)),
    addCollection: async (contractId, record) => mutate(contractId, (c) => applyAddCollection(c, record, contractId)),
    addBlocker: async (contractId, blocker) => mutate(contractId, (c) => applyAddBlocker(c, blocker, contractId)),
    resolveBlocker: async (contractId, blockerId) => mutate(contractId, (c) => applyResolveBlocker(c, blockerId)),
    addDunning: async (contractId, record) => mutate(contractId, (c) => applyAddDunning(c, record, contractId)),
  };
}
