import { MoneyText } from '../primitives/MoneyText';
import { PaymentScheduleRail, type PaymentScheduleItem } from './PaymentScheduleRail';
import '../components.css';

export interface PaymentAmountSummaryProps {
  total: number;
  receivable: number;
  scheduleItems?: PaymentScheduleItem[];
  size?: 'small' | 'default';
  className?: string;
}

/** 合同金额列的紧凑摘要：只保留合同总额与待收金额。 */
export function PaymentAmountSummary({
  total,
  receivable,
  scheduleItems,
  size = 'default',
  className,
}: PaymentAmountSummaryProps) {
  return (
    <div className={['hubx-payment-amount-summary', `hubx-payment-amount-summary--${size}`, className].filter(Boolean).join(' ')}>
      <span className="hubx-payment-amount-summary__item">
        <span className="hubx-payment-amount-summary__label">合同额</span>
        <MoneyText variant="compact" value={total} className="hubx-payment-amount-summary__value" />
      </span>
      <span className="hubx-payment-amount-summary__item">
        <span className="hubx-payment-amount-summary__label">待收</span>
        <MoneyText
          variant="compact"
          value={receivable}
          tone={receivable > 0 ? 'muted' : 'success'}
          className="hubx-payment-amount-summary__value"
        />
      </span>
      {scheduleItems && <PaymentScheduleRail size="small" items={scheduleItems} />}
    </div>
  );
}
