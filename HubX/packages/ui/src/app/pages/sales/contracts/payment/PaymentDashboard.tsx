import { useSearchParams } from 'react-router';
import { SectionTabs, Tabs } from '@/design-system';
import { PageHeader, PageShell } from '@/design-system';
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

      <SectionTabs
        variant="card"
        activeKey={activeTab}
        onChange={changeTab}
        className={"payment-dashboard-tabs"}
        items={[
          {
            key: 'home',
            label: "合同看板",
            content: (
              <>
                  <PaymentKanban />
                
              </>
            ),
          },
          {
            key: 'actions',
            label: "行动队列",
            content: (
              <>
                  <PaymentKanbanV2 />
                
              </>
            ),
          },
          {
            key: 'forecast',
            label: "回款预测",
            content: (
              <>
                  <PaymentForecastContent />
                
              </>
            ),
          },
        ]}
      />
    </PageShell>
  );
}
