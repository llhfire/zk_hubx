import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Card,
  Drawer,
  Grid,
  Statistic,
  Table,
  Button,
  Space,
  Tag,
  Select,
  Progress,
  Typography,
  Tabs,
  Tooltip,
  Descriptions,
  Empty,
} from '@arco-design/web-react';
import {
  IconFile,
  IconExperiment,
  IconExclamationCircle,
  IconTrophy,
  IconCalendar,
} from '@arco-design/web-react/icon';
import {
  initialProjects,
  initialDailyReports,
  calculateProjectHours,
} from '../project-management/mockData';
import {
  contractNames,
  buildRDCostDetails,
  buildOpCostDetails,
  mockBusinessCosts,
  mockOutsourceCosts,
  mockOtherCosts,
} from './contractCostData';
import { useContracts } from '../contracts/ContractsContext';
import { formatCurrency } from '../employee/mockData';
import { getPaymentPlanPeriodLabel } from '../contracts/utils';

const Row = Grid.Row;
const Col = Grid.Col;
const TabPane = Tabs.TabPane;
const Title = Typography.Title;
const Text = Typography.Text;

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
  businessCost: number;
  outsourceCost: number;
  otherCost: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  budgetAlert: 'ok' | 'warning' | 'danger';
}

const COST_MONTH = '2026-06';

