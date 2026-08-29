/**
 * 公摊费率唯一公式。
 *
 * 运营费用、合同成本与精益交付都必须使用：
 * 当月公共运营池 ÷ 当月全公司在职编制工时。
 */

export interface OverheadExpenseRecord {
  amount: number;
  billingMonth: string;
  attribution: 'pool' | 'project' | 'lead_channel';
  status: 'pending' | 'posted' | 'voided';
}

export interface OverheadEmployee {
  hireDate: string;
  leaveDate?: string;
  employmentStatus: string;
}

export type OverheadWorkdaysByMonth = Record<string, number>;

export interface OverheadSnapshot {
  month: string;
  pool: number;
  capacityHours: number;
  rate: number;
}

/** 在职区间与月份相交后的折算工天。 */
export function workdaysInRange(
  month: string,
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
  const effectiveStart = hire > monthStart ? hire : monthStart;
  const effectiveEnd = leave < monthEnd ? leave : monthEnd;

  if (effectiveStart > effectiveEnd) return 0;

  const daysInMonth = monthEnd.getDate();
  const effectiveDays = effectiveEnd.getDate() - effectiveStart.getDate() + 1;
  return Math.round(workdayCount * (effectiveDays / daysInMonth));
}

/** 编制工时 = Σ 当月在职折算工天 × 8。 */
export function capacityHours(
  employees: OverheadEmployee[],
  month: string,
  workdays: OverheadWorkdaysByMonth,
): number {
  const workdayCount = workdays[month] ?? 0;
  return employees.reduce((total, employee) => {
    if (
      employee.employmentStatus === '已离职'
      && employee.leaveDate
      && employee.leaveDate < `${month}-01`
    ) {
      return total;
    }
    return total + workdaysInRange(
      month,
      employee.hireDate,
      employee.leaveDate,
      workdayCount,
    ) * 8;
  }, 0);
}

/** 公共运营池只包含当月、已入账、归属 pool 的费用。 */
export function overheadPool(
  records: OverheadExpenseRecord[],
  month: string,
): number {
  return records
    .filter(record => (
      record.status === 'posted'
      && record.attribution === 'pool'
      && record.billingMonth === month
    ))
    .reduce((total, record) => total + record.amount, 0);
}

/** R_hour = 公共运营池 ÷ 编制工时；无编制工时时返回 0。 */
export function hourlyOverheadRate(pool: number, hours: number): number {
  return hours > 0 ? pool / hours : 0;
}

export function buildOverheadSnapshot(args: {
  month: string;
  records: OverheadExpenseRecord[];
  employees: OverheadEmployee[];
  workdays: OverheadWorkdaysByMonth;
}): OverheadSnapshot {
  const pool = overheadPool(args.records, args.month);
  const hours = capacityHours(args.employees, args.month, args.workdays);
  return {
    month: args.month,
    pool,
    capacityHours: hours,
    rate: hourlyOverheadRate(pool, hours),
  };
}

/** 公摊金额 = 项目工天 × 8 × 当月 R_hour，保留到分。 */
export function overheadAmount(quantityDays: number, rate: number): number {
  return Math.round(quantityDays * 8 * rate * 100) / 100;
}
