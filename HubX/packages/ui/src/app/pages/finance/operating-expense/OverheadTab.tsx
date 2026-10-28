import { useMemo } from 'react';
import { Table, Typography } from '@/design-system';
import { DataTable, DateText, MetricCard, MoneyText, SectionCard, AlertBanner } from '@/design-system';
import { useOperatingExpense } from './OperatingExpenseContext';
import { overheadPool, capacityHours, hourlyOverheadRate, workdaysInRange } from './expenseCalc';
import { buildOverheadReadModel } from './overheadReadModel';
import { mockWorkdaysByMonth, mockEmployeesForOverhead } from './mockData';
import { mockCases, mockCostItems } from '../lean-delivery/mockData';
import { MOM_THRESHOLD, CURRENT_MONTH } from './opexConstants';
import { getContract } from '../lean-delivery/contractSeam';
import { deriveEac, deriveLifecycleMargin } from '../lean-delivery/calc';

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
      <SectionCard style={{ marginBottom: 16, background: 'var(--color-fill-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text bold>R_hour</Text>
          <Text>=</Text>
          <Text>公共运营池 <MoneyText value={pool} /></Text>
          <Text>÷</Text>
          <Text>编制工时 {hours}h</Text>
          <Text>=</Text>
          <Text bold><MoneyText value={rate} />/工时</Text>
          <Text type="secondary" style={{ marginLeft: 16 }}>
            人数 {empCount}（展示用，费率不按人头）
          </Text>
        </div>
      </SectionCard>

      {/* 参数概览 */}
      <div className="expense-overhead-summary">
        <SectionCard>
          <MetricCard label="当月费用池（pool）" value={<MoneyText value={pool} />} />
        </SectionCard>
        <SectionCard>
          <MetricCard label="编制工时" value={hours} suffix="h" />
        </SectionCard>
        <SectionCard>
          <MetricCard label="R_hour" value={<MoneyText value={rate} />} />
        </SectionCard>
      </div>

      {/* 阈值/工天摘要 */}
      <SectionCard style={{ marginTop: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <Text>预警阈值：<Text bold>{Math.round(MOM_THRESHOLD * 100)}%</Text>（本迭代不可编辑）</Text>
          <Text>{month} 标准工天：<Text bold>{mockWorkdaysByMonth[month]}</Text></Text>
        </div>
      </SectionCard>

      {/* 只读公摊结果表 */}
      <div style={{ marginBottom: 16 }}>
      <SectionCard title="公摊结果表（只读）">
        <DataTable
          rowKey="projectId"
          data={readModel.rows}
          pagination={false}
          emptyDescription="暂无公摊结果"
          columns={[
            { title: '项目', dataIndex: 'projectName', width: 150 },
            { title: '项目工时', dataIndex: 'hours', width: 100, render: (v: number) => `${v}h` },
            { title: '人力成本', dataIndex: 'laborCost', width: 120, render: (v: number) => <MoneyText value={v} /> },
            { title: '台账直接', dataIndex: 'ledgerDirect', width: 120, render: (v: number) => <MoneyText value={v} /> },
            { title: '工时×R_hour', dataIndex: 'overhead', width: 130, render: (v: number) => <MoneyText value={v} /> },
            { title: '合同标的', dataIndex: 'contractAmount', width: 120, render: (v: number) => v > 0 ? <MoneyText value={v} /> : '-' },
            { title: '综合毛利率', dataIndex: 'margin', width: 110, render: (v: number | null) => v != null ? `${(v * 100).toFixed(1)}%` : '-' },
          ]}

          summary={() => (
            <Table.Summary.Row style={{ background: 'var(--color-fill-1)', fontWeight: 600 }}>
              <Table.Summary.Cell>合计</Table.Summary.Cell>
              <Table.Summary.Cell>{readModel.rows.reduce((s, r) => s + r.hours, 0)}h</Table.Summary.Cell>
              <Table.Summary.Cell>-</Table.Summary.Cell>
              <Table.Summary.Cell>-</Table.Summary.Cell>
              <Table.Summary.Cell><MoneyText value={readModel.allocated} /></Table.Summary.Cell>
              <Table.Summary.Cell>-</Table.Summary.Cell>
              <Table.Summary.Cell>-</Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
        <div style={{ marginTop: 8 }}>
          <Text>已分摊：<MoneyText value={readModel.allocated} /></Text>
          <Text style={{ marginLeft: 24 }}>未分摊：<MoneyText value={readModel.unallocated} /></Text>
        </div>
        {readModel.hoursOverflow && (
          <AlertBanner tone="warning" style={{ marginTop: 8 }}>项目工时合计超过编制工时，未分摊已钳制为 0；请核日报/工天。本模块不倒灌。</AlertBanner>
        )}
        <Text type="secondary" style={{ fontSize: 'var(--ds-text-caption)', display: 'block', marginTop: 8 }}>
          公摊结果与精益交付成本项共用当月 R_hour；差旅等项目直接费用不进入公共运营池。综合毛利率继续读取有效合同标的与 EAC。
        </Text>
      </SectionCard>
      </div>

      {/* 员工折算明细 */}
      <SectionCard title={`当月员工折算明细（${month}）`}>
        <DataTable
          rowKey="id"
          data={empDetail}
          pagination={false}
          emptyDescription="暂无员工折算数据"
          columns={[
            { title: '姓名', dataIndex: 'name', width: 80 },
            { title: '入职日', dataIndex: 'hireDate', width: 110, render: (v: string | undefined) => <DateText value={v} /> },
            { title: '离职日', dataIndex: 'leaveDate', width: 110, render: (v: string | undefined) => <DateText value={v} /> },
            { title: '当月工天', dataIndex: 'workdays', width: 100 },
            { title: '当月工时', dataIndex: 'hours', width: 100, render: (v: number) => `${v}h` },
          ]}
        />
      </SectionCard>
    </div>
  );
}
