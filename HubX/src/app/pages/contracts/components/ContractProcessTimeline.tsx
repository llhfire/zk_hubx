import type { ReactNode } from 'react';
import { Button, Card, Tag, Timeline } from '@arco-design/web-react';
import type { ContractProcessRecord } from '../buildContractProcessRecords';

function recordDotColor(color: string): string {
  if (color === 'green') return 'rgb(var(--green-6))';
  if (color === 'red') return 'rgb(var(--red-6))';
  if (color === 'orange') return 'rgb(var(--orange-6))';
  if (color === 'purple') return 'rgb(var(--purple-6))';
  if (color === 'cyan') return 'rgb(var(--cyan-6))';
  return 'rgb(var(--primary-6))';
}

interface Props {
  records: ContractProcessRecord[];
  onContractClick: (contractId: string) => void;
  emptyAction?: ReactNode;
  bordered?: boolean;
  size?: 'default' | 'small';
}

export function ContractProcessTimeline({
  records,
  onContractClick,
  emptyAction,
  bordered = false,
  size,
}: Props) {
  return (
    <Card bordered={bordered} size={size}>
      {records.length === 0 ? (
        <>
          {emptyAction ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              {emptyAction}
            </div>
          ) : null}
          <div style={{ textAlign: 'center', padding: '32px 16px 48px', color: 'var(--color-text-3)' }}>
            暂无合同流程记录
          </div>
        </>
      ) : (
        <Timeline>
          {records.map((record) => (
            <Timeline.Item key={record.id} dotColor={recordDotColor(record.color)}>
              <div style={{ marginBottom: 16, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--color-text-1)' }}>
                    {record.title}
                  </span>
                  <Tag color={record.color} size="small" style={{ flexShrink: 0 }}>
                    {record.tag}
                  </Tag>
                </div>
                <div style={{ color: 'var(--color-text-2)', lineHeight: '20px', marginBottom: 8 }}>
                  {record.content}
                </div>
                <Button
                  type="text"
                  size="mini"
                  style={{ padding: 0, height: 'auto', marginBottom: 8 }}
                  onClick={() => onContractClick(record.contractId)}
                >
                  {record.contractNo}
                </Button>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: '20px' }}>
                  <div>{record.time}</div>
                  <div>操作人：{record.operator}</div>
                </div>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      )}
    </Card>
  );
}
