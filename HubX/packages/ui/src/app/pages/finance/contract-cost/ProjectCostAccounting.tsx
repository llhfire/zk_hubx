import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Drawer,
  Grid,
  Table,
  Button,
  Space,
  Select,
  Typography,
  Tabs,
  Tooltip,
} from '@/design-system';
import {
  DataTable,
  DescriptionsCard,
  EmptyState,
  MetricCard,
  MoneyText,
  PageHeader,
  PageShell,
  StatusTag,
  resolveStatus,
  type StatusMap,
  ProgressBar,
  SectionTabs,
  SectionCard,
} from '@/design-system';
import {
  IconFile,
  IconExperiment,
  IconCalendar,
} from '@/design-system';
import {
  initialProjects,
  initialDailyReports,
  calculateProjectHours,
} from '../../delivery/project/mockData';
import {
  contractNames,
  buildRDCostDetails,
  buildOpCostDetails,
  mockBusinessCosts,
  mockOutsourceCosts,
  mockOtherCosts,
} from './contractCostData';
import { useContracts } from '../../sales/contracts/ContractsContext';
import { useCollections } from '../../../collections/CollectionContext';
import { withCollectionLedger } from '../../../../services/collectionMutations';
import { formatCurrency } from '../../support/hr/employee/mockData';
import { getPaymentPlanPeriodLabel } from '../../sales/contracts/utils';

const Row = Grid.Row;
const Col = Grid.Col;
const TabPane = Tabs.TabPane;
const Title = Typography.Title;

interface ProjectCostRow {
  projectId: string;
  projectName: string;
  projectNo: string;
  status: string;
  progress: number;
  contractId: string;
  contractName: string;
  contractAmount: number;
  receivedAmount: number;
  totalHours: number;
  rdCost: number;
  opCost: number;
  travelCost: number;
  businessCost: number;
  outsourceCost: number;
  otherCost: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  budgetAlert: 'ok' | 'warning' | 'danger';
}

const COST_MONTH = '2026-06';

const PROJECT_STATUS: StatusMap<string> = {
  进行中: { label: '进行中', tone: 'info' },
  已完成: { label: '已完成', tone: 'success' },
  验收中: { label: '验收中', tone: 'purple' },
  未开始: { label: '未开始', tone: 'neutral' },
  延迟: { label: '延迟', tone: 'danger' },
  搁置: { label: '搁置', tone: 'neutral' },
  催款中: { label: '催款中', tone: 'warning' },
};

const BUDGET_ALERT: StatusMap<'ok' | 'warning' | 'danger'> = {
  ok: { label: '健康', tone: 'success' },
  warning: { label: '利润率偏低', tone: 'warning' },
  danger: { label: '亏损预警', tone: 'danger' },
};

