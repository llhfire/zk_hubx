import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Tabs, Typography } from '@/design-system';
import {
  DataTable,
  DetailHeader,
  EmptyState,
  MetricGrid,
  MoneyText,
  PageShell,
  SectionTabs,
  SectionCard,
  StatusTag,
  type StatusMap,
} from '@/design-system';
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
  getHourlyOpSnapshot,
  type RDCostDetail,
  type BusinessCostRecord,
  type OutsourceCostRecord,
  type OtherCostRecord,
  type OpCostDetail,
} from './contractCostData';

const { Title, Text } = Typography;
const TabPane = Tabs.TabPane;

const CURRENT_MONTH = '2026-05';

const DATA_MODE_STATUS: StatusMap<'actual' | 'nominal'> = {
  actual: { label: '实际', tone: 'success' },
  nominal: { label: '名义', tone: 'info' },
};

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
  const directDetails = mockBusinessCosts.filter((r) => r.contractId === cid && r.month === CURRENT_MONTH);
  const travelDetails = directDetails.filter((r) => r.costCategory === 'travel');
  const bizDetails = directDetails.filter((r) => r.costCategory === 'commercial');
  const outsourceDetails = mockOutsourceCosts.filter((r) => r.contractId === cid && r.month === CURRENT_MONTH);
  const otherDetails = mockOtherCosts.filter((r) => r.contractId === cid && r.month === CURRENT_MONTH);
  const opDetails = hasProjects ? buildOpCostDetails(cid, CURRENT_MONTH) : [];

  const rdTotal = rdDetails.reduce((s, r) => s + r.cost, 0);
  const travelTotal = travelDetails.reduce((s, r) => s + r.amount, 0);
  const bizTotal = bizDetails.reduce((s, r) => s + r.amount, 0);
  const outsourceTotal = outsourceDetails.reduce((s, r) => s + r.amount, 0);
  const otherTotal = otherDetails.reduce((s, r) => s + r.amount, 0);
  const opTotal = opDetails.reduce((s, r) => s + r.cost, 0);

  // ─── 运营费用计算参数 ─────────────────────────────────────
  const overheadSnapshot = getHourlyOpSnapshot(CURRENT_MONTH);
  const hourlyOpCost = overheadSnapshot.rate;

  // ─── 科研成本表格列 ───────────────────────────────────────
  const rdColumns = [
    { title: '员工', dataIndex: 'employeeName', width: 100 },
    { title: '职位', dataIndex: 'position', width: 140 },
    { title: '工时(h)', dataIndex: 'hours', width: 100 },
    {
      title: '时薪(元/h)',
      dataIndex: 'hourlyRate',
      width: 120,
      render: (value: number) => (canViewDetail ? <MoneyText value={value} fractionDigits={2} /> : '***'),
    },
    {
      title: '金额(元)',
      dataIndex: 'cost',
      width: 120,
      render: (value: number) => (canViewDetail ? <MoneyText value={value} fractionDigits={2} /> : '***'),
    },
  ];

  // ─── 商务成本表格列 ───────────────────────────────────────
  const bizColumns = [
    { title: '类别', dataIndex: 'category', width: 120 },
    { title: '说明', dataIndex: 'description' },
    { title: '金额(元)', dataIndex: 'amount', width: 120, render: (v: number) => <MoneyText value={v} fractionDigits={2} /> },
  ];

  // ─── 外包成本表格列 ───────────────────────────────────────
  const outsourceColumns = [
    { title: '供应商', dataIndex: 'vendorName', width: 140 },
    { title: '说明', dataIndex: 'description' },
    { title: '金额(元)', dataIndex: 'amount', width: 120, render: (v: number) => <MoneyText value={v} fractionDigits={2} /> },
  ];

  // ─── 其他成本表格列 ───────────────────────────────────────
  const otherColumns = [
    { title: '类别', dataIndex: 'category', width: 120 },
    { title: '说明', dataIndex: 'description' },
    { title: '金额(元)', dataIndex: 'amount', width: 120, render: (v: number) => <MoneyText value={v} fractionDigits={2} /> },
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
      render: (v: number) => <MoneyText value={v} fractionDigits={2} />,
    },
    { title: '金额(元)', dataIndex: 'cost', width: 120, render: (v: number) => <MoneyText value={v} fractionDigits={2} /> },
  ];

  // ─── 概览卡片数据 ────────────────────────────────────────
  const summaryCards = [
    { label: '科研成本', value: rdTotal },
    { label: '差旅成本', value: travelTotal },
    { label: '商务成本', value: bizTotal },
    { label: '外包成本', value: outsourceTotal },
    { label: '其他成本', value: otherTotal },
    { label: '分摊运营成本', value: opTotal },
  ];

  // ─── 合计行渲染 ──────────────────────────────────────────
  function renderRDSummary() {
    if (rdDetails.length === 0) return null;
    const totalHours = rdDetails.reduce((s, r) => s + r.hours, 0);
    return (
      <div style={{ textAlign: 'right', padding: '8px 16px', fontWeight: 600 }}>
        合计：工时 {totalHours}h，金额 {canViewDetail ? <MoneyText value={rdTotal} fractionDigits={2} /> : '***'}
      </div>
    );
  }

  function renderAmountSummary(total: number) {
    return (
      <div style={{ textAlign: 'right', padding: '8px 16px', fontWeight: 600 }}>
        合计：<MoneyText value={total} fractionDigits={2} />
      </div>
    );
  }

  function renderOpSummary() {
    if (opDetails.length === 0) return null;
    const totalHours = opDetails.reduce((s, r) => s + r.hours, 0);
    return (
      <div style={{ textAlign: 'right', padding: '8px 16px', fontWeight: 600 }}>
        合计：工时 {totalHours}h，金额 <MoneyText value={opTotal} fractionDigits={2} />
      </div>
    );
  }

  return (
    <PageShell
      breadcrumbs={[
        { label: '财务统计' },
        { label: '合同成本明细' },
        { label: contractName },
      ]}
    >
      <DetailHeader
        title={`${contractName} - 成本明细`}
        onBack={() => navigate(-1)}
        status={hasProjects && <StatusTag meta={DATA_MODE_STATUS[useActual ? 'actual' : 'nominal']} />}
      />

      {hasProjects ? (
      <>
      <MetricGrid
        items={summaryCards.map((card) => ({
          key: card.label,
          label: card.label,
          value: <MoneyText value={card.value} fractionDigits={2} />,
        }))}
      />

      {/* ── Tabs ── */}
      <SectionCard padded={false}>
        <SectionTabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'rd',
              label: "科研成本",
              content: (
                <>
                      <DataTable<RDCostDetail>
                        columns={rdColumns}
                        data={rdDetails}
                        rowKey="employeeId"
                        pagination={false}
                        scroll={{ x: 580 }}
                      />
                      {renderRDSummary()}
                    
                </>
              ),
            },
            {
              key: 'travel',
              label: "差旅成本",
              content: (
                <>
                      <DataTable<BusinessCostRecord>
                        columns={bizColumns}
                        data={travelDetails}
                        rowKey="id"
                        pagination={false}
                      />
                      {travelDetails.length > 0 && renderAmountSummary(travelTotal)}
                    
                </>
              ),
            },
            {
              key: 'biz',
              label: "商务成本",
              content: (
                <>
                      <DataTable<BusinessCostRecord>
                        columns={bizColumns}
                        data={bizDetails}
                        rowKey="id"
                        pagination={false}
                      />
                      {bizDetails.length > 0 && renderAmountSummary(bizTotal)}
                    
                </>
              ),
            },
            {
              key: 'outsource',
              label: "外包成本",
              content: (
                <>
                      <DataTable<OutsourceCostRecord>
                        columns={outsourceColumns}
                        data={outsourceDetails}
                        rowKey="id"
                        pagination={false}
                      />
                      {outsourceDetails.length > 0 && renderAmountSummary(outsourceTotal)}
                    
                </>
              ),
            },
            {
              key: 'other',
              label: "其他成本",
              content: (
                <>
                      <DataTable<OtherCostRecord>
                        columns={otherColumns}
                        data={otherDetails}
                        rowKey="id"
                        pagination={false}
                      />
                      {otherDetails.length > 0 && renderAmountSummary(otherTotal)}
                    
                </>
              ),
            },
            {
              key: 'op',
              label: "分摊运营成本",
              content: (
                <>
                      {/* 计算过程展示 */}
                      <SectionCard
                        style={{ marginBottom: 16, backgroundColor: 'var(--color-fill-1)' }}
                        bordered={false}
                      >
                        <Title heading={6} style={{ marginTop: 0, marginBottom: 12 }}>公摊费率计算</Title>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                          <div>
                            <Text style={{ color: 'var(--color-text-3)', fontSize: 'var(--text-sm)' }}>
                              {CURRENT_MONTH} 公共运营池
                            </Text>
                            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}><MoneyText value={overheadSnapshot.pool} fractionDigits={2} /></div>
                          </div>
                          <div>
                            <Text style={{ color: 'var(--color-text-3)', fontSize: 'var(--text-sm)' }}>在职员工数</Text>
                            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{overheadSnapshot.activeEmployeeCount} 人</div>
                          </div>
                          <div>
                            <Text style={{ color: 'var(--color-text-3)', fontSize: 'var(--text-sm)' }}>编制工时</Text>
                            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{overheadSnapshot.capacityHours} h</div>
                          </div>
                          <div>
                            <Text style={{ color: 'var(--color-text-3)', fontSize: 'var(--text-sm)' }}>每小时运营成本</Text>
                            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                              <MoneyText value={hourlyOpCost} fractionDigits={2} />/h
                            </div>
                          </div>
                        </div>
                        <Text style={{ color: 'var(--color-text-3)', fontSize: 'var(--text-xs)', marginTop: 8, display: 'block' }}>
                          计算公式：R_hour = 当月公共运营池 ÷ 全公司在职编制工时
                          = <MoneyText value={overheadSnapshot.pool} fractionDigits={2} /> ÷ {overheadSnapshot.capacityHours}h
                          = <MoneyText value={hourlyOpCost} fractionDigits={2} />/h
                        </Text>
                      </SectionCard>
          
                      <DataTable<OpCostDetail>
                        columns={opColumns}
                        data={opDetails}
                        rowKey="employeeName"
                        pagination={false}
                        scroll={{ x: 620 }}
                      />
                      {renderOpSummary()}
                    
                </>
              ),
            },
          ]}
        />
      </SectionCard>
      </>
      ) : (
        <SectionCard>
          <EmptyState description="该合同未关联项目" />
        </SectionCard>
      )}
    </PageShell>
  );
}
