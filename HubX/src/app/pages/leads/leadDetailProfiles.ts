export interface LeadDetailInfo {
  name: string;
  customer: string;
  contact: string;
  phone: string;
  wechat: string;
  source: string;
  keyword: string;
  level: string;
  intention: string;
  status: string;
  tags: string[];
  requirement: string;
  initialRequirement: string;
  createTime: string;
  updateTime: string;
  claimTime: string;
  lastFollowTime: string;
  nextFollowTime: string;
  creator: string;
  owner: string;
  optimizer: string;
  assistant: string;
  customerTitle: string;
  customerCost: string;
  entity: string;
  agent: string;
  customerType?: string;
  customerBudget?: string;
  presalesGroupName?: string;
  prototypeLink?: string;
  witkeyId?: string;
  witkeyTaskNo?: string;
  customerNote?: string;
  followCount: number;
  daysHeld: number;
}

export interface LeadQuotationItem {
  id: string;
  name: string;
  status: string;
  period: string;
  operator: string;
  entity: string;
  amount: string;
  upliftRate?: number;
  upliftType?: 'rate' | 'fixed';
  upliftAmount?: number;
  cost: string;
  profit: string;
  file: string;
  flowStatus: string;
  createTime: string;
  technicalEvaluator?: string;
  quotationSystemFiles?: string[];
  technicalEvaluationFiles?: string[];
  quotationFiles?: string[];
  quotationFileUrls?: Record<string, string>;
  quotationSummary?: LeadQuotationSummary;
  quotationConfig?: LeadQuotationConfig;
  quotationReportImageUrl?: string;
  quotationReportImageName?: string;
  description?: string;
  approvalFlow: Array<{
    step: string;
    approver: string;
    status: string;
    time: string;
    comment: string;
  }>;
}

export interface LeadQuotationSummary {
  frontendCost: number;
  backendCost: number;
  otherRoleCost: number;
  laborCost: number;
  travelCost: number;
  onsiteCost: number;
  otherFixedCost: number;
  salesCommission: number;
  salesOtherCost?: number;
  otherCost: number;
  totalAmount: number;
  totalPersonDays: number;
  totalPeople: number;
  estimatedDays: number;
  estimatedPeriod: string;
}

export interface LeadQuotationLaborItem {
  id: string;
  category: string;
  role: string;
  technology: string;
  people: number;
  days: number;
  dailyRate: number;
}

export interface LeadQuotationTravelItem {
  enabled: boolean;
  people: number;
  trips: number;
  days: number;
  transportPerTrip: number;
  hotelPerDay: number;
  mealPerDay: number;
  allowancePerDay: number;
}

export interface LeadQuotationOtherCostItem {
  id: string;
  type: string;
  description: string;
  amount: number;
}

export interface LeadQuotationConfig {
  frontend: LeadQuotationLaborItem[];
  backend: LeadQuotationLaborItem[];
  otherRoles: LeadQuotationLaborItem[];
  travel: LeadQuotationTravelItem;
  onsite: LeadQuotationTravelItem;
  otherCosts: LeadQuotationOtherCostItem[];
  salesCommissionRate: number;
}

export interface LeadDemoContract {
  id: string;
  name: string;
  contractNo: string;
  startDate: string;
  signDate?: string;
  contractEntity: string;
  signingEntity: string;
  amount: string;
  receivedAmount: string;
  paymentMethod: string;
  totalCost: string;
  signer: string;
  contactPhone?: string;
  status: string;
  createTime: string;
}

export interface LeadDetailProfile {
  leadInfo: LeadDetailInfo;
  quotationHistory: LeadQuotationItem[];
  /** 合同 Tab 从 ContractsContext 按 leadId 读取，初始为空 */
  useLiveContracts: boolean;
  demoContracts: LeadDemoContract[];
}

