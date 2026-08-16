import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Grid,
  Statistic,
  Table,
  Button,
  Space,
  Tag,
  Progress,
  Typography,
  Tabs,
  Select,
  Tooltip,
  Alert,
} from '@arco-design/web-react';
import {
  IconFile,
  IconCalendar,
  IconExclamationCircle,
  IconCheckCircle,
  IconClockCircle,
  IconArrowRight,
  IconExperiment,
} from '@arco-design/web-react/icon';
import { PaymentPlanItem } from '../types';
import { formatCurrency } from '../../employee/mockData';

const Row = Grid.Row;
const Col = Grid.Col;
const TabPane = Tabs.TabPane;
const Title = Typography.Title;
const SelectOption = Select.Option;

// ---------- 类型 ----------

interface MilestoneStatus {
  period: number;
  expectedDate: string;
  amount: number;
  percentage: number;
  status: 'paid' | 'overdue' | 'upcoming' | 'normal';
  daysUntil: number;
  receivedAmount: number;
}

interface MonthlyForecast {
  month: string;
  incoming: number;
  contractCount: number;
  riskCount: number;
}

// ---------- 本地模拟数据 ----------

interface ForecastContract {
  id: string;
  contractNo: string;
  contractName: string;
  customerName: string;
  totalAmount: number;
  paymentPlans: PaymentPlanItem[];
  collectionRecords: { amount: number; date: string }[];
}

const forecastContracts: ForecastContract[] = [
  {
    id: 'c1', contractNo: 'HT202601001', contractName: '企业管理系统开发', customerName: '北京科技有限公司',
    totalAmount: 1_200_000,
    paymentPlans: [
      { period: 1, expectedDate: '2026-03-20', amount: 480_000, percentage: 40 },
      { period: 2, expectedDate: '2026-05-20', amount: 360_000, percentage: 30 },
      { period: 3, expectedDate: '2026-07-20', amount: 360_000, percentage: 30 },
    ],
    collectionRecords: [{ amount: 480_000, date: '2026-03-22' }],
  },
  {
    id: 'c2', contractNo: 'HT202601002', contractName: '云服务平台项目', customerName: '创新科技有限公司',
    totalAmount: 2_000_000,
    paymentPlans: [
      { period: 1, expectedDate: '2026-04-01', amount: 1_000_000, percentage: 50 },
      { period: 2, expectedDate: '2026-06-01', amount: 600_000, percentage: 30 },
      { period: 3, expectedDate: '2026-09-01', amount: 400_000, percentage: 20 },
    ],
    collectionRecords: [{ amount: 1_000_000, date: '2026-04-03' }],
  },
  {
    id: 'c3', contractNo: 'HT202601003', contractName: '电商平台小程序', customerName: '东方电子商务有限公司',
    totalAmount: 850_000,
    paymentPlans: [
      { period: 1, expectedDate: '2026-04-15', amount: 340_000, percentage: 40 },
      { period: 2, expectedDate: '2026-06-15', amount: 255_000, percentage: 30 },
      { period: 3, expectedDate: '2026-07-15', amount: 255_000, percentage: 30 },
    ],
    collectionRecords: [{ amount: 340_000, date: '2026-04-16' }],
  },
  {
    id: 'c4', contractNo: 'HT202601004', contractName: '智能制造 MES 系统', customerName: '华夏制造集团',
    totalAmount: 1_500_000,
    paymentPlans: [
      { period: 1, expectedDate: '2026-02-15', amount: 900_000, percentage: 60 },
      { period: 2, expectedDate: '2026-05-15', amount: 450_000, percentage: 30 },
      { period: 3, expectedDate: '2026-07-01', amount: 150_000, percentage: 10 },
    ],
    collectionRecords: [{ amount: 900_000, date: '2026-02-18' }],
  },
  {
    id: 'c5', contractNo: 'HT202601005', contractName: '医疗健康 APP', customerName: '康健医疗科技',
    totalAmount: 550_000,
    paymentPlans: [
      { period: 1, expectedDate: '2026-05-10', amount: 275_000, percentage: 50 },
      { period: 2, expectedDate: '2026-07-10', amount: 275_000, percentage: 50 },
    ],
    collectionRecords: [],
  },
];

