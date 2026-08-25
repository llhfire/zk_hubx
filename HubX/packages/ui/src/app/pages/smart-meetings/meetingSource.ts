/** 行政会议来源快照映射纯函数 */

import type {
  SmartMinute,
  AdminMeetingSnapshot,
  BusinessRef,
} from './types';

/** 行政会议 Meeting 接口（来自 MeetingManagement.tsx） */
export interface AdminMeeting {
  id: string;
  title: string;
  meetingTime: string;
  organizer: string;
  attendees: string[];
  projectId?: string;
  projectTitle?: string;
  status: 'active' | 'cancelled' | 'deleted';
}

/** 从行政会议构造一次性快照 */
export function buildAdminSnapshot(
  meeting: AdminMeeting,
  projectRef?: BusinessRef,
): AdminMeetingSnapshot {
  return {
    sourceMeetingId: meeting.id,
    title: meeting.title,
    meetingTime: meeting.meetingTime,
    organizer: meeting.organizer,
    attendees: [...meeting.attendees],
    projectRefs: projectRef ? [projectRef] : [],
    sourceStatus: meeting.status,
  };
}

/** 行政会议是否已有当前智能纪要（一会议至多一篇） */
export function hasActiveMinute(
  sourceMeetingId: string,
  all: SmartMinute[],
): boolean {
  return all.some(
    m =>
      m.adminSource?.sourceMeetingId === sourceMeetingId &&
      m.status !== 'archived',
  );
}