const DEFAULT_LEAD_INFO: LeadDetailInfo = {
  name: '某科技公司APP开发需求',
  customer: '北京科技有限公司',
  contact: '张经理',
  phone: '13800138000',
  wechat: '13800138000',
  source: '百度推广',
  keyword: 'APP开发',
  level: '高',
  intention: '强烈',
  status: '需求调研',
  tags: ['APP', '移动应用'],
  requirement: '需要开发一款企业内部管理APP，支持iOS和Android双平台，包含考勤、审批、通知等功能模块。',
  initialRequirement: 'APP开发需求',
  createTime: '2026-03-25 10:30:00',
  updateTime: '2026-04-09 10:30:00',
  claimTime: '2026-03-25 11:20:00',
  lastFollowTime: '2026-04-09 10:30:00',
  nextFollowTime: '2026-04-10 10:00:00',
  creator: '张三',
  owner: '张三',
  optimizer: '巴蜀文攻',
  assistant: '',
  customerTitle: '',
  customerCost: '',
  entity: '中科软艺',
  agent: '巴蜀文攻',
  followCount: 8,
  daysHeld: 15,
};

const DEFAULT_QUOTATIONS: LeadQuotationItem[] = [
  {
    id: '1',
    name: 'APP开发项目报价方案V2',
    status: '已报价',
    period: '3个月',
    operator: '张三',
    entity: '中科软艺',
    amount: '680,000',
    cost: '450,000',
    profit: '230,000',
    file: 'APP开发报价单V2.xlsx',
    flowStatus: '已审核',
    createTime: '2026-04-10 14:30',
    approvalFlow: [
      { step: '发起申请', approver: '张三', status: 'approved', time: '2026-04-10 14:30', comment: '' },
      { step: '商务初审', approver: '王经理 - 商务主管', status: 'approved', time: '2026-04-10 16:20', comment: '项目背景属实，支持该折扣' },
      { step: '财务审核', approver: '陈财务 - 财务总监', status: 'approved', time: '2026-04-11 09:15', comment: '毛利率符合标准，准予报价' },
    ],
  },
  {
    id: '2',
    name: 'APP开发项目初步报价',
    status: '未报价',
    period: '4个月',
    operator: '李四',
    entity: '软艺信息',
    amount: '750,000',
    cost: '500,000',
    profit: '250,000',
    file: 'APP开发初步报价.xlsx',
    flowStatus: '已审核',
    createTime: '2026-04-05 10:20',
    approvalFlow: [
      { step: '发起申请', approver: '李四', status: 'approved', time: '2026-04-05 10:20', comment: '' },
      { step: '商务初审', approver: '王经理 - 商务主管', status: 'approved', time: '2026-04-05 14:30', comment: '项目背景合理' },
      { step: '财务审核', approver: '陈财务 - 财务总监', status: 'rejected', time: '2026-04-05 16:00', comment: '该线索目前的运营成本已超支，且折扣已低于公司基准毛利（30%），请重新核算或申请特批。' },
      { step: '总经理特批', approver: '赵总 - 总经理', status: 'pending', time: '', comment: '' },
    ],
  },
];

const DEFAULT_DEMO_CONTRACTS: LeadDemoContract[] = [
  {
    id: '1',
    name: 'APP开发项目合同',
    contractNo: 'ZKRY202604080001',
    startDate: '2026-04-08',
    signDate: '2026-04-08',
    contractEntity: '中科软艺',
    signingEntity: '北京科技有限公司',
    amount: '680,000',
    receivedAmount: '408,000',
    paymentMethod: '对公转账',
    totalCost: '420,000',
    signer: '张三',
    contactPhone: '13800138000',
    status: '执行中',
    createTime: '2026-04-08 10:30',
  },
];

/** 公海线索「某餐饮连锁小程序开发」对应的路由 id */
export const RESTAURANT_PUBLIC_LEAD_ID = '1';

export function isRestaurantPublicLead(
  leadId: string | undefined,
  from: string,
): boolean {
  return leadId === RESTAURANT_PUBLIC_LEAD_ID && from === 'public';
}

