/**
 * 线索事件日志纯函数
 *
 * 规约见 lead-dispatch-dev-plan.md §阶段 A：
 * - appendLeadEvent：追加事件（只增不删）
 * - buildTimeline：构建时间线展示数据
 */

import type { LeadEvent, LeadEventKind } from './types';

const EVENT_KIND_LABEL: Record<LeadEventKind, string> = {
  inbound: '录入',
  dispatch_to_sales: '派发给销售',
  dispatch_to_pool: '派发到公海',
  claim: '领取',
  urge: '催办',
  level_change: '等级调整',
  level_audit_result: '等级审核结果',
  return: '退回公海',
  trash_confirm: '确认垃圾',
};

const EVENT_KIND_ICON: Record<LeadEventKind, string> = {
  inbound: '📝',
  dispatch_to_sales: '📤',
  dispatch_to_pool: '🌊',
  claim: '📥',
  urge: '🔔',
  level_change: '📊',
  level_audit_result: '✅',
  return: '↩️',
  trash_confirm: '🗑️',
};

/**
 * 追加事件到事件列表（返回新数组，不修改原数组）
 */
export function appendLeadEvent(
  events: LeadEvent[],
  event: LeadEvent,
): LeadEvent[] {
  return [...events, event];
}

/**
 * 构建时间线展示数据
 *
 * 按时间倒序排列，附加人类可读的描述文案
 */
export function buildTimeline(
  events: LeadEvent[],
): Array<LeadEvent & { description: string; icon: string }> {
  return [...events]
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((e) => ({
      ...e,
      icon: EVENT_KIND_ICON[e.kind],
      description: buildEventDescription(e),
    }));
}

/** 构建单条事件描述 */
function buildEventDescription(event: LeadEvent): string {
  const label = EVENT_KIND_LABEL[event.kind];
  switch (event.kind) {
    case 'inbound':
      return `${event.actor} 录入线索`;
    case 'dispatch_to_sales':
      return `${event.actor} 派发给 ${event.assignee ?? '未知'}`;
    case 'dispatch_to_pool':
      return `${event.actor} 派发到公海`;
    case 'claim':
      return `${event.actor} 从公海领取`;
    case 'urge':
      return `${event.actor} 催办${event.note ? `：${event.note}` : ''}`;
    case 'level_change':
      return `${event.actor} 调整等级 ${event.levelFrom ?? '?'} → ${event.levelTo ?? '?'}`;
    case 'level_audit_result':
      return `等级审核${event.note ?? ''}`;
    case 'return':
      return `${event.actor} 退回公海${event.reason ? `（${event.reason}）` : ''}`;
    case 'trash_confirm':
      return `${event.actor} 确认为垃圾线索`;
    default:
      return label;
  }
}

/**
 * 生成事件 ID（简单实现，生产环境应替换为 UUID）
 */
export function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
