// 线索「流转记录」Popover 共享组件：从 LeadContext 读取流转记录（mock/http 同构）。
import { Popover, Tag, Tooltip } from '@arco-design/web-react';
import { useState } from 'react';
import { TRANSFER_ACTION_LABEL, TRANSFER_ACTION_COLOR } from '@/app/pages/leads/types';
import { useLeads } from '@/app/leads/LeadContext';
import type { TransferRecord } from '@/app/pages/leads/types';

interface Props {
  leadId: string;
  followCount: number;
  daysHeld: number;
  historyOwners?: string;
  /** 预算展示（AllLeads 触发器第二行） */
  budget?: number;
}

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
      popupStyle={{ maxWidth: 520 }}
      onVisibleChange={(vis) => { if (vis) { void open(); } }}
      content={
        <div style={{ fontSize: 12 }}>
          <div style={{ marginBottom: 8, color: 'var(--color-text-3)' }}>
            跟进 {followCount} 次 · 持有 {daysHeld} 天{historyOwners ? ` · 历史归属: ${historyOwners}` : ''}
          </div>
          {records && records.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border-2)', color: 'var(--color-text-3)' }}>
                    <th style={{ textAlign: 'left', padding: '4px 6px 4px 0', fontWeight: 500, whiteSpace: 'nowrap' }}>操作人</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500, whiteSpace: 'nowrap' }}>操作</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500, whiteSpace: 'nowrap' }}>归属人</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500, whiteSpace: 'nowrap' }}>状态</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500, whiteSpace: 'nowrap' }}>原因</th>
                    <th style={{ textAlign: 'left', padding: '4px 0 4px 6px', fontWeight: 500, whiteSpace: 'nowrap' }}>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((tr) => (
                    <tr key={tr.id} style={{ borderBottom: '1px solid var(--color-border-1)' }}>
                      <td style={{ padding: '4px 6px 4px 0', whiteSpace: 'nowrap' }}>{tr.operator}</td>
                      <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}><Tag color={TRANSFER_ACTION_COLOR[tr.action]} size="small">{TRANSFER_ACTION_LABEL[tr.action]}</Tag></td>
                      <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{tr.toOwner || '-'}</td>
                      <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{tr.status}</td>
                      <td style={{ padding: '4px 6px', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Tooltip content={tr.reason || ''}><span>{tr.reason || '-'}</span></Tooltip></td>
                      <td style={{ padding: '4px 0 4px 6px', whiteSpace: 'nowrap' }}>{tr.createdAt.slice(5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-4)', textAlign: 'center', padding: 12 }}>暂无流转记录</div>
          )}
        </div>
      }
    >
      <span style={{ fontSize: 12, cursor: 'pointer', color: 'var(--primary-6)', display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ whiteSpace: 'nowrap' }}>{followCount}次 · {daysHeld}天</span>
        <span style={{ whiteSpace: 'nowrap', color: 'var(--color-text-1)' }}>{budget == null ? '—' : `¥${budget.toLocaleString()}`}</span>
      </span>
    </Popover>
  );
}