export function getLeadDetailProfile(
  leadId: string | undefined,
  from: string,
): LeadDetailProfile {
  if (leadId === 'lead-9') {
    return {
      leadInfo: {
        ...DEFAULT_LEAD_INFO,
        name: '华信科技内部OA流程优化需求',
        customer: '华信科技有限公司',
        contact: '周经理',
        phone: '13800009999',
        wechat: 'huaxin-zhou',
        source: '客户转介绍',
        keyword: 'OA流程优化',
        level: '高',
        intention: '强烈',
        status: '项目执行中',
        tags: ['OA系统', '流程管理', '审批'],
        requirement: '建设内部 OA 流程优化系统，优先覆盖审批、合同、项目协同和日报管理，并与现有组织架构及 SSO 登录对接。',
        initialRequirement: '华信科技内部OA流程优化',
        createTime: '2026-06-05 14:20:00',
        updateTime: '2026-07-21 16:30:00',
        claimTime: '2026-06-05 15:10:00',
        lastFollowTime: '2026-07-21 16:30:00',
        nextFollowTime: '2026-07-25 10:00:00',
        creator: '张三',
        owner: '张三',
        optimizer: '李四',
        assistant: '孙七',
        customerTitle: '周经理',
        customerCost: '12,000',
        entity: '中科软艺',
        customerType: '企业客户',
        customerBudget: '¥960,000',
        presalesGroupName: '华信科技 OA 项目群',
        prototypeLink: 'https://example.com/huaxin-oa-prototype',
        customerNote: '客户要求一期优先交付审批、合同和项目协同能力。',
        followCount: 6,
        daysHeld: 46,
      },
      quotationHistory: [
        {
          id: 'quote-9',
          name: '华信科技OA流程优化报价单V2',
          status: '已报价',
          period: '4个月',
          operator: '张三',
          entity: '中科软艺',
          amount: '960,000',
          cost: '620,000',
          profit: '340,000',
          file: '华信科技OA流程优化报价单.pdf',
          flowStatus: '已审核',
          createTime: '2026-06-15 16:20',
          technicalEvaluator: '李四',
          quotationSystemFiles: ['OA流程优化技术方案.pdf'],
          technicalEvaluationFiles: ['华信科技技术评估表.xlsx'],
          quotationFiles: ['华信科技OA流程优化报价单.pdf'],
          description: '基于已确认的一期范围报价，包含审批、合同、项目协同、日报及 SSO 对接。',
          approvalFlow: [
            { step: '发起申请', approver: '张三', status: 'approved', time: '2026-06-15 16:20', comment: '提交报价审批' },
            { step: '商务审核', approver: '王经理 - 商务主管', status: 'approved', time: '2026-06-15 17:10', comment: '报价范围与客户需求一致' },
            { step: '财务审核', approver: '陈财务 - 财务总监', status: 'approved', time: '2026-06-16 09:40', comment: '毛利率符合要求' },
          ],
        },
      ],
      useLiveContracts: true,
      demoContracts: [],
    };
  }

  if (isRestaurantPublicLead(leadId, from)) {
    return {
      leadInfo: {
        ...DEFAULT_LEAD_INFO,
        name: '某餐饮连锁小程序开发',
        customer: '某餐饮连锁品牌',
        contact: '陈经理',
        phone: '13888888888',
        wechat: '13888888888',
        source: '百度推广',
        keyword: '小程序开发',
        level: '高',
        intention: '较强',
        status: '需求调研',
        tags: ['小程序', '餐饮'],
        requirement: '需要开发餐饮连锁品牌微信小程序，支持门店点餐、会员积分、优惠券核销及后台运营管理。',
        initialRequirement: '餐饮连锁小程序开发',
        createTime: '2026-04-08 10:30:00',
        updateTime: '2026-04-08 10:30:00',
        claimTime: '',
        lastFollowTime: '',
        nextFollowTime: '',
        creator: '系统',
        owner: '',
        followCount: 0,
        daysHeld: 0,
        presalesGroupName: '【果蔬零售小程序】项目沟通群',
      },
      quotationHistory: [],
      useLiveContracts: true,
      demoContracts: [],
    };
  }

  return {
    leadInfo: DEFAULT_LEAD_INFO,
    quotationHistory: DEFAULT_QUOTATIONS,
    useLiveContracts: false,
    demoContracts: DEFAULT_DEMO_CONTRACTS,
  };
}
