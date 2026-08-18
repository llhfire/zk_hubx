# 合同成本统计与工资维护 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 HubX 新增工资表页面和合同成本明细页面，基于日报工时和工资数据计算科研成本，归集商务/外包/其他/运营成本，在合同维度展示完整成本明细。

**Architecture:** 新增 `contract-cost/` 目录放置共享类型、mock 数据和成本计算函数；工资表和合同成本明细各一个页面组件；改造现有合同统计 Tab 的合同名称为可跳转链接；通过权限控制工资数字可见性。数据流为纯 mock 状态，不接后端。

**Tech Stack:** React 18、Vite 6、TypeScript、Arco Design React、React Router v7、本地 mock 状态。

---

## File Structure

- Create: `src/app/pages/contract-cost/contractCostData.ts`
  - 所有共享类型定义、mock 数据（工资表、外包成本、其他成本、商务成本映射）、成本计算函数、权限常量。
- Create: `src/app/pages/contract-cost/SalaryPage.tsx`
  - 工资表页面组件。
- Create: `src/app/pages/contract-cost/ContractCostDetail.tsx`
  - 合同成本明细页面组件。
- Modify: `src/app/pages/FinancialDashboard.tsx`
  - 合同统计 Tab 合同名称改为可点击跳转链接。
- Modify: `src/app/pages/project-management/mockData.ts`
  - 项目数据增加 `contractId` 字段。
- Modify: `src/app/routes.tsx`
  - 增加 `/finance/salary`、`/finance/contract-cost/:contractId` 路由。
- Modify: `src/app/components/MainLayout.tsx`
  - 财务管理菜单增加"工资表"。
- Modify: `src/app/pages/UserPermission.tsx`
  - 权限树增加财务管理权限节点。

---

### Task 1: Create shared data module

**Files:**
- Create: `src/app/pages/contract-cost/contractCostData.ts`

- [ ] **Step 1: Create the shared module with all types, mock data, and calculation functions**

Create `src/app/pages/contract-cost/contractCostData.ts` with this content:

