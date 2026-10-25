/** 列表统计与筛选测试 */

import { describe, it, expect } from 'vitest';
import { summarizeMinutes, filterMinutes, monthDeposited } from '../boardQueries';
import type { ViewerContext } from '../accessControl';
import type { SmartMinute, BusinessRef } from '../types';

const alwaysCanView: ViewerContext['canViewBiz'] = () => true;

const minutes: SmartMinute[] = [
  {
    id: '1',
    title: 'Q3 销售策略复盘',
    meetingTime: '2026-08-20T14:00:00',
    organizerId: 'user_a',
    reviewerId: 'user_b',
    attendeeIds: ['user_a', 'user_b', 'user_c', 'user_d'],
    status: 'confirmed',
    refs: [
      { kind: 'lead', id: 'lead_1', displaySnapshot: '线索A', savedAsView: '销售' },
      { kind: 'contract', id: 'contract_1', displaySnapshot: '合同B', savedAsView: '交付' },
    ],
    coreDecisions: ['决定A'],
    contentMarkdown: '正文',
    actionItems: [
      { actionItemId: 'ai_1', content: '行动1', assigneeId: 'user_c', assigneeName: '', priority: 'P0', priorityNeedsReview: false, dueDate: null, refs: [], status: 'pending' },
      { actionItemId: 'ai_2', content: '行动2', assigneeId: 'user_d', assigneeName: '', priority: 'P1', priorityNeedsReview: false, dueDate: null, refs: [], status: 'completed' },
    ],
    source: null,
    versions: [],
    adminSource: null,
    polishPreview: null,
    createdAt: '',
    updatedAt: '2026-08-20T16:00:00',
  },
  {
    id: '2',
    title: '合同评审会',
    meetingTime: '2026-08-22T10:00:00',
    organizerId: 'user_b',
    reviewerId: 'user_a',
    attendeeIds: ['user_a', 'user_b'],
    status: 'pending_review',
    refs: [],
    coreDecisions: [],
    contentMarkdown: '',
    actionItems: [],
    source: null,
    versions: [],
    adminSource: null,
    polishPreview: null,
    createdAt: '',
    updatedAt: '2026-08-22T12:00:00',
  },
  {
    id: '3',
    title: '周例会',
    meetingTime: '2026-07-15T09:00:00',
    organizerId: 'user_a',
    reviewerId: 'user_b',
    attendeeIds: ['user_a'],
    status: 'archived',
    refs: [],
    coreDecisions: [],
    contentMarkdown: '',
    actionItems: [],
    source: null,
    versions: [],
    adminSource: null,
    polishPreview: null,
    createdAt: '',
    updatedAt: '2026-07-15T10:00:00',
  },
];

describe('summarizeMinutes', () => {
  it('生成摘要列表（权限过滤）', () => {
    const viewer: ViewerContext = { userId: 'user_a', isAdmin: false, canViewBiz: alwaysCanView };
    const summaries = summarizeMinutes(minutes, [], viewer);
    expect(summaries).toHaveLength(3);
  });

  it('attendeeSummary 超过3人显示等N人', () => {
    const viewer: ViewerContext = { userId: 'user_a', isAdmin: false, canViewBiz: alwaysCanView };
    const summaries = summarizeMinutes(minutes, [], viewer);
    expect(summaries[0].attendeeSummary).toContain('等4人');
  });

  it('attendeeSummary 可投影为用户姓名', () => {
    const viewer: ViewerContext = { userId: 'user_a', isAdmin: false, canViewBiz: alwaysCanView };
    const names: Record<string, string> = { user_a: '张三', user_b: '李四', user_c: '王五', user_d: '陈六' };
    const summaries = summarizeMinutes(minutes, [], viewer, id => names[id] || id);
    expect(summaries[0].attendeeSummary).toBe('张三、李四、王五等4人');
  });

  it('openTodoCount 只计 pending', () => {
    const viewer: ViewerContext = { userId: 'user_a', isAdmin: false, canViewBiz: alwaysCanView };
    const summaries = summarizeMinutes(minutes, [], viewer);
    expect(summaries[0].openTodoCount).toBe(1);
  });

  it('refChips 去重', () => {
    const viewer: ViewerContext = { userId: 'user_a', isAdmin: false, canViewBiz: alwaysCanView };
    const summaries = summarizeMinutes(minutes, [], viewer);
    expect(summaries[0].refChips).toHaveLength(2);
  });

  it('无权限的纪要不显示', () => {
    const neverCanView: ViewerContext['canViewBiz'] = () => false;
    const viewer: ViewerContext = { userId: 'user_biz', isAdmin: false, canViewBiz: neverCanView };
    const summaries = summarizeMinutes(minutes, [], viewer);
    // id=2 无引用，biz_member 不可见
    expect(summaries.find(s => s.id === '2')).toBeUndefined();
  });
});

describe('filterMinutes', () => {
  const viewer: ViewerContext = { userId: 'user_a', isAdmin: false, canViewBiz: alwaysCanView };
  const summaries = summarizeMinutes(minutes, [], viewer);

  it('按状态筛选', () => {
    const filtered = filterMinutes(summaries, { status: ['confirmed'] });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].status).toBe('confirmed');
  });

  it('按时间范围筛选', () => {
    const filtered = filterMinutes(summaries, {
      timeRange: { from: '2026-08-01', to: '2026-08-31' },
    });
    expect(filtered).toHaveLength(2);
  });

  it('按关键词筛选标题', () => {
    const filtered = filterMinutes(summaries, { keyword: '销售' });
    expect(filtered).toHaveLength(1);
  });

  it('按关键词筛选决议和行动项', () => {
    expect(filterMinutes(summaries, { keyword: '决定A' })).toHaveLength(1);
    expect(filterMinutes(summaries, { keyword: '行动1' })).toHaveLength(1);
  });

  it('按 hasOpenTodo 筛选', () => {
    const filtered = filterMinutes(summaries, { hasOpenTodo: true });
    expect(filtered).toHaveLength(1);
  });
});

describe('monthDeposited', () => {
  it('统计指定月份的纪要', () => {
    const stats = monthDeposited(minutes, '2026-08');
    expect(stats.confirmed).toBe(1);
    expect(stats.pending_review).toBe(1);
    expect(stats.archived).toBe(0);
  });

  it('7月数据归档', () => {
    const stats = monthDeposited(minutes, '2026-07');
    expect(stats.archived).toBe(1);
    expect(stats.confirmed).toBe(0);
  });

  it('空月份返回全0', () => {
    const stats = monthDeposited(minutes, '2026-09');
    expect(stats).toEqual({ pending_review: 0, confirmed: 0, archived: 0 });
  });
});
