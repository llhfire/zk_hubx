import type { ReactNode } from 'react';
import { Card } from '@arco-design/web-react';
import './uiFoundation.css';

export type ProcessMetricTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface ProcessMetricItem {
  key: string;
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  tone?: ProcessMetricTone;
  onClick?: () => void;
  ariaLabel?: string;
}

interface ProcessMetricGridProps {
  items: ProcessMetricItem[];
}

export function ProcessMetricGrid({ items }: ProcessMetricGridProps) {
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
