// 报价模块核心类型定义
import type { CustomerSnapshot } from '../customers/types';
import type { ElectronicSigningPackage } from '../sales-compliance/types';

// ─── 状态机 ───────────────────────────────────────────────

export type QuoteStatus =
  | 'draft'           // 草稿
  | 'pending_eval'    // 待评估（原 feature_confirmed）
  | 'pending_quote'   // 待报价（原 eval_completed / assigned_sales / quote_summarized 三态合一）
  | 'auditing'        // 待审核（原展示词「审批中」）
  | 'rejected'        // 已驳回（原展示词「驳回待修改」）
  | 'pending_stamp'   // 待盖章
  | 'stamped'         // 已盖章
  | 'sent'            // 已发出（含原 pending_followup）
  | 'confirmed'       // 已确认（原 deal，ADR 0066：已确认 ≠ 签约）
  | 'voided';         // 已废止（原展示词「已作废」）

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: '草稿',
  pending_eval: '待评估',
  pending_quote: '待报价',
  auditing: '待审核',
  rejected: '已驳回',
  pending_stamp: '待盖章',
  stamped: '已盖章',
  sent: '已发出',
  confirmed: '已确认',
  voided: '已废止',
};

/** 列表页状态标签配色 */
export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'gray',
  pending_eval: 'blue',
  pending_quote: 'arcoblue',
  auditing: 'orange',
  rejected: 'red',
  pending_stamp: 'gold',
  stamped: 'green',
  sent: 'green',
  confirmed: 'green',
  voided: 'gray',
};

// ─── 角色 ───────────────────────────────────────────────

export type QuoteRole = 'pm' | 'tech' | 'sales_manager' | 'decision' | 'assistant' | 'sales';

export const QUOTE_ROLES: { key: QuoteRole; name: string }[] = [
  { key: 'pm', name: '产品经理（张产品）' },
  { key: 'tech', name: '技术负责人（罗总）' },
  { key: 'sales', name: '销售（张三）' },
  { key: 'sales_manager', name: '销售部负责人（黄奕）' },
  { key: 'decision', name: '企业决策层（闵总）' },
  { key: 'assistant', name: '董助（黄海）' },
];

/** 角色 key → 该角色对应的具体人名，流转轨迹与审批节点复用 */
export const QUOTE_ROLE_ACTORS: Record<QuoteRole, string> = {
  pm: '张产品',
  tech: '罗总',
  sales: '张三',
  sales_manager: '黄奕',
  decision: '闵总',
  assistant: '黄海',
};

// ─── 阶段（由 status 推导，不落库）──────────────────────────

/** 1 功能清单 / 2 人天评估 / 3 报价配置 / 4 审批盖章 */
export type QuoteStage = 1 | 2 | 3 | 4;

export const QUOTE_STAGE_NAMES: Record<QuoteStage, string> = {
  1: '功能清单',
  2: '人天评估',
  3: '报价配置',
  4: '审批盖章',
};

// ─── 流转轨迹 ─────────────────────────────────────────────

export type QuoteAction =
  | 'create'
  | 'submit_feature_list'
  | 'submit_eval'
  | 'assign_to_sales'
  | 'return_to_tech'
  | 'submit_for_audit'
  | 'withdraw_audit'
  | 'audit_approve'
  | 'audit_reject'
  | 'stamp'
  | 'mark_sent'
  | 'mark_confirmed'
  | 'mark_voided'
  | 'new_version'
  | 'withdraw_sent'
  | 'return_to_stamp'
  | 'return_to_edit_features'
  | 'delete_quote'
  | 'reassign_sales'
  | 'reassign_evaluator'
  | 'create_proxy'
  | 'revoke_proxy'
  | 'create_signing_package'
  | 'advance_signing';

export const QUOTE_ACTION_LABELS: Record<QuoteAction, string> = {
  create: '创建报价单',
  submit_feature_list: '提交功能清单',
  submit_eval: '提交人天评估',
  assign_to_sales: '转派销售',
  return_to_tech: '退回技术重评',
  submit_for_audit: '提交审批',
  withdraw_audit: '撤回审批',
  audit_approve: '审批通过',
  audit_reject: '驳回报价',
  stamp: '加盖公章',
  mark_sent: '发送客户',
  mark_confirmed: '确认成交',
  mark_voided: '作废报价',
  new_version: '创建新版本',
  withdraw_sent: '撤回发出',
  return_to_stamp: '退回盖章',
  return_to_edit_features: '退回改清单',
  delete_quote: '删除报价',
  reassign_sales: '改指销售',
  reassign_evaluator: '改指评估人',
  create_proxy: '设置代理',
  revoke_proxy: '撤销代理',
  create_signing_package: '创建电子签署演示包',
  advance_signing: '更新签署演示状态',
};

