import { formatMoney, formatMoneyCompact, formatAmountPlain } from '@/app/utils/money';
import '../components.css';

export type MoneyVariant = 'default' | 'compact' | 'plain';
export type MoneyTone = 'default' | 'success' | 'danger' | 'muted';

export interface MoneyTextProps {
  value: number | null | undefined;
  /** default → ¥1,234.56；compact → ¥48.0万（看板卡片）；plain → 1,234.56（合同文书） */
  variant?: MoneyVariant;
  tone?: MoneyTone;
  /** 空值占位，默认 `—`，用于区分「没有」与「零」 */
  placeholder?: string;
  fractionDigits?: number;
  className?: string;
}

/**
 * 金额展示的唯一入口。
 *
 * 页面里不允许再出现 `¥${value.toFixed(2)}` 或自己实现格式化 —— 全仓曾有 20 处
 * 各自实现，同一笔钱在不同页面显示不同。数字字体与不折行也在这里统一（M-022/M-044）。
 */
export function MoneyText({
  value,
  variant = 'default',
  tone = 'default',
  placeholder,
  fractionDigits,
  className,
}: MoneyTextProps) {
  const text =
    variant === 'compact'
      ? formatMoneyCompact(value, placeholder)
      : variant === 'plain'
        ? formatAmountPlain(value)
        : formatMoney(value, { placeholder, fractionDigits });

  return (
    <span
      className={[
        'hubx-money',
        variant === 'compact' ? 'hubx-money--compact' : '',
        tone !== 'default' ? `hubx-money--${tone}` : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {text}
    </span>
  );
}
