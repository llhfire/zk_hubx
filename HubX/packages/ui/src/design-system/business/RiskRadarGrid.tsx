import type { ReactNode } from 'react';
import '../components.css';

export type RiskRadarTone = 'safe' | 'warning' | 'danger';

export interface RiskRadarItem {
  key: string;
  label: ReactNode;
  value: ReactNode;
  detail: ReactNode;
  tone?: RiskRadarTone;
}

export interface RiskRadarGridProps {
  items: RiskRadarItem[];
  className?: string;
}

/**
 * 风控体检指标网格：同一组指标同时呈现结果、语义风险边界和解释文本。
 *
 * 这类指标不是普通 KPI：整卡边界与浅语义底色必须与结果状态绑定，页面不应再为
 * 每个业务模块复制一套带 safe / warning / danger 的卡片 CSS。
 */
export function RiskRadarGrid({ items, className }: RiskRadarGridProps) {
  return (
    <div className={['hubx-risk-radar-grid', className].filter(Boolean).join(' ')}>
      {items.map((item) => (
        <article key={item.key} className={`hubx-risk-radar-card hubx-risk-radar-card--${item.tone ?? 'safe'}`}>
          <div className="hubx-risk-radar-card__label">{item.label}</div>
          <div className="hubx-risk-radar-card__value">{item.value}</div>
          <div className="hubx-risk-radar-card__detail">{item.detail}</div>
        </article>
      ))}
    </div>
  );
}
