/** 会议角色 + 业务权限双重过滤纯函数 */

import type {
  SmartMinute,
  BusinessRef,
  MeetingRole,
  MinuteAction,
} from './types';
import { canEditFields, canTransition } from './minuteStateMachine';

/** 查看者上下文 */
export interface ViewerContext {
  userId: string;
  isAdmin: boolean;
  /** 业务权限谓词：用户对某业务单是否有查看权 */
  canViewBiz: (ref: BusinessRef) => boolean;
}

/** 纪要视图（过滤后的可见字段） */
export interface MinuteView {
  visible: boolean;
  canSeeSourceText: boolean;
  canSeeContent: boolean;
  /** 脱敏后的引用列表：无权引用保留但替换展示 */
  maskedRefs: BusinessRef[];
  canEdit: boolean;
  canTransitionTo: MinuteAction[];
}

/** 推断用户在纪要中的角色 */
function inferRole(m: SmartMinute, userId: string): MeetingRole {
  if (m.organizerId === userId) return 'organizer';
  if (m.reviewerId === userId) return 'reviewer';
  if (m.attendeeIds.includes(userId)) return 'attendee';
  return 'biz_member';
}

/** 脱敏引用：无权引用替换展示文案 */
function maskRefs(refs: BusinessRef[], canViewBiz: (ref: BusinessRef) => boolean): BusinessRef[] {
  return refs.map(ref =>
    canViewBiz(ref)
      ? ref
      : { ...ref, displaySnapshot: '无权查看的业务单' }
  );
}

/** 计算用户对纪要的可见视图 */
export function viewMinute(m: SmartMinute, viewer: ViewerContext): MinuteView {
  const role = viewer.isAdmin ? 'admin' : inferRole(m, viewer.userId);

  // admin / organizer / reviewer：整篇可见（含原始文本）
  if (role === 'organizer' || role === 'reviewer' || role === 'admin') {
    return {
      visible: true,
      canSeeSourceText: true,
      canSeeContent: true,
      maskedRefs: m.refs,
      canEdit: canEditFields(m, viewer.userId, role),
      canTransitionTo: getAvailableActions(m.status, role),
    };
  }

  // attendee：可见正文，无原始文本
  if (role === 'attendee') {
    return {
      visible: true,
      canSeeSourceText: false,
      canSeeContent: true,
      maskedRefs: m.refs,
      canEdit: false,
      canTransitionTo: [],
    };
  }

  // biz_member：至少一条引用有权限才 visible
  const hasVisibleRef = m.refs.some(r => viewer.canViewBiz(r));
  if (!hasVisibleRef) {
    return {
      visible: false,
      canSeeSourceText: false,
      canSeeContent: false,
      maskedRefs: [],
      canEdit: false,
      canTransitionTo: [],
    };
  }

  return {
    visible: true,
    canSeeSourceText: false,
    canSeeContent: true,
    maskedRefs: maskRefs(m.refs, viewer.canViewBiz),
    canEdit: false,
    canTransitionTo: [],
  };
}

/** 获取当前状态可用的动作列表 */
function getAvailableActions(status: SmartMinute['status'], role: MeetingRole): MinuteAction[] {
  const allActions: MinuteAction[] = ['submit', 'confirm', 'reject', 'withdraw', 'archive', 'delete'];
  return allActions.filter(action => canTransition(status, action, role));
}
