// ============================================================
// 线索管理模块 — 共享类型定义
// ============================================================

import type { ChannelKey } from '@/app/pages/lead-dispatch/channelDictionary';
import { CHANNEL_LIST, CHANNEL_LABEL } from '@/app/pages/lead-dispatch/channelDictionary';

// --- 线索类型（分类维度，与销售漏斗状态正交） ---
export type ClueType = 'public' | 'assigned' | 'trash' | 'hightech';

export const CLUE_TYPE_LABEL: Record<ClueType, string> = {
  public: '公海线索',
  assigned: '已分配',
  trash: '垃圾线索',
  hightech: '高科技线索',
};

// --- 后端数字枚举（说明书定义，用于前后端映射） ---
export enum ClueTypeEnum {
  PUBLIC = 1,
  ALLOCATED = 2,
  TRASH = 3,
  HIGHTECH = 4,
}

export enum CustStatusEnum {
  INIT = 1,       // 初始待分配/公海
  TRASH = 3,      // 垃圾线索
  WON = 11,       // 已成交
  FOLLOWING = 15, // 跟进中
}

// --- 前端↔后端映射 ---
export const CLUE_TYPE_TO_ENUM: Record<ClueType, ClueTypeEnum> = {
  public: ClueTypeEnum.PUBLIC,
  assigned: ClueTypeEnum.ALLOCATED,
  trash: ClueTypeEnum.TRASH,
  hightech: ClueTypeEnum.HIGHTECH,
};

export const ENUM_TO_CLUE_TYPE: Record<ClueTypeEnum, ClueType> = {
  [ClueTypeEnum.PUBLIC]: 'public',
  [ClueTypeEnum.ALLOCATED]: 'assigned',
  [ClueTypeEnum.TRASH]: 'trash',
  [ClueTypeEnum.HIGHTECH]: 'hightech',
};

// 销售漏斗 → 后端客户状态映射
export const SALES_STATUS_TO_CUST_ENUM: Record<string, CustStatusEnum> = {
  '未联系': CustStatusEnum.INIT,
  '未接通': CustStatusEnum.INIT,
  '初步沟通': CustStatusEnum.FOLLOWING,
  '需求调研': CustStatusEnum.FOLLOWING,
  '方案报价': CustStatusEnum.FOLLOWING,
  '合同洽谈': CustStatusEnum.FOLLOWING,
  '已签单': CustStatusEnum.WON,
  '已终止': CustStatusEnum.TRASH,
};

// 后端客户状态 → 前端显示标签
export const CUST_ENUM_TO_LABEL: Record<CustStatusEnum, string> = {
  [CustStatusEnum.INIT]: '待分配',
  [CustStatusEnum.TRASH]: '垃圾线索',
  [CustStatusEnum.WON]: '已成交',
  [CustStatusEnum.FOLLOWING]: '跟进中',
};

/** 前端字符串线索类型 → 后端数字枚举 */
export function toClueTypeEnum(type: ClueType): ClueTypeEnum {
  return CLUE_TYPE_TO_ENUM[type];
}

/** 后端数字枚举 → 前端字符串线索类型 */
export function fromClueTypeEnum(val: ClueTypeEnum): ClueType {
  return ENUM_TO_CLUE_TYPE[val];
}

/** 前端销售漏斗状态 → 后端客户状态枚举 */
export function toCustStatusEnum(status: string): CustStatusEnum {
  return SALES_STATUS_TO_CUST_ENUM[status] ?? CustStatusEnum.INIT;
}

// --- 销售漏斗状态（保留现有 8 态） ---
export type LeadSalesStatus =
  | '未联系'
  | '未接通'
  | '初步沟通'
  | '需求调研'
  | '方案报价'
  | '合同洽谈'
  | '已签单'
  | '已终止';

export const SALES_STATUS_LIST: LeadSalesStatus[] = [
  '未联系',
  '未接通',
  '初步沟通',
  '需求调研',
  '方案报价',
  '合同洽谈',
  '已签单',
  '已终止',
];

// 色彩降噪：核心状态语义色，次要属性中性化
// 销售漏斗步骤序列（用于进度条）
export const SALES_STATUS_STEPS: LeadSalesStatus[] = [
  '未联系',
  '未接通',
  '初步沟通',
  '需求调研',
  '方案报价',
  '合同洽谈',
  '已签单',
];

/** 获取当前状态在步骤中的索引（0-based），已终止返回 -1 */
export function getSalesStatusIndex(status: string): number {
  if (status === '已终止') return -1;
  return SALES_STATUS_STEPS.indexOf(status as LeadSalesStatus);
}

export const SALES_STATUS_COLOR: Record<LeadSalesStatus, string> = {
  未联系: 'gray',
  未接通: 'warning',
  初步沟通: 'processing',
  需求调研: 'processing',
  方案报价: 'processing',
  合同洽谈: 'success',
  已签单: 'success',
  已终止: 'error',
};

