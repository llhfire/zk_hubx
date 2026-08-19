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
} from '@arco-design/web-react';
import {
  IconStorage,
  IconUp,
  IconLocation,
  IconUser,
  IconPublic,
  IconHome,
  IconExclamationCircle,
} from '@arco-design/web-react/icon';
import { getPersonalTravelStats, getDepartmentTravelStats, getProjectTravelStats, getExpenseAnalysis } from '../travel-api';

const { Text, Title } = Typography;
const { Row, Col } = Grid;
const { TabPane } = Tabs;

export function TravelDashboard() {
  const [loading, setLoading] = useState(false);
  const [personalStats, setPersonalStats] = useState<any>(null);
  const [deptStats, setDeptStats] = useState<any>(null);
  const [projectStats, setProjectStats] = useState<any>(null);
  const [expenseAnalysis, setExpenseAnalysis] = useState<any>(null);

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

  const iconStyle = { padding: 8, background: '#e8f3ff', borderRadius: 8 };

  return (
    <div style={{ padding: 16 }}>
      <Title heading={4} style={{ marginBottom: 16 }}>差旅看板</Title>
      <Tabs defaultActiveTab="personal">
        {/* 个人看板 */}
        <TabPane key="personal" title="个人看板">
          {personalStats && (
            <div>
              {/* 概览卡片 */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Card>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={iconStyle}>
                        <IconPublic style={{ fontSize: 20, color: '#165dff' }} />
                      </div>
                      <div>
                        <div><Text type="secondary">出差次数</Text></div>
                        <div style={{ fontSize: 24, fontWeight: 'bold' }}>{personalStats.tripCount}</div>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={iconStyle}>
                        <IconLocation style={{ fontSize: 20, color: '#165dff' }} />
                      </div>
                      <div>
                        <div><Text type="secondary">出差天数</Text></div>
                        <div style={{ fontSize: 24, fontWeight: 'bold' }}>{personalStats.totalDays}</div>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={iconStyle}>
                        <IconStorage style={{ fontSize: 20, color: '#165dff' }} />
                      </div>
                      <div>
                        <div><Text type="secondary">差旅费用</Text></div>
                        <div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{personalStats.totalExpense.toLocaleString()}</div>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={iconStyle}>
                        <IconUp style={{ fontSize: 20, color: '#165dff' }} />
                      </div>
                      <div>
                        <div><Text type="secondary">差旅补贴</Text></div>
                        <div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{personalStats.totalSubsidy.toLocaleString()}</div>
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* 待处理事项 */}
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="待报销金额">
                    <div style={{ fontSize: 32, fontWeight: 'bold', color: '#ff7d00' }}>
                      ¥{personalStats.pendingReimbursement.toLocaleString()}
                    </div>
                    <div style={{ marginTop: 4 }}><Text type="secondary">请及时提交报销申请</Text></div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="未结清借款">
                    <div style={{ fontSize: 32, fontWeight: 'bold', color: '#f53f3f' }}>
                      ¥{personalStats.unsettledLoan.toLocaleString()}
                    </div>
                    <div style={{ marginTop: 4 }}><Text type="secondary">请尽快冲抵借款</Text></div>
                  </Card>
                </Col>
              </Row>
            </div>
          )}
        </TabPane>

        {/* 部门看板 */}
        <TabPane key="department" title="部门看板">
          {deptStats && (
            <div>
              {/* 概览卡片 */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Card>
                    <div><Text type="secondary">出差次数</Text></div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>{deptStats.tripCount}</div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <div><Text type="secondary">差旅费用总计</Text></div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{deptStats.totalExpense.toLocaleString()}</div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <div><Text type="secondary">人均差旅费用</Text></div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{deptStats.avgExpensePerPerson.toLocaleString()}</div>
                  </Card>
                </Col>
              </Row>

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
        </TabPane>

        {/* 项目看板 */}
        <TabPane key="project" title="项目看板">
          {projectStats && (
            <div>
              {/* 概览卡片 */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Card>
                    <div><Text type="secondary">差旅费用总计</Text></div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{projectStats.totalExpense.toLocaleString()}</div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <div><Text type="secondary">占项目成本比例</Text></div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>{(projectStats.costRatio * 100).toFixed(1)}%</div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <div><Text type="secondary">出差人次</Text></div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>{projectStats.tripCount}</div>
                  </Card>
                </Col>
              </Row>

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
        </TabPane>

        {/* 费用分析 */}
        <TabPane key="analysis" title="费用分析">
          {expenseAnalysis && (
            <div>
              {/* 概览卡片 */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Card>
                    <div><Text type="secondary">总费用</Text></div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{expenseAnalysis.totalExpense.toLocaleString()}</div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <div><Text type="secondary">平均费用</Text></div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{expenseAnalysis.avgExpense.toLocaleString()}</div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <div><Text type="secondary">最高费用</Text></div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{expenseAnalysis.maxExpense.toLocaleString()}</div>
                  </Card>
                </Col>
              </Row>

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
        </TabPane>
      </Tabs>
    </div>
  );
}
