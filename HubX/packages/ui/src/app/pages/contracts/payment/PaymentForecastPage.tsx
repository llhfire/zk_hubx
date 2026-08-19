import { useState } from 'react';
import { Typography, Button, Space, Message } from '@arco-design/web-react';
import { mockPaymentContracts } from './paymentMock';
import { PaymentGantt } from './PaymentGantt';
import { CashflowForecast } from './CashflowForecast';
import { ForecastDetailTable } from './ForecastDetailTable';
import type { ForecastOverride } from './types';

const { Title } = Typography;

export default function PaymentForecastPage() {
  const [overrides, setOverrides] = useState<ForecastOverride[]>([]);

  const handleOverride = (override: ForecastOverride) => {
    setOverrides(prev => [...prev, override]);
  };

  return (
    <div style={{ padding: 'var(--space-5)' }}>
      {/* 标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
        <Title heading={3}>回款预测与现金流</Title>
        <Space>
          <Button disabled title="α 版暂不支持">导出预测表</Button>
          <Button disabled title="α 版暂不支持">预测参数配置</Button>
        </Space>
      </div>

      {/* 现金流预测面板 */}
      <CashflowForecast
        contracts={mockPaymentContracts}
        overrides={overrides}
      />

      {/* 甘特图 */}
      <PaymentGantt
        contracts={mockPaymentContracts}
        overrides={overrides}
        onOverride={handleOverride}
      />

      {/* 单合同预测明细 */}
      <ForecastDetailTable
        contracts={mockPaymentContracts}
        overrides={overrides}
        onOverride={handleOverride}
      />
    </div>
  );
}
