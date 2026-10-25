import { useMemo, useState } from 'react';
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
  type LeadCostPlatform,
} from './mockData';

const Row = Grid.Row;
const Col = Grid.Col;
const Title = Typography.Title;

export function LeadCostAnalysis() {
  const [draftFilters, setDraftFilters] = useState<{ dateRange: string[]; platforms: LeadCostPlatform[] }>({ dateRange: [], platforms: [] });
  const [filters, setFilters] = useState(draftFilters);
  const records = useMemo(() => initialDailyCostRecords.filter((record) => (
    (!filters.dateRange[0] || record.date >= filters.dateRange[0])
    && (!filters.dateRange[1] || record.date <= filters.dateRange[1])
    && (filters.platforms.length === 0 || filters.platforms.includes(record.platform))
  )), [filters]);
  const summaries = buildChannelSummaries(records);
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

  const handleExport = async () => {
    if (rankedSummaries.length === 0) {
      Message.warning('当前筛选条件下没有可导出的数据');
      return;
    }
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('渠道成本分析');
      sheet.columns = [
        { header: '排名', key: 'rank', width: 10 }, { header: '平台', key: 'platform', width: 12 },
        { header: '渠道', key: 'channel', width: 26 }, { header: '消耗', key: 'spend', width: 14 },
        { header: '退款影响', key: 'refund', width: 14 }, { header: '有效线索', key: 'validLeads', width: 12 },
        { header: '名义成本', key: 'nominalCost', width: 14 }, { header: '实际成本', key: 'actualCost', width: 14 },
        { header: '有效率(%)', key: 'validRate', width: 14 }, { header: '客资质量(%)', key: 'qualityRate', width: 16 },
        { header: '综合评分', key: 'score', width: 12 },
      ];
      rankedSummaries.forEach((item, index) => sheet.addRow({ ...item, rank: index + 1 }));
      sheet.getRow(1).font = { bold: true };
      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `渠道成本分析-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      Message.success('分析结果已导出');
    } catch {
      Message.error('导出失败，请重试');
    }
  };

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
      <div className="flex items-center justify-end" style={{ marginBottom: 16 }}>
        <Button icon={<IconDownload />} onClick={handleExport}>导出 Excel</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <DatePicker.RangePicker style={{ width: 260 }} value={draftFilters.dateRange} onChange={(dateRange) => setDraftFilters((current) => ({ ...current, dateRange: dateRange || [] }))} />
          <Select placeholder="平台" mode="multiple" style={{ width: 260 }} allowClear value={draftFilters.platforms} onChange={(selected) => setDraftFilters((current) => ({ ...current, platforms: (selected || []) as LeadCostPlatform[] }))}>
            {platforms.map((platform) => <Select.Option key={platform} value={platform}>{platform}</Select.Option>)}
          </Select>
          <Button type="primary" onClick={() => setFilters(draftFilters)}>分析</Button>
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
                  <Bar dataKey="消耗金额" fill="var(--primary)" />
                  <Bar dataKey="有效线索" fill="var(--success-500)" />
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
                      stroke={['var(--primary)', 'var(--success-500)', 'var(--warning-500)', 'var(--destructive-500)'][index]}
                      fill={['var(--primary)', 'var(--success-500)', 'var(--warning-500)', 'var(--destructive-500)'][index]}
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
        <Table columns={columns} data={rankedSummaries} scroll={{ x: 1500 }} pagination={false} noDataContent="当前筛选条件下暂无数据" />
      </Card>
    </div>
  );
}
