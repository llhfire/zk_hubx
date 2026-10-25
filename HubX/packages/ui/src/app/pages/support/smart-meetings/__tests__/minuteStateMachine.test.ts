/** 纪要状态机测试 */

import { describe, it, expect } from 'vitest';
import { canTransition, canEditFields, applyTransition } from '../minuteStateMachine';
import type { SmartMinute, MinuteStatus, MinuteAction, MeetingRole } from '../types';

describe('canTransition', () => {
  it('draft + submit + organizer = true', () => {
    expect(canTransition('draft', 'submit', 'organizer')).toBe(true);
  });

  it('draft + submit + attendee = false', () => {
    expect(canTransition('draft', 'submit', 'attendee')).toBe(false);
  });

  it('draft + confirm = false（须先 submit）', () => {
    expect(canTransition('draft', 'confirm', 'reviewer')).toBe(false);
  });

  it('pending_review + confirm + reviewer = true', () => {
    expect(canTransition('pending_review', 'confirm', 'reviewer')).toBe(true);
  });

  it('pending_review + confirm + organizer = false', () => {
    expect(canTransition('pending_review', 'confirm', 'organizer')).toBe(false);
  });

  it('pending_review + reject + reviewer = true', () => {
    expect(canTransition('pending_review', 'reject', 'reviewer')).toBe(true);
  });

  it('confirmed + withdraw + organizer = true', () => {
    expect(canTransition('confirmed', 'withdraw', 'organizer')).toBe(true);
  });

  it('confirmed + withdraw + attendee = false', () => {
    expect(canTransition('confirmed', 'withdraw', 'attendee')).toBe(false);
  });

  it('confirmed + archive + reviewer = true', () => {
    expect(canTransition('confirmed', 'archive', 'reviewer')).toBe(true);
  });

  it('draft + delete + organizer = true', () => {
    expect(canTransition('draft', 'delete', 'organizer')).toBe(true);
  });

  it('confirmed + delete = false（仅 draft 可删）', () => {
    expect(canTransition('confirmed', 'delete', 'organizer')).toBe(false);
  });

  it('archived + 任何动作 = false', () => {
    const actions: MinuteAction[] = ['submit', 'confirm', 'reject', 'withdraw', 'archive', 'delete'];
    for (const action of actions) {
      expect(canTransition('archived', action, 'admin')).toBe(false);
    }
  });

  it('admin 角色可执行所有允许的动作', () => {
    expect(canTransition('draft', 'submit', 'admin')).toBe(true);
    expect(canTransition('pending_review', 'confirm', 'admin')).toBe(true);
    expect(canTransition('confirmed', 'withdraw', 'admin')).toBe(true);
    expect(canTransition('draft', 'delete', 'admin')).toBe(true);
  });
});

describe('canEditFields', () => {
  const minute: SmartMinute = {
    id: '1',
    title: '测试',
    meetingTime: '2026-08-20',
    organizerId: 'user_a',
    reviewerId: 'user_b',
    attendeeIds: [],
    status: 'draft',
    refs: [],
    coreDecisions: [],
    contentMarkdown: '',
    actionItems: [],
    source: null,
    versions: [],
    adminSource: null,
    polishPreview: null,
    createdAt: '',
    updatedAt: '',
  };

  it('organizer 在 draft 可编辑', () => {
    expect(canEditFields(minute, 'user_a', 'organizer')).toBe(true);
  });

  it('organizer 在 confirmed 不可编辑', () => {
    expect(canEditFields({ ...minute, status: 'confirmed' }, 'user_a', 'organizer')).toBe(false);
  });

  it('admin 在 pending_review 可编辑', () => {
    expect(canEditFields({ ...minute, status: 'pending_review' }, 'user_c', 'admin')).toBe(true);
  });

  it('attendee 不可编辑', () => {
    expect(canEditFields(minute, 'user_c', 'attendee')).toBe(false);
  });

  it('archived 状态不可编辑', () => {
    expect(canEditFields({ ...minute, status: 'archived' }, 'user_a', 'organizer')).toBe(false);
  });
});

describe('applyTransition', () => {
  const minute: SmartMinute = {
    id: '1',
    title: '测试',
    meetingTime: '2026-08-20',
    organizerId: 'user_a',
    reviewerId: 'user_b',
    attendeeIds: [],
    status: 'draft',
    refs: [],
    coreDecisions: [],
    contentMarkdown: '',
    actionItems: [],
    source: null,
    versions: [],
    adminSource: null,
    polishPreview: null,
    createdAt: '',
    updatedAt: '',
  };

  it('submit: draft -> pending_review', () => {
    const result = applyTransition(minute, 'submit', 'user_a', '2026-08-24');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.minute.status).toBe('pending_review');
  });

  it('confirm: pending_review -> confirmed', () => {
    const pending = { ...minute, status: 'pending_review' as const };
    const result = applyTransition(pending, 'confirm', 'user_b', '2026-08-24');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.minute.status).toBe('confirmed');
  });

  it('reject: 状态不变', () => {
    const pending = { ...minute, status: 'pending_review' as const };
    const result = applyTransition(pending, 'reject', 'user_b', '2026-08-24');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.minute.status).toBe('pending_review');
  });

  it('withdraw: confirmed -> draft', () => {
    const confirmed = { ...minute, status: 'confirmed' as const };
    const result = applyTransition(confirmed, 'withdraw', 'user_a', '2026-08-24');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.minute.status).toBe('draft');
  });

  it('非法迁移返回错误', () => {
    const result = applyTransition(minute, 'confirm', 'user_b', '2026-08-24');
    expect(result.ok).toBe(false);
  });
});
