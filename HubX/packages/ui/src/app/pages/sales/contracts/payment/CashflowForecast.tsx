import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  DateText,
  DescriptionsCard,
  FilterBar,
  MoneyText,
  SectionCard,
  Select,
  Space,
  StatusTag,
} from '@/design-system';
import { aggregateCashflow } from './paymentCalc';
import { CERTAINTY_LABELS, CERTAINTY_TONES } from './types';
import type { PaymentAnalysisContract } from './contractPaymentProjection';
import type { ForecastCertaintyLevel, ForecastOverride } from './types';

const CASHFLOW_SERIES = [
  { key: 'high', dataKey: '高确信', fill: 'rgb(var(--success-6))' },
  { key: 'medium', dataKey: '正常履约', fill: 'rgb(var(--blue-6))' },
  { key: 'low', dataKey: '风险受阻', fill: 'rgb(var(--warning-6))' },
  { key: 'blocked', dataKey: '卡点停滞', fill: 'rgb(var(--danger-6))' },
] as const satisfies ReadonlyArray<{
  key: ForecastCertaintyLevel;
  dataKey: string;
  fill: string;
}>;

const toWan = (amount: number) => Math.round(amount / 1000) / 10;

function CashflowLegend() {
  return (
    <div role="list" aria-label="现金流确定性图例">
      <Space wrap size="medium">
        {CASHFLOW_SERIES.map((series) => (
          <StatusTag
            key={series.key}
            meta={{ label: CERTAINTY_LABELS[series.key], tone: CERTAINTY_TONES[series.key] }}
            size="small"
          />
        ))}
      </Space>
    </div>
  );
}

interface Props {
  contracts: PaymentAnalysisContract[];
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
    return metrics.map((m) => ({
      month: m.month.slice(5) + '月',
      monthFull: m.month,
      '高确信': toWan(m.highCertaintyAmount),
      '正常履约': toWan(m.mediumCertaintyAmount),
      '风险受阻': toWan(m.lowCertaintyAmount),
      '卡点停滞': toWan(m.blockedAmount),
      forecastTotal: m.totalForecast,
      receivedTotal: m.receivedAmount,
    }));
  }, [contracts, months, overrides, projectDelayMap]);

  return (
    <SectionCard title="现金流预测" description="按确定性汇总未来各月预计流入，金额单位为万元。">
      <FilterBar>
        <label htmlFor="cashflow-forecast-period">预测周期</label>
        <Select id="cashflow-forecast-period" value={period} onChange={setPeriod} style={{ width: 132 }}>
          <Select.Option value={3}>未来 3 个月</Select.Option>
          <Select.Option value={6}>未来 6 个月</Select.Option>
          <Select.Option value={12}>未来 12 个月</Select.Option>
        </Select>
      </FilterBar>

      {/* 堆叠柱状图 */}
      <div role="img" aria-label={`未来 ${period} 个月现金流预测，按确定性分层`}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis label={{ value: '万元', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value, name) => [
                <MoneyText key={String(name)} variant="compact" value={Number(value) * 10000} />,
                String(name),
              ]}
              labelFormatter={(label) => String(label)}
            />
            <Legend content={<CashflowLegend />} />
            {CASHFLOW_SERIES.map((series) => (
              <Bar key={series.key} dataKey={series.dataKey} stackId="a" fill={series.fill} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 汇总文字 */}
      <div className="payment-forecast-summary" aria-label="按月现金流汇总">
        <DescriptionsCard
          bare
          columns={3}
          items={data.map((d) => ({
            key: d.monthFull,
            label: <DateText value={`${d.monthFull}-01`} />,
            value: (
              <Space direction="vertical" size={2}>
                <span>预测 <MoneyText variant="compact" value={d.forecastTotal} /></span>
                <span>实收 <MoneyText variant="compact" value={d.receivedTotal} tone="success" /></span>
              </Space>
            ),
          }))}
        />
      </div>
    </SectionCard>
  );
}