export function ProjectCostAccounting() {
  const navigate = useNavigate();
  const location = useLocation();
  const { contracts } = useContracts();
  const { collections } = useCollections();
  const [activeTab, setActiveTab] = useState('overview');
  const [filterStatus, setFilterStatus] = useState('');
  const [detailRow, setDetailRow] = useState<ProjectCostRow | null>(null);

  const pageTitle = location.pathname.startsWith('/cost-accounting')
    ? '费用核算'
    : '项目成本核算';

  const financialContracts = useMemo(
    () => contracts.map((contract) => withCollectionLedger(contract, collections)),
    [contracts, collections],
  );

  const projectCostData: ProjectCostRow[] = useMemo(() => {
    return initialProjects.map((project) => {
      const contractId = project.contractId || '';
      const contractName = contractNames[contractId] || '—';
      const contractObj = financialContracts.find((c) => c.id === contractId);
      const contractAmount = contractObj?.current.totalAmount || 0;
      const receivedAmount = contractObj?.receivedAmount || 0;

      const totalHours = calculateProjectHours(project.id, initialDailyReports);

      const rdDetails = contractId ? buildRDCostDetails(contractId, COST_MONTH) : [];
      const rdCost = rdDetails.reduce((s, d) => s + d.cost, 0);

      const opDetails = contractId ? buildOpCostDetails(contractId, COST_MONTH) : [];
      const opCost = opDetails.reduce((s, d) => s + d.cost, 0);

      const directCosts = mockBusinessCosts.filter((cost) => cost.contractId === contractId);
      const travelCost = directCosts
        .filter((cost) => cost.costCategory === 'travel')
        .reduce((sum, cost) => sum + cost.amount, 0);
      const businessCost = directCosts
        .filter((cost) => cost.costCategory === 'commercial')
        .reduce((s, b) => s + b.amount, 0);
      const outsourceCost = mockOutsourceCosts
        .filter((b) => b.contractId === contractId)
        .reduce((s, b) => s + b.amount, 0);
      const otherCost = mockOtherCosts
        .filter((b) => b.contractId === contractId)
        .reduce((s, b) => s + b.amount, 0);

      const totalCost = rdCost + opCost + travelCost + businessCost + outsourceCost + otherCost;
      const profit = contractAmount - totalCost;
      const profitMargin = contractAmount > 0 ? Math.round((profit / contractAmount) * 100) : 0;

      let budgetAlert: 'ok' | 'warning' | 'danger' = 'ok';
      if (profitMargin < 0) budgetAlert = 'danger';
      else if (profitMargin < 15) budgetAlert = 'warning';

      return {
        projectId: project.id,
        projectName: project.name,
        projectNo: project.projectNo,
        status: project.status,
        progress: project.progress,
        contractId,
        contractName,
        contractAmount,
        receivedAmount,
        totalHours,
        rdCost,
        opCost,
        travelCost,
        businessCost,
        outsourceCost,
        otherCost,
        totalCost,
        profit,
        profitMargin,
        budgetAlert,
      };
    });
  }, [financialContracts]);

  const summary = useMemo(() => {
    const total = projectCostData.reduce(
      (acc, p) => ({
        contractAmount: acc.contractAmount + p.contractAmount,
        receivedAmount: acc.receivedAmount + p.receivedAmount,
        totalCost: acc.totalCost + p.totalCost,
        profit: acc.profit + p.profit,
        totalHours: acc.totalHours + p.totalHours,
        rdCost: acc.rdCost + p.rdCost,
      }),
      { contractAmount: 0, receivedAmount: 0, totalCost: 0, profit: 0, totalHours: 0, rdCost: 0 },
    );
    const avgMargin =
      total.contractAmount > 0 ? Math.round((total.profit / total.contractAmount) * 100) : 0;
    const alertCount = projectCostData.filter(
      (p) => p.budgetAlert === 'danger' || p.budgetAlert === 'warning',
    ).length;
    return { ...total, avgMargin, alertCount, projectCount: projectCostData.length };
  }, [projectCostData]);

  const filteredData = useMemo(() => {
    if (!filterStatus) return projectCostData;
    return projectCostData.filter((p) => p.status === filterStatus);
  }, [projectCostData, filterStatus]);

  const statusOptions = Array.from(new Set(initialProjects.map((p) => p.status)));

  const detailContract = detailRow
    ? financialContracts.find((c) => c.id === detailRow.contractId)
    : undefined;

  const columns = [
    {
      title: '项目',
      dataIndex: 'projectName',
      width: 160,
      fixed: 'left' as const,
      render: (_: unknown, row: ProjectCostRow) => (
        <Button
          type="text"
          size="small"
          style={{ fontWeight: 600, padding: 0 }}
          onClick={() => navigate(`/projects/${row.projectId}`)}
        >
          {row.projectName}
        </Button>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: string) => <StatusTag meta={resolveStatus(PROJECT_STATUS, s)} />,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      width: 90,
      render: (p: number) => <ProgressBar percent={p} size="small" />,
    },
    {
      title: '合同额',
      dataIndex: 'contractAmount',
      width: 100,
      render: (v: number) => <MoneyText value={v} />,
      sorter: (a: ProjectCostRow, b: ProjectCostRow) => a.contractAmount - b.contractAmount,
    },
    {
      title: '已回款',
      dataIndex: 'receivedAmount',
      width: 100,
      render: (v: number) => <MoneyText value={v} />,
    },
    {
      title: '总工时',
      dataIndex: 'totalHours',
      width: 80,
      render: (v: number) => `${v}h`,
    },
    {
      title: '研发成本',
      dataIndex: 'rdCost',
      width: 100,
      render: (v: number) => <MoneyText value={v} />,
    },
    {
      title: '运营分摊',
      dataIndex: 'opCost',
      width: 100,
      render: (v: number) => <MoneyText value={v} />,
    },
    {
      title: '差旅成本',
      dataIndex: 'travelCost',
      width: 100,
      render: (v: number) => <MoneyText value={v} />,
    },
    {
      title: '商务成本',
      dataIndex: 'businessCost',
      width: 100,
      render: (v: number) => <MoneyText value={v} />,
    },
    {
      title: '总成本',
      dataIndex: 'totalCost',
      width: 100,
      render: (v: number) => <MoneyText value={v} tone="danger" />,
      sorter: (a: ProjectCostRow, b: ProjectCostRow) => a.totalCost - b.totalCost,
    },
    {
      title: '利润',
      dataIndex: 'profit',
      width: 100,
      render: (v: number) => <MoneyText value={v} tone={v >= 0 ? 'success' : 'danger'} />,
      sorter: (a: ProjectCostRow, b: ProjectCostRow) => a.profit - b.profit,
    },
    {
      title: '利润率',
      dataIndex: 'profitMargin',
      width: 90,
      render: (v: number, row: ProjectCostRow) => {
        const meta = BUDGET_ALERT[row.budgetAlert];
        return (
          <Tooltip content={meta.label}>
            <StatusTag meta={{ ...meta, label: `${v}%` }} />
          </Tooltip>
        );
      },
      sorter: (a: ProjectCostRow, b: ProjectCostRow) => a.profitMargin - b.profitMargin,
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, row: ProjectCostRow) => (
        <Button type="text" size="small" onClick={() => setDetailRow(row)}>
          收支明细
        </Button>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title={pageTitle}
        description="按项目与人员汇总工时成本，核对成本归集口径。"
      />

      <Row gutter={16}>
        <Col span={4}><MetricCard label="项目总数" value={summary.projectCount} suffix="个" /></Col>
        <Col span={4}><MetricCard label="合同总额" value={<MoneyText value={summary.contractAmount} />} /></Col>
        <Col span={4}><MetricCard label="已回款" value={<MoneyText value={summary.receivedAmount} />} /></Col>
        <Col span={4}><MetricCard label="总成本" value={<MoneyText value={summary.totalCost} tone="danger" />} /></Col>
        <Col span={4}><MetricCard label="总利润" value={<MoneyText value={summary.profit} tone="success" />} /></Col>
        <Col span={4}><MetricCard label="预警项目" value={summary.alertCount} suffix="个" tone={summary.alertCount > 0 ? 'danger' : 'success'} /></Col>
      </Row>

      <SectionCard bordered={false}>
        <SectionTabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: <span><IconFile /> 项目成本总览</span>,
            },
            {
              key: 'rd',
              label: <span><IconExperiment /> 研发成本明细</span>,
            },
          ]}
        />

        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '16px 0' }}>
              <Select
                style={{ width: 130 }}
                placeholder="全部状态"
                allowClear
                value={filterStatus}
                onChange={setFilterStatus}
              >
                {statusOptions.map((s) => (
                  <Select.Option key={s} value={s}>
                    {s}
                  </Select.Option>
                ))}
              </Select>
            </div>
            <DataTable
              columns={columns as any}
              data={filteredData}
              rowKey="projectId"
              pagination={{ pageSize: 10, showTotal: true }}
              scroll={{ x: 1400 }}
            />
          </div>
        )}

        {activeTab === 'rd' && <RDCostDetailTable projectCostData={projectCostData} />}
      </SectionCard>

      <Drawer
        width={720}
        title={detailRow ? `${detailRow.projectName} · 收支明细` : '收支明细'}
        visible={!!detailRow}
        onCancel={() => setDetailRow(null)}
        footer={null}
      >
        {detailRow && (
          <ProjectIncomeExpenseDetail row={detailRow} contract={detailContract} />
        )}
      </Drawer>
    </PageShell>
  );
}

