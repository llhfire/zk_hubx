import { ALL_LEADS } from './mockData';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export type ClueType = 'public' | 'assigned' | 'trash' | 'hightech';

export interface LeadDetailInfo {
  name: string;
  customer: string;
  contact: string;
  phone: string;
  wechat: string;
  source: string;
  keyword: string;
  level: string;             // 意向等级：高/中/低
  customerLevel?: string;    // 客户等级：S/A/B/C
  intention: string;
  status: string;
  clueType: ClueType;        // 线索类型
  transformStatus: boolean;  // 是否已转客户
  trashCount: number;        // 退回公海次数
  trashReason?: string;      // 垃圾原因
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
  attachments: Attachment[];
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
  source: 'baidu',
  keyword: 'APP开发',
  level: '高',
  customerLevel: 'S',
  intention: '强烈',
  status: '需求调研',
  clueType: 'assigned',
  transformStatus: false,
  trashCount: 0,
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
  attachments: [],
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
  if (leadId === 'pawkey-lead-5942') {
    return {
      leadInfo: {
        ...DEFAULT_LEAD_INFO,
        name: '帕奇宠 C 端产品设计与系统架构咨询',
        customer: '重庆绮算法科技有限公司',
        contact: '甲方产品负责人',
        phone: '138****5942',
        wechat: 'pawkey-product',
        source: 'wechat',
        keyword: '宠物 App 产品设计',
        level: '高',
        customerLevel: 'A',
        intention: '强烈',
        status: '已成交',
        transformStatus: true,
        tags: ['宠物科技', 'C端App', '产品设计', '系统架构'],
        requirement: '完成帕奇宠 C 端一期产品定义、核心体验原型、UI 视觉规范与系统架构设计。',
        initialRequirement: '宠物陪伴类 C 端 App 一期产品设计与系统架构咨询。',
        createTime: '2026-05-18 10:20:00',
        updateTime: '2026-05-30 16:40:00',
        claimTime: '2026-05-18 11:00:00',
        lastFollowTime: '2026-05-30 16:40:00',
        nextFollowTime: '',
        creator: '黄奕',
        owner: '黄奕',
        optimizer: '黄奕',
        entity: '中科软通',
        agent: '客户转介绍',
        customerType: '企业客户',
        customerBudget: '¥100,000',
        presalesGroupName: '帕奇宠 C 端一期项目群',
        followCount: 6,
        daysHeld: 13,
      },
      quotationHistory: [
        {
          id: 'pawkey-q1', name: '帕奇宠 C 端一期产品与架构方案 v2.0', status: '已报价', period: '40 个工作日', operator: '黄奕', entity: '中科软通', amount: '100,000', cost: '68,000', profit: '32,000', file: '帕奇宠C端一期报价方案V2.pdf', flowStatus: '已审核', createTime: '2026-05-20 10:00',
          approvalFlow: [
            { step: '发起申请', approver: '黄奕', status: 'approved', time: '2026-05-27 11:00', comment: '提交报价审批' },
            { step: '技术审核', approver: '陈周伟', status: 'approved', time: '2026-05-28 10:20', comment: '人天与技术边界合理' },
            { step: '总经理审批', approver: '总经理', status: 'approved', time: '2026-05-28 16:00', comment: '同意' },
          ],
        },
      ],
      useLiveContracts: true,
      demoContracts: [],
    };
  }

  const sampledLead = ALL_LEADS.find((lead) => lead.id === leadId);
  if (sampledLead) {
    return {
      leadInfo: {
        ...DEFAULT_LEAD_INFO,
        name: sampledLead.name,
        customer: sampledLead.customer,
        contact: sampledLead.contact,
        phone: sampledLead.phone,
        wechat: sampledLead.wechat,
        source: sampledLead.source,
        keyword: sampledLead.keyword,
        level: sampledLead.level,
        customerLevel: sampledLead.customerLevel,
        intention: sampledLead.level === '高' ? '强烈' : sampledLead.level === '中' ? '一般' : '较弱',
        status: sampledLead.status,
        clueType: sampledLead.clueType,
        transformStatus: sampledLead.transformStatus,
        trashCount: sampledLead.trashCount,
        trashReason: sampledLead.trashReason,
        tags: sampledLead.tags,
        requirement: sampledLead.remark || sampledLead.name,
        initialRequirement: sampledLead.remark || sampledLead.name,
        createTime: sampledLead.createTime,
        updateTime: sampledLead.lastFollowTime || sampledLead.createTime,
        claimTime: sampledLead.clueType === 'assigned' ? sampledLead.createTime : '',
        lastFollowTime: sampledLead.lastFollowTime,
        nextFollowTime: sampledLead.nextFollowTime,
        creator: sampledLead.optimizer || '系统',
        owner: sampledLead.owner,
        optimizer: sampledLead.optimizer,
        assistant: sampledLead.assistant,
        customerTitle: sampledLead.contact,
        customerCost: '',
        entity: sampledLead.entity,
        agent: sampledLead.optimizer,
        customerType: sampledLead.customer ? '企业客户' : undefined,
        customerBudget: sampledLead.budget ? `¥${sampledLead.budget.toLocaleString('zh-CN')}` : undefined,
        presalesGroupName: sampledLead.presalesGroupName,
        prototypeLink: sampledLead.prototypeLink,
        followCount: sampledLead.followCount,
        daysHeld: sampledLead.daysHeld,
        attachments: sampledLead.attachments ?? [],
      },
      quotationHistory: [],
      useLiveContracts: true,
      demoContracts: [],
    };
  }

