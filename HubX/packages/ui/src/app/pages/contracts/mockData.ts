// 合同模块的 mock 初始数据。
// 9 条合同覆盖：
//   - 5 条已归档（沿用 Contracts.tsx 原有合同 1-5，扩字段补上版本/审批历史/扫描件占位）
//   - 1 条 approving（合同 6：审批走到财务节点 pending）
//   - 1 条 pending_mail（合同 7：审批通过待行政打印）
//   - 1 条 pending_return（合同 8：已寄出 9 天，触发 mail_overdue 提醒）

import type {
  ApprovalNode,
  BlockerType,
  Contract,
  ContractFormData,
  ContractVersion,
  PaymentPlanItem,
  PaymentStatus,
  ScanArchiveEntry,
} from './types';
import { renderContractDocument } from './templates';

// --- helpers ---

function approved(step: ApprovalNode['step'], approver: string, time: string, comment = '同意'): ApprovalNode {
  return { step, approver, status: 'approved', time, comment };
}

function pending(step: ApprovalNode['step'], approver: string): ApprovalNode {
  return { step, approver, status: 'pending', time: '', comment: '' };
}

function buildPaymentPlans(total: number, splits: number[]): PaymentPlanItem[] {
  // splits 是百分比（例如 [40, 30, 30]），把 total 按比例分配。
  return splits.map((pct, idx) => ({
    period: idx + 1,
    expectedDate: '',
    amount: Math.round((total * pct) / 100),
    percentage: pct,
  }));
}

function buildFormData(overrides: Partial<ContractFormData>): ContractFormData {
  return {
    contractName: '',
    productCategory: '软件开发',
    signingEntity: '中科软通',
    customerName: '',
    customerContact: '张经理',
    customerPhone: '13800138000',
    customerEmail: 'zhangjing@atech.com',
    customerAddress: '北京市海淀区中关村软件园 18 号楼 5 层',
    customerPostalCode: '100080',
    customerTaxNo: '91110000MA01ABCD1E',
    bankName: '招商银行',
    bankAccount: '6225 8881 1234 5678',
    contractContent:
      '乙方按甲方需求规格说明书完成系统设计、开发、测试、部署及培训，提供 12 个月免费质保。',
    signDate: '2026-03-15',
    effectiveDate: '2026-03-20',
    endDate: '2026-06-20',
    paymentMethod: '对公',
    totalAmount: 0,
    rebateAmount: 0,
    paymentPlans: [],
    templateId: 'software_sales',
    ...overrides,
  };
}

function buildVersionFromForm(
  versionNo: string,
  formData: ContractFormData,
  label: string,
  createdAt: string,
  createdBy = '张三',
): ContractVersion {
  return {
    versionNo,
    formData,
    renderedHtml: renderContractDocument(formData),
    label,
    createdAt,
    createdBy,
  };
}

function buildScanEntry(
  id: string,
  fileName: string,
  uploadedAt: string,
  linkedVersionNo: string,
  isPrimary = true,
): ScanArchiveEntry {
  return {
    id,
    files: [
      {
        id: `${id}-f1`,
        fileName,
        fileSize: 1_200_000,
        mimeType: 'application/pdf',
        uploadedAt,
        uploadedBy: '李四',
      },
    ],
    uploadedAt,
    uploadedBy: '李四',
    isPrimary,
    linkedVersionNo,
    note: '客户回寄盖章件扫描',
  };
}

// --- 8 条合同 ---

