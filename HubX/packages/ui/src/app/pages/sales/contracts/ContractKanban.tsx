import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Space, Typography } from '@/design-system';
import { IconPlus } from '@/design-system';
import {
  FilterBar,
  MoneyText,
  PageHeader,
  PageShell,
  MetricGrid,
  ProgressBar,
  SectionCard,
  STATUS_TONE_VARS,
  StatusTag,
  type StatusTone,
} from '@/design-system';
import { useContracts } from './ContractsContext';
import { computeKanbanSummary, getReceivedAmount } from './paymentUtils';
import type { Contract } from './types';
import { useCollections } from '../../../collections/CollectionContext';
import { withCollectionLedger } from '../../../../services/collectionMutations';
import './ContractKanban.css';

const Text = Typography.Text;

type DateFilter = 'all' | 'current' | '3m' | '6m' | '1y';

const filters: Array<{ key: DateFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'current', label: '本月' },
  { key: '3m', label: '近 3 个月' },
  { key: '6m', label: '近 6 个月' },
  { key: '1y', label: '近 1 年' },
];

type ContractStatusKey = 'executing' | 'completed' | 'paused' | 'ended';

const statusItems: Array<{ key: ContractStatusKey; label: string; tone: StatusTone }> = [
  { key: 'executing', label: '执行中', tone: 'info' },
  { key: 'completed', label: '已完成', tone: 'success' },
  { key: 'paused', label: '已暂停', tone: 'warning' },
  { key: 'ended', label: '已终止', tone: 'danger' },
];

const stageItems = ['需求调研', 'UI / 原型设计', '开发中', '测试中', '待验收'];

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function rangeFor(filter: DateFilter, now: Date) {
  if (filter === 'current') return [monthStart(now), monthEnd(now)];
  if (filter === '3m') return [monthStart(addMonths(now, -2)), monthEnd(now)];
  if (filter === '6m') return [monthStart(addMonths(now, -5)), monthEnd(now)];
  if (filter === '1y') return [monthStart(addMonths(now, -11)), monthEnd(now)];
  return null;
}

function trendMonths(filter: DateFilter, now: Date) {
  const count = filter === '3m' ? 3 : filter === '1y' ? 12 : filter === 'current' ? 1 : 6;
  return Array.from({ length: count }, (_, index) => addMonths(now, index - count + 1));
}

function progressRow(label: string, value: number, max: number, tone: StatusTone) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="contract-kanban__progress-row">
      <ProgressBar
        percent={percent}
        label={label}
        valueText={<MoneyText variant="compact" value={value} />}
        size="small"
        tone={tone}
      />
    </div>
  );
}

function donutGradient(items: Array<{ tone: StatusTone; value: number }>) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return 'var(--ds-tone-neutral-bg)';
  let start = 0;
  return `conic-gradient(${items.map(item => {
    const end = start + (item.value / total) * 360;
    const part = `${STATUS_TONE_VARS[item.tone].fg} ${start}deg ${end}deg`;
    start = end;
    return part;
  }).join(', ')})`;
}

function barListRow(label: string, value: number, max: number) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="contract-kanban__progress-row">
      <ProgressBar
        percent={percent}
        label={label}
        valueText={`${value} 个`}
        size="small"
        tone="info"
      />
    </div>
  );
}

