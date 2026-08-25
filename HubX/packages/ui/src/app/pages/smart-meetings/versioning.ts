/** 版本生成与快照纯函数 */

import type {
  SmartMinute,
  MinuteSnapshot,
  MinuteVersion,
} from './types';

/** 从纪要当前态提取快照 */
export function snapshotOf(m: SmartMinute): MinuteSnapshot {
  return {
    title: m.title,
    meetingTime: m.meetingTime,
    attendeeIds: [...m.attendeeIds],
    refs: m.refs.map(r => ({ ...r })),
    coreDecisions: [...m.coreDecisions],
    contentMarkdown: m.contentMarkdown,
    actionItems: m.actionItems.map(a => ({ ...a, refs: a.refs.map(r => ({ ...r })) })),
  };
}

/** 构建新版本（只追加，不覆盖） */
export function buildVersion(
  m: SmartMinute,
  reason: MinuteVersion['reason'],
  now: string,
): MinuteVersion {
  return {
    versionId: `v${m.versions.length + 1}_${now}`,
    reason,
    createdAt: now,
    snapshot: snapshotOf(m),
  };
}
