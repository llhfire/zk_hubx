/** 版本机制测试 */

import { describe, it, expect } from 'vitest';
import { snapshotOf, buildVersion } from '../versioning';
import type { SmartMinute } from '../types';

const baseMinute: SmartMinute = {
  id: '1',
  title: '测试会议',
  meetingTime: '2026-08-20T14:00:00',
  organizerId: 'user_a',
  reviewerId: 'user_b',
  attendeeIds: ['user_a', 'user_b', 'user_c'],
  status: 'draft',
  refs: [
    { kind: 'lead', id: 'lead_1', displaySnapshot: '测试线索', savedAsView: '销售' },
  ],
  coreDecisions: ['决定A', '决定B'],
  contentMarkdown: '# 正文',
  actionItems: [
    {
      actionItemId: 'ai_1',
      content: '行动项1',
      assigneeId: 'user_c',
      assigneeName: '王五',
      priority: 'P0',
      priorityNeedsReview: false,
      dueDate: '2026-08-25',
      refs: [],
      status: 'pending',
    },
  ],
  source: null,
  versions: [],
  adminSource: null,
  polishPreview: null,
  createdAt: '2026-08-20T14:00:00',
  updatedAt: '2026-08-20T14:00:00',
};

describe('snapshotOf', () => {
  it('快照包含所有必要字段', () => {
    const snapshot = snapshotOf(baseMinute);
    expect(snapshot.title).toBe('测试会议');
    expect(snapshot.meetingTime).toBe('2026-08-20T14:00:00');
    expect(snapshot.attendeeIds).toEqual(['user_a', 'user_b', 'user_c']);
    expect(snapshot.refs).toHaveLength(1);
    expect(snapshot.coreDecisions).toEqual(['决定A', '决定B']);
    expect(snapshot.contentMarkdown).toBe('# 正文');
    expect(snapshot.actionItems).toHaveLength(1);
  });

  it('快照是深拷贝（修改快照不影响原纪要）', () => {
    const snapshot = snapshotOf(baseMinute);
    snapshot.title = '修改后';
    snapshot.actionItems[0].content = '修改后';
    expect(baseMinute.title).toBe('测试会议');
    expect(baseMinute.actionItems[0].content).toBe('行动项1');
  });
});

describe('buildVersion', () => {
  it('生成 confirm 版本', () => {
    const version = buildVersion(baseMinute, 'confirm', '2026-08-20T16:00:00');
    expect(version.reason).toBe('confirm');
    expect(version.createdAt).toBe('2026-08-20T16:00:00');
    expect(version.snapshot.title).toBe('测试会议');
    expect(version.versionId).toContain('v1_');
  });

  it('生成 withdraw_edit 版本', () => {
    const minuteWithVersion = { ...baseMinute, versions: [{ versionId: 'v1_x', reason: 'confirm' as const, createdAt: '', snapshot: snapshotOf(baseMinute) }] };
    const version = buildVersion(minuteWithVersion, 'withdraw_edit', '2026-08-21T10:00:00');
    expect(version.reason).toBe('withdraw_edit');
    expect(version.versionId).toContain('v2_');
  });

  it('版本只追加（不覆盖已有版本）', () => {
    const existingVersions = [
      { versionId: 'v1_x', reason: 'confirm' as const, createdAt: '2026-08-20', snapshot: snapshotOf(baseMinute) },
    ];
    const minuteWithVersion = { ...baseMinute, versions: existingVersions };
    const newVersion = buildVersion(minuteWithVersion, 'resubmit', '2026-08-21');
    expect(minuteWithVersion.versions).toHaveLength(1);
    expect(newVersion.versionId).toContain('v2_');
  });

  it('四种 reason 都能生成版本', () => {
    const reasons = ['ai_regenerate', 'withdraw_edit', 'confirm', 'resubmit'] as const;
    for (const reason of reasons) {
      const version = buildVersion(baseMinute, reason, '2026-08-20');
      expect(version.reason).toBe(reason);
      expect(version.snapshot).toBeDefined();
    }
  });
});
