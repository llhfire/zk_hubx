/** 行动项差异同步测试 */

import { describe, it, expect } from 'vitest';
import { isActionItemSyncable, diffActionItemsToTodo } from '../actionItemSync';
import type { TodoItem } from '../actionItemSync';
import type { SmartMinute, ActionItem } from '../types';

const validAction: ActionItem = {
  actionItemId: 'ai_1',
  content: '有效行动项',
  assigneeId: 'user_a',
  assigneeName: '张三',
  priority: 'P1',
  priorityNeedsReview: false,
  dueDate: '2026-08-25',
  refs: [{ kind: 'lead', id: 'lead_1', displaySnapshot: '线索', savedAsView: '销售' }],
  status: 'pending',
};

const baseMinute: SmartMinute = {
  id: 'minute_1',
  title: '测试',
  meetingTime: '2026-08-20',
  organizerId: 'user_a',
  reviewerId: 'user_b',
  attendeeIds: [],
  status: 'confirmed',
  refs: [],
  coreDecisions: [],
  contentMarkdown: '',
  actionItems: [validAction],
  source: null,
  versions: [],
  adminSource: null,
  polishPreview: null,
  createdAt: '',
  updatedAt: '',
};

let idCounter = 0;
const buildId = () => `todo_${++idCounter}`;

describe('isActionItemSyncable', () => {
  it('完整字段的行动项可同步', () => {
    expect(isActionItemSyncable(validAction)).toBe(true);
  });

  it('空内容不可同步', () => {
    expect(isActionItemSyncable({ ...validAction, content: '' })).toBe(false);
  });

  it('待指派（assigneeId=null）不可同步', () => {
    expect(isActionItemSyncable({ ...validAction, assigneeId: null })).toBe(false);
  });

  it('priorityNeedsReview=true 不可同步', () => {
    expect(isActionItemSyncable({ ...validAction, priorityNeedsReview: true })).toBe(false);
  });

  it('空引用不可同步', () => {
    expect(isActionItemSyncable({ ...validAction, refs: [] })).toBe(false);
  });
});

describe('diffActionItemsToTodo', () => {
  it('合格 pending 无 TODO -> create', () => {
    const ops = diffActionItemsToTodo(baseMinute, [], buildId, '2026-08-24');
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe('create');
    if (ops[0].op === 'create') {
      expect(ops[0].item.source).toBe('smart_meeting');
      expect(ops[0].item.sourceId).toBe('ai_1');
      expect(ops[0].item.priority).toBe('medium');
    }
  });

  it('合格 pending 有 TODO，字段变化 -> update', () => {
    const existing: TodoItem = {
      id: 'todo_1',
      source: 'smart_meeting',
      sourceId: 'ai_1',
      title: '旧标题',
      assigneeId: 'user_a',
      priority: 'high',
      status: 'pending',
      module: '智能会议',
      route: '/smart-meetings/minute_1',
      createdAt: '',
      updatedAt: '',
    };
    const ops = diffActionItemsToTodo(baseMinute, [existing], buildId, '2026-08-24');
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe('update');
    if (ops[0].op === 'update') {
      expect(ops[0].patch.title).toBe('有效行动项');
    }
  });

  it('已完成 TODO 不原地重开', () => {
    const completedTodo: TodoItem = {
      id: 'todo_1',
      source: 'smart_meeting',
      sourceId: 'ai_1',
      title: '有效行动项',
      assigneeId: 'user_a',
      priority: 'medium',
      status: 'completed',
      module: '智能会议',
      route: '/smart-meetings/minute_1',
      createdAt: '',
      updatedAt: '',
    };
    const ops = diffActionItemsToTodo(baseMinute, [completedTodo], buildId, '2026-08-24');
    expect(ops).toHaveLength(0);
  });

  it('canceled 行动项 -> softCancel', () => {
    const canceledMinute = {
      ...baseMinute,
      actionItems: [{ ...validAction, status: 'canceled' as const }],
    };
    const existing: TodoItem = {
      id: 'todo_1',
      source: 'smart_meeting',
      sourceId: 'ai_1',
      title: '有效行动项',
      assigneeId: 'user_a',
      priority: 'medium',
      status: 'pending',
      module: '智能会议',
      route: '/smart-meetings/minute_1',
      createdAt: '',
      updatedAt: '',
    };
    const ops = diffActionItemsToTodo(canceledMinute, [existing], buildId, '2026-08-24');
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe('softCancel');
  });

  it('不合格行动项不派发', () => {
    const invalidMinute = {
      ...baseMinute,
      actionItems: [{ ...validAction, assigneeId: null }],
    };
    const ops = diffActionItemsToTodo(invalidMinute, [], buildId, '2026-08-24');
    expect(ops).toHaveLength(0);
  });

  it('幂等：同一输入两次 diff 第二次为空', () => {
    const ops1 = diffActionItemsToTodo(baseMinute, [], buildId, '2026-08-24');
    expect(ops1).toHaveLength(1);

    // 模拟第一次 create 后的 TODO 列表
    const createdTodo: TodoItem = (ops1[0] as { op: 'create'; item: TodoItem }).item;
    const ops2 = diffActionItemsToTodo(baseMinute, [createdTodo], buildId, '2026-08-24');
    expect(ops2).toHaveLength(0);
  });

  it('priority 映射正确', () => {
    const p0Minute = { ...baseMinute, actionItems: [{ ...validAction, priority: 'P0' as const }] };
    const p2Minute = { ...baseMinute, actionItems: [{ ...validAction, priority: 'P2' as const }] };

    const ops0 = diffActionItemsToTodo(p0Minute, [], buildId, '2026-08-24');
    const ops2 = diffActionItemsToTodo(p2Minute, [], buildId, '2026-08-24');

    if (ops0[0].op === 'create') expect(ops0[0].item.priority).toBe('high');
    if (ops2[0].op === 'create') expect(ops2[0].item.priority).toBe('low');
  });
});
