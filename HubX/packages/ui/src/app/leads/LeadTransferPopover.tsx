// 线索「流转记录」Popover 共享组件：从 LeadContext 读取流转记录（mock/http 同构）。
import { Button, DataTable, MoneyText, Popover, StatusTag, Tooltip } from '@/design-system';
import type { DataTableProps, StatusTone } from '@/design-system';
import { useState } from 'react';
import { TRANSFER_ACTION_LABEL } from '../pages/sales/leads/types';
import { useLeads } from './LeadContext';
import type { TransferRecord } from '../pages/sales/leads/types';
import './LeadTransferPopover.css';

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
        <div className="lead-transfer-popover">
          <div className="lead-transfer-popover__meta">
            跟进 {followCount} 次 · 持有 {daysHeld} 天{historyOwners ? ` · 历史归属: ${historyOwners}` : ''}
          </div>
          {/* 还没查回来时用表格自身的 loading，别让「暂无流转记录」抢在请求前面说错话 */}
          <DataTable<TransferRecord>
            className="lead-transfer-popover__table"
            columns={transferColumns}
            data={records ?? []}
            loading={records === null}
            rowKey="id"
            size="mini"
            pagination={false}
            border={false}
            hover={false}
            scroll={{ x: 580 }}
            emptyDescription="暂无流转记录"
          />
        </div>
      }
    >
      <Button
        type="text"
        size="mini"
        className="lead-transfer-popover__trigger"
        aria-label={`查看流转记录，跟进 ${followCount} 次，持有 ${daysHeld} 天`}
      >
        <span className="lead-transfer-popover__trigger-line">{followCount}次 · {daysHeld}天</span>
        <MoneyText className="lead-transfer-popover__trigger-budget" value={budget} />
      </Button>
    </Popover>
  );
}
