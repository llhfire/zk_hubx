import { useMemo } from 'react';
import { Card, Statistic, Typography } from '@arco-design/web-react';
import { useOperatingExpense } from './OperatingExpenseContext';
import { overheadPool, capacityHours, hourlyOverheadRate, latestPayrollTotal } from './expenseCalc';
import { mockWorkdaysByMonth, mockEmployeesForOverhead, mockSalaryForOverhead } from './mockData';

const { Text } = Typography;

/** 最近 6 个月 */
const MONTHS = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];

export function DashboardTab() {
  const { records } = useOperatingExpense();
  const payrollTotal = useMemo(() => latestPayrollTotal(mockSalaryForOverhead), []);

  const monthlyStats = useMemo(() => {
    return MONTHS.map(month => {
      const pool = overheadPool(records, month);
      const hours = capacityHours(mockEmployeesForOverhead, month, mockWorkdaysByMonth);
      const rate = hourlyOverheadRate(pool, hours);
      return { month, pool, hours, rate };
    });
  }, [records]);

  const current = monthlyStats[1] ?? monthlyStats[0];
  const maxPool = Math.max(...monthlyStats.map(x => x.pool), 1);

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      {/* KPI 卡片 */}
      <div className="expense-kpi-grid">
        <Card className="expense-kpi-card">
          <Statistic title="当月费用池" value={current?.pool ?? 0} prefix="¥" />
        </Card>
        <Card className="expense-kpi-card">
          <Statistic title="R_hour（元/工时）" value={current?.rate?.toFixed(2) ?? '0'} prefix="¥" />
        </Card>
        <Card className="expense-kpi-card">
          <Statistic title="编制工时" value={current?.hours ?? 0} suffix="h" />
        </Card>
        <Card className="expense-kpi-card">
          <Statistic title="工资引用（最近月）" value={payrollTotal} prefix="¥" />
          <Text type="secondary" className="expense-kpi-hint">2026-05 合计</Text>
        </Card>
      </div>

      {/* 趋势柱状图 */}
      <Card title="近 6 个月费用池趋势（不含工资）">
        <div className="expense-bar-chart">
          {monthlyStats.map(s => {
            const height = (s.pool / maxPool) * 160;
            return (
              <div key={s.month} className="expense-bar-chart-col">
                <div className="expense-bar-chart-value">¥{(s.pool / 1000).toFixed(1)}k</div>
                <div className="expense-bar-chart-bar" style={{ height }} />
                <div className="expense-bar-chart-label">{s.month.slice(5)}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
