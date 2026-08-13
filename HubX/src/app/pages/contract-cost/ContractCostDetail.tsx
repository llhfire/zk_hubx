import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Breadcrumb,
  Button,
  Card,
  Empty,
  Table,
  Tabs,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { IconLeft } from '@arco-design/web-react/icon';
import {
  buildRDCostDetails,
  buildOpCostDetails,
  hasActualData,
  contractCostPermissions,
  contractNames,
  contractProjectMap,
  mockBusinessCosts,
  mockOutsourceCosts,
  mockOtherCosts,
  mockSalaryData,
  getHourlyOpCost,
  mockMonthlyOpExpenses,
  ACTIVE_EMPLOYEE_COUNT,
  STANDARD_MONTHLY_HOURS,
  type RDCostDetail,
  type BusinessCostRecord,
  type OutsourceCostRecord,
  type OtherCostRecord,
  type OpCostDetail,
} from './contractCostData';

const { Title, Text } = Typography;
const TabPane = Tabs.TabPane;
const BreadcrumbItem = Breadcrumb.Item;

const CURRENT_MONTH = '2026-05';

function fmt(value: number): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ContractCostDetail() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('rd');

  const cid = contractId ?? '';
  const contractName = contractNames[cid] ?? `合同${cid}`;
  const projectIds = contractProjectMap[cid] ?? [];
  const hasProjects = projectIds.length > 0;

  const useActual = hasActualData(CURRENT_MONTH, mockSalaryData);
  const canViewDetail = contractCostPermissions.contractCostDetail;

  // ─── 数据构建 ──────────────────────────────────────────────
  const rdDetails = hasProjects
    ? buildRDCostDetails(cid, CURRENT_MONTH, mockSalaryData, useActual)
    : [];
  const bizDetails = mockBusinessCosts.filter((r) => r.contractId === cid && r.month === CURRENT_MONTH);
  const outsourceDetails = mockOutsourceCosts.filter((r) => r.contractId === cid && r.month === CURRENT_MONTH);
  const otherDetails = mockOtherCosts.filter((r) => r.contractId === cid && r.month === CURRENT_MONTH);
  const opDetails = hasProjects ? buildOpCostDetails(cid, CURRENT_MONTH) : [];

  const rdTotal = rdDetails.reduce((s, r) => s + r.cost, 0);
  const bizTotal = bizDetails.reduce((s, r) => s + r.amount, 0);
  const outsourceTotal = outsourceDetails.reduce((s, r) => s + r.amount, 0);
  const otherTotal = otherDetails.reduce((s, r) => s + r.amount, 0);
  const opTotal = opDetails.reduce((s, r) => s + r.cost, 0);

  // ─── 运营费用计算参数 ─────────────────────────────────────
  const monthlyOpExpense = mockMonthlyOpExpenses[CURRENT_MONTH] ?? 0;
  const hourlyOpCost = getHourlyOpCost(CURRENT_MONTH);

  // ─── 科研成本表格列 ───────────────────────────────────────
  const rdColumns = [
    { title: '员工', dataIndex: 'employeeName', width: 100 },
    { title: '职位', dataIndex: 'position', width: 140 },
    { title: '工时(h)', dataIndex: 'hours', width: 100 },
    {
      title: '时薪(元/h)',
      dataIndex: 'hourlyRate',
      width: 120,
      render: (value: number) => (canViewDetail ? fmt(value) : '***'),
    },
    {
      title: '金额(元)',
      dataIndex: 'cost',
      width: 120,
      render: (value: number) => (canViewDetail ? fmt(value) : '***'),
    },
  ];

  // ─── 商务成本表格列 ───────────────────────────────────────
  const bizColumns = [
    { title: '类别', dataIndex: 'category', width: 120 },
    { title: '说明', dataIndex: 'description' },
    { title: '金额(元)', dataIndex: 'amount', width: 120, render: (v: number) => fmt(v) },
  ];

  // ─── 外包成本表格列 ───────────────────────────────────────
  const outsourceColumns = [
    { title: '供应商', dataIndex: 'vendorName', width: 140 },
    { title: '说明', dataIndex: 'description' },
    { title: '金额(元)', dataIndex: 'amount', width: 120, render: (v: number) => fmt(v) },
  ];

  // ─── 其他成本表格列 ───────────────────────────────────────
  const otherColumns = [
    { title: '类别', dataIndex: 'category', width: 120 },
    { title: '说明', dataIndex: 'description' },
    { title: '金额(元)', dataIndex: 'amount', width: 120, render: (v: number) => fmt(v) },
  ];

  // ─── 运营分摊表格列 ───────────────────────────────────────
  const opColumns = [
    { title: '员工', dataIndex: 'employeeName', width: 100 },
    { title: '职位', dataIndex: 'position', width: 140 },
    { title: '工时(h)', dataIndex: 'hours', width: 100 },
    {
      title: '每小时运营成本(元/h)',
      dataIndex: 'hourlyOpCost',
      width: 160,
      render: (v: number) => fmt(v),
    },
    { title: '金额(元)', dataIndex: 'cost', width: 120, render: (v: number) => fmt(v) },
  ];

  // ─── 概览卡片数据 ────────────────────────────────────────
  const summaryCards = [
    { label: '科研成本', value: rdTotal, color: '#165dff' },
    { label: '商务成本', value: bizTotal, color: '#0fc6c2' },
    { label: '外包成本', value: outsourceTotal, color: '#ff7d00' },
    { label: '其他成本', value: otherTotal, color: '#7816ff' },
    { label: '分摊运营成本', value: opTotal, color: '#f53f3f' },
  ];

  // ─── 合计行渲染 ──────────────────────────────────────────
  function renderRDSummary() {
    if (rdDetails.length === 0) return null;
    const totalHours = rdDetails.reduce((s, r) => s + r.hours, 0);
    return (
      <div style={{ textAlign: 'right', padding: '8px 16px', fontWeight: 600 }}>
        合计：工时 {totalHours}h，金额 {canViewDetail ? `¥${fmt(rdTotal)}` : '***'}
      </div>
    );
  }

  function renderAmountSummary(total: number) {
    return (
      <div style={{ textAlign: 'right', padding: '8px 16px', fontWeight: 600 }}>
        合计：¥{fmt(total)}
      </div>
    );
  }

  function renderOpSummary() {
    if (opDetails.length === 0) return null;
    const totalHours = opDetails.reduce((s, r) => s + r.hours, 0);
    return (
      <div style={{ textAlign: 'right', padding: '8px 16px', fontWeight: 600 }}>
        合计：工时 {totalHours}h，金额 ¥{fmt(opTotal)}
      </div>
    );
  }

  // ─── 无项目关联 ──────────────────────────────────────────
  if (!hasProjects) {
    return (
      <div>
        <Breadcrumb style={{ marginBottom: 16 }}>
          <BreadcrumbItem>财务统计</BreadcrumbItem>
          <BreadcrumbItem>合同成本明细</BreadcrumbItem>
          <BreadcrumbItem>{contractName}</BreadcrumbItem>
        </Breadcrumb>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Button icon={<IconLeft />} onClick={() => navigate(-1)} />
          <Title heading={4} style={{ margin: 0 }}>{contractName} - 成本明细</Title>
        </div>

        <Card>
          <Empty description="该合同未关联项目" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* ── 面包屑 ── */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <BreadcrumbItem>财务统计</BreadcrumbItem>
        <BreadcrumbItem>合同成本明细</BreadcrumbItem>
        <BreadcrumbItem>{contractName}</BreadcrumbItem>
      </Breadcrumb>

      {/* ── 标题行 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button icon={<IconLeft />} onClick={() => navigate(-1)} />
        <Title heading={4} style={{ margin: 0 }}>
          {contractName} - 成本明细
        </Title>
        <Tag color={useActual ? 'green' : 'blue'}>
          {useActual ? '实际' : '名义'}
        </Tag>
      </div>

      {/* ── 5 张概览卡片 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        {summaryCards.map((card) => (
          <Card key={card.label} style={{ textAlign: 'center' }}>
            <Text style={{ color: 'var(--color-text-3)', fontSize: 13 }}>{card.label}</Text>
            <div style={{ fontSize: 22, fontWeight: 600, color: card.color, marginTop: 8 }}>
              ¥{fmt(card.value)}
            </div>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Card>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          {/* ── 科研成本 ── */}
          <TabPane key="rd" title="科研成本">
            <Table<RDCostDetail>
              columns={rdColumns}
              data={rdDetails}
              rowKey="employeeId"
              pagination={false}
              scroll={{ x: 580 }}
            />
            {renderRDSummary()}
          </TabPane>

          {/* ── 商务成本 ── */}
          <TabPane key="biz" title="商务成本">
            <Table<BusinessCostRecord>
              columns={bizColumns}
              data={bizDetails}
              rowKey="id"
              pagination={false}
            />
            {bizDetails.length > 0 && renderAmountSummary(bizTotal)}
          </TabPane>

          {/* ── 外包成本 ── */}
          <TabPane key="outsource" title="外包成本">
            <Table<OutsourceCostRecord>
              columns={outsourceColumns}
              data={outsourceDetails}
              rowKey="id"
              pagination={false}
            />
            {outsourceDetails.length > 0 && renderAmountSummary(outsourceTotal)}
          </TabPane>

          {/* ── 其他成本 ── */}
          <TabPane key="other" title="其他成本">
            <Table<OtherCostRecord>
              columns={otherColumns}
              data={otherDetails}
              rowKey="id"
              pagination={false}
            />
            {otherDetails.length > 0 && renderAmountSummary(otherTotal)}
          </TabPane>

          {/* ── 分摊运营成本 ── */}
          <TabPane key="op" title="分摊运营成本">
            {/* 计算过程展示 */}
            <Card
              style={{ marginBottom: 16, backgroundColor: 'var(--color-fill-1)' }}
              bordered={false}
            >
              <Title heading={6} style={{ marginTop: 0, marginBottom: 12 }}>运营成本分摊计算</Title>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <div>
                  <Text style={{ color: 'var(--color-text-3)', fontSize: 13 }}>
                    {CURRENT_MONTH} 运营总费用
                  </Text>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>¥{fmt(monthlyOpExpense)}</div>
                </div>
                <div>
                  <Text style={{ color: 'var(--color-text-3)', fontSize: 13 }}>在职员工数</Text>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{ACTIVE_EMPLOYEE_COUNT} 人</div>
                </div>
                <div>
                  <Text style={{ color: 'var(--color-text-3)', fontSize: 13 }}>标准月工时</Text>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{STANDARD_MONTHLY_HOURS} h</div>
                </div>
                <div>
                  <Text style={{ color: 'var(--color-text-3)', fontSize: 13 }}>每小时运营成本</Text>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#f53f3f' }}>
                    ¥{fmt(hourlyOpCost)}/h
                  </div>
                </div>
              </div>
              <Text style={{ color: 'var(--color-text-3)', fontSize: 12, marginTop: 8, display: 'block' }}>
                计算公式：每小时运营成本 = 运营总费用 ÷ 在职员工数 ÷ 标准月工时
                = ¥{fmt(monthlyOpExpense)} ÷ {ACTIVE_EMPLOYEE_COUNT} ÷ {STANDARD_MONTHLY_HOURS}
                = ¥{fmt(hourlyOpCost)}/h
              </Text>
            </Card>

            <Table<OpCostDetail>
              columns={opColumns}
              data={opDetails}
              rowKey="employeeName"
              pagination={false}
              scroll={{ x: 620 }}
            />
            {renderOpSummary()}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
