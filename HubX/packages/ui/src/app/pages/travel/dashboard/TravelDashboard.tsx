import { useState, useEffect } from 'react';
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
} from '@arco-design/web-react';
import { PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import { getPersonalTravelStats, getDepartmentTravelStats, getProjectTravelStats, getExpenseAnalysis } from '../travel-api';

const { Text } = Typography;
const { Row, Col } = Grid;
const { TabPane } = Tabs;
const formatCurrency = (value: number) => `¥${value.toLocaleString()}`;

export function TravelDashboard() {
  const [loading, setLoading] = useState(false);
  const [personalStats, setPersonalStats] = useState<any>(null);
  const [deptStats, setDeptStats] = useState<any>(null);
  const [projectStats, setProjectStats] = useState<any>(null);
  const [expenseAnalysis, setExpenseAnalysis] = useState<any>(null);
  const [viewRole, setViewRole] = useState<'personal' | 'admin'>('admin');
  const [activeTab, setActiveTab] = useState('personal');
  const [person, setPerson] = useState('张三');
  const [department, setDepartment] = useState('销售部');
  const [project, setProject] = useState('中科协同平台');
  const [period, setPeriod] = useState('2026年');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [personal, dept, project, analysis] = await Promise.all([
        getPersonalTravelStats('emp-001'),
        getDepartmentTravelStats('销售部'),
        getProjectTravelStats('proj-001'),
        getExpenseAnalysis(),
      ]);
      setPersonalStats(personal);
      setDeptStats(dept);
      setProjectStats(project);
      setExpenseAnalysis(analysis);
    } catch (error) {
      Message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spin />
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="差旅看板"
        description="按角色控制数据范围，并支持人员、部门、项目和时间组合分析。"
        actions={(
          <Space>
            <Text type="secondary">演示权限</Text>
            <Select value={viewRole} style={{ width: 140 }} onChange={(value) => { setViewRole(value); if (value === 'personal') setActiveTab('personal'); }}>
              <Select.Option value="personal">个人用户</Select.Option>
              <Select.Option value="admin">差旅管理员</Select.Option>
            </Select>
          </Space>
        )}
      />
      <Card size="small">
        <Space wrap>
          <Tag color={viewRole === 'personal' ? 'arcoblue' : 'purple'}>{viewRole === 'personal' ? '仅可查看本人数据' : '管理员：可跨人员与组织分析'}</Tag>
          {(activeTab === 'personal' || activeTab === 'analysis') && viewRole === 'admin' && <Select value={person} style={{ width: 150 }} onChange={setPerson}><Select.Option value="张三">人员：张三</Select.Option><Select.Option value="李四">人员：李四</Select.Option><Select.Option value="全部人员">人员：全部</Select.Option></Select>}
          {(activeTab === 'department' || activeTab === 'analysis') && <Select value={department} style={{ width: 160 }} onChange={setDepartment}><Select.Option value="销售部">部门：销售部</Select.Option><Select.Option value="交付部">部门：交付部</Select.Option><Select.Option value="全部部门">部门：全部</Select.Option></Select>}
          {(activeTab === 'project' || activeTab === 'analysis') && <Select value={project} style={{ width: 190 }} onChange={setProject}><Select.Option value="中科协同平台">项目：中科协同平台</Select.Option><Select.Option value="数据治理平台">项目：数据治理平台</Select.Option><Select.Option value="全部项目">项目：全部</Select.Option></Select>}
          {activeTab === 'analysis' && <Select value={period} style={{ width: 140 }} onChange={setPeriod}><Select.Option value="2026年">时间：2026年</Select.Option><Select.Option value="近90天">时间：近90天</Select.Option><Select.Option value="近30天">时间：近30天</Select.Option></Select>}
        </Space>
      </Card>
      <Tabs activeTab={activeTab} onChange={setActiveTab}>
        {/* 个人看板 */}
        <TabPane key="personal" title="个人看板">
          {personalStats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ProcessMetricGrid items={[
                { key: 'trips', label: '出差次数', value: `${personalStats.tripCount} 次`, detail: `累计 ${personalStats.totalDays} 天` },
                { key: 'expense', label: '差旅费用', value: formatCurrency(personalStats.totalExpense), detail: `补贴 ${formatCurrency(personalStats.totalSubsidy)}` },
                { key: 'reimbursement', label: '待报销金额', value: formatCurrency(personalStats.pendingReimbursement), detail: '请及时提交报销申请', tone: personalStats.pendingReimbursement > 0 ? 'warning' : 'success' },
                { key: 'loan', label: '未结清借款', value: formatCurrency(personalStats.unsettledLoan), detail: '请尽快完成借款冲抵', tone: personalStats.unsettledLoan > 0 ? 'danger' : 'success' },
              ]} />
            </div>
          )}
        </TabPane>

        {/* 部门看板 */}
        {viewRole === 'admin' && <TabPane key="department" title="部门看板">
          {deptStats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ProcessMetricGrid items={[
                { key: 'trips', label: '出差次数', value: `${deptStats.tripCount} 次`, detail: department },
                { key: 'expense', label: '差旅费用总计', value: formatCurrency(deptStats.totalExpense), detail: '部门统计口径' },
                { key: 'average', label: '人均差旅费用', value: formatCurrency(deptStats.avgExpensePerPerson), detail: '用于组织横向比较' },
                { key: 'top-type', label: '最高费用类型', value: formatCurrency(deptStats.expenseByType?.[0]?.amount ?? 0), detail: deptStats.expenseByType?.[0]?.type ?? '暂无数据' },
              ]} />

              {/* 费用分布 */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <Card title="费用类型分布">
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      {deptStats.expenseByType.map((item: any) => (
                        <div key={item.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text>{item.type}</Text>
                          <Space>
                            <Progress
                              percent={Math.round((item.amount / deptStats.totalExpense) * 100)}
                              style={{ width: 128 }}
                              size="small"
                              showText={false}
                            />
                            <Text style={{ fontWeight: 500, width: 80, textAlign: 'right' }}>
                              ¥{item.amount.toLocaleString()}
                            </Text>
                          </Space>
                        </div>
                      ))}
                    </Space>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="城市费用分布">
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      {deptStats.expenseByCity.map((item: any) => (
                        <div key={item.city} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text>{item.city}</Text>
                          <Space>
                            <Progress
                              percent={Math.round((item.amount / deptStats.totalExpense) * 100)}
                              style={{ width: 128 }}
                              size="small"
                              showText={false}
                            />
                            <Text style={{ fontWeight: 500, width: 80, textAlign: 'right' }}>
                              ¥{item.amount.toLocaleString()}
                            </Text>
                          </Space>
                        </div>
                      ))}
                    </Space>
                  </Card>
                </Col>
              </Row>

              {/* 月度趋势 */}
              <Card title="月度差旅费用趋势">
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 200 }}>
                  {deptStats.monthlyTrend.map((item: any) => {
                    const maxAmount = Math.max(...deptStats.monthlyTrend.map((t: any) => t.amount));
                    const height = (item.amount / maxAmount) * 100;
                    return (
                      <div key={item.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontWeight: 500 }}>¥{item.amount.toLocaleString()}</Text>
                        <div style={{ width: '100%', background: '#165dff', borderRadius: '4px 4px 0 0', height: `${height}%` }} />
                        <Text type="secondary">{item.month}</Text>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
        </TabPane>}

        {/* 项目看板 */}
        {viewRole === 'admin' && <TabPane key="project" title="项目看板">
          {projectStats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ProcessMetricGrid items={[
                { key: 'expense', label: '差旅费用总计', value: formatCurrency(projectStats.totalExpense), detail: project },
                { key: 'ratio', label: '占项目成本比例', value: `${(projectStats.costRatio * 100).toFixed(1)}%`, detail: '用于判断差旅成本压力', tone: projectStats.costRatio >= 0.15 ? 'warning' : 'neutral' },
                { key: 'trips', label: '出差人次', value: `${projectStats.tripCount} 人次`, detail: '项目统计口径' },
                { key: 'top-person', label: '最高人员费用', value: formatCurrency(projectStats.expenseByPerson?.[0]?.amount ?? 0), detail: projectStats.expenseByPerson?.[0]?.person ?? '暂无数据' },
              ]} />

              {/* 费用分布 */}
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="旅程段费用分布">
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      {projectStats.expenseBySegment.map((item: any) => (
                        <div key={item.segment} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text>{item.segment}</Text>
                          <Text style={{ fontWeight: 500 }}>¥{item.amount.toLocaleString()}</Text>
                        </div>
                      ))}
                    </Space>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="人员费用分布">
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      {projectStats.expenseByPerson.map((item: any) => (
                        <div key={item.person} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text>{item.person}</Text>
                          <Text style={{ fontWeight: 500 }}>¥{item.amount.toLocaleString()}</Text>
                        </div>
                      ))}
                    </Space>
                  </Card>
                </Col>
              </Row>
            </div>
          )}
        </TabPane>}

        {/* 费用分析 */}
        {viewRole === 'admin' && <TabPane key="analysis" title="费用分析">
          {expenseAnalysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ProcessMetricGrid items={[
                { key: 'total', label: '总费用', value: formatCurrency(expenseAnalysis.totalExpense), detail: period },
                { key: 'average', label: '平均费用', value: formatCurrency(expenseAnalysis.avgExpense), detail: '单次平均口径' },
                { key: 'maximum', label: '最高费用', value: formatCurrency(expenseAnalysis.maxExpense), detail: '单笔最高记录' },
                { key: 'over-standard', label: '超标金额', value: formatCurrency(expenseAnalysis.overStandardAmount), detail: `${expenseAnalysis.overStandardCount} 次超标`, tone: expenseAnalysis.overStandardAmount > 0 ? 'danger' : 'success' },
              ]} />

              {/* 交通方式分布 */}
              <Card title="交通方式分布" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  {expenseAnalysis.transportDistribution.map((item: any) => (
                    <Col span={6} key={item.mode}>
                      <div style={{ textAlign: 'center', padding: 16, background: '#f7f8fa', borderRadius: 8 }}>
                        <div style={{ fontSize: 24, fontWeight: 'bold' }}>{item.count}</div>
                        <div><Text type="secondary">{item.mode}</Text></div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card>

              {/* 住宿分析 */}
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="住宿分析">
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>平均住宿费用/晚</Text>
                        <Text style={{ fontWeight: 500 }}>¥{expenseAnalysis.avgAccommodationCost}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>酒店占比</Text>
                        <Text style={{ fontWeight: 500 }}>{expenseAnalysis.hotelVsDormitory.hotel}%</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>宿舍占比</Text>
                        <Text style={{ fontWeight: 500 }}>{expenseAnalysis.hotelVsDormitory.dormitory}%</Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="超标分析">
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>超标次数</Text>
                        <Text style={{ fontWeight: 500, color: '#f53f3f' }}>{expenseAnalysis.overStandardCount}次</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>超标金额</Text>
                        <Text style={{ fontWeight: 500, color: '#f53f3f' }}>¥{expenseAnalysis.overStandardAmount.toLocaleString()}</Text>
                      </div>
                      <div>
                        <div style={{ marginBottom: 8 }}><Text type="secondary">超标原因</Text></div>
                        {expenseAnalysis.overStandardReasons.map((item: any) => (
                          <div key={item.reason} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                            <Text>{item.reason}</Text>
                            <Text>{item.count}次</Text>
                          </div>
                        ))}
                      </div>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </div>
          )}
        </TabPane>}
      </Tabs>
    </PageShell>
  );
}
