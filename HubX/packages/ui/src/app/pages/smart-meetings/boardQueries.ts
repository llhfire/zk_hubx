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

      return {
        id: m.id,
        title: m.title,
        meetingTime: m.meetingTime,
        status: m.status,
        attendeeSummary: m.attendeeIds.length > 3
          ? `${m.attendeeIds.slice(0, 3).join('、')}等${m.attendeeIds.length}人`
          : m.attendeeIds.join('、'),
        openTodoCount,
        refChips,
        updatedAt: m.updatedAt,
      };
    })
    .filter((s): s is MinuteListSummary => s !== null);
}

/** 关键词匹配：标题/决议/正文/行动项/可见引用/参会人 */
function matchesKeyword(m: SmartMinute, keyword: string): boolean {
  const lower = keyword.toLowerCase();

  if (m.title.toLowerCase().includes(lower)) return true;
  if (m.coreDecisions.some(d => d.toLowerCase().includes(lower))) return true;
  if (m.contentMarkdown.toLowerCase().includes(lower)) return true;
  if (m.actionItems.some(a => a.content.toLowerCase().includes(lower))) return true;
  if (m.refs.some(r => r.displaySnapshot.toLowerCase().includes(lower))) return true;
  if (m.attendeeIds.some(id => id.toLowerCase().includes(lower))) return true;

  return false;
}

/** 筛选列表摘要 */
export function filterMinutes(
  summaries: MinuteListSummary[],
  q: MinuteListQuery,
): MinuteListSummary[] {
  return summaries.filter(s => {
    if (q.keyword) {
      // 从摘要中匹配（简化版，完整版需回源 SmartMinute）
      const lower = q.keyword.toLowerCase();
      if (!s.title.toLowerCase().includes(lower) &&
          !s.refChips.some(r => r.displaySnapshot.toLowerCase().includes(lower))) {
        return false;
      }
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
