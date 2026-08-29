import { useMemo } from 'react';
import { Tag, Typography } from '@arco-design/web-react';
import type { Expense, TripExpenseType } from '../../types';

const { Text } = Typography;

interface TimelineViewProps {
  expenses: (Expense & { segmentDesc: string })[];
  typeLabels: Record<TripExpenseType, string>;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  transport: { bg: '#f2f3ff', text: '#165dff', border: '#bedaff' },
  accommodation: { bg: '#f5e8ff', text: '#722ed1', border: '#d3adf7' },
  meal: { bg: '#fff7e6', text: '#fa8c16', border: '#ffd591' },
  local_transport: { bg: '#e8ffea', text: '#00b42a', border: '#aff0b5' },
  communication: { bg: '#e8fffb', text: '#13c2c2', border: '#87e8de' },
  entertainment: { bg: '#fff0f6', text: '#eb2f96', border: '#ffadd2' },
  office: { bg: '#f7f8fa', text: '#86909c', border: '#c9cdd4' },
  other: { bg: '#fff7e6', text: '#fa8c16', border: '#ffd591' },
};

const TRACK_TYPES: TripExpenseType[] = ['transport', 'accommodation', 'meal', 'local_transport', 'other'];

export function TimelineView({ expenses, typeLabels }: TimelineViewProps) {
  // 按日期和类型分组
  const { dateRange, expensesByDate } = useMemo(() => {
    if (expenses.length === 0) return { dateRange: [], expensesByDate: {} };

    const dates = [...new Set(expenses.map((e) => e.date))].sort();
    const byDate: Record<string, (Expense & { segmentDesc: string })[]> = {};
    expenses.forEach((e) => {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });
    return { dateRange: dates, expensesByDate: byDate };
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: '#86909c' }}>
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
              <div style={{ fontSize: 12, fontWeight: 500, color: '#1d2129' }}>{date.slice(5)}</div>
              <div style={{ fontSize: 10, color: '#86909c' }}>
                ¥{expensesByDate[date]?.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* 时间轴线 */}
        <div style={{ position: 'relative', marginLeft: labelWidth, marginBottom: 2 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: '#e5e6eb' }} />
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
                background: '#165dff',
                border: '2px solid white',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                left: `${(i / (dateRange.length - 1 || 1)) * 100}%`,
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
                  <Text style={{ fontSize: 12, fontWeight: hasData ? 500 : 400, color: hasData ? '#1d2129' : '#86909c' }}>
                    {typeLabels[type]}
                  </Text>
                </div>

                {/* 轨道 */}
                <div style={{ flex: 1, position: 'relative', height: 32, background: '#fff' }}>
                  {/* 轨道背景线 */}
                  <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 4, right: 4, height: 1, background: '#e5e6eb' }} />

                  {/* 日期网格线 */}
                  {dateRange.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        width: 1,
                        background: '#f0f0f0',
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
                          borderRadius: 12,
                          fontSize: 10,
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
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: '1px solid #e5e6eb' }}>
          <div style={{ width: labelWidth, flexShrink: 0, textAlign: 'right', paddingRight: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: 600, color: '#1d2129' }}>每日合计</Text>
          </div>
          <div style={{ flex: 1, display: 'flex' }}>
            {dateRange.map((date) => {
              const total = expensesByDate[date]?.reduce((sum, e) => sum + e.amount, 0) || 0;
              return (
                <div key={date} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: '#722ed1' }}>¥{total.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
