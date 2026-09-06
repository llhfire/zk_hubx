import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Tag,
  Tabs,
  Space,
  Typography,
  Grid,
  Spin,
  Message,
  Progress,
  Select,
  Radio,
  Button,
  Tooltip,
} from '@arco-design/web-react';
import {
  IconDashboard,
  IconUser,
  IconBarChart,
  IconCheckCircle,
  IconExclamationCircle,
  IconRight,
  IconThunderbolt,
  IconCompass,
  IconHome,
} from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router';
import { PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import {
  getPersonalTravelStats,
  getDepartmentTravelStats,
  getProjectTravelStats,
  getExpenseAnalysis,
} from '../travel-api';
import './travelDashboard.css';

const { Text } = Typography;
const { Row, Col } = Grid;
const { TabPane } = Tabs;

const formatCurrency = (value?: number | null) => `¥${Number(value ?? 0).toLocaleString()}`;

// 默认丰富初始数据集，保障首屏与 SSR 即时渲染
const defaultPersonalStats = {
  tripCount: 12,
  totalDays: 45,
  totalExpense: 35000,
  totalSubsidy: 6750,
  pendingReimbursement: 2950,
  unsettledLoan: 3000,
  monthlyTrips: [
    { month: '1月', days: 10, expense: 7800 },
    { month: '2月', days: 6, expense: 4800 },
    { month: '3月', days: 14, expense: 11200 },
    { month: '4月', days: 15, expense: 11200 },
  ],
};

const defaultDeptStats = {
  tripCount: 28,
  totalExpense: 125000,
  avgExpensePerPerson: 6250,
  expenseByType: [
    { type: '住宿费', amount: 50000, percent: 40 },
    { type: '交通费', amount: 45000, percent: 36 },
    { type: '餐饮费', amount: 20000, percent: 16 },
    { type: '其他杂费', amount: 10000, percent: 8 },
  ],
  expenseByCity: [
    { city: '上海', amount: 45000, percent: 36, trips: 10 },
    { city: '深圳', amount: 35000, percent: 28, trips: 8 },
    { city: '杭州', amount: 25000, percent: 20, trips: 6 },
    { city: '广州', amount: 20000, percent: 16, trips: 4 },
  ],
  monthlyTrend: [
    { month: '1月', amount: 18000 },
    { month: '2月', amount: 15000 },
    { month: '3月', amount: 22000 },
    { month: '4月', amount: 28000 },
  ],
};

const defaultProjectStats = {
  totalExpense: 18500,
  costRatio: 0.12,
  tripCount: 5,
  expenseBySegment: [
    { segment: '北京 → 杭州 (项目驻场部署)', amount: 5000, trips: 2 },
    { segment: '上海 → 北京 (客户中枢汇报)', amount: 4000, trips: 1 },
    { segment: '杭州 → 上海 (集成测试联调)', amount: 3500, trips: 1 },
    { segment: '北京 → 深圳 (现场售前支持)', amount: 6000, trips: 1 },
  ],
  expenseByPerson: [
    { person: '张三', dept: '销售部', empId: 'emp-001', amount: 8000, days: 12 },
    { person: '李四', dept: '产品设计部', empId: 'emp-002', amount: 6000, days: 8 },
    { person: '王五', dept: '技术研发部', empId: 'emp-003', amount: 4500, days: 6 },
  ],
  monthlyTrend: [
    { month: '1月', amount: 3000 },
    { month: '2月', amount: 4500 },
    { month: '3月', amount: 5000 },
    { month: '4月', amount: 6000 },
  ],
};

const defaultExpenseAnalysis = {
  totalExpense: 125000,
  avgExpense: 4464,
  maxExpense: 12000,
  transportDistribution: [
    { mode: '高铁', count: 15, tag: '绿色低碳' },
    { mode: '飞机', count: 10, tag: '长途快捷' },
    { mode: '动车', count: 8, tag: '城际互联' },
    { mode: '自驾/租车', count: 3, tag: '灵活周边' },
  ],
  avgAccommodationCost: 450,
  hotelVsDormitory: { hotel: 80, dormitory: 20 },
  dormitorySaving: 28000,
  overStandardCount: 5,
  overStandardAmount: 3500,
  overStandardReasons: [
    { reason: '协议酒店满房临近调价', count: 2, percent: 40, amount: 1600 },
    { reason: '紧急出差无协议酒店', count: 2, percent: 40, amount: 1400 },
    { reason: '客户指定高端酒店', count: 1, percent: 20, amount: 500 },
  ],
};

export function TravelDashboard() {
  const navigate = useNavigate();
  const [personalStats, setPersonalStats] = useState<any>(defaultPersonalStats);
  const [deptStats, setDeptStats] = useState<any>(defaultDeptStats);
  const [projectStats, setProjectStats] = useState<any>(defaultProjectStats);
  const [expenseAnalysis, setExpenseAnalysis] = useState<any>(defaultExpenseAnalysis);

  const [viewRole, setViewRole] = useState<'personal' | 'admin'>('admin');
  const [activeTab, setActiveTab] = useState('department');
  const [person, setPerson] = useState('全部人员');
  const [department, setDepartment] = useState('销售部');
  const [project, setProject] = useState('中科协同平台');
  const [period, setPeriod] = useState('2026年');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [personal, dept, proj, analysis] = await Promise.all([
        getPersonalTravelStats('emp-001'),
        getDepartmentTravelStats('销售部'),
        getProjectTravelStats('proj-001'),
        getExpenseAnalysis(),
      ]);
      if (personal) setPersonalStats((prev: any) => ({ ...prev, ...personal }));
      if (dept) setDeptStats((prev: any) => ({ ...prev, ...dept }));
      if (proj) setProjectStats((prev: any) => ({ ...prev, ...proj }));
      if (analysis) setExpenseAnalysis((prev: any) => ({ ...prev, ...analysis }));
    } catch {
      // 容错使用默认 mock 数据
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="差旅看板"
        description="企业差旅支出大盘、组织多维下钻、合规风控监控及绿色集约效益中枢。"
        actions={
          <Space>
            <Text type="secondary" style={{ fontSize: 13 }}>视图模式：</Text>
            <Radio.Group
              type="button"
              size="small"
              value={viewRole}
              onChange={(val) => {
                setViewRole(val);
                if (val === 'personal') setActiveTab('personal');
                else setActiveTab('department');
              }}
            >
              <Radio value="personal">个人员工视角</Radio>
              <Radio value="admin">管理驾驶舱视角</Radio>
            </Radio.Group>
          </Space>
        }
      />

      {/* 控制台多维下钻筛选栏（管理驾驶舱模式） */}
      {viewRole === 'admin' ? (
        <div className="travel-dash-control-bar">
          <div className="travel-dash-control-left">
            <Tag color="purple">管理权限：跨组织与项目全景分析</Tag>

            <Select
              size="small"
              value={department}
              style={{ width: 140 }}
              onChange={setDepartment}
            >
              <Select.Option value="全部部门">部门：全部</Select.Option>
              <Select.Option value="销售部">部门：销售部</Select.Option>
              <Select.Option value="交付部">部门：交付部</Select.Option>
              <Select.Option value="技术研发部">部门：技术研发部</Select.Option>
            </Select>

            <Select
              size="small"
              value={project}
              style={{ width: 170 }}
              onChange={setProject}
            >
              <Select.Option value="全部项目">项目：全部</Select.Option>
              <Select.Option value="中科协同平台">项目：中科协同平台</Select.Option>
              <Select.Option value="数据治理平台">项目：数据治理平台</Select.Option>
            </Select>

            <Select
              size="small"
              value={person}
              style={{ width: 130 }}
              onChange={setPerson}
            >
              <Select.Option value="全部人员">人员：全部</Select.Option>
              <Select.Option value="张三">人员：张三</Select.Option>
              <Select.Option value="李四">人员：李四</Select.Option>
              <Select.Option value="王五">人员：王五</Select.Option>
            </Select>

            <Select
              size="small"
              value={period}
              style={{ width: 120 }}
              onChange={setPeriod}
            >
              <Select.Option value="2026年">周期：2026年</Select.Option>
              <Select.Option value="近90天">周期：近90天</Select.Option>
              <Select.Option value="近30天">周期：近30天</Select.Option>
            </Select>
          </div>

          <div className="travel-dash-control-right">
            <span>实时口径统计</span>
          </div>
        </div>
      ) : (
        <div className="travel-dash-control-bar">
          <div className="travel-dash-control-left">
            <Tag color="arcoblue">员工工作台：当前登录员工【张三 (emp-001 · 销售部)】</Tag>
          </div>
          <div className="travel-dash-control-right">
            <span>数据更新至今日</span>
          </div>
        </div>
      )}

      {/* ===================== 视图 A：个人员工看板 ===================== */}
      {viewRole === 'personal' && (
        <div className="travel-dash-container">
          {/* 4 大个人核心指标 */}
          <ProcessMetricGrid
            items={[
              {
                key: 'trips',
                label: '本年出差频次',
                value: `${personalStats.tripCount} 次`,
                detail: `累计出行 ${personalStats.totalDays} 天`,
              },
              {
                key: 'expense',
                label: '差旅费用总计',
                value: formatCurrency(personalStats.totalExpense),
                detail: `已计发差旅补贴 ${formatCurrency(personalStats.totalSubsidy)}`,
              },
              {
                key: 'reimbursement',
                label: '在途待报销金额',
                value: formatCurrency(personalStats.pendingReimbursement),
                detail: personalStats.pendingReimbursement > 0 ? '存在已出行单据未结' : '所有行程已结清',
                tone: personalStats.pendingReimbursement > 0 ? 'warning' : 'success',
              },
              {
                key: 'loan',
                label: '未结清出差借款',
                value: formatCurrency(personalStats.unsettledLoan),
                detail: personalStats.unsettledLoan > 0 ? '待与报销冲抵结算' : '无未清借款',
                tone: personalStats.unsettledLoan > 0 ? 'danger' : 'success',
              },
            ]}
          />

          {/* 待办行动卡片 */}
          <div className="travel-dash-action-card">
            <div className="travel-dash-action-left">
              <div className="travel-dash-action-icon">
                <IconThunderbolt />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  待办提醒：您有 {formatCurrency(personalStats.pendingReimbursement)} 在途出差费用尚未发起报销
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                  同时存在未结清差旅备用借款 {formatCurrency(personalStats.unsettledLoan)}，建议在报销单中一键冲抵结算。
                </div>
              </div>
            </div>
            <Space>
              <Button type="primary" onClick={() => navigate('/travel/reimbursements')}>
                去处理报销
              </Button>
              <Button onClick={() => navigate('/travel/loans')}>
                查看借款台账
              </Button>
            </Space>
          </div>

          <Row gutter={16}>
            <Col span={14}>
              <Card title="个人出差月度强度轨迹">
                <div style={{ padding: '8px 0' }}>
                  {(personalStats?.monthlyTrips || defaultPersonalStats.monthlyTrips || []).map((item: any) => (
                    <div
                      key={item.month}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 0',
                        borderBottom: '1px solid var(--color-border-1)',
                      }}
                    >
                      <div style={{ width: 80, fontWeight: 500 }}>{item.month}</div>
                      <div style={{ flex: 1, padding: '0 16px' }}>
                        <Progress
                          percent={Math.min(100, Math.round(((item.days ?? 0) / 20) * 100))}
                          color="rgb(var(--primary-6))"
                          size="small"
                        />
                      </div>
                      <div style={{ width: 120, textAlign: 'right', fontSize: 13 }}>
                        <strong>{item.days ?? 0} 天</strong>
                        <span style={{ color: 'var(--color-text-3)', marginLeft: 8 }}>
                          ¥{(item.expense ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
            <Col span={10}>
              <Card title="个人合规与补贴健康度">
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>标准内合规预订率</span>
                    <Tag color="green">100% 满额合规</Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>住宿标准使用均值</span>
                    <span style={{ fontWeight: 600 }}>¥380 / 晚 (限额 ¥500)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>已结算差旅津贴</span>
                    <span style={{ fontWeight: 600, color: 'rgb(var(--success-6))' }}>¥6,750</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>常驻出行航线</span>
                    <span>北京 ⇄ 杭州</span>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {/* ===================== 视图 B：管理驾驶舱看板 ===================== */}
      {viewRole === 'admin' && (
        <div className="travel-dash-container">
          <Tabs activeTab={activeTab} onChange={setActiveTab} type="line">
            {/* 1. 部门大盘分析 */}
            <TabPane key="department" title="部门差旅大盘">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ProcessMetricGrid
                  items={[
                    {
                      key: 'expense',
                      label: `${department}差旅支出`,
                      value: formatCurrency(deptStats.totalExpense),
                      detail: '当期总发生口径',
                    },
                    {
                      key: 'trips',
                      label: '出差出行人次',
                      value: `${deptStats.tripCount} 人次`,
                      detail: `部门人员平均出差 2.8 次`,
                    },
                    {
                      key: 'average',
                      label: '人均差旅成本',
                      value: formatCurrency(deptStats.avgExpensePerPerson),
                      detail: '组织人均开销标准',
                    },
                    {
                      key: 'top-type',
                      label: '最大支出科目',
                      value: formatCurrency(deptStats.expenseByType?.[0]?.amount ?? 0),
                      detail: deptStats.expenseByType?.[0]?.type ?? '住宿费',
                    },
                  ]}
                />

                <Row gutter={16}>
                  {/* 费用类型分布 */}
                  <Col span={12}>
                    <Card title="差旅费用科目构成分布">
                      <Space direction="vertical" size={14} style={{ width: '100%' }}>
                        {(deptStats?.expenseByType || []).map((item: any) => (
                          <div
                            key={item.type}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <span style={{ width: 80, fontSize: 13, fontWeight: 500 }}>{item.type}</span>
                            <div style={{ flex: 1, padding: '0 12px' }}>
                              <Progress
                                percent={deptStats?.totalExpense ? Math.round(((item.amount ?? 0) / deptStats.totalExpense) * 100) : 0}
                                style={{ width: '100%' }}
                                size="small"
                                color={
                                  item.type === '住宿费'
                                    ? 'rgb(var(--primary-6))'
                                    : item.type === '交通费'
                                    ? 'rgb(var(--success-6))'
                                    : 'rgb(var(--warning-6))'
                                }
                              />
                            </div>
                            <span style={{ fontWeight: 600, width: 85, textAlign: 'right' }}>
                              ¥{(item.amount ?? 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </Space>
                    </Card>
                  </Col>

                  {/* 热门出差目的地城市 Top 4 */}
                  <Col span={12}>
                    <Card title="目的地出差城市支出排行 Top 4">
                      <div className="travel-dash-rank-list">
                        {(deptStats?.expenseByCity || []).map((item: any, index: number) => (
                          <div key={item.city} className="travel-dash-rank-item">
                            <span
                              className={`travel-dash-rank-badge travel-dash-rank-badge--${
                                index < 3 ? index + 1 : 'default'
                              }`}
                            >
                              {index + 1}
                            </span>
                            <div className="travel-dash-rank-info">
                              <span className="travel-dash-rank-name">{item.city}</span>
                              <Tag size="mini">{item.trips || 6}次出差</Tag>
                              <div className="travel-dash-rank-bar-wrap">
                                <Progress
                                  percent={deptStats?.totalExpense ? Math.round(((item.amount ?? 0) / deptStats.totalExpense) * 100) : 0}
                                  size="mini"
                                  showText={false}
                                />
                              </div>
                            </div>
                            <span className="travel-dash-rank-amount">¥{(item.amount ?? 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* 现代化月度趋势图 */}
                <Card title="月度差旅支出趋势与环比走向">
                  <div className="travel-dash-trend-box">
                    <div className="travel-dash-trend-bars">
                      {(deptStats?.monthlyTrend || []).map((item: any) => {
                        const maxAmount = Math.max(1, ...(deptStats?.monthlyTrend || [{ amount: 1 }]).map((t: any) => t.amount || 1));
                        const heightPercent = Math.max(15, Math.round(((item.amount ?? 0) / maxAmount) * 100));

                        return (
                          <div key={item.month} className="travel-dash-trend-col">
                            <span className="travel-dash-trend-val">¥{(item.amount ?? 0).toLocaleString()}</span>
                            <Tooltip content={`${item.month} 差旅总支出: ¥${(item.amount ?? 0).toLocaleString()}`}>
                              <div
                                className="travel-dash-trend-bar"
                                style={{ height: `${heightPercent}%` }}
                              />
                            </Tooltip>
                            <span className="travel-dash-trend-month">{item.month}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              </div>
            </TabPane>

            {/* 2. 项目成本穿透 */}
            <TabPane key="project" title="项目成本穿透">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ProcessMetricGrid
                  items={[
                    {
                      key: 'expense',
                      label: `${project}差旅总额`,
                      value: formatCurrency(projectStats.totalExpense),
                      detail: '专案成本归集',
                    },
                    {
                      key: 'ratio',
                      label: '占项目总预算比例',
                      value: `${(projectStats.costRatio * 100).toFixed(1)}%`,
                      detail: '管控红线阈值 15%',
                      tone: projectStats.costRatio >= 0.15 ? 'warning' : 'success',
                    },
                    {
                      key: 'trips',
                      label: '项目出差人次',
                      value: `${projectStats.tripCount} 人次`,
                      detail: '涉及 3 条核心实施路线',
                    },
                    {
                      key: 'top-person',
                      label: '核心出差人员投入',
                      value: formatCurrency(projectStats.expenseByPerson?.[0]?.amount ?? 0),
                      detail: `${projectStats.expenseByPerson?.[0]?.person} (主导驻场)`,
                    },
                  ]}
                />

                <Row gutter={16}>
                  <Col span={13}>
                    <Card title="项目实施航线与旅程段支出">
                      <div className="travel-dash-rank-list">
                        {(projectStats?.expenseBySegment || []).map((item: any, index: number) => (
                          <div key={item.segment} className="travel-dash-rank-item">
                            <span className="travel-dash-rank-badge travel-dash-rank-badge--default">
                              {index + 1}
                            </span>
                            <div className="travel-dash-rank-info">
                              <span className="travel-dash-rank-name">{item.segment}</span>
                              <div className="travel-dash-rank-bar-wrap">
                                <Progress
                                  percent={projectStats?.totalExpense ? Math.round(((item.amount ?? 0) / projectStats.totalExpense) * 100) : 0}
                                  size="mini"
                                  showText={false}
                                />
                              </div>
                            </div>
                            <span className="travel-dash-rank-amount">¥{(item.amount ?? 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>

                  {/* 严格不显示头像：纯文本姓名、部门、工号 */}
                  <Col span={11}>
                    <Card title="项目核心出差人员开支贡献 (无头像纯净排版)">
                      <div className="travel-dash-rank-list">
                        {(projectStats?.expenseByPerson || []).map((item: any, index: number) => (
                          <div key={item.person} className="travel-dash-rank-item">
                            <span
                              className={`travel-dash-rank-badge travel-dash-rank-badge--${
                                index < 3 ? index + 1 : 'default'
                              }`}
                            >
                              {index + 1}
                            </span>
                            <div className="travel-dash-rank-info">
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{item.person}</span>
                              <Tag size="mini">{item.dept || '交付部'} · {item.empId || '001'}</Tag>
                            </div>
                            <span className="travel-dash-rank-amount">¥{(item.amount ?? 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                </Row>
              </div>
            </TabPane>

            {/* 3. 合规风控与超标分析 */}
            <TabPane key="analysis" title="合规风控与超标分析">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ProcessMetricGrid
                  items={[
                    {
                      key: 'total',
                      label: '年度全盘费用',
                      value: formatCurrency(expenseAnalysis.totalExpense),
                      detail: period,
                    },
                    {
                      key: 'average',
                      label: '单次出差均值',
                      value: formatCurrency(expenseAnalysis.avgExpense),
                      detail: '单人单次行程综合口径',
                    },
                    {
                      key: 'over-standard',
                      label: '超标总金额',
                      value: formatCurrency(expenseAnalysis.overStandardAmount),
                      detail: `累计发生 ${expenseAnalysis.overStandardCount} 次超标事项`,
                      tone: expenseAnalysis.overStandardAmount > 0 ? 'danger' : 'success',
                    },
                    {
                      key: 'maximum',
                      label: '单笔最高报销',
                      value: formatCurrency(expenseAnalysis.maxExpense),
                      detail: '阿里项目 7 天实施单',
                    },
                  ]}
                />

                <Row gutter={16}>
                  <Col span={12}>
                    <div className="travel-dash-risk-card">
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'rgb(var(--danger-7))' }}>
                        <IconExclamationCircle style={{ marginRight: 6 }} />
                        差旅超标原因穿透监控
                      </div>
                      <div className="travel-dash-risk-amount">
                        ¥{(expenseAnalysis?.overStandardAmount ?? 0).toLocaleString()}
                      </div>
                      <Space direction="vertical" size={10} style={{ width: '100%', marginTop: 12 }}>
                        {(expenseAnalysis?.overStandardReasons || []).map((item: any) => (
                          <div
                            key={item.reason}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 10px',
                              background: 'var(--color-bg-2)',
                              borderRadius: 6,
                            }}
                          >
                            <span style={{ fontSize: 13 }}>{item.reason}</span>
                            <Space size={10}>
                              <Tag size="small" color="red">{item.count} 次 ({item.percent || 40}%)</Tag>
                              <strong style={{ color: 'rgb(var(--danger-6))' }}>¥{item.amount || 1500}</strong>
                            </Space>
                          </div>
                        ))}
                      </Space>
                    </div>
                  </Col>

                  <Col span={12}>
                    <Card title="出行交通工具选择分布">
                      <Row gutter={12}>
                        {(expenseAnalysis?.transportDistribution || []).map((item: any) => (
                          <Col span={12} key={item.mode} style={{ marginBottom: 12 }}>
                            <div
                              style={{
                                padding: '14px',
                                background: 'var(--color-fill-1)',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.mode}</div>
                                <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>{item.tag || '常规出行'}</div>
                              </div>
                              <div style={{ fontSize: 20, fontWeight: 700, color: 'rgb(var(--primary-6))' }}>
                                {item.count} <span style={{ fontSize: 12, fontWeight: 'normal' }}>次</span>
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </Card>
                  </Col>
                </Row>
              </div>
            </TabPane>

            {/* 4. 绿色低碳与集约效益 */}
            <TabPane key="eco" title="绿色低碳与集约效益">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <div className="travel-dash-eco-card">
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'rgb(var(--success-7))' }}>
                        <IconHome style={{ marginRight: 6 }} />
                        宿舍集约效益：自建人才公寓成本节约
                      </div>
                      <div className="travel-dash-eco-stat">
                        ¥{(expenseAnalysis?.dormitorySaving ?? 28000).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 14 }}>
                        通过统筹安排中科人才公寓与杭州滨江公寓，本年度成功替代部分外部商业酒店。
                      </div>
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>商业酒店住宿占比</span>
                          <strong>{expenseAnalysis?.hotelVsDormitory?.hotel ?? 80}%</strong>
                        </div>
                        <Progress percent={expenseAnalysis?.hotelVsDormitory?.hotel ?? 80} size="small" />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                          <span>企业宿舍集约入住占比</span>
                          <strong style={{ color: 'rgb(var(--success-6))' }}>{expenseAnalysis?.hotelVsDormitory?.dormitory ?? 20}%</strong>
                        </div>
                        <Progress percent={expenseAnalysis?.hotelVsDormitory?.dormitory ?? 20} color="rgb(var(--success-6))" size="small" />
                      </Space>
                    </div>
                  </Col>

                  <Col span={12}>
                    <Card title="绿色低碳交通出行指数">
                      <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <div style={{ padding: '14px', background: 'rgba(var(--primary-1), 0.4)', borderRadius: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>高铁/动车出行比例</span>
                            <span style={{ fontSize: 18, fontWeight: 700, color: 'rgb(var(--primary-6))' }}>68%</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                            京沪、京杭等高铁 4 小时经济圈优先选择铁路交通，减少碳排放约 4.2 吨。
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>单晚平均住宿成本</span>
                          <span style={{ fontWeight: 600 }}>¥{expenseAnalysis?.avgAccommodationCost ?? 450} / 晚</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>综合合规率评级</span>
                          <Tag color="green">优 (96.5%)</Tag>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                </Row>
              </div>
            </TabPane>
          </Tabs>
        </div>
      )}
    </PageShell>
  );
}

