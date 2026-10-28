import type { ReactNode } from 'react';
import { MoneyText } from '../primitives/MoneyText';
import { ProgressBar, type ProgressTone } from '../data-display/ProgressBar';
import '../components.css';

/**
 * 回款业务进度的统一展示。
 *
 * 这个组件只表达「已回款 / 合同总额 / 待回款」这一稳定语义，
 * 不承载期次、开票或预测日期等不同业务模型。
 */
export interface PaymentProgressProps {
  received: number;
  total: number;
  label?: ReactNode;
  /** 表格等紧凑场景只保留比例，不展示金额拆分。 */
  showAmounts?: boolean;
  size?: 'small' | 'default';
  tone?: ProgressTone;
  className?: string;
}

export function PaymentProgress({
  received,
  total,
  label = '回款进度',
  showAmounts = true,
  size = 'default',
  tone,
  className,
}: PaymentProgressProps) {
  const safeReceived = Number.isFinite(received) ? Math.max(0, received) : 0;
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const percentage = safeTotal > 0 ? Math.min(100, Math.max(0, (safeReceived / safeTotal) * 100)) : 0;
  const remaining = Math.max(0, safeTotal - safeReceived);
  const resolvedTone = tone ?? (percentage >= 100 ? 'success' : 'info');
  const amountVariant = size === 'small' ? 'compact' : 'default';

  return (
    <div className={['hubx-payment-progress', `hubx-payment-progress--${size}`, className].filter(Boolean).join(' ')}>
      <div className="hubx-payment-progress__header">
        <span className="hubx-payment-progress__label">{label}</span>
        <span className="hubx-payment-progress__percentage">{Math.round(percentage)}%</span>
      </div>
      <ProgressBar
        percent={percentage}
        size={size === 'small' ? 'small' : 'default'}
        tone={resolvedTone}
        showValue={false}
      />
      {showAmounts && (
        <div className="hubx-payment-progress__amounts">
          <span>
            <span className="hubx-payment-progress__amount-label">已回款</span>
            <MoneyText value={safeReceived} variant={amountVariant} />
            <span className="hubx-payment-progress__amount-divider">/</span>
            <MoneyText value={safeTotal} variant={amountVariant} />
          </span>
          <span>
            <span className="hubx-payment-progress__amount-label">待回款</span>
            <MoneyText value={remaining} variant={amountVariant} tone={remaining > 0 ? 'muted' : 'success'} />
          </span>
        </div>
      )}
    </div>
  );
}