```ts
import { initialProjects, mockDailyReports, type Project, type ProjectDailyReport } from '../project-management/mockData';

// ─── Permissions ─────────────────────────────────────────────────────────────

export interface ContractCostPermissions {
  salaryView: boolean;
  salaryEdit: boolean;
  contractCostView: boolean;
  contractCostDetail: boolean;
}

export const contractCostPermissions: ContractCostPermissions = {
  salaryView: true,
  salaryEdit: true,
  contractCostView: true,
  contractCostDetail: true,
};

// ─── Salary ──────────────────────────────────────────────────────────────────

export interface MonthlySalaryRecord {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  month: string;
  nominalSalary: number;
  nominalHours: number;
  actualSalary?: number;
  actualHours?: number;
  inherited: boolean;
}

export const STANDARD_MONTHLY_HOURS = 176;

export const mockSalaryData: MonthlySalaryRecord[] = [
  { employeeId: '1', employeeName: '张三', department: '总公司', position: '总经理', month: '2026-05', nominalSalary: 35000, nominalHours: STANDARD_MONTHLY_HOURS, actualSalary: 35000, actualHours: 176, inherited: false },
  { employeeId: '2', employeeName: '李四', department: '技术部', position: '技术总监', month: '2026-05', nominalSalary: 30000, nominalHours: STANDARD_MONTHLY_HOURS, actualSalary: 30000, actualHours: 168, inherited: false },
  { employeeId: '3', employeeName: '王五', department: '前端组', position: '前端主管', month: '2026-05', nominalSalary: 25000, nominalHours: STANDARD_MONTHLY_HOURS, actualSalary: 25000, actualHours: 172, inherited: false },
  { employeeId: '4', employeeName: '赵六', department: '后端组', position: '后端主管', month: '2026-05', nominalSalary: 25000, nominalHours: STANDARD_MONTHLY_HOURS, actualSalary: 25000, actualHours: 160, inherited: false },
  { employeeId: '5', employeeName: '钱七', department: '销售部', position: '销售总监', month: '2026-05', nominalSalary: 28000, nominalHours: STANDARD_MONTHLY_HOURS, inherited: false },
  { employeeId: '1', employeeName: '张三', department: '总公司', position: '总经理', month: '2026-04', nominalSalary: 35000, nominalHours: STANDARD_MONTHLY_HOURS, actualSalary: 35000, actualHours: 176, inherited: false },
  { employeeId: '2', employeeName: '李四', department: '技术部', position: '技术总监', month: '2026-04', nominalSalary: 28000, nominalHours: STANDARD_MONTHLY_HOURS, actualSalary: 28000, actualHours: 170, inherited: false },
  { employeeId: '3', employeeName: '王五', department: '前端组', position: '前端主管', month: '2026-04', nominalSalary: 24000, nominalHours: STANDARD_MONTHLY_HOURS, actualSalary: 24000, actualHours: 168, inherited: false },
  { employeeId: '4', employeeName: '赵六', department: '后端组', position: '后端主管', month: '2026-04', nominalSalary: 24000, nominalHours: STANDARD_MONTHLY_HOURS, actualSalary: 24000, actualHours: 176, inherited: false },
  { employeeId: '5', employeeName: '钱七', department: '销售部', position: '销售总监', month: '2026-04', nominalSalary: 28000, nominalHours: STANDARD_MONTHLY_HOURS, actualSalary: 28000, actualHours: 160, inherited: false },
];

export function getSalaryForMonth(month: string, allSalary: MonthlySalaryRecord[]): MonthlySalaryRecord[] {
  const current = allSalary.filter((r) => r.month === month);
  if (current.length > 0) return current;
  const months = [...new Set(allSalary.map((r) => r.month))].sort().reverse();
  const previousMonth = months.find((m) => m < month);
  if (!previousMonth) return [];
  return allSalary
    .filter((r) => r.month === previousMonth)
    .map((r) => ({ ...r, month, inherited: true, actualSalary: undefined, actualHours: undefined }));
}

export function getHourlyRate(record: MonthlySalaryRecord, useActual: boolean): number {
  if (useActual && record.actualSalary != null && record.actualHours != null && record.actualHours > 0) {
    return record.actualSalary / record.actualHours;
  }
  if (record.nominalHours > 0) {
    return record.nominalSalary / record.nominalHours;
  }
  return 0;
}

// ─── Contract ↔ Project mapping ──────────────────────────────────────────────

export const contractProjectMap: Record<string, string[]> = {
  '1': ['1'],
  '2': ['2'],
  '3': ['3'],
  '4': ['1'],
};

export const contractNames: Record<string, string> = {
  '1': '企业管理系统开发合同',
  '2': '云服务平台建设合同',
  '3': '协作工具定制开发合同',
  '4': 'A公司CRM系统开发',
};

// ─── Business cost (商务成本) ────────────────────────────────────────────────

export interface BusinessCostRecord {
  id: string;
  contractId: string;
  reimbursementNo: string;
  applicant: string;
  category: string;
  amount: number;
  leadName: string;
  date: string;
}

export const mockBusinessCosts: BusinessCostRecord[] = [
  { id: 'biz-1', contractId: '1', reimbursementNo: 'RB20260425001', applicant: '张三', category: '差旅费', amount: 4800, leadName: '阿里巴巴-企业管理系统', date: '2026-04-25' },
  { id: 'biz-2', contractId: '2', reimbursementNo: 'RB20260424001', applicant: '李四', category: '招待费', amount: 2500, leadName: '腾讯-云服务平台', date: '2026-04-24' },
  { id: 'biz-3', contractId: '1', reimbursementNo: 'RB20260420001', applicant: '张三', category: '交通费', amount: 1200, leadName: '阿里巴巴-企业管理系统', date: '2026-04-20' },
];

// ─── Outsource cost (外包成本) ───────────────────────────────────────────────

export interface OutsourceCostRecord {
  id: string;
  contractId: string;
  vendor: string;
  project: string;
  amount: number;
  date: string;
  remark: string;
}

export const mockOutsourceCosts: OutsourceCostRecord[] = [
  { id: 'out-1', contractId: '1', vendor: '北京外包科技有限公司', project: 'A公司CRM系统开发', amount: 120000, date: '2026-04-15', remark: '前端驻场开发' },
  { id: 'out-2', contractId: '2', vendor: '深圳云启服务有限公司', project: '云服务平台建设', amount: 180000, date: '2026-04-10', remark: '云平台实施服务' },
];

// ─── Other cost (其他成本) ───────────────────────────────────────────────────

export interface OtherCostRecord {
  id: string;
  contractId: string;
  category: string;
  name: string;
  amount: number;
  date: string;
  remark: string;
}

export const mockOtherCosts: OtherCostRecord[] = [
  { id: 'oth-1', contractId: '1', category: '软件授权', name: '测试环境授权费', amount: 15000, date: '2026-04-20', remark: '' },
  { id: 'oth-2', contractId: '3', category: '培训', name: '团队技术培训', amount: 8000, date: '2026-04-25', remark: '协作工具技术培训' },
];

// ─── Operating cost (运营成本) ───────────────────────────────────────────────

export const mockMonthlyOpExpenses: Record<string, number> = {
  '2026-05': 44000,
  '2026-04': 48400,
  '2026-03': 49400,
};

export const ACTIVE_EMPLOYEE_COUNT = 5;

export function getHourlyOpCost(month: string): number {
  const total = mockMonthlyOpExpenses[month] || 0;
  if (total === 0 || ACTIVE_EMPLOYEE_COUNT === 0) return 0;
  return total / ACTIVE_EMPLOYEE_COUNT / STANDARD_MONTHLY_HOURS;
}

// ─── Cost calculation ────────────────────────────────────────────────────────

export interface RDCostDetail {
  employeeName: string;
  position: string;
  projectName: string;
  hours: number;
  hourlyRate: number;
  cost: number;
}

export interface OpCostDetail {
  employeeName: string;
  hours: number;
  hourlyOpCost: number;
  cost: number;
}

export function buildRDCostDetails(
  contractId: string,
  month: string,
  salaryData: MonthlySalaryRecord[],
  useActual: boolean
): RDCostDetail[] {
  const projectIds = contractProjectMap[contractId] || [];
  const salary = getSalaryForMonth(month, salaryData);
  const reports: ProjectDailyReport[] = mockDailyReports.filter(
    (r) => projectIds.includes(r.projectId) && r.date.startsWith(month)
  );

  const grouped = new Map<string, { hours: number; projectName: string; position: string }>();
  for (const r of reports) {
    const key = `${r.personName}||${r.projectName}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.hours += r.hours;
    } else {
      grouped.set(key, { hours: r.hours, projectName: r.projectName, position: r.position });
    }
  }

  const details: RDCostDetail[] = [];
  for (const [key, value] of grouped) {
    const employeeName = key.split('||')[0];
    const salaryRecord = salary.find((s) => s.employeeName === employeeName);
    const hourlyRate = salaryRecord ? getHourlyRate(salaryRecord, useActual) : 0;
    details.push({
      employeeName,
      position: value.position,
      projectName: value.projectName,
      hours: value.hours,
      hourlyRate,
      cost: Number((value.hours * hourlyRate).toFixed(2)),
    });
  }
  return details;
}

