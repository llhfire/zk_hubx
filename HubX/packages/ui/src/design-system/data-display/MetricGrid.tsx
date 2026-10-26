import type { ReactNode } from 'react';
import { Card } from '@arco-design/web-react';
import '../foundation.css';

export type MetricTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface MetricItem {
  key: string;
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  tone?: MetricTone;
  onClick?: () => void;
  ariaLabel?: string;
}

interface MetricGridProps {
  items: MetricItem[];
}

/**
 * 指标网格。所有「一排统计卡」都走它，不要再用 <Statistic> 或手拼 Card 网格。
 * 两行结构（标签一行 + 值一行）由 CSS 保证，见 M-043。
 */
export function MetricGrid({ items }: MetricGridProps) {
  return (
    <Card className="hubx-process-metrics" size="small">
      <div className="hubx-process-metrics__grid">
        {items.map((item) => {
          const content = (
            <>
              <div className="hubx-process-metric__label">{item.label}</div>
              <div className="hubx-process-metric__value">{item.value}</div>
              {item.detail && <div className="hubx-process-metric__detail">{item.detail}</div>}
            </>
          );
          const className = [
            'hubx-process-metric',
            `hubx-process-metric--${item.tone ?? 'neutral'}`,
            item.onClick ? 'hubx-process-metric--interactive' : '',
          ].filter(Boolean).join(' ');
          return item.onClick ? (
            <button key={item.key} type="button" className={className} onClick={item.onClick} aria-label={item.ariaLabel}>
              {content}
            </button>
          ) : (
            <div key={item.key} className={className}>{content}</div>
          );
        })}
      </div>
    </Card>
  );
}
