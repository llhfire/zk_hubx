// 报价域权限纯函数（4.2）。
// 不建用户体系；权限配置只服务报价域准入，人名仍是字符串。
// 后续接真实用户体系时只换配置源。

import type { Quote, QuoteAction, QuoteStatus } from './types';

// ─── 权限配置类型 ──────────────────────────────────────────

export interface QuotePermission {
  /** 有报价权限可建单的人名 */
  creators: string[];
  /** 有报价权限的管理员（能打开所有单） */
  admins: string[];
}

// ─── canViewQuote ──────────────────────────────────────────

/** 打开范围（五类人并集）：创建人 / salesOwnerName / 评估人 / 快照会签人 / 盖章人 / admin */
export function canViewQuote(
  quote: Quote,
  viewer: string,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (viewer === quote.basicInfo.creatorName) return true;
  if (viewer === quote.salesOwnerName) return true;
  if (viewer === quote.basicInfo.techEvaluatorName) return true;
  // 快照会签人
  if (quote.auditNodes.some((n) => n.auditorName === viewer)) return true;
  // 盖章人
  if (viewer === quote.stampNode.stamperName) return true;
  return false;
}

// ─── canCreateQuote ────────────────────────────────────────

/** quotePermission.creators 里的人才可见「新建报价」 */
export function canCreateQuote(viewer: string, perm: QuotePermission): boolean {
  return perm.creators.includes(viewer);
}

// ─── canDeleteQuote ────────────────────────────────────────

/**
 * 从未提交过评估的草稿可删（timeline 只有 create 事件）。
 * 退回改清单的草稿（return_to_edit_features 产物）不能删。
 */
export function canDeleteQuote(quote: Quote): boolean {
  if (quote.status !== 'draft') return false;
  return quote.timeline.every((ev) => ev.action === 'create');
}

// ─── quoteLeadGate ─────────────────────────────────────────

/** 前进类动作的前置闸门：线索已终止时冻结 */
export function quoteLeadGate(
  leadStatus: string | null | undefined,
  action: QuoteAction,
): boolean {
  // 拿不到线索简况 → 放行（解冻语义）
  if (!leadStatus) return true;
  // 线索未终止 → 放行
  if (leadStatus !== '已终止') return true;
  // 线索已终止：回退类动作不受限
  const rollbackActions: QuoteAction[] = [
    'withdraw_audit', 'withdraw_sent', 'return_to_stamp', 'return_to_edit_features', 'return_to_tech', 'audit_reject',
  ];
  if (rollbackActions.includes(action)) return true;
  // 线索已终止：前进类动作冻结
  return false;
}

// ─── 辅助 ─────────────────────────────────────────────────

/** 终态检查 */
export function isTerminalStatus(status: QuoteStatus): boolean {
  return status === 'confirmed' || status === 'voided';
}