export function buildOpCostDetails(
  contractId: string,
  month: string
): OpCostDetail[] {
  const projectIds = contractProjectMap[contractId] || [];
  const reports: ProjectDailyReport[] = mockDailyReports.filter(
    (r) => projectIds.includes(r.projectId) && r.date.startsWith(month)
  );
  const hourlyOpCost = getHourlyOpCost(month);

  const grouped = new Map<string, number>();
  for (const r of reports) {
    grouped.set(r.personName, (grouped.get(r.personName) || 0) + r.hours);
  }

  return Array.from(grouped).map(([employeeName, hours]) => ({
    employeeName,
    hours,
    hourlyOpCost,
    cost: Number((hours * hourlyOpCost).toFixed(2)),
  }));
}

export function hasActualData(month: string, salaryData: MonthlySalaryRecord[]): boolean {
  const records = salaryData.filter((r) => r.month === month);
  return records.some((r) => r.actualSalary != null && r.actualHours != null);
}
```

- [ ] **Step 2: Add contractId to project mock data**

In `src/app/pages/project-management/mockData.ts`, add `contractId` field to the `Project` interface and each project in `initialProjects`.

Add to `Project` interface after `backendUsers: string[];`:

```ts
  contractId?: string;
```

Add to each project in `initialProjects`:
- Project id '1' (A公司CRM系统开发): `contractId: '4',`
- Project id '2' (云服务平台建设): `contractId: '2',`
- Project id '3' (协作工具定制开发): `contractId: '3',`

- [ ] **Step 3: Verify build**

Run:

```bash
npm run build --prefix HubX
```

Expected: build completes successfully.

---

### Task 2: Create salary page

**Files:**
- Create: `src/app/pages/contract-cost/SalaryPage.tsx`

- [ ] **Step 1: Create the salary page component**

Create `src/app/pages/contract-cost/SalaryPage.tsx` with this content:

```tsx
import { useState } from 'react';
import { Button, Card, Message, Modal, Select, Table, Tag, Typography, Upload } from '@arco-design/web-react';
import { IconUpload } from '@arco-design/web-react/icon';
import {
  contractCostPermissions,
  getHourlyRate,
  getSalaryForMonth,
  mockSalaryData,
  type MonthlySalaryRecord,
} from './contractCostData';

