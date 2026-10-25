// 运营费用模块全局常量
// α 冻结「今天」，所有 Tab、抽屉默认值、异动逾期判定都读这里。

/** α 冻结日期 */
export const ALPHA_TODAY = '2026-08-21';

/** 当前月 YYYY-MM */
export const CURRENT_MONTH = '2026-08';

/** 科目环比预警阈值（30%） */
export const MOM_THRESHOLD = 0.30;

/** 科目种子版本号（localStorage merge 用） */
export const CATEGORY_SEED_VERSION = 1;

/**
 * 滚动窗口：过去 3 + 当月 + 未来 3 = 7 列
 * PRD §七预测窗口是 3+1+3
 */
export function rollingMonths(current = CURRENT_MONTH): string[] {
  const result: string[] = [];
  for (let i = -3; i <= 3; i++) {
    result.push(addMonth(current, i));
  }
  return result;
}

/** YYYY-MM 加减月份 */
export function addMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 是否为未来月 */
export function isFutureMonth(ym: string, current = CURRENT_MONTH): boolean {
  return ym > current;
}
