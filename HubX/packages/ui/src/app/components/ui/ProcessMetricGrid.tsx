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
}

interface ProcessMetricGridProps {
  items: ProcessMetricItem[];
}

export function ProcessMetricGrid({ items }: ProcessMetricGridProps) {
  return (
    <Card className="hubx-process-metrics" size="small">
      <div className="hubx-process-metrics__grid">
        {items.map((item) => (
          <div
            key={item.key}
            className={`hubx-process-metric hubx-process-metric--${item.tone ?? 'neutral'}`}
          >
            <div className="hubx-process-metric__label">{item.label}</div>
            <div className="hubx-process-metric__value">{item.value}</div>
            {item.detail && <div className="hubx-process-metric__detail">{item.detail}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

