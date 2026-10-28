import { Divider, Space, Typography } from '@/design-system';
import {
  IconExclamationCircle,
  IconSafe,
} from '@/design-system';
import type { Trip, ApprovalRecord, Expense } from '../../types';
import { computeApprovalCompliance } from '../tripDetailMetrics';
import {
  MoneyText,
  SectionCard,
  StatusTag,
  STATUS_TONE_VARS,
  type StatusTone,
  ApprovalFlow,
} from '@/design-system';

const { Text, Paragraph } = Typography;

interface ApprovalTimelineTabProps {
  trip: Trip;
}

const COMPLIANCE_TONE: Record<string, StatusTone> = {
  danger: 'danger',
  warning: 'warning',
  success: 'success',
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
          borderRadius: 'var(--radius-xs)',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Space size={8}>
          <IconSafe style={{ color: STATUS_TONE_VARS[COMPLIANCE_TONE[compliance.tone] ?? 'neutral'].fg, fontSize: 'var(--text-base)' }} />
          <div>
            <Text style={{ fontWeight: 600, fontSize: 'var(--ds-text-dense)', display: 'block' }}>{compliance.value}</Text>
            <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>{compliance.detail}</Text>
          </div>
        </Space>
        <StatusTag tone={COMPLIANCE_TONE[compliance.tone] ?? 'neutral'}>
          {compliance.isAllPassed ? '已通过' : '流转中'}
        </StatusTag>
      </div>

      {/* 审批节点时间线 */}
      <div style={{ marginBottom: 12 }}>
        <SectionCard title="审批流转轨迹">
        <ApprovalFlow
          emptyDescription="暂无审批流程记录"
          nodes={records.map((record) => ({
              key: record.id,
              title: record.step,
              status: record.status === 'approved' || record.status === 'rejected' || record.status === 'pending' ? record.status : 'skipped',
              note: `审批人：${record.approver}`,
              time: record.time,
              comment: record.comment,
          }))}
        />
        </SectionCard>
      </div>

      {/* 超标特批留痕 */}
      {overStandardExpenses.length > 0 && (
        <SectionCard title="超标费用特批留痕">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {overStandardExpenses.map((exp) => (
              <div
                key={exp.id}
                style={{
                  padding: 8,
                  background: 'var(--color-warning-light-1)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: 'var(--text-xs)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: 600, color: STATUS_TONE_VARS.warning.fg }}><MoneyText value={exp.amount} /> 超标申请</Text>
                  <StatusTag tone="gold" size="small">已获特批</StatusTag>
                </div>
                <div style={{ marginTop: 4, color: 'var(--color-text-2)' }}>
                  理由：{exp.overStandardReason || exp.remark || '商务接待特批'}
                </div>
              </div>
            ))}
          </Space>
        </SectionCard>
      )}
    </div>
  );
}