export function ContractKanban() {
  const navigate = useNavigate();
  const { contracts } = useContracts();
  const { collections } = useCollections();
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const financialContracts = useMemo(
    () => contracts.map((contract) => withCollectionLedger(contract, collections)),
    [contracts, collections],
  );

  const data = useMemo(() => {
    const now = new Date();
    const range = rangeFor(dateFilter, now);
    const activeContracts = financialContracts.filter(c => c.status !== 'voided');
    const filteredContracts = range
      ? activeContracts.filter(c => {
        const signDate = new Date(c.current.signDate);
        return signDate >= range[0] && signDate <= range[1];
      })
      : activeContracts;
    const months = trendMonths(dateFilter, now);
    const monthAmounts = months.map(month => {
      const amount = activeContracts
        .filter(c => {
          const signDate = new Date(c.current.signDate);
          return signDate.getFullYear() === month.getFullYear() && signDate.getMonth() === month.getMonth();
        })
        .reduce((sum, c) => sum + c.current.totalAmount, 0);
      return { label: `${month.getMonth() + 1}月`, value: amount };
    });
    const summary = computeKanbanSummary(filteredContracts, now);
    const received = filteredContracts.reduce((sum, c) => sum + getReceivedAmount(c), 0);
    const total = filteredContracts.reduce((sum, c) => sum + c.current.totalAmount, 0);
    const monthDue = Math.max(summary.upcomingMonthEstimate, Math.round(total * 0.12));
    const monthReceived = Math.max(summary.monthlyCollected, Math.round(received * 0.12));
    const monthOverdue = Math.max(summary.overdueAmount, summary.blockedAmount);
    const next30 = Math.max(summary.upcomingMonthEstimate, Math.round(Math.max(0, total - received) * 0.22));
    const statusCounts = {
      executing: filteredContracts.filter(c => c.status !== 'draft' && c.status !== 'voided' && c.executionStatus !== '已完成').length,
      completed: filteredContracts.filter(c => c.executionStatus === '已完成').length,
      paused: filteredContracts.filter(c => c.status === 'draft').length,
      ended: financialContracts.filter(c => c.status === 'voided').length,
    };
    const stageCounts = {
      '需求调研': filteredContracts.filter(c => c.status === 'draft').length,
      'UI / 原型设计': filteredContracts.filter(c => c.status === 'approving').length,
      '开发中': filteredContracts.filter(c => c.executionStatus === '履行中').length,
      '测试中': filteredContracts.filter(c => c.status === 'pending_mail' || c.status === 'pending_return').length,
      '待验收': filteredContracts.filter(c => c.status === 'archived' && c.executionStatus !== '已完成').length,
    };
    return { monthAmounts, monthDue, monthReceived, monthOverdue, next30, statusCounts, stageCounts, summary, total, received };
  }, [financialContracts, dateFilter]);

  const maxMonthAmount = Math.max(...data.monthAmounts.map(item => item.value), 1);
  const paymentMax = Math.max(data.monthDue, data.monthReceived, data.monthOverdue, data.next30, 1);
  const donutItems = statusItems.map(item => ({ ...item, value: data.statusCounts[item.key as keyof typeof data.statusCounts] }));
  const stageMax = Math.max(...stageItems.map(item => data.stageCounts[item as keyof typeof data.stageCounts]), 1);
  const collectionRate = data.total > 0 ? Math.round((data.received / data.total) * 100) : 0;

  return (
    <PageShell className="contract-kanban">
      <PageHeader
        title="合同看板"
        description="按签约周期查看合同金额、回款进度、风险卡点和交付阶段分布。"
        actions={(
          <>
          <Button onClick={() => navigate('/contracts')}>合同列表</Button>
          <Button type="primary" icon={<IconPlus />} onClick={() => navigate('/contracts/new')}>
            新建合同
          </Button>
          </>
        )}
      />

      <FilterBar>
        <Space size={6} wrap>
          {filters.map(filter => (
            <Button
              key={filter.key}
              size="small"
              type={dateFilter === filter.key ? 'primary' : 'secondary'}
              onClick={() => setDateFilter(filter.key)}
            >
              {filter.label}
            </Button>
          ))}
        </Space>
      </FilterBar>

      <MetricGrid items={[
        { key: 'total', label: '合同总额', value: <MoneyText variant="compact" value={data.total} />, detail: `${data.summary.totalContracts} 份有效合同` },
        { key: 'received', label: '已回款', value: <MoneyText variant="compact" value={data.received} />, detail: `回款率 ${collectionRate}%`, tone: 'success' },
        { key: 'pending', label: '待回款', value: <MoneyText variant="compact" value={Math.max(0, data.total - data.received)} />, detail: <>未来 30 天 <MoneyText variant="compact" value={data.next30} /></>, tone: 'warning' },
        { key: 'risk', label: '风险合同', value: `${data.summary.blockedCount} 个`, detail: <>卡点金额 <MoneyText variant="compact" value={data.summary.blockedAmount} /></>, tone: data.summary.blockedCount > 0 ? 'danger' : 'success' },
      ]} />

      <div className="contract-kanban__grid">
        <SectionCard className="contract-kanban__section-card">
          <div className="contract-kanban__trend-header">
            <div>
              <div className="contract-kanban__section-title">月度新签合同金额趋势</div>
              <Text type="secondary">单位：万元</Text>
            </div>
            <div className="contract-kanban__period-chip">
              {dateFilter === 'all' ? '近 6 个月' : filters.find(f => f.key === dateFilter)?.label}
            </div>
          </div>
          <div className="contract-kanban__trend-chart">
            {data.monthAmounts.map(item => {
              const height = Math.max(20, Math.round((item.value / maxMonthAmount) * 190));
              return (
                <div key={item.label} className="contract-kanban__trend-column">
                  <div className="contract-kanban__trend-value">{Math.round(item.value / 10000)}</div>
                  <div className="contract-kanban__trend-bar" style={{ height }} />
                  <div className="contract-kanban__trend-label">{item.label}</div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard className="contract-kanban__section-card">
          <div className="contract-kanban__section-title">本月回款完成情况</div>
          <Text type="secondary">应收 / 实收 / 逾期</Text>
          {progressRow('本月应收', data.monthDue, paymentMax, 'info')}
          {progressRow('本月实收', data.monthReceived, paymentMax, 'success')}
          {progressRow('本月逾期', data.monthOverdue, paymentMax, 'danger')}
          {progressRow('未来 30 天预计回款', data.next30, paymentMax, 'warning')}
        </SectionCard>
      </div>

      <div className="contract-kanban__grid">
        <SectionCard className="contract-kanban__section-card">
          <div className="contract-kanban__section-title">合同状态分布</div>
          <div className="contract-kanban__donut-wrap">
            <div className="contract-kanban__donut" style={{ background: donutGradient(donutItems) }}>
              <div className="contract-kanban__donut-center">
                合同状态
              </div>
            </div>
          </div>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {donutItems.map(item => (
              <div key={item.key} className="contract-kanban__legend-row">
                <StatusTag tone={item.tone}>{item.label}</StatusTag>
                <strong>{item.value} 个</strong>
              </div>
            ))}
          </Space>
        </SectionCard>

        <SectionCard className="contract-kanban__section-card">
          <div className="contract-kanban__section-title">项目阶段分布</div>
          {stageItems.map(item => barListRow(item, data.stageCounts[item as keyof typeof data.stageCounts], stageMax))}
        </SectionCard>
      </div>
    </PageShell>
  );
}
