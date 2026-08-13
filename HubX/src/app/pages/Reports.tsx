import { Card, Grid, Statistic, Select, Typography, Tabs } from '@arco-design/web-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { IconArrowRise } from '@arco-design/web-react/icon';

const Row = Grid.Row;
const Col = Grid.Col;
const Title = Typography.Title;
const TabPane = Tabs.TabPane;

export function Reports() {
  const salesFunnelData = [
    { stage: '公海线索', count: 450, conversion: 100 },
    { stage: '已认领', count: 320, conversion: 71 },
    { stage: '初步沟通', count: 240, conversion: 75 },
    { stage: '需求调研', count: 180, conversion: 75 },
    { stage: '方案报价', count: 120, conversion: 67 },
    { stage: '合同洽谈', count: 65, conversion: 54 },
    { stage: '已签单', count: 42, conversion: 65 },
  ];

  const salesTrendData = [
    { month: '2025-10', leads: 85, contracts: 15, amount: 280 },
    { month: '2025-11', leads: 92, contracts: 18, amount: 340 },
    { month: '2025-12', leads: 108, contracts: 22, amount: 420 },
    { month: '2026-01', leads: 125, contracts: 25, amount: 480 },
    { month: '2026-02', leads: 118, contracts: 20, amount: 380 },
    { month: '2026-03', leads: 142, contracts: 28, amount: 560 },
  ];

  const salesPersonData = [
    { name: '张三', leads: 45, contracts: 12, amount: 280, conversionRate: 26.7 },
    { name: '李四', leads: 38, contracts: 10, amount: 220, conversionRate: 26.3 },
    { name: '王五', leads: 42, contracts: 9, amount: 195, conversionRate: 21.4 },
    { name: '赵六', leads: 35, contracts: 8, amount: 175, conversionRate: 22.9 },
    { name: '孙七', leads: 32, contracts: 7, amount: 160, conversionRate: 21.9 },
  ];

  const leadSourceData = [
    { name: '百度推广', value: 180, color: '#165dff' },
    { name: '抖音', value: 125, color: '#00b42a' },
    { name: '小红书', value: 95, color: '#ff7d00' },
    { name: '微信推广', value: 78, color: '#f53f3f' },
    { name: '其他', value: 52, color: '#722ed1' },
  ];

  const projectCostData = [
    { name: 'A公司CRM系统', contract: 120, cost: 60, profit: 60, profitRate: 50 },
    { name: 'B公司电商平台', contract: 200, cost: 80, profit: 120, profitRate: 60 },
    { name: 'C公司移动应用', contract: 85, cost: 30, profit: 55, profitRate: 65 },
    { name: 'D公司数据中台', contract: 150, cost: 125, profit: 25, profitRate: 17 },
    { name: 'E公司小程序', contract: 55, cost: 48, profit: 7, profitRate: 13 },
  ];

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <Title heading={4}>数据报表</Title>
        <Select defaultValue="current-month" style={{ width: 180 }}>
          <Select.Option value="current-month">本月</Select.Option>
          <Select.Option value="last-month">上月</Select.Option>
          <Select.Option value="current-quarter">本季度</Select.Option>
          <Select.Option value="current-year">本年度</Select.Option>
        </Select>
      </div>

      <Tabs defaultActiveTab="sales">
        <TabPane key="sales" title="销售分析">
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总线索数"
                  value={450}
                  suffix={
                    <span style={{ fontSize: 14, color: '#00b42a' }}>
                      <IconArrowRise />
                      12.5%
                    </span>
                  }
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="签约数"
                  value={42}
                  suffix={
                    <span style={{ fontSize: 14, color: '#00b42a' }}>
                      <IconArrowRise />
                      18.2%
                    </span>
                  }
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="签约金额"
                  value="560万"
                  suffix={
                    <span style={{ fontSize: 14, color: '#00b42a' }}>
                      <IconArrowRise />
                      15.7%
                    </span>
                  }
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="转化率"
                  value="9.3%"
                  suffix={
                    <span style={{ fontSize: 14, color: '#00b42a' }}>
                      <IconArrowRise />
                      2.1%
                    </span>
                  }
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={16}>
              <Card title="销售漏斗分析">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={salesFunnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#165dff" name="数量" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={8}>
              <Card title="线索来源分布">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={leadSourceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {leadSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Card title="销售趋势">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={salesTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      key="leads-line"
                      yAxisId="left"
                      type="monotone"
                      dataKey="leads"
                      stroke="#165dff"
                      name="线索数"
                    />
                    <Line
                      key="contracts-line"
                      yAxisId="left"
                      type="monotone"
                      dataKey="contracts"
                      stroke="#00b42a"
                      name="签约数"
                    />
                    <Line
                      key="amount-line"
                      yAxisId="right"
                      type="monotone"
                      dataKey="amount"
                      stroke="#ff7d00"
                      name="签约金额(万)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane key="performance" title="人员业绩">
          <Card title="销售人员业绩排行">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={salesPersonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Legend />
                <Bar dataKey="leads" fill="#165dff" name="线索数" />
                <Bar dataKey="contracts" fill="#00b42a" name="签约数" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="销售金额排行" style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={salesPersonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#ff7d00" name="签约金额(万)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabPane>

        <TabPane key="project" title="项目成本">
          <Card title="项目成本与利润分析">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={projectCostData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="contract" fill="#165dff" name="合同金额(万)" />
                <Bar dataKey="cost" fill="#f53f3f" name="成本(万)" />
                <Bar dataKey="profit" fill="#00b42a" name="利润(万)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="项目利润率分析" style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={projectCostData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="profitRate" fill="#00b42a" name="利润率(%)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}