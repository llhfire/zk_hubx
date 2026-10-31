import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Button, Dropdown, Menu, Message, Result, Space, Tabs, Typography } from '@/design-system';
import {
  IconDownload,
  IconPrinter,
  IconSettings,
} from '@/design-system';
import {
  Chart,
  DataTable,
  DateText,
  MoneyText,
  PageShell,
  MetricGrid,
  ProcessOverview,
  SectionTabs,
  SectionCard,
  SplitLayout,
  SplitLayoutAside,
  SplitLayoutMain,
  StatusTag,
  resolveStatus,
  type StatusMap,
  DescriptionsCard,
} from '@/design-system';
import { useCollections } from '../../../../collections/CollectionContext';
import { useContracts } from '../../../sales/contracts/ContractsContext';
import {
  assembleCaseMetrics,
  buildLifecycleTrack,
  canTransit,
  CASE_STATUS_TRANSITIONS,
  deriveTrend,
} from '../calc';
import { getCollections, getContract, getPaymentPlans, getSupplementSummaries } from '../contractSeam';
import { caseStatusMap, mockCases, mockCostItems, mockPostMortems } from '../mockData';
import { getEvalSummaries, getQuoteSummaries } from '../quoteSeam';
import type { SupplementContractSummary } from '../types';
import { CaseStatus } from '../types';
import { buildBriefRows, downloadCsv, toCsv } from './detail/briefExport';
import { ManageParamsModal } from './detail/ManageParamsModal';
import './caseDetail.css';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

const ROLE_LABELS: Record<string, string> = {
  pm_days: '产品经理',
  ui_days: 'UI 设计',
  fe_days: '前端开发',
  be_days: '后端开发',
  qa_days: '测试',
  arch_days: '架构',
  algo_days: '算法',
  embed_days: '嵌入式',
  dba_days: 'DBA',
  ops_days: '运维',
};

const TAB_LABELS: Record<string, string> = {
  overview: '经营概览',
  eval: '工时评估',
  quotation: '报价单',
  costs: '成本归集',
  'post-mortem': '项目决算',
};

const STATUS_TASKS: Record<CaseStatus, string> = {
  drafting: '完善业务对象与经营参数，确认后进入报价。',
  quoting: '核对工时评估与报价单，形成可供商务协商的报价依据。',
  negotiating: '跟进客户协商结果，确认范围、金额与合同条件。',
  signed: '确认主合同与补充合同，准备进入项目交付。',
  in_progress: '持续关注成本、EAC、回款与 WIP，及时处理经营风险。',
  suspended: '记录挂起原因与恢复条件，控制新增成本。',
  accepting: '推进成果验收，核对待收款期次与剩余成本。',
  collecting: '跟进逾期或待收款项，完成项目经营收口。',
  completed: '业务单已完结，可查看项目决算与经验沉淀。',
  terminated: '业务单已终止，仅保留过程数据与经营记录。',
};

const HEALTH_STATUS: StatusMap<'green' | 'yellow' | 'red'> = {
  green: { label: '健康', tone: 'success' },
  yellow: { label: '预警', tone: 'warning' },
  red: { label: '风险', tone: 'danger' },
};

const QUOTATION_STATUS: StatusMap<string> = {
  draft: { label: '草稿', tone: 'neutral' },
  reviewing: { label: '审批中', tone: 'info' },
  approved: { label: '已审批', tone: 'success' },
  sent: { label: '已发送', tone: 'info' },
  accepted: { label: '已接受', tone: 'success' },
  rejected: { label: '已拒绝', tone: 'danger' },
};

const COST_ITEM_STATUS: StatusMap<'actual' | 'forecast'> = {
  actual: { label: '已发生', tone: 'success' },
  forecast: { label: '预测', tone: 'info' },
};

// 成本构成是并列类别：颜色按固定类别顺序取系列色，数据里不再存色值。
// 顺序固定，某个类别缺数据时后面的类别不会串色。
const COST_CATEGORY_ORDER = ['labor', 'travel', 'promotion', 'commercial', 'third_party'] as const;
const costColor = (category: string) => {
  const index = COST_CATEGORY_ORDER.indexOf(category as (typeof COST_CATEGORY_ORDER)[number]);
  return index < 0 ? Chart.tone.neutral : Chart.series(index);
};

