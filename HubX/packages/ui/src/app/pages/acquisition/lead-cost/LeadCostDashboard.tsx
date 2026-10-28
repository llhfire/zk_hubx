import {
  Grid,
  IconArrowRise,
  IconFile,
  IconSafe,
  IconUserGroup,
  DataTable,
  MetricGrid,
  MoneyText,
  PageHeader,
  PageShell,
  ProgressBar,
  SectionCard,
  StatusTag,
  Typography,
} from '@/design-system';
import {
  buildChannelSummaries,
  calculateActualCost,
  calculateCompositeScore,
  calculateNominalCost,
  calculateValidRate,
  formatCurrency,
  initialDailyCostRecords,
} from './mockData';

const Row = Grid.Row;
const Col = Grid.Col;
const Title = Typography.Title;

export function LeadCostDashboard() {
  const summaries = buildChannelSummaries(initialDailyCostRecords);
  const totalSpend = initialDailyCostRecords.reduce((sum, item) => sum + item.spend, 0);
  const totalRefund = initialDailyCostRecords.reduce((sum, item) => sum + item.refund, 0);
  const totalValidLeads = initialDailyCostRecords.reduce((sum, item) => sum + item.validLeads, 0);
  const totalInvalidLeads = initialDailyCostRecords.reduce((sum, item) => sum + item.invalidLeads, 0);
  const averageNominalCost = totalValidLeads ? totalSpend / totalValidLeads : 0;
  const averageActualCost = totalValidLeads ? (totalSpend - totalRefund) / totalValidLeads : 0;
  const rankedSummaries = summaries
    .map((summary) => ({
      ...summary,
      score: calculateCompositeScore(summary, summaries),
    }))
    .sort((a, b) => b.score - a.score);
  const bestChannel = rankedSummaries[0];

  const columns = [
    { title: '排名', width: 80, render: (_: unknown, __: unknown, index: number) => index + 1 },
    { title: '平台', dataIndex: 'platform', width: 100, render: (platform: string) => <StatusTag tone="info">{platform}</StatusTag> },
    { title: '渠道', dataIndex: 'channel', width: 200 },
    { title: '消耗', dataIndex: 'spend', width: 120, render: (value: number) => formatCurrency(value) },
    { title: '退款', dataIndex: 'refund', width: 120, render: (value: number) => formatCurrency(value) },
    { title: '有效线索', dataIndex: 'validLeads', width: 100 },
    { title: '无效线索', dataIndex: 'invalidLeads', width: 100 },
    {
      title: '有效率',
      width: 140,
      render: (_: unknown, record: any) => `${calculateValidRate(record).toFixed(1)}%`,
    },
    {
      title: '名义成本',
      width: 120,
      render: (_: unknown, record: any) => formatCurrency(calculateNominalCost(record)),
    },
    {
      title: '实际成本',
      width: 120,
      render: (_: unknown, record: any) => formatCurrency(calculateActualCost(record)),
    },
    {
      title: '综合评分',
      width: 160,
      render: (_: unknown, record: any) => <ProgressBar percent={record.score} size="small" />,
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="成本看板"
        description="按渠道汇总投放消耗、线索成本与有效率，识别高低效渠道。"
      />

      <MetricGrid
        items={[
          { key: 'spend', label: '今日总消耗', value: <MoneyText value={totalSpend} />, detail: <>退款 <MoneyText value={totalRefund} /></> },
          { key: 'valid', label: <><IconUserGroup /> 有效线索总数</>, value: `${totalValidLeads} 条`, detail: `无效线索 ${totalInvalidLeads} 条` },
          { key: 'avg', label: '平均线索成本', value: <MoneyText value={averageActualCost} />, detail: <>名义 <MoneyText value={averageNominalCost} /></> },
          { key: 'best', label: <><IconSafe /> 最佳渠道</>, value: `${bestChannel?.score ?? 0} 分`, detail: bestChannel?.channel ?? '暂无渠道' },
        ]}
      />

      <SectionCard title="渠道综合排名" extra={<IconArrowRise style={{ color: 'rgb(var(--primary-6))' }} />}>
        <DataTable columns={columns} data={rankedSummaries} pagination={false} scroll={{ x: 1400 }} />
      </SectionCard>

      <SectionCard style={{ marginTop: 16 }}>
        <div className="flex items-center gap-3">
          <IconFile style={{ fontSize: 'var(--text-2xl)', color: 'rgb(var(--primary-6))' }} />
          <div>
            <div style={{ fontWeight: 600 }}>成本口径说明</div>
            <div style={{ color: 'var(--color-text-2)', marginTop: 4 }}>
              名义成本 = 消耗金额 ÷ 有效线索数；实际成本 =（消耗金额 - 退款金额）÷ 有效线索数。
            </div>
          </div>
        </div>
      </SectionCard>
    </PageShell>
  );
}
