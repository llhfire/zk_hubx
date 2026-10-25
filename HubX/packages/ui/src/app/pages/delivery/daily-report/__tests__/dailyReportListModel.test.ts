import { describe, expect, it } from 'vitest';
import { mockDailyReports } from '../mockData';
import {
  calculateDailyReportListMetrics,
  EMPTY_DAILY_REPORT_FILTERS,
  filterDailyReports,
  hasDailyReportFilters,
} from '../dailyReportListModel';

describe('dailyReportListModel', () => {
  it('按汇报人和部门关键词筛选', () => {
    expect(filterDailyReports(mockDailyReports, { ...EMPTY_DAILY_REPORT_FILTERS, keyword: '张三' })).toHaveLength(1);
    expect(filterDailyReports(mockDailyReports, { ...EMPTY_DAILY_REPORT_FILTERS, keyword: '技术部' })).toHaveLength(1);
  });

  it('按部门和闭区间日期筛选并按日期倒序', () => {
    const result = filterDailyReports(mockDailyReports, {
      keyword: '',
      department: '技术部',
      dateRange: ['2026-07-07', '2026-07-08'],
    });
    expect(result.map(report => report.id)).toEqual(['daily-4']);

    const all = filterDailyReports(mockDailyReports, EMPTY_DAILY_REPORT_FILTERS);
    expect(all.at(0)?.reportDate).toBe('2026-07-08');
    expect(all.at(-1)?.reportDate).toBe('2026-07-07');
  });

  it('汇总日报数、汇报人数、部门数和总工时', () => {
    expect(calculateDailyReportListMetrics(mockDailyReports)).toEqual({
      reportCount: 4,
      reporterCount: 4,
      departmentCount: 4,
      totalHours: 20,
    });
  });

  it('识别是否存在有效筛选条件', () => {
    expect(hasDailyReportFilters(EMPTY_DAILY_REPORT_FILTERS)).toBe(false);
    expect(hasDailyReportFilters({ ...EMPTY_DAILY_REPORT_FILTERS, keyword: '  张三  ' })).toBe(true);
  });
});