export function ProjectCostAccounting() {
  const navigate = useNavigate();
  const location = useLocation();
  const { contracts } = useContracts();
  const [activeTab, setActiveTab] = useState('overview');
  const [filterStatus, setFilterStatus] = useState('');
  const [detailRow, setDetailRow] = useState<ProjectCostRow | null>(null);

  const pageTitle = location.pathname.startsWith('/cost-accounting')
    ? '费用核算'
    : '项目成本核算';

  const projectCostData: ProjectCostRow[] = useMemo(() => {
    return initialProjects.map((project) => {
      const contractId = project.contractId || '';
      const contractName = contractNames[contractId] || '—';
      const contractObj = contracts.find((c) => c.id === contractId);
      const contractAmount = contractObj?.current.totalAmount || 0;
      const receivedAmount = contractObj?.receivedAmount || 0;

      const totalHours = calculateProjectHours(project.id, initialDailyReports);

      const rdDetails = contractId ? buildRDCostDetails(contractId, COST_MONTH) : [];
      const rdCost = rdDetails.reduce((s, d) => s + d.cost, 0);

      const opDetails = contractId ? buildOpCostDetails(contractId, COST_MONTH) : [];
      const opCost = opDetails.reduce((s, d) => s + d.cost, 0);

      const businessCost = mockBusinessCosts
        .filter((b) => b.contractId === contractId)
        .reduce((s, b) => s + b.amount, 0);
      const outsourceCost = mockOutsourceCosts
        .filter((b) => b.contractId === contractId)
        .reduce((s, b) => s + b.amount, 0);
      const otherCost = mockOtherCosts
        .filter((b) => b.contractId === contractId)
        .reduce((s, b) => s + b.amount, 0);

      const totalCost = rdCost + opCost + businessCost + outsourceCost + otherCost;
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
        businessCost,
        outsourceCost,
        otherCost,
        totalCost,
        profit,
        profitMargin,
        budgetAlert,
      };
    });
  }, [contracts]);

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
    ? contracts.find((c) => c.id === detailRow.contractId)
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
      render: (s: string) => {
        const colors: Record<string, string> = {
          进行中: '#165dff',
          已完成: '#00b42a',
          验收中: '#0fc6c2',
          未开始: '#86909c',
          延迟: '#f53f3f',
          搁置: '#c9cdd4',
          催款中: '#ff7d00',
        };
        return <Tag color={colors[s] || '#86909c'}>{s}</Tag>;
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      width: 90,
      render: (p: number) => <Progress percent={p} size="small" />,
    },
    {
      title: '合同额',
      dataIndex: 'contractAmount',
      width: 100,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{formatCurrency(v)}</span>,
      sorter: (a: ProjectCostRow, b: ProjectCostRow) => a.contractAmount - b.contractAmount,
    },
    {
      title: '已回款',
      dataIndex: 'receivedAmount',
      width: 100,
      render: (v: number) => formatCurrency(v),
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
      render: (v: number) => formatCurrency(v),
    },
    {
      title: '运营分摊',
      dataIndex: 'opCost',
      width: 100,
      render: (v: number) => formatCurrency(v),
    },
    {
      title: '总成本',
      dataIndex: 'totalCost',
      width: 100,
      render: (v: number) => (
        <span style={{ fontWeight: 700, color: '#f53f3f' }}>{formatCurrency(v)}</span>
      ),
      sorter: (a: ProjectCostRow, b: ProjectCostRow) => a.totalCost - b.totalCost,
    },
    {
      title: '利润',
      dataIndex: 'profit',
      width: 100,
      render: (v: number) => (
        <span style={{ fontWeight: 700, color: v >= 0 ? '#00b42a' : '#f53f3f' }}>
          {formatCurrency(v)}
        </span>
      ),
      sorter: (a: ProjectCostRow, b: ProjectCostRow) => a.profit - b.profit,
    },
    {
      title: '利润率',
      dataIndex: 'profitMargin',
      width: 90,
      render: (v: number, row: ProjectCostRow) => (
        <Tooltip
          content={
            row.budgetAlert === 'danger'
              ? '亏损预警'
              : row.budgetAlert === 'warning'
                ? '利润率偏低'
                : '健康'
          }
        >
          <Tag
            color={
              row.budgetAlert === 'danger'
                ? '#f53f3f'
                : row.budgetAlert === 'warning'
                  ? '#ff7d00'
                  : '#00b42a'
            }
          >
            {v}%
          </Tag>
        </Tooltip>
      ),
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
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title heading={4} style={{ margin: 0 }}>
        {pageTitle}
      </Title>

      <Row gutter={16}>
        <Col span={4}>
          <Card>
            <Statistic
              title="项目总数"
              value={summary.projectCount}
              suffix="个"
              prefix={<IconFile style={{ color: 'rgb(var(--primary-6))' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="合同总额"
              value={summary.contractAmount}
              prefix={<IconFile style={{ color: '#165dff' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="已回款"
              value={summary.receivedAmount}
              prefix={<IconTrophy style={{ color: '#0fc6c2' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="总成本"
              value={summary.totalCost}
              prefix={<IconExperiment style={{ color: '#f53f3f' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="总利润"
              value={summary.profit}
              prefix={<IconTrophy style={{ color: '#00b42a' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="预警项目"
              value={summary.alertCount}
              suffix="个"
              prefix={<IconExclamationCircle style={{ color: '#f53f3f' }} />}
              valueStyle={{ color: summary.alertCount > 0 ? '#f53f3f' : '#00b42a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false}>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="overview" title={<span><IconFile /> 项目成本总览</span>} />
          <TabPane key="rd" title={<span><IconExperiment /> 研发成本明细</span>} />
        </Tabs>

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
            <Table
              columns={columns as any}
              data={filteredData}
              rowKey="projectId"
              pagination={{ pageSize: 10, showTotal: true }}
              scroll={{ x: 1400 }}
            />
          </div>
        )}

        {activeTab === 'rd' && <RDCostDetailTable projectCostData={projectCostData} />}
      </Card>

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
    </Space>
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
  const bizDetails = mockBusinessCosts.filter((b) => b.contractId === row.contractId);
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
    ...bizDetails.map((d) => ({
      type: '商务成本',
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
      <Descriptions
        column={2}
        size="small"
        data={[
          { label: '项目编号', value: row.projectNo },
          { label: '关联合同', value: row.contractName },
          { label: '合同额', value: formatCurrency(row.contractAmount) },
          { label: '已回款', value: formatCurrency(row.receivedAmount) },
          {
            label: '总成本',
            value: (
              <Text style={{ color: '#f53f3f', fontWeight: 600 }}>
                {formatCurrency(row.totalCost)}
              </Text>
            ),
          },
          {
            label: '利润 / 利润率',
            value: (
              <Text style={{ color: row.profit >= 0 ? '#00b42a' : '#f53f3f', fontWeight: 600 }}>
                {formatCurrency(row.profit)}（{row.profitMargin}%）
              </Text>
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
          <Empty description="暂无收入/回款记录" />
        ) : (
          <Table
            size="small"
            pagination={false}
            rowKey={(_, i) => `in-${i}`}
            data={incomeLines}
            columns={[
              { title: '类型', dataIndex: 'type', width: 100 },
              { title: '名称', dataIndex: 'name', width: 140 },
              {
                title: '金额',
                dataIndex: 'amount',
                width: 120,
                render: (v: number) => (
                  <span style={{ color: '#00b42a', fontWeight: 600 }}>{formatCurrency(v)}</span>
                ),
              },
              { title: '说明', dataIndex: 'remark' },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={2}>
                  <span style={{ fontWeight: 600 }}>合计</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell>
                  <span style={{ fontWeight: 700, color: '#00b42a' }}>
                    {formatCurrency(
                      incomeLines.reduce((s, r) => s + r.amount, 0) || row.receivedAmount,
                    )}
                  </span>
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
          <Empty description="暂无支出明细" />
        ) : (
          <Table
            size="small"
            pagination={false}
            rowKey={(_, i) => `ex-${i}`}
            data={expenseLines}
            columns={[
              { title: '类型', dataIndex: 'type', width: 100 },
              { title: '名称', dataIndex: 'name', width: 160 },
              {
                title: '金额',
                dataIndex: 'amount',
                width: 120,
                render: (v: number) => (
                  <span style={{ color: '#f53f3f', fontWeight: 600 }}>{formatCurrency(v)}</span>
                ),
              },
              { title: '说明', dataIndex: 'remark' },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={2}>
                  <span style={{ fontWeight: 600 }}>合计</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell>
                  <span style={{ fontWeight: 700, color: '#f53f3f' }}>
                    {formatCurrency(row.totalCost)}
                  </span>
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
    <div style={{ marginTop: 16 }}>
      <Table
        columns={
          [
            { title: '项目', dataIndex: 'projectName', width: 140 },
            { title: '姓名', dataIndex: 'employeeName', width: 80 },
            {
              title: '角色',
              dataIndex: 'position',
              width: 80,
              render: (v: string) => <Tag>{v}</Tag>,
            },
            { title: '工时', dataIndex: 'hours', width: 70, render: (v: number) => `${v}h` },
            {
              title: '时薪',
              dataIndex: 'hourlyRate',
              width: 80,
              render: (v: number) => formatCurrency(v),
            },
            {
              title: '成本',
              dataIndex: 'cost',
              width: 100,
              render: (v: number) => (
                <span style={{ fontWeight: 600, color: '#f53f3f' }}>{formatCurrency(v)}</span>
              ),
              sorter: (a: any, b: any) => a.cost - b.cost,
            },
          ] as any
        }
        data={rows}
        rowKey={(r) => `${r.projectName}-${r.employeeName}`}
        pagination={{ pageSize: 15, showTotal: true }}
        summary={() => {
          const totalHours = rows.reduce((s: number, r: any) => s + (r.hours || 0), 0);
          const totalCost = rows.reduce((s: number, r: any) => s + (r.cost || 0), 0);
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell colSpan={3}>
                <span style={{ fontWeight: 600 }}>合计</span>
              </Table.Summary.Cell>
              <Table.Summary.Cell>
                <span style={{ fontWeight: 600 }}>{totalHours}h</span>
              </Table.Summary.Cell>
              <Table.Summary.Cell>—</Table.Summary.Cell>
              <Table.Summary.Cell>
                <span style={{ fontWeight: 700, color: '#f53f3f' }}>{formatCurrency(totalCost)}</span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />
    </div>
  );
}
