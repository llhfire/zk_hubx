import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Card, Button, Tag, Tabs, Table, Space, Typography, Grid,
  Message, Progress, Descriptions, Dropdown, Menu,
} from '@arco-design/web-react';
import {
  IconLeft, IconDownload, IconPrinter, IconSettings,
  IconUp, IconDown, IconCheckCircle, IconExclamationCircle,
} from '@arco-design/web-react/icon';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  mockCases, mockCostItems, mockPostMortems,
  quotationStatusMap, CaseStatus, caseStatusMap,
} from '../mockData';
import {
  deriveTotalCost, deriveEac, deriveLifecycleMargin, deriveCollectedMargin,
  deriveWip, deriveHealth, deriveCostStructure, deriveTrend, deriveContractAmount,
  canTransit, CASE_STATUS_TRANSITIONS, assembleCaseMetrics,
} from '../calc';
import { getContract, totalCollected, getPaymentPlans, getCollections, getSupplementSummaries } from '../contractSeam';
import { getQuoteSummaries, getEvalSummaries } from '../quoteSeam';
import { StatusTrack } from './detail/StatusTrack';
import { ManageParamsModal } from './detail/ManageParamsModal';
import { buildBriefRows, toCsv, downloadCsv } from './detail/briefExport';
import type { SupplementContractSummary } from '../types';

const { Text, Title } = Typography;
const { Row, Col } = Grid;
const { TabPane } = Tabs;

const STATUS_COLORS: Record<string, string> = {
  drafting: 'gray', quoting: 'blue', negotiating: 'blue', signed: 'green',
  in_progress: 'green', suspended: 'orange', accepting: 'cyan',
  collecting: 'purple', completed: 'green', terminated: 'red',
};

