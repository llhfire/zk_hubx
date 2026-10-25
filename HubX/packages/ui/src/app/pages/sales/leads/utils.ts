// ============================================================
// 线索管理模块 — 共享工具函数
// ============================================================

import type {
  LeadListItem,
  LeadDetailInfo,
  ClueType,
  CustomerLevel,
  QuickFilter,
  FollowUpRecord,
} from './types';

// --- 标红规则 ---
// 已领取 + 未成交 + 下次跟进时间已过期，或最近一次跟进早于今天
export function isLeadOverdue(lead: LeadListItem): boolean {
  if (lead.clueType !== 'assigned') return false;
  if (lead.status === '已签单' || lead.status === '已终止') return false;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 下次跟进时间已过期
  if (lead.nextFollowTime) {
    const nextTime = new Date(lead.nextFollowTime);
    if (nextTime < todayStart) return true;
  }

  // 最近一次跟进早于今天
  if (lead.lastFollowTime) {
    const lastTime = new Date(lead.lastFollowTime);
    if (lastTime < todayStart) return true;
  }

  return false;
}

// --- 快捷筛选 ---
export function applyQuickFilter(
  leads: LeadListItem[],
  filter: QuickFilter,
): LeadListItem[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (filter) {
    case 'today_unfollowed':
      // 今日未跟进：下次跟进时间在今天之前
      return leads.filter((l) => {
        if (!l.nextFollowTime) return false;
        const nextTime = new Date(l.nextFollowTime);
        return nextTime < todayStart;
      });

    case 'today_followed':
      // 今日已跟进：最近跟进时间在今天范围内（修复 zkcrm bug #7：限制到今天结束）
      return leads.filter((l) => {
        if (!l.lastFollowTime) return false;
        const lastTime = new Date(l.lastFollowTime);
        return lastTime >= todayStart && lastTime <= todayEnd;
      });

    case 'overdue':
      // 超期未跟进：下次跟进时间早于当前时间（代码限制 3 天，注释对齐 - bug #8）
      return leads.filter((l) => {
        if (!l.nextFollowTime) return false;
        const nextTime = new Date(l.nextFollowTime);
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        return nextTime < now && nextTime >= threeDaysAgo;
      });

    case 'level_s':
      return leads.filter((l) => l.customerLevel === 'S');

    case 'level_ab':
      return leads.filter((l) => l.customerLevel === 'A' || l.customerLevel === 'B');

    default:
      return leads;
  }
}

// --- 搜索过滤 ---
export function searchLeads(
  leads: LeadListItem[],
  keyword: string,
): LeadListItem[] {
  if (!keyword.trim()) return leads;

  const kw = keyword.toLowerCase().trim();

  return leads.filter((l) => {
    // key 模糊搜索：名称、电话、微信、威客ID、任务编号
    const searchTargets = [
      l.name,
      l.phone,
      l.wechat,
      l.id,
      l.contact,
      l.customer,
    ].filter(Boolean);

    return searchTargets.some((t) => t.toLowerCase().includes(kw));
  });
}

// --- 重复检查（修复 zkcrm bug #2：新增+修改都检查） ---
export function checkDuplicate(
  leads: LeadListItem[],
  phone: string,
  wechat: string,
  witkeyId?: string,
  witkeyTaskNo?: string,
  excludeId?: string, // 修改时排除自身
): { isDuplicate: boolean; duplicateFields: string[] } {
  const duplicateFields: string[] = [];

  for (const lead of leads) {
    if (excludeId && lead.id === excludeId) continue;

    if (phone && lead.phone === phone) {
      duplicateFields.push('电话');
    }
    if (wechat && lead.wechat === wechat) {
      duplicateFields.push('微信');
    }
  }

  return {
    isDuplicate: duplicateFields.length > 0,
    duplicateFields,
  };
}

// --- 联系方式校验（修复 zkcrm bug #1：统一要求至少一个） ---
export function validateContact(phone: string, wechat: string): boolean {
  return !!(phone.trim() || wechat.trim());
}

// --- 计算负责人持续天数 ---
export function calculateDaysHeld(claimTime: string): number {
  if (!claimTime) return 0;
  const claim = new Date(claimTime);
  const now = new Date();
  return Math.floor((now.getTime() - claim.getTime()) / (1000 * 60 * 60 * 24));
}

// --- 计算标红状态 ---
export function calculateOverdueStatus(leads: LeadListItem[]): LeadListItem[] {
  return leads.map((lead) => ({
    ...lead,
    isOverdue: isLeadOverdue(lead),
  }));
}

