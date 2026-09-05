// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { ExpensePeriodSelector } from '../TripDetail/ExpensePeriodSelector';
import type { TenDaySegment } from '../TripDetail/timeSegmentUtils';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockSegments: TenDaySegment[] = [
  {
    id: 'seg-0',
    index: 0,
    startDayNumber: 1,
    endDayNumber: 10,
    label: '第 1-10 天',
    dateRangeLabel: '05-01 ~ 05-10',
    startDate: '2026-05-01',
    endDate: '2026-05-10',
    days: 10,
    dateList: ['2026-05-01', '2026-05-02'],
    totalAmount: 320,
    expenseCount: 2,
    expenses: [],
  },
  {
    id: 'seg-1',
    index: 1,
    startDayNumber: 11,
    endDayNumber: 18,
    label: '第 11-18 天',
    dateRangeLabel: '05-11 ~ 05-18',
    startDate: '2026-05-11',
    endDate: '2026-05-18',
    days: 8,
    dateList: ['2026-05-11'],
    totalAmount: 150,
    expenseCount: 1,
    expenses: [],
  },
];

describe('ExpensePeriodSelector 时间段选择器组件', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('不超过一周（<= 7 天）时，不渲染选择器', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <ExpensePeriodSelector
          segments={mockSegments}
          activeIndex={0}
          onChange={vi.fn()}
          totalSpanDays={7}
        />
      );
    });

    expect(container.innerHTML).toBe('');
    act(() => root.unmount());
  });

  test('超过一周（> 7 天）时，在下方渲染时间段选择器并支持点击切换', async () => {
    const handleChange = vi.fn();
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ExpensePeriodSelector
          segments={mockSegments}
          activeIndex={0}
          onChange={handleChange}
          totalSpanDays={18}
        />
      );
    });

    expect(container.textContent).toContain('时间段选择器');
    expect(container.textContent).toContain('按每 10 天一个显示段');
    expect(container.textContent).toContain('第 1-10 天');
    expect(container.textContent).toContain('第 11-18 天');

    // 找到包含第 11-18 天的卡片元素并触发点击
    const seg2Element = container.querySelector<HTMLElement>('[data-testid="period-segment-1"]');
    expect(seg2Element).toBeDefined();

    await act(async () => {
      seg2Element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleChange).toHaveBeenCalledWith(1);
    act(() => root.unmount());
  });
});