// ---------- 工具 ----------

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function buildMilestones(plans: PaymentPlanItem[], collectionRecords: { amount: number; date: string }[]): MilestoneStatus[] {
  const today = new Date('2026-07-02');
  if (!plans || plans.length === 0) return [];

  return plans.map((plan, idx) => {
    const isPaid = collectionRecords.reduce((s, r) => s + r.amount, 0) >= plans.slice(0, idx + 1).reduce((s, p) => s + p.amount, 0);
    const expectedDate = plan.expectedDate || addMonths('2026-01-15', idx * 2);
    const daysUntil = Math.ceil((new Date(expectedDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let status: MilestoneStatus['status'] = 'normal';
    if (isPaid) status = 'paid';
    else if (daysUntil < 0) status = 'overdue';
    else if (daysUntil <= 14) status = 'upcoming';

    const receivedAmount = isPaid ? plan.amount : 0;

    return { ...plan, expectedDate, status, daysUntil, receivedAmount };
  });
}

// ---------- 主组件 ----------

export function PaymentForecast() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedContractId, setSelectedContractId] = useState(forecastContracts[0]?.id || '');

  const selectedContract = forecastContracts.find(c => c.id === selectedContractId);

  // 为每个合同生成回款节点状态
  const contractMilestones = useMemo(() => {
    return forecastContracts.map(contract => {
      const milestones = buildMilestones(contract.paymentPlans, contract.collectionRecords || []);
      const totalReceived = milestones.filter(m => m.status === 'paid').reduce((s, m) => s + m.amount, 0);
      const overdueCount = milestones.filter(m => m.status === 'overdue').length;
      const upcomingCount = milestones.filter(m => m.status === 'upcoming').length;
      return { contract, milestones, totalReceived, overdueCount, upcomingCount };
    });
  }, []);

  // 汇总
  const summary = useMemo(() => {
    const totalAmount = forecastContracts.reduce((s, c) => s + c.totalAmount, 0);
    const totalReceived = contractMilestones.reduce((s, cm) => s + cm.totalReceived, 0);
    const totalOverdue = contractMilestones.reduce((s, cm) => s + cm.milestones.filter(m => m.status === 'overdue').reduce((ms, m) => ms + m.amount, 0), 0);
    const riskContracts = contractMilestones.filter(cm => cm.overdueCount > 0 || cm.upcomingCount > 0).length;
    return { totalAmount, totalReceived, totalOverdue, riskContracts, totalContracts: forecastContracts.length };
  }, [contractMilestones]);

  // 现金流预测（3/6/12 个月）
  const forecast = useMemo(() => {
    const months = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'];
    return months.map(month => {
      let incoming = 0;
      let riskCount = 0;
      let contractCount = 0;

      contractMilestones.forEach(cm => {
        cm.milestones.forEach(m => {
          if (monthKey(m.expectedDate) === month && m.status !== 'paid') {
            incoming += m.amount;
            contractCount++;
            if (m.status === 'overdue' || m.status === 'upcoming') riskCount++;
          }
        });
      });

      return { month, incoming, contractCount, riskCount };
    });
  }, [contractMilestones]);

  const selectedMilestones = selectedContract
    ? contractMilestones.find(cm => cm.contract.id === selectedContractId)
    : null;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 摘要栏 */}
      <Row gutter={16}>
        <Col span={4}><Card><Statistic title="合同总数" value={summary.totalContracts} suffix="个" prefix={<IconFile style={{ color: 'rgb(var(--primary-6))' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="合同总额" value={summary.totalAmount} prefix={<IconFile style={{ color: 'var(--primary)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="已回款" value={summary.totalReceived} prefix={<IconCheckCircle style={{ color: 'var(--success-500)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="逾期金额" value={summary.totalOverdue} prefix={<IconExclamationCircle style={{ color: 'var(--destructive-500)' }} />} valueStyle={{ color: summary.totalOverdue > 0 ? 'var(--destructive-500)' : 'var(--success-500)' }} /></Card></Col>
        <Col span={4}><Card><Statistic title="风险合同" value={summary.riskContracts} suffix="个" prefix={<IconClockCircle style={{ color: 'var(--warning-500)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="回款进度" value={Math.round((summary.totalReceived / Math.max(summary.totalAmount, 1)) * 100)} suffix="%" prefix={<IconExperiment style={{ color: 'var(--chart-5)' }} />} /></Card></Col>
      </Row>

      {/* 主体 Tab */}
      <Card bordered={false}>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="overview" title={<span><IconFile /> 单合同回款看板</span>} />
          <TabPane key="forecast" title={<span><IconCalendar /> 现金流预测</span>} />
          <TabPane key="gantt" title={<span><IconExperiment /> 付款节点甘特图</span>} />
        </Tabs>

        <div style={{ paddingTop: 16 }}>
          {/* 单合同回款看板 Tab */}
          {activeTab === 'overview' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontWeight: 500, marginRight: 8 }}>选择合同：</span>
                <Select value={selectedContractId} onChange={setSelectedContractId} style={{ width: 300 }}>
                  {forecastContracts.map(c => (
                    <SelectOption key={c.id} value={c.id}>{c.contractName || c.id}</SelectOption>
                  ))}
                </Select>
              </div>

              {selectedContract && selectedMilestones && (
                <div>
                  {/* 合同摘要 */}
                  <Card size="small" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Title heading={5} style={{ margin: 0 }}>{selectedContract.contractName}</Title>
                        <Typography.Text type="secondary">{selectedContract.customerName} · {selectedContract.contractNo}</Typography.Text>
                      </div>
                      <Space>
                        <Tag color="blue">总额 {formatCurrency(selectedContract.totalAmount)}</Tag>
                        <Tag color="green">已回 {formatCurrency(selectedMilestones.totalReceived)}</Tag>
                        {selectedMilestones.overdueCount > 0 && (
                          <Tag color="red">逾期 {selectedMilestones.overdueCount} 期</Tag>
                        )}
                      </Space>
                    </div>
                    <Progress
                      percent={Math.round((selectedMilestones.totalReceived / Math.max(selectedContract.totalAmount, 1)) * 100)}
                      color={selectedMilestones.overdueCount > 0 ? 'var(--destructive-500)' : 'var(--primary)'}
                      style={{ marginTop: 12 }}
                    />
                  </Card>

                  {/* 节点列表 */}
                  <Table
                    columns={[
                      { title: '期数', dataIndex: 'period', width: 50, render: (v: number) => `第${v}期` },
                      {
                        title: '状态', dataIndex: 'status', width: 80,
                        render: (s: string) => {
                          const map: Record<string, { label: string; color: string }> = {
                            paid: { label: '已付', color: 'var(--success-500)' },
                            overdue: { label: '逾期', color: 'var(--destructive-500)' },
                            upcoming: { label: '即将到期', color: 'var(--warning-500)' },
                            normal: { label: '正常', color: 'var(--primary)' },
                          };
                          const m = map[s] || map.normal;
                          return <Tag color={m.color}>{m.label}</Tag>;
                        },
                      },
                      { title: '计划日期', dataIndex: 'expectedDate', width: 110 },
                      {
                        title: '天数', dataIndex: 'daysUntil', width: 80,
                        render: (v: number, row: MilestoneStatus) => {
                          if (row.status === 'paid') return <span style={{ color: 'var(--color-text-3)' }}>—</span>;
                          if (v < 0) return <span style={{ color: 'var(--destructive-500)', fontWeight: 600 }}>逾期 {Math.abs(v)} 天</span>;
                          if (v <= 7) return <span style={{ color: 'var(--warning-500)', fontWeight: 600 }}>{v} 天后</span>;
                          return <span>{v} 天后</span>;
                        },
                      },
                      { title: '计划金额', dataIndex: 'amount', width: 100, render: (v: number) => formatCurrency(v) },
                      { title: '已回', dataIndex: 'receivedAmount', width: 100, render: (v: number) => v > 0 ? <span style={{ color: 'var(--success-500)', fontWeight: 600 }}>{formatCurrency(v)}</span> : '—' },
                      { title: '比例', dataIndex: 'percentage', width: 60, render: (v: number) => `${v}%` },
                    ] as any}
                    data={selectedMilestones.milestones}
                    rowKey="period"
                    pagination={false}
                  />
                </div>
              )}
            </div>
          )}

          {/* 现金流预测 Tab */}
          {activeTab === 'forecast' && (
            <div>
              {summary.totalOverdue > 0 && (
                <Alert
                  type="warning"
                  content={`当前有 ${formatCurrency(summary.totalOverdue)} 逾期未收回，建议优先跟进。`}
                  style={{ marginBottom: 16 }}
                  icon={<IconExclamationCircle />}
                />
              )}
              <Table
                columns={[
                  { title: '月份', dataIndex: 'month', width: 100 },
                  {
                    title: '预计回款', dataIndex: 'incoming', width: 140,
                    render: (v: number) => <span style={{ fontWeight: 700, color: v > 0 ? 'var(--primary)' : 'var(--color-text-3)' }}>{formatCurrency(v)}</span>,
                  },
                  { title: '涉及合同数', dataIndex: 'contractCount', width: 100, render: (v: number) => `${v} 个` },
                  {
                    title: '风险节点', dataIndex: 'riskCount', width: 100,
                    render: (v: number) => v > 0 ? <Tag color="orange">{v} 个</Tag> : <Tag color="green">无</Tag>,
                  },
                  {
                    title: '累计回款', width: 140,
                    render: (_: unknown, row: MonthlyForecast, index: number) => {
                      const cumulative = forecast.slice(0, index + 1).reduce((s, f) => s + f.incoming, 0);
                      return <span style={{ fontWeight: 600 }}>{formatCurrency(cumulative)}</span>;
                    },
                  },
                ] as any}
                data={forecast}
                rowKey="month"
                pagination={false}
              />
            </div>
          )}

          {/* 甘特图 Tab */}
          {activeTab === 'gantt' && (
            <GanttChart contractMilestones={contractMilestones} />
          )}
        </div>
      </Card>
    </Space>
  );
}

// ============================================================
// 甘特图组件
// ============================================================

interface GanttChartProps {
  contractMilestones: {
    contract: { id: string; contractName?: string; totalAmount: number };
    milestones: MilestoneStatus[];
    totalReceived: number;
  }[];
}

function GanttChart({ contractMilestones }: GanttChartProps) {
  // 时间范围：2026-02 ~ 2026-09
  const months = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  const chartWidth = 800;
  const leftMargin = 180;
  const rightMargin = 20;
  const rowHeight = 48;
  const headerHeight = 36;

  const totalWidth = leftMargin + chartWidth + rightMargin;

  // 将日期转换为 X 坐标
  const dateToX = (dateStr: string): number => {
    const d = new Date(dateStr);
    const start = new Date('2026-02-01').getTime();
    const end = new Date('2026-10-01').getTime();
    const pct = (d.getTime() - start) / (end - start);
    return leftMargin + pct * chartWidth;
  };

  const colors: Record<string, string> = {
    paid: 'var(--success-500)',
    overdue: 'var(--destructive-500)',
    upcoming: 'var(--warning-500)',
    normal: 'var(--primary)',
  };

  return (
    <div>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        付款节点甘特图 — 横轴为时间轴，每个色块代表一个付款节点，位置对应计划日期
      </Typography.Text>

      <div style={{ overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: 8 }}>
        <svg width={totalWidth} height={headerHeight + contractMilestones.length * rowHeight + 20} style={{ display: 'block' }}>
          {/* 月份刻度 */}
          {months.map((m, i) => {
            const x = leftMargin + (i / (months.length - 1)) * chartWidth;
            return (
              <g key={m}>
                <line x1={x} y1={0} x2={x} y2={headerHeight + contractMilestones.length * rowHeight} stroke="var(--color-border)" strokeOpacity={0.3} strokeDasharray={i === 0 ? '' : '2,4'} />
                <text x={x} y={headerHeight - 8} textAnchor="middle" fontSize={11} fill="var(--color-text-2)" fontWeight={500}>{m}</text>
              </g>
            );
          })}

          {/* 今日线 */}
          {(() => {
            const x = dateToX('2026-07-02');
            return (
              <g>
                <line x1={x} y1={headerHeight - 4} x2={x} y2={headerHeight + contractMilestones.length * rowHeight} stroke="var(--destructive-500)" strokeWidth={2} strokeDasharray="4,3" />
                <text x={x} y={headerHeight - 14} textAnchor="middle" fontSize={10} fill="var(--destructive-500)" fontWeight={600}>今日</text>
              </g>
            );
          })()}

          {/* 合同行 */}
          {contractMilestones.map((cm, rowIdx) => {
            const y = headerHeight + rowIdx * rowHeight;
            return (
              <g key={cm.contract.id}>
                {/* 合同名 */}
                <text x={leftMargin - 10} y={y + rowHeight / 2 + 4} textAnchor="end" fontSize={12} fill="var(--color-text-1)" fontWeight={600}>
                  {cm.contract.contractName?.slice(0, 12) || cm.contract.id}
                </text>

                {/* 基线 */}
                <line x1={leftMargin} y1={y + rowHeight / 2} x2={leftMargin + chartWidth} y2={y + rowHeight / 2} stroke="var(--color-border)" strokeOpacity={0.4} />

                {/* 节点 */}
                {cm.milestones.map(m => {
                  const x = dateToX(m.expectedDate);
                  return (
                    <g key={m.period}>
                      {/* 节点圆点 */}
                      <circle cx={x} cy={y + rowHeight / 2} r={m.status === 'overdue' ? 8 : 6} fill={colors[m.status]} opacity={m.status === 'paid' ? 0.5 : 1} />
                      {/* 期数标签 */}
                      <text x={x} y={y + rowHeight / 2 - 12} textAnchor="middle" fontSize={10} fill={colors[m.status]} fontWeight={700}>
                        P{m.period}
                      </text>
                      {/* 金额标签 */}
                      <text x={x} y={y + rowHeight / 2 + 20} textAnchor="middle" fontSize={9} fill="var(--color-text-3)">
                        {(m.amount / 10000).toFixed(0)}万
                      </text>
                    </g>
                  );
                })}

                {/* 连接线（从上一期到本期） */}
                {cm.milestones.slice(1).map((m, i) => {
                  const prevX = dateToX(cm.milestones[i].expectedDate);
                  const currX = dateToX(m.expectedDate);
                  return (
                    <line key={`line-${i}`} x1={prevX} y1={y + rowHeight / 2} x2={currX} y2={y + rowHeight / 2} stroke={colors[m.status]} strokeWidth={1.5} strokeOpacity={0.4} />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 图例 */}
      <div style={{ display: 'flex', gap: 24, marginTop: 16, padding: '12px 16px', background: 'var(--color-fill-1)', borderRadius: 8 }}>
        {[
          { label: '已付', color: 'var(--success-500)' },
          { label: '逾期', color: 'var(--destructive-500)' },
          { label: '即将到期（14天内）', color: 'var(--warning-500)' },
          { label: '正常', color: 'var(--primary)' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: item.color }} />
            <span style={{ fontSize: 12 }}>{item.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 2, background: 'var(--destructive-500)', borderTop: '2px dashed var(--destructive-500)' }} />
          <span style={{ fontSize: 12 }}>今日（2026-07-02）</span>
        </div>
      </div>
    </div>
  );
}
