/**
 * Cohort 成交率纯函数
 *
 * 规约见 lead-dispatch-dev-plan.md §阶段 A + PRD §12：
 * - 录入月归因 × 已签单口径
 * - 只做只读卡片
 */

export interface CohortRow {
  /** 录入月份 YYYY-MM */
  month: string;
  /** 该月录入总数 */
  total: number;
  /** 已签单数 */
  won: number;
  /** 成交率 0–1 */
  rate: number;
}

/**
 * 按录入月归因的成交率统计
 *
 * @param leads 线索列表（泛型，只需有 createTime / status 字段）
 * @returns 按月份倒序的 CohortRow 数组（只含当月有录入的月份）
 */
export function admissionCohortRate<T extends { createTime: string; status: string }>(
  leads: T[],
): CohortRow[] {
  const buckets = new Map<string, { total: number; won: number }>();

  for (const l of leads) {
    const month = l.createTime.slice(0, 7); // YYYY-MM
    const bucket = buckets.get(month) ?? { total: 0, won: 0 };
    bucket.total++;
    if (l.status === '已签单') bucket.won++;
    buckets.set(month, bucket);
  }

  const rows: CohortRow[] = [];
  for (const [month, { total, won }] of buckets) {
    rows.push({
      month,
      total,
      won,
      rate: total > 0 ? won / total : 0,
    });
  }

  // 按月份倒序
  rows.sort((a, b) => b.month.localeCompare(a.month));
  return rows;
}
