import { useState } from 'react';
import { Drawer, Tabs } from '@arco-design/web-react';
import type { Contract } from '../types';
import { PaymentTimeline } from './PaymentTimeline';
import { ContractTextViewer } from './ContractTextViewer';
import { BlockerDunningPanel } from './BlockerDunningPanel';

const TabPane = Tabs.TabPane;

interface Props {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
}

export function PaymentKanbanSideDrawer({ visible, contract, onClose }: Props) {
  const [activeTab, setActiveTab] = useState('timeline');

  if (!contract) return null;

  return (
    <Drawer
      title={`${contract.contractNo} · ${contract.current.customerName}`}
      visible={visible}
      onCancel={onClose}
      width={480}
      footer={null}
    >
      <Tabs activeTab={activeTab} onChange={setActiveTab}>
        <TabPane key="timeline" title="回款时间线">
          <PaymentTimeline contract={contract} />
        </TabPane>
        <TabPane key="contract" title="合同文本">
          <ContractTextViewer contract={contract} />
        </TabPane>
        <TabPane key="blockers" title="卡点 / 催款">
          <BlockerDunningPanel contract={contract} />
        </TabPane>
      </Tabs>
    </Drawer>
  );
}
