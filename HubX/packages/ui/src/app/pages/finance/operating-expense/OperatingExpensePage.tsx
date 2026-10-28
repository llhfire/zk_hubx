import { useState } from 'react';
import { SectionTabs, Tabs } from '@/design-system';
import { OperatingExpenseProvider } from './OperatingExpenseContext';
import { DashboardTab } from './DashboardTab';
import { LedgerTab } from './LedgerTab';
import { TemplateTab } from './TemplateTab';
import { OverheadTab } from './OverheadTab';
import { CategoryTab } from './CategoryTab';
import { PageHeader, PageShell, SectionCard } from '@/design-system';

const TabPane = Tabs.TabPane;

export function OperatingExpensePage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <OperatingExpenseProvider>
      <PageShell>
        <PageHeader
          title="运营费用"
          description="维护集团运营费用台账、公摊口径与周期模板。"
        />
        <SectionCard>
        <SectionTabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'dashboard',
              label: "费用大盘",
              content: (
                <>
                      <DashboardTab />
                    
                </>
              ),
            },
            {
              key: 'ledger',
              label: "费用台账",
              content: (
                <>
                      <LedgerTab />
                    
                </>
              ),
            },
            {
              key: 'template',
              label: "周期模板",
              content: (
                <>
                      <TemplateTab />
                    
                </>
              ),
            },
            {
              key: 'overhead',
              label: "公摊参数",
              content: (
                <>
                      <OverheadTab />
                    
                </>
              ),
            },
            {
              key: 'category',
              label: "科目入口",
              content: (
                <>
                      <CategoryTab />
                    
                </>
              ),
            },
          ]}
        />
        </SectionCard>
      </PageShell>
    </OperatingExpenseProvider>
  );
}