export interface QuoteTimelineEvent {
  id: string;
  action: QuoteAction;
  actorName: string;
  actorRole: string;
  time: string;
  /** 附言：驳回意见、退回理由、撤回原因等 */
  note?: string;
}

// ─── 功能清单 ─────────────────────────────────────────────

export interface FeatureSubFeature {
  id: string;
  name: string;          // 二级子功能
  description: string;   // 功能描述与交互规则
  remark?: string;       // 备注
}

export interface FeatureModule {
  id: string;
  name: string;          // 一级模块
  sort: number;
  subFeatures: FeatureSubFeature[];
  endpointId: string;     // 关联的端ID
}

// ─── 端与平台配置 ─────────────────────────────────────────

/** 平台选项 */
export const PLATFORM_OPTIONS = [
  { id: 'wechat', name: '微信小程序' },
  { id: 'alipay', name: '支付宝小程序' },
  { id: 'douyin', name: '抖音小程序' },
  { id: 'ios', name: 'iOS APP' },
  { id: 'android', name: 'Android APP' },
  { id: 'harmony', name: '鸿蒙 APP' },
  { id: 'h5', name: 'H5移动端' },
  { id: 'pcweb', name: 'PC Web端' },
  { id: 'desktop', name: '桌面应用' },
  { id: 'ipad', name: 'iPad端' },
  { id: 'androidpad', name: 'Android平板端' },
];

/** 端配置：一个端可适配多个平台 */
export interface EndpointConfig {
  id: string;
  name: string;           // 端名称（如"用户端"、"管理后台"）
  platforms: string[];    // 适配平台ID列表
}

// ─── 人天评估 ─────────────────────────────────────────────

export interface EvalRole {
  key: string;           // role_key（pm_days / ui_days / ...）
  name: string;          // 岗位名称（产品经理 / UI设计师 / ...）
}

/** 新增评估岗位的预设候选项 */
export const PRESET_EVAL_ROLES: EvalRole[] = [
  { key: 'pm_days', name: '产品经理' },
  { key: 'ui_days', name: 'UI设计师' },
  { key: 'fe_days', name: '前端开发' },
  { key: 'be_days', name: '后端开发' },
  { key: 'qa_days', name: '测试工程师' },
  { key: 'arch_days', name: '架构师' },
  { key: 'algo_days', name: '算法工程师' },
  { key: 'embed_days', name: '嵌入式硬件' },
  { key: 'dba_days', name: 'DBA工程师' },
  { key: 'ops_days', name: '安全/运维' },
];

/** MODULE_PACK 整模块打包 / SUB_GROUP 模块内多项合并 / SINGLE 单项精细评估 */
export type Granularity = 'MODULE_PACK' | 'SUB_GROUP' | 'SINGLE';

export const GRANULARITY_LABELS: Record<Granularity, string> = {
  MODULE_PACK: '整模块打包',
  SUB_GROUP: '多项切片',
  SINGLE: '单项评估',
};

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export const RISK_META: Record<RiskLevel, { text: string; color: string }> = {
  LOW: { text: '低', color: 'green' },
  MEDIUM: { text: '中', color: 'orange' },
  HIGH: { text: '高危', color: 'red' },
};

export interface EvaluationUnit {
  id: string;
  granularity: Granularity;
  /** 所属一级模块名称 */
  moduleName: string;
  /** 所属模块 id，切片重组时用于定位同模块范围 */
  moduleId?: string;
  /** 该评估单元覆盖的子功能 id 集合 */
  boundSubFeatureIds: string[];
  /** 切片组自定义名称（SUB_GROUP 用，如「浏览展示」） */
  groupName?: string;
  manualWorkload: Record<string, number>; // role_key -> 人天（纯手动）
  totalDays: number;
  riskLevel: RiskLevel;
  techRemark?: string;
  /** 寄存行标记：解除合并时，第一行作为寄存行，显示红色边框 */
  isRemainder?: boolean;
  /** 解除合并时产生的子功能 ID 列表，用于检查寄存状态解除 */
  ungroupedSubIds?: string[];
}

export interface EvalSheet {
  id: string;
  evaluator: string;         // 罗总
  activeRoles: EvalRole[];   // 动态岗位列
  evaluationUnits: EvaluationUnit[];
  manualWorkDays: number;    // 罗总手动核定的工期（工作日）
  techSolutionNote: string;  // 技术方案备注
}

