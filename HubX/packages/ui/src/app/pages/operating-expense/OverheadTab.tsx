import { useMemo } from 'react';
import { Card, Table, Typography, Statistic } from '@arco-design/web-react';
import { useOperatingExpense } from './OperatingExpenseContext';
import { overheadPool, capacityHours, hourlyOverheadRate, workdaysInRange } from './expenseCalc';
import { mockWorkdaysByMonth, mockEmployeesForOverhead } from './mockData';

const { Text } = Typography;

const MONTHS = ['2026-06', '2026-07', '2026-08'];

export function OverheadTab() {
  const { records } = useOperatingExpense();

  const monthData = useMemo(() => {
    return MONTHS.map(month => {
      const pool = overheadPool(records, month);
      const hours = capacityHours(mockEmployeesForOverhead, month, mockWorkdaysByMonth);
      const rate = hourlyOverheadRate(pool, hours);
      return { month, pool, hours, rate };
    });
  }, [records]);

  const current = monthData[monthData.length - 1];

  const empDetail = useMemo(() => {
    const month = '2026-08';
    const wd = mockWorkdaysByMonth[month] ?? 0;
    return mockEmployeesForOverhead.map(emp => {
      const days = workdaysInRange(month, emp.hireDate, emp.leaveDate, wd);
      return { ...emp, workdays: days, hours: days * 8 };
    });
  }, []);

  const empColumns = [
    { title: '姓名', dataIndex: 'name', width: 80 },
    { title: '入职日', dataIndex: 'hireDate', width: 110 },
    { title: '离职日', dataIndex: 'leaveDate', width: 110, render: (v: string | undefined) => v || '-' },
    { title: '当月工天', dataIndex: 'workdays', width: 100 },
    { title: '当月工时', dataIndex: 'hours', width: 100, render: (v: number) => `${v}h` },
  ];

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      {/* 参数概览 */}
      <div className="expense-overhead-summary">
        <Card>
          <Statistic title="当月费用池（pool）" value={current?.pool ?? 0} prefix="¥" />
        </Card>
        <Card>
          <Statistic title="编制工时" value={current?.hours ?? 0} suffix="h" />
          <Text type="secondary" className="expense-kpi-hint">Σ 工天 × 8</Text>
        </Card>
        <Card>
          <Statistic title="R_hour（元/工时）" value={current?.rate?.toFixed(2) ?? '0'} prefix="¥" />
          <Text type="secondary" className="expense-kpi-hint">池 ÷ 编制工时</Text>
        </Card>
      </div>

      {/* 近 3 个月参数变化 */}
      <Card title="近 3 个月参数变化" style={{ marginBottom: 'var(--space-4)' }}>
        <Table
          rowKey="month"
          data={monthData}
          pagination={false}
          columns={[
            { title: '月份', dataIndex: 'month', width: 100 },
            { title: '费用池', dataIndex: 'pool', width: 120, render: (v: number) => `¥${v.toLocaleString()}` },
            { title: '编制工时', dataIndex: 'hours', width: 100, render: (v: number) => `${v}h` },
            { title: 'R_hour', dataIndex: 'rate', width: 100, render: (v: number) => `¥${v.toFixed(2)}` },
          ]}
        />
      </Card>

      {/* 员工折算明细 */}
      <Card title="当月员工折算明细（2026-08）">
        <Table rowKey="id" data={empDetail} columns={empColumns} pagination={false} />
        <Text type="secondary" className="expense-kpi-hint" style={{ marginTop: 'var(--space-2)', display: 'block' }}>
          公式：在职区间与该月日历相交的自然日比例 × 工天数 × 8
        </Text>
      </Card>
    </div>
  );
}
