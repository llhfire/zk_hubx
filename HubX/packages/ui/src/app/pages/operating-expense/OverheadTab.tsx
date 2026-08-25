import { useMemo } from 'react';
import { Card, Table, Typography, Statistic, Alert } from '@arco-design/web-react';
import { useOperatingExpense } from './OperatingExpenseContext';
import { overheadPool, capacityHours, hourlyOverheadRate, workdaysInRange } from './expenseCalc';
import { buildOverheadReadModel } from './overheadReadModel';
import { mockWorkdaysByMonth, mockEmployeesForOverhead } from './mockData';
import { mockCases, mockCostItems } from '../financial-delivery/mockData';
import { MOM_THRESHOLD, CURRENT_MONTH } from './opexConstants';
import { getContract } from '../financial-delivery/contractSeam';
import { deriveEac, deriveLifecycleMargin } from '../financial-delivery/calc';

const { Text } = Typography;

export function OverheadTab() {
  const { records } = useOperatingExpense();
  const month = CURRENT_MONTH;

  const pool = useMemo(() => overheadPool(records, month), [records, month]);
  const hours = useMemo(() => capacityHours(mockEmployeesForOverhead, month, mockWorkdaysByMonth), [month]);
  const rate = useMemo(() => hourlyOverheadRate(pool, hours), [pool, hours]);
  const empCount = useMemo(() => mockEmployeesForOverhead.filter(e => workdaysInRange(month, e.hireDate, e.leaveDate, mockWorkdaysByMonth[month] ?? 0) > 0).length, [month]);

  const readModel = useMemo(() => buildOverheadReadModel({
    month,
    records,
    rHour: rate,
    pool,
    capacityHours: hours,
    cases: mockCases.filter(c => c.projectId),
    costItems: mockCostItems as any,
    getContract: (id) => getContract(id) as any,
    deriveEac: (items) => deriveEac(items as any),
    deriveLifecycleMargin: (amt, eac) => deriveLifecycleMargin(amt, eac),
  }), [records, rate, pool, hours]);

  const empDetail = useMemo(() => {
    const wd = mockWorkdaysByMonth[month] ?? 0;
    return mockEmployeesForOverhead.map(emp => {
      const days = workdaysInRange(month, emp.hireDate, emp.leaveDate, wd);
      return { ...emp, workdays: days, hours: days * 8 };
    });
  }, [month]);

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      {/* 公式条 */}
      <Card style={{ marginBottom: 16, background: 'var(--color-fill-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text bold>R_hour</Text>
          <Text>=</Text>
          <Text>公共运营池 ¥{pool.toLocaleString()}</Text>
          <Text>÷</Text>
          <Text>编制工时 {hours}h</Text>
          <Text>=</Text>
          <Text bold style={{ color: 'var(--color-primary-6)' }}>¥{rate.toFixed(2)}/工时</Text>
          <Text type="secondary" style={{ marginLeft: 16 }}>
            人数 {empCount}（展示用，费率不按人头）
          </Text>
        </div>
      </Card>

      {/* 参数概览 */}
      <div className="expense-overhead-summary">
        <Card>
          <Statistic title="当月费用池（pool）" value={pool} prefix="¥" />
        </Card>
        <Card>
          <Statistic title="编制工时" value={hours} suffix="h" />
        </Card>
        <Card>
          <Statistic title="R_hour" value={rate.toFixed(2)} prefix="¥" />
        </Card>
      </div>

      {/* 阈值/工天摘要 */}
      <Card style={{ marginTop: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <Text>预警阈值：<Text bold>{Math.round(MOM_THRESHOLD * 100)}%</Text>（本迭代不可编辑）</Text>
          <Text>{month} 标准工天：<Text bold>{mockWorkdaysByMonth[month]}</Text></Text>
        </div>
      </Card>

      {/* 只读公摊结果表 */}
      <Card title="公摊结果表（只读）" style={{ marginBottom: 16 }}>
        <Table
          rowKey="projectId"
          data={readModel.rows}
          pagination={false}
          columns={[
            { title: '项目', dataIndex: 'projectName', width: 150 },
            { title: '项目工时', dataIndex: 'hours', width: 100, render: (v: number) => `${v}h` },
            { title: '人力成本', dataIndex: 'laborCost', width: 120, render: (v: number) => `¥${v.toLocaleString()}` },
            { title: '台账直接', dataIndex: 'ledgerDirect', width: 120, render: (v: number) => `¥${v.toLocaleString()}` },
            { title: '工时×R_hour', dataIndex: 'overhead', width: 130, render: (v: number) => `¥${v.toFixed(0)}` },
            { title: '合同标的', dataIndex: 'contractAmount', width: 120, render: (v: number) => v > 0 ? `¥${v.toLocaleString()}` : '-' },
            { title: '综合毛利率', dataIndex: 'margin', width: 110, render: (v: number | null) => v != null ? `${(v * 100).toFixed(1)}%` : '-' },
          ]}
          summary={() => (
            <Table.Summary.Row style={{ background: 'var(--color-fill-1)', fontWeight: 600 }}>
              <Table.Summary.Cell>合计</Table.Summary.Cell>
              <Table.Summary.Cell>{readModel.rows.reduce((s, r) => s + r.hours, 0)}h</Table.Summary.Cell>
              <Table.Summary.Cell>-</Table.Summary.Cell>
              <Table.Summary.Cell>-</Table.Summary.Cell>
              <Table.Summary.Cell>¥{readModel.allocated.toFixed(0)}</Table.Summary.Cell>
              <Table.Summary.Cell>-</Table.Summary.Cell>
              <Table.Summary.Cell>-</Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
        <div style={{ marginTop: 8 }}>
          <Text>已分摊：¥{readModel.allocated.toFixed(0)}</Text>
          <Text style={{ marginLeft: 24 }}>未分摊：¥{readModel.unallocated.toFixed(0)}</Text>
        </div>
        {readModel.hoursOverflow && (
          <Alert type="warning" content="项目工时合计超过编制工时，未分摊已钳制为 0；请核日报/工天。本模块不倒灌。" style={{ marginTop: 8 }} />
        )}
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
          综合毛利率读取精益 deriveLifecycleMargin(合同标的, deriveEac(该 Case 成本项))。EAC 内 overhead 金额按占位 OVERHEAD_RATE=35 写入。本列「工时×本页 R_hour」与上述 35 口径不是同一笔。本模块不把现场费率写回成本项，也不用现场公摊重算毛利。
        </Text>
      </Card>

      {/* 员工折算明细 */}
      <Card title={`当月员工折算明细（${month}）`}>
        <Table
          rowKey="id"
          data={empDetail}
          pagination={false}
          columns={[
            { title: '姓名', dataIndex: 'name', width: 80 },
            { title: '入职日', dataIndex: 'hireDate', width: 110 },
            { title: '离职日', dataIndex: 'leaveDate', width: 110, render: (v: string | undefined) => v || '-' },
            { title: '当月工天', dataIndex: 'workdays', width: 100 },
            { title: '当月工时', dataIndex: 'hours', width: 100, render: (v: number) => `${v}h` },
          ]}
        />
      </Card>
    </div>
  );
}
