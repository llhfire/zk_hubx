/**
 * 线索派发工作台 — 领域类型
 *
 * 事实源：PRD-线索派发管理 + ADR-0096 + lead-dispatch-dev-plan.md §阶段 A
 */

// --- 业务线（CONTEXT.md §线索业务线：英文 key，必填分类） ---
export type LeadBusinessLine = 'software_outsource' | 'immigration' | 'operation';

export const BUSINESS_LINE_LABEL: Record<LeadBusinessLine, string> = {
  software_outsource: '软件外包',
  immigration: '移民业务',
  operation: '代运营业务',
};

// --- 派发目标 ---
export type DispatchTarget = 'sales' | 'pool';

export const DISPATCH_TARGET_LABEL: Record<DispatchTarget, string> = {
  sales: '指派销售',
  pool: '派发到公海',
};

// --- 线索事件（只增不删） ---
export type LeadEventKind =
  | 'inbound'             // 录入
  | 'dispatch_to_sales'   // 派发给销售
  | 'dispatch_to_pool'    // 派发到公海
  | 'claim'               // 领取（从公海）
  | 'urge'                // 催办
  | 'level_change'        // 等级调整
  | 'level_audit_result'  // 等级审核结果
  | 'return'              // 退回公海
  | 'trash_confirm';      // 垃圾确认

export interface LeadEvent {
  id: string;
  leadId: string;
  kind: LeadEventKind;
  /** 操作人 */
  actor: string;
  /** 操作时间 */
  at: string;
  /** 业务线快照 */
  businessLine?: LeadBusinessLine;
  /** 派发目标（dispatch_to_sales / dispatch_to_pool 时有值） */
  dispatchTarget?: DispatchTarget;
  /** 指派给谁（dispatch_to_sales 时有值） */
  assignee?: string;
  /** 等级调整前后（level_change 时有值） */
  levelFrom?: string;
  levelTo?: string;
  /** 退回原因 */
  reason?: string;
  /** 备注 */
  note?: string;
}

// --- SLA 配置 ---
export interface SlaConfig {
  /** 派发超时（分钟），默认 30 */
  dispatchTimeoutMinutes: number;
  /** 派发临期提醒（分钟），默认 15 */
  dispatchWarningMinutes: number;
  /** 首联超时（小时），默认 2 */
  firstContactTimeoutHours: number;
  /** 首联临期提醒（小时），默认 1 */
  firstContactWarningHours: number;
}

export const DEFAULT_SLA_CONFIG: SlaConfig = {
  dispatchTimeoutMinutes: 30,
  dispatchWarningMinutes: 15,
  firstContactTimeoutHours: 2,
  firstContactWarningHours: 1,
};

// --- SLA 状态 ---
export type SlaStatus = 'normal' | 'warning' | 'overdue' | 'contacted';

export interface SlaState {
  status: SlaStatus;
  /** 剩余分钟（负数=超期） */
  remainingMinutes: number;
  /** 人类可读文案 */
  label: string;
}

// --- 退回质检分桶 ---
export type ReturnQualityBucket = 'safe' | 'abandoned_1' | 'abandoned_2' | 'pending_confirm';

export interface ReturnQualityState {
  bucket: ReturnQualityBucket;
  /** 不同销售退回次数 */
  distinctReturnCount: number;
  /** 人类可读文案 */
  label: string;
}
