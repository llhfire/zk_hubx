// 签约开启事件 diff 纯函数。
// 从 ApprovalDeliveryBridge 的 approvedSnapshotRef diff 逻辑中抽出，
// 使两条接线（合同侧 / 线索侧）共用同一套事件检测，且可单测。

import type { Contract } from './types';

export interface ContractEvents {
  /** 新增的非作废合同（草稿也算） */
  created: Contract[];
  /** approvedAt 首次写入且非作废的合同 */
  approved: Contract[];
}

/**
 * 比较前后两份合同快照，产出 created / approved 两类事件。
 * 首帧（prev = null）不触发——避免刷新页面时把存量「合同洽谈」线索
 * 批量刷成未确认项目。
 */
export function diffContractEvents(
  prev: Record<string, string | undefined> | null,
  next: Contract[],
): ContractEvents {
  if (!prev) return { created: [], approved: [] };

  const created: Contract[] = [];
  const approved: Contract[] = [];

  for (const c of next) {
    const existedInPrev = c.id in prev;
    const beforeApprovedAt = prev[c.id];
    // created：快照中不存在的合同 且 非作废 且 非同帧批准（同帧批准只进 approved）
    if (!existedInPrev && c.status !== 'voided' && !c.approvedAt) {
      created.push(c);
    }
    // approved：approvedAt 从无到有 且 非作废
    if (c.approvedAt && !beforeApprovedAt && c.status !== 'voided') {
      approved.push(c);
    }
  }

  return { created, approved };
}
