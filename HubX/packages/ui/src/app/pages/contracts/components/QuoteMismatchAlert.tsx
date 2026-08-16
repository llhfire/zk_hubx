import { Alert } from '@arco-design/web-react';

interface Props {
  contractAmount: number;
  quoteAmount: number;
  quoteName?: string;
}

export function QuoteMismatchAlert({ contractAmount, quoteAmount, quoteName }: Props) {
  if (!quoteAmount || Math.abs(contractAmount - quoteAmount) < 0.01) return null;
  return (
    <Alert
      type="warning"
      content={
        <span>
          当前合同金额 <strong>¥{contractAmount.toLocaleString()}</strong> 与关联报价单
          {quoteName ? `「${quoteName}」` : ''} 金额 <strong>¥{quoteAmount.toLocaleString()}</strong> 不一致，请确认是否谈判调整。
        </span>
      }
      style={{ marginBottom: 16 }}
    />
  );
}
