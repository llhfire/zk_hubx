/** 行动项差异计算 + TODO 投影映射纯函数 */

import type {
  SmartMinute,
  ActionItem,
  ActionPriority,
} from './types';

/** TODO 投影类型（复用 todos/types.ts 的结构） */
export interface TodoItem {
  id: string;
  source: string;
  sourceId: string;
  title: string;
  description?: string;
  assigneeId: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'canceled';
  module: string;
  route: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

/** 同步操作 */
export type TodoSyncOp =
  | { op: 'create'; item: TodoItem }
  | { op: 'update'; id: string; patch: Partial<TodoItem> }
  | { op: 'softCancel'; id: string };

/** 优先级映射 */
function mapPriority(p: ActionPriority): TodoItem['priority'] {
  switch (p) {
    case 'P0': return 'high';
    case 'P1': return 'medium';
    case 'P2': return 'low';
  }
}

/** 判断行动项是否可同步（字段完整） */
export function isActionItemSyncable(a: ActionItem): boolean {
  return (
    a.content.trim() !== '' &&
    a.assigneeId !== null &&
    !a.priorityNeedsReview &&
    a.dueDate !== undefined &&
    a.refs.length > 0
  );
}

/** 差异计算：输入纪要当前行动项 + 已投影 TODO，输出幂等操作集 */
export function diffActionItemsToTodo(
  minute: SmartMinute,
  existingTodos: TodoItem[],
  buildId: () => string,
  now: string,
): TodoSyncOp[] {
  const ops: TodoSyncOp[] = [];
  const todoMap = new Map(existingTodos.map(t => [t.sourceId, t]));

  for (const action of minute.actionItems) {
    const existing = todoMap.get(action.actionItemId);

    if (action.status === 'canceled') {
      // canceled -> softCancel 未完成的 TODO
      if (existing && existing.status !== 'canceled') {
        ops.push({ op: 'softCancel', id: existing.id });
      }
      continue;
    }

    if (!isActionItemSyncable(action)) {
      // 不合格：不派发（曾有 TODO 也不删除）
      continue;
    }

    if (!existing) {
      // 合格 pending，无 TODO -> create
      if (action.status === 'pending') {
        ops.push({
          op: 'create',
          item: {
            id: buildId(),
            source: 'smart_meeting',
            sourceId: action.actionItemId,
            title: action.content,
            assigneeId: action.assigneeId!,
            priority: mapPriority(action.priority),
            status: 'pending',
            module: '智能会议',
            route: `/smart-meetings/${minute.id}`,
            deadline: action.dueDate ?? undefined,
            createdAt: now,
            updatedAt: now,
          },
        });
      }
      continue;
    }

    // 已有 TODO
    if (existing.status === 'completed') {
      // 已完成不原地重开
      continue;
    }

    // 检查字段变化
    const patch: Partial<TodoItem> = {};
    if (action.content !== existing.title) patch.title = action.content;
    if (action.assigneeId !== existing.assigneeId) patch.assigneeId = action.assigneeId!;
    if (mapPriority(action.priority) !== existing.priority) patch.priority = mapPriority(action.priority);
    if ((action.dueDate ?? undefined) !== existing.deadline) patch.deadline = action.dueDate ?? undefined;

    // completed -> update status
    if (action.status === 'completed' && existing.status !== 'completed') {
      patch.status = 'completed';
    }

    if (Object.keys(patch).length > 0) {
      ops.push({ op: 'update', id: existing.id, patch: { ...patch, updatedAt: now } });
    }
  }

  return ops;
}
