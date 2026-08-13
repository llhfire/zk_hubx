import { useState, useMemo } from 'react';
import {
  Card,
  Grid,
  Statistic,
  Table,
  Button,
  Space,
  Tag,
  Tabs,
  Typography,
  Progress,
  Select,
} from '@arco-design/web-react';
import {
  IconExperiment,
  IconArrowRight,
  IconUser,
  IconFile,
  IconTrophy,
  IconCalendar,
} from '@arco-design/web-react/icon';

const Row = Grid.Row;
const Col = Grid.Col;
const TabPane = Tabs.TabPane;
const Title = Typography.Title;
const SelectOption = Select.Option;

// ---------- 类型 ----------

interface FunnelData {
  stage: string;
  value: number;
  unit: string;
  conversionRate?: number;
}

interface ChannelROI {
  channel: string;
  spend: number;
  leads: number;
  customers: number;
  contracts: number;
  revenue: number;
  roi: number;
  leadCost: number;
  conversionRate: number;
}

interface PersonROI {
  name: string;
  department: string;
  leads: number;
  followedLeads: number;
  customers: number;
  contracts: number;
  contractAmount: number;
  conversionRate: number;
}

interface ProjectROI {
  projectName: string;
  projectType: string;
  contractAmount: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  duration: number;
}

// ---------- 模拟数据 ----------

const funnelData: FunnelData[] = [
  { stage: '广告消耗',   value: 180000, unit: '元' },
  { stage: '线索获取',   value: 320,    unit: '条' },
  { stage: '有效线索',   value: 210,    unit: '条', conversionRate: 65.6 },
  { stage: '客户转化',   value: 48,     unit: '个', conversionRate: 22.9 },
  { stage: '签约合同',   value: 35,     unit: '个', conversionRate: 72.9 },
  { stage: '项目完成',   value: 28,     unit: '个', conversionRate: 80.0 },
  { stage: '项目利润',   value: 2450000, unit: '元' },
];

const channelROI: ChannelROI[] = [
  { channel: '百度推广', spend: 68000,  leads: 120, customers: 18, contracts: 14, revenue: 4200000, roi: 5176,  leadCost: 567,  conversionRate: 15.0 },
  { channel: '抖音',     spend: 52000,  leads: 95,  customers: 12, contracts: 9,  revenue: 2800000, roi: 5285,  leadCost: 547,  conversionRate: 12.6 },
  { channel: '小红书',   spend: 28000,  leads: 55,  customers: 8,  contracts: 6,  revenue: 1500000, roi: 5257,  leadCost: 509,  conversionRate: 14.5 },
  { channel: '微信推广', spend: 18000,  leads: 30,  customers: 6,  contracts: 4,  revenue: 1200000, roi: 6567,  leadCost: 600,  conversionRate: 20.0 },
  { channel: '淘宝',     spend: 14000,  leads: 20,  customers: 4,  contracts: 2,  revenue: 600000,  roi: 4186,  leadCost: 700,  conversionRate: 20.0 },
];

const personROI: PersonROI[] = [
  { name: '张三', department: '销售部', leads: 85, followedLeads: 78, customers: 15, contracts: 12, contractAmount: 3600000, conversionRate: 17.6 },
  { name: '钱七', department: '销售部', leads: 72, followedLeads: 65, customers: 12, contracts: 10, contractAmount: 2800000, conversionRate: 16.7 },
  { name: '周九', department: '销售部', leads: 58, followedLeads: 50, customers: 8,  contracts: 6,  contractAmount: 1800000, conversionRate: 13.8 },
  { name: '杨帆', department: '销售部', leads: 45, followedLeads: 38, customers: 5,  contracts: 3,  contractAmount: 900000,  conversionRate: 11.1 },
  { name: '李四', department: '技术部', leads: 30, followedLeads: 25, customers: 4,  contracts: 2,  contractAmount: 600000,  conversionRate: 13.3 },
  { name: '王五', department: '销售部', leads: 30, followedLeads: 22, customers: 4,  contracts: 2,  contractAmount: 500000,  conversionRate: 13.3 },
];

const projectROI: ProjectROI[] = [
  { projectName: '企业管理系统开发', projectType: '软件开发', contractAmount: 1200000, totalCost: 680000,  profit: 520000,  profitMargin: 43.3, duration: 90 },
  { projectName: '云服务平台项目',   projectType: '软件开发', contractAmount: 2000000, totalCost: 1100000, profit: 900000,  profitMargin: 45.0, duration: 120 },
  { projectName: '电商平台小程序',   projectType: '小程序',   contractAmount: 850000,  totalCost: 420000,  profit: 430000,  profitMargin: 50.6, duration: 60 },
  { projectName: '智能制造 MES',    projectType: '软件开发', contractAmount: 1500000, totalCost: 950000,  profit: 550000,  profitMargin: 36.7, duration: 150 },
  { projectName: '医疗健康 APP',    projectType: '移动应用', contractAmount: 550000,  totalCost: 280000,  profit: 270000,  profitMargin: 49.1, duration: 75 },
  { projectName: '数据分析平台',     projectType: '软件开发', contractAmount: 680000,  totalCost: 350000,  profit: 330000,  profitMargin: 48.5, duration: 45 },
  { projectName: '零售POS系统',     projectType: '软件开发', contractAmount: 360000,  totalCost: 180000,  profit: 180000,  profitMargin: 50.0, duration: 30 },
  { projectName: '物流追踪系统',     projectType: '软件开发', contractAmount: 480000,  totalCost: 320000,  profit: 160000,  profitMargin: 33.3, duration: 60 },
];

