import type { DailyReport } from './types';
import { getDailyReportTotalHours } from './mockData';

export interface DailyReportListFilters {
  keyword: string;
  department: string;
  dateRange: string[];
}

export interface DailyReportListMetrics {
  reportCount: number;
  reporterCount: number;
  departmentCount: number;
  totalHours: number;
}

export const EMPTY_DAILY_REPORT_FILTERS: DailyReportListFilters = {
  keyword: '',
  department: '',
  dateRange: [],
};

export function filterDailyReports(
  reports: DailyReport[],
  filters: DailyReportListFilters,
): DailyReport[] {
  const keyword = filters.keyword.trim().toLowerCase();

  return reports
    .filter((report) => {
      if (keyword && !`${report.userName}\n${report.department}`.toLowerCase().includes(keyword)) return false;
      if (filters.department && report.department !== filters.department) return false;
      if (filters.dateRange[0] && report.reportDate < filters.dateRange[0]) return false;
      if (filters.dateRange[1] && report.reportDate > filters.dateRange[1]) return false;
      return true;
    })
    .sort((left, right) => (
      right.reportDate.localeCompare(left.reportDate)
      || right.updatedAt.localeCompare(left.updatedAt)
    ));
}

export function calculateDailyReportListMetrics(reports: DailyReport[]): DailyReportListMetrics {
  return {
    reportCount: reports.length,
    reporterCount: new Set(reports.map(report => report.userId)).size,
    departmentCount: new Set(reports.map(report => report.department).filter(Boolean)).size,
    totalHours: reports.reduce((sum, report) => sum + getDailyReportTotalHours(report), 0),
  };
}

export function hasDailyReportFilters(filters: DailyReportListFilters): boolean {
  return Boolean(filters.keyword.trim() || filters.department || filters.dateRange.length > 0);
}
