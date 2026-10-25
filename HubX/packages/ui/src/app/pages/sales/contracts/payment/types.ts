// ========================================
// 合同回款看板与甘特图 - 类型定义
// 研究文档：research/合同回款看板与甘特图.md
// ========================================

import type { PaymentStatus, BlockerType } from '../types';

// ==================== 确定性分级（独立于 PaymentStatus） ====================

/** 现金流预测确定性等级 */
export type ForecastCertaintyLevel = 'high' | 'medium' | 'low' | 'blocked';

/** 确定性权重（α 硬编码，β 做配置） */
export const CERTAINTY_WEIGHTS: Record<ForecastCertaintyLevel, number> = {
  high: 1.0,     // 已开票待打款 / 里程碑已验收签字
  medium: 0.8,   // 项目正常推进，工期偏差 ≤3 天
  low: 0.4,      // 交付延期 >7 天 / 客户轻度拖延
  blocked: 0,    // 未解决的合同纠纷或严重卡点
};

/** 确定性等级中文标签 */
export const CERTAINTY_LABELS: Record<ForecastCertaintyLevel, string> = {
  high: '高确信',
  medium: '正常履约',
  low: '风险受阻',
  blocked: '卡点阻滞',
};

/** 确定性等级颜色 */
export const CERTAINTY_COLORS: Record<ForecastCertaintyLevel, string> = {
  high: 'green',
  medium: 'blue',
  low: 'orange',
  blocked: 'red',
};

// ==================== 预测调期 ====================

/** 预测调期记录（拖拽甘特图节点后生成） */
export interface ForecastOverride {
  id: string;
  contractId: string;
  periodIndex: number;
  originalDate: string;       // 原定日期
  newForecastDate: string;    // 新预测日期
  reason: string;             // 调期原因
  createdBy: string;
  createdAt: string;
}

// ==================== 甘特图节点 ====================

/** 甘特图单个付款节点 */
export interface ForecastNode {
  nodeId: string;
  contractId: string;
  contractNo: string;
  contractName: string;
  customerName: string;
  salesOwner: string;
  projectManager?: string;

  periodIndex: number;        // 期次序号（0-based）
  periodName: string;         // '首期款' / '二期款' / '验收款' / '尾款'
  amount: number;
  percentage: number;         // 占合同比例

  plannedDate: string;        // 合同原始约定日期
  forecastDate: string;       // 动态预测到账日期
  actualDate?: string;        // 实际到账日期

  // 交付联动
  linkedProjectId?: string;
  linkedSopPhase?: string;    // 关联 SOP 交付阶段
  deliveryStatus?: 'on_track' | 'delayed' | 'completed';
  deliveryDelayDays?: number; // 交付延期天数
  certaintyLevel: ForecastCertaintyLevel;
  riskReason?: string;

  isSettled: boolean;
  isBlocked: boolean;
}

// ==================== 现金流聚合 ====================

/** 月度现金流预测聚合 */
export interface CashflowMetric {
  month: string;              // 'YYYY-MM'
  totalPlanned: number;       // 原始合同计划流入
  totalForecast: number;      // 动态预测流入（加权）
  highCertaintyAmount: number;
  mediumCertaintyAmount: number;
  lowCertaintyAmount: number;
  blockedAmount: number;
  receivedAmount: number;     // 当月实际已到账
}

// ==================== 看板视图 ====================

/** 看板五列状态（派生，非存储） */
export type KanbanColumn = 'normal' | 'upcoming' | 'overdue' | 'blocked' | 'settled';

/** 看板列元数据 */
export const KANBAN_COLUMNS: Record<KanbanColumn, { label: string; color: string }> = {
  normal: { label: '正常回款', color: 'blue' },
  upcoming: { label: '即将到期', color: 'orange' },
  overdue: { label: '已逾期', color: 'red' },
  blocked: { label: '卡点阻塞', color: 'red' },
  settled: { label: '已结清', color: 'green' },
};

/** 看板列排序优先级（blocked 最高） */
export const KANBAN_PRIORITY: Record<KanbanColumn, number> = {
  blocked: 0,
  overdue: 1,
  upcoming: 2,
  normal: 3,
  settled: 4,
};

// ==================== 权限 ====================

export type PaymentRole = 'sales' | 'pm' | 'finance' | 'management';

export const PAYMENT_ROLES: { key: PaymentRole; label: string }[] = [
  { key: 'sales', label: '销售/商务' },
  { key: 'pm', label: '项目经理' },
  { key: 'finance', label: '财务人员' },
  { key: 'management', label: '高管/总经理' },
];

/** 各角色可见范围说明 */
export const PAYMENT_ROLE_SCOPES: Record<PaymentRole, string> = {
  sales: '仅个人名下合同',
  pm: '名下项目关联合同',
  finance: '全公司合同',
  management: '全板块只读',
};
