import type { Expense } from '../../types';

export const TEN_DAYS_STEP = 10;

/** 解析 ISO 日期（UTC 时间基准，避免夏令时与跨时区偏差） */
export function parseISODate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

/** 格式化为 YYYY-MM-DD */
export function formatISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 增加天数 */
export function addDays(dateStr: string, days: number): string {
  const date = parseISODate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatISODate(date);
}

/** 计算包含端点的连续天数跨度 */
export function diffDays(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 1;
  const s = parseISODate(startStr).getTime();
  const e = parseISODate(endStr).getTime();
  if (e < s) return 1;
  return Math.round((e - s) / (24 * 3600 * 1000)) + 1;
}

/** 生成起止日期之间的所有连续日期字符串 */
export function generateDateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const s = parseISODate(startStr);
  const e = parseISODate(endStr);
  const cur = new Date(s.getTime());

  while (cur.getTime() <= e.getTime()) {
    dates.push(formatISODate(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

/** 是否超过一周（> 7 天） */
export function isOverOneWeek(startStr: string, endStr: string): boolean {
  return diffDays(startStr, endStr) > 7;
}

export interface TenDaySegment {
  id: string;
  index: number;
  startDayNumber: number; // 1, 11, 21...
  endDayNumber: number;   // 10, 20, 25...
  label: string;          // "第 1-10 天"
  dateRangeLabel: string; // "05-10 ~ 05-19"
  startDate: string;      // "2026-05-10"
  endDate: string;        // "2026-05-19"
  days: number;           // 10 (末段不足10天为实际天数)
  dateList: string[];     // 包含的具体每一天日期
  totalAmount: number;    // 该 10 天段的开支总额
  expenseCount: number;   // 该 10 天段的开支笔数
  expenses: (Expense & { segmentDesc?: string })[];
}

/**
 * 按照每 10 天为一个显示段，切分差旅全周期
 */
export function buildTenDaySegments(input: {
  startDate: string;
  endDate: string;
  expenses: (Expense & { segmentDesc?: string })[];
  stepDays?: number;
}): TenDaySegment[] {
  const { startDate, endDate, expenses, stepDays = TEN_DAYS_STEP } = input;
  const totalSpan = diffDays(startDate, endDate);
  const segments: TenDaySegment[] = [];

  let curStart = startDate;
  let segIndex = 0;

  while (parseISODate(curStart).getTime() <= parseISODate(endDate).getTime()) {
    // 终点为 curStart + (stepDays - 1)，但不超过 endDate
    let curEnd = addDays(curStart, stepDays - 1);
    if (parseISODate(curEnd).getTime() > parseISODate(endDate).getTime()) {
      curEnd = endDate;
    }

    const segDates = generateDateRange(curStart, curEnd);
    const startDayNum = segIndex * stepDays + 1;
    const endDayNum = Math.min(startDayNum + segDates.length - 1, totalSpan);

    const segExpenses = expenses.filter((e) => e.date >= curStart && e.date <= curEnd);
    const totalAmount = segExpenses.reduce((sum, e) => sum + e.amount, 0);

    const startMmDd = curStart.slice(5);
    const endMmDd = curEnd.slice(5);
    const label = `第 ${startDayNum}-${endDayNum} 天`;
    const dateRangeLabel = `${startMmDd} ~ ${endMmDd}`;

    segments.push({
      id: `seg-${segIndex}-${curStart}`,
      index: segIndex,
      startDayNumber: startDayNum,
      endDayNumber: endDayNum,
      label,
      dateRangeLabel,
      startDate: curStart,
      endDate: curEnd,
      days: segDates.length,
      dateList: segDates,
      totalAmount,
      expenseCount: segExpenses.length,
      expenses: segExpenses,
    });

    // 步进到下一段起点
    curStart = addDays(curEnd, 1);
    segIndex++;
  }

  return segments;
}
