// ========================================
// 精益交付 - 合同接缝（L2）
// 从合同域读取合同数据，转换为精益交付可用格式
// ========================================

import { buildInitialContracts } from '../contracts/mockData';
import type { Contract } from '../contracts/types';
import type { CollectionLedgerEntry } from '@/services/collectionMutations';

/**
 * 精益交付追加的合同（L2）
 * ID 映射：contract-001 → fd-ht-001 等
 * 与合同域 `'1'`–`'9'` 主故事并存，不改旧 ID
 */
const FD_CONTRACTS: Record<string, any> = {
  'contract-001': {
    id: 'contract-001', contractNo: 'HT-2026-001', name: '阿里巴巴-企业管理系统',
    customerName: '阿里巴巴（中国）有限公司', totalAmount: 205000,
    status: 'active', signingDate: '2026-06-01',
    paymentPlans: [
      { id: 'pp-1', contractId: 'contract-001', planNo: 1, planName: '签约款', amount: 61500, dueDate: '2026-06-15', status: 'received' },
      { id: 'pp-2', contractId: 'contract-001', planNo: 2, planName: '中期款1', amount: 41000, dueDate: '2026-07-15', status: 'received' },
      { id: 'pp-3', contractId: 'contract-001', planNo: 3, planName: '中期款2', amount: 41000, dueDate: '2026-08-15', status: 'pending' },
      { id: 'pp-4', contractId: 'contract-001', planNo: 4, planName: '中期款3', amount: 41000, dueDate: '2026-09-15', status: 'pending' },
      { id: 'pp-5', contractId: 'contract-001', planNo: 5, planName: '尾款', amount: 20500, dueDate: '2026-10-15', status: 'pending' },
    ],
  },
  // 补充合同 BC01（已归档生效，+¥35k）
  'contract-001-bc01': {
    id: 'contract-001-bc01', contractNo: 'HT-2026-001-BC01', name: '阿里巴巴-企业管理系统（补充1）',
    customerName: '阿里巴巴（中国）有限公司', totalAmount: 35000,
    status: 'archived', signingDate: '2026-07-15',
    sourceQuoteId: 'quot-001-supp1',
    paymentPlans: [],
  },
  // 补充合同 BC02（审批中，+¥20k）
  'contract-001-bc02': {
    id: 'contract-001-bc02', contractNo: 'HT-2026-001-BC02', name: '阿里巴巴-企业管理系统（补充2）',
    customerName: '阿里巴巴（中国）有限公司', totalAmount: 20000,
    status: 'pending_approval', signingDate: undefined,
    sourceQuoteId: 'quot-001-supp2',
    paymentPlans: [],
  },
  'contract-003': {
    id: 'contract-003', contractNo: 'HT-2026-003', name: '字节跳动-在线教育平台',
    customerName: '字节跳动-教育平台', totalAmount: 250000,
    status: 'completed', signingDate: '2026-06-20',
    paymentPlans: [
      { id: 'pp-6', contractId: 'contract-003', planNo: 1, planName: '签约款', amount: 75000, dueDate: '2026-06-25', status: 'received' },
      { id: 'pp-7', contractId: 'contract-003', planNo: 2, planName: '中期款', amount: 100000, dueDate: '2026-07-10', status: 'received' },
      { id: 'pp-8', contractId: 'contract-003', planNo: 3, planName: '尾款', amount: 75000, dueDate: '2026-07-25', status: 'received' },
    ],
  },
  'contract-005': {
    id: 'contract-005', contractNo: 'HT-2026-005', name: '美团-企业办公系统',
    customerName: '美团-企业服务', totalAmount: 180000,
    status: 'active', signingDate: '2026-06-01',
    paymentPlans: [
      { id: 'pp-9', contractId: 'contract-005', planNo: 1, planName: '签约款', amount: 54000, dueDate: '2026-06-10', status: 'received' },
      { id: 'pp-10', contractId: 'contract-005', planNo: 2, planName: '中期款', amount: 72000, dueDate: '2026-07-20', status: 'overdue' },
      { id: 'pp-11', contractId: 'contract-005', planNo: 3, planName: '尾款', amount: 54000, dueDate: '2026-08-20', status: 'pending' },
    ],
  },
};

/** 根据 contractId 获取合同（先查精益追加，再查合同域 mock） */
export function getContract(contractId: string, contracts: Contract[] = []) {
  const currentContract = contracts.find((contract) => contract.id === contractId);
  if (currentContract) return currentContract;
  // 精益追加的合同
  if (FD_CONTRACTS[contractId]) return FD_CONTRACTS[contractId];
  // 合同域 mock
  const seedContracts = buildInitialContracts();
  return seedContracts.find(c => c.id === contractId) ?? null;
}

/** 有效标的额 = 主合同额 */
export function effectiveAmount(contract: any): number {
  return contract?.current?.totalAmount ?? contract?.totalAmount ?? contract?.amount ?? 0;
}

/** 从独立实收台账获取合同回款；禁止回退到合同嵌套记录。 */
export function getCollections(
  contractId: string,
  collections: CollectionLedgerEntry[],
): { amount: number; date: string }[] {
  return collections
    .filter((record) => record.contractId === contractId)
    .map((record) => ({ amount: record.amount, date: record.date }));
}

/** 获取合同的付款计划 */
export function getPaymentPlans(contractId: string, contracts: Contract[] = []): { dueDate: string; amount: number }[] {
  const contract = getContract(contractId, contracts) as any;
  const plans = contract?.current?.paymentPlans ?? contract?.paymentPlans ?? [];
  return plans.map((p: any) => ({
    dueDate: p.expectedDate ?? p.dueDate ?? '',
    amount: p.amount ?? 0,
  }));
}

/** 累计回款金额 */
export function totalCollected(contractId: string, collections: CollectionLedgerEntry[]): number {
  return getCollections(contractId, collections).reduce((s, c) => s + c.amount, 0);
}

/** 补充合同摘要（用于 Case 补充合同列表与标的额演进） */
export function getSupplementSummaries(
  extraContractIds: string[],
  contracts: Contract[] = [],
): import('./types').SupplementContractSummary[] {
  return extraContractIds.map(id => {
    const contract = getContract(id, contracts) as any;
    if (!contract) return null;
    const amount = effectiveAmount(contract);
    const name = contract.current?.contractName ?? contract.name ?? '';
    const signingDate = contract.current?.signDate ?? contract.signingDate;
    return {
      id: contract.id,
      contractNo: contract.contractNo,
      name,
      amount,
      status: contract.status === 'archived' ? 'archived' as const
        : contract.status === 'pending_approval' ? 'pending_approval' as const
        : 'voided' as const,
      archived: contract.status === 'archived',
      voided: contract.status === 'voided',
      signingDate,
      sourceQuoteId: contract.sourceQuoteId,
    };
  }).filter((s): s is import('./types').SupplementContractSummary => s !== null);
}