// ---------- 主组件 ----------

export function FullChainROI() {
  const [activeTab, setActiveTab] = useState('funnel');
  const [filterPeriod, setFilterPeriod] = useState('2026-Q2');

  const summary = useMemo(() => {
    const totalSpend = channelROI.reduce((s, c) => s + c.spend, 0);
    const totalRevenue = channelROI.reduce((s, c) => s + c.revenue, 0);
    const totalProfit = projectROI.reduce((s, p) => s + p.profit, 0);
    const avgMargin = Math.round(projectROI.reduce((s, p) => s + p.profitMargin, 0) / projectROI.length * 10) / 10;
    const totalLeads = channelROI.reduce((s, c) => s + c.leads, 0);
    return { totalSpend, totalRevenue, totalProfit, avgMargin, totalLeads };
  }, []);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 摘要栏 */}
      <Row gutter={16}>
        <Col span={4}><Card><Statistic title="广告总消耗" value={summary.totalSpend} prefix="¥" icon={<IconExperiment style={{ color: 'var(--warning-500)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="总营收" value={summary.totalRevenue} prefix="¥" icon={<IconTrophy style={{ color: 'var(--success-500)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="总利润" value={summary.totalProfit} prefix="¥" icon={<IconFile style={{ color: 'var(--primary)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="平均利润率" value={summary.avgMargin} suffix="%" icon={<IconCalendar style={{ color: 'var(--chart-5)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="总线索数" value={summary.totalLeads} suffix="条" icon={<IconUser style={{ color: 'var(--primary)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="整体ROI" value={Math.round((summary.totalProfit / Math.max(summary.totalSpend, 1)) * 100)} suffix="%" icon={<IconArrowRight style={{ color: 'var(--info-500)' }} />} /></Card></Col>
      </Row>

      {/* 主体 Tab */}
      <Card bordered={false}>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="funnel" title={<span><IconArrowRight /> 漏斗分析</span>} />
          <TabPane key="channel" title={<span><IconExperiment /> 渠道 ROI</span>} />
          <TabPane key="person" title={<span><IconUser /> 人员 ROI</span>} />
          <TabPane key="project" title={<span><IconFile /> 项目 ROI</span>} />
        </Tabs>

        <div style={{ paddingTop: 16 }}>
          {/* 漏斗分析 Tab */}
          {activeTab === 'funnel' && (
            <div>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 500 }}>时间周期：</span>
                <Select value={filterPeriod} onChange={setFilterPeriod} style={{ width: 140 }}>
                  <SelectOption value="2026-Q1">2026 Q1</SelectOption>
                  <SelectOption value="2026-Q2">2026 Q2</SelectOption>
                  <SelectOption value="2026-H1">2026 上半年</SelectOption>
                </Select>
              </div>

              <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, padding: '20px 0' }}>
                {funnelData.map((stage, idx) => (
                  <div key={stage.stage} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    {/* 转化率箭头 */}
                    {idx > 0 && idx < funnelData.length - 1 && (
                      <div style={{ position: 'absolute', top: 20, left: -12, color: 'var(--color-text-3)', fontSize: 18 }}>→</div>
                    )}
                    {/* 数值 */}
                    <div style={{ fontSize: 20, fontWeight: 700, color: idx === funnelData.length - 1 ? 'var(--success-500)' : 'var(--primary)' }}>
                      {stage.unit === '元' ? `¥${(stage.value / 10000).toFixed(0)}万` : stage.value}
                    </div>
                    {/* 单位 */}
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>{stage.unit}</div>
                    {/* 阶段名 */}
                    <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'center', marginBottom: 8 }}>{stage.stage}</div>
                    {/* 转化率 */}
                    {stage.conversionRate !== undefined && (
                      <Tag color="blue" style={{}} size="small">
                        转化率 {stage.conversionRate}%
                      </Tag>
                    )}
                    {/* 漏斗宽度可视化 */}
                    <div style={{
                      width: `${100 - idx * 10}%`,
                      height: 8,
                      borderRadius: 4,
                      background: `linear-gradient(90deg, oklch(from var(--primary) l c h / ${1 - idx * 0.12}), oklch(from var(--primary) l c h / ${0.7 - idx * 0.1}))`,
                      marginTop: 8,
                    }} />
                  </div>
                ))}
              </div>

              {/* 关键指标 */}
              <Row gutter={16} style={{ marginTop: 24 }}>
                <Col span={6}>
                  <Card size="small" style={{ background: 'var(--color-fill-1)' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>单条线索成本</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>¥{Math.round(180000 / 320)}</div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ background: 'var(--color-fill-1)' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>单客户获客成本</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>¥{Math.round(180000 / 48)}</div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ background: 'var(--color-fill-1)' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>平均合同金额</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>¥{Math.round(10600000 / 35 / 10000)}万</div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ background: 'var(--color-fill-1)' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>投入产出比</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success-500)' }}>1 : {Math.round(10600000 / 180000 * 10) / 10}</div>
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          {/* 渠道 ROI Tab */}
          {activeTab === 'channel' && (
            <Table
              columns={[
                { title: '渠道', dataIndex: 'channel', width: 100, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                { title: '投放消耗', dataIndex: 'spend', width: 100, render: (v: number) => `¥${v.toLocaleString()}`, sorter: (a: ChannelROI, b: ChannelROI) => a.spend - b.spend },
                { title: '线索数', dataIndex: 'leads', width: 70 },
                { title: '客户数', dataIndex: 'customers', width: 70 },
                { title: '合同数', dataIndex: 'contracts', width: 70 },
                { title: '营收', dataIndex: 'revenue', width: 110, render: (v: number) => `¥${(v / 10000).toFixed(0)}万` },
                { title: '单线索成本', dataIndex: 'leadCost', width: 100, render: (v: number) => `¥${v}` },
                { title: '转化率', dataIndex: 'conversionRate', width: 80, render: (v: number) => <Progress percent={v} size="small" /> },
                {
                  title: 'ROI', dataIndex: 'roi', width: 100,
                  render: (v: number) => <Tag color={v > 5000 ? 'var(--success-500)' : v > 3000 ? 'var(--warning-500)' : 'var(--destructive-500)'} style={{ fontWeight: 600 }}>{v}%</Tag>,
                  sorter: (a: ChannelROI, b: ChannelROI) => a.roi - b.roi,
                },
              ] as any}
              data={channelROI}
              rowKey="channel"
              pagination={false}
            />
          )}

          {/* 人员 ROI Tab */}
          {activeTab === 'person' && (
            <Table
              columns={[
                { title: '姓名', dataIndex: 'name', width: 70, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                { title: '部门', dataIndex: 'department', width: 70 },
                { title: '线索数', dataIndex: 'leads', width: 70 },
                { title: '跟进数', dataIndex: 'followedLeads', width: 70 },
                { title: '客户数', dataIndex: 'customers', width: 70 },
                { title: '合同数', dataIndex: 'contracts', width: 70 },
                { title: '合同金额', dataIndex: 'contractAmount', width: 110, render: (v: number) => `¥${(v / 10000).toFixed(0)}万` },
                {
                  title: '转化率', dataIndex: 'conversionRate', width: 100,
                  render: (v: number) => <Progress percent={v * 3} size="small" color={v > 15 ? 'var(--success-500)' : v > 12 ? 'var(--warning-500)' : 'var(--destructive-500)'} />,
                  sorter: (a: PersonROI, b: PersonROI) => a.conversionRate - b.conversionRate,
                },
              ] as any}
              data={personROI}
              rowKey="name"
              pagination={false}
            />
          )}

          {/* 项目 ROI Tab */}
          {activeTab === 'project' && (
            <Table
              columns={[
                { title: '项目', dataIndex: 'projectName', width: 160, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                { title: '类型', dataIndex: 'projectType', width: 80, render: (v: string) => <Tag>{v}</Tag> },
                { title: '合同额', dataIndex: 'contractAmount', width: 100, render: (v: number) => `¥${(v / 10000).toFixed(0)}万` },
                { title: '总成本', dataIndex: 'totalCost', width: 100, render: (v: number) => `¥${(v / 10000).toFixed(0)}万` },
                { title: '利润', dataIndex: 'profit', width: 100, render: (v: number) => <span style={{ fontWeight: 600, color: 'var(--success-500)' }}>¥{(v / 10000).toFixed(0)}万</span> },
                {
                  title: '利润率', dataIndex: 'profitMargin', width: 100,
                  render: (v: number) => <Tag color={v >= 45 ? 'var(--success-500)' : v >= 35 ? 'var(--warning-500)' : 'var(--destructive-500)'} >{v}%</Tag>,
                  sorter: (a: ProjectROI, b: ProjectROI) => a.profitMargin - b.profitMargin,
                },
                { title: '工期(天)', dataIndex: 'duration', width: 80 },
                {
                  title: '月利润率', width: 100,
                  render: (_: unknown, row: ProjectROI) => {
                    const monthlyRate = Math.round(row.profitMargin / row.duration * 30 * 10) / 10;
                    return <span style={{ fontSize: 12 }}>{monthlyRate}%/月</span>;
                  },
                },
              ] as any}
              data={projectROI}
              rowKey="projectName"
              pagination={false}
            />
          )}
        </div>
      </Card>
    </Space>
  );
}
