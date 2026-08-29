import { describe, expect, test } from 'vitest';
import type { FeedbackItem } from '@/app/feedback/FeedbackContext';
import {
  calculateFeedbackMetrics,
  EMPTY_FEEDBACK_FILTERS,
  filterFeedbackItems,
  hasFeedbackFilters,
} from '../feedbackManagementModel';
import {
  calculateSystemLogMetrics,
  EMPTY_LOG_FILTERS,
  filterLoginLogs,
  filterOperationLogs,
  hasLogFilters,
} from '../systemLogModel';

const operationLogs = [
  { username: 'admin', name: '管理员', module: '用户管理', operation: '新建用户', method: 'POST /api/users', ip: '10.0.0.1', location: '北京', status: '成功', time: '2026-08-27 10:00:00' },
  { username: 'wangwu', name: '王五', module: '系统配置', operation: '修改配置', method: 'PUT /api/config', ip: '10.0.0.2', location: '上海', status: '失败', time: '2026-08-28 11:00:00' },
];

const loginLogs = [
  { username: 'admin', name: '管理员', ip: '10.0.0.1', location: '北京', browser: 'Chrome', os: 'macOS', status: '成功', message: '登录成功', time: '2026-08-28 09:00:00' },
  { username: 'wangwu', name: '王五', ip: '10.0.0.2', location: '上海', browser: 'Safari', os: 'iOS', status: '失败', message: '密码错误', time: '2026-08-28 09:10:00' },
];

const feedbackItems: FeedbackItem[] = [
  { id: 'FB001', type: 'bug', content: '列表无法打开', contact: '', pagePath: '/leads/my', reporterName: '张三', createdAt: '2026-08-28T09:00:00.000Z', status: 'pending', attachments: [] },
  { id: 'FB002', type: 'suggestion', content: '建议增加导出', contact: '', pagePath: '/reports', reporterName: '李四', createdAt: '2026-08-28T10:00:00.000Z', status: 'processed', attachments: [] },
];

describe('系统管理列表模型', () => {
  test('操作日志支持关键词、模块、状态和日期组合筛选', () => {
    expect(filterOperationLogs(operationLogs, { keyword: '配置', category: '系统配置', status: '失败', dateRange: ['2026-08-28', '2026-08-28'] })).toHaveLength(1);
  });

  test('登录日志支持人员、终端信息和状态检索', () => {
    expect(filterLoginLogs(loginLogs, { keyword: 'safari', category: '', status: '失败', dateRange: [] })[0]?.username).toBe('wangwu');
  });

  test('系统日志指标合并统计失败记录', () => {
    expect(calculateSystemLogMetrics(operationLogs, loginLogs)).toEqual({ operationCount: 2, loginCount: 2, failureCount: 2 });
    expect(hasLogFilters(EMPTY_LOG_FILTERS)).toBe(false);
  });

  test('意见反馈支持多维筛选并计算处理指标', () => {
    expect(filterFeedbackItems(feedbackItems, { keyword: '导出', status: 'processed', type: 'suggestion' })[0]?.id).toBe('FB002');
    expect(calculateFeedbackMetrics(feedbackItems)).toEqual({ total: 2, pending: 1, processed: 1 });
    expect(hasFeedbackFilters(EMPTY_FEEDBACK_FILTERS)).toBe(false);
  });
});
