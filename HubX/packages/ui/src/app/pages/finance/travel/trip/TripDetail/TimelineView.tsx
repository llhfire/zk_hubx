import { useMemo } from 'react';
import { Tag, Typography } from '@/design-system';
import type { Expense, TripExpenseType } from '../../types';

const { Text } = Typography;

interface TimelineViewProps {
  expenses: (Expense & { segmentDesc: string })[];
  typeLabels: Record<TripExpenseType, string>;
  visibleDates?: string[];
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  transport: { bg: 'rgb(var(--primary-1))', text: 'rgb(var(--primary-6))', border: 'rgb(var(--primary-3))' },
  accommodation: { bg: 'var(--ds-tone-purple-bg)', text: 'var(--ds-tone-purple-fg)', border: 'var(--ds-tone-purple-border)' },
  meal: { bg: 'var(--ds-tone-warning-bg)', text: 'var(--ds-tone-warning-fg)', border: 'var(--ds-tone-warning-border)' },
  local_transport: { bg: 'var(--ds-tone-success-bg)', text: 'var(--ds-tone-success-fg)', border: 'var(--ds-tone-success-border)' },
  communication: { bg: 'var(--ds-tone-cyan-bg)', text: 'var(--ds-tone-cyan-fg)', border: 'var(--ds-tone-cyan-border)' },
  entertainment: { bg: 'var(--ds-tone-pink-bg)', text: 'var(--ds-tone-pink-fg)', border: 'var(--ds-tone-pink-border)' },
  office: { bg: 'var(--color-fill-2)', text: 'var(--color-text-3)', border: 'var(--color-border-3)' },
  other: { bg: 'var(--ds-tone-warning-bg)', text: 'var(--ds-tone-warning-fg)', border: 'var(--ds-tone-warning-border)' },
};

const TRACK_TYPES: TripExpenseType[] = ['transport', 'accommodation', 'meal', 'local_transport', 'other'];

export function TimelineView({ expenses, typeLabels, visibleDates }: TimelineViewProps) {
  // 按日期和类型分组
  const { dateRange, expensesByDate } = useMemo(() => {
    const dates = visibleDates && visibleDates.length > 0
      ? visibleDates
      : [...new Set(expenses.map((e) => e.date))].sort();

    const byDate: Record<string, (Expense & { segmentDesc: string })[]> = {};
    expenses.forEach((e) => {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });
    return { dateRange: dates, expensesByDate: byDate };
  }, [expenses, visibleDates]);

  if (dateRange.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-3)' }}>
        暂无费用记录
      </div>
    );
  }

  // 计算每天各类型的费用
  const getDailyAmount = (date: string, type: TripExpenseType) => {
    return expensesByDate[date]
      ?.filter((e) => e.type === type)
      .reduce((sum, e) => sum + e.amount, 0) || 0;
  };

  const labelWidth = 96;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ width: '100%' }}>
        {/* 日期标题行 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 4, paddingLeft: labelWidth }}>
          {dateRange.map((date) => (
            <div key={date} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--color-text-1)' }}>{date.slice(5)}</div>
              <div style={{ fontSize: 'var(--ds-text-micro)', color: 'var(--color-text-3)' }}>
                ¥{expensesByDate[date]?.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* 时间轴线 */}
        <div style={{ position: 'relative', marginLeft: labelWidth, marginBottom: 2 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: 'var(--color-border-2)' }} />
          {dateRange.map((date, i) => (
            <div
              key={date}
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'rgb(var(--primary-6))',
                border: '2px solid white',
                boxShadow: 'var(--ds-shadow-subtle)',
                left: `${((i + 0.5) / dateRange.length) * 100}%`,
              }}
            />
          ))}
        </div>

        {/* 费用类型轨道 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          {TRACK_TYPES.map((type) => {
            const hasData = dateRange.some((d) => getDailyAmount(d, type) > 0);
            return (
              <div key={type} style={{ display: 'flex', alignItems: 'center' }}>
                {/* 类型标签 */}
                <div style={{ width: labelWidth, flexShrink: 0, textAlign: 'right', paddingRight: 12 }}>
                  <Text style={{ fontSize: 'var(--text-xs)', fontWeight: hasData ? 500 : 400, color: hasData ? 'var(--color-text-1)' : 'var(--color-text-3)' }}>
                    {typeLabels[type]}
                  </Text>
                </div>

                {/* 轨道 */}
                <div style={{ flex: 1, position: 'relative', height: 32, background: 'var(--color-white)' }}>
                  {/* 轨道背景线 */}
                  <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 4, right: 4, height: 1, background: 'var(--color-border-2)' }} />

                  {/* 日期网格线 */}
                  {dateRange.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        width: 1,
                        background: 'var(--color-fill-2)',
                        left: `${((i + 0.5) / dateRange.length) * 100}%`,
                      }}
                    />
                  ))}

                  {/* 费用胶囊 */}
                  {dateRange.map((date, i) => {
                    const amount = getDailyAmount(date, type);
                    if (amount === 0) return null;

                    const colors = TYPE_COLORS[type] || TYPE_COLORS.other;

                    return (
                      <div
                        key={date}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          left: `${((i + 0.5) / dateRange.length) * 100}%`,
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-lg)',
                          fontSize: 'var(--ds-text-micro)',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          zIndex: 10,
                          background: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                        }}
                        title={`${date}: ¥${amount}`}
                      >
                        ¥{amount}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 每日总计 */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--color-border-2)' }}>
          <div style={{ width: labelWidth, flexShrink: 0, textAlign: 'right', paddingRight: 12 }}>
            <Text style={{ fontSize: 'var(--ds-text-caption)', fontWeight: 600, color: 'var(--color-text-1)' }}>每日合计</Text>
          </div>
          <div style={{ flex: 1, display: 'flex' }}>
            {dateRange.map((date) => {
              const total = expensesByDate[date]?.reduce((sum, e) => sum + e.amount, 0) || 0;
              return (
                <div key={date} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--ds-text-caption)', fontWeight: 'bold', color: 'var(--ds-tone-purple-fg)' }}>¥{total.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
