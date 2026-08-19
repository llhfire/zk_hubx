import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Card,
  Button,
  Tag,
  Tabs,
  Table,
  Space,
  Typography,
  Grid,
  Modal,
  Message,
  Progress,
  Descriptions,
} from '@arco-design/web-react';
import {
  IconLeft,
  IconDownload,
  IconPrinter,
  IconEdit,
  IconInfoCircle,
  IconUp,
  IconDown,
  IconCheckCircle,
  IconExclamationCircle,
} from '@arco-design/web-react/icon';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  mockCases,
  mockFeatureLists,
  mockFeatures,
  mockQuotations,
  mockQuotationFeatureItems,
  mockQuotationServiceItems,
  mockCostItems,
  mockCostTrends,
  mockCostStructures,
  mockForecastCostStructures,
  mockFinancialModels,
  mockPostMortems,
  quotationStatusMap,
  CaseStatus,
  HealthStatus,
  FeatureListStatus,
  QuotationStatus,
  caseStatusMap,
  healthStatusMap,
  featureListStatusMap,
  featureCategoryMap,
  serviceCategoryMap,
} from '../mockData';
import type { FinancialModel } from '../mockData';

const { Text, Title } = Typography;
const { Row, Col } = Grid;
const { TabPane } = Tabs;

// 财务模型详情内容组件
function ModelDetailContent({ model }: { model: FinancialModel }) {
  return (
    <div style={{ padding: 16 }}>
      {/* 基本信息 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div>{model.description}</div>
        <div style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: 500 }}>适用场景：</Text>
          <ul style={{ paddingLeft: 20, marginTop: 4, color: '#86909c' }}>
            {model.applicableScenarios.map((scenario, index) => (
              <li key={index}>{scenario}</li>
            ))}
          </ul>
        </div>
      </Card>

      {/* 设计理念 */}
      <div style={{ marginBottom: 16 }}>
        <Title heading={6} style={{ marginBottom: 8 }}>设计理念</Title>
        <div style={{ whiteSpace: 'pre-wrap' }}>{model.designRationale}</div>
      </div>

      {/* 计算公式 */}
      <div style={{ marginBottom: 16 }}>
        <Title heading={6} style={{ marginBottom: 8 }}>计算公式</Title>
        <div style={{ whiteSpace: 'pre-wrap', background: '#f7f8fa', padding: 12, borderRadius: 8, fontFamily: 'monospace', fontSize: 13 }}>
          {model.calculationFormula}
        </div>
      </div>

      {/* 假设条件 */}
      <div style={{ marginBottom: 16 }}>
        <Title heading={6} style={{ marginBottom: 8 }}>假设条件</Title>
        <ul style={{ paddingLeft: 20 }}>
          {model.assumptions.map((assumption, index) => (
            <li key={index}>{assumption}</li>
          ))}
        </ul>
      </div>

      {/* 局限性 */}
      <div style={{ marginBottom: 16 }}>
        <Title heading={6} style={{ marginBottom: 8 }}>局限性</Title>
        <ul style={{ paddingLeft: 20 }}>
          {model.limitations.map((limitation, index) => (
            <li key={index} style={{ color: '#fa8c16' }}>{limitation}</li>
          ))}
        </ul>
      </div>

      {/* 更新历史 */}
      <div>
        <Title heading={6} style={{ marginBottom: 8 }}>更新历史</Title>
        <Table
          columns={[
            { title: '版本', dataIndex: 'version', width: 80 },
            { title: '日期', dataIndex: 'date', width: 100 },
            { title: '变更内容', dataIndex: 'changes' },
          ]}
          data={model.updateHistory}
          rowKey="version"
          pagination={false}
          size="small"
        />
      </div>
    </div>
  );
}

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedModel, setSelectedModel] = useState<FinancialModel | null>(null);
  const [modelVisible, setModelVisible] = useState(false);
  const [expandedFeatureLists, setExpandedFeatureLists] = useState<Set<string>>(new Set());
  const [expandedQuotations, setExpandedQuotations] = useState<Set<string>>(new Set());
  const [costStructureView, setCostStructureView] = useState<'actual' | 'forecast'>('actual');

  // 获取财务模型数据
  const costModel = useMemo(() => mockFinancialModels['cost-software-outsourcing-tier2'], []);
  const revenueModel = useMemo(() => mockFinancialModels['revenue-software-outsourcing'], []);

  // 获取 Case 数据
  const caseData = useMemo(() => mockCases.find((item) => item.id === id), [id]);

  // 获取功能清单数据
  const featureLists = useMemo(() => mockFeatureLists.filter((item) => item.caseId === id), [id]);

  // 获取报价单数据
  const quotations = useMemo(() => mockQuotations.filter((item) => item.caseId === id), [id]);

  // 获取成本项数据
  const costItems = useMemo(() => mockCostItems.filter((item) => item.caseId === id), [id]);

  // 获取成本趋势数据
  const costTrends = useMemo(() => mockCostTrends[id || ''] || [], [id]);

  // 获取成本结构数据
  const costStructure = useMemo(() => mockCostStructures[id || ''] || [], [id]);
  const forecastCostStructure = useMemo(() => mockForecastCostStructures[id || ''] || [], [id]);

  // 获取事后总结数据
  const postMortem = useMemo(() => mockPostMortems.find((item) => item.caseId === id), [id]);

  // 如果没有找到 Case
  if (!caseData) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Title heading={4}>未找到业务单</Title>
        <Button style={{ marginTop: 16 }} onClick={() => navigate('/financial-delivery/cases')}>
          返回列表
        </Button>
      </div>
    );
  }

  const statusColorMap: Record<string, string> = {
    default: 'blue',
    processing: 'orange',
    success: 'green',
    warning: 'orange',
    error: 'red',
  };

  const toggleFeatureListExpand = (id: string) => {
    setExpandedFeatureLists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleQuotationExpand = (id: string) => {
    setExpandedQuotations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const openModelDetail = (model: FinancialModel) => {
    setSelectedModel(model);
    setModelVisible(true);
  };

  // 渲染概览标签页
  const renderOverviewTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 基本信息 */}
      <Card title="基本信息">
        <Descriptions
          column={3}
          data={[
            { label: '业务单编号', value: caseData.caseNo },
            { label: '状态', value: <Tag color={statusColorMap[caseStatusMap[caseData.status]?.color]}>{caseStatusMap[caseData.status]?.label}</Tag> },
            { label: '健康状态', value: <Tag color={healthStatusMap[caseData.healthStatus]?.color}>{healthStatusMap[caseData.healthStatus]?.label}</Tag> },
            { label: '线索名称', value: caseData.leadName || '-' },
            { label: '项目名称', value: caseData.projectName || '-' },
            { label: '合同金额', value: caseData.contractAmount ? `¥${caseData.contractAmount.toLocaleString()}` : '-' },
            { label: '行业', value: caseData.industry || '-' },
            { label: '项目类型', value: caseData.projectType || '-' },
            { label: '技术栈', value: caseData.techStack?.join(', ') || '-' },
          ]}
        />
      </Card>

      {/* 财务指标 */}
      <Card title="财务指标">
        <Row gutter={24}>
          <Col span={6}>
            <div style={{ marginBottom: 4 }}><Text type="secondary">合同金额</Text></div>
            <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 4 }}>¥{(caseData.contractAmount || 0).toLocaleString()}</div>
            <Button type="text" size="small" onClick={() => openModelDetail(revenueModel)}>
              <IconInfoCircle style={{ marginRight: 4 }} />收入模型说明
            </Button>
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 4 }}><Text type="secondary">已发生成本</Text></div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f53f3f', marginBottom: 4 }}>¥{(caseData.totalCost || 0).toLocaleString()}</div>
            <Button type="text" size="small" onClick={() => openModelDetail(costModel)}>
              <IconInfoCircle style={{ marginRight: 4 }} />成本模型说明
            </Button>
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 4 }}><Text type="secondary">已确认收入</Text></div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#00b42a', marginBottom: 4 }}>¥{(caseData.totalRevenue || 0).toLocaleString()}</div>
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 4 }}><Text type="secondary">当前利润率</Text></div>
            <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 4,
              color: (caseData.currentMargin || 0) >= 30 ? '#00b42a' :
              (caseData.currentMargin || 0) >= 20 ? '#fa8c16' : '#f53f3f' }}>
              {caseData.currentMargin || 0}%
            </div>
          </Col>
        </Row>

        {/* 预测指标 */}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e5e6eb' }}>
          <Title heading={6} style={{ marginBottom: 16 }}>预测指标（EAC）</Title>
          <Row gutter={16}>
            <Col span={6}>
              <Card size="small" style={{ height: '100%' }}>
                <div style={{ marginBottom: 4 }}><Text type="secondary">预测总成本</Text></div>
                <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>¥{(caseData.eac || 0).toLocaleString()}</div>
                <div style={{ fontSize: 12, color: '#86909c' }}>完工估算 (EAC)</div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ height: '100%' }}>
                <div style={{ marginBottom: 4 }}><Text type="secondary">WIP 资金占用</Text></div>
                <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>¥{(caseData.wipValue || 0).toLocaleString()}</div>
                <div style={{ fontSize: 12, color: '#86909c' }}>{caseData.wipDays || 0} 天未验收</div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ height: '100%' }}>
                <div style={{ marginBottom: 4 }}><Text type="secondary">预测净利润</Text></div>
                <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>¥{((caseData.contractAmount || 0) - (caseData.eac || 0)).toLocaleString()}</div>
                <div style={{ fontSize: 12, color: '#86909c' }}>合同金额 - EAC</div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ height: '100%' }}>
                <div style={{ marginBottom: 4 }}><Text type="secondary">预测利润率</Text></div>
                <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>
                  {((1 - (caseData.eac || 0) / (caseData.contractAmount || 1)) * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: 12, color: '#86909c' }}>目标: {caseData.targetMargin || 35}%</div>
              </Card>
            </Col>
          </Row>
        </div>
      </Card>

      {/* 成本与收入趋势图 + 利润率趋势 */}
      {costTrends.length > 0 && (
        <Row gutter={16}>
          <Col span={12}>
            <Card title="成本与收入趋势" style={{ height: '100%' }}>
              {/* 图例 */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12 }}>
                <Space size={4}><div style={{ width: 24, height: 2, background: '#3b82f6' }} /><span>实际成本</span></Space>
                <Space size={4}><div style={{ width: 24, height: 0, borderTop: '2px dashed #3b82f6' }} /><span>预测成本</span></Space>
                <Space size={4}><div style={{ width: 24, height: 0, borderTop: '2px dashed #16a34a' }} /><span>合同约定收款</span></Space>
                <Space size={4}><div style={{ width: 24, height: 2, background: '#f97316' }} /><span>实际收款</span></Space>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={costTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => value ? `¥${Number(value).toLocaleString()}` : '-'} />
                  <Area type="monotone" dataKey="actualTotalCost" name="实际成本" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
                  <Area type="monotone" dataKey="forecastTotalCost" name="预测成本(EAC)" stroke="#3b82f6" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                  <Area type="stepAfter" dataKey="contractRevenue" name="合同约定收款" stroke="#16a34a" fill="transparent" strokeWidth={2} strokeDasharray="8 4" />
                  <Area type="stepAfter" dataKey="actualRevenue" name="实际收款" stroke="#f97316" fill="#fed7aa" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              {/* 收款差异说明 */}
              <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', borderRadius: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 500, color: '#fa8c16', marginBottom: 8 }}>收款进度分析：</div>
                <div style={{ color: '#fa8c16', lineHeight: 1.8 }}>
                  <div>• 首期款（¥55,500）：已收到 ✓</div>
                  <div>• 中期款（¥74,000）：已收到 ¥46,250，未收 ¥27,750（2笔未付）</div>
                  <div>• 尾款（¥55,500）：未收到</div>
                  <div>• 合同约定收款：¥111,000，实际收款：¥101,750</div>
                  <div>• 当前未收金额：<strong style={{ color: '#f53f3f' }}>¥83,250</strong>（应收¥185,000 - 实收¥101,750）</div>
                </div>
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="利润率趋势" style={{ height: '100%' }}>
              {/* 图例 */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12 }}>
                <Space size={4}><div style={{ width: 24, height: 2, background: '#3b82f6' }} /><span>实际利润率（实线）</span></Space>
                <Space size={4}><div style={{ width: 24, height: 0, borderTop: '2px dashed #3b82f6' }} /><span>预测利润率（虚线）</span></Space>
                <Space size={4}><div style={{ width: 24, height: 2, background: '#22c55e' }} /><span>目标基线（{caseData.targetMargin || 30}%）</span></Space>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={costTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 50]} />
                  <Tooltip formatter={(value) => value ? `${Number(value).toFixed(1)}%` : '-'} />
                  <Line type="monotone" dataKey={() => caseData.targetMargin || 30} name="目标基线" stroke="#22c55e" strokeWidth={2} strokeDasharray="10 5" dot={false} activeDot={false} />
                  <Line type="monotone" dataKey="actualMargin" name="实际利润率" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="forecastMargin" name="预测利润率" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
              {/* 利润率分析说明 */}
              <div style={{ marginTop: 16, padding: 12, background: '#f2f3ff', borderRadius: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 500, color: '#165dff', marginBottom: 8 }}>利润率分析：</div>
                <div style={{ color: '#165dff', lineHeight: 1.8 }}>
                  <div>• 目标利润率基线：<strong>{caseData.targetMargin || 30}%</strong>（合同签订时设定）</div>
                  <div>• 当前实际利润率：<strong>{caseData.currentMargin || 30.5}%</strong>（{((caseData.currentMargin || 30.5) >= (caseData.targetMargin || 30)) ? '高于' : '低于'}目标 {(Math.abs((caseData.currentMargin || 30.5) - (caseData.targetMargin || 30))).toFixed(1)} 个百分点）</div>
                  <div>• 结项预测利润率：<strong>{((1 - (caseData.eac || 116000) / (caseData.contractAmount || 185000)) * 100).toFixed(1)}%</strong></div>
                  <div>• 利润率波动原因：主要受回款节奏影响，中期款后置导致收入确认延迟</div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 成本结构分析 + 成本构成明细 */}
      {costStructure.length > 0 && (
        <Row gutter={16}>
          <Col span={12}>
            <Card title="成本结构" style={{ height: '100%' }}>
              <div style={{ marginBottom: 12 }}>
                <Space>
                  <Button size="small" type={costStructureView === 'actual' ? 'primary' : 'default'} onClick={() => setCostStructureView('actual')}>已发生</Button>
                  <Button size="small" type={costStructureView === 'forecast' ? 'primary' : 'default'} onClick={() => setCostStructureView('forecast')}>预测</Button>
                </Space>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costStructureView === 'actual' ? costStructure : forecastCostStructure}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }) => `${category} ${percentage}%`}
                    outerRadius={100}
                    dataKey="amount"
                  >
                    {(costStructureView === 'actual' ? costStructure : forecastCostStructure).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `¥${Number(value).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="成本构成明细" style={{ height: '100%' }}>
              <div>
                {/* 表头 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#86909c', borderBottom: '1px solid #e5e6eb', paddingBottom: 8, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 16 }} />
                    <span>成本类别</span>
                  </div>
                  <div style={{ display: 'flex', gap: 32 }}>
                    <span style={{ width: 96, textAlign: 'right' }}>已发生</span>
                    <span style={{ width: 96, textAlign: 'right' }}>预测</span>
                  </div>
                </div>

                {/* 数据行 */}
                {costStructure.map((item) => {
                  const forecastItem = forecastCostStructure.find(f => f.category === item.category);
                  const variance = forecastItem ? forecastItem.amount - item.amount : 0;
                  return (
                    <div key={item.category} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color }} />
                        <span style={{ fontSize: 13 }}>{item.category}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 32, fontSize: 13 }}>
                        <div style={{ width: 96, textAlign: 'right' }}>
                          <div>¥{item.amount.toLocaleString()}</div>
                          <div style={{ fontSize: 11, color: '#86909c' }}>{item.percentage}%</div>
                        </div>
                        <div style={{ width: 96, textAlign: 'right' }}>
                          <div style={{ color: variance > 0 ? '#fa8c16' : '#86909c' }}>
                            ¥{(forecastItem?.amount || 0).toLocaleString()}
                          </div>
                          <div style={{ fontSize: 11, color: '#86909c' }}>{forecastItem?.percentage || 0}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 合计行 */}
                <div style={{ borderTop: '1px solid #e5e6eb', paddingTop: 12, marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 'bold' }}>
                    <span>合计</span>
                    <div style={{ display: 'flex', gap: 32 }}>
                      <span style={{ width: 96, textAlign: 'right' }}>
                        ¥{costStructure.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                      </span>
                      <span style={{ width: 96, textAlign: 'right', color: '#fa8c16' }}>
                        ¥{forecastCostStructure.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 差异说明 */}
                <div style={{ background: '#f2f3ff', padding: 8, borderRadius: 4, fontSize: 12, marginTop: 12 }}>
                  <span style={{ color: '#165dff' }}>
                    预测增加：¥{(forecastCostStructure.reduce((sum, item) => sum + item.amount, 0) - costStructure.reduce((sum, item) => sum + item.amount, 0)).toLocaleString()}
                    （+{((forecastCostStructure.reduce((sum, item) => sum + item.amount, 0) - costStructure.reduce((sum, item) => sum + item.amount, 0)) / costStructure.reduce((sum, item) => sum + item.amount, 0) * 100).toFixed(1)}%）
                  </span>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 成本增长曲线（叠加面积图） */}
      {costTrends.length > 0 && (
        <Card title="成本增长曲线">
          {/* 图例 */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12 }}>
            <Space size={4}><div style={{ width: 16, height: 12, borderRadius: 2, background: '#1e40af' }} /><span>人力成本</span></Space>
            <Space size={4}><div style={{ width: 16, height: 12, borderRadius: 2, background: '#3b82f6' }} /><span>商务成本</span></Space>
            <Space size={4}><div style={{ width: 16, height: 12, borderRadius: 2, background: '#60a5fa' }} /><span>运营成本</span></Space>
            <Space size={4}><div style={{ width: 16, height: 12, borderRadius: 2, background: '#93c5fd' }} /><span>第三方成本</span></Space>
            <div style={{ width: 1, height: 16, background: '#d9d9d9', margin: '0 8px' }} />
            <Space size={4}><div style={{ width: 16, height: 12, borderRadius: 2, background: '#93c5fd', opacity: 0.4 }} /><span>预测</span></Space>
          </div>
          <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={costTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value, name) => value ? [`¥${Number(value).toLocaleString()}`, name] : '-'} />
                {/* 已发生成本 - 堆叠面积图 */}
                <Area type="monotone" dataKey="actualLaborCost" name="人力成本" stackId="actual" stroke="#1e40af" fill="#1e40af" fillOpacity={0.8} />
                <Area type="monotone" dataKey="actualCommercialCost" name="商务成本" stackId="actual" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.8} />
                <Area type="monotone" dataKey="actualOperationCost" name="运营成本" stackId="actual" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.8} />
                <Area type="monotone" dataKey="actualThirdPartyCost" name="第三方成本" stackId="actual" stroke="#93c5fd" fill="#93c5fd" fillOpacity={0.8} />
                {/* 预测成本 - 半透明叠加 */}
                <Area type="monotone" dataKey="forecastLaborCost" name="人力成本(预测)" stackId="forecast" stroke="#1e40af" fill="#93c5fd" fillOpacity={0.15} strokeWidth={2} strokeDasharray="8 4" />
                <Area type="monotone" dataKey="forecastCommercialCost" name="商务成本(预测)" stackId="forecast" stroke="#3b82f6" fill="#93c5fd" fillOpacity={0.15} strokeWidth={2} strokeDasharray="8 4" />
                <Area type="monotone" dataKey="forecastOperationCost" name="运营成本(预测)" stackId="forecast" stroke="#60a5fa" fill="#93c5fd" fillOpacity={0.15} strokeWidth={2} strokeDasharray="8 4" />
                <Area type="monotone" dataKey="forecastThirdPartyCost" name="第三方成本(预测)" stackId="forecast" stroke="#93c5fd" fill="#93c5fd" fillOpacity={0.15} strokeWidth={2} strokeDasharray="8 4" />
              </AreaChart>
            </ResponsiveContainer>
            {/* 预测区域标注 */}
            <div style={{ position: 'absolute', top: 16, right: 64, background: 'rgba(255,255,255,0.8)', padding: '4px 12px', borderRadius: 4, border: '1px solid #e5e6eb', fontSize: 12, color: '#86909c' }}>
              PROJECTED
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  // 渲染功能清单标签页
  const renderFeatureListTab = () => {
    const allFeatureLists = featureLists.filter(fl => fl.caseId === id);

    return (
      <Card
        title="工时评估"
        extra={
          <div>
            <Text type="secondary" style={{ marginRight: 16 }}>共 {allFeatureLists.length} 份评估</Text>
            <Button icon={<IconDownload />}>导出 Excel</Button>
          </div>
        }
      >
        {allFeatureLists.length > 0 ? (
          <div>
            {allFeatureLists.sort((a, b) => a.version - b.version).map((fl, index) => (
              <Card
                key={fl.id}
                size="small"
                style={{
                  marginBottom: 12,
                  background: index === allFeatureLists.length - 1 ? '#f2f3ff' : '#f7f8fa',
                  border: index === allFeatureLists.length - 1 ? '1px solid #bedaff' : '1px solid #e5e6eb',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => toggleFeatureListExpand(fl.id)}
                >
                  <Space>
                    <Tag color={index === 0 ? 'gray' : 'blue'}>
                      {index === 0 ? '原始评估' : `变更评估 #${index}`}
                    </Tag>
                    <Text style={{ fontWeight: 500 }}>工时评估 v{fl.version}</Text>
                    <Tag color={fl.status === FeatureListStatus.LOCKED ? 'green' : 'blue'}>
                      {featureListStatusMap[fl.status]?.label}
                    </Tag>
                    <Text type="secondary">{fl.totalEstimatedDays}天 | ¥{fl.totalEstimatedCost.toLocaleString()}</Text>
                  </Space>
                  <Space>
                    <Text type="secondary">{new Date(fl.createdAt).toLocaleDateString()}</Text>
                    <span>{expandedFeatureLists.has(fl.id) ? '▼' : '▶'}</span>
                  </Space>
                </div>

                {expandedFeatureLists.has(fl.id) && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e6eb' }}>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={6}>
                        <div><Text type="secondary">总人天</Text></div>
                        <div style={{ fontSize: 18, fontWeight: 'bold' }}>{fl.totalEstimatedDays}天</div>
                      </Col>
                      <Col span={6}>
                        <div><Text type="secondary">估算成本</Text></div>
                        <div style={{ fontSize: 18, fontWeight: 'bold' }}>¥{fl.totalEstimatedCost.toLocaleString()}</div>
                      </Col>
                      <Col span={6}>
                        <div><Text type="secondary">评估人</Text></div>
                        <div style={{ fontWeight: 500 }}>张三（主管）+ 李四（工程师）</div>
                      </Col>
                      <Col span={6}>
                        <div><Text type="secondary">状态</Text></div>
                        <div style={{ fontWeight: 500 }}>{fl.status === FeatureListStatus.LOCKED ? '已确认' : '待确认'}</div>
                      </Col>
                    </Row>
                    {index > 0 && (
                      <div style={{ marginBottom: 16, padding: 8, background: '#fff7e6', borderRadius: 4, fontSize: 12 }}>
                        <Text type="secondary">变更说明：</Text>
                        <Text style={{ color: '#fa8c16', fontWeight: 500 }}>
                          工时 +{fl.totalEstimatedDays - (allFeatureLists[index - 1]?.totalEstimatedDays || 0)}天，
                          成本 +¥{((fl.totalEstimatedCost || 0) - (allFeatureLists[index - 1]?.totalEstimatedCost || 0)).toLocaleString()}
                        </Text>
                      </div>
                    )}
                    <div style={{ textAlign: 'center', padding: 20, color: '#86909c' }}>
                      功能点明细表格（待实现）
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#86909c' }}>暂无工时评估</div>
        )}
      </Card>
    );
  };

  // 渲染报价单标签页
  const renderQuotationTab = () => {
    const allQuotations = quotations.filter(q => q.caseId === id);

    return (
      <Card
        title="报价单"
        extra={
          <div>
            <Text type="secondary" style={{ marginRight: 16 }}>共 {allQuotations.length} 份报价单</Text>
            <Button icon={<IconDownload />}>导出 Excel</Button>
          </div>
        }
      >
        {allQuotations.length > 0 ? (
          <div>
            {allQuotations.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((quote, index) => (
              <Card
                key={quote.id}
                size="small"
                style={{
                  marginBottom: 12,
                  background: index === allQuotations.length - 1 ? '#f2f3ff' : '#f7f8fa',
                  border: index === allQuotations.length - 1 ? '1px solid #bedaff' : '1px solid #e5e6eb',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => toggleQuotationExpand(quote.id)}
                >
                  <Space>
                    <Tag color={index === 0 ? 'gray' : 'blue'}>
                      {index === 0 ? '原始报价' : `变更报价 #${index}`}
                    </Tag>
                    <Text style={{ fontWeight: 500 }}>{quote.quotationNo}</Text>
                    <Tag>{quotationStatusMap[quote.status as keyof typeof quotationStatusMap]?.label || quote.status}</Tag>
                    <Text type="secondary">¥{quote.totalAmount.toLocaleString()}</Text>
                  </Space>
                  <Space>
                    <Text type="secondary">{new Date(quote.createdAt).toLocaleDateString()}</Text>
                    <span>{expandedQuotations.has(quote.id) ? '▼' : '▶'}</span>
                  </Space>
                </div>

                {expandedQuotations.has(quote.id) && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e6eb' }}>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={6}>
                        <div><Text type="secondary">项目名称</Text></div>
                        <div style={{ fontWeight: 500 }}>{quote.projectName}</div>
                      </Col>
                      <Col span={6}>
                        <div><Text type="secondary">功能报价</Text></div>
                        <div style={{ fontWeight: 500 }}>¥{quote.totalFeatureCost.toLocaleString()}</div>
                      </Col>
                      <Col span={6}>
                        <div><Text type="secondary">服务报价</Text></div>
                        <div style={{ fontWeight: 500 }}>¥{quote.totalServiceCost.toLocaleString()}</div>
                      </Col>
                      <Col span={6}>
                        <div><Text type="secondary">报价总金额</Text></div>
                        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#165dff' }}>¥{quote.totalAmount.toLocaleString()}</div>
                      </Col>
                    </Row>
                    {index > 0 && (
                      <div style={{ marginBottom: 16, padding: 8, background: '#e8ffea', borderRadius: 4, fontSize: 12 }}>
                        <Text type="secondary">变更说明：</Text>
                        <Text style={{ color: '#00b42a', fontWeight: 500 }}>
                          合同金额增加 +¥{quote.totalAmount.toLocaleString()}
                        </Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>（{quote.description}）</Text>
                      </div>
                    )}
                    <div style={{ textAlign: 'center', padding: 20, color: '#86909c' }}>
                      报价明细表格（待实现）
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#86909c' }}>
            暂无报价单
            <div style={{ marginTop: 16 }}>
              <Button type="primary">创建报价单</Button>
            </div>
          </div>
        )}
      </Card>
    );
  };

  // 渲染成本归集标签页
  const renderCostTab = () => {
    const costSummary = {
      labor: costItems.filter(i => i.costCategory === 'labor').reduce((s, i) => s + i.amount, 0),
      commercial: costItems.filter(i => i.costCategory === 'commercial').reduce((s, i) => s + i.amount, 0),
      operation: costItems.filter(i => i.costCategory === 'operation').reduce((s, i) => s + i.amount, 0),
      thirdParty: costItems.filter(i => i.costCategory === 'third_party').reduce((s, i) => s + i.amount, 0),
      total: costItems.reduce((s, i) => s + i.amount, 0),
    };

    return (
      <Card
        title="成本归集"
        extra={
          <Space>
            <Button icon={<IconDownload />}>导出 Excel</Button>
            <Button type="primary">添加成本项</Button>
          </Space>
        }
      >
        {/* 成本汇总 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
            <Card size="small">
              <div><Text type="secondary">人力成本</Text></div>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>¥{costSummary.labor.toLocaleString()}</div>
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <div><Text type="secondary">商务成本</Text></div>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>¥{costSummary.commercial.toLocaleString()}</div>
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <div><Text type="secondary">运营成本</Text></div>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>¥{costSummary.operation.toLocaleString()}</div>
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <div><Text type="secondary">第三方成本</Text></div>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>¥{costSummary.thirdParty.toLocaleString()}</div>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <div><Text type="secondary">总成本</Text></div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#f53f3f' }}>¥{costSummary.total.toLocaleString()}</div>
            </Card>
          </Col>
        </Row>

        {/* 成本明细 */}
        <Table
          columns={[
            { title: '时间', dataIndex: 'date', width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
            { title: '成本类别', dataIndex: 'costCategory', width: 100, render: (v: string) =>
              <Tag>{v === 'labor' ? '人力成本' : v === 'commercial' ? '商务成本' : v === 'operation' ? '运营成本' : '第三方成本'}</Tag> },
            { title: '成本类型', dataIndex: 'costType', width: 120 },
            { title: '金额', dataIndex: 'amount', width: 100, align: 'right' as const, render: (v: number) => `¥${v.toLocaleString()}` },
            { title: '来源', dataIndex: 'sourceType', width: 100, render: (v: string) =>
              <Tag color="blue">{v === 'daily_report' ? '日报' : v === 'reimbursement' ? '报销单' : v === 'work_item' ? '工作项' : '手动录入'}</Tag> },
            { title: '员工', dataIndex: 'employeeName', width: 100, render: (v: string) => v || '-' },
            { title: '描述', dataIndex: 'description', ellipsis: true },
          ]}
          data={costItems}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    );
  };

  // 渲染项目决算标签页
  const renderPostMortemTab = () => (
    <Card title="项目决算">
      {postMortem ? (
        <div>
          {/* 根因分析 */}
          <Title heading={6} style={{ marginBottom: 12 }}>根因分析</Title>
          <Table
            columns={[
              { title: '类别', dataIndex: 'category', width: 100, render: (v: string) =>
                <Tag>{v === 'scope_creep' ? '需求变更' : v === 'quality_issue' ? '质量问题' : v === 'efficiency' ? '效率问题' : v}</Tag> },
              { title: '描述', dataIndex: 'description' },
              { title: '影响金额', dataIndex: 'impact', width: 120, align: 'right' as const, render: (v: number) => `¥${v.toLocaleString()}` },
              { title: '置信度', dataIndex: 'confidence', width: 100, render: (v: number) => `${(v * 100).toFixed(0)}%` },
            ]}
            data={postMortem.rootCauses}
            rowKey="description"
            pagination={false}
            style={{ marginBottom: 24 }}
          />

          {/* 经验教训 */}
          <Title heading={6} style={{ marginBottom: 12 }}>经验教训</Title>
          <ul style={{ paddingLeft: 20, marginBottom: 24 }}>
            {postMortem.lessonsLearned.map((lesson, index) => (
              <li key={index} style={{ marginBottom: 8 }}>{lesson}</li>
            ))}
          </ul>

          {/* 效率指标 */}
          <Title heading={6} style={{ marginBottom: 12 }}>效率指标</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Card size="small">
                <div><Text type="secondary">人均产出效率</Text></div>
                <div style={{ fontSize: 18, fontWeight: 'bold' }}>{postMortem.unitOutputPerFte} FTE</div>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <div><Text type="secondary">复用节约额</Text></div>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#00b42a' }}>¥{postMortem.reuseSaving.toLocaleString()}</div>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <div><Text type="secondary">模型校准状态</Text></div>
                <Tag color={postMortem.calibrationApplied ? 'green' : 'gray'}>
                  {postMortem.calibrationApplied ? '已校准' : '未校准'}
                </Tag>
              </Card>
            </Col>
          </Row>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#86909c' }}>
          暂无项目决算数据
          <div style={{ marginTop: 16 }}>
            <Button type="primary">生成项目决算</Button>
          </div>
        </div>
      )}
    </Card>
  );

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Space>
          <Button icon={<IconLeft />} onClick={() => navigate('/financial-delivery/cases')}>
            返回
          </Button>
          <Title heading={3}>业务单详情</Title>
          <Tag color={statusColorMap[caseStatusMap[caseData.status]?.color] || 'blue'}>
            {caseStatusMap[caseData.status]?.label}
          </Tag>
        </Space>
        <Space>
          <Button icon={<IconDownload />}>导出</Button>
          <Button icon={<IconPrinter />}>打印</Button>
          <Button type="primary" icon={<IconEdit />} onClick={() => navigate(`/financial-delivery/cases/${id}/edit`)}>
            编辑
          </Button>
        </Space>
      </div>

      {/* 主要内容 */}
      <Tabs defaultActiveTab="overview">
        <TabPane key="overview" title="概览">
          {renderOverviewTab()}
        </TabPane>
        <TabPane key="features" title={`工时评估 (${featureLists.length})`}>
          {renderFeatureListTab()}
        </TabPane>
        <TabPane key="quotation" title={`报价单 (${quotations.length})`}>
          {renderQuotationTab()}
        </TabPane>
        <TabPane key="costs" title={`成本归集 (${costItems.length})`}>
          {renderCostTab()}
        </TabPane>
        <TabPane key="post-mortem" title="项目决算">
          {renderPostMortemTab()}
        </TabPane>
      </Tabs>

      {/* 财务模型详情弹窗 */}
      <Modal
        title={selectedModel?.name}
        visible={modelVisible}
        onCancel={() => setModelVisible(false)}
        footer={null}
        style={{ width: 800 }}
      >
        {selectedModel && (
          <div>
            <div style={{ marginBottom: 8, color: '#86909c' }}>
              版本：{selectedModel.version} | 类型：{selectedModel.type === 'cost' ? '成本模型' : '收入模型'}
            </div>
            <ModelDetailContent model={selectedModel} />
          </div>
        )}
      </Modal>
    </div>
  );
}