const ROLE_LABELS: Record<string, string> = {
  pm_days: '产品经理', ui_days: 'UI 设计', fe_days: '前端开发', be_days: '后端开发',
  qa_days: '测试', arch_days: '架构', algo_days: '算法', embed_days: '嵌入式',
  dba_days: 'DBA', ops_days: '运维',
};

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expandedFeatureLists, setExpandedFeatureLists] = useState<Set<string>>(new Set());
  const [expandedQuotations, setExpandedQuotations] = useState<Set<string>>(new Set());
  const [costStructureView, setCostStructureView] = useState<'actual' | 'forecast'>('actual');
  const [paramsVisible, setParamsVisible] = useState(false);

  // Case 数据
  const caseData = useMemo(() => mockCases.find((item) => item.id === id), [id]);

  // 补充合同摘要
  const supplements: SupplementContractSummary[] = useMemo(
    () => caseData?.extraContractIds ? getSupplementSummaries(caseData.extraContractIds) : [],
    [caseData],
  );

  // 成本项
  const costItems = useMemo(() => mockCostItems.filter((item) => item.caseId === id), [id]);

  // 回款数据
  const collections = useMemo(
    () => caseData?.contractId ? getCollections(caseData.contractId) : [],
    [caseData],
  );
  const paymentPlans = useMemo(
    () => caseData?.contractId ? getPaymentPlans(caseData.contractId) : [],
    [caseData],
  );

  // 主合同金额
  const mainAmount = useMemo(() => {
    if (!caseData?.contractId) return 0;
    const contract = getContract(caseData.contractId) as any;
    return contract?.totalAmount ?? 0;
  }, [caseData]);

  // 汇总指标
  const metrics = useMemo(() => {
    if (!caseData) return null;
    const today = new Date().toISOString().slice(0, 10);
    return assembleCaseMetrics(caseData, costItems, mainAmount, supplements, collections, paymentPlans, today);
  }, [caseData, costItems, mainAmount, supplements, collections, paymentPlans]);

  // 工时评估/报价/事后总结
  const evalSummaries = useMemo(() => getEvalSummaries(), []);
  const quotations = useMemo(() => getQuoteSummaries(), []);
  const postMortem = useMemo(() => mockPostMortems.find((item) => item.caseId === id), [id]);

  // 成本趋势
  const costTrends = useMemo(() => {
    if (!caseData?.contractId) return [];
    return deriveTrend(paymentPlans, collections, costItems);
  }, [caseData, paymentPlans, collections, costItems]);

  // 成本结构图表数据
  const costStructureData = useMemo(() => {
    if (!metrics) return { actual: [], forecast: [] };
    const COLORS: Record<string, string> = {
      labor: '#1e40af', travel: '#06b6d4', promotion: '#8b5cf6',
      commercial: '#3b82f6', third_party: '#93c5fd',
    };
    const LABELS: Record<string, string> = {
      labor: '人工', travel: '差旅', promotion: '推广',
      commercial: '商务', third_party: '第三方',
    };
    const toChart = (entries: [string, { actual: number; forecast: number }][], key: 'actual' | 'forecast') => {
      const total = entries.reduce((s, [, v]) => s + v[key], 0);
      return entries.filter(([, v]) => v[key] > 0).map(([cat, v]) => ({
        category: LABELS[cat] ?? cat,
        amount: v[key],
        percentage: total > 0 ? Math.round((v[key] / total) * 1000) / 10 : 0,
        color: COLORS[cat] ?? '#ccc',
      }));
    };
    const entries = Object.entries(metrics.costStructure);
    return { actual: toChart(entries, 'actual'), forecast: toChart(entries, 'forecast') };
  }, [metrics]);

  // === Guard ===
  if (!caseData) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Title heading={4}>未找到业务单</Title>
        <Button style={{ marginTop: 16 }} onClick={() => navigate('/financial-delivery/cases')}>返回列表</Button>
      </div>
    );
  }

  // 状态推进
  const transitions = CASE_STATUS_TRANSITIONS[caseData.status] ?? [];

  const handleStatusChange = async (target: CaseStatus) => {
    Message.success(`状态已推进至：${caseStatusMap[target]?.label ?? target}`);
  };

  // CSV 导出
  const handleExport = () => {
    if (!metrics) return;
    const rows = buildBriefRows({
      caseNo: caseData.caseNo,
      contractAmount: metrics.contractAmount,
      totalCost: metrics.totalCost,
      eac: metrics.eac,
      lifecycleMargin: metrics.lifecycleMargin,
      collectedMargin: metrics.collectedMargin,
      wipValue: metrics.wip.value,
      wipDays: metrics.wip.days,
      health: metrics.health,
      commercialActual: metrics.commercialOverrun.commercialActual,
      commercialCap: metrics.commercialOverrun.cap,
    });
    const csv = toCsv(rows);
    downloadCsv(`经营简报-${caseData.caseNo}.csv`, csv);
  };

  const toggleExpand = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  return (
    <div style={{ padding: 0 }}>
      {/* === 顶栏 === */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Button icon={<IconLeft />} onClick={() => navigate('/financial-delivery/cases')}>返回</Button>
          <Title heading={4} style={{ margin: 0 }}>{caseData.caseNo}</Title>
          <Tag color={STATUS_COLORS[caseData.status] ?? 'blue'}>
            {caseStatusMap[caseData.status]?.label ?? caseData.status}
          </Tag>
          {/* 健康徽标 */}
          {metrics && (
            <Tag
              color={metrics.health === 'green' ? 'green' : metrics.health === 'yellow' ? 'orange' : 'red'}
              icon={metrics.health === 'green' ? <IconCheckCircle /> : <IconExclamationCircle />}
            >
              {metrics.health === 'green' ? '健康' : metrics.health === 'yellow' ? '预警' : '风险'}
            </Tag>
          )}
          {/* 关联计数 */}
          <Text type="secondary" style={{ fontSize: 12 }}>
            报价 {quotations.length} / 合同 {1 + supplements.length} / 成本 {costItems.length}
          </Text>
        </Space>
        <Space>
          <Button icon={<IconDownload />} onClick={handleExport}>导出经营简报</Button>
          <Button icon={<IconPrinter />} onClick={() => window.print()}>打印</Button>
          <Button icon={<IconSettings />} onClick={() => setParamsVisible(true)}>管理参数</Button>
          {/* 状态推进 */}
          {transitions.length > 0 && (
            <Dropdown
              droplist={
                <Menu onClickMenuItem={(key) => handleStatusChange(key as CaseStatus)}>
                  {transitions.map((t) => (
                    <Menu.Item key={t}>{caseStatusMap[t]?.label ?? t}</Menu.Item>
                  ))}
                </Menu>
              }
            >
              <Button type="primary">状态推进 ▾</Button>
            </Dropdown>
          )}
        </Space>
      </div>

      {/* === 生命周期轨迹 === */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <StatusTrack status={caseData.status} supplements={supplements} />
      </Card>

      {/* === Tabs === */}
      <Tabs defaultActiveTab="overview">
        {/* 概览 */}
        <TabPane key="overview" title="概览">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title="基本信息">
              <Descriptions
                column={3}
                data={[
                  { label: '业务单编号', value: caseData.caseNo },
                  { label: '状态', value: <Tag color={STATUS_COLORS[caseData.status]}>{caseStatusMap[caseData.status]?.label}</Tag> },
                  { label: '健康状态', value: metrics ? <Tag color={metrics.health === 'green' ? 'green' : metrics.health === 'yellow' ? 'orange' : 'red'}>{metrics.health === 'green' ? '健康' : metrics.health === 'yellow' ? '预警' : '风险'}</Tag> : '-' },
                  { label: '线索名称', value: caseData.leadName || '-' },
                  { label: '项目名称', value: caseData.projectName || '-' },
                  { label: '标的额', value: metrics?.contractAmount ? `¥${metrics.contractAmount.toLocaleString()}` : '-' },
                  { label: '行业', value: caseData.industry || '-' },
                  { label: '项目类型', value: caseData.projectType || '-' },
                  { label: '技术栈', value: caseData.techStack?.join(', ') || '-' },
                ]}
              />
            </Card>

            <Card title="财务指标">
              <Row gutter={24}>
                <Col span={6}><div style={{ marginBottom: 4 }}><Text type="secondary">标的额</Text></div><div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{(metrics?.contractAmount ?? 0).toLocaleString()}</div></Col>
                <Col span={6}><div style={{ marginBottom: 4 }}><Text type="secondary">已发生成本</Text></div><div style={{ fontSize: 24, fontWeight: 'bold', color: '#f53f3f' }}>¥{(metrics?.totalCost ?? 0).toLocaleString()}</div></Col>
                <Col span={6}><div style={{ marginBottom: 4 }}><Text type="secondary">累计回款</Text></div><div style={{ fontSize: 24, fontWeight: 'bold', color: '#00b42a' }}>¥{(metrics?.contractAmount ? totalCollected(caseData.contractId ?? '') : 0).toLocaleString()}</div></Col>
                <Col span={6}><div style={{ marginBottom: 4 }}><Text type="secondary">全周期利润率</Text></div><div style={{ fontSize: 24, fontWeight: 'bold', color: (metrics?.lifecycleMargin ?? 0) >= 0.3 ? '#00b42a' : (metrics?.lifecycleMargin ?? 0) >= 0.2 ? '#fa8c16' : '#f53f3f' }}>{metrics?.lifecycleMargin !== null && metrics?.lifecycleMargin !== undefined ? `${(metrics.lifecycleMargin * 100).toFixed(1)}%` : '-'}</div></Col>
              </Row>
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e5e6eb' }}>
                <Title heading={6} style={{ marginBottom: 16 }}>预测指标（EAC）</Title>
                <Row gutter={16}>
                  <Col span={6}><Card size="small"><div style={{ marginBottom: 4 }}><Text type="secondary">EAC</Text></div><div style={{ fontSize: 18, fontWeight: 'bold' }}>¥{(metrics?.eac ?? 0).toLocaleString()}</div></Card></Col>
                  <Col span={6}><Card size="small"><div style={{ marginBottom: 4 }}><Text type="secondary">WIP</Text></div><div style={{ fontSize: 18, fontWeight: 'bold' }}>¥{(metrics?.wip.value ?? 0).toLocaleString()}</div><div style={{ fontSize: 12, color: '#86909c' }}>{metrics?.wip.days ?? 0} 天</div></Card></Col>
                  <Col span={6}><Card size="small"><div style={{ marginBottom: 4 }}><Text type="secondary">预测净利润</Text></div><div style={{ fontSize: 18, fontWeight: 'bold' }}>¥{((metrics?.contractAmount ?? 0) - (metrics?.eac ?? 0)).toLocaleString()}</div></Card></Col>
                  <Col span={6}><Card size="small"><div style={{ marginBottom: 4 }}><Text type="secondary">目标利润率</Text></div><div style={{ fontSize: 18, fontWeight: 'bold' }}>{caseData.targetMargin ?? 30}%</div></Card></Col>
                </Row>
              </div>
            </Card>

            {/* 成本结构饼图 */}
            {costStructureData.actual.length > 0 && (
              <Card title="成本结构">
                <Space style={{ marginBottom: 16 }}>
                  <Button size="small" type={costStructureView === 'actual' ? 'primary' : 'default'} onClick={() => setCostStructureView('actual')}>已发生</Button>
                  <Button size="small" type={costStructureView === 'forecast' ? 'primary' : 'default'} onClick={() => setCostStructureView('forecast')}>含预测</Button>
                </Space>
                <Row gutter={16}>
                  <Col span={12}>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={costStructureData[costStructureView]} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, percentage }) => `${category} ${percentage}%`}>
                          {costStructureData[costStructureView].map((entry: any, i: number) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Col>
                  <Col span={12}>
                    {costStructureData[costStructureView].map((entry: any) => (
                      <div key={entry.category} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <Space><div style={{ width: 12, height: 12, borderRadius: 2, background: entry.color }} /><Text>{entry.category}</Text></Space>
                        <Text>¥{entry.amount.toLocaleString()} ({entry.percentage}%)</Text>
                      </div>
                    ))}
                  </Col>
                </Row>
              </Card>
            )}
          </div>
        </TabPane>

        {/* 工时评估 */}
        <TabPane key="eval" title={`工时评估 (${evalSummaries.length})`}>
          <Card title="工时评估（报价域 EvalSheet）" extra={<Text type="secondary">共 {evalSummaries.length} 份</Text>}>
            {evalSummaries.length > 0 ? evalSummaries.map((ev, index) => (
              <Card key={ev.id} size="small" style={{ marginBottom: 12, background: index === evalSummaries.length - 1 ? '#f2f3ff' : '#f7f8fa', border: index === evalSummaries.length - 1 ? '1px solid #bedaff' : '1px solid #e5e6eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => toggleExpand(expandedFeatureLists, ev.id, setExpandedFeatureLists)}>
                  <Space><Tag color={index === 0 ? 'gray' : 'blue'}>{ev.quoteNo}</Tag><Text style={{ fontWeight: 500 }}>{ev.projectName}</Text><Text type="secondary">{ev.totalDays}天</Text></Space>
                  <Space><Text type="secondary">{new Date(ev.createdAt).toLocaleDateString()}</Text><span>{expandedFeatureLists.has(ev.id) ? '▼' : '▶'}</span></Space>
                </div>
                {expandedFeatureLists.has(ev.id) && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e6eb' }}>
                    <Table size="small" rowKey="role" pagination={false} data={Object.entries(ev.evalDays).map(([key, days]) => ({ role: key, label: ROLE_LABELS[key] ?? key, days }))}
                      columns={[{ title: '岗位', dataIndex: 'label', width: 120 }, { title: '人天', dataIndex: 'days', width: 80, render: (v: number) => `${v}天` }]} />
                  </div>
                )}
              </Card>
            )) : <div style={{ textAlign: 'center', padding: '40px 0', color: '#86909c' }}>暂无工时评估</div>}
          </Card>
        </TabPane>

        {/* 报价单 */}
        <TabPane key="quotation" title={`报价单 (${quotations.length})`}>
          <Card title="报价单" extra={<Text type="secondary">共 {quotations.length} 份</Text>}>
            {quotations.length > 0 ? quotations.map((q) => (
              <Card key={q.id} size="small" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => toggleExpand(expandedQuotations, q.id, setExpandedQuotations)}>
                  <Space><Tag color={quotationStatusMap[q.status]?.color}>{quotationStatusMap[q.status]?.label}</Tag><Text style={{ fontWeight: 500 }}>{q.projectName}</Text><Text type="secondary">{q.quoteNo}</Text></Space>
                  <Space><Text type="secondary">¥{q.totalAmount.toLocaleString()}</Text><span>{expandedQuotations.has(q.id) ? '▼' : '▶'}</span></Space>
                </div>
                {expandedQuotations.has(q.id) && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e6eb' }}>
                    <Descriptions column={3} data={[{ label: '报价单号', value: q.quoteNo }, { label: '状态', value: quotationStatusMap[q.status]?.label }, { label: '金额', value: `¥${q.totalAmount.toLocaleString()}` }]} />
                  </div>
                )}
              </Card>
            )) : <div style={{ textAlign: 'center', padding: '40px 0', color: '#86909c' }}>暂无报价单</div>}
          </Card>
        </TabPane>

        {/* 成本归集 */}
        <TabPane key="costs" title={`成本归集 (${costItems.length})`}>
          <Card title="成本明细">
            <Table
              size="small"
              rowKey="id"
              pagination={{ pageSize: 20 }}
              data={costItems}
              columns={[
                { title: '分类', dataIndex: 'costCategory', width: 80, render: (v: string) => ({ labor: '人工', travel: '差旅', promotion: '推广', commercial: '商务', third_party: '第三方' })[v] ?? v },
                { title: '类型', dataIndex: 'costType', width: 120 },
                { title: '金额', dataIndex: 'amount', width: 100, align: 'right', render: (v: number) => `¥${v.toLocaleString()}` },
                { title: '状态', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'actual' ? 'green' : 'blue'}>{v === 'actual' ? '已发生' : '预测'}</Tag> },
                { title: '日期', dataIndex: 'date', width: 100 },
                { title: '描述', dataIndex: 'description' },
              ]}
            />
          </Card>
        </TabPane>

        {/* 项目决算 */}
        <TabPane key="post-mortem" title="项目决算">
          <Card title="项目决算">
            {postMortem ? (
              <div>
                <Title heading={6} style={{ marginBottom: 12 }}>根因分析</Title>
                <Table size="small" pagination={false} style={{ marginBottom: 24 }} data={postMortem.rootCauses} rowKey="description"
                  columns={[
                    { title: '类别', dataIndex: 'category', width: 100, render: (v: string) => <Tag>{v === 'scope_creep' ? '需求变更' : v === 'quality_issue' ? '质量问题' : v === 'efficiency' ? '效率问题' : v}</Tag> },
                    { title: '描述', dataIndex: 'description' },
                    { title: '影响金额', dataIndex: 'impact', width: 120, align: 'right', render: (v: number) => `¥${v.toLocaleString()}` },
                    { title: '置信度', dataIndex: 'confidence', width: 100, render: (v: number) => `${(v * 100).toFixed(0)}%` },
                  ]} />
                <Title heading={6} style={{ marginBottom: 12 }}>经验教训</Title>
                <ul style={{ paddingLeft: 20, marginBottom: 24 }}>
                  {postMortem.lessonsLearned.map((lesson, i) => <li key={i} style={{ marginBottom: 8 }}>{lesson}</li>)}
                </ul>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#86909c' }}>暂无决算数据</div>
            )}
          </Card>
        </TabPane>
      </Tabs>

      {/* 管理参数 Modal */}
      <ManageParamsModal
        visible={paramsVisible}
        targetMargin={caseData.targetMargin ?? 30}
        budgetCap={caseData.budgetCap ?? 0}
        commercialCap={caseData.commercialCap ?? 0}
        onSave={(p) => { setParamsVisible(false); Message.success('参数已保存'); }}
        onCancel={() => setParamsVisible(false)}
      />
    </div>
  );
}
