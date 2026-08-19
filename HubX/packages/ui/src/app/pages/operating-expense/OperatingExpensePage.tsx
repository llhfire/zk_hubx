import { useState } from 'react';
import { Tabs, Card } from '@arco-design/web-react';
import { OperatingExpenseProvider } from './OperatingExpenseContext';
import { DashboardTab } from './DashboardTab';
import { LedgerTab } from './LedgerTab';
import { TemplateTab } from './TemplateTab';
import { OverheadTab } from './OverheadTab';

const TabPane = Tabs.TabPane;

export function OperatingExpensePage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <OperatingExpenseProvider>
      <Card>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="dashboard" title="费用大盘">
            <DashboardTab />
          </TabPane>
          <TabPane key="ledger" title="费用台账">
            <LedgerTab />
          </TabPane>
          <TabPane key="template" title="固定模板">
            <TemplateTab />
          </TabPane>
          <TabPane key="overhead" title="公摊参数">
            <OverheadTab />
          </TabPane>
        </Tabs>
      </Card>
    </OperatingExpenseProvider>
  );
}