// ─── 销售增项 ─────────────────────────────────────────────

export interface SalesAddedRole {
  id: string;
  roleName: string;
  headcount: number;
  days: number;
  dailyRate: number;    // 日均单价（元）
  subtotal: number;
  reason: string;
}

// ─── 前后端配置（报价 7 步 Step2 / Step3）──────────────────

export interface FrontendPlatform {
  id: string;
  /** 平台端：微信小程序 / iOS / PC Web ... */
  platform: string;
  /** 角色端，如「用户端」「商户端」 */
  roleEnds: string[];
  /** 开发语言/框架 */
  framework: string;
}

export interface FrontendConfig {
  platforms: FrontendPlatform[];
}

export interface BackendConfig {
  /** API 服务 / 后台管理系统 / 数据库设计 / 即时通讯 / 第三方支付 ... */
  services: string[];
  /** Java / Go / Python / Node.js */
  language: string;
  /** 架构与组件补充说明 */
  note?: string;
}

export const FRONTEND_PLATFORM_OPTIONS = [
  '微信小程序', '支付宝小程序', '抖音小程序',
  'iOS APP', 'Android APP', '鸿蒙 HarmonyOS',
  'PC Web 端', 'H5 移动端',
];

export const FRONTEND_FRAMEWORK_OPTIONS = ['Uni-App', 'Vue3', 'React', 'Taro', '原生开发'];

export const BACKEND_SERVICE_OPTIONS = [
  'API 服务', '后台管理系统 (CMS)', '数据库设计',
  '即时通讯 (IM)', '第三方支付集成', '消息推送', '数据报表与 BI',
];

export const BACKEND_LANGUAGE_OPTIONS = ['Java', 'Go', 'Python', 'Node.js', 'PHP', '.NET'];

// ─── 出差驻场 / 其他成本 ──────────────────────────────────

export interface TravelDetail {
  location: string;
  headcount: number;
  days: number;
  transportFee: number;   // 交通费（往返合计）
  hotelFeePerDay: number; // 住宿费（元/天/人）
  allowancePerDay: number;// 差旅补贴（元/天/人）
}

export interface OnsiteDetail {
  location: string;
  headcount: number;
  days: number;
  serviceFeePerDay: number; // 现场技术支持服务费（元/天/人）
}

export interface TravelOnsiteConfig {
  enableTravel: boolean;
  travelSubtotal: number;
  enableOnsite: boolean;
  onsiteSubtotal: number;
  travelDetails: TravelDetail[];
  onsiteDetails: OnsiteDetail[];
}

export interface CostItem {
  id: string;
  name: string;
  amount: number;
  note?: string;
}

/** Step6 常见第三方与商务成本，供快捷添加 */
export const PRESET_COST_ITEMS = [
  '云服务器 ECS', '数据库 RDS', '对象存储 OSS', '短信包',
  '域名与 SSL 证书', '微信认证费', '商务接待', '客户培训费',
];

// ─── 报价汇总 ─────────────────────────────────────────────

export interface PaymentTerm {
  stage: string;
  percent: number;
  amount: number;
}

/** 标准付款方式模板 */
export const PAYMENT_TERM_TEMPLATES: { label: string; terms: { stage: string; percent: number }[] }[] = [
  {
    label: '50% 首付 - 40% 交付 - 10% 验收',
    terms: [
      { stage: '合同签订首付款', percent: 50 },
      { stage: '系统交付款', percent: 40 },
      { stage: '验收尾款', percent: 10 },
    ],
  },
  {
    label: '30% 首付 - 40% 中期 - 20% 交付 - 10% 验收',
    terms: [
      { stage: '合同签订首付款', percent: 30 },
      { stage: '开发中期款', percent: 40 },
      { stage: '系统交付款', percent: 20 },
      { stage: '验收尾款', percent: 10 },
    ],
  },
  {
    label: '全额预付',
    terms: [{ stage: '合同签订全款', percent: 100 }],
  },
];

export interface QuoteSummary {
  totalLaborDays: number;    // 技术人天 + 增项人天
  projectWorkDays: number;   // 约定工期
  grandTotalPrice: number;   // 项目总报价
  paymentTerms: PaymentTerm[];
  taxIncluded: boolean;
  warrantyYears: number;
  /** 发票类型，默认增值税专用发票。 */
  invoiceType?: '专票' | '普票';
}

// ─── 审批（三人并行会签 + 盖章）────────────────────────────

