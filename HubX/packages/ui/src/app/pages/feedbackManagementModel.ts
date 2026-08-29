import type { FeedbackItem, FeedbackStatus, FeedbackType } from '@/app/feedback/FeedbackContext';

export interface FeedbackManagementFilters {
  keyword: string;
  status: 'all' | FeedbackStatus;
  type: 'all' | FeedbackType;
}

export const EMPTY_FEEDBACK_FILTERS: FeedbackManagementFilters = {
  keyword: '',
  status: 'all',
  type: 'all',
};

export function filterFeedbackItems(items: FeedbackItem[], filters: FeedbackManagementFilters) {
  const keyword = filters.keyword.trim().toLowerCase();
  return items.filter(item => (
    (filters.status === 'all' || item.status === filters.status)
    && (filters.type === 'all' || item.type === filters.type)
    && (!keyword || [item.id, item.content, item.pagePath, item.reporterName]
      .some(value => value.toLowerCase().includes(keyword)))
  ));
}

export function calculateFeedbackMetrics(items: FeedbackItem[]) {
  return {
    total: items.length,
    pending: items.filter(item => item.status === 'pending').length,
    processed: items.filter(item => item.status === 'processed').length,
  };
}

export function hasFeedbackFilters(filters: FeedbackManagementFilters) {
  return Boolean(filters.keyword.trim() || filters.status !== 'all' || filters.type !== 'all');
}
