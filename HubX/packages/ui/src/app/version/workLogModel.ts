// 工作记录：功能看板场景的「按日期、按分类」施工日志。
// 唯一事实源 = 仓库内 workLog.config.json（与功能看板同一套读写）：
// - α 版 dev server 提供 GET/PUT /api/work-log；
// - 静态部署 / β 回退 localStorage；
// - 下班/退下按当天追加条目，简洁一句话，不写流水账。

export const WORK_LOG_CATEGORIES = ['功能', '底座', '设计', '文档', '修洞', '其它'] as const;
export type WorkLogCategory = (typeof WORK_LOG_CATEGORIES)[number];

export interface WorkLogItem {
  id: string;
  category: WorkLogCategory;
  text: string;
}

export interface WorkLogDay {
  date: string;
  items: WorkLogItem[];
}

export interface WorkLog {
  days: WorkLogDay[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayISODate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isWorkLogCategory(value: unknown): value is WorkLogCategory {
  return typeof value === 'string' && (WORK_LOG_CATEGORIES as readonly string[]).includes(value);
}

export function createSeedWorkLog(): WorkLog {
  return {
    days: [
      {
        date: '2026-08-22',
        items: [
          { id: 'wl-2026-08-22-1', category: '功能', text: '功能看板场景改为页签：功能看板 / 功能架构 / 技术架构 / 工作记录；侧栏 Logo 不再单独弹架构图。' },
          { id: 'wl-2026-08-22-2', category: '文档', text: '新建 β 技术架构图；下班/退下必核该文件。' },
          { id: 'wl-2026-08-22-3', category: '设计', text: 'B5 详细设计 Approved；productionOn 口头确认未改 JSON。' },
          { id: 'wl-2026-08-22-4', category: '底座', text: 'B1–B4 工作区已编码未提交；三洞未修（C 首次合同 PUT 不 spawn；A β 桥不 refresh；B 实收未双写）。' },
        ],
      },
    ],
  };
}

function asItem(value: unknown): WorkLogItem | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  if (!isWorkLogCategory(raw.category)) return null;
  if (typeof raw.text !== 'string' || !raw.text.trim()) return null;
  return { id: raw.id.trim(), category: raw.category, text: raw.text.trim() };
}

export function normalizeWorkLog(value: unknown): WorkLog {
  const rawDays = (value && typeof value === 'object' && Array.isArray((value as WorkLog).days))
    ? (value as WorkLog).days
    : [];
  const days = rawDays
    .filter((day): day is Record<string, unknown> => Boolean(day) && typeof (day as { date?: unknown }).date === 'string')
    .map(day => ({
      date: String(day.date),
      items: Array.isArray(day.items) ? day.items.map(asItem).filter((item): item is WorkLogItem => Boolean(item)) : [],
    }))
    .filter(day => DATE_RE.test(day.date));
  const merged = new Map<string, WorkLogItem[]>();
  for (const day of days) {
    const existing = merged.get(day.date) ?? [];
    const seen = new Set(existing.map(item => item.id));
    for (const item of day.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      existing.push(item);
    }
    merged.set(day.date, existing);
  }
  return {
    days: [...merged.entries()]
      .map(([date, items]) => ({ date, items }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export function isValidWorkLog(value: unknown): boolean {
  if (!value || typeof value !== 'object' || !Array.isArray((value as WorkLog).days)) return false;
  const { days } = value as WorkLog;
  return days.every(day =>
    typeof day?.date === 'string'
    && DATE_RE.test(day.date)
    && Array.isArray(day.items)
    && day.items.every(item =>
      typeof item?.id === 'string' && item.id.trim() !== ''
      && isWorkLogCategory(item.category)
      && typeof item.text === 'string' && item.text.trim() !== '',
    ),
  );
}

export function addWorkLogItem(
  log: WorkLog,
  date: string,
  category: WorkLogCategory,
  text: string,
): WorkLog {
  const trimmed = text.trim();
  if (!DATE_RE.test(date) || !isWorkLogCategory(category) || !trimmed) return log;
  const item: WorkLogItem = {
    id: `wl-${date}-${Math.random().toString(36).slice(2, 8)}`,
    category,
    text: trimmed,
  };
  const days = log.days.map(day => (day.date === date ? { ...day, items: [...day.items, item] } : day));
  if (!days.some(day => day.date === date)) days.push({ date, items: [item] });
  return { days: days.sort((a, b) => b.date.localeCompare(a.date)) };
}

export function removeWorkLogItem(log: WorkLog, date: string, itemId: string): WorkLog {
  return {
    days: log.days
      .map(day => (day.date === date ? { ...day, items: day.items.filter(item => item.id !== itemId) } : day))
      .filter(day => day.items.length > 0),
  };
}

export function itemsByCategory(items: WorkLogItem[]): { category: WorkLogCategory; items: WorkLogItem[] }[] {
  return WORK_LOG_CATEGORIES
    .map(category => ({ category, items: items.filter(item => item.category === category) }))
    .filter(group => group.items.length > 0);
}

const WORK_LOG_ENDPOINT = '/api/work-log';
const WORK_LOG_STORAGE_KEY = 'hubx-work-log';

function readFromLocalStorage(): WorkLog | null {
  try {
    const stored = localStorage.getItem(WORK_LOG_STORAGE_KEY);
    return stored ? normalizeWorkLog(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

function writeToLocalStorage(log: WorkLog) {
  try {
    localStorage.setItem(WORK_LOG_STORAGE_KEY, JSON.stringify(log));
  } catch {
    // localStorage 不可用时忽略
  }
}

export async function loadWorkLog(): Promise<WorkLog> {
  try {
    const response = await fetch(WORK_LOG_ENDPOINT);
    if (response.ok) {
      const payload = await response.json() as { log?: unknown };
      if (payload && typeof payload === 'object' && 'log' in payload) {
        if (payload.log == null) return createSeedWorkLog();
        return normalizeWorkLog(payload.log);
      }
    }
  } catch {
    // 端点不存在时走 localStorage
  }
  return readFromLocalStorage() ?? createSeedWorkLog();
}

export async function saveWorkLog(log: WorkLog): Promise<void> {
  writeToLocalStorage(log);
  try {
    await fetch(WORK_LOG_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
  } catch {
    // 写不进配置文档时状态至少留在 localStorage
  }
}