export type AuditDecision = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AuditNode {
  auditorId: string;
  auditorName: string;
  role: string;              // 销售部负责人 / 技术部负责人 / 企业决策层
  /** 提交审批时从配置固化，待办与操作权限以此为准。 */
  quoteRole?: QuoteRole;
  status: AuditDecision;
  auditTime?: string;
  comment?: string;
}

export type StampStatus = 'LOCKED' | 'PENDING_STAMP' | 'COMPLETED';

export interface StampNode {
  stamperName: string;       // 黄海（董助）
  /** 盖章人的报价角色，旧数据缺失时按 assistant 兼容。 */
  stamperRole?: QuoteRole;
  status: StampStatus;
  stampTime?: string;
}

/** 会签三人的初始节点，提交审批时重置也复用它 */
export function buildInitialAuditNodes(): AuditNode[] {
  return [
    { auditorId: 'huangyi', auditorName: '黄奕', role: '销售部负责人', quoteRole: 'sales_manager', status: 'PENDING' },
    { auditorId: 'luo', auditorName: '罗总', role: '技术部负责人', quoteRole: 'tech', status: 'PENDING' },
    { auditorId: 'min', auditorName: '闵总', role: '企业决策层', quoteRole: 'decision', status: 'PENDING' },
  ];
}

// ─── 报价单主实体 ─────────────────────────────────────────

export interface QuoteBasicInfo {
  projectName: string;
  projectType: string;
  creatorName: string;        // 产品经理
  techEvaluatorName: string;  // 罗总
  requirementDesc: string;
  customerName: string;
  customerContact: string;
  customerPhone: string;
  quoteValidityDays: number;  // 默认 30
  /** 行业分类（销售在 Step1 补录） */
  industry?: string;
}

export interface Quote {
  id: string;
  quoteNo: string;            // ZK-20260814-001
  version: string;            // v1.0
  status: QuoteStatus;
  leadId: string;
  customerId?: string;
  customerSnapshot?: CustomerSnapshot;
  /** 报价数据的流转载体：在线数据表单或 Excel 文件。 */
  flowMode?: 'online' | 'file';
  /** 文件流转专属状态；创建后 flowMode 不再修改。 */
  fileFlow?: {
    evaluationFileName?: string;
    evaluationWorkDays?: number;
    evaluationTotalDays?: number;
    quoteWorkDays?: number;
    quoteAmount?: number;
    onlineDocument: {
      status: 'empty' | 'draft' | 'saved' | 'finalized';
      savedAt?: string;
      content?: string;
    };
    scans: Array<{ id: string; name: string; url: string; uploadedAt: string }>;
  };
  contractId?: string;
  /** 由本报价实际生成的合同；补充报价的 contractId 保留指向主合同。 */
  generatedContractId?: string;
  /** 是否为补充报价（4.7） */
  isSupplement?: boolean;
  /** 补充报价变更额，可为负；在线流转用此字段作为总价。 */
  supplementChangeAmount?: number;
  salesOwnerName: string;     // 报价销售责任人（4.2）
  /** 本报价岗位日成本覆盖；未配置岗位按 600 元/天兜底。 */
  roleDailyCosts?: Record<string, number>;
  basicInfo: QuoteBasicInfo;
  endpointConfigs: EndpointConfig[];  // 端+平台配置
  featureList: FeatureModule[];
  evalSheet?: EvalSheet;
  salesAddedRoles: SalesAddedRole[];
  frontendConfig: FrontendConfig;
  backendConfig: BackendConfig;
  travelOnsite: TravelOnsiteConfig;
  otherCosts: CostItem[];
  summary?: QuoteSummary;
  auditNodes: AuditNode[];
  stampNode: StampNode;
  /** 流转轨迹，最新事件在末尾 */
  timeline: QuoteTimelineEvent[];
  /** 技术评估截止时间，PM 在工作台一设定 */
  deadline?: string;
  /** 抄送销售 */
  ccSalesNames: string[];
  /** 正式发送客户时间，报价有效期自此起算 */
  sentAt?: string;
  /** 上一版本报价单 id，重新报价时建立版本链 */
  previousQuoteId?: string;
  /** 补充报价所属主报价；与重新报价链分立。 */
  parentQuoteId?: string;
  proxies?: Array<{
    id: string;
    responsibility: 'sales' | 'technical_evaluation';
    principalName: string;
    proxyName: string;
    startAt: string;
    endAt: string;
    revokedAt?: string;
  }>;
  signingPackage?: ElectronicSigningPackage;
  createdAt: string;
  updatedAt: string;
}
