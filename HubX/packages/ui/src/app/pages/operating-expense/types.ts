// ========================================
// 运营费用模块 - 类型定义
// PRD：文档/PRD/PRD-运营费用管理.md
// ADR：0076–0085
// ========================================

export type ExpenseStatus = 'pending' | 'posted' | 'voided';

export type Attribution = 'pool' | 'project' | 'lead_channel';

export type ExpenseSource = 'manual' | 'template' | 'excel' | 'travel' | 'promotion' | 'reimbursement';

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

export type TemplateKind = 'fixed' | 'variable';

/**
 * 一级科目（categoryPrimary）
 * LABOR 内置不可录入；其余 8 个可录入
 */
export type ExpenseCategoryPrimary =
  | 'OFFICE'        // 办公
  | 'BENEFIT'       // 福利
  | 'HR_ADMIN'      // 人资行政
  | 'OTHER'         // 其他
  | 'TRAVEL'        // 差旅
  | 'PROMOTION'     // 推广
  | 'BUSINESS'      // 商务
  | 'THIRD_PARTY'   // 第三方
  | 'LABOR';        // 人力成本（内置不可录入）

/** 可录入的一级科目（排除 LABOR） */
export const RECORDABLE_PRIMARY: ExpenseCategoryPrimary[] = [
  'OFFICE', 'BENEFIT', 'HR_ADMIN', 'OTHER',
  'TRAVEL', 'PROMOTION', 'BUSINESS', 'THIRD_PARTY',
];

// ==================== 核心实体 ====================

/** 费用记录 */
export interface ExpenseRecord {
  id: string;
  expenseNo: string;            // EXP-YYYYMM-序号
  categoryPrimary: ExpenseCategoryPrimary;
  categorySecondary?: string;   // 二级科目
  amount: number;
  occurDate: string;            // 发生日
  billingMonth: string;         // 归属月 YYYY-MM
  attribution: Attribution;
  departmentId?: string;
  projectId?: string;
  channelId?: string;
  source: ExpenseSource;
  sourceRefId?: string;
  templateId?: string;
  status: ExpenseStatus;
  handler: string;              // 经办人
  description?: string;
  attachments?: { id: string; name: string }[];
  audit: AuditEntry[];
  isProjection: boolean;        // 是否投影（来自源模块）
}

/** 审计痕迹 */
export interface AuditEntry {
  at: string;
  actor: string;
  action: 'create' | 'update' | 'void';
  detail?: string;
}

/** 固定/浮动模板 */
export interface RecurringExpenseTemplate {
  id: string;
  name: string;
  kind: TemplateKind;
  categoryPrimary: ExpenseCategoryPrimary;
  categorySecondary?: string;
  amount: number;
  cycle: BillingCycle;
  billingDay: number;           // 每月几号生成
  startMonth: string;           // YYYY-MM
  endMonth?: string;
  attribution: Attribution;
  departmentId?: string;
  status: 'active' | 'paused';
  priceHistory: PriceChange[];
}

/** 调价记录 */
export interface PriceChange {
  at: string;
  actor: string;
  oldAmount: number;
  newAmount: number;
  effectiveMonth: string;       // YYYY-MM
}

/** 工天数表（α 估数，大小周） */
export type WorkdaysByMonth = Record<string, number>;

/** 员工折算信息 */
export interface EmployeeForOverhead {
  id: string;
  name: string;
  hireDate: string;
  leaveDate?: string;
  employmentStatus: string;
}
