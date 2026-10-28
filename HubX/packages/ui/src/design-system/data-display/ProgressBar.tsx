import type { CSSProperties, ReactNode } from 'react';
import '../components.css';

import type { StatusTone } from '../primitives/StatusTag';

/**
 * 进度条与状态标签共用同一套语义色，避免「同一个绿色」出现两种写法。
 */
export type ProgressTone = StatusTone;

export interface ProgressBarProps {
  /** 0 ~ 100 */
  percent: number;
  label?: ReactNode;
  /** 值右侧的说明，默认显示百分比 */
  valueText?: ReactNode;
  /** 是否显示头部数值行，默认 true。表格内联进度条传 false */
  showValue?: boolean;
  /** 高度档位。表格、卡片内用 small */
  size?: 'small' | 'default' | 'large';
  /** 环形用于单个闭环比例的强调展示，其余场景一律用条形 */
  variant?: 'bar' | 'circle';
  /** 环形直径（px），默认 96 */
  diameter?: number;
  tone?: ProgressTone;
  className?: string;
  /** 只用于外部布局（宽度、外边距），视觉样式仍写在 components.css */
  style?: CSSProperties;
}

/**
 * 进度条。只表达一个比例，不再附带装饰性圆环（M-038 明确移除了小圆环）。
 */
export function ProgressBar({
  percent,
  label,
  valueText,
  showValue = true,
  size = 'default',
  variant = 'bar',
  diameter = 96,
  tone = 'info',
  className,
  style,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));

  if (variant === 'circle') {
    return (
      <div
        className={['hubx-progress-circle', `hubx-progress-circle--${tone}`, className].filter(Boolean).join(' ')}
        style={{ width: diameter, height: diameter, '--hubx-progress-value': `${clamped}%`, ...style } as CSSProperties}
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="hubx-progress-circle__inner">{valueText ?? `${Math.round(clamped)}%`}</div>
      </div>
    );
  }

  return (
    <div
      className={['hubx-progress', size !== 'default' ? `hubx-progress--${size}` : '', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {showValue && valueText !== null && (
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
          style={{ '--hubx-progress-scale': clamped / 100 } as CSSProperties}
        />
      </div>
    </div>
  );
}
