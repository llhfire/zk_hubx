/**
 * 线索派发规则纯函数
 *
 * 规约见 lead-dispatch-dev-plan.md §阶段 A：
 * - canBeDispatched：待派发锁定领取；派发目标 = 销售或公海
 * - canBeClaimed：待派发锁领取、退回公海可领
 * - returnQualityBucket：退回按不同销售去重计数，满 3 人转管理员确认进垃圾
 */

import type { ReturnQualityState, ReturnQualityBucket } from './types';

/**
 * 是否可被派发
 *
 * 条件：
 * - clueType !== 'trash'（垃圾线索不可派发）
 * - status !== '已成交'（已成交不可派发）
 * - 未派发（dispatchedAt 为空）或已退回公海（dispatchTarget === 'pool'）
 */
export function canBeDispatched(params: {
  clueType: string;
  status: string;
  dispatchedAt?: string | null;
  dispatchTarget?: string | null;
}): boolean {
  if (params.clueType === 'trash') return false;
  if (params.status === '已签单' || params.status === '已终止') return false;
  // 未派发或已退回公海 → 可派发
  return !params.dispatchedAt || params.dispatchTarget === 'pool';
}

/**
 * 是否可被领取（从公海）
 *
 * 条件：
 * - clueType !== 'trash'
 * - status 为可领取状态（public / assigned 都可以）
 * - 派发到公海（dispatchTarget === 'pool'）或未派发且在公海
 */
export function canBeClaimed(params: {
  clueType: string;
  status: string;
  dispatchedAt?: string | null;
  dispatchTarget?: string | null;
}): boolean {
  if (params.clueType === 'trash') return false;
  if (params.status === '已签单' || params.status === '已终止') return false;
  // 派发到公海 → 可领取
  if (params.dispatchTarget === 'pool') return true;
  // 未派发且在公海 → 可领取
  if (!params.dispatchedAt && params.clueType === 'public') return true;
  return false;
}

/**
 * 退回质检分桶
 *
 * 规则：
 * - 按不同销售去重计数（同一人重复领退不累计）
 * - 1 人退回 → abandoned_1（放弃 1 次）
 * - 2 人退回 → abandoned_2（放弃 2 次）
 * - ≥3 人退回 → pending_confirm（待管理员确认进垃圾）
 * - 0 人 → safe
 */
export function returnQualityBucket(
  returnActors: string[],
): ReturnQualityState {
  // 去重
  const distinct = [...new Set(returnActors)];
  const count = distinct.length;

  let bucket: ReturnQualityBucket;
  let label: string;

  if (count === 0) {
    bucket = 'safe';
    label = '正常';
  } else if (count === 1) {
    bucket = 'abandoned_1';
    label = '1人放弃';
  } else if (count === 2) {
    bucket = 'abandoned_2';
    label = '2人放弃';
  } else {
    bucket = 'pending_confirm';
    label = `${count}人退回，待确认`;
  }

  return { bucket, distinctReturnCount: count, label };
}
