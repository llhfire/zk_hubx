import { useSearchParams } from 'react-router';
import { Tabs } from '@arco-design/web-react';
import { PageHeader, PageShell } from '../../../components/ui';
import PaymentKanban from '../PaymentKanban';
import { PaymentKanbanV2 } from '../PaymentKanbanV2';
import { PaymentForecastContent } from './PaymentForecastPage';
import './paymentConsistency.css';

const TabPane = Tabs.TabPane;

/**
 * 回款看板统一入口。
 * 合同看板、行动队列与预测均读取 ContractsContext + CollectionContext。
 */
export default function PaymentDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = requestedTab === 'actions' || requestedTab === 'forecast' ? requestedTab : 'home';

  const changeTab = (tab: string) => {
    if (tab === 'home') {
      setSearchParams({});
      return;
    }
    setSearchParams({ tab });
  };

  return (
    <PageShell
      breadcrumbs={[
        { label: '合同管理', to: '/contracts' },
        { label: '回款看板' },
      ]}
    >
      <PageHeader
        title="回款看板"
        description="先按合同泳道掌握整体回款状态，再进入行动队列处理具体期次。"
      />

      <Tabs
        className="payment-dashboard-tabs"
        type="card"
        activeTab={activeTab}
        onChange={changeTab}
      >
        <TabPane key="home" title="合同看板">
          <PaymentKanban />
        </TabPane>
        <TabPane key="actions" title="行动队列">
          <PaymentKanbanV2 />
        </TabPane>
        <TabPane key="forecast" title="回款预测">
          <PaymentForecastContent />
        </TabPane>
      </Tabs>
    </PageShell>
  );
}
