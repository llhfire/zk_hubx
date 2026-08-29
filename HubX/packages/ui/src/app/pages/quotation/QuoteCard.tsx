// 报价卡片：线索详情 / 项目详情共用的报价摘要卡，进入四阶段工作台。
import { Tag, Tooltip, Typography } from '@arco-design/web-react';
import { IconArrowRight } from '@arco-design/web-react/icon';
import { ProcessRecordCard } from '@/app/components/ui';
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
    <ProcessRecordCard
      leading={(
        <Tag color={quote.flowMode === 'file' ? 'purple' : 'arcoblue'} size="small">
          {quote.flowMode === 'file' ? '文件流转' : '数据流转'}
        </Tag>
      )}
      title={quote.basicInfo.projectName}
      tags={(
        <>
          <Tag color="arcoblue" size="small">{quote.version}</Tag>
          <Tag size="small" color={QUOTE_STATUS_COLORS[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Tag>
        </>
      )}
      actions={(
        <Tooltip content="进入工作台">
          <span className="hubx-process-record-card__indicator" aria-hidden="true">
            <IconArrowRight />
          </span>
        </Tooltip>
      )}
      onClick={onOpen}
      ariaLabel={`进入${quote.basicInfo.projectName}报价工作台`}
      identifier={quote.quoteNo}
      summary={(
        <>
          {evalSheet && <span>工期 <strong>{evalSheet.manualWorkDays}</strong> 工作日</span>}
          <span>人天 <strong>{totalDays.toFixed(1)}</strong></span>
          <span>报价 <Text style={{ color: 'rgb(var(--red-6))', fontWeight: 600 }}>{money(breakdown.grandTotal)}</Text></span>
          <span>{epCount} 端 · {modCount} 模块 · {subCount} 功能</span>
        </>
      )}
    />
  );
}