function ProjectIncomeExpenseDetail({
  row,
  contract,
}: {
  row: ProjectCostRow;
  contract: ReturnType<typeof useContracts>['contracts'][number] | undefined;
}) {
  const rdDetails = row.contractId ? buildRDCostDetails(row.contractId, COST_MONTH) : [];
  const opDetails = row.contractId ? buildOpCostDetails(row.contractId, COST_MONTH) : [];
  const directDetails = mockBusinessCosts.filter((cost) => cost.contractId === row.contractId);
  const outsourceDetails = mockOutsourceCosts.filter((b) => b.contractId === row.contractId);
  const otherDetails = mockOtherCosts.filter((b) => b.contractId === row.contractId);
  const paymentPlans = contract?.current.paymentPlans ?? [];
  const collectionRecords = contract?.collectionRecords ?? [];

  const expenseLines = [
    ...rdDetails.map((d) => ({
      type: '研发成本',
      name: `${d.employeeName}（${d.position}）`,
      amount: d.cost,
      remark: `${d.hours}h × ${formatCurrency(d.hourlyRate)}`,
    })),
    ...opDetails.map((d) => ({
      type: '运营分摊',
      name: d.employeeName || '运营分摊',
      amount: d.cost,
      remark: `${d.hours}h`,
    })),
    ...directDetails.map((d) => ({
      type: d.costCategory === 'travel' ? '差旅成本' : '商务成本',
      name: d.category,
      amount: d.amount,
      remark: d.description,
    })),
    ...outsourceDetails.map((d) => ({
      type: '外包成本',
      name: d.vendorName,
      amount: d.amount,
      remark: d.description,
    })),
    ...otherDetails.map((d) => ({
      type: '其他成本',
      name: d.category,
      amount: d.amount,
      remark: d.description,
    })),
  ];

  const incomeLines =
    collectionRecords.length > 0
      ? collectionRecords.map((r) => ({
          type: '回款',
          name: r.period != null && r.period !== 'other' ? `第${r.period}期` : '其他回款',
          amount: r.amount,
          remark: [r.date, r.method, r.note].filter(Boolean).join(' · '),
        }))
      : paymentPlans.map((p) => ({
          type: '应收计划',
          name: getPaymentPlanPeriodLabel(p),
          amount: p.amount,
          remark: p.expectedDate || p.condition || '',
        }));

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <DescriptionsCard
        columns={2}
        items={[
        { key: '项目编号', label: '项目编号', value: row.projectNo },
        { key: '关联合同', label: '关联合同', value: row.contractName },
        { key: '合同额', label: '合同额', value: <MoneyText value={row.contractAmount} /> },
        { key: '已回款', label: '已回款', value: <MoneyText value={row.receivedAmount} /> },
        { key: '总成本',
                  label: '总成本',
                  value: <MoneyText value={row.totalCost} tone="danger" />,
                },
        { key: '利润 / 利润率',
                  label: '利润 / 利润率',
                  value: (
                    <>
                      <MoneyText value={row.profit} tone={row.profit >= 0 ? 'success' : 'danger'} />（{row.profitMargin}%）
                    </>
                  ),
                },
      ]}
      />

      <div>
        <Title heading={6} style={{ marginBottom: 8 }}>
          <IconCalendar style={{ marginRight: 6 }} />
          收入明细
        </Title>
        {incomeLines.length === 0 ? (
          <EmptyState description="暂无收入/回款记录" />
        ) : (
          <DataTable
            size="small"
            pagination={false}
            rowKey={(record) => `in-${record.type}-${record.name}`}
            data={incomeLines}
            columns={[
              { title: '类型', dataIndex: 'type', width: 100 },
              { title: '名称', dataIndex: 'name', width: 140 },
              {
                title: '金额',
                dataIndex: 'amount',
                width: 120,
                render: (v: number) => <MoneyText value={v} tone="success" />,
              },
              { title: '说明', dataIndex: 'remark' },
            ]}

            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={2}>
                  <span style={{ fontWeight: 600 }}>合计</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell>
                  <MoneyText
                    value={incomeLines.reduce((s, r) => s + r.amount, 0) || row.receivedAmount}
                    tone="success"
                  />
                </Table.Summary.Cell>
                <Table.Summary.Cell />
              </Table.Summary.Row>
            )}
          />
        )}
      </div>

      <div>
        <Title heading={6} style={{ marginBottom: 8 }}>
          <IconExperiment style={{ marginRight: 6 }} />
          支出明细
        </Title>
        {expenseLines.length === 0 ? (
          <EmptyState description="暂无支出明细" />
        ) : (
          <DataTable
            size="small"
            pagination={false}
            rowKey={(record) => `ex-${record.type}-${record.name}`}
            data={expenseLines}
            columns={[
              { title: '类型', dataIndex: 'type', width: 100 },
              { title: '名称', dataIndex: 'name', width: 160 },
              {
                title: '金额',
                dataIndex: 'amount',
                width: 120,
                render: (v: number) => <MoneyText value={v} tone="danger" />,
              },
              { title: '说明', dataIndex: 'remark' },
            ]}

            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={2}>
                  <span style={{ fontWeight: 600 }}>合计</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell>
                  <MoneyText value={row.totalCost} tone="danger" />
                </Table.Summary.Cell>
                <Table.Summary.Cell />
              </Table.Summary.Row>
            )}
          />
        )}
      </div>
    </Space>
  );
}