// --- 客户等级 ---
export type CustomerLevel = 'S' | 'A' | 'B' | 'C';

export const CUSTOMER_LEVEL_LIST: CustomerLevel[] = ['S', 'A', 'B', 'C'];

// 色彩降噪：S级用绿色系（高价值），其余中性
export const CUSTOMER_LEVEL_COLOR: Record<CustomerLevel, string> = {
  S: 'green',
  A: 'blue',
  B: 'gray',
  C: 'gray',
};

// --- 意向等级（新增「无意向」） ---
export type IntentionLevel = '高' | '中' | '低' | '无意向';

export const INTENTION_LEVEL_LIST: IntentionLevel[] = ['高', '中', '低', '无意向'];

export const INTENTION_LEVEL_COLOR: Record<IntentionLevel, string> = {
  高: 'red',
  中: 'orange',
  低: 'blue',
  无意向: 'gray',
};

// --- 线索来源（数据字典维护，英文 key；事实源：lead-dispatch/channelDictionary.ts） ---
export type LeadSource = ChannelKey;

export const LEAD_SOURCE_LIST: LeadSource[] = CHANNEL_LIST;

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = CHANNEL_LABEL;

// 色彩降噪：来源统一用边框样式（灰边黑字，清晰可读）
export const LEAD_SOURCE_COLOR: Record<LeadSource, string> = {
  xiaohongshu: 'gray',
  baidu: 'gray',
  douyin: 'gray',
  wechat: 'gray',
  website: 'gray',
};

// --- 售前群类型 ---
export type GroupType = 'wechat' | 'wecom' | 'feishu' | 'dingtalk' | 'other';

export const GROUP_TYPE_LABEL: Record<GroupType, string> = {
  wechat: '微信群',
  wecom: '企微群',
  feishu: '飞书群',
  dingtalk: '钉钉群',
  other: '其他群',
};

export const GROUP_TYPE_ICON: Record<GroupType, string> = {
  wechat: '💬',   // 微信
  wecom: '🏢',    // 企微
  feishu: '🐦',   // 飞书
  dingtalk: '📌', // 钉钉
  other: '👥',    // 其他
};

// --- 对接主体 ---
export type CompanyEntity = '中科软齐' | '中科软盈' | '中科软通' | '武汉软艺' | '中科网联';

export const COMPANY_ENTITY_LIST: CompanyEntity[] = [
  '中科软齐',
  '中科软盈',
  '中科软通',
  '武汉软艺',
  '中科网联',
];

// --- 附件 ---
export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

// --- 跟进记录 ---
export interface FollowUpRecord {
  id: string;
  leadId: string;
  method: string;            // 跟进方式（电话/微信/面谈/其他）
  customerStatus: string;    // 客户状态（同步到线索 status）
  customerLevel?: string;    // 客户级别（同步到线索 customerLevel）
  content: string;           // 跟进内容（max 1000）
  nextFollowTime?: string;   // 下次跟进时间
  costHours?: number;        // 消耗小时
  costMins?: number;         // 消耗分钟
  attachments: Attachment[];
  creator: string;
  createdAt: string;
  updatedAt: string;
  /** 待跟进/已处理 标记 */
  followupStatus: 'pending' | 'done';
}

export const FOLLOWUP_METHODS = ['电话', '微信', '面谈', '邮件', '其他'] as const;

// --- 线索详情信息（扩展版） ---
export interface LeadDetailInfo {
  // 基本信息
  name: string;
  customer: string;
  /** 已绑定的客户主档；线索联系人后续与客户联系人独立维护。 */
  customerId?: string;
  contact: string;
  phone: string;
  wechat: string;
  source: string;
  keyword: string;
  tags: string[];
  requirement: string;
  initialRequirement: string;

  // 分级
  level: string;             // 意向等级：高/中/低
  customerLevel?: string;    // 客户等级：S/A/B/C

  // 状态
  status: string;            // 销售漏斗状态
  clueType: ClueType;        // 线索类型（新增分类维度）
  transformStatus: boolean;  // 是否已转客户
  trashCount: number;        // 退回公海次数
  trashReason?: string;      // 垃圾原因

  // 时间
  createTime: string;
  updateTime: string;
  claimTime: string;
  lastFollowTime: string;
  nextFollowTime: string;

  // 人员
  creator: string;
  owner: string;
  optimizer: string;
  assistant: string;

  // 扩展信息
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

  // 计算字段
  followCount: number;
  daysHeld: number;

  // 附件
  attachments: Attachment[];
}

