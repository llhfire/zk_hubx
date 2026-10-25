/** 列表统计 / 搜索 / 筛选纯函数 */

import type {
  SmartMinute,
  MinuteStatus,
  RefKind,
  BusinessRef,
} from './types';
import type { TodoItem } from './actionItemSync';
import type { ViewerContext } from './accessControl';
import { viewMinute } from './accessControl';

/** 列表查询条件 */
export interface MinuteListQuery {
  keyword?: string;
  status?: MinuteStatus[];
  refKinds?: RefKind[];
  attendeeId?: string;
  organizerId?: string;
  reviewerId?: string;
  timeRange?: { from: string; to: string };
  hasOpenTodo?: boolean;
}

/** 列表摘要 */
export interface MinuteListSummary {
  id: string;
  title: string;
  meetingTime: string;
  status: MinuteStatus;
  attendeeSummary: string;
  openTodoCount: number;
  refChips: BusinessRef[];
  updatedAt: string;
  searchText: string;
}

/** 月度沉淀统计 */
export interface MonthStats {
  pending_review: number;
  confirmed: number;
  archived: number;
}

/** 生成列表摘要（带权限过滤） */
export function summarizeMinutes(
  all: SmartMinute[],
  todos: TodoItem[],
  viewer: ViewerContext,
  resolveUserName: (userId: string) => string = (userId) => userId,
): MinuteListSummary[] {
  return all
    .map(m => {
      const view = viewMinute(m, viewer);
      if (!view.visible) return null;

      const openTodoCount = m.actionItems.filter(
        a => a.status === 'pending'
      ).length;

      // 去重引用（按 kind+id）
      const seen = new Set<string>();
      const refChips = view.maskedRefs.filter(r => {
        const key = `${r.kind}:${r.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const attendeeNames = m.attendeeIds.map(resolveUserName);

      return {
        id: m.id,
        title: m.title,
        meetingTime: m.meetingTime,
        status: m.status,
        attendeeSummary: attendeeNames.length > 3
          ? `${attendeeNames.slice(0, 3).join('、')}等${attendeeNames.length}人`
          : attendeeNames.join('、'),
        openTodoCount,
        refChips,
        updatedAt: m.updatedAt,
        searchText: [
          m.title,
          ...m.coreDecisions,
          m.contentMarkdown,
          ...m.actionItems.map(action => action.content),
          ...refChips.map(ref => ref.displaySnapshot),
          ...attendeeNames,
          ...m.attendeeIds,
        ].join('\n').toLowerCase(),
      };
    })
    .filter((s): s is MinuteListSummary => s !== null);
}

/** 筛选列表摘要 */
export function filterMinutes(
  summaries: MinuteListSummary[],
  q: MinuteListQuery,
): MinuteListSummary[] {
  return summaries.filter(s => {
    if (q.keyword) {
      if (!s.searchText.includes(q.keyword.trim().toLowerCase())) return false;
    }

    if (q.status && q.status.length > 0 && !q.status.includes(s.status)) return false;

    if (q.timeRange) {
      const mt = s.meetingTime;
      if (mt < q.timeRange.from || mt > q.timeRange.to) return false;
    }

    if (q.hasOpenTodo !== undefined) {
      if (q.hasOpenTodo && s.openTodoCount === 0) return false;
      if (!q.hasOpenTodo && s.openTodoCount > 0) return false;
    }

    return true;
  });
}

/** 月度沉淀统计（只统计智能会议，不含已删除草稿） */
export function monthDeposited(all: SmartMinute[], month: string): MonthStats {
  const stats: MonthStats = { pending_review: 0, confirmed: 0, archived: 0 };

  for (const m of all) {
    if (!m.meetingTime.startsWith(month)) continue;
    if (m.status === 'pending_review') stats.pending_review++;
    else if (m.status === 'confirmed') stats.confirmed++;
    else if (m.status === 'archived') stats.archived++;
  }

  return stats;
}