function RDCostDetailTable({ projectCostData }: { projectCostData: ProjectCostRow[] }) {
  const rows = useMemo(() => {
    const result: any[] = [];
    projectCostData.forEach((p) => {
      if (!p.contractId) return;
      const details = buildRDCostDetails(p.contractId, COST_MONTH);
      details.forEach((d) => {
        result.push({ ...d, projectName: p.projectName });
      });
    });
    return result;
  }, [projectCostData]);

  return (
    <DataTable
      columns={
        [
          { title: '项目', dataIndex: 'projectName', width: 140 },
          { title: '姓名', dataIndex: 'employeeName', width: 80 },
          {
            title: '角色',
            dataIndex: 'position',
            width: 80,
            render: (v: string) => <StatusTag>{v}</StatusTag>,
          },
          { title: '工时', dataIndex: 'hours', width: 70, render: (v: number) => `${v}h` },
          {
            title: '时薪',
            dataIndex: 'hourlyRate',
            width: 80,
            render: (v: number) => <MoneyText value={v} />,
          },
          {
            title: '成本',
            dataIndex: 'cost',
            width: 100,
            render: (v: number) => <MoneyText value={v} tone="danger" />,
            sorter: (a: any, b: any) => a.cost - b.cost,
          },
        ] as any
      }
      data={rows}
      rowKey={(r) => `${r.projectName}-${r.employeeName}`}
      pagination={{ pageSize: 15, showTotal: true }}

      summary={() => (
        <Table.Summary.Row>
          <Table.Summary.Cell colSpan={3}>
            <span style={{ fontWeight: 600 }}>合计</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell>
            <span style={{ fontWeight: 600 }}>{rows.reduce((s: number, r: any) => s + (r.hours || 0), 0)}h</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell>—</Table.Summary.Cell>
          <Table.Summary.Cell>
            <MoneyText value={rows.reduce((s: number, r: any) => s + (r.cost || 0), 0)} tone="danger" />
          </Table.Summary.Cell>
        </Table.Summary.Row>
      )}
    />
  );
}
