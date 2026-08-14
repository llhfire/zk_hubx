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
      approved('商务审核', '王经理 - 商务主管', '2026-03-13 09:20'),
      approved('财务审核', '陈财务 - 财务总监', '2026-03-13 14:10'),
      approved('法务审核', '赵律师 - 法务部', '2026-03-14 11:00'),
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
      approved('商务审核', '王经理 - 商务主管', '2026-03-19 09:00'),
      approved('财务审核', '陈财务 - 财务总监', '2026-03-19 13:00'),
      approved('法务审核', '赵律师 - 法务部', '2026-03-19 17:00'),
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
      approved('商务审核', '王经理 - 商务主管', '2026-03-30 09:00'),
      approved('财务审核', '陈财务 - 财务总监', '2026-03-30 14:00'),
      approved('法务审核', '赵律师 - 法务部', '2026-03-31 11:00'),
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
      approved('商务审核', '王经理 - 商务主管', '2026-02-08 14:00'),
      approved('财务审核', '陈财务 - 财务总监', '2026-02-09 10:00'),
      approved('法务审核', '赵律师 - 法务部', '2026-02-09 16:00'),
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
      approved('商务审核', '王经理 - 商务主管', '2026-02-26 15:00'),
      approved('财务审核', '陈财务 - 财务总监', '2026-02-27 10:00'),
      approved('法务审核', '赵律师 - 法务部', '2026-02-27 16:00'),
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
      approved('商务审核', '王经理 - 商务主管', '2026-06-19 09:10'),
      approved('财务审核', '陈财务 - 财务总监', '2026-06-19 13:40'),
      approved('法务审核', '赵律师 - 法务部', '2026-06-19 16:20'),
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
      approved('商务审核', '王经理 - 商务主管', '2026-06-11 15:00'),
      pending('财务审核', '陈财务 - 财务总监'),
      pending('法务审核', '赵律师 - 法务部'),
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
      approved('商务审核', '王经理 - 商务主管', '2026-06-08 09:00'),
      approved('财务审核', '陈财务 - 财务总监', '2026-06-08 13:00'),
      approved('法务审核', '赵律师 - 法务部', '2026-06-08 16:00'),
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
      approved('商务审核', '王经理 - 商务主管', '2026-06-02 15:00'),
      approved('财务审核', '陈财务 - 财务总监', '2026-06-03 09:00'),
      approved('法务审核', '赵律师 - 法务部', '2026-06-03 14:00'),
    ],
    approvedVersionNo: 'V2',
    approvedAt: '2026-06-03 14:00',
    mailedAt: '2026-06-04 10:00', // 比"今天"早 9 天，触发回寄超期
    archivedScans: [],
    createdAt: '2026-05-30 09:00',
    createdBy: '张三',
    updatedAt: '2026-06-04 10:00',
  };

  return [contract1, contract2, contract3, contract4, contract5, contract9, contract6, contract7, contract8];
}
