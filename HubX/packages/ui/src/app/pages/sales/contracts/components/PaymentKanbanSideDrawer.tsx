import { useState } from 'react';
import { Button, Drawer, SectionTabs, Tabs } from '@/design-system';
import { IconFile } from '@/design-system';
import type { Contract } from '../types';
import { PaymentTimeline } from './PaymentTimeline';
import { ContractTextViewer } from './ContractTextViewer';
import { BlockerDunningPanel } from './BlockerDunningPanel';

const TabPane = Tabs.TabPane;
const PAYMENT_DRAWER_WIDTH = 480;

interface Props {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
}

export function PaymentKanbanSideDrawer({ visible, contract, onClose }: Props) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [contractViewerVisible, setContractViewerVisible] = useState(false);

  if (!contract) return null;

  const handleClose = () => {
    setContractViewerVisible(false);
    onClose();
  };

  return (
    <Drawer
      className="payment-kanban-side-drawer"
      title={`${contract.contractNo} · ${contract.current.customerName}`}
      visible={visible}
      onCancel={handleClose}
      width={PAYMENT_DRAWER_WIDTH}
      footer={null}
    >
      <div className="payment-kanban-side-drawer__actions">
        <Button
          size="small"
          type="outline"
          icon={<IconFile />}
          onClick={() => setContractViewerVisible(true)}
        >
          在线查看合同
        </Button>
        <span className="payment-kanban-side-drawer__mode">
          {contract.kind === 'supplement' ? '补充合同' : '主合同'}
        </span>
      </div>

      <SectionTabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'timeline',
            label: "回款时间线",
            content: (
              <>
                  <div className="payment-kanban-side-drawer__timeline">
                    <PaymentTimeline contract={contract} />
                  </div>
                
              </>
            ),
          },
          {
            key: 'blockers',
            label: "卡点 / 催款",
            content: (
              <>
                  <BlockerDunningPanel contract={contract} />
                
              </>
            ),
          },
        ]}
      />

      <Drawer
        className="payment-kanban-contract-viewer payment-kanban-contract-viewer--adjacent"
        placement="right"
        style={{ right: PAYMENT_DRAWER_WIDTH }}
        mask={false}
        title={`${contract.kind === 'supplement' ? '补充合同' : '主合同'} · ${contract.current.contractName || contract.contractNo}`}
        visible={contractViewerVisible}
        onCancel={() => setContractViewerVisible(false)}
        width={680}
        footer={null}
      >
        <ContractTextViewer contract={contract} />
      </Drawer>
    </Drawer>
  );
}
