import type { ReactNode } from 'react';
import '../components.css';

export type MetricCardTone = 'default' | 'success' | 'warning' | 'danger';

export interface MetricCardProps {
  label: ReactNode;
  value: ReactNode;
  /** 与值同行的次级信息，例如「已回 40%」（M-043：不许另起第三行） */
  suffix?: ReactNode;
  /** 值下方的补充说明，只在确有必要时使用 */
  detail?: ReactNode;
  tone?: MetricCardTone;
  className?: string;
}

/**
 * 紧凑指标卡（M-043）：严格两行 —— 标签一行、值一行。
 *
 * 允许第三行的唯一情况是 `detail`，用于口径说明；比例、单位等应放进 `suffix`。
 */
export function MetricCard({ label, value, suffix, detail, tone = 'default', className }: MetricCardProps) {
  const toneClass =
    tone === 'default' ? '' : `hubx-money--${tone === 'warning' ? 'danger' : tone}`;

  return (
    <div className={['hubx-metric-card', className].filter(Boolean).join(' ')}>
      <div className="hubx-metric-card__label">{label}</div>
      <div className={['hubx-metric-card__value', toneClass].filter(Boolean).join(' ')}>
        <span>{value}</span>
        {suffix && <span className="hubx-metric-card__suffix">{suffix}</span>}
      </div>
      {detail && <div className="hubx-metric-card__detail">{detail}</div>}
    </div>
  );
}
