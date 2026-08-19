// ========================================
// 运营费用 - 纯函数：变更操作
// 与报价 quoteFlow.ts / quotationMutations.ts 同套路
// ========================================

import type {
  ExpenseRecord,
  RecurringExpenseTemplate,
  ExpenseStatus,
  AuditEntry,
} from './types';

/** 判断模板是否可以为指定月份生成 */
export function canGenerate(
  template: RecurringExpenseTemplate,
  month: string,
  existing: ExpenseRecord[],
): boolean {
  if (template.status !== 'active') return false;
  if (template.endMonth && month > template.endMonth) return false;
  if (month < template.startMonth) return false;
  // 已有同模板同月 posted 或 pending → 跳过
  return !existing.some(
    r => r.templateId === template.id && r.billingMonth === month && (r.status === 'posted' || r.status === 'pending'),
  );
}

/** 从模板生成费用记录 */
export function generateFromTemplate(
  template: RecurringExpenseTemplate,
  month: string,
  handler: string,
  seq: number,
): ExpenseRecord {
  const status: ExpenseStatus = template.kind === 'fixed' ? 'posted' : 'pending';
  return {
    id: `exp-${template.id}-${month}-${Date.now()}`,
    expenseNo: `EXP-${month.replace('-', '')}-${String(seq).padStart(3, '0')}`,
    categoryPrimary: template.categoryPrimary,
    categorySecondary: template.categorySecondary,
    amount: template.amount,
    occurDate: `${month}-01`,
    billingMonth: month,
    attribution: template.attribution,
    departmentId: template.departmentId,
    source: 'template',
    templateId: template.id,
    status,
    handler,
    audit: [{ at: new Date().toISOString(), actor: handler, action: 'create', detail: `从模板 ${template.name} 生成` }],
    isProjection: false,
  };
}

/** 调价：写调价历史，不改已入账 */
export function adjustTemplatePrice(
  template: RecurringExpenseTemplate,
  newAmount: number,
  effectiveMonth: string,
  actor: string,
): RecurringExpenseTemplate {
  return {
    ...template,
    amount: newAmount,
    priceHistory: [
      ...template.priceHistory,
      {
        at: new Date().toISOString(),
        actor,
        oldAmount: template.amount,
        newAmount,
        effectiveMonth,
      },
    ],
  };
}

/** 作废：posted → voided，留痕迹 */
export function voidExpense(
  record: ExpenseRecord,
  actor: string,
): ExpenseRecord {
  if (record.status !== 'posted') {
    throw new Error('只能作废 posted 状态的记录');
  }
  return {
    ...record,
    status: 'voided',
    audit: [
      ...record.audit,
      { at: new Date().toISOString(), actor, action: 'void' },
    ],
  };
}

/** 修改已入账记录（仅限本台账写入方） */
export function patchPostedExpense(
  record: ExpenseRecord,
  patch: Partial<Pick<ExpenseRecord, 'amount' | 'description' | 'categorySecondary'>>,
  actor: string,
): ExpenseRecord {
  if (record.status !== 'posted') {
    throw new Error('只能修改 posted 状态的记录');
  }
  if (record.isProjection) {
    throw new Error('投影记录禁止修改');
  }
  const changes: string[] = [];
  if (patch.amount !== undefined && patch.amount !== record.amount) {
    changes.push(`金额 ${record.amount} → ${patch.amount}`);
  }
  if (patch.description !== undefined && patch.description !== record.description) {
    changes.push('描述已更新');
  }
  return {
    ...record,
    ...patch,
    audit: [
      ...record.audit,
      { at: new Date().toISOString(), actor, action: 'update', detail: changes.join('; ') || '无变更' },
    ],
  };
}

/** 确认浮动模板生成的 pending 记录 → posted */
export function confirmExpense(
  record: ExpenseRecord,
  actor: string,
): ExpenseRecord {
  if (record.status !== 'pending') {
    throw new Error('只能确认 pending 状态的记录');
  }
  return {
    ...record,
    status: 'posted',
    audit: [
      ...record.audit,
      { at: new Date().toISOString(), actor, action: 'update', detail: '确认入账' },
    ],
  };
}

// ==================== 阶段 B：只读归集 ====================

interface TravelReimbursementForImport {
  id: string;
  reimbursementNo: string;
  tripId: string;
  totalAmount: number;
  status: string;
  createDate: string;
}

interface TripForImport {
  id: string;
  projectId?: string;
  leadId?: string;
}

/**
 * 从差旅模块导入 finance_approved 报销 → TRAVEL 投影
 * 禁止 attribution='pool'（ADR-0089）
 */
export function importTravelReimbursement(
  reimb: TravelReimbursementForImport,
  trip: TripForImport,
  existingIds: Set<string>,
): ExpenseRecord | null {
  // 只导入 finance_approved 及之后状态
  if (reimb.status !== 'finance_approved' && reimb.status !== 'paid' && reimb.status !== 'completed') {
    return null;
  }
  // 防重复
  if (existingIds.has(`travel-${reimb.id}`)) {
    return null;
  }

  const attribution = trip.projectId ? 'project' as const : 'lead_channel' as const;

  return {
    id: `travel-${reimb.id}`,
    expenseNo: `TRV-${reimb.reimbursementNo}`,
    categoryPrimary: 'TRAVEL',
    categorySecondary: 'TRAVEL_TRANSPORT',
    amount: reimb.totalAmount,
    occurDate: reimb.createDate,
    billingMonth: reimb.createDate.slice(0, 7),
    attribution,
    projectId: trip.projectId,
    leadId: trip.leadId,
    source: 'travel',
    sourceRefId: reimb.id,
    status: 'posted',
    handler: '系统（差旅投影）',
    audit: [{ at: new Date().toISOString(), actor: '系统', action: 'create', detail: '差旅报销自动投影' }],
    isProjection: true,
  };
}
