// 合同域数据访问服务（数据接缝）。
// UI 只依赖本接口；α版注入 mock，β版注入 http（/api/contracts）。业务逻辑在 contractMutations.ts 共用。

import { Message } from '@arco-design/web-react';
import { buildInitialContracts } from '../app/pages/sales/contracts/mockData';
import { buildRecoveryBoardContracts } from '../app/pages/sales/contracts/recoveryBoardData';
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
} from '../app/pages/sales/contracts/types';
import { getContractNumberPrefix } from '../app/pages/sales/company-entity/companyEntityData';
import { generateContractNo } from '../app/pages/sales/contracts/utils';
import type { ElectronicSigningPackage } from '../app/pages/sales/compliance/types';

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
  addCollection(contractId: string, record: Omit<CollectionRecord, 'id' | 'contractId'> & { id?: string }): Promise<boolean>;
  addBlocker(contractId: string, blocker: Omit<PaymentBlocker, 'id' | 'contractId' | 'createdAt'>): Promise<void>;
  resolveBlocker(contractId: string, blockerId: string): Promise<void>;
  addDunning(contractId: string, record: Omit<DunningRecord, 'id' | 'contractId'>): Promise<void>;
  updateSigningPackage(contractId: string, updater: (value: ElectronicSigningPackage | undefined) => ElectronicSigningPackage | undefined): Promise<void>;
}

export { createInitialApprovalFlow } from './contractMutations';

export function createMockContractService(): ContractService {
  let contracts: Contract[] = [...buildInitialContracts(), ...buildRecoveryBoardContracts()];
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

  function update(id: string, mutate: (c: Contract) => Contract): boolean {
    const exists = contracts.some((c) => c.id === id);
    contracts = contracts.map((c) => (c.id === id ? { ...mutate(c), updatedAt: nowString() } : c));
    return exists;
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
    saveAsVersion: async (id, formData, label) => { await update(id, (c) => applySaveAsVersion(c, formData, label)); },
    saveDocumentPreviewVersion: async (id, input) => { await update(id, (c) => applySaveDocumentPreviewVersion(c, input)); },
    saveVersionWithDetails: async (id, input) => { await update(id, (c) => applySaveVersionWithDetails(c, input)); },
    submitForApproval: async (id, formData) => { await update(id, (c) => applySubmitForApproval(c, formData)); },
    submitLatestVersionForApproval: async (id, note) => { await update(id, (c) => applySubmitLatestVersionForApproval(c, note)); },
    submitVersionForApproval: async (id, versionNo, note, mode) => { await update(id, (c) => applySubmitVersionForApproval(c, versionNo, note, mode)); },
    withdrawApproval: async (id) => { await update(id, applyWithdrawApproval); },
    approveStep: async (id, stepIndex, comment) => { await update(id, (c) => applyApproveStep(c, stepIndex, comment)); },
    rejectStep: async (id, stepIndex, comment) => { await update(id, (c) => applyRejectStep(c, stepIndex, comment)); },
    markMailed: async (id) => { await update(id, applyMarkMailed); },

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

    uploadWordContract: async (id, file) => { await update(id, (c) => applyUploadWordContract(c, file)); },
    setPrimaryScan: async (id, entryId) => { await update(id, (c) => applySetPrimaryScan(c, entryId)); },
    voidContract: async (id, reason) => { await update(id, (c) => applyVoidContract(c, reason)); },
    addCollection: async (contractId, record) => update(contractId, (c) => applyAddCollection(c, record, contractId)),
    addBlocker: async (contractId, blocker) => { await update(contractId, (c) => applyAddBlocker(c, blocker, contractId)); },
    resolveBlocker: async (contractId, blockerId) => { await update(contractId, (c) => applyResolveBlocker(c, blockerId)); },
    addDunning: async (contractId, record) => { await update(contractId, (c) => applyAddDunning(c, record, contractId)); },
    updateSigningPackage: async (contractId, updater) => { await update(contractId, (c) => ({ ...c, signingPackage: updater(c.signingPackage) })); },
  };
}

export function createHttpContractService(baseUrl: string, opts?: { actor?: string }): ContractService {
  const api = (p: string) => `${baseUrl}${p}`;

  async function getList(): Promise<Contract[]> {
    const r = await fetch(api('/api/contracts'));
    const d = (await r.json()) as { contracts?: Array<Contract & { version?: number }> };
    return d.contracts ?? [];
  }

  async function getOne(id: string): Promise<Contract | undefined> {
    const r = await fetch(api(`/api/contracts/${id}`));
    if (!r.ok) return undefined;
    const d = (await r.json()) as { contract?: Contract & { version?: number } };
    return d.contract;
  }

  // 乐观锁（ADR-0094）：与报价同规则。409 提示后放弃本次写入（不抛错，Context 随后 refresh 拉最新）。
  async function saveOne(contract: Contract): Promise<boolean> {
    const r = await fetch(api(`/api/contracts/${contract.id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(opts?.actor ? { 'X-Actor': opts.actor } : {}) },
      body: JSON.stringify(contract),
    });
    if (r.status === 409) {
      Message.warning('数据已被他人修改，已刷新为最新内容，请重试本次操作');
      return false;
    }
    return r.ok;
  }

  async function mutate(id: string, fn: (c: Contract) => Contract): Promise<boolean> {
    const c = await getOne(id);
    if (!c) return false;
    return saveOne(fn(c));
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
    saveAsVersion: async (id, formData, label) => { await mutate(id, (c) => applySaveAsVersion(c, formData, label)); },
    saveDocumentPreviewVersion: async (id, input) => { await mutate(id, (c) => applySaveDocumentPreviewVersion(c, input)); },
    saveVersionWithDetails: async (id, input) => { await mutate(id, (c) => applySaveVersionWithDetails(c, input)); },
    submitForApproval: async (id, formData) => { await mutate(id, (c) => applySubmitForApproval(c, formData)); },
    submitLatestVersionForApproval: async (id, note) => { await mutate(id, (c) => applySubmitLatestVersionForApproval(c, note)); },
    submitVersionForApproval: async (id, versionNo, note, mode) => { await mutate(id, (c) => applySubmitVersionForApproval(c, versionNo, note, mode)); },
    withdrawApproval: async (id) => { await mutate(id, applyWithdrawApproval); },
    approveStep: async (id, stepIndex, comment) => { await mutate(id, (c) => applyApproveStep(c, stepIndex, comment)); },
    rejectStep: async (id, stepIndex, comment) => { await mutate(id, (c) => applyRejectStep(c, stepIndex, comment)); },
    markMailed: async (id) => { await mutate(id, applyMarkMailed); },

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

    uploadWordContract: async (id, file) => { await mutate(id, (c) => applyUploadWordContract(c, file)); },
    setPrimaryScan: async (id, entryId) => { await mutate(id, (c) => applySetPrimaryScan(c, entryId)); },
    voidContract: async (id, reason) => { await mutate(id, (c) => applyVoidContract(c, reason)); },
    addCollection: (contractId, record) => mutate(contractId, (c) => applyAddCollection(c, record, contractId)),
    addBlocker: async (contractId, blocker) => { await mutate(contractId, (c) => applyAddBlocker(c, blocker, contractId)); },
    resolveBlocker: async (contractId, blockerId) => { await mutate(contractId, (c) => applyResolveBlocker(c, blockerId)); },
    addDunning: async (contractId, record) => { await mutate(contractId, (c) => applyAddDunning(c, record, contractId)); },
    updateSigningPackage: async (contractId, updater) => { await mutate(contractId, (c) => ({ ...c, signingPackage: updater(c.signingPackage) })); },
  };
}
