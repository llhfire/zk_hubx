import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Space, Typography } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { useContracts } from './ContractsContext';
import { computeKanbanSummary, getReceivedAmount } from './paymentUtils';
import type { Contract } from './types';

const Title = Typography.Title;
const Text = Typography.Text;

type DateFilter = 'all' | 'current' | '3m' | '6m' | '1y';

const filters: Array<{ key: DateFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'current', label: '本月' },
  { key: '3m', label: '近 3 个月' },
  { key: '6m', label: '近 6 个月' },
  { key: '1y', label: '近 1 年' },
];

const statusItems = [
  { key: 'executing', label: '执行中', color: '#2563eb' },
  { key: 'completed', label: '已完成', color: '#10b981' },
  { key: 'paused', label: '已暂停', color: '#f59e0b' },
  { key: 'ended', label: '已终止', color: '#ef4444' },
];

const stageItems = ['需求调研', 'UI / 原型设计', '开发中', '测试中', '待验收'];

function money(value: number) {
  return `¥${(value / 10000).toFixed(1)}万`;
}

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

function cardStyle() {
  return { borderRadius: 18, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)' };
}

function metric(label: string, value: string, hint: string, color: string) {
  return (
    <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)' }}>
      <Text type="secondary">{label}</Text>
      <div style={{ fontSize: 24, fontWeight: 700, color, marginTop: 8 }}>{value}</div>
      <Text type="secondary" style={{ fontSize: 12 }}>{hint}</Text>
    </Card>
  );
}

function progressRow(label: string, value: number, max: number, color: string) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, marginBottom: 10 }}>
        <span>{label}</span>
        <strong>{money(value)}</strong>
      </div>
      <div style={{ height: 10, background: '#eef2f7', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function donutGradient(items: Array<{ color: string; value: number }>) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return '#eef2f7';
  let start = 0;
  return `conic-gradient(${items.map(item => {
    const end = start + (item.value / total) * 360;
    const part = `${item.color} ${start}deg ${end}deg`;
    start = end;
    return part;
  }).join(', ')})`;
}

function barListRow(label: string, value: number, max: number) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, marginBottom: 10 }}>
        <span>{label}</span>
        <strong>{value} 个</strong>
      </div>
      <div style={{ height: 10, background: '#eef2f7', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', background: '#2563eb', borderRadius: 999 }} />
      </div>
    </div>
  );
}

export function ContractKanban() {
  const navigate = useNavigate();
  const { contracts } = useContracts();
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const data = useMemo(() => {
    const now = new Date();
    const range = rangeFor(dateFilter, now);
    const activeContracts = contracts.filter(c => c.status !== 'voided');
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
      ended: contracts.filter(c => c.status === 'voided').length,
    };
    const stageCounts = {
      '需求调研': filteredContracts.filter(c => c.status === 'draft').length,
      'UI / 原型设计': filteredContracts.filter(c => c.status === 'approving').length,
      '开发中': filteredContracts.filter(c => c.executionStatus === '履行中').length,
      '测试中': filteredContracts.filter(c => c.status === 'pending_mail' || c.status === 'pending_return').length,
      '待验收': filteredContracts.filter(c => c.status === 'archived' && c.executionStatus !== '已完成').length,
    };
    return { monthAmounts, monthDue, monthReceived, monthOverdue, next30, statusCounts, stageCounts, summary, total, received };
  }, [contracts, dateFilter]);

  const maxMonthAmount = Math.max(...data.monthAmounts.map(item => item.value), 1);
  const paymentMax = Math.max(data.monthDue, data.monthReceived, data.monthOverdue, data.next30, 1);
  const donutItems = statusItems.map(item => ({ ...item, value: data.statusCounts[item.key as keyof typeof data.statusCounts] }));
  const stageMax = Math.max(...stageItems.map(item => data.stageCounts[item as keyof typeof data.stageCounts]), 1);
  const collectionRate = data.total > 0 ? Math.round((data.received / data.total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <Space size={16}>
          <Title heading={4} style={{ margin: 0 }}>合同看板</Title>
          <Space size={6}>
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
        </Space>
        <Space>
          <Button onClick={() => navigate('/contracts')}>合同列表</Button>
          <Button type="primary" icon={<IconPlus />} onClick={() => navigate('/contracts/new')}>
            新建合同
          </Button>
        </Space>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 16 }}>
        {metric('合同总额', money(data.total), `${data.summary.totalContracts} 份有效合同`, '#1d4ed8')}
        {metric('已回款', money(data.received), `回款率 ${collectionRate}%`, '#059669')}
        {metric('待回款', money(Math.max(0, data.total - data.received)), `未来 30 天 ${money(data.next30)}`, '#b45309')}
        {metric('风险合同', `${data.summary.blockedCount} 个`, `卡点金额 ${money(data.summary.blockedAmount)}`, '#dc2626')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card bordered={false} style={cardStyle()}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>月度新签合同金额趋势</div>
              <Text type="secondary">单位：万元</Text>
            </div>
            <div style={{ alignSelf: 'flex-start', padding: '4px 12px', borderRadius: 999, background: '#dbeafe', color: '#2563eb', fontWeight: 700 }}>
              {dateFilter === 'all' ? '近 6 个月' : filters.find(f => f.key === dateFilter)?.label}
            </div>
          </div>
          <div style={{ height: 300, display: 'flex', alignItems: 'flex-end', gap: 28, borderBottom: '1px solid #e5e7eb', padding: '20px 0 0' }}>
            {data.monthAmounts.map(item => {
              const height = Math.max(24, Math.round((item.value / maxMonthAmount) * 230));
              return (
                <div key={item.label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>{Math.round(item.value / 10000)}</div>
                  <div style={{ height, maxWidth: 52, margin: '0 auto', borderRadius: '12px 12px 0 0', background: 'linear-gradient(180deg, #60a5fa, #2563eb)' }} />
                  <div style={{ marginTop: 12, color: '#6b7280' }}>{item.label}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card bordered={false} style={cardStyle()}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>本月回款完成情况</div>
          <Text type="secondary">应收 / 实收 / 逾期</Text>
          {progressRow('本月应收', data.monthDue, paymentMax, '#2563eb')}
          {progressRow('本月实收', data.monthReceived, paymentMax, '#10b981')}
          {progressRow('本月逾期', data.monthOverdue, paymentMax, '#ef4444')}
          {progressRow('未来 30 天预计回款', data.next30, paymentMax, '#f59e0b')}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card bordered={false} style={cardStyle()}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>合同状态分布</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 26 }}>
            <div style={{ width: 170, height: 170, borderRadius: '50%', background: donutGradient(donutItems), position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 48, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700 }}>
                合同状态
              </div>
            </div>
          </div>
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            {donutItems.map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 16 }}>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: item.color, marginRight: 10 }} />{item.label}</span>
                <strong>{item.value} 个</strong>
              </div>
            ))}
          </Space>
        </Card>

        <Card bordered={false} style={cardStyle()}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>项目阶段分布</div>
          {stageItems.map(item => barListRow(item, data.stageCounts[item as keyof typeof data.stageCounts], stageMax))}
        </Card>
      </div>
    </div>
  );
}
