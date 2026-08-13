import { Button, Card, DatePicker, Grid, Message, Progress, Select, Space, Table, Tag, Typography } from '@arco-design/web-react';
import { IconDownload } from '@arco-design/web-react/icon';
import { Bar, BarChart, CartesianGrid, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  buildChannelSummaries,
  calculateActualCost,
  calculateCompositeScore,
  calculateNominalCost,
  calculateValidRate,
  formatCurrency,
  initialDailyCostRecords,
  platforms,
  safeDivide,
} from './mockData';

const Row = Grid.Row;
const Col = Grid.Col;
const Title = Typography.Title;

export function LeadCostAnalysis() {
  const summaries = buildChannelSummaries(initialDailyCostRecords);
  const rankedSummaries = summaries
    .map((summary) => ({
      ...summary,
      actualCost: calculateActualCost(summary),
      nominalCost: calculateNominalCost(summary),
      validRate: calculateValidRate(summary),
      qualityRate: safeDivide(summary.highQualityLeads, summary.validLeads) * 100,
      score: calculateCompositeScore(summary, summaries),
    }))
    .sort((a, b) => b.score - a.score);

  const barData = rankedSummaries.map((item) => ({
    channel: item.platform,
    消耗金额: item.spend,
    有效线索: item.validLeads,
  }));

  const radarData = [
    { subject: '成本优势', ...Object.fromEntries(rankedSummaries.map((item) => [item.platform, Math.max(0, 100 - item.actualCost / 5)])) },
    { subject: '有效率', ...Object.fromEntries(rankedSummaries.map((item) => [item.platform, item.validRate])) },
    { subject: '线索量', ...Object.fromEntries(rankedSummaries.map((item) => [item.platform, item.validLeads * 5])) },
    { subject: '客资质量', ...Object.fromEntries(rankedSummaries.map((item) => [item.platform, item.qualityRate])) },
  ];

  const columns = [
    { title: '排名', width: 80, render: (_: unknown, __: unknown, index: number) => index + 1 },
    { title: '平台', dataIndex: 'platform', width: 100, render: (platform: string) => <Tag color="arcoblue">{platform}</Tag> },
    { title: '渠道', dataIndex: 'channel', width: 200 },
    { title: '消耗', dataIndex: 'spend', width: 120, render: (value: number) => formatCurrency(value) },
    { title: '退款影响', dataIndex: 'refund', width: 120, render: (value: number) => formatCurrency(value) },
    { title: '有效线索', dataIndex: 'validLeads', width: 100 },
    { title: '名义成本', dataIndex: 'nominalCost', width: 120, render: (value: number) => formatCurrency(value) },
    { title: '实际成本', dataIndex: 'actualCost', width: 120, render: (value: number) => formatCurrency(value) },
    { title: '有效率', dataIndex: 'validRate', width: 120, render: (value: number) => `${value.toFixed(1)}%` },
    { title: '客资质量', dataIndex: 'qualityRate', width: 120, render: (value: number) => `${value.toFixed(1)}%` },
    { title: '综合评分', dataIndex: 'score', width: 160, render: (value: number) => <Progress percent={value} size="small" /> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <Title heading={4}>渠道分析</Title>
        <Button icon={<IconDownload />} onClick={() => Message.info('第一版仅展示导出按钮，暂不实现真实导出')}>导出 Excel</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <DatePicker.RangePicker style={{ width: 260 }} />
          <Select placeholder="平台" mode="multiple" style={{ width: 260 }} allowClear>
            {platforms.map((platform) => <Select.Option key={platform} value={platform}>{platform}</Select.Option>)}
          </Select>
          <Button type="primary">分析</Button>
        </Space>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card title="消耗金额与有效线索数对比">
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channel" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="消耗金额" fill="#165dff" />
                  <Bar dataKey="有效线索" fill="#00b42a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="渠道四维能力雷达图">
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis />
                  {rankedSummaries.slice(0, 4).map((item, index) => (
                    <Radar
                      key={item.platform}
                      name={item.platform}
                      dataKey={item.platform}
                      stroke={['#165dff', '#00b42a', '#ff7d00', '#f53f3f'][index]}
                      fill={['#165dff', '#00b42a', '#ff7d00', '#f53f3f'][index]}
                      fillOpacity={0.15}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="渠道综合明细">
        <Table columns={columns} data={rankedSummaries} scroll={{ x: 1500 }} pagination={false} />
      </Card>
    </div>
  );
}
