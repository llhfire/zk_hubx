// ========================================
// 运营费用 - 纯函数：池、编制工时、R_hour、WMA、预测
// ========================================

import type {
  ExpenseRecord,
  RecurringExpenseTemplate,
  WorkdaysByMonth,
  EmployeeForOverhead,
} from './types';

/**
 * 在职工天折算：在职区间与该月相交的自然日比例 × workdayCount
 * 阶段 A 近似；阶段 C 换日期表后签名不变
 */
export function workdaysInRange(
  month: string,            // YYYY-MM
  hireDate: string,
  leaveDate: string | undefined,
  workdayCount: number,
): number {
  const monthStart = new Date(`${month}-01`);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(monthEnd.getDate() - 1);

  const hire = new Date(hireDate);
  const leave = leaveDate ? new Date(leaveDate) : new Date('2099-12-31');

  // 在职区间与该月相交
  const effectiveStart = hire > monthStart ? hire : monthStart;
  const effectiveEnd = leave < monthEnd ? leave : monthEnd;

  if (effectiveStart > effectiveEnd) return 0;

  const daysInMonth = monthEnd.getDate();
  const effectiveDays = effectiveEnd.getDate() - effectiveStart.getDate() + 1;
  const ratio = effectiveDays / daysInMonth;

  return Math.round(workdayCount * ratio);
}

/**
 * 编制工时 = Σ 工天 × 8
 */
export function capacityHours(
  employees: EmployeeForOverhead[],
  month: string,
  workdays: WorkdaysByMonth,
): number {
  const wd = workdays[month] ?? 0;
  let total = 0;
  for (const emp of employees) {
    if (emp.employmentStatus === '已离职' && emp.leaveDate && emp.leaveDate < `${month}-01`) continue;
    total += workdaysInRange(month, emp.hireDate, emp.leaveDate, wd) * 8;
  }
  return total;
}

/**
 * 费用池 = 非作废、归属 pool、该月的 posted 记录金额合计
 */
export function overheadPool(
  records: ExpenseRecord[],
  month: string,
): number {
  return records
    .filter(r =>
      r.status !== 'voided' &&
      r.attribution === 'pool' &&
      r.billingMonth === month &&
      r.status === 'posted',
    )
    .reduce((sum, r) => sum + r.amount, 0);
}

/**
 * R_hour = 当月池 ÷ 编制工时；hours=0 则 0
 */
export function hourlyOverheadRate(pool: number, hours: number): number {
  return hours > 0 ? pool / hours : 0;
}

/**
 * WMA 加权移动平均（0.5/0.3/0.2）
 * 缺月有几月用几月，权重归一
 */
export function wma(values: number[]): number {
  if (values.length === 0) return 0;
  const weights = [0.5, 0.3, 0.2];
  // 取最近几个月（最多 3 个月）
  const recent = values.slice(-3);
  const usedWeights = weights.slice(0, recent.length);
  const totalWeight = usedWeights.reduce((s, w) => s + w, 0);
  let sum = 0;
  for (let i = 0; i < recent.length; i++) {
    sum += recent[i] * usedWeights[i];
  }
  return sum / totalWeight;
}

/**
 * 预测切片：确定模板 + WMA + 工资平移分列
 */
export function forecastSlice(
  templates: RecurringExpenseTemplate[],
  recentPoolValues: number[],
  payrollTotal: number,
  month: string,
): { templateTotal: number; wmaTotal: number; payroll: number } {
  // 确定模板：active 且覆盖该月的固定模板
  const fixedTemplates = templates.filter(
    t => t.status === 'active' && t.kind === 'fixed' && t.startMonth <= month && (!t.endMonth || t.endMonth >= month),
  );
  const templateTotal = fixedTemplates.reduce((sum, t) => sum + t.amount, 0);

  // WMA：最近几个月的非模板费用池
  const wmaTotal = wma(recentPoolValues);

  return { templateTotal, wmaTotal, payroll: payrollTotal };
}

/**
 * 最近已出账月工资合计
 * 从工资表 mock 取 actualSalary ?? nominalSalary
 */
export function latestPayrollTotal(
  salaryRows: { actualSalary?: number; nominalSalary: number }[],
): number {
  return salaryRows.reduce((sum, r) => sum + (r.actualSalary ?? r.nominalSalary), 0);
}