const COST_LABELS: Record<string, string> = {
  labor: '人工',
  travel: '差旅',
  promotion: '推广',
  commercial: '商务',
  third_party: '第三方',
};

interface CaseParams {
  targetMargin: number;
  budgetCap: number;
  commercialCap: number;
}

function percent(value: number | null): string {
  return value === null ? '-' : `${(value * 100).toFixed(1)}%`;
}

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { contracts } = useContracts();
  const { collections: ledgerEntries } = useCollections();
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => requestedTab && TAB_LABELS[requestedTab] ? requestedTab : 'overview');
  const [expandedFeatureLists, setExpandedFeatureLists] = useState<Set<string>>(new Set());
  const [expandedQuotations, setExpandedQuotations] = useState<Set<string>>(new Set());
  const [costStructureView, setCostStructureView] = useState<'actual' | 'forecast'>('actual');
  const [paramsVisible, setParamsVisible] = useState(false);
  const [statusOverrides, setStatusOverrides] = useState<Partial<Record<string, CaseStatus>>>({});
  const [parameterOverrides, setParameterOverrides] = useState<Record<string, CaseParams>>({});

  const caseData = useMemo(() => mockCases.find((item) => item.id === id), [id]);
  // id 是路由参数（string | undefined）。不要写成 `id && overrides[id]`：
  // id 为空串时该表达式求值为 ""，会污染整个状态类型（原先 17 处报错都源于此）。
  const currentStatus: CaseStatus = (id ? statusOverrides[id] : undefined) ?? caseData?.status ?? CaseStatus.DRAFTING;
  const currentParams: CaseParams = (id ? parameterOverrides[id] : undefined) ?? {
    targetMargin: caseData?.targetMargin ?? 30,
    budgetCap: caseData?.budgetCap ?? 0,
    commercialCap: caseData?.commercialCap ?? 0,
  };

  const supplements: SupplementContractSummary[] = useMemo(
    () => caseData?.extraContractIds ? getSupplementSummaries(caseData.extraContractIds, contracts) : [],
    [caseData, contracts],
  );
  const costItems = useMemo(() => mockCostItems.filter((item) => item.caseId === id), [id]);
  const collections = useMemo(
    () => caseData?.contractId ? getCollections(caseData.contractId, ledgerEntries) : [],
    [caseData, ledgerEntries],
  );
  const paymentPlans = useMemo(
    () => caseData?.contractId ? getPaymentPlans(caseData.contractId, contracts) : [],
    [caseData, contracts],
  );
  const mainAmount = useMemo(() => {
    if (!caseData?.contractId) return 0;
    const contract = getContract(caseData.contractId, contracts) as { current?: { totalAmount?: number }; totalAmount?: number } | undefined;
    return contract?.current?.totalAmount ?? contract?.totalAmount ?? 0;
  }, [caseData, contracts]);
  const metrics = useMemo(() => {
    if (!caseData) return null;
    return assembleCaseMetrics(
      { ...caseData, ...currentParams, status: currentStatus },
      costItems,
      mainAmount,
      supplements,
      collections,
      paymentPlans,
      new Date().toISOString().slice(0, 10),
    );
  }, [caseData, collections, costItems, currentParams, currentStatus, mainAmount, paymentPlans, supplements]);

  const evalSummaries = useMemo(() => getEvalSummaries(), []);
  const quotations = useMemo(() => getQuoteSummaries(), []);
  const postMortem = useMemo(() => mockPostMortems.find((item) => item.caseId === id), [id]);
  const costTrends = useMemo(
    () => caseData?.contractId ? deriveTrend(paymentPlans, collections, costItems) : [],
    [caseData, collections, costItems, paymentPlans],
  );
  const lifecycleNodes = useMemo(
    () => buildLifecycleTrack(currentStatus, supplements),
    [currentStatus, supplements],
  );
  const costStructureData = useMemo(() => {
    if (!metrics) return { actual: [], forecast: [] };
    const entries = Object.entries(metrics.costStructure);
    const toChart = (key: 'actual' | 'forecast') => {
      const total = entries.reduce((sum, [, value]) => sum + value[key], 0);
      return entries
        .filter(([, value]) => value[key] > 0)
        .map(([category, value]) => ({
          category: COST_LABELS[category] ?? category,
          amount: value[key],
          percentage: total > 0 ? Math.round((value[key] / total) * 1000) / 10 : 0,
          color: costColor(category),
        }));
    };
    return { actual: toChart('actual'), forecast: toChart('forecast') };
  }, [metrics]);

  if (!caseData || !metrics) {
    return (
      <PageShell
        className="case-detail"
        breadcrumbs={[
          { label: '精益交付' },
          { label: '业务单管理', to: '/financial-delivery/cases' },
          { label: '未找到' },
        ]}
      >
        <SectionCard className="case-detail__state">
          <Result
            status="404"
            title="未找到业务单"
            subTitle="该业务单不存在或已被移除。"
            extra={<Button type="primary" onClick={() => navigate('/financial-delivery/cases')}>返回业务单列表</Button>}
          />
        </SectionCard>
      </PageShell>
    );
  }

  const transitions = CASE_STATUS_TRANSITIONS[currentStatus] ?? [];
  const currentStep = Math.max(0, lifecycleNodes.findIndex((node) => node.current));
  const health = HEALTH_STATUS[metrics.health];
  const targetMarginRatio = currentParams.targetMargin / 100;
  const costBudgetOverrun = currentParams.budgetCap > 0 && metrics.eac > currentParams.budgetCap;

  const handleStatusChange = (target: CaseStatus) => {
    if (!canTransit(currentStatus, target)) {
      Message.error('当前状态不能执行该推进');
      return;
    }
    caseData.status = target;
    setStatusOverrides((current) => ({ ...current, [caseData.id]: target }));
    Message.success(`状态已推进至：${caseStatusMap[target]?.label ?? target}`);
  };

  const handleSaveParams = (params: CaseParams) => {
    caseData.targetMargin = params.targetMargin;
    caseData.budgetCap = params.budgetCap;
    caseData.commercialCap = params.commercialCap;
    setParameterOverrides((current) => ({ ...current, [caseData.id]: params }));
    setParamsVisible(false);
    Message.success('管理参数已保存');
  };

  const handleExport = () => {
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
    downloadCsv(`经营简报-${caseData.caseNo}.csv`, toCsv(rows));
  };

  const toggleExpand = (set: Set<string>, targetId: string, setter: (value: Set<string>) => void) => {
    const next = new Set(set);
    next.has(targetId) ? next.delete(targetId) : next.add(targetId);
    setter(next);
  };

  const statusAction = transitions.length > 0 ? (
    <Dropdown
      droplist={(
        <Menu onClickMenuItem={(key) => handleStatusChange(key as CaseStatus)}>
          {transitions.map((target) => (
            <Menu.Item key={target}>{caseStatusMap[target]?.label ?? target}</Menu.Item>
          ))}
        </Menu>
      )}
    >
      <Button type="primary" size="small">状态推进</Button>
    </Dropdown>
  ) : null;

  return (
    <PageShell
      className="case-detail"
      breadcrumbs={[
        { label: '精益交付' },
        { label: '业务单管理', to: '/financial-delivery/cases' },
        { label: caseData.caseNo },
      ]}
    >
      <ProcessOverview
        identifier={caseData.caseNo}
        title={caseData.projectName || caseData.leadName || '未命名业务单'}
        tags={(
          <>
            <StatusTag meta={resolveStatus(caseStatusMap, currentStatus)} />
            <StatusTag meta={health} />
            {caseData.industry && <StatusTag>{caseData.industry}</StatusTag>}
          </>
        )}
        actions={(
          <>
            <Button size="small" icon={<IconDownload />} onClick={handleExport}>导出经营简报</Button>
            <Button size="small" icon={<IconPrinter />} onClick={() => window.print()}>打印</Button>
            <Button size="small" icon={<IconSettings />} onClick={() => setParamsVisible(true)}>管理参数</Button>
            {statusAction}
          </>
        )}
        steps={lifecycleNodes.map((node) => ({
          key: node.status,
          title: node.label,
          description: node.supplementCount > 0 ? `${node.supplementCount} 份补充合同` : undefined,
        }))}
        currentStep={currentStep}
      />

      <MetricGrid
        items={[
          { key: 'contract', label: '有效标的额', value: <MoneyText value={metrics.contractAmount} />, detail: `1 主 ${supplements.length} 补` },
          { key: 'cost', label: '已发生成本', value: <MoneyText value={metrics.totalCost} />, detail: <>预算 <MoneyText value={currentParams.budgetCap} /></>, tone: costBudgetOverrun ? 'danger' : 'neutral' },
          { key: 'eac', label: '完工估算 EAC', value: <MoneyText value={metrics.eac} />, detail: <>预测净利润 <MoneyText value={metrics.contractAmount - metrics.eac} /></>, tone: costBudgetOverrun ? 'danger' : 'warning' },
          { key: 'revenue', label: '累计回款', value: <MoneyText value={metrics.revenue} />, detail: `实收利润率 ${percent(metrics.collectedMargin)}`, tone: metrics.revenue > 0 ? 'success' : 'neutral' },
          { key: 'margin', label: '全周期利润率', value: percent(metrics.lifecycleMargin), detail: `目标 ${currentParams.targetMargin}%`, tone: metrics.lifecycleMargin !== null && metrics.lifecycleMargin >= targetMarginRatio ? 'success' : 'danger' },
          { key: 'wip', label: 'WIP 资金占用', value: <MoneyText value={metrics.wip.value} />, detail: `${metrics.wip.days} 天`, tone: metrics.wip.days > 14 ? 'warning' : 'neutral' },
        ]}
      />

      <SplitLayout>
        <SplitLayoutMain>
          <SectionCard className="case-detail__tabs-card">
            <SectionTabs
              activeKey={activeTab}
              onChange={(tab) => {
                          setActiveTab(tab);
                          const next = new URLSearchParams(searchParams);
                          if (tab === 'overview') next.delete('tab'); else next.set('tab', tab);
                          setSearchParams(next, { replace: true });
                        }}
              items={[
                {
                  key: 'overview',
                  label: "概览",
                  content: (
                    <>
                              <div className="case-detail__tab-panel case-detail__content-stack">
                                <SectionCard title="业务档案">
                                  <DescriptionsCard
                                    columns={2}
                                    items={[
                                    { key: '线索名称', label: '线索名称', value: caseData.leadName || '-' },
                                    { key: '项目名称', label: '项目名称', value: caseData.projectName || '-' },
                                    { key: '行业', label: '行业', value: caseData.industry || '-' },
                                    { key: '项目类型', label: '项目类型', value: caseData.projectType || '-' },
                                    { key: '计划周期', label: '计划周期', value: caseData.durationDays ? `${caseData.durationDays} 天` : '-' },
                                    { key: '技术栈', label: '技术栈', value: caseData.techStack?.join('、') || '-' },
                                  ]}
                                  />
                                </SectionCard>
              
                                <SectionCard title="经营指标拆解">
                                  <DescriptionsCard
                                    columns={2}
                                    items={[
                                    { key: '预测净利润', label: '预测净利润', value: <MoneyText value={metrics.contractAmount - metrics.eac} /> },
                                    { key: '实收利润率', label: '实收利润率', value: percent(metrics.collectedMargin) },
                                    { key: '目标利润率', label: '目标利润率', value: `${currentParams.targetMargin}%` },
                                    { key: '成本预算上限', label: '成本预算上限', value: <MoneyText value={currentParams.budgetCap} /> },
                                    { key: '商务费用', label: '商务费用', value: <><MoneyText value={metrics.commercialOverrun.commercialActual} /> / <MoneyText value={currentParams.commercialCap} /></> },
                                    { key: '经营健康度', label: '经营健康度', value: <StatusTag meta={health} /> },
                                  ]}
                                  />
                                </SectionCard>
              
                                {(costStructureData.actual.length > 0 || costStructureData.forecast.length > 0) && (
                                  <SectionCard
                                    title="成本结构"
                                    extra={(
                                      <Space>
                                        <Button size="mini" type={costStructureView === 'actual' ? 'primary' : 'default'} onClick={() => setCostStructureView('actual')}>已发生</Button>
                                        <Button size="mini" type={costStructureView === 'forecast' ? 'primary' : 'default'} onClick={() => setCostStructureView('forecast')}>含预测</Button>
                                      </Space>
                                    )}
                                  >
                                    <div className="case-detail__cost-layout">
                                      <Chart.Canvas height={240}>
                                        <Chart.PieChart>
                                          {/* recharts 会把原始数据项字段一并透传给 label，但 `PieLabelRenderProps`
                                              只声明了 name/percent 等标准字段。这里按真实数据形状补充声明；
                                              不要改成读 `name`/`percent`——数据里的 percentage 是 0-100，不是 0-1。 */}
                                          <Chart.Pie
                                            data={costStructureData[costStructureView]}
                                            dataKey="amount"
                                            nameKey="category"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={78}
                                            label={(props) => {
                                              const row = props as typeof props & { category: string; percentage: number };
                                              return `${row.category} ${row.percentage}%`;
                                            }}
                                          >
                                            {costStructureData[costStructureView].map((entry) => <Chart.Cell key={entry.category} fill={entry.color} />)}
                                          </Chart.Pie>
                                          <Chart.Tooltip formatter={(value) => <MoneyText value={Number(value)} />} />
                                        </Chart.PieChart>
                                      </Chart.Canvas>
                                      <div className="case-detail__cost-legend">
                                        {costStructureData[costStructureView].map((entry) => (
                                          <div key={entry.category} className="case-detail__legend-row">
                                            <Space>
                                              <span className="case-detail__legend-swatch" style={{ background: entry.color }} />
                                              <Text>{entry.category}</Text>
                                            </Space>
                                            <Text><MoneyText value={entry.amount} />（{entry.percentage}%）</Text>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </SectionCard>
                                )}
              
                                {costTrends.length > 0 && (
                                  <SectionCard title="收入与成本趋势">
                                    <Chart.Canvas height={280}>
                                      <Chart.LineChart data={costTrends} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                                        <Chart.Grid />
                                        <Chart.XAxis dataKey="month" />
                                        <Chart.YAxis tickFormatter={(value: number) => `${Math.round(value / 1000)}k`} />
                                        <Chart.Tooltip formatter={(value) => <MoneyText value={Number(value)} />} />
                                        <Chart.Legend />
                                        <Chart.Line dataKey="receivable" name="应收" stroke={Chart.tone.primary} strokeWidth={2} dot={false} />
                                        <Chart.Line dataKey="collected" name="实收" stroke={Chart.tone.success} strokeWidth={2} dot={false} />
                                        <Chart.Line dataKey="cost" name="累计成本" stroke={Chart.tone.danger} strokeWidth={2} dot={false} />
                                      </Chart.LineChart>
                                    </Chart.Canvas>
                                  </SectionCard>
                                )}
                              </div>
                            
                    </>
                  ),
                },
                {
                  key: 'eval',
                  label: `工时评估 (${evalSummaries.length})`,
                  content: (
                    <>
                              <div className="case-detail__tab-panel">
                                <SectionCard title="工时评估（报价域 EvalSheet）" extra={<Text type="secondary">共 {evalSummaries.length} 份</Text>}>
                                  {evalSummaries.length > 0 ? evalSummaries.map((evaluation, index) => (
                                    <SectionCard
                                      key={evaluation.id}
                                      size="small"
                                      className={index === evalSummaries.length - 1 ? 'case-detail__expand-card case-detail__expand-card--current' : 'case-detail__expand-card'}
                                    >
                                      <button
                                        type="button"
                                        className="case-detail__expand-trigger"
                                        onClick={() => toggleExpand(expandedFeatureLists, evaluation.id, setExpandedFeatureLists)}
                                      >
                                        <Space wrap>
                                          <StatusTag tone={index === evalSummaries.length - 1 ? 'info' : 'neutral'}>{evaluation.quoteNo}</StatusTag>
                                          <Text className="case-detail__expand-title">{evaluation.projectName}</Text>
                                          <Text type="secondary">{evaluation.totalDays} 天</Text>
                                        </Space>
                                        <Space>
                                          <Text type="secondary"><DateText value={evaluation.createdAt} /></Text>
                                          <span>{expandedFeatureLists.has(evaluation.id) ? '▼' : '▶'}</span>
                                        </Space>
                                      </button>
                                      {expandedFeatureLists.has(evaluation.id) && (
                                        <div className="case-detail__expand-content">
                                          <DataTable
                                            size="small"
                                            rowKey="role"
                                            pagination={false}
                                            emptyDescription="暂无岗位工时"
                                            data={Object.entries(evaluation.evalDays).map(([role, days]) => ({ role, label: ROLE_LABELS[role] ?? role, days }))}
                                            columns={[
                                              { title: '岗位', dataIndex: 'label', width: 160 },
                                              { title: '人天', dataIndex: 'days', width: 100, render: (value: number) => `${value} 天` },
                                            ]}
                                          />
                                        </div>
                                      )}
                                    </SectionCard>
                                  )) : <div className="case-detail__empty">暂无工时评估</div>}
                                </SectionCard>
                              </div>
                            
                    </>
                  ),
                },
                {
                  key: 'quotation',
                  label: `报价单 (${quotations.length})`,
                  content: (
                    <>
                              <div className="case-detail__tab-panel">
                                <SectionCard title="报价单" extra={<Text type="secondary">共 {quotations.length} 份</Text>}>
                                  {quotations.length > 0 ? quotations.map((quotation) => (
                                    <SectionCard key={quotation.id} size="small" className="case-detail__expand-card">
                                      <button
                                        type="button"
                                        className="case-detail__expand-trigger"
                                        onClick={() => toggleExpand(expandedQuotations, quotation.id, setExpandedQuotations)}
                                      >
                                        <Space wrap>
                                          <StatusTag meta={resolveStatus(QUOTATION_STATUS, quotation.status)} />
                                          <Text className="case-detail__expand-title">{quotation.projectName}</Text>
                                          <Text type="secondary">{quotation.quoteNo}</Text>
                                        </Space>
                                        <Space>
                                          <Text type="secondary"><MoneyText value={quotation.totalAmount} /></Text>
                                          <span>{expandedQuotations.has(quotation.id) ? '▼' : '▶'}</span>
                                        </Space>
                                      </button>
                                      {expandedQuotations.has(quotation.id) && (
                                        <div className="case-detail__expand-content">
                                          <DescriptionsCard
                                            columns={3}
                                            items={[
                                            { key: '报价单号', label: '报价单号', value: quotation.quoteNo },
                                            { key: '状态', label: '状态', value: resolveStatus(QUOTATION_STATUS, quotation.status).label },
                                            { key: '金额', label: '金额', value: <MoneyText value={quotation.totalAmount} /> },
                                          ]}
                                          />
                                        </div>
                                      )}
                                    </SectionCard>
                                  )) : <div className="case-detail__empty">暂无报价单</div>}
                                </SectionCard>
                              </div>
                            
                    </>
                  ),
                },
                {
                  key: 'costs',
                  label: `成本归集 (${costItems.length})`,
                  content: (
                    <>
                              <div className="case-detail__tab-panel">
                                <SectionCard title="成本明细">
                                  <DataTable
                                    size="small"
                                    rowKey="id"
                                    pagination={{ pageSize: 20 }}
                                    data={costItems}
                                    scroll={{ x: 720 }}
                                    emptyDescription="暂无成本明细"
                                    columns={[
                                      { title: '分类', dataIndex: 'costCategory', width: 90, render: (value: string) => COST_LABELS[value] ?? value },
                                      { title: '类型', dataIndex: 'costType', width: 120 },
                                      { title: '金额', dataIndex: 'amount', width: 110, align: 'right', render: (value: number) => <MoneyText value={value} /> },
                                      { title: '状态', dataIndex: 'status', width: 90, render: (value: 'actual' | 'forecast') => <StatusTag meta={COST_ITEM_STATUS[value]} /> },
                                      { title: '日期', dataIndex: 'date', width: 110, render: (value: string) => <DateText value={value} /> },
                                      { title: '描述', dataIndex: 'description', width: 220 },
                                    ]}
                                  />
                                </SectionCard>
                              </div>
                            
                    </>
                  ),
                },
                {
                  key: 'post-mortem',
                  label: "项目决算",
                  content: (
                    <>
                              <div className="case-detail__tab-panel">
                                <SectionCard title="项目决算">
                                  {postMortem ? (
                                    <div>
                                      <Title heading={6} className="case-detail__section-title">根因分析</Title>
                                      <DataTable
                                        size="small"
                                        pagination={false}
                                        className="case-detail__root-cause-table"
                                        data={postMortem.rootCauses}
                                        rowKey="description"
                                        emptyDescription="暂无根因数据"
                                        columns={[
                                          { title: '类别', dataIndex: 'category', width: 110, render: (value: string) => <StatusTag>{value === 'scope_creep' ? '需求变更' : value === 'quality_issue' ? '质量问题' : value === 'efficiency' ? '效率问题' : value}</StatusTag> },
                                          { title: '描述', dataIndex: 'description' },
                                          { title: '影响金额', dataIndex: 'impact', width: 120, align: 'right', render: (value: number) => <MoneyText value={value} /> },
                                          { title: '置信度', dataIndex: 'confidence', width: 100, render: (value: number) => `${(value * 100).toFixed(0)}%` },
                                        ]}
                                      />
                                      <Title heading={6} className="case-detail__section-title">经验教训</Title>
                                      <ul className="case-detail__lessons">
                                        {postMortem.lessonsLearned.map((lesson) => <li key={lesson}>{lesson}</li>)}
                                      </ul>
                                    </div>
                                  ) : <div className="case-detail__empty">暂无决算数据</div>}
                                </SectionCard>
                              </div>
                            
                    </>
                  ),
                },
              ]}
            />
          </SectionCard>
        </SplitLayoutMain>

        <SplitLayoutAside>
          <SectionCard title="当前处理">
            <Space direction="vertical" size={12} className="case-detail__aside-stack">
              <div>
                <Text type="secondary">当前阶段</Text>
                <div className="case-detail__aside-value">
                  <StatusTag meta={resolveStatus(caseStatusMap, currentStatus)} />
                </div>
              </div>
              <Text>{STATUS_TASKS[currentStatus]}</Text>
              <div>
                <Text type="secondary">当前工作区</Text>
                <div className="case-detail__aside-value">{TAB_LABELS[activeTab]}</div>
              </div>
              {transitions.length > 0 && (
                <div>
                  <Text type="secondary">可推进至</Text>
                  <div className="case-detail__tag-list">
                    {transitions.map((target) => <StatusTag key={target}>{caseStatusMap[target]?.label ?? target}</StatusTag>)}
                  </div>
                </div>
              )}
            </Space>
          </SectionCard>

          <SectionCard title="业务关联">
            <DescriptionsCard
              columns={1}
              items={[
              { key: '线索', label: '线索', value: caseData.leadName || '-' },
              { key: '项目', label: '项目', value: caseData.projectName || '尚未立项' },
              { key: '报价', label: '报价', value: `${quotations.length} 份` },
              { key: '合同', label: '合同', value: `${caseData.contractId ? 1 : 0} 主 ${supplements.length} 补` },
              { key: '成本流水', label: '成本流水', value: `${costItems.length} 条` },
            ]}
            />
          </SectionCard>

          <SectionCard title="风险与参数" extra={<Button type="text" size="mini" onClick={() => setParamsVisible(true)}>调整</Button>}>
            <DescriptionsCard
              columns={1}
              items={[
              { key: '健康状态', label: '健康状态', value: <StatusTag meta={health} /> },
              { key: '目标利润率', label: '目标利润率', value: `${currentParams.targetMargin}%` },
              { key: '预算上限', label: '预算上限', value: <MoneyText value={currentParams.budgetCap} /> },
              { key: '商务费用上限', label: '商务费用上限', value: <MoneyText value={currentParams.commercialCap} /> },
              { key: '商务费用使用', label: '商务费用使用', value: <StatusTag tone={metrics.commercialOverrun.overrun ? 'danger' : 'success'}><MoneyText value={metrics.commercialOverrun.commercialActual} /></StatusTag> },
              { key: 'WIP 账龄', label: 'WIP 账龄', value: `${metrics.wip.days} 天` },
            ]}
            />
          </SectionCard>

          <SectionCard title="时间信息">
            <DescriptionsCard
              columns={1}
              items={[
              { key: '创建时间', label: '创建时间', value: <DateText value={caseData.createdAt} /> },
              { key: '最近更新', label: '最近更新', value: <DateText value={caseData.updatedAt} /> },
              { key: '计划周期', label: '计划周期', value: caseData.durationDays ? `${caseData.durationDays} 天` : '-' },
            ]}
            />
          </SectionCard>
        </SplitLayoutAside>
      </SplitLayout>

      <ManageParamsModal
        visible={paramsVisible}
        targetMargin={currentParams.targetMargin}
        budgetCap={currentParams.budgetCap}
        commercialCap={currentParams.commercialCap}
        onSave={handleSaveParams}
        onCancel={() => setParamsVisible(false)}
      />
    </PageShell>
  );
}
