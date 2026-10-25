/**
 * 线索派发 SLA 纯函数
 *
 * 规约见 lead-dispatch-dev-plan.md §阶段 A：
 * - 派发 SLA：从录入时刻起算，超时标红+告警+催办，不自动派发
 * - 首联 SLA：首条跟进记录停表（含未接通），2h 超时 / 1h 临期
 * - 派发到公海按领取时刻起算首联
 */

import type { SlaConfig, SlaState, SlaStatus } from './types';
import { DEFAULT_SLA_CONFIG } from './types';

/**
 * 派发 SLA 状态
 *
 * @param leadCreatedAt 线索录入时间
 * @param dispatchedAt 派发时间（null = 未派发）
 * @param now 当前时间
 * @param config SLA 配置
 */
export function dispatchSlaState(
  leadCreatedAt: string,
  dispatchedAt: string | null | undefined,
  now: Date,
  config: SlaConfig = DEFAULT_SLA_CONFIG,
): SlaState {
  // 已派发 → 正常（停表）
  if (dispatchedAt) {
    return { status: 'normal', remainingMinutes: 0, label: '已派发' };
  }

  const created = new Date(leadCreatedAt).getTime();
  const elapsed = (now.getTime() - created) / 60_000; // 分钟
  const remaining = config.dispatchTimeoutMinutes - elapsed;

  if (remaining <= 0) {
    return {
      status: 'overdue',
      remainingMinutes: Math.round(remaining),
      label: `超期 ${formatMinutes(Math.abs(remaining))}`,
    };
  }
  if (remaining <= config.dispatchWarningMinutes) {
    return {
      status: 'warning',
      remainingMinutes: Math.round(remaining),
      label: `剩余 ${formatMinutes(remaining)}`,
    };
  }
  return {
    status: 'normal',
    remainingMinutes: Math.round(remaining),
    label: `剩余 ${formatMinutes(remaining)}`,
  };
}

/**
 * 首联 SLA 状态
 *
 * 首联 = 第一条跟进记录（任意方式含未接通，留痕停表，PRD §5）。
 * 跟进记录不在 leadEvents 里，由调用方传 hasFirstContact（如 followCount > 0）。
 *
 * @param dispatchedAt 派发时间
 * @param dispatchTarget 派发目标
 * @param claimedAt 公海领取时间
 * @param hasFirstContact 是否已有首条跟进记录
 * @param now 当前时间
 * @param config SLA 配置
 */
export function firstContactSlaState(
  dispatchedAt: string | null | undefined,
  dispatchTarget: string | null | undefined,
  claimedAt: string | null | undefined,
  hasFirstContact: boolean,
  now: Date,
  config: SlaConfig = DEFAULT_SLA_CONFIG,
): SlaState {
  // 未派发 → 无首联 SLA
  if (!dispatchedAt) {
    return { status: 'normal', remainingMinutes: Infinity, label: '待派发' };
  }

  // 派发到公海且未领取 → 无首联 SLA
  if (dispatchTarget === 'pool' && !claimedAt) {
    return { status: 'normal', remainingMinutes: Infinity, label: '待领取' };
  }

  // 已有首条跟进记录 -> 停表
  if (hasFirstContact) {
    return { status: 'contacted', remainingMinutes: 0, label: '已首联' };
  }

  // 起算时刻：公海领取用 claimedAt，否则用 dispatchedAt
  const startTime = dispatchTarget === 'pool' && claimedAt
    ? new Date(claimedAt).getTime()
    : new Date(dispatchedAt).getTime();

  const elapsed = (now.getTime() - startTime) / 3_600_000; // 小时
  const timeoutHours = config.firstContactTimeoutHours;
  const warningHours = config.firstContactWarningHours;
  const remainingHours = timeoutHours - elapsed;
  const remainingMinutes = Math.round(remainingHours * 60);

  if (remainingHours <= 0) {
    return {
      status: 'overdue',
      remainingMinutes,
      label: `超期 ${formatMinutes(Math.abs(remainingMinutes))}`,
    };
  }
  if (remainingHours <= warningHours) {
    return {
      status: 'warning',
      remainingMinutes,
      label: `剩余 ${formatMinutes(remainingMinutes)}`,
    };
  }
  return {
    status: 'normal',
    remainingMinutes,
    label: `剩余 ${formatMinutes(remainingMinutes)}`,
  };
}

/** 分钟数格式化为 Xh Ym */
function formatMinutes(totalMinutes: number): string {
  const m = Math.round(totalMinutes);
  if (m < 60) return `${m}分钟`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}小时` : `${h}小时${r}分钟`;
}
