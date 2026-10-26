import type { ReactNode } from 'react';
import '../components.css';

export type ProgressTone = 'info' | 'success' | 'warning' | 'danger';

export interface ProgressBarProps {
  /** 0 ~ 100 */
  percent: number;
  label?: ReactNode;
  /** 值右侧的说明，默认显示百分比 */
  valueText?: ReactNode;
  tone?: ProgressTone;
  className?: string;
}

/**
 * 进度条。只表达一个比例，不再附带装饰性圆环（M-038 明确移除了小圆环）。
 */
export function ProgressBar({ percent, label, valueText, tone = 'info', className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));

  return (
    <div className={['hubx-progress', className].filter(Boolean).join(' ')}>
      {(label || valueText !== null) && (
        <div className="hubx-progress__head">
          <span>{label}</span>
          <span className="hubx-progress__value">{valueText ?? `${Math.round(clamped)}%`}</span>
        </div>
      )}
      <div
        className="hubx-progress__track"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={['hubx-progress__bar', tone !== 'info' ? `hubx-progress__bar--${tone}` : ''].filter(Boolean).join(' ')}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
