import { useMemo, useState } from 'react';
import { Button, Space } from '@arco-design/web-react';
import { PaymentGantt } from './PaymentGantt';
import { CashflowForecast } from './CashflowForecast';
import { ForecastDetailTable } from './ForecastDetailTable';
import type { ForecastOverride } from './types';
import { PageHeader, PageShell } from '../../../components/ui';
import { useContracts } from '../ContractsContext';
import { useCollections } from '@/app/collections/CollectionContext';
import { toPaymentAnalysisContract } from './contractPaymentProjection';
import './paymentConsistency.css';

export function PaymentForecastContent() {
  const [overrides, setOverrides] = useState<ForecastOverride[]>([]);
  const { contracts } = useContracts();
  const { collections } = useCollections();
  const paymentContracts = useMemo(
    () => contracts
      .filter((contract) => contract.status !== 'voided')
      .map((contract) => toPaymentAnalysisContract(contract, collections)),
    [contracts, collections],
  );

  const handleOverride = (override: ForecastOverride) => {
    setOverrides(prev => [...prev, override]);
  };

  return (
    <div className="payment-forecast-content">
      {/* 付款节点是预测工作的主入口，优先于汇总图表。 */}
      <PaymentGantt
        contracts={paymentContracts}
        overrides={overrides}
        onOverride={handleOverride}
      />

      <CashflowForecast
        contracts={paymentContracts}
        overrides={overrides}
      />

      <ForecastDetailTable
        contracts={paymentContracts}
        overrides={overrides}
        onOverride={handleOverride}
      />
    </div>
  );
}

export default function PaymentForecastPage() {
  return (
    <PageShell
      breadcrumbs={[
        { label: '合同管理', to: '/contracts' },
        { label: '回款管理', to: '/contracts/payments' },
        { label: '回款预测' },
      ]}
    >
      <PageHeader
        title="回款预测与现金流"
        description="按付款节点调整预计到账日，并观察未来现金流变化。"
        actions={(
          <Space>
            <Button disabled title="α 版暂不支持">导出预测表</Button>
            <Button disabled title="α 版暂不支持">预测参数配置</Button>
          </Space>
        )}
      />
      <PaymentForecastContent />
    </PageShell>
  );
}
