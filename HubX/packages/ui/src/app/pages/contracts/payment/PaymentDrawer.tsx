import { Drawer, Tabs, Space, Button, Tag, Typography } from '@arco-design/web-react';
import { useNavigate } from 'react-router';
import { deriveCollectionProgress, derivePaymentStatus } from './paymentCalc';
import { KANBAN_COLUMNS } from './types';
import { PaymentTimelineTab } from './PaymentTimelineTab';
import { BlockerDunningTab } from './BlockerDunningTab';
import { ContractSnapshotTab } from './ContractSnapshotTab';
import type { Contract } from '../types';
import { CurrencyCircleDollar, Plus, WarningCircle } from '@phosphor-icons/react';

const { Text, Title } = Typography;
const TabPane = Tabs.TabPane;

const TODAY = '2026-08-19';

interface Props {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
  onRecordCollection: () => void;
  onReportBlocker: () => void;
  onRecordDunning: () => void;
}

export function PaymentDrawer({ visible, contract, onClose, onRecordCollection, onReportBlocker, onRecordDunning }: Props) {
  const navigate = useNavigate();
  if (!contract) return null;

  const status = derivePaymentStatus(contract, TODAY);
  const progress = deriveCollectionProgress(contract);

  return (
    <Drawer
      title={
        <Space>
          <span>合同回款详情</span>
          <Text type="secondary">- {contract.contractNo} {contract.name}</Text>
        </Space>
      }
      visible={visible}
      onCancel={onClose}
      width={720}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <Button onClick={onClose}>关闭</Button>
          {status !== 'settled' && (
            <>
              <Button type="outline" status="warning" icon={<WarningCircle size={18} />} onClick={onReportBlocker}>上报/编辑卡点</Button>
              <Button type="outline" icon={<Plus size={18} />} onClick={onRecordDunning}>记录催款</Button>
              <Button type="primary" icon={<CurrencyCircleDollar size={18} />} onClick={onRecordCollection}>录入到账</Button>
            </>
          )}
        </div>
      }
    >
      {/* 基本信息 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        background: 'var(--color-fill-1)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-4)',
      }}>
        <div>
          <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>客户</Text>
          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{contract.customerName}</div>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>总额</Text>
          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>¥{contract.totalAmount.toLocaleString()}</div>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>已回</Text>
          <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--success-500)' }}>¥{progress.received.toLocaleString()}</div>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>状态</Text>
          <div><Tag color={KANBAN_COLUMNS[status].color} size="small">{KANBAN_COLUMNS[status].label}</Tag></div>
        </div>
      </div>

      {/* 快捷按钮 */}
      <Space style={{ marginBottom: 'var(--space-4)' }}>
        <Button size="small" type="outline" icon={<Plus size={18} />} onClick={onRecordDunning}>记录催款</Button>
        <Button size="small" type="outline" status="warning" icon={<WarningCircle size={18} />} onClick={onReportBlocker}>上报/编辑卡点</Button>
        <Button size="small" type="outline" icon={<CurrencyCircleDollar size={18} />} onClick={onRecordCollection}>录入到账</Button>
        <Button
          size="small"
          type="outline"
          disabled={!contract.projectId}
          title={contract.projectId ? '打开关联项目' : '当前合同尚未关联项目'}
          onClick={() => {
            if (!contract.projectId) return;
            onClose();
            navigate(`/projects/${contract.projectId}`);
          }}
        >
          查看项目
        </Button>
      </Space>

      {/* Tab */}
      <Tabs defaultActiveTab="timeline">
        <TabPane key="timeline" title="回款与交付时间线">
          <PaymentTimelineTab contract={contract} />
        </TabPane>
        <TabPane key="blocker" title="卡点与催款记录">
          <BlockerDunningTab contract={contract} />
        </TabPane>
        <TabPane key="snapshot" title="合同正文快照">
          <ContractSnapshotTab contract={contract} />
        </TabPane>
      </Tabs>
    </Drawer>
  );
}
