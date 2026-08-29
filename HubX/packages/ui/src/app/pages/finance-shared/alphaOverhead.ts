/** α 版共享公摊读模型；β 版接入费用台账与员工服务后替换数据源。 */
import { buildOverheadSnapshot, overheadAmount, workdaysInRange } from './overhead';
import {
  mockEmployeesForOverhead,
  mockExpenseRecords,
  mockWorkdaysByMonth,
} from '../operating-expense/mockData';

export function getAlphaOverheadSnapshot(month: string) {
  const snapshot = buildOverheadSnapshot({
    month,
    records: mockExpenseRecords,
    employees: mockEmployeesForOverhead,
    workdays: mockWorkdaysByMonth,
  });
  const standardWorkdays = mockWorkdaysByMonth[month] ?? 0;
  const activeEmployeeCount = mockEmployeesForOverhead.filter(employee => (
    workdaysInRange(month, employee.hireDate, employee.leaveDate, standardWorkdays) > 0
  )).length;
  return { ...snapshot, standardWorkdays, activeEmployeeCount };
}

export function getAlphaOverheadAmount(month: string, quantityDays: number): number {
  return overheadAmount(quantityDays, getAlphaOverheadSnapshot(month).rate);
}