// --- 列表项（复合列版，用于列表页展示） ---
export interface LeadListItem {
  key: string;
  id: string;
  name: string;
  customer: string;
  contact: string;
  phone: string;
  wechat: string;
  source: string;
  keyword: string;
  status: string;
  clueType: ClueType;
  level: string;             // 意向等级
  customerLevel?: string;    // 客户等级
  tags: string[];
  entity: string;
  owner: string;
  optimizer: string;
  assistant: string;
  createTime: string;
  lastFollowTime: string;
  lastFollowContent?: string; // 最近跟进内容
  nextFollowTime: string;
  followCount: number;
  daysHeld: number;
  budget?: number;           // 预算金额
  remark?: string;           // 描述/备注
  presalesGroupName?: string; // 售前群名称
  groupType?: GroupType;     // 售前群类型（微信/企微/飞书/钉钉）
  hasGroup?: boolean;        // 售前群是否已建立
  prototypeLink?: string;    // 原型图链接
  historyOwners?: string;    // 历史归属人
  trashReason?: string;
  trashCount: number;
  transformStatus: boolean;
  /** 是否标红（超期未跟进） — 保留兼容，优先用倒计时胶囊 */
  isOverdue: boolean;
  /** α 版线索原始附件；详情页与编辑弹窗共用 */
  attachments?: Attachment[];
  /** 软删除标记；普通线索池不展示 */
  deleted?: boolean;
  mergedIntoLeadId?: string;

  // --- 线索派发字段（lead-dispatch-dev-plan.md 阶段 A） ---
  /** 业务线 */
  businessLine?: string;
  /** 渠道计划（自由文本） */
  channelPlan?: string;
  /** 派发时间 */
  dispatchedAt?: string;
  /** 派发目标：销售 or 公海 */
  dispatchTarget?: string;
  /** 线索事件记录（只增不删） */
  leadEvents?: import('@/app/pages/lead-dispatch/types').LeadEvent[];
}

// --- 快捷筛选类型 ---
export type QuickFilter =
  | 'today_unfollowed'
  | 'today_followed'
  | 'overdue'
  | 'level_s'
  | 'level_ab'
  | 'week_new';

export const QUICK_FILTER_LABEL: Record<QuickFilter, string> = {
  today_unfollowed: '今日未跟进',
  today_followed: '今日已跟进',
  overdue: '超期未触达',
  level_s: 'S 级高意向',
  level_ab: 'AB 类客户',
  week_new: '本周新录入',
};

// --- 快捷话术模板 ---
export const FOLLOWUP_TEMPLATES = [
  { label: '初步建联', content: '已电话初步建联，约定明天发方案' },
  { label: '无人接听', content: '无人接听，已转短信提醒' },
  { label: '确认需求', content: '已确认需求，进入方案报价阶段' },
  { label: '暂无进展', content: '客户暂无进展，下周再跟进' },
  { label: '发送案例', content: '已通过微信发送案例库，等待客户反馈' },
  { label: '约演示', content: '已与客户约定演示时间，准备演示材料' },
] as const;

// --- 操作类型 ---
export type LeadAction =
  | 'claim'       // 领取
  | 'assign'      // 分配
  | 'return'      // 退回公海
  | 'trash'       // 标记垃圾
  | 'delete'      // 删除（软删除）
  | 'transform';  // 转客户

// --- 跟进列表分类 ---
export type FollowUpTab = 'all' | 'today_pending' | 'today_done' | 'overdue';

export const FOLLOWUP_TAB_LABEL: Record<FollowUpTab, string> = {
  all: '全部跟进',
  today_pending: '今日待跟进',
  today_done: '今日已跟进',
  overdue: '超期未跟进',
};

// --- 流转记录（分配/转让/退回/垃圾/转客户） ---
export interface TransferRecord {
  id: string;
  leadId: string;
  operator: string;          // 操作人
  action: 'assign' | 'transfer' | 'return' | 'trash' | 'claim' | 'transform'; // 操作类别
  toOwner: string;           // 归属人（操作后）
  status: string;            // 线索状态（操作后）
  reason?: string;           // 原因
  createdAt: string;         // 操作时间
}

export const TRANSFER_ACTION_LABEL: Record<TransferRecord['action'], string> = {
  assign: '分配',
  transfer: '转让',
  return: '退回公海',
  trash: '标记垃圾',
  claim: '认领',
  transform: '转客户',
};

export const TRANSFER_ACTION_COLOR: Record<TransferRecord['action'], string> = {
  assign: 'blue',
  transfer: 'purple',
  return: 'orange',
  trash: 'red',
  claim: 'green',
  transform: 'cyan',
};

// --- 分配记录 ---
export interface AssignRecord {
  id: string;
  leadId: string;
  fromOwner: string;
  toOwner: string;
  reason: string;
  operator: string;
  createdAt: string;
}

// --- 退回记录 ---
export interface ReturnRecord {
  id: string;
  leadId: string;
  reason: string;
  operator: string;
  createdAt: string;
  /** 第几次退回 */
  returnCount: number;
}
