// 线索「流转记录」Popover 共享组件：从 LeadContext 读取流转记录（mock/http 同构）。
import { Button, DataTable, Popover, StatusTag, Tooltip } from '@/design-system';
import type { DataTableProps, StatusTone } from '@/design-system';
import { useState } from 'react';
import { TRANSFER_ACTION_LABEL } from '../pages/sales/leads/types';
import { useLeads } from './LeadContext';
import type { TransferRecord } from '../pages/sales/leads/types';

interface Props {
  leadId: string;
  followCount: number;
  daysHeld: number;
  historyOwners?: string;
  /** 预算展示（AllLeads 触发器第二行） */
  budget?: number;
}

const TRANSFER_ACTION_TONE: Record<TransferRecord['action'], StatusTone> = {
  assign: 'info',
  transfer: 'purple',
  return: 'warning',
  trash: 'danger',
  claim: 'success',
  transform: 'cyan',
};

const transferColumns: DataTableProps<TransferRecord>['columns'] = [
  { title: '操作人', dataIndex: 'operator', width: 80 },
  {
    title: '操作',
    dataIndex: 'action',
    width: 100,
    render: (_, record) => (
      <StatusTag tone={TRANSFER_ACTION_TONE[record.action]}>
        {TRANSFER_ACTION_LABEL[record.action]}
      </StatusTag>
    ),
  },
  { title: '归属人', dataIndex: 'toOwner', width: 80, render: (value) => value || '-' },
  { title: '状态', dataIndex: 'status', width: 90 },
  {
    title: '原因',
    dataIndex: 'reason',
    width: 100,
    ellipsis: true,
    render: (value) => <Tooltip content={value || ''}><span>{value || '-'}</span></Tooltip>,
  },
  { title: '时间', dataIndex: 'createdAt', width: 130, render: (value) => value.slice(5) },
];

export function LeadTransferPopover({ leadId, followCount, daysHeld, historyOwners, budget }: Props) {
  const { getTransferRecords } = useLeads();
  const [records, setRecords] = useState<TransferRecord[] | null>(null);

  const open = async () => {
    if (records === null) {
      setRecords(await getTransferRecords(leadId));
    }
  };

  return (
    <Popover
      title="流转记录"
      trigger="click"
      style={{ maxWidth: 520 }}
      onVisibleChange={(vis) => { if (vis) { void open(); } }}
      content={
        <div style={{ fontSize: 'var(--text-xs)' }}>
          <div style={{ marginBottom: 8, color: 'var(--color-text-3)' }}>
            跟进 {followCount} 次 · 持有 {daysHeld} 天{historyOwners ? ` · 历史归属: ${historyOwners}` : ''}
          </div>
          {records && records.length > 0 ? (
            <DataTable<TransferRecord>
              columns={transferColumns}
              data={records}
              rowKey="id"
              size="mini"
              pagination={false}
              border={false}
              hover={false}
              scroll={{ x: 580 }}
              style={{ whiteSpace: 'nowrap' }}
            />
          ) : (
            <div style={{ color: 'var(--color-text-4)', textAlign: 'center', padding: 12 }}>暂无流转记录</div>
          )}
        </div>
      }
    >
      <Button
        type="text"
        size="mini"
        aria-label={`查看流转记录，跟进 ${followCount} 次，持有 ${daysHeld} 天`}
        style={{ fontSize: 'var(--text-xs)', height: 'auto', padding: 0, display: 'inline-flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}
      >
        <span style={{ whiteSpace: 'nowrap' }}>{followCount}次 · {daysHeld}天</span>
        <span style={{ whiteSpace: 'nowrap', color: 'var(--color-text-1)' }}>{budget == null ? '—' : `¥${budget.toLocaleString()}`}</span>
      </Button>
    </Popover>
  );
}
