// ========================================
// 精益交付 - 合同接缝（L2）
// 从合同域读取合同数据，转换为精益交付可用格式
// ========================================

import { buildInitialContracts } from '../contracts/mockData';

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
    collectionRecords: [
      { id: 'cr-1', contractId: 'contract-001', amount: 61500, collectionDate: '2026-06-20', method: '银行转账' },
      { id: 'cr-2', contractId: 'contract-001', amount: 41000, collectionDate: '2026-07-20', method: '银行转账' },
    ],
  },
  // 补充合同 BC01（已归档生效，+¥35k）
  'contract-001-bc01': {
    id: 'contract-001-bc01', contractNo: 'HT-2026-001-BC01', name: '阿里巴巴-企业管理系统（补充1）',
    customerName: '阿里巴巴（中国）有限公司', totalAmount: 35000,
    status: 'archived', signingDate: '2026-07-15',
    sourceQuoteId: 'quot-001-supp1',
    paymentPlans: [],
    collectionRecords: [],
  },
  // 补充合同 BC02（审批中，+¥20k）
  'contract-001-bc02': {
    id: 'contract-001-bc02', contractNo: 'HT-2026-001-BC02', name: '阿里巴巴-企业管理系统（补充2）',
    customerName: '阿里巴巴（中国）有限公司', totalAmount: 20000,
    status: 'pending_approval', signingDate: undefined,
    sourceQuoteId: 'quot-001-supp2',
    paymentPlans: [],
    collectionRecords: [],
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
    collectionRecords: [
      { id: 'cr-3', contractId: 'contract-003', amount: 75000, collectionDate: '2026-06-28', method: '银行转账' },
      { id: 'cr-4', contractId: 'contract-003', amount: 100000, collectionDate: '2026-07-12', method: '银行转账' },
      { id: 'cr-5', contractId: 'contract-003', amount: 75000, collectionDate: '2026-07-28', method: '银行转账' },
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
    collectionRecords: [
      { id: 'cr-6', contractId: 'contract-005', amount: 54000, collectionDate: '2026-06-15', method: '银行转账' },
    ],
  },
};

/** 根据 contractId 获取合同（先查精益追加，再查合同域 mock） */
export function getContract(contractId: string) {
  // 精益追加的合同
  if (FD_CONTRACTS[contractId]) return FD_CONTRACTS[contractId];
  // 合同域 mock
  const contracts = buildInitialContracts();
  return contracts.find(c => c.id === contractId) ?? null;
}

/** 有效标的额 = 主合同额 */
export function effectiveAmount(contract: any): number {
  return contract?.totalAmount ?? contract?.amount ?? 0;
}

/** 获取合同的回款记录 */
export function getCollections(contractId: string): { amount: number; date: string }[] {
  const contract = getContract(contractId);
  if (!contract?.collectionRecords) return [];
  return contract.collectionRecords.map((r: any) => ({
    amount: r.amount ?? 0,
    date: r.collectionDate ?? r.date ?? '',
  }));
}

/** 获取合同的付款计划 */
export function getPaymentPlans(contractId: string): { dueDate: string; amount: number }[] {
  const contract = getContract(contractId);
  if (!contract?.paymentPlans) return [];
  return contract.paymentPlans.map((p: any) => ({
    dueDate: p.dueDate ?? '',
    amount: p.amount ?? 0,
  }));
}

/** 累计回款金额 */
export function totalCollected(contractId: string): number {
  return getCollections(contractId).reduce((s, c) => s + c.amount, 0);
}

/** 补充合同摘要（用于 Case 补充合同列表与标的额演进） */
export function getSupplementSummaries(extraContractIds: string[]): import('./types').SupplementContractSummary[] {
  return extraContractIds.map(id => {
    const contract = FD_CONTRACTS[id];
    if (!contract) return null;
    return {
      id: contract.id,
      contractNo: contract.contractNo,
      name: contract.name ?? '',
      amount: contract.totalAmount ?? 0,
      status: contract.status === 'archived' ? 'archived' as const
        : contract.status === 'pending_approval' ? 'pending_approval' as const
        : 'voided' as const,
      archived: contract.status === 'archived',
      voided: contract.status === 'voided',
      signingDate: contract.signingDate,
      sourceQuoteId: contract.sourceQuoteId,
    };
  }).filter((s): s is import('./types').SupplementContractSummary => s !== null);
}
