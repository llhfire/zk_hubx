import { Card, Divider, Space, Tag, Timeline, Typography } from '@arco-design/web-react';
import {
  IconCheckCircle,
  IconClockCircle,
  IconCloseCircle,
  IconExclamationCircle,
  IconSafe,
} from '@arco-design/web-react/icon';
import type { Trip, ApprovalRecord, Expense } from '../../types';
import { computeApprovalCompliance } from '../tripDetailMetrics';

const { Text, Paragraph } = Typography;
const TimelineItem = Timeline.Item;

interface ApprovalTimelineTabProps {
  trip: Trip;
}

const approvalStatusConfig: Record<string, { icon: typeof IconCheckCircle; color: string; tag: string; tagColor: string }> = {
  approved: { icon: IconCheckCircle, color: '#00b42a', tag: '通过', tagColor: 'green' },
  rejected: { icon: IconCloseCircle, color: '#f53f3f', tag: '驳回', tagColor: 'red' },
  pending: { icon: IconClockCircle, color: '#ff7d00', tag: '待审批', tagColor: 'orange' },
};

export function ApprovalTimelineTab({ trip }: ApprovalTimelineTabProps) {
  const compliance = computeApprovalCompliance(trip);
  const records = trip.approvalRecords ?? [];

  // 收集所有超标费用记录
  const overStandardExpenses: Expense[] = [];
  trip.itinerarySegments?.forEach((seg) => {
    seg.expenses?.forEach((exp) => {
      if (exp.isOverStandard) {
        overStandardExpenses.push(exp);
      }
    });
  });

  return (
    <div style={{ padding: 12 }}>
      {/* 顶部：合规状态条 */}
      <div
        style={{
          padding: '10px 12px',
          background: compliance.tone === 'danger' ? 'var(--color-danger-light-1)' : compliance.tone === 'warning' ? 'var(--color-warning-light-1)' : 'var(--color-success-light-1)',
          borderRadius: 4,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Space size={8}>
          <IconSafe style={{ color: compliance.tone === 'danger' ? '#f53f3f' : compliance.tone === 'warning' ? '#ff7d00' : '#00b42a', fontSize: 16 }} />
          <div>
            <Text style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>{compliance.value}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{compliance.detail}</Text>
          </div>
        </Space>
        <Tag color={compliance.tone === 'danger' ? 'red' : compliance.tone === 'warning' ? 'orange' : 'green'} size="small">
          {compliance.isAllPassed ? '已通过' : '流转中'}
        </Tag>
      </div>

      {/* 审批节点时间线 */}
      <Card size="small" title="审批流转轨迹" style={{ marginBottom: 12 }}>
        {records.length > 0 ? (
          <Timeline style={{ paddingLeft: 4, marginTop: 8 }}>
            {records.map((record) => {
              const config = approvalStatusConfig[record.status] || approvalStatusConfig.pending;
              const Icon = config.icon;
              return (
                <TimelineItem
                  key={record.id}
                  dot={<Icon style={{ color: config.color, fontSize: 14 }} />}
                >
                  <div style={{ paddingBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontWeight: 600, fontSize: 13 }}>{record.step}</Text>
                      <Tag color={config.tagColor} size="small">{config.tag}</Tag>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 12, color: 'var(--color-text-3)' }}>
                      <span>审批人：{record.approver}</span>
                      {record.time && <span>· {record.time}</span>}
                    </div>
                    {record.comment && (
                      <div style={{ marginTop: 4, padding: '4px 8px', background: 'var(--color-fill-1)', borderRadius: 4, fontSize: 12, color: 'var(--color-text-2)' }}>
                        意见：{record.comment}
                      </div>
                    )}
                  </div>
                </TimelineItem>
              );
            })}
          </Timeline>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--color-text-3)', fontSize: 13 }}>
            暂无审批流程记录
          </div>
        )}
      </Card>

      {/* 超标特批留痕 */}
      {overStandardExpenses.length > 0 && (
        <Card size="small" title="超标费用特批留痕">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {overStandardExpenses.map((exp) => (
              <div
                key={exp.id}
                style={{
                  padding: 8,
                  background: 'var(--color-warning-light-1)',
                  borderRadius: 4,
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: 600, color: '#d46b08' }}>¥{exp.amount} 超标申请</Text>
                  <Tag color="gold" size="small">已获特批</Tag>
                </div>
                <div style={{ marginTop: 4, color: 'var(--color-text-2)' }}>
                  理由：{exp.overStandardReason || exp.remark || '商务接待特批'}
                </div>
              </div>
            ))}
          </Space>
        </Card>
      )}
    </div>
  );
}
