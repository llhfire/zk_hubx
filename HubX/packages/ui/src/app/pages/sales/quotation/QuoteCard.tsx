// 报价卡片：线索详情 / 项目详情共用的报价摘要卡，进入四阶段工作台。
import { Tooltip } from '@/design-system';
import { IconArrowRight } from '@/design-system';
import { IdentifierText, MoneyText, ProcessRecordCard, StatusTag, resolveStatus } from '@/design-system';
import { computeAmountBreakdown } from './quoteFlow';
import { QUOTE_STATUS, type Quote } from './types';

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
        <StatusTag tone={quote.flowMode === 'file' ? 'purple' : 'info'} size="small">
          {quote.flowMode === 'file' ? '文件流转' : '数据流转'}
        </StatusTag>
      )}
      title={quote.basicInfo.projectName}
      tags={(
        <>
          <StatusTag tone="info" size="small">{quote.version}</StatusTag>
          <StatusTag meta={resolveStatus(QUOTE_STATUS, quote.status)} />
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
      identifier={<IdentifierText value={quote.quoteNo} />}
      summary={(
        <>
          {evalSheet && <span>工期 <strong>{evalSheet.manualWorkDays}</strong> 工作日</span>}
          <span>人天 <strong>{totalDays.toFixed(1)}</strong></span>
          <span>报价 <MoneyText value={breakdown.grandTotal} tone="danger" /></span>
          <span>{epCount} 端 · {modCount} 模块 · {subCount} 功能</span>
        </>
      )}
    />
  );
}
