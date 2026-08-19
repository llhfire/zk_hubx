import { useMemo, useState } from 'react';
import { Card, Select, Space, Typography } from '@arco-design/web-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { aggregateCashflow } from './paymentCalc';
import type { Contract } from '../types';
import type { ForecastOverride } from './types';

const { Text } = Typography;

interface Props {
  contracts: Contract[];
  overrides?: ForecastOverride[];
  projectDelayMap?: Record<string, number>;
}

export function CashflowForecast({ contracts, overrides = [], projectDelayMap = {} }: Props) {
  const [period, setPeriod] = useState<3 | 6 | 12>(3);

  const months = useMemo(() => {
    const result: string[] = [];
    const start = new Date('2026-08-01');
    for (let i = 0; i < period; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      result.push(d.toISOString().slice(0, 7));
    }
    return result;
  }, [period]);

  const data = useMemo(() => {
    const metrics = aggregateCashflow(contracts, months, overrides, projectDelayMap);
    return metrics.map(m => ({
      month: m.month.slice(5) + '月',
      monthFull: m.month,
      '高确信': Math.round(m.highCertaintyAmount / 10000 * 10) / 10,
      '正常履约': Math.round(m.mediumCertaintyAmount / 10000 * 10) / 10,
      '风险受阻': Math.round(m.lowCertaintyAmount / 10000 * 10) / 10,
      '卡点停滞': Math.round(m.blockedAmount / 10000 * 10) / 10,
      '已到账': Math.round(m.receivedAmount / 10000 * 10) / 10,
      forecastTotal: Math.round(m.totalForecast / 10000 * 10) / 10,
      receivedTotal: Math.round(m.receivedAmount / 10000 * 10) / 10,
    }));
  }, [contracts, months, overrides, projectDelayMap]);

  return (
    <Card title="现金流预测" style={{ marginBottom: 'var(--space-5)' }}>
      {/* 控制栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <Space>
          <Text type="secondary" style={{ fontSize: 'var(--text-sm)' }}>周期:</Text>
          <Select value={period} onChange={setPeriod} style={{ width: 120 }}>
            <Select.Option value={3}>未来 3 个月</Select.Option>
            <Select.Option value={6}>未来 6 个月</Select.Option>
            <Select.Option value={12}>未来 12 个月</Select.Option>
          </Select>
        </Space>
      </div>

      {/* 堆叠柱状图 */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis label={{ value: '万元', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            formatter={(value: number, name: string) => [`¥${value}万`, name]}
            labelFormatter={(label: string) => `${label}`}
          />
          <Legend />
          <Bar dataKey="高确信" stackId="a" fill="#22c55e" />
          <Bar dataKey="正常履约" stackId="a" fill="#3b82f6" />
          <Bar dataKey="风险受阻" stackId="a" fill="#f59e0b" />
          <Bar dataKey="卡点停滞" stackId="a" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>

      {/* 汇总文字 */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-5)',
        marginTop: 'var(--space-4)',
        padding: 'var(--space-3)',
        background: 'var(--color-fill-1)',
        borderRadius: 'var(--radius-md)',
      }}>
        {data.map(d => (
          <div key={d.monthFull} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--text-sm)' }}>{d.month}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
              预测: ¥{d.forecastTotal}万
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--success-500)' }}>
              实收: ¥{d.receivedTotal}万
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
