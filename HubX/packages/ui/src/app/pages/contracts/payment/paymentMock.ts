// ========================================
// 回款看板 - Mock 数据
// 覆盖五态：normal / upcoming / overdue / blocked / settled
// ========================================

import type { Contract, PaymentBlocker, DunningRecord, CollectionRecord } from '../types';

const TODAY = '2026-08-19';

/** 五态合同 mock */
export const mockPaymentContracts: Contract[] = [
  // 1. 正常回款（待付期次距今 >7 天）
  {
    id: 'pay-1',
    contractNo: 'HT-2026-001',
    name: '智慧医疗平台',
    customerName: 'XX医院',
    totalAmount: 500000,
    status: 'active',
    salesOwner: '张销售',
    projectManager: 'PM王工',
    signingDate: '2026-04-01',
    paymentPlans: [
      { periodNo: 1, planName: '首期款', amount: 150000, expectedDate: '2026-04-15', status: 'received' },
      { periodNo: 2, planName: '中期款', amount: 200000, expectedDate: '2026-09-15', status: 'pending' },
      { periodNo: 3, planName: '验收款', amount: 100000, expectedDate: '2026-11-15', status: 'pending' },
      { periodNo: 4, planName: '尾款', amount: 50000, expectedDate: '2027-02-15', status: 'pending' },
    ],
    collectionRecords: [
      { id: 'cr-1', contractId: 'pay-1', amount: 150000, date: '2026-04-18', method: '对公转账', period: 1 },
    ],
    paymentBlockers: [],
    dunningRecords: [],
  } as Contract,

  // 2. 即将到期（7 天内）
  {
    id: 'pay-2',
    contractNo: 'HT-2026-002',
    name: '电商小程序',
    customerName: 'XX商贸',
    totalAmount: 120000,
    status: 'active',
    salesOwner: '李商务',
    projectManager: 'PM赵工',
    signingDate: '2026-05-01',
    paymentPlans: [
      { periodNo: 1, planName: '首期款', amount: 36000, expectedDate: '2026-05-15', status: 'received' },
      { periodNo: 2, planName: '中期款', amount: 48000, expectedDate: '2026-08-22', status: 'pending' },
      { periodNo: 3, planName: '尾款', amount: 36000, expectedDate: '2026-10-15', status: 'pending' },
    ],
    collectionRecords: [
      { id: 'cr-2', contractId: 'pay-2', amount: 36000, date: '2026-05-18', method: '对公转账', period: 1 },
    ],
    paymentBlockers: [],
    dunningRecords: [
      { id: 'dr-1', contractId: 'pay-2', date: '2026-08-15', method: '电话', contactPerson: '王财务', result: '客户确认本周安排打款', createdBy: '李商务' },
    ],
  } as Contract,

  // 3. 已逾期
  {
    id: 'pay-3',
    contractNo: 'HT-2026-003',
    name: '政务协同系统',
    customerName: 'XX局',
    totalAmount: 800000,
    status: 'active',
    salesOwner: '王销售',
    projectManager: 'PM李工',
    signingDate: '2026-03-01',
    paymentPlans: [
      { periodNo: 1, planName: '首期款', amount: 240000, expectedDate: '2026-03-15', status: 'received' },
      { periodNo: 2, planName: '中期款', amount: 320000, expectedDate: '2026-07-01', status: 'pending' },
      { periodNo: 3, planName: '验收款', amount: 160000, expectedDate: '2026-09-15', status: 'pending' },
      { periodNo: 4, planName: '尾款', amount: 80000, expectedDate: '2026-12-15', status: 'pending' },
    ],
    collectionRecords: [
      { id: 'cr-3', contractId: 'pay-3', amount: 240000, date: '2026-03-20', method: '对公转账', period: 1 },
    ],
    paymentBlockers: [],
    dunningRecords: [
      { id: 'dr-2', contractId: 'pay-3', date: '2026-07-20', method: '微信', contactPerson: '赵科长', result: '客户说在走流程', createdBy: '王销售' },
      { id: 'dr-3', contractId: 'pay-3', date: '2026-08-10', method: '电话', contactPerson: '赵科长', result: '承诺8月底前付款', createdBy: '王销售' },
    ],
  } as Contract,

  // 4. 卡点阻塞
  {
    id: 'pay-4',
    contractNo: 'HT-2026-004',
    name: '物流调度系统',
    customerName: 'XX物流',
    totalAmount: 600000,
    status: 'active',
    salesOwner: '张销售',
    projectManager: 'PM王工',
    signingDate: '2026-02-01',
    paymentPlans: [
      { periodNo: 1, planName: '首期款', amount: 180000, expectedDate: '2026-02-15', status: 'received' },
      { periodNo: 2, planName: '中期款', amount: 120000, expectedDate: '2026-05-20', status: 'received' },
      { periodNo: 3, planName: '验收款', amount: 240000, expectedDate: '2026-07-30', status: 'pending' },
      { periodNo: 4, planName: '质保款', amount: 60000, expectedDate: '2026-10-30', status: 'pending' },
    ],
    collectionRecords: [
      { id: 'cr-4a', contractId: 'pay-4', amount: 180000, date: '2026-02-18', method: '对公转账', period: 1 },
      { id: 'cr-4b', contractId: 'pay-4', amount: 120000, date: '2026-05-25', method: '对公转账', period: 2 },
    ],
    paymentBlockers: [
      {
        id: 'blk-1', contractId: 'pay-4', paymentPeriod: 3, type: 'acceptance_stuck',
        title: '验收卡住', description: '客户信息科副科长离职，新接手人员要求重新核对接口协议文档',
        amountBlocked: 240000, createdAt: '2026-08-01', createdBy: '张销售', ownerId: 'PM王工',
      },
    ],
    dunningRecords: [
      { id: 'dr-4', contractId: 'pay-4', date: '2026-08-04', method: '电话', contactPerson: '王科长', result: '客户表示验收报告已流转至财务科，预计下周二付款', createdBy: '张销售' },
    ],
  } as Contract,

  // 5. 已结清
  {
    id: 'pay-5',
    contractNo: 'HT-2026-005',
    name: '集团官网改版',
    customerName: 'XX集团',
    totalAmount: 150000,
    status: 'completed',
    salesOwner: '赵销售',
    signingDate: '2026-01-01',
    paymentPlans: [
      { periodNo: 1, planName: '首期款', amount: 45000, expectedDate: '2026-01-15', status: 'received' },
      { periodNo: 2, planName: '中期款', amount: 60000, expectedDate: '2026-03-15', status: 'received' },
      { periodNo: 3, planName: '尾款', amount: 45000, expectedDate: '2026-05-15', status: 'received' },
    ],
    collectionRecords: [
      { id: 'cr-5a', contractId: 'pay-5', amount: 45000, date: '2026-01-18', method: '对公转账', period: 1 },
      { id: 'cr-5b', contractId: 'pay-5', amount: 60000, date: '2026-03-20', method: '对公转账', period: 2 },
      { id: 'cr-5c', contractId: 'pay-5', amount: 45000, date: '2026-05-20', method: '对公转账', period: 3 },
    ],
    paymentBlockers: [],
    dunningRecords: [],
  } as Contract,
];

/** 卡点类型标签 */
export const BLOCKER_TYPE_LABELS: Record<string, string> = {
  overdue_unpaid: '逾期未付',
  customer_delay: '客户拖延',
  invoice_unpaid: '开票未回',
  acceptance_stuck: '验收卡住',
  dispute: '合同纠纷',
};

/** 催款方式选项 */
export const DUNNING_METHODS = ['微信', '电话', '当面拜访', '邮件', '公函'] as const;

/** 回款方式选项 */
export const COLLECTION_METHODS = ['对公转账', '微信', '支付宝', '承兑汇票', '其他'] as const;
