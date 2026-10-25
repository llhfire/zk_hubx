// 签约开启事件 diff 纯函数。
// 从 ApprovalDeliveryBridge 的 approvedSnapshotRef diff 逻辑中抽出，
// 使两条接线（合同侧 / 线索侧）共用同一套事件检测，且可单测。

import type { Contract } from './types';

export interface ContractSnapshotEntry {
  approvedAt?: string;
  status?: string;
}

export interface ContractEvents {
  /** 新增的非作废合同（草稿也算） */
  created: Contract[];
  /** approvedAt 首次写入且非作废的合同 */
  approved: Contract[];
  /** status 变为 voided 的合同（U3：主合同作废→项目搁置） */
  voided: Contract[];
}

export type SigningOpenBridgeOutcome =
  | 'lead_project_created'
  | 'contract_project_created'
  | 'contract_delivery_started'
  | 'contract_waiting_assignment'
  | 'contract_relation_updated'
  | 'contract_missing_project';

/**
 * 签约联动桥只负责后台接缝，不重复展示业务操作已经给出的成功提示。
 * 只有无法继续联动时才返回需要展示的异常文案。
 */
export function getSigningOpenBridgeIssue(
  outcome: SigningOpenBridgeOutcome,
  contractNo?: string,
): string | null {
  if (outcome !== 'contract_missing_project') return null;
  return `合同 ${contractNo || ''} 审批通过，但线索下无项目，请先创建项目`.replace('合同  ', '合同 ');
}

/**
 * 服务端写时联动用。禁止传 null：null 是前端「首帧不触发」。
 * 首次 INSERT 必须传 {} 才能进 created。
 */
export function prevSnapshotForWrite(
  id: string,
  old: ContractSnapshotEntry | null,
): Record<string, ContractSnapshotEntry> {
  if (!old) return {};
  return { [id]: { approvedAt: old.approvedAt, status: old.status } };
}

/**
 * 判断是否需要补建未确认项目（洞 C ③）
 * 草稿/未批准且非作废，该 lead 还没有项目 → 应 spawn
 */
export function shouldEnsureUnconfirmedProject(
  next: { approvedAt?: string; status?: string; leadId?: string },
  hasProjectForLead: boolean,
): boolean {
  if (hasProjectForLead || !next.leadId) return false;
  if (next.approvedAt || next.status === 'voided') return false;
  return true;
}

/**
 * 比较前后两份合同快照，产出 created / approved / voided 三类事件。
 * 首帧（prev = null）不触发——避免刷新页面时把存量「合同洽谈」线索
 * 批量刷成未确认项目。
 */
export function diffContractEvents(
  prev: Record<string, ContractSnapshotEntry> | null,
  next: Contract[],
): ContractEvents {
  if (!prev) return { created: [], approved: [], voided: [] };

  const created: Contract[] = [];
  const approved: Contract[] = [];
  const voided: Contract[] = [];

  for (const c of next) {
    const prevEntry = prev[c.id];
    const existedInPrev = !!prevEntry;
    const beforeApprovedAt = prevEntry?.approvedAt;
    const beforeStatus = prevEntry?.status;

    // created：快照中不存在的合同 且 非作废 且 非同帧批准（同帧批准只进 approved）
    if (!existedInPrev && c.status !== 'voided' && !c.approvedAt) {
      created.push(c);
    }
    // approved：approvedAt 从无到有 且 非作废
    if (c.approvedAt && !beforeApprovedAt && c.status !== 'voided') {
      approved.push(c);
    }
    // voided：status 从非 voided 变为 voided（U3）
    if (c.status === 'voided' && beforeStatus && beforeStatus !== 'voided') {
      voided.push(c);
    }
  }

  return { created, approved, voided };
}
