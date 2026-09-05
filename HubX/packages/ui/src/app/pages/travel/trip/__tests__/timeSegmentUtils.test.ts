import { describe, expect, test } from 'vitest';
import {
  diffDays,
  isOverOneWeek,
  buildTenDaySegments,
  generateDateRange,
} from '../TripDetail/timeSegmentUtils';
import type { Expense } from '../../../types';

describe('timeSegmentUtils 每10天分段与周期判定', () => {
  test('diffDays 正确计算连续天数跨度', () => {
    expect(diffDays('2026-04-28', '2026-04-28')).toBe(1);
    expect(diffDays('2026-04-28', '2026-05-02')).toBe(5);
    expect(diffDays('2026-04-01', '2026-04-30')).toBe(30);
  });

  test('generateDateRange 连续生成区间内所有日期', () => {
    const list = generateDateRange('2026-04-28', '2026-05-01');
    expect(list).toEqual(['2026-04-28', '2026-04-29', '2026-04-30', '2026-05-01']);
  });

  test('isOverOneWeek 准确判定是否超过一周（> 7天）', () => {
    expect(isOverOneWeek('2026-05-01', '2026-05-05')).toBe(false); // 5天
    expect(isOverOneWeek('2026-05-01', '2026-05-07')).toBe(false); // 7天
    expect(isOverOneWeek('2026-05-01', '2026-05-08')).toBe(true);  // 8天
    expect(isOverOneWeek('2026-05-01', '2026-05-20')).toBe(true);  // 20天
  });

  test('buildTenDaySegments 正确切分每10天一段并聚合费用', () => {
    const mockExpenses: (Expense & { segmentDesc: string })[] = [
      { id: '1', tripId: 't1', itinerarySegmentId: 's1', type: 'meal', amount: 120, date: '2026-05-02', isOverStandard: false, segmentDesc: '段1' },
      { id: '2', tripId: 't1', itinerarySegmentId: 's1', type: 'meal', amount: 80, date: '2026-05-10', isOverStandard: false, segmentDesc: '段1' },
      { id: '3', tripId: 't1', itinerarySegmentId: 's1', type: 'transport', amount: 500, date: '2026-05-15', isOverStandard: false, segmentDesc: '段2' },
      { id: '4', tripId: 't1', itinerarySegmentId: 's1', type: 'other', amount: 300, date: '2026-05-25', isOverStandard: false, segmentDesc: '段3' },
    ];

    const segments = buildTenDaySegments({
      startDate: '2026-05-01',
      endDate: '2026-05-25',
      expenses: mockExpenses,
    });

    // 25天应切为 3 个段：1-10天、11-20天、21-25天
    expect(segments).toHaveLength(3);

    // 第 1 段：05-01 ~ 05-10 (共10天)
    expect(segments[0].label).toBe('第 1-10 天');
    expect(segments[0].startDate).toBe('2026-05-01');
    expect(segments[0].endDate).toBe('2026-05-10');
    expect(segments[0].days).toBe(10);
    expect(segments[0].totalAmount).toBe(200); // 120 + 80
    expect(segments[0].expenseCount).toBe(2);

    // 第 2 段：05-11 ~ 05-20 (共10天)
    expect(segments[1].label).toBe('第 11-20 天');
    expect(segments[1].startDate).toBe('2026-05-11');
    expect(segments[1].endDate).toBe('2026-05-20');
    expect(segments[1].days).toBe(10);
    expect(segments[1].totalAmount).toBe(500);
    expect(segments[1].expenseCount).toBe(1);

    // 第 3 段：05-21 ~ 05-25 (剩余5天)
    expect(segments[2].label).toBe('第 21-25 天');
    expect(segments[2].startDate).toBe('2026-05-21');
    expect(segments[2].endDate).toBe('2026-05-25');
    expect(segments[2].days).toBe(5);
    expect(segments[2].totalAmount).toBe(300);
    expect(segments[2].expenseCount).toBe(1);
  });
});
