// ========================================
// 运营费用 - 工天日历（阶段 C）
// 大小周锚点 + 法定节假日 + 调休
// 阶段 A 用 mockWorkdaysByMonth 近似；本文件提供精确日期级计算
// ========================================

/**
 * 2026 年法定节假日（不调休的放假日）
 * 只列与本模块相关的月份（2026-05 ~ 2026-11）
 */
export const HOLIDAYS_2026: Set<string> = new Set([
  // 劳动节
  '2026-05-01', '2026-05-02', '2026-05-03',
  // 端午节
  '2026-06-19', '2026-06-20', '2026-06-21',
  // 中秋节
  '2026-09-25', '2026-09-26', '2026-09-27',
  // 国庆节
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07',
]);

/**
 * 调休上班日（周末补班）
 */
export const WORKDAYS_SWAP_2026: Set<string> = new Set([
  '2026-04-26', // 劳动节调休
  '2026-05-09', // 劳动节调休
  '2026-06-28', // 端午调休
  '2026-10-10', // 国庆调休
]);

/**
 * 大小周锚点：大周工作6天（周六上班），小周工作5天
 * 2026 年从某个参考点开始交替
 * 简化：奇数周为大周（周六上班），偶数周为小周
 */
function isBigWeek(date: Date): boolean {
  // 以 2026-01-05（周一）为第1周起点
  const ref = new Date('2026-01-05');
  const diffDays = Math.floor((date.getTime() - ref.getTime()) / 86400000);
  const weekNum = Math.floor(diffDays / 7);
  return weekNum % 2 === 0; // 偶数周为大周
}

/**
 * 判断某天是否为工作日
 * 规则：
 * 1. 法定节假日 → 休息
 * 2. 调休上班日 → 工作
 * 3. 周一~周五 → 工作
 * 4. 周六：大周 → 工作，小周 → 休息
 * 5. 周日 → 休息
 */
export function isWorkday(dateStr: string): boolean {
  // 调休上班日优先
  if (WORKDAYS_SWAP_2026.has(dateStr)) return true;
  // 法定节假日
  if (HOLIDAYS_2026.has(dateStr)) return false;

  const date = new Date(dateStr);
  const day = date.getDay(); // 0=周日, 6=周六

  if (day === 0) return false; // 周日固定休息
  if (day >= 1 && day <= 5) return true; // 周一~周五固定上班
  if (day === 6) return isBigWeek(date); // 周六看大小周
  return false;
}

/**
 * 某月工作日数（精确日期级）
 */
export function workdaysInMonth(month: string): number {
  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    if (isWorkday(dateStr)) count++;
  }
  return count;
}

/**
 * 某人在某月的工作日数（考虑入离职日期）
 * 精确到日期级：只数在职区间内的工作日
 */
export function employeeWorkdaysInMonth(
  month: string,
  hireDate: string,
  leaveDate: string | undefined,
): number {
  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, '0')}`;

  const effectiveStart = hireDate > monthStart ? hireDate : monthStart;
  const effectiveEnd = leaveDate && leaveDate < monthEnd ? leaveDate : monthEnd;

  if (effectiveStart > effectiveEnd) return 0;

  let count = 0;
  const startDay = parseInt(effectiveStart.slice(8));
  const endDay = parseInt(effectiveEnd.slice(8));
  for (let d = startDay; d <= endDay; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    if (isWorkday(dateStr)) count++;
  }
  return count;
}