// --- 跟进记录筛选（修复 zkcrm bug #7：今日已跟进限制到今天结束） ---
export function filterFollowUpRecords(
  records: FollowUpRecord[],
  tab: 'all' | 'today_pending' | 'today_done' | 'overdue',
): FollowUpRecord[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (tab) {
    case 'all':
      return records;

    case 'today_pending':
      // 今日待跟进：下次跟进时间在今天，状态为待跟进
      return records.filter((r) => {
        if (r.followupStatus !== 'pending') return false;
        if (!r.nextFollowTime) return false;
        const nextTime = new Date(r.nextFollowTime);
        return nextTime >= todayStart && nextTime <= todayEnd;
      });

    case 'today_done':
      // 今日已跟进：创建时间在今天（修复 bug #7：限制到今天结束）
      return records.filter((r) => {
        const created = new Date(r.createdAt);
        return created >= todayStart && created <= todayEnd;
      });

    case 'overdue':
      // 超期未跟进：下次跟进时间早于当前时间，状态为待跟进
      // 代码限制 3 天（修复 bug #8：注释对齐）
      return records.filter((r) => {
        if (r.followupStatus !== 'pending') return false;
        if (!r.nextFollowTime) return false;
        const nextTime = new Date(r.nextFollowTime);
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        return nextTime < now && nextTime >= threeDaysAgo;
      });

    default:
      return records;
  }
}

// --- 格式化文件大小 ---
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- 生成默认下次跟进时间（次日 10:00） ---
export function getDefaultNextFollowTime(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  return tomorrow.toISOString().slice(0, 16).replace('T', ' ');
}

// --- 退回公海时检查是否第 3 次（自动标记垃圾） ---
export function shouldAutoTrash(trashCount: number): boolean {
  return trashCount >= 3;
}

// ============================================================
// 第二轮新增：倒计时胶囊 + 色彩降噪 + 数据范围
// ============================================================

// --- 倒计时胶囊状态 ---
export type CountdownStatus = 'normal' | 'today' | 'overdue' | 'none';

export interface CountdownCapsule {
  status: CountdownStatus;
  label: string;      // 第一行：状态
  subLabel: string;   // 第二行：日期或时间
  daysOverdue: number;
}

/** 计算跟进倒计时胶囊（P0 柔性化标红） */
export function getCountdownCapsule(nextFollowTime?: string): CountdownCapsule {
  if (!nextFollowTime) return { status: 'none', label: '-', subLabel: '', daysOverdue: 0 };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const nextTime = new Date(nextFollowTime);
  const timeStr = nextFollowTime.slice(11, 16);
  const dateStr = nextFollowTime.slice(5, 10);

  if (nextTime >= todayStart && nextTime <= todayEnd) {
    // 今日到期
    return { status: 'today', label: '待处理', subLabel: `今日 ${timeStr}`, daysOverdue: 0 };
  }

  if (nextTime < todayStart) {
    // 已逾期
    const daysOverdue = Math.floor((todayStart.getTime() - nextTime.getTime()) / (1000 * 60 * 60 * 24));
    return { status: 'overdue', label: `逾期 ${daysOverdue} 天`, subLabel: dateStr, daysOverdue };
  }

  // 未到期
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (nextTime < tomorrow) {
    return { status: 'normal', label: '今天', subLabel: timeStr, daysOverdue: 0 };
  }
  const dayAfterTomorrow = new Date(todayStart);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  if (nextTime < dayAfterTomorrow) {
    return { status: 'normal', label: '明天', subLabel: timeStr, daysOverdue: 0 };
  }

  return { status: 'normal', label: dateStr, subLabel: timeStr, daysOverdue: 0 };
}

/** 倒计时胶囊颜色 */
export const COUNTDOWN_COLOR: Record<CountdownStatus, string> = {
  normal: 'var(--color-text-3)',      // 灰色
  today: 'rgb(var(--warning-6))',     // 橙色
  overdue: 'rgb(var(--danger-6))',    // 红色
  none: 'var(--color-text-4)',        // 更淡灰
};

/** 倒计时胶囊背景色 */
export const COUNTDOWN_BG: Record<CountdownStatus, string> = {
  normal: 'transparent',
  today: 'rgb(var(--warning-1))',
  overdue: 'rgb(var(--danger-1))',
  none: 'transparent',
};

// --- 本周新录入筛选 ---
export function applyQuickFilterExtended(
  leads: LeadListItem[],
  filter: QuickFilter,
): LeadListItem[] {
  if (filter === 'week_new') {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return leads.filter((l) => {
      const created = new Date(l.createTime);
      return created >= weekStart;
    });
  }
  return applyQuickFilter(leads, filter);
}

// --- 数据范围过滤（基础版：基于当前用户角色） ---
export function filterByDataScope(
  leads: LeadListItem[],
  currentUser: string,
  userRole: 'admin' | 'user',
): LeadListItem[] {
  if (userRole === 'admin') return leads;
  // 普通用户只看自己负责/优化/协助的线索
  return leads.filter((l) =>
    l.owner === currentUser ||
    l.optimizer === currentUser ||
    l.assistant === currentUser
  );
}

// --- 快捷筛选计数（用于 Tab 标签显示数量） ---
export function getQuickFilterCounts(leads: LeadListItem[]): Record<QuickFilter, number> {
  return {
    today_unfollowed: applyQuickFilter(leads, 'today_unfollowed').length,
    today_followed: applyQuickFilter(leads, 'today_followed').length,
    overdue: applyQuickFilter(leads, 'overdue').length,
    level_s: applyQuickFilter(leads, 'level_s').length,
    level_ab: applyQuickFilter(leads, 'level_ab').length,
    week_new: applyQuickFilterExtended(leads, 'week_new').length,
  };
}