  if (leadId === 'lead-1') {
    return {
      leadInfo: {
        ...DEFAULT_LEAD_INFO,
        name: 'A公司CRM系统开发需求',
        customer: 'A公司',
        contact: '刘经理',
        phone: '13800138000',
        wechat: 'liujingli-a',
        source: 'baidu',
        keyword: 'CRM开发',
        level: '高',
        customerLevel: 'A',
        intention: '强烈',
        status: '已签单',
        clueType: 'assigned' as ClueType,
        transformStatus: true,
        trashCount: 0,
        tags: ['CRM', '管理系统'],
        requirement: '建设 CRM 客户管理系统，优先覆盖销售跟进、客户管理、报价流程和商机看板。',
        initialRequirement: 'A公司CRM系统开发',
        createTime: '2026-04-28 10:30:00',
        updateTime: '2026-05-01 10:00:00',
        claimTime: '2026-04-28 11:00:00',
        lastFollowTime: '2026-05-01 10:00:00',
        nextFollowTime: '',
        creator: '张三',
        owner: '张三',
        optimizer: '巴蜀文攻',
        assistant: '李四',
        customerTitle: '刘经理',
        customerCost: '8,000',
        entity: '中科软艺',
        customerType: '企业客户',
        customerBudget: '¥205,000',
        presalesGroupName: 'A公司售前沟通群',
        customerNote: '客户重点关注销售跟进、客户管理和项目成本统计。',
        followCount: 5,
        daysHeld: 3,
        attachments: [],
      },
      quotationHistory: [
        {
          id: 'quote-1',
          name: 'A公司CRM系统开发报价方案',
          status: '已报价',
          period: '4个月',
          operator: '张三',
          entity: '中科软艺',
          amount: '205,000',
          cost: '138,000',
          profit: '67,000',
          file: 'A公司CRM报价方案.pdf',
          flowStatus: '已审核',
          createTime: '2026-04-29 15:20',
          approvalFlow: [
            { step: '发起申请', approver: '张三', status: 'approved', time: '2026-04-29 15:20', comment: '提交报价审批' },
            { step: '商务审核', approver: '王经理 - 商务主管', status: 'approved', time: '2026-04-29 17:00', comment: '报价范围与客户需求一致' },
            { step: '财务审核', approver: '陈财务 - 财务总监', status: 'approved', time: '2026-04-30 09:30', comment: '毛利率符合要求' },
          ],
        },
      ],
      useLiveContracts: true,
      demoContracts: [],
    };
  }

  if (leadId === 'lead-2') {
    return {
      leadInfo: {
        ...DEFAULT_LEAD_INFO,
        name: 'B公司小程序开发咨询',
        customer: 'B公司',
        contact: '陈总',
        phone: '13900139000',
        wechat: 'chen-b',
        source: 'xiaohongshu',
        keyword: '小程序开发',
        level: '高',
        customerLevel: 'B',
        intention: '较强',
        status: '已签单',
        clueType: 'assigned' as ClueType,
        transformStatus: true,
        trashCount: 0,
        tags: ['小程序', '定制开发'],
        requirement: '业务小程序定制开发，含首页展示、订单流程与运营后台，对交付时间要求严格。',
        initialRequirement: 'B公司小程序定制开发',
        createTime: '2026-04-09 14:20:00',
        updateTime: '2026-04-15 10:00:00',
        claimTime: '2026-04-09 15:00:00',
        lastFollowTime: '2026-04-15 10:00:00',
        nextFollowTime: '',
        creator: '李四',
        owner: '李四',
        optimizer: '巴蜀文攻',
        assistant: '',
        customerTitle: '陈总',
        customerCost: '5,000',
        entity: '软艺信息',
        customerType: '中小企业',
        customerBudget: '¥120,000',
        presalesGroupName: 'B公司项目群',
        followCount: 6,
        daysHeld: 6,
        attachments: [],
      },
      quotationHistory: [
        {
          id: 'quote-2',
          name: 'B公司小程序定制开发报价方案',
          status: '已报价',
          period: '3个月',
          operator: '李四',
          entity: '软艺信息',
          amount: '120,000',
          cost: '82,000',
          profit: '38,000',
          file: 'B公司小程序报价方案.pdf',
          flowStatus: '已审核',
          createTime: '2026-04-12 11:00',
          approvalFlow: [
            { step: '发起申请', approver: '李四', status: 'approved', time: '2026-04-12 11:00', comment: '提交报价审批' },
            { step: '商务审核', approver: '王经理 - 商务主管', status: 'approved', time: '2026-04-12 15:40', comment: '项目背景属实' },
            { step: '财务审核', approver: '陈财务 - 财务总监', status: 'approved', time: '2026-04-13 09:20', comment: '毛利率符合标准' },
          ],
        },
      ],
      useLiveContracts: true,
      demoContracts: [],
    };
  }

  if (leadId === 'lead-9') {
    return {
      leadInfo: {
        ...DEFAULT_LEAD_INFO,
        name: '华信科技内部OA流程优化需求',
        customer: '华信科技有限公司',
        contact: '周经理',
        phone: '13800009999',
        wechat: 'huaxin-zhou',
        source: 'wechat',
        keyword: 'OA流程优化',
        level: '高',
        customerLevel: 'S',
        intention: '强烈',
        status: '项目执行中',
        clueType: 'assigned' as ClueType,
        transformStatus: true,
        trashCount: 0,
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
        attachments: [],
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
        source: 'baidu',
        keyword: '小程序开发',
        level: '高',
        customerLevel: 'A',
        intention: '较强',
        status: '需求调研',
        clueType: 'public' as ClueType,
        transformStatus: false,
        trashCount: 0,
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
        attachments: [],
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
