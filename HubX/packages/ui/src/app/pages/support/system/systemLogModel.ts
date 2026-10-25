export type LogStatusFilter = '全部' | '成功' | '失败';

export interface LogFilters {
  keyword: string;
  category: string;
  status: LogStatusFilter;
  dateRange: string[];
}

export interface OperationLogRecord {
  username: string;
  name: string;
  module: string;
  operation: string;
  method: string;
  ip: string;
  location: string;
  status: string;
  time: string;
}

export interface LoginLogRecord {
  username: string;
  name: string;
  ip: string;
  location: string;
  browser: string;
  os: string;
  status: string;
  message: string;
  time: string;
}

export const EMPTY_LOG_FILTERS: LogFilters = {
  keyword: '',
  category: '',
  status: '全部',
  dateRange: [],
};

function matchesDateRange(time: string, dateRange: string[]) {
  if (dateRange.length !== 2) return true;
  const date = time.slice(0, 10);
  return date >= dateRange[0] && date <= dateRange[1];
}

export function filterOperationLogs<T extends OperationLogRecord>(records: T[], filters: LogFilters): T[] {
  const keyword = filters.keyword.trim().toLowerCase();
  return records.filter(record => {
    const matchesKeyword = !keyword || [record.username, record.name, record.operation, record.method, record.ip, record.location]
      .some(value => value.toLowerCase().includes(keyword));
    return matchesKeyword
      && (!filters.category || record.module === filters.category)
      && (filters.status === '全部' || record.status === filters.status)
      && matchesDateRange(record.time, filters.dateRange);
  });
}

export function filterLoginLogs<T extends LoginLogRecord>(records: T[], filters: LogFilters): T[] {
  const keyword = filters.keyword.trim().toLowerCase();
  return records.filter(record => {
    const matchesKeyword = !keyword || [record.username, record.name, record.ip, record.location, record.browser, record.os, record.message]
      .some(value => value.toLowerCase().includes(keyword));
    return matchesKeyword
      && (filters.status === '全部' || record.status === filters.status)
      && matchesDateRange(record.time, filters.dateRange);
  });
}

export function calculateSystemLogMetrics(operationLogs: OperationLogRecord[], loginLogs: LoginLogRecord[]) {
  return {
    operationCount: operationLogs.length,
    loginCount: loginLogs.length,
    failureCount: [...operationLogs, ...loginLogs].filter(record => record.status === '失败').length,
  };
}

export function hasLogFilters(filters: LogFilters) {
  return Boolean(filters.keyword.trim() || filters.category || filters.status !== '全部' || filters.dateRange.length === 2);
}
