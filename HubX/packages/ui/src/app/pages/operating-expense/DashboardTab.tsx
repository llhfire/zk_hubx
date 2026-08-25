import { useMemo, useState } from 'react';
import { Card, Statistic, Typography, Radio, Table, Alert } from '@arco-design/web-react';
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

const { Text } = Typography;

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
        <a onClick={handleExport} style={{ cursor: 'pointer', color: 'var(--color-primary-6)' }}>导出当月台账</a>
      </div>

      {/* 头条 KPI */}
      <Card style={{ marginBottom: 16, background: 'var(--color-fill-1)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <Statistic title={`${currentMonth} 合计（${includeLabor ? '含人力' : '不含人力'}）`} value={totalWithLabor} prefix="¥" />
          {includeLabor && <Text type="secondary">台账 ¥{ledgerTotal.toLocaleString()} + 工资 ¥{payrollTotal.toLocaleString()}</Text>}
        </div>
      </Card>

      {/* 支撑 KPI */}
      <div className="expense-kpi-grid">
        <Card className="expense-kpi-card">
          <Statistic title="公共运营池" value={pool} prefix="¥" />
        </Card>
        <Card className="expense-kpi-card">
          <Statistic title="项目直接" value={projectDirect} prefix="¥" />
        </Card>
        <Card className="expense-kpi-card">
          <Statistic title="线索直接" value={leadDirect} prefix="¥" />
        </Card>
        <Card className="expense-kpi-card">
          <Statistic title="R_hour（元/工时）" value={rate?.toFixed(2) ?? '0'} prefix="¥" />
        </Card>
        <Card className="expense-kpi-card">
          <Statistic title="工资引用" value={payrollTotal} prefix="¥" />
          <Text type="secondary" style={{ fontSize: 12 }}>2026-05 · 平移</Text>
        </Card>
      </div>

      {/* 异动 */}
      {anomalies.length > 0 && (
        <Card title="异动提醒" style={{ marginTop: 16 }}>
          {anomalies.map((a, i) => (
            <Alert key={i} type="warning" content={`${a.title}：${a.detail}`} style={{ marginBottom: 8 }} />
          ))}
        </Card>
      )}

      {/* 两张排行 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Card title="部门归口排行">
          <Table
            data={deptRank.map((r, i) => ({ ...r, rank: i + 1 }))}
            columns={[
              { title: '#', dataIndex: 'rank', width: 40 },
              { title: '部门', dataIndex: 'name' },
              { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${v.toLocaleString()}` },
            ]}
            pagination={false}
            size="small"
          />
        </Card>
        <Card title="项目直接支出排行">
          <Table
            data={projRank.map((r, i) => ({ ...r, rank: i + 1 }))}
            columns={[
              { title: '#', dataIndex: 'rank', width: 40 },
              { title: '项目', dataIndex: 'name' },
              { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${v.toLocaleString()}` },
            ]}
            pagination={false}
            size="small"
          />
        </Card>
      </div>
    </div>
  );
}
