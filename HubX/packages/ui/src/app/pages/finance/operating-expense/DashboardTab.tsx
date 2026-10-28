import { useMemo, useState } from 'react';
import { Button, Radio } from '@/design-system';
import { DataTable, MetricCard, MoneyText, SectionCard, AlertBanner } from '@/design-system';
import { useOperatingExpense } from './OperatingExpenseContext';
import {
  overheadPool, capacityHours, hourlyOverheadRate, latestPayrollTotal,
  postedLedgerTotal, directByAttribution, includeLaborTotal,
  rankByDepartment, rankByProject,
} from './expenseCalc';
import { detectAnomalies } from './expenseAnomalies';
import { canGenerate, generateFromTemplate } from './expenseMutations';
import { mockWorkdaysByMonth, mockEmployeesForOverhead, mockSalaryForOverhead, OPEX_DEPARTMENTS, OPEX_PROJECT_NAMES } from './mockData';
import { CURRENT_MONTH, rollingMonths } from './opexConstants';
import { downloadLedgerXlsx } from './exportLedger';

const MONTHS = rollingMonths();

export function DashboardTab() {
  const { records, setRecords, templates } = useOperatingExpense();
  const [includeLabor, setIncludeLabor] = useState(true);
  const payrollTotal = useMemo(() => latestPayrollTotal(mockSalaryForOverhead), []);

  const currentMonth = CURRENT_MONTH;
  const ledgerTotal = useMemo(() => postedLedgerTotal(records, currentMonth), [records, currentMonth]);
  const totalWithLabor = includeLaborTotal(ledgerTotal, payrollTotal, includeLabor);

  const pool = useMemo(() => overheadPool(records, currentMonth), [records, currentMonth]);
  const hours = useMemo(() => capacityHours(mockEmployeesForOverhead, currentMonth, mockWorkdaysByMonth), [currentMonth]);
  const rate = useMemo(() => hourlyOverheadRate(pool, hours), [pool, hours]);

  const projectDirect = useMemo(() => directByAttribution(records, currentMonth, 'project'), [records, currentMonth]);
  const leadDirect = useMemo(() => directByAttribution(records, currentMonth, 'lead_channel'), [records, currentMonth]);

  // 排行
  const deptRank = useMemo(() => rankByDepartment(records, currentMonth, id => OPEX_DEPARTMENTS.find(d => d.id === id)?.name ?? id), [records, currentMonth]);
  const projRank = useMemo(() => rankByProject(records, currentMonth, id => OPEX_PROJECT_NAMES[id] ?? id), [records, currentMonth]);

  // 异动
  const anomalies = useMemo(() => detectAnomalies({
    records, templates, currentMonth, today: '2026-08-21',
    canGenerate: (t, m, r) => canGenerate(t, m, r),
  }), [records, templates]);

  const handleExport = () => {
    const posted = records.filter(r => r.status === 'posted' && r.billingMonth === currentMonth && r.categoryPrimary !== 'LABOR');
    downloadLedgerXlsx(posted, `运营费用_${currentMonth}.xlsx`);
  };

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      {/* 口径切换 + 导出 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Radio.Group value={includeLabor} onChange={setIncludeLabor} type="button">
          <Radio value={true}>含人力</Radio>
          <Radio value={false}>不含人力</Radio>
        </Radio.Group>
        <Button type="text" onClick={handleExport}>导出当月台账</Button>
      </div>

      {/* 头条 KPI */}
      <SectionCard style={{ marginBottom: 16, background: 'var(--color-fill-1)' }}>
        <MetricCard
          label={`${currentMonth} 合计（${includeLabor ? '含人力' : '不含人力'}）`}
          value={<MoneyText value={totalWithLabor} />}
          detail={includeLabor ? (
            <>台账 <MoneyText value={ledgerTotal} /> + 工资 <MoneyText value={payrollTotal} /></>
          ) : undefined}
        />
      </SectionCard>

      {/* 支撑 KPI */}
      <div className="expense-kpi-grid">
        <SectionCard className="expense-kpi-card">
          <MetricCard label="公共运营池" value={<MoneyText value={pool} />} />
        </SectionCard>
        <SectionCard className="expense-kpi-card">
          <MetricCard label="项目直接" value={<MoneyText value={projectDirect} />} />
        </SectionCard>
        <SectionCard className="expense-kpi-card">
          <MetricCard label="线索直接" value={<MoneyText value={leadDirect} />} />
        </SectionCard>
        <SectionCard className="expense-kpi-card">
          <MetricCard label="R_hour（元/工时）" value={<MoneyText value={rate ?? 0} />} />
        </SectionCard>
        <SectionCard className="expense-kpi-card">
          <MetricCard label="工资引用" value={<MoneyText value={payrollTotal} />} detail="2026-05 · 平移" />
        </SectionCard>
      </div>

      {/* 异动 */}
      {anomalies.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <SectionCard title="异动提醒">
            {anomalies.map((a, i) => (
              <AlertBanner key={i} tone="warning" style={{ marginBottom: 8 }}>{`${a.title}：${a.detail}`}</AlertBanner>
            ))}
          </SectionCard>
        </div>
      )}

      {/* 两张排行 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <SectionCard title="部门归口排行">
          <DataTable
            data={deptRank.map((r, i) => ({ ...r, rank: i + 1 }))}
            columns={[
              { title: '#', dataIndex: 'rank', width: 40 },
              { title: '部门', dataIndex: 'name' },
              { title: '金额', dataIndex: 'amount', render: (v: number) => <MoneyText value={v} /> },
            ]}
            rowKey="name"
            pagination={false}
            size="small"
            emptyDescription="暂无部门费用"
          />
        </SectionCard>
        <SectionCard title="项目直接支出排行">
          <DataTable
            data={projRank.map((r, i) => ({ ...r, rank: i + 1 }))}
            columns={[
              { title: '#', dataIndex: 'rank', width: 40 },
              { title: '项目', dataIndex: 'name' },
              { title: '金额', dataIndex: 'amount', render: (v: number) => <MoneyText value={v} /> },
            ]}
            rowKey="name"
            pagination={false}
            size="small"
            emptyDescription="暂无项目直接支出"
          />
        </SectionCard>
      </div>
    </div>
  );
}