export function buildInitialContracts(): Contract[] {
  // ====== 5 条已归档 / 履行中 ======

  // 合同 1: A公司CRM系统开发合同 - 履行中
  const contract1Form = buildFormData({
    contractName: 'A公司CRM系统开发合同',
    customerName: 'A科技公司',
    productCategory: '软件开发',
    totalAmount: 1_200_000,
    signDate: '2026-03-15',
    effectiveDate: '2026-03-20',
    endDate: '2026-06-20',
    paymentPlans: buildPaymentPlans(1_200_000, [40, 30, 30]),
    templateId: 'software_sales',
  });
  const contract1: Contract = {
    id: '1',
    contractNo: 'HT202604001',
    status: 'archived',
    leadId: 'lead-1',
    quoteId: 'quote-1',
    current: contract1Form,
    versionHistory: [
      buildVersionFromForm('V1', contract1Form, '首次保存草稿', '2026-03-10 10:00'),
      buildVersionFromForm('V2', contract1Form, '提交审批前自动保存', '2026-03-12 16:30'),
    ],
    approvalFlow: [
      approved('发起申请', '张三', '2026-03-12 16:30', '提交合同审批'),
      approved('总经理审批', '赵总 - 总经理', '2026-03-14 11:00'),
    ],
    approvedVersionNo: 'V2',
    approvedAt: '2026-03-14 11:00',
    mailedAt: '2026-03-14 18:00',
    archivedScans: [buildScanEntry('scan-1', '合同盖章件-A公司.pdf', '2026-03-19 10:00', 'V2')],
    createdAt: '2026-03-10 10:00',
    createdBy: '张三',
    updatedAt: '2026-04-14 14:00',
    receivedAmount: 800_000,
    receivableAmount: 400_000,
    executionStatus: '履行中',
    collectionRecords: [
      {
        id: 'col-1-1',
        contractId: 'contract-1',
        amount: 320000,
        date: '2026-04-14',
        method: '银行汇款',
        note: '一期付款到账',
      },
      {
        id: 'col-1-2',
        contractId: 'contract-1',
        amount: 160000,
        date: '2026-06-10',
        method: '银行汇款',
        note: '二期部分付款',
      },
    ],
    paymentBlockers: [
      {
        id: 'blocker-1-1',
        contractId: 'contract-1',
        type: 'customer_delay' as BlockerType,
        title: '客户二期尾款迟迟不付',
        description: '已催款3次，客户财务说在走流程但一直没有实质进展',
        amountBlocked: 80000,
        createdAt: '2026-06-20 10:00',
      },
    ],
    dunningRecords: [
      {
        id: 'dun-1-1',
        contractId: 'contract-1',
        date: '2026-06-20',
        method: '电话',
        contactPerson: '王经理',
        result: '对方说在走财务流程',
        nextPlan: '下周再跟进',
      },
      {
        id: 'dun-1-2',
        contractId: 'contract-1',
        date: '2026-06-28',
        method: '微信',
        contactPerson: '王经理',
        result: '未回复',
        nextPlan: '7月5日电话催款',
      },
    ],
    paymentStatus: 'blocked' as PaymentStatus,
  };

  // 合同 2: B公司电商平台合同 - 履行中
  const contract2Form = buildFormData({
    contractName: 'B公司电商平台合同',
    customerName: 'B电商公司',
    productCategory: '系统集成',
    totalAmount: 2_000_000,
    signDate: '2026-03-20',
    effectiveDate: '2026-03-25',
    endDate: '2026-08-25',
    paymentPlans: buildPaymentPlans(2_000_000, [50, 30, 20]),
    templateId: 'service_contract',
  });
  const contract2: Contract = {
    id: '2',
    contractNo: 'HT202604002',
    status: 'archived',
    leadId: 'lead-2',
    current: contract2Form,
    versionHistory: [buildVersionFromForm('V1', contract2Form, '首次保存草稿', '2026-03-18 14:00')],
    approvalFlow: [
      approved('发起申请', '李四', '2026-03-18 14:00'),
      approved('总经理审批', '赵总 - 总经理', '2026-03-19 17:00'),
    ],
    approvedVersionNo: 'V1',
    approvedAt: '2026-03-19 17:00',
    mailedAt: '2026-03-20 10:00',
    archivedScans: [buildScanEntry('scan-2', '合同盖章件-B公司.pdf', '2026-03-25 09:00', 'V1')],
    createdAt: '2026-03-18 14:00',
    createdBy: '李四',
    updatedAt: '2026-04-25 14:00',
    receivedAmount: 1_000_000,
    receivableAmount: 1_000_000,
    executionStatus: '履行中',
    collectionRecords: [
      {
        id: 'col-2-1',
        contractId: 'contract-2',
        amount: 500000,
        date: '2026-05-10',
        method: '银行汇款',
        note: '全款到账',
      },
    ],
    paymentBlockers: [],
    dunningRecords: [],
    paymentStatus: 'settled' as PaymentStatus,
  };

  // 合同 3: C公司移动应用开发合同 - 履行中
  const contract3Form = buildFormData({
    contractName: 'C公司移动应用开发合同',
    customerName: 'C互联网公司',
    productCategory: '软件开发',
    totalAmount: 850_000,
    signDate: '2026-04-01',
    effectiveDate: '2026-04-05',
    endDate: '2026-07-05',
    paymentPlans: buildPaymentPlans(850_000, [40, 30, 30]),
    templateId: 'software_sales',
  });
  const contract3: Contract = {
    id: '3',
    contractNo: 'HT202604003',
    status: 'archived',
    current: contract3Form,
    versionHistory: [buildVersionFromForm('V1', contract3Form, '首次保存草稿', '2026-03-29 10:00')],
    approvalFlow: [
      approved('发起申请', '张三', '2026-03-29 10:00'),
      approved('总经理审批', '赵总 - 总经理', '2026-03-31 11:00'),
    ],
    approvedVersionNo: 'V1',
    approvedAt: '2026-03-31 11:00',
    mailedAt: '2026-04-01 09:00',
    archivedScans: [buildScanEntry('scan-3', '合同盖章件-C公司.pdf', '2026-04-04 14:00', 'V1')],
    createdAt: '2026-03-29 10:00',
    createdBy: '张三',
    updatedAt: '2026-05-05 10:00',
    receivedAmount: 400_000,
    receivableAmount: 450_000,
    executionStatus: '履行中',
  };

  // 合同 4: D公司数据中台建设合同 - 履行中
  const contract4Form = buildFormData({
    contractName: 'D公司数据中台建设合同',
    customerName: 'D数据公司',
    productCategory: '系统集成',
    totalAmount: 1_500_000,
    signDate: '2026-02-10',
    effectiveDate: '2026-02-15',
    endDate: '2026-05-15',
    paymentPlans: buildPaymentPlans(1_500_000, [60, 30, 10]),
    templateId: 'service_contract',
  });
  const contract4: Contract = {
    id: '4',
    contractNo: 'HT202604004',
    status: 'archived',
    current: contract4Form,
    versionHistory: [buildVersionFromForm('V1', contract4Form, '首次保存草稿', '2026-02-08 09:00')],
    approvalFlow: [
      approved('发起申请', '李四', '2026-02-08 09:00'),
      approved('总经理审批', '赵总 - 总经理', '2026-02-09 16:00'),
    ],
    approvedVersionNo: 'V1',
    approvedAt: '2026-02-09 16:00',
    mailedAt: '2026-02-10 09:00',
    archivedScans: [buildScanEntry('scan-4', '合同盖章件-D公司.pdf', '2026-02-14 11:00', 'V1')],
    createdAt: '2026-02-08 09:00',
    createdBy: '李四',
    updatedAt: '2026-05-12 16:00',
    receivedAmount: 1_350_000,
    receivableAmount: 150_000,
    executionStatus: '履行中',
  };

  // 合同 5: E公司小程序开发合同 - 已完成
  const contract5Form = buildFormData({
    contractName: 'E公司小程序开发合同',
    customerName: 'E零售公司',
    productCategory: '软件开发',
    totalAmount: 550_000,
    signDate: '2026-03-01',
    effectiveDate: '2026-03-05',
    endDate: '2026-05-05',
    paymentPlans: buildPaymentPlans(550_000, [50, 50]),
    templateId: 'software_sales',
  });
  const contract5: Contract = {
    id: '5',
    contractNo: 'HT202603005',
    status: 'archived',
    current: contract5Form,
    versionHistory: [buildVersionFromForm('V1', contract5Form, '首次保存草稿', '2026-02-26 10:00')],
    approvalFlow: [
      approved('发起申请', '张三', '2026-02-26 10:00'),
      approved('总经理审批', '赵总 - 总经理', '2026-02-27 16:00'),
    ],
    approvedVersionNo: 'V1',
    approvedAt: '2026-02-27 16:00',
    mailedAt: '2026-02-28 10:00',
    archivedScans: [buildScanEntry('scan-5', '合同盖章件-E公司.pdf', '2026-03-04 14:00', 'V1')],
    createdAt: '2026-02-26 10:00',
    createdBy: '张三',
    updatedAt: '2026-05-06 10:00',
    receivedAmount: 550_000,
    receivableAmount: 0,
    executionStatus: '已完成',
  };

  // 合同 9: 华信科技内部OA流程优化合同 - 履行中
  const contract9Form = buildFormData({
    contractName: '华信科技内部OA流程优化合同',
    signingEntity: '中科软艺',
    customerName: '华信科技有限公司',
    customerContact: '周经理',
    customerPhone: '13800009999',
    customerEmail: 'zhou@huaxin.example.com',
    customerAddress: '北京市朝阳区科技园路88号',
    customerTaxNo: '91110105HXOA202609',
    bankName: '中国工商银行北京朝阳支行',
    bankAccount: '1100 2000 3000 4000 500',
    productCategory: '软件开发',
    totalAmount: 960_000,
    signDate: '2026-06-20',
    effectiveDate: '2026-06-23',
    endDate: '2026-10-30',
    paymentPlans: buildPaymentPlans(960_000, [40, 40, 20]),
    templateId: 'software_sales',
  });
  const contract9: Contract = {
    id: '9',
    contractNo: 'HT202606009',
    status: 'archived',
    leadId: 'lead-9',
    quoteId: 'quote-9',
    current: contract9Form,
    versionHistory: [
      buildVersionFromForm('V1', contract9Form, '首次保存草稿', '2026-06-16 10:00'),
      buildVersionFromForm('V2', contract9Form, '根据客户确认原型更新流程范围', '2026-06-18 15:30'),
    ],
    approvalFlow: [
      approved('发起申请', '张三', '2026-06-18 15:30', '提交合同审批'),
      approved('总经理审批', '赵总 - 总经理', '2026-06-19 16:20'),
    ],
    approvedVersionNo: 'V2',
    approvedAt: '2026-06-19 16:20',
    mailedAt: '2026-06-20 10:00',
    archivedScans: [
      buildScanEntry('scan-9', '华信科技OA流程优化合同盖章件.pdf', '2026-06-22 14:00', 'V2'),
    ],
    createdAt: '2026-06-16 10:00',
    createdBy: '张三',
    updatedAt: '2026-07-21 16:30',
    receivedAmount: 384_000,
    receivableAmount: 576_000,
    executionStatus: '履行中',
    collectionRecords: [
      {
        id: 'col-9-1',
        contractId: '9',
        period: 1,
        amount: 384_000,
        date: '2026-06-25',
        method: '银行转账',
        note: '首期款已到账',
      },
    ],
    paymentBlockers: [],
    dunningRecords: [],
    paymentStatus: 'upcoming' as PaymentStatus,
  };

  // ====== 3 条形成期演示数据 ======

  // 合同 6: F公司CRM定制 - 审批中（财务节点 pending）
  const contract6Form = buildFormData({
    contractName: 'F公司CRM定制开发合同',
    customerName: 'F信息公司',
    productCategory: '软件开发',
    totalAmount: 680_000,
    signDate: '2026-06-12',
    effectiveDate: '2026-06-15',
    endDate: '2026-09-15',
    paymentPlans: buildPaymentPlans(680_000, [40, 40, 20]),
    templateId: 'software_sales',
  });
  const contract6: Contract = {
    id: '6',
    contractNo: 'HT202606006',
    status: 'approving',
    leadId: 'lead-6',
    quoteId: 'quote-6',
    current: contract6Form,
    versionHistory: [
      buildVersionFromForm('V1', contract6Form, '首次保存草稿', '2026-06-10 14:00'),
      buildVersionFromForm('V2', contract6Form, '提交审批前自动保存', '2026-06-11 09:30'),
    ],
    approvalFlow: [
      approved('发起申请', '张三', '2026-06-11 09:30', '提交合同审批'),
      pending('总经理审批', '赵总 - 总经理'),
    ],
    archivedScans: [],
    createdAt: '2026-06-10 14:00',
    createdBy: '张三',
    updatedAt: '2026-06-11 15:00',
  };

  // 合同 7: G公司SaaS订阅 - 待寄出（审批通过等行政打印盖章）
  const contract7Form = buildFormData({
    contractName: 'G公司SaaS年度订阅合同',
    customerName: 'G教育集团',
    productCategory: '云服务',
    totalAmount: 360_000,
    signDate: '2026-06-08',
    effectiveDate: '2026-07-01',
    endDate: '2027-06-30',
    paymentPlans: buildPaymentPlans(360_000, [100]),
    paymentMethod: '对公',
    templateId: 'cloud_service',
  });
  const contract7: Contract = {
    id: '7',
    contractNo: 'HT202606007',
    status: 'pending_mail',
    leadId: 'lead-7',
    quoteId: 'quote-7',
    current: contract7Form,
    versionHistory: [
      buildVersionFromForm('V1', contract7Form, '首次保存草稿', '2026-06-06 10:00'),
      buildVersionFromForm('V2', contract7Form, '提交审批前自动保存', '2026-06-07 14:00'),
    ],
    approvalFlow: [
      approved('发起申请', '李四', '2026-06-07 14:00'),
      approved('总经理审批', '赵总 - 总经理', '2026-06-08 16:00'),
    ],
    approvedVersionNo: 'V2',
    approvedAt: '2026-06-08 16:00',
    archivedScans: [],
    createdAt: '2026-06-06 10:00',
    createdBy: '李四',
    updatedAt: '2026-06-08 16:00',
  };

  // 合同 8: H公司技术服务 - 待回寄（已寄出 9 天，触发 mail_overdue）
  const contract8Form = buildFormData({
    contractName: 'H公司年度技术服务合同',
    customerName: 'H制造公司',
    productCategory: '技术服务',
    totalAmount: 480_000,
    signDate: '2026-06-01',
    effectiveDate: '2026-06-05',
    endDate: '2027-06-04',
    paymentPlans: buildPaymentPlans(480_000, [50, 50]),
    templateId: 'service_contract',
  });
  const contract8: Contract = {
    id: '8',
    contractNo: 'HT202606008',
    status: 'pending_return',
    leadId: 'lead-8',
    current: contract8Form,
    versionHistory: [
      buildVersionFromForm('V1', contract8Form, '首次保存草稿', '2026-05-30 09:00'),
      buildVersionFromForm('V2', contract8Form, '提交审批前自动保存', '2026-06-02 10:00'),
    ],
    approvalFlow: [
      approved('发起申请', '张三', '2026-06-02 10:00'),
      approved('总经理审批', '赵总 - 总经理', '2026-06-03 14:00'),
    ],
    approvedVersionNo: 'V2',
    approvedAt: '2026-06-03 14:00',
    mailedAt: '2026-06-04 10:00', // 比"今天"早 9 天，触发回寄超期
    archivedScans: [],
    createdAt: '2026-05-30 09:00',
    createdBy: '张三',
    updatedAt: '2026-06-04 10:00',
  };

  // ====== 6 条真实未交付项目合同（2026-08-25 进度汇报） ======

  // 合同 10: 智能家居系统 - 逾期130天
  const contract10Form = buildFormData({
    contractName: '智能家居系统开发合同',
    customerName: '智能家居客户',
    productCategory: '软件开发',
    totalAmount: 88000,
    signDate: '2026-02-09',
    effectiveDate: '2026-02-09',
    endDate: '2026-04-10',
    paymentPlans: [
      { period: 1, periodName: '首付款', amount: 26400, percentage: 30, expectedDate: '2026-02-12', expectedDateType: 'natural', expectedDays: 3, condition: '合同签订3个自然日' },
      { period: 2, periodName: 'UI确认款', amount: 26400, percentage: 30, expectedDate: '2026-04-24', expectedDateType: 'natural', expectedDays: 3, condition: 'UI确认3个自然日内' },
      { period: 3, periodName: '验收款', amount: 26400, percentage: 30, expectedDate: '2026-09-10', expectedDateType: 'natural', condition: '开发完成并上线，通过客户验收' },
      { period: 4, periodName: '尾款', amount: 8800, percentage: 10, expectedDate: '2026-09-25', expectedDateType: 'natural', expectedDays: 14, condition: '上线两周后' },
    ],
    templateId: 'software_sales',
  });
  const contract10: Contract = {
    id: '10', contractNo: 'HT202602010', status: 'archived',
    current: contract10Form,
    versionHistory: [buildVersionFromForm('V1', contract10Form, '首次保存草稿', '2026-02-09 09:00')],
    approvalFlow: [approved('发起申请', '严总', '2026-02-09 09:00'), approved('总经理审批', '赵总', '2026-02-09 10:00')],
    approvedVersionNo: 'V1', approvedAt: '2026-02-09 10:00',
    archivedScans: [], createdAt: '2026-02-09 09:00', createdBy: '严总', updatedAt: '2026-08-25 15:00',
    receivedAmount: 52800, receivableAmount: 35200, executionStatus: '履行中',
    collectionRecords: [
      { id: 'col-10-1', contractId: '10', period: 1, amount: 26400, date: '2026-02-12', method: '银行转账', note: '首期款30%已支付' },
      { id: 'col-10-2', contractId: '10', period: 2, amount: 26400, date: '2026-04-24', method: '银行转账', note: '二期款30%已支付（UI确认后）' },
    ],
    paymentBlockers: [], dunningRecords: [], paymentStatus: 'overdue' as PaymentStatus,
  };

  // 合同 11: 智能酒店一期 - 逾期80天
  const contract11Form = buildFormData({
    contractName: '智能酒店一期开发合同',
    customerName: '智能酒店客户',
    productCategory: '软件开发',
    totalAmount: 80000,
    signDate: '2026-04-20',
    effectiveDate: '2026-04-20',
    endDate: '2026-06-04',
    paymentPlans: [
      { period: 1, periodName: '首付款', amount: 48000, percentage: 60, expectedDate: '2026-04-23', expectedDateType: 'workday', expectedDays: 3, condition: '合同签订后3个工作日' },
      { period: 2, periodName: '验收款', amount: 16000, percentage: 20, expectedDate: '2026-09-25', expectedDateType: 'natural', expectedDays: 3, condition: '验收后3个自然日' },
      { period: 3, periodName: '尾款', amount: 16000, percentage: 20, expectedDate: '2026-10-25', expectedDateType: 'natural', expectedDays: 30, condition: '上线1个月' },
    ],
    templateId: 'software_sales',
  });
  const contract11: Contract = {
    id: '11', contractNo: 'HT202604011', status: 'archived',
    current: contract11Form,
    versionHistory: [buildVersionFromForm('V1', contract11Form, '首次保存草稿', '2026-04-20 09:00')],
    approvalFlow: [approved('发起申请', '严总', '2026-04-20 09:00'), approved('总经理审批', '赵总', '2026-04-20 10:00')],
    approvedVersionNo: 'V1', approvedAt: '2026-04-20 10:00',
    archivedScans: [], createdAt: '2026-04-20 09:00', createdBy: '严总', updatedAt: '2026-08-25 18:20',
    receivedAmount: 48000, receivableAmount: 32000, executionStatus: '履行中',
    collectionRecords: [
      { id: 'col-11-1', contractId: '11', period: 1, amount: 48000, date: '2026-04-22', method: '银行转账', note: '首期款60%已支付' },
    ],
    paymentBlockers: [], dunningRecords: [], paymentStatus: 'upcoming' as PaymentStatus,
  };

  // 合同 12: 中铁信息化安全平台 - 即将逾期
  const contract12Form = buildFormData({
    contractName: '中铁信息化安全平台开发合同',
    customerName: '中铁客户',
    productCategory: '软件开发',
    totalAmount: 23000,
    signDate: '2026-06-03',
    effectiveDate: '2026-06-03',
    endDate: '2026-08-02',
    paymentPlans: [
      { period: 1, periodName: '首付款', amount: 11500, percentage: 50, expectedDate: '2026-06-24', expectedDateType: 'workday', expectedDays: 15, condition: '合同签订后15个工作日' },
      { period: 2, periodName: '验收款', amount: 9200, percentage: 40, expectedDate: '2026-07-24', expectedDateType: 'workday', expectedDays: 15, condition: '验收后15个工作日' },
      { period: 3, periodName: '尾款', amount: 2300, percentage: 10, expectedDate: '2026-09-10', expectedDateType: 'natural', expectedDays: 14, condition: '上线到正式2周后' },
    ],
    templateId: 'software_sales',
  });
  const contract12: Contract = {
    id: '12', contractNo: 'HT202606012', status: 'archived',
    current: contract12Form,
    versionHistory: [buildVersionFromForm('V1', contract12Form, '首次保存草稿', '2026-06-03 09:00')],
    approvalFlow: [approved('发起申请', '王进', '2026-06-03 09:00'), approved('总经理审批', '赵总', '2026-06-03 10:00')],
    approvedVersionNo: 'V1', approvedAt: '2026-06-03 10:00',
    archivedScans: [], createdAt: '2026-06-03 09:00', createdBy: '王进', updatedAt: '2026-08-25 17:00',
    receivedAmount: 20700, receivableAmount: 2300, executionStatus: '履行中',
    collectionRecords: [
      { id: 'col-12-1', contractId: '12', period: 1, amount: 11500, date: '2026-06-16', method: '银行转账', note: '首期款50%已支付' },
      { id: 'col-12-2', contractId: '12', period: 2, amount: 9200, date: '2026-07-24', method: '银行转账', note: '验收款40%已支付' },
    ],
    paymentBlockers: [], dunningRecords: [], paymentStatus: 'upcoming' as PaymentStatus,
  };

  // 合同 13: 小红书插件 - 开发中
  const contract13Form = buildFormData({
    contractName: '小红书插件开发合同',
    customerName: '小红书插件客户',
    productCategory: '软件开发',
    totalAmount: 20000,
    signDate: '2026-08-13',
    effectiveDate: '2026-08-13',
    endDate: '2026-09-12',
    paymentPlans: [
      { period: 1, periodName: '首付款', amount: 10000, percentage: 50, expectedDate: '2026-08-13', expectedDateType: 'fixed', condition: '合同签订当日' },
      { period: 2, periodName: '验收款', amount: 8000, percentage: 40, expectedDate: '2026-08-15', expectedDateType: 'fixed', condition: '验收通过' },
      { period: 3, periodName: '尾款', amount: 2000, percentage: 10, expectedDate: '2026-09-15', expectedDateType: 'natural', condition: '上线后' },
    ],
    templateId: 'software_sales',
  });
  const contract13: Contract = {
    id: '13', contractNo: 'HT202608013', status: 'archived',
    current: contract13Form,
    versionHistory: [buildVersionFromForm('V1', contract13Form, '首次保存草稿', '2026-08-13 09:00')],
    approvalFlow: [approved('发起申请', '张三', '2026-08-13 09:00'), approved('总经理审批', '赵总', '2026-08-13 10:00')],
    approvedVersionNo: 'V1', approvedAt: '2026-08-13 10:00',
    archivedScans: [], createdAt: '2026-08-13 09:00', createdBy: '张三', updatedAt: '2026-08-25 10:00',
    receivedAmount: 10000, receivableAmount: 10000, executionStatus: '履行中',
    collectionRecords: [
      { id: 'col-13-1', contractId: '13', period: 1, amount: 10000, date: '2026-08-13', method: '银行转账', note: '首期款50%已支付' },
    ],
    paymentBlockers: [], dunningRecords: [], paymentStatus: 'normal' as PaymentStatus,
  };

  // 合同 14: 汽车配件索赔 - 验收中
  const contract14Form = buildFormData({
    contractName: '汽车配件索赔系统开发合同',
    customerName: '汽车配件客户',
    productCategory: '软件开发',
    totalAmount: 18000,
    signDate: '2026-07-30',
    effectiveDate: '2026-07-30',
    endDate: '2026-09-03',
    paymentPlans: [
      { period: 1, periodName: '首付款', amount: 9000, percentage: 50, expectedDate: '2026-07-31', expectedDateType: 'natural', expectedDays: 1, condition: '合同签订次日' },
      { period: 2, periodName: '验收款', amount: 7200, percentage: 40, expectedDate: '2026-09-05', expectedDateType: 'fixed', condition: '验收通过' },
      { period: 3, periodName: '尾款', amount: 1800, percentage: 10, expectedDate: '2026-09-20', expectedDateType: 'natural', expectedDays: 17, condition: '上线运行2周后3个工作日' },
    ],
    templateId: 'software_sales',
  });
  const contract14: Contract = {
    id: '14', contractNo: 'HT202607014', status: 'archived',
    current: contract14Form,
    versionHistory: [buildVersionFromForm('V1', contract14Form, '首次保存草稿', '2026-07-30 09:00')],
    approvalFlow: [approved('发起申请', '吴丹丹', '2026-07-30 09:00'), approved('总经理审批', '赵总', '2026-07-30 10:00')],
    approvedVersionNo: 'V1', approvedAt: '2026-07-30 10:00',
    archivedScans: [], createdAt: '2026-07-30 09:00', createdBy: '吴丹丹', updatedAt: '2026-08-25 10:00',
    receivedAmount: 9000, receivableAmount: 9000, executionStatus: '履行中',
    collectionRecords: [
      { id: 'col-14-1', contractId: '14', period: 1, amount: 9000, date: '2026-07-31', method: '银行转账', note: '首期款50%已支付' },
    ],
    paymentBlockers: [], dunningRecords: [], paymentStatus: 'upcoming' as PaymentStatus,
  };

  // 合同 15: 重庆B端一期 - 催款中
  const contract15Form = buildFormData({
    contractName: '重庆B端一期开发合同',
    customerName: '重庆B端客户',
    productCategory: '软件开发',
    totalAmount: 50000,
    signDate: '2026-06-01',
    effectiveDate: '2026-06-01',
    endDate: '2026-08-15',
    paymentPlans: buildPaymentPlans(50000, [50, 40, 10]),
    templateId: 'software_sales',
  });
  const contract15: Contract = {
    id: '15', contractNo: 'HT202606015', status: 'archived',
    current: contract15Form,
    versionHistory: [buildVersionFromForm('V1', contract15Form, '首次保存草稿', '2026-06-01 09:00')],
    approvalFlow: [approved('发起申请', '黄奕', '2026-06-01 09:00'), approved('总经理审批', '赵总', '2026-06-01 10:00')],
    approvedVersionNo: 'V1', approvedAt: '2026-06-01 10:00',
    archivedScans: [], createdAt: '2026-06-01 09:00', createdBy: '黄奕', updatedAt: '2026-08-25 10:00',
    receivedAmount: 25000, receivableAmount: 25000, executionStatus: '履行中',
    collectionRecords: [
      { id: 'col-15-1', contractId: '15', period: 1, amount: 25000, date: '2026-06-05', method: '银行转账', note: '首期款50%已支付' },
    ],
    paymentBlockers: [], dunningRecords: [], paymentStatus: 'overdue' as PaymentStatus,
  };

  // 帕奇宠 C 端一期：生产项目 112 的详情页关联演示合同
  const pawkeyContractForm = buildFormData({
    contractName: '帕奇宠C端需求调研及原型设计',
    customerName: '重庆绮算法科技有限公司',
    customerContact: '甲方产品负责人',
    customerPhone: '138****5942',
    customerEmail: 'product@pawkey-demo.example.com',
    customerAddress: '重庆市渝北区数字产业园（演示地址）',
    customerTaxNo: '91500100DEMO05942X',
    productCategory: '产品设计与系统架构设计',
    contractContent: '乙方完成帕奇宠 C 端一期需求调研、产品方案、交互原型、UI 视觉规范、系统架构设计及终验交付材料。',
    totalAmount: 100000,
    signDate: '2026-06-01',
    effectiveDate: '2026-06-01',
    endDate: '2026-08-28',
    paymentPlans: [
      { period: 1, periodName: '首期款', amount: 50000, percentage: 50, expectedDate: '2026-06-05', expectedDateType: 'fixed', condition: '合同签订并生效' },
      { period: 2, periodName: '二期款', amount: 30000, percentage: 30, expectedDate: '2026-07-10', expectedDateType: 'fixed', condition: '核心体验原型确认' },
      { period: 3, periodName: '三期款', amount: 10000, percentage: 10, expectedDate: '2026-07-31', expectedDateType: 'fixed', condition: 'UI 与系统架构设计确认' },
      { period: 4, periodName: '尾款', amount: 10000, percentage: 10, expectedDate: '2026-08-28', expectedDateType: 'fixed', condition: '一期终验单签署' },
    ],
    templateId: 'software_sales',
  });
  const pawkeyContract: Contract = {
    id: 'pawkey-c1',
    contractNo: 'ZKRTHT-20260819001',
    status: 'archived',
    kind: 'main',
    leadId: 'pawkey-lead-5942',
    quoteId: 'pawkey-q1',
    projectId: 'prod-112',
    current: pawkeyContractForm,
    versionHistory: [
      buildVersionFromForm('V1', pawkeyContractForm, '首次保存草稿', '2026-05-25 10:00', '黄奕'),
      buildVersionFromForm('V2', pawkeyContractForm, '按甲方确认范围修订并提交审批', '2026-05-29 16:20', '黄奕'),
    ],
    approvalFlow: [
      approved('发起申请', '黄奕', '2026-05-29 16:20', '提交帕奇宠 C 端一期合同审批'),
      approved('总经理审批', '总经理', '2026-05-31 11:00'),
    ],
    approvedVersionNo: 'V2',
    approvedAt: '2026-05-31 11:00',
    mailedAt: '2026-05-31 16:00',
    archivedScans: [buildScanEntry('pawkey-scan-1', '帕奇宠C端一期合同盖章件.pdf', '2026-06-03 10:20', 'V2')],
    createdAt: '2026-05-25 10:00',
    createdBy: '黄奕',
    updatedAt: '2026-08-29 18:00',
    receivedAmount: 90000,
    receivableAmount: 10000,
    executionStatus: '履行中',
    collectionRecords: [
      { id: 'pawkey-col-1', contractId: 'pawkey-c1', projectId: 'prod-112', period: 1, amount: 50000, date: '2026-06-05', method: '银行转账', note: '合同首期款到账' },
      { id: 'pawkey-col-2', contractId: 'pawkey-c1', projectId: 'prod-112', period: 2, amount: 30000, date: '2026-07-10', method: '银行转账', note: '核心体验原型确认款到账' },
      { id: 'pawkey-col-3', contractId: 'pawkey-c1', projectId: 'prod-112', period: 3, amount: 10000, date: '2026-07-31', method: '银行转账', note: 'UI 与系统架构设计确认款到账' },
    ],
    paymentBlockers: [
      { id: 'pawkey-payment-blocker-1', contractId: 'pawkey-c1', type: 'acceptance_stuck', title: '终验尾款待功能清单审查完成', description: '甲方尚未返回最终审查结论，终验单与 10% 尾款暂未闭环。', amountBlocked: 10000, createdAt: '2026-08-29 18:00' },
    ],
    dunningRecords: [
      { id: 'pawkey-dunning-1', contractId: 'pawkey-c1', date: '2026-08-29', method: '项目群', contactPerson: '甲方产品负责人', result: '确认先完成终验功能清单审查，再安排尾款流程。', nextPlan: '9 月 3 日跟进最终审查意见与终验单签署。' },
    ],
    paymentStatus: 'blocked' as PaymentStatus,
  };

  const pawkeyExperienceSupplementForm = buildFormData({
    contractName: '帕奇宠C端一期体验增强补充合同',
    customerName: '重庆绮算法科技有限公司',
    customerContact: '甲方产品负责人',
    customerPhone: '138****5942',
    customerEmail: 'product@pawkey-demo.example.com',
    customerAddress: '重庆市渝北区数字产业园（演示地址）',
    customerTaxNo: '91500100DEMO05942X',
    productCategory: '交互体验与双端适配增项',
    contractContent: '增加生命流长图分享、互动反馈细化、系统大字体适配及双端发布检查，纳入一期统一测试与验收。',
    totalAmount: 28000,
    signDate: '2026-07-18',
    effectiveDate: '2026-07-18',
    endDate: '2026-08-12',
    paymentPlans: [
      { period: 1, periodName: '首期款', amount: 14000, percentage: 50, expectedDate: '2026-07-22', expectedDateType: 'fixed', condition: '增补交互范围与 UI 方案确认' },
      { period: 2, periodName: '尾款', amount: 14000, percentage: 50, expectedDate: '2026-08-12', expectedDateType: 'fixed', condition: '增补功能测试版发布' },
    ],
    templateId: 'software_sales',
  });
  const pawkeyExperienceSupplement: Contract = {
    id: 'pawkey-c1-s1',
    contractNo: 'ZKRTHT-20260718001-B01',
    status: 'archived',
    kind: 'supplement',
    parentContractId: 'pawkey-c1',
    sourceQuoteId: 'pawkey-sq1',
    leadId: 'pawkey-lead-5942',
    quoteId: 'pawkey-q1',
    projectId: 'prod-112',
    current: pawkeyExperienceSupplementForm,
    versionHistory: [
      buildVersionFromForm('V1', pawkeyExperienceSupplementForm, '体验增强增项确认稿', '2026-07-16 15:20', '何江奇'),
    ],
    approvalFlow: [
      approved('发起申请', '黄奕', '2026-07-16 16:00', '提交体验增强补充合同审批'),
      approved('总经理审批', '总经理', '2026-07-17 11:30'),
    ],
    approvedVersionNo: 'V1',
    approvedAt: '2026-07-17 11:30',
    mailedAt: '2026-07-18 10:00',
    archivedScans: [buildScanEntry('pawkey-s1-scan-1', '帕奇宠C端一期体验增强补充合同盖章件.pdf', '2026-07-20 17:20', 'V1')],
    createdAt: '2026-07-16 15:20',
    createdBy: '何江奇',
    updatedAt: '2026-08-13 15:10',
    receivedAmount: 28000,
    receivableAmount: 0,
    executionStatus: '已完成',
    collectionRecords: [
      { id: 'pawkey-s1-col-1', contractId: 'pawkey-c1-s1', projectId: 'prod-112', period: 1, amount: 14000, date: '2026-07-22', method: '银行转账', note: '体验增强补充合同首期款到账' },
      { id: 'pawkey-s1-col-2', contractId: 'pawkey-c1-s1', projectId: 'prod-112', period: 2, amount: 14000, date: '2026-08-13', method: '银行转账', note: '测试版发布后补充合同尾款到账' },
    ],
    paymentBlockers: [],
    dunningRecords: [],
    paymentStatus: 'settled' as PaymentStatus,
  };

  const pawkeyAiSupplementForm = buildFormData({
    contractName: '帕奇宠C端一期AI陪伴能力接入补充合同',
    customerName: '重庆绮算法科技有限公司',
    customerContact: '甲方技术负责人',
    customerPhone: '138****5942',
    customerEmail: 'tech@pawkey-demo.example.com',
    customerAddress: '重庆市渝北区数字产业园（演示地址）',
    customerTaxNo: '91500100DEMO05942X',
    productCategory: 'AI 能力接入增项',
    contractContent: '补充 AI 陪伴能力适配层、调用降级策略、内容安全接口和甲方自有服务接入说明，随一期终验统一交付。',
    totalAmount: 16000,
    signDate: '2026-08-08',
    effectiveDate: '2026-08-08',
    endDate: '2026-09-05',
    paymentPlans: [
      { period: 1, periodName: '首期款', amount: 8000, percentage: 50, expectedDate: '2026-08-10', expectedDateType: 'fixed', condition: 'AI 陪伴能力接口方案确认' },
      { period: 2, periodName: '尾款', amount: 8000, percentage: 50, expectedDate: '2026-09-05', expectedDateType: 'fixed', condition: 'AI 陪伴能力增补范围终验' },
    ],
    templateId: 'software_sales',
  });
  const pawkeyAiSupplement: Contract = {
    id: 'pawkey-c1-s2',
    contractNo: 'ZKRTHT-20260808001-B02',
    status: 'archived',
    kind: 'supplement',
    parentContractId: 'pawkey-c1',
    sourceQuoteId: 'pawkey-sq2',
    leadId: 'pawkey-lead-5942',
    quoteId: 'pawkey-q1',
    projectId: 'prod-112',
    current: pawkeyAiSupplementForm,
    versionHistory: [
      buildVersionFromForm('V1', pawkeyAiSupplementForm, 'AI 能力接入增项确认稿', '2026-08-06 14:40', '陈周伟'),
    ],
    approvalFlow: [
      approved('发起申请', '黄奕', '2026-08-06 15:00', '提交 AI 能力接入补充合同审批'),
      approved('总经理审批', '总经理', '2026-08-07 10:20'),
    ],
    approvedVersionNo: 'V1',
    approvedAt: '2026-08-07 10:20',
    mailedAt: '2026-08-08 09:30',
    archivedScans: [buildScanEntry('pawkey-s2-scan-1', '帕奇宠C端一期AI陪伴能力接入补充合同盖章件.pdf', '2026-08-10 16:10', 'V1')],
    createdAt: '2026-08-06 14:40',
    createdBy: '陈周伟',
    updatedAt: '2026-08-29 18:10',
    receivedAmount: 8000,
    receivableAmount: 8000,
    executionStatus: '履行中',
    collectionRecords: [
      { id: 'pawkey-s2-col-1', contractId: 'pawkey-c1-s2', projectId: 'prod-112', period: 1, amount: 8000, date: '2026-08-11', method: '银行转账', note: 'AI 能力接入补充合同首期款到账' },
    ],
    paymentBlockers: [
      { id: 'pawkey-s2-blocker-1', contractId: 'pawkey-c1-s2', type: 'acceptance_stuck', title: 'AI 增补尾款随一期终验支付', description: '终验单签署后进入 8000 元尾款支付流程。', amountBlocked: 8000, createdAt: '2026-08-29 18:10' },
    ],
    dunningRecords: [
      { id: 'pawkey-s2-dunning-1', contractId: 'pawkey-c1-s2', date: '2026-08-29', method: '项目群', contactPerson: '甲方技术负责人', result: '确认 AI 增补范围随一期统一终验。', nextPlan: '终验单回签后提交尾款付款申请。' },
    ],
    paymentStatus: 'blocked' as PaymentStatus,
  };

  return [
    contract1, contract2, contract3, contract4, contract5, contract9, contract6, contract7,
    contract8, contract10, contract11, contract12, contract13, contract14, contract15,
    pawkeyContract, pawkeyExperienceSupplement, pawkeyAiSupplement,
  ];
}
