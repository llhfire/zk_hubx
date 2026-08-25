/** 权限过滤测试 */

import { describe, it, expect } from 'vitest';
import { viewMinute } from '../accessControl';
import type { ViewerContext } from '../accessControl';
import type { SmartMinute, BusinessRef } from '../types';

const baseMinute: SmartMinute = {
  id: '1',
  title: '测试会议',
  meetingTime: '2026-08-20',
  organizerId: 'user_organizer',
  reviewerId: 'user_reviewer',
  attendeeIds: ['user_attendee1', 'user_attendee2'],
  status: 'confirmed',
  refs: [
    { kind: 'lead', id: 'lead_1', displaySnapshot: '线索A', savedAsView: '销售' },
    { kind: 'contract', id: 'contract_1', displaySnapshot: '合同B', savedAsView: '交付' },
  ],
  coreDecisions: [],
  contentMarkdown: '正文',
  actionItems: [],
  source: { content: '原始文本', uploadedAt: '2026-08-20', parseStatus: 'parsed' },
  versions: [],
  adminSource: null,
  polishPreview: null,
  createdAt: '',
  updatedAt: '',
};

const alwaysCanView: ViewerContext['canViewBiz'] = () => true;
const neverCanView: ViewerContext['canViewBiz'] = () => false;

describe('viewMinute', () => {
  it('organizer 整篇可见（含原始文本）', () => {
    const viewer: ViewerContext = { userId: 'user_organizer', isAdmin: false, canViewBiz: alwaysCanView };
    const view = viewMinute(baseMinute, viewer);
    expect(view.visible).toBe(true);
    expect(view.canSeeSourceText).toBe(true);
    expect(view.canSeeContent).toBe(true);
    expect(view.canEdit).toBe(true);
    expect(view.maskedRefs).toHaveLength(2);
  });

  it('reviewer 整篇可见（含原始文本）', () => {
    const viewer: ViewerContext = { userId: 'user_reviewer', isAdmin: false, canViewBiz: alwaysCanView };
    const view = viewMinute(baseMinute, viewer);
    expect(view.visible).toBe(true);
    expect(view.canSeeSourceText).toBe(true);
    expect(view.canEdit).toBe(false);
  });

  it('admin 整篇可见（含原始文本）', () => {
    const viewer: ViewerContext = { userId: 'user_admin', isAdmin: true, canViewBiz: alwaysCanView };
    const view = viewMinute(baseMinute, viewer);
    expect(view.visible).toBe(true);
    expect(view.canSeeSourceText).toBe(true);
    expect(view.canEdit).toBe(true);
  });

  it('attendee 可见正文，无原始文本', () => {
    const viewer: ViewerContext = { userId: 'user_attendee1', isAdmin: false, canViewBiz: alwaysCanView };
    const view = viewMinute(baseMinute, viewer);
    expect(view.visible).toBe(true);
    expect(view.canSeeSourceText).toBe(false);
    expect(view.canSeeContent).toBe(true);
    expect(view.canEdit).toBe(false);
  });

  it('biz_member 有权限引用时 visible', () => {
    const viewer: ViewerContext = { userId: 'user_biz', isAdmin: false, canViewBiz: alwaysCanView };
    const view = viewMinute(baseMinute, viewer);
    expect(view.visible).toBe(true);
    expect(view.canSeeSourceText).toBe(false);
    expect(view.canEdit).toBe(false);
  });

  it('biz_member 无权限引用时 not visible', () => {
    const viewer: ViewerContext = { userId: 'user_biz', isAdmin: false, canViewBiz: neverCanView };
    const view = viewMinute(baseMinute, viewer);
    expect(view.visible).toBe(false);
  });

  it('biz_member 部分引用脱敏', () => {
    const canViewLead = (ref: BusinessRef) => ref.kind === 'lead';
    const viewer: ViewerContext = { userId: 'user_biz', isAdmin: false, canViewBiz: canViewLead };
    const view = viewMinute(baseMinute, viewer);
    expect(view.visible).toBe(true);
    expect(view.maskedRefs[0].displaySnapshot).toBe('线索A');
    expect(view.maskedRefs[1].displaySnapshot).toBe('无权查看的业务单');
  });

  it('admin 可用动作包含所有合法动作', () => {
    const viewer: ViewerContext = { userId: 'user_admin', isAdmin: true, canViewBiz: alwaysCanView };
    const view = viewMinute(baseMinute, viewer);
    expect(view.canTransitionTo).toContain('withdraw');
    expect(view.canTransitionTo).toContain('archive');
  });
});
