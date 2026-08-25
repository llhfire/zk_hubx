/** 行政来源映射测试 */

import { describe, it, expect } from 'vitest';
import { buildAdminSnapshot, hasActiveMinute } from '../meetingSource';
import type { AdminMeeting } from '../meetingSource';
import type { SmartMinute } from '../types';

const mockMeeting: AdminMeeting = {
  id: 'meeting_1',
  title: '周例会',
  meetingTime: '2026-08-20T14:00:00',
  organizer: '张三',
  attendees: ['张三', '李四', '王五'],
  status: 'active',
};

describe('buildAdminSnapshot', () => {
  it('构造快照包含所有字段', () => {
    const snapshot = buildAdminSnapshot(mockMeeting);
    expect(snapshot.sourceMeetingId).toBe('meeting_1');
    expect(snapshot.title).toBe('周例会');
    expect(snapshot.meetingTime).toBe('2026-08-20T14:00:00');
    expect(snapshot.organizer).toBe('张三');
    expect(snapshot.attendees).toEqual(['张三', '李四', '王五']);
    expect(snapshot.sourceStatus).toBe('active');
    expect(snapshot.projectRefs).toEqual([]);
  });

  it('带项目引用', () => {
    const projectRef = { kind: 'project' as const, id: 'proj_1', displaySnapshot: '项目A', savedAsView: '交付' };
    const snapshot = buildAdminSnapshot(mockMeeting, projectRef);
    expect(snapshot.projectRefs).toHaveLength(1);
    expect(snapshot.projectRefs[0].id).toBe('proj_1');
  });

  it('attendees 是深拷贝', () => {
    const snapshot = buildAdminSnapshot(mockMeeting);
    snapshot.attendees.push('新成员');
    expect(mockMeeting.attendees).toHaveLength(3);
  });
});

describe('hasActiveMinute', () => {
  const minutes: SmartMinute[] = [
    {
      id: '1',
      title: '',
      meetingTime: '',
      organizerId: '',
      reviewerId: '',
      attendeeIds: [],
      status: 'confirmed',
      refs: [],
      coreDecisions: [],
      contentMarkdown: '',
      actionItems: [],
      source: null,
      versions: [],
      adminSource: { sourceMeetingId: 'meeting_1', title: '', meetingTime: '', organizer: '', attendees: [], projectRefs: [], sourceStatus: 'active' },
      polishPreview: null,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '2',
      title: '',
      meetingTime: '',
      organizerId: '',
      reviewerId: '',
      attendeeIds: [],
      status: 'archived',
      refs: [],
      coreDecisions: [],
      contentMarkdown: '',
      actionItems: [],
      source: null,
      versions: [],
      adminSource: { sourceMeetingId: 'meeting_1', title: '', meetingTime: '', organizer: '', attendees: [], projectRefs: [], sourceStatus: 'active' },
      polishPreview: null,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '3',
      title: '',
      meetingTime: '',
      organizerId: '',
      reviewerId: '',
      attendeeIds: [],
      status: 'draft',
      refs: [],
      coreDecisions: [],
      contentMarkdown: '',
      actionItems: [],
      source: null,
      versions: [],
      adminSource: { sourceMeetingId: 'meeting_2', title: '', meetingTime: '', organizer: '', attendees: [], projectRefs: [], sourceStatus: 'active' },
      polishPreview: null,
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('有当前纪要（confirmed）返回 true', () => {
    expect(hasActiveMinute('meeting_1', minutes)).toBe(true);
  });

  it('归档后同一行政会议允许再建（hasActiveMinute 只看非 archived）', () => {
    // meeting_1 有 confirmed + archived，confirmed 仍算 active
    expect(hasActiveMinute('meeting_1', minutes)).toBe(true);
  });

  it('无匹配的行政会议返回 false', () => {
    expect(hasActiveMinute('meeting_999', minutes)).toBe(false);
  });

  it('meeting_2 有草稿纪要，返回 true', () => {
    expect(hasActiveMinute('meeting_2', minutes)).toBe(true);
  });
});
