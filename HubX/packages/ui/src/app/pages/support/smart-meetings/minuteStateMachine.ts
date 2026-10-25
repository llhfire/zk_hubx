/** 纪要状态机 + 动作权限纯函数 */

import type {
  MinuteStatus,
  MinuteAction,
  MeetingRole,
  SmartMinute,
} from './types';

/** 迁移表：[前状态, 动作] -> 是否合法（不考虑角色） */
const TRANSITIONS: Array<[MinuteStatus, MinuteAction]> = [
  ['draft', 'submit'],
  ['draft', 'delete'],
  ['pending_review', 'confirm'],
  ['pending_review', 'reject'],
  ['confirmed', 'withdraw'],
  ['confirmed', 'archive'],
];

/** 角色权限表：动作 -> 允许的角色集合 */
const ACTION_ROLES: Record<MinuteAction, MeetingRole[]> = {
  submit: ['organizer', 'admin'],
  confirm: ['reviewer', 'admin'],
  reject: ['reviewer', 'admin'],
  withdraw: ['organizer', 'admin'],
  archive: ['reviewer', 'admin'],
  delete: ['organizer', 'admin'],
};

/** 判断状态迁移是否合法（状态 + 角色双重校验） */
export function canTransition(
  status: MinuteStatus,
  action: MinuteAction,
  role: MeetingRole,
): boolean {
  const stateOk = TRANSITIONS.some(([s, a]) => s === status && a === action);
  if (!stateOk) return false;
  return ACTION_ROLES[action].includes(role);
}

/** 字段编辑权限：organizer/admin 且 status ∈ {draft, pending_review} */
export function canEditFields(
  m: SmartMinute,
  actorId: string,
  actorRole: MeetingRole,
): boolean {
  if (actorRole === 'admin') return m.status === 'draft' || m.status === 'pending_review';
  if (actorRole === 'organizer' && m.organizerId === actorId) {
    return m.status === 'draft' || m.status === 'pending_review';
  }
  return false;
}

/** 应用状态迁移，返回新纪要或错误原因 */
export function applyTransition(
  m: SmartMinute,
  action: MinuteAction,
  actorId: string,
  now: string,
): { ok: true; minute: SmartMinute } | { ok: false; reason: string } {
  // 角色推断：简化版，实际由调用方注入
  const role = inferRole(m, actorId);
  if (!canTransition(m.status, action, role)) {
    return { ok: false, reason: `状态 ${m.status} 不允许执行 ${action}` };
  }

  const next: SmartMinute = { ...m, updatedAt: now };

  switch (action) {
    case 'submit':
      next.status = 'pending_review';
      break;
    case 'confirm':
      next.status = 'confirmed';
      break;
    case 'reject':
      // 状态不变，语义：修改后待确认
      break;
    case 'withdraw':
      next.status = 'draft';
      break;
    case 'archive':
      next.status = 'archived';
      break;
    case 'delete':
      // 物理删除由调用方处理
      break;
  }

  return { ok: true, minute: next };
}

/** 推断用户在纪要中的角色（简化版） */
function inferRole(m: SmartMinute, actorId: string): MeetingRole {
  if (m.organizerId === actorId) return 'organizer';
  if (m.reviewerId === actorId) return 'reviewer';
  if (m.attendeeIds.includes(actorId)) return 'attendee';
  return 'biz_member';
}
