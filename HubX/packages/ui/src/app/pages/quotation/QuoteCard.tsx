// 报价卡片：线索详情 / 项目详情共用的报价摘要卡，进入四阶段工作台。
import { Button, Tag, Typography } from '@arco-design/web-react';
import { computeAmountBreakdown } from './quoteFlow';
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS, type Quote } from './types';

const { Text } = Typography;

function money(n: number) {
  return `¥${n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}

export function QuoteCard({ quote, onOpen }: { quote: Quote; onOpen: () => void }) {
  const breakdown = computeAmountBreakdown(quote);
  const evalSheet = quote.evalSheet;
  const totalDays = evalSheet ? evalSheet.evaluationUnits.reduce((s, u) => s + u.totalDays, 0) : 0;
  const epCount = (quote.endpointConfigs || []).length;
  const modCount = (quote.featureList || []).length;
  const subCount = (quote.featureList || []).reduce((s, m) => s + (m.subFeatures?.length || 0), 0);

  return (
    <div style={{ border: '1px solid var(--color-border-2)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <Text style={{ fontWeight: 600 }}>{quote.basicInfo.projectName}</Text>
        <Tag color="arcoblue" size="small">{quote.version}</Tag>
        <Tag size="small" color={QUOTE_STATUS_COLORS[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Tag>
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>{quote.quoteNo}</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10, fontSize: 12 }}>
        {evalSheet && <span>工期 <strong>{evalSheet.manualWorkDays}</strong> 工作日</span>}
        <span>人天 <strong>{totalDays.toFixed(1)}</strong></span>
        <span>报价 <strong style={{ color: 'rgb(var(--red-6))' }}>{money(breakdown.grandTotal)}</strong></span>
        <span>{epCount} 端 · {modCount} 模块 · {subCount} 功能</span>
      </div>
      <Button size="mini" type="primary" onClick={onOpen}>进入工作台</Button>
    </div>
  );
}