const { Title, Text } = Typography;

const MONTHS = ['2026-05', '2026-04', '2026-03', '2026-02', '2026-01'];

export function SalaryPage() {
  const [month, setMonth] = useState('2026-05');
  const [uploadType, setUploadType] = useState<'salary' | 'hours'>('salary');
  const [uploadVisible, setUploadVisible] = useState(false);

  const records = getSalaryForMonth(month, mockSalaryData);
  const canViewSalary = contractCostPermissions.salaryView;
  const canEdit = contractCostPermissions.salaryEdit;

  const mask = (value: number | undefined) => {
    if (!canViewSalary) return '***';
    return value != null ? `¥${value.toLocaleString()}` : '-';
  };

  const maskRate = (record: MonthlySalaryRecord, useActual: boolean) => {
    if (!canViewSalary) return '***';
    const rate = getHourlyRate(record, useActual);
    return rate > 0 ? `¥${rate.toFixed(2)}` : '-';
  };

  const columns = [
    { title: '员工姓名', dataIndex: 'employeeName', width: 100 },
    { title: '部门', dataIndex: 'department', width: 100 },
    { title: '职位', dataIndex: 'position', width: 120 },
    { title: '名义月工资', dataIndex: 'nominalSalary', width: 120, render: (v: number) => mask(v) },
    { title: '名义月工时', dataIndex: 'nominalHours', width: 110 },
    { title: '名义时薪', width: 100, render: (_: unknown, r: MonthlySalaryRecord) => maskRate(r, false) },
    { title: '实际月工资', dataIndex: 'actualSalary', width: 120, render: (v: number | undefined) => mask(v) },
    { title: '实际月工时', dataIndex: 'actualHours', width: 110, render: (v: number | undefined) => v ?? '-' },
    { title: '实际时薪', width: 100, render: (_: unknown, r: MonthlySalaryRecord) => maskRate(r, true) },
    {
      title: '状态',
      width: 100,
      render: (_: unknown, r: MonthlySalaryRecord) =>
        r.inherited ? <Tag color="orangered">沿用上月</Tag> : <Tag color="green">已录入</Tag>,
    },
  ];

  if (!contractCostPermissions.salaryView) {
    return <Card><Text>暂无权限查看工资表</Text></Card>;
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <Title heading={4} style={{ margin: 0 }}>工资表</Title>
        <div className="flex items-center gap-3">
          <Select value={month} onChange={setMonth} style={{ width: 140 }}>
            {MONTHS.map((m) => (
              <Select.Option key={m} value={m}>{m}</Select.Option>
            ))}
          </Select>
          {canEdit && (
            <>
              <Button icon={<IconUpload />} onClick={() => { setUploadType('salary'); setUploadVisible(true); }}>
                导入工资
              </Button>
              <Button icon={<IconUpload />} onClick={() => { setUploadType('hours'); setUploadVisible(true); }}>
                导入实际工时
              </Button>
            </>
          )}
        </div>
      </div>
      <Card bordered={false}>
        <Table columns={columns} data={records} rowKey={(r) => `${r.employeeId}-${r.month}`} pagination={false} scroll={{ x: 1100 }} />
      </Card>
      <Modal
        title={uploadType === 'salary' ? '导入工资' : '导入实际工时'}
        visible={uploadVisible}
        onCancel={() => setUploadVisible(false)}
        onOk={() => { Message.success('导入功能将在后续版本上线'); setUploadVisible(false); }}
        autoFocus={false}
        focusLock
        style={{ width: 520 }}
      >
        <Upload drag accept=".xlsx,.xls,.csv" beforeUpload={() => false}>
          点击或拖拽文件到此处上传
        </Upload>
        <div style={{ marginTop: 12, color: 'var(--color-text-3)', fontSize: 13 }}>
          支持 .xlsx、.xls、.csv 格式。原型阶段仅展示界面，不做真实解析。
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run:

```bash
npm run build --prefix HubX
```

Expected: build completes successfully.

---

### Task 3: Create contract cost detail page

**Files:**
- Create: `src/app/pages/contract-cost/ContractCostDetail.tsx`

- [ ] **Step 1: Create the contract cost detail page component**

Create `src/app/pages/contract-cost/ContractCostDetail.tsx` with this content:

```tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Breadcrumb, Button, Card, Empty, Table, Tabs, Tag, Typography } from '@arco-design/web-react';
import { IconLeft } from '@arco-design/web-react/icon';
import {
  buildOpCostDetails,
  buildRDCostDetails,
  contractCostPermissions,
  contractNames,
  contractProjectMap,
  getHourlyOpCost,
  hasActualData,
  mockBusinessCosts,
  mockOtherCosts,
  mockOutsourceCosts,
  mockSalaryData,
  ACTIVE_EMPLOYEE_COUNT,
  mockMonthlyOpExpenses,
  STANDARD_MONTHLY_HOURS,
  type RDCostDetail,
} from './contractCostData';

const { Title, Text } = Typography;
const TabPane = Tabs.TabPane;

function SummaryCard({ label, value, tag, color }: { label: string; value: string; tag?: string; color: string }) {
  return (
    <div style={{
      padding: '16px 20px',
      border: '1px solid var(--color-border-2)',
      borderRadius: 8,
      background: '#fff',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-1)' }}>{value}</div>
      {tag && <Tag size="small" style={{ marginTop: 6 }} color={tag === '实际' ? 'green' : 'orangered'}>{tag}</Tag>}
    </div>
  );
}

export function ContractCostDetail() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const [month] = useState('2026-05');

  const id = contractId || '1';
  const name = contractNames[id] || '未知合同';
  const projectIds = contractProjectMap[id] || [];
  const useActual = hasActualData(month, mockSalaryData);
  const canSeeDetail = contractCostPermissions.contractCostDetail;

  const rdDetails = buildRDCostDetails(id, month, mockSalaryData, useActual);
  const bizCosts = mockBusinessCosts.filter((r) => r.contractId === id);
  const outCosts = mockOutsourceCosts.filter((r) => r.contractId === id);
  const othCosts = mockOtherCosts.filter((r) => r.contractId === id);
  const opDetails = buildOpCostDetails(id, month);

  const rdTotal = rdDetails.reduce((s, r) => s + r.cost, 0);
  const bizTotal = bizCosts.reduce((s, r) => s + r.amount, 0);
  const outTotal = outCosts.reduce((s, r) => s + r.amount, 0);
  const othTotal = othCosts.reduce((s, r) => s + r.amount, 0);
  const opTotal = opDetails.reduce((s, r) => s + r.cost, 0);

  const fmt = (n: number) => `¥${n.toLocaleString()}`;
  const maskFmt = (n: number) => canSeeDetail ? fmt(n) : '***';

  const rdColumns = [
    { title: '员工姓名', dataIndex: 'employeeName', width: 100 },
    { title: '职位', dataIndex: 'position', width: 120 },
    { title: '关联项目', dataIndex: 'projectName', width: 200 },
    { title: '投入工时', dataIndex: 'hours', width: 100 },
    { title: '时薪', dataIndex: 'hourlyRate', width: 120, render: (v: number) => maskFmt(v) },
    { title: '小计金额', dataIndex: 'cost', width: 130, render: (v: number) => <Text style={{ fontWeight: 600 }}>{maskFmt(v)}</Text> },
  ];

  const bizColumns = [
    { title: '报销单号', dataIndex: 'reimbursementNo', width: 160 },
    { title: '报销人', dataIndex: 'applicant', width: 100 },
    { title: '费用类型', dataIndex: 'category', width: 120, render: (v: string) => <Tag color="cyan">{v}</Tag> },
    { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => fmt(v) },
    { title: '关联线索', dataIndex: 'leadName', width: 200 },
    { title: '日期', dataIndex: 'date', width: 120 },
  ];

  const outColumns = [
    { title: '供应商', dataIndex: 'vendor', width: 200 },
    { title: '项目', dataIndex: 'project', width: 200 },
    { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => fmt(v) },
    { title: '日期', dataIndex: 'date', width: 120 },
    { title: '备注', dataIndex: 'remark' },
  ];

  const othColumns = [
    { title: '类别', dataIndex: 'category', width: 120, render: (v: string) => <Tag color="arcoblue">{v}</Tag> },
    { title: '名称', dataIndex: 'name', width: 200 },
    { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => fmt(v) },
    { title: '日期', dataIndex: 'date', width: 120 },
    { title: '备注', dataIndex: 'remark' },
  ];

  const opColumns = [
    { title: '员工姓名', dataIndex: 'employeeName', width: 120 },
    { title: '投入工时', dataIndex: 'hours', width: 100 },
    { title: '每小时运营成本', dataIndex: 'hourlyOpCost', width: 150, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '分摊金额', dataIndex: 'cost', width: 130, render: (v: number) => <Text style={{ fontWeight: 600 }}>{fmt(v)}</Text> },
  ];

  if (projectIds.length === 0) {
    return (
      <div>
        <Breadcrumb style={{ marginBottom: 16 }}>
          <Breadcrumb.Item><a onClick={() => navigate('/finance/dashboard')}>财务统计</a></Breadcrumb.Item>
          <Breadcrumb.Item>合同成本明细</Breadcrumb.Item>
          <Breadcrumb.Item>{name}</Breadcrumb.Item>
        </Breadcrumb>
        <Card><Empty description="该合同未关联项目" /></Card>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item><a onClick={() => navigate('/finance/dashboard')}>财务统计</a></Breadcrumb.Item>
        <Breadcrumb.Item>合同成本明细</Breadcrumb.Item>
        <Breadcrumb.Item>{name}</Breadcrumb.Item>
      </Breadcrumb>

      <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
        <Button icon={<IconLeft />} size="small" onClick={() => navigate('/finance/dashboard')} />
        <Title heading={4} style={{ margin: 0 }}>{name} - 成本明细</Title>
        <Tag color={useActual ? 'green' : 'orangered'}>{useActual ? '实际' : '名义估算'}</Tag>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        <SummaryCard label="科研成本" value={canSeeDetail ? fmt(rdTotal) : '***'} tag={useActual ? '实际' : '名义估算'} color="#165dff" />
        <SummaryCard label="商务成本" value={fmt(bizTotal)} color="#0fc6c2" />
        <SummaryCard label="外包成本" value={fmt(outTotal)} color="#ff7d00" />
        <SummaryCard label="其他成本" value={fmt(othTotal)} color="#7816ff" />
        <SummaryCard label="分摊运营成本" value={fmt(opTotal)} color="#f53f3f" />
      </div>

      <Card bordered={false}>
        <Tabs defaultActiveTab="rd" type="card-gutter">
          <TabPane key="rd" title="科研成本">
            <div style={{ marginBottom: 12, color: 'var(--color-text-3)', fontSize: 13 }}>
              当前使用{useActual ? '实际' : '名义'}时薪计算
            </div>
            <Table columns={rdColumns} data={rdDetails} rowKey={(r: RDCostDetail) => `${r.employeeName}-${r.projectName}`} pagination={false}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={5} style={{ textAlign: 'right', fontWeight: 600 }}>合计</Table.Summary.Cell>
                    <Table.Summary.Cell style={{ fontWeight: 600 }}>{maskFmt(rdTotal)}</Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </TabPane>
          <TabPane key="biz" title="商务成本">
            <Table columns={bizColumns} data={bizCosts} rowKey="id" pagination={false}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>合计</Table.Summary.Cell>
                    <Table.Summary.Cell style={{ fontWeight: 600 }}>{fmt(bizTotal)}</Table.Summary.Cell>
                    <Table.Summary.Cell colSpan={2} />
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </TabPane>
          <TabPane key="out" title="外包成本">
            <Table columns={outColumns} data={outCosts} rowKey="id" pagination={false}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={2} style={{ textAlign: 'right', fontWeight: 600 }}>合计</Table.Summary.Cell>
                    <Table.Summary.Cell style={{ fontWeight: 600 }}>{fmt(outTotal)}</Table.Summary.Cell>
                    <Table.Summary.Cell colSpan={2} />
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </TabPane>
          <TabPane key="oth" title="其他成本">
            <Table columns={othColumns} data={othCosts} rowKey="id" pagination={false}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={2} style={{ textAlign: 'right', fontWeight: 600 }}>合计</Table.Summary.Cell>
                    <Table.Summary.Cell style={{ fontWeight: 600 }}>{fmt(othTotal)}</Table.Summary.Cell>
                    <Table.Summary.Cell colSpan={2} />
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </TabPane>
          <TabPane key="op" title="分摊运营成本">
            <div style={{ marginBottom: 16, padding: 16, background: 'var(--color-fill-1)', borderRadius: 8, fontSize: 13 }}>
              <div>当月运营总费用：¥{(mockMonthlyOpExpenses[month] || 0).toLocaleString()}</div>
              <div>在职员工总数：{ACTIVE_EMPLOYEE_COUNT} 人</div>
              <div>标准月工时：{STANDARD_MONTHLY_HOURS} 小时</div>
              <div>每小时运营成本：¥{getHourlyOpCost(month).toFixed(2)}</div>
            </div>
            <Table columns={opColumns} data={opDetails} rowKey="employeeName" pagination={false}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>合计</Table.Summary.Cell>
                    <Table.Summary.Cell style={{ fontWeight: 600 }}>{fmt(opTotal)}</Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run:

```bash
npm run build --prefix HubX
```

Expected: build completes successfully.

---

### Task 4: Wire routes and sidebar menu

**Files:**
- Modify: `src/app/routes.tsx`
- Modify: `src/app/components/MainLayout.tsx`

- [ ] **Step 1: Add route imports and entries**

In `src/app/routes.tsx`, add imports after the existing lead-cost imports:

```ts
import { SalaryPage } from "./pages/contract-cost/SalaryPage";
import { ContractCostDetail } from "./pages/contract-cost/ContractCostDetail";
```

In the route children, after `{ path: "finance/dashboard", Component: FinancialDashboard },`, add:

```ts
      { path: "finance/salary", Component: SalaryPage },
      { path: "finance/contract-cost/:contractId", Component: ContractCostDetail },
```

- [ ] **Step 2: Add sidebar menu entry**

In `src/app/components/MainLayout.tsx`, in the finance menu children, after `{ key: '/finance/dashboard', label: '财务统计' },`, add:

```ts
        { key: '/finance/salary', label: '工资表' },
```

- [ ] **Step 3: Verify build**

Run:

```bash
npm run build --prefix HubX
```

Expected: build completes successfully.

---

### Task 5: Make contract names clickable in FinancialDashboard

**Files:**
- Modify: `src/app/pages/FinancialDashboard.tsx`

- [ ] **Step 1: Add navigation import**

Add `useNavigate` to the existing react-router import in `FinancialDashboard.tsx`:

```ts
import { useNavigate } from 'react-router';
```

- [ ] **Step 2: Add navigate hook and permission import**

Inside `FinancialDashboard()` function, after the existing state declarations, add:

```ts
  const navigate = useNavigate();
```

At the top of the file, add this import:

```ts
import { contractCostPermissions } from './contract-cost/contractCostData';
```

- [ ] **Step 3: Update contract name column render**

In the `contractColumns` array, change the `name` column render from:

```tsx
render: (v: string) => <a style={{ color: 'rgb(var(--primary-6))' }}>{v}</a>
```

to:

```tsx
render: (v: string, record: any) => contractCostPermissions.contractCostView
  ? <a style={{ color: 'rgb(var(--primary-6))', cursor: 'pointer' }} onClick={() => navigate(`/finance/contract-cost/${record.key}`)}>{v}</a>
  : <span>{v}</span>
```

- [ ] **Step 4: Verify build**

Run:

```bash
npm run build --prefix HubX
```

Expected: build completes successfully.

---

### Task 6: Add finance permissions to permission tree

**Files:**
- Modify: `src/app/pages/UserPermission.tsx`

- [ ] **Step 1: Add finance permission node**

In `src/app/pages/UserPermission.tsx`, find the `mockPermissionTree` array (around line 109). After the last top-level node (project management), add:

```ts
  {
    key: 'finance',
    title: '财务管理',
    children: [
      { key: 'finance-salary-view', title: '查看工资表' },
      { key: 'finance-salary-edit', title: '编辑/导入工资和实际工时' },
      { key: 'finance-contract-cost-view', title: '查看合同成本明细' },
      { key: 'finance-contract-cost-detail', title: '查看人员薪资数字' },
    ],
  },
```

- [ ] **Step 2: Verify build**

Run:

```bash
npm run build --prefix HubX
```

Expected: build completes successfully.

---

### Task 7: Add employee leaveDate to Organization mock data

**Files:**
- Modify: `src/app/pages/Organization.tsx`

- [ ] **Step 1: Add leaveDate field to mock employees**

In `src/app/pages/Organization.tsx`, find the `mockEmployees` array (around line 65). Add a `leaveDate` field to each employee. For currently active employees, set it to empty string or omit. Example:

For employee id '1' (张三), add after `hireDate: '2020-01-01',`:
```ts
    leaveDate: '',
```

Do the same for all 5 employees. All are currently active so all get empty string.

- [ ] **Step 2: Verify build**

Run:

```bash
npm run build --prefix HubX
```

Expected: build completes successfully.

---

### Task 8: Final build and manual UI verification

**Files:**
- No code changes unless verification reveals a defect.

- [ ] **Step 1: Full build verification**

Run:

```bash
npm run build --prefix HubX
```

Expected: build completes with no errors.

- [ ] **Step 2: Start dev server**

Run:

```bash
npm run dev --prefix HubX -- --host 0.0.0.0
```

- [ ] **Step 3: Verify salary page**

Open `/finance/salary` and verify:
- 页面标题"工资表"
- 月份选择器可切换
- 表格显示名义和实际工资/工时/时薪
- "导入工资"和"导入实际工时"按钮弹出上传占位弹窗
- 沿用上月时显示"沿用上月"标签

- [ ] **Step 4: Verify contract cost detail page**

Open `/finance/dashboard`, click a contract name, verify:
- 跳转到合同成本明细页面
- 面包屑导航正确
- 5 张概览卡片显示金额
- 5 个 Tab 各自显示明细表和合计行
- 分摊运营成本 Tab 显示计算过程

- [ ] **Step 5: Verify permission tree**

Open `/system/permission`, click role "权限配置", verify:
- 权限树中有"财务管理"节点
- 下面有 4 个子权限

---

## Self-Review

- **Spec coverage:** 工资表（Task 1+2）、合同↔项目关联（Task 1）、员工 leaveDate（Task 7）、合同统计改造（Task 5）、合同成本明细页（Task 3）、权限设计（Task 6）、路由和菜单（Task 4）、验证（Task 8）。全部覆盖。
- **Placeholder scan:** 所有步骤包含完整代码块，无 TBD/TODO。
- **Type consistency:** `MonthlySalaryRecord`、`RDCostDetail`、`OpCostDetail`、`BusinessCostRecord`、`OutsourceCostRecord`、`OtherCostRecord`、`ContractCostPermissions` 在 Task 1 定义，Task 2 和 Task 3 中引用一致。`contractProjectMap`、`contractNames` 在 Task 1 定义，Task 3 和 Task 5 中引用一致。
