import { AlertBanner, MoneyText } from '@/design-system';

interface Props {
  contractAmount: number;
  quoteAmount: number;
  quoteName?: string;
}

export function QuoteMismatchAlert({ contractAmount, quoteAmount, quoteName }: Props) {
  if (!quoteAmount || Math.abs(contractAmount - quoteAmount) < 0.01) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <AlertBanner tone="warning">
        <span>
          当前合同金额 <strong><MoneyText value={contractAmount} /></strong> 与关联报价单
          {quoteName ? `「${quoteName}」` : ''} 金额 <strong><MoneyText value={quoteAmount} /></strong> 不一致，请确认是否谈判调整。
        </span>
      </AlertBanner>
    </div>
  );
}
