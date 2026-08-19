import { Tag, Typography, Card, Space } from '@arco-design/web-react';
import { BLOCKER_TYPE_LABELS } from './paymentMock';
import type { Contract } from '../types';

const { Text } = Typography;

interface Props {
  contract: Contract;
}

const TODAY = '2026-08-19';

export function BlockerDunningTab({ contract }: Props) {
  const blockers = contract.paymentBlockers ?? [];
  const dunning = contract.dunningRecords ?? [];
  const activeBlockers = blockers.filter(b => !b.resolvedAt);
  const resolvedBlockers = blockers.filter(b => b.resolvedAt);

  return (
    <div style={{ padding: 'var(--space-4) 0' }}>
      {/* 活跃卡点 */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <Text style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)', display: 'block' }}>
          活跃卡点 ({activeBlockers.length} 项)
        </Text>
        {activeBlockers.length === 0 && (
          <Text type="secondary" style={{ fontSize: 'var(--text-sm)' }}>无活跃卡点</Text>
        )}
        {activeBlockers.map(b => {
          const days = Math.round((new Date(TODAY).getTime() - new Date(b.createdAt).getTime()) / 86400000);
          return (
            <Card key={b.id} size="small" style={{
              marginBottom: 'var(--space-3)',
              borderLeft: '3px solid var(--destructive-500)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <Space>
                  <Tag color="red" size="small">{BLOCKER_TYPE_LABELS[b.type] ?? b.type}</Tag>
                  <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>受阻金额: ¥{b.amountBlocked.toLocaleString()}</Text>
                </Space>
                <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                  登记人: {b.createdBy} ({b.createdAt}) · 已滞留 {days} 天
                </Text>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', marginBottom: 'var(--space-2)' }}>
                {b.description}
              </div>
              {b.ownerId && (
                <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                  攻坚责任人: {b.ownerId}
                </Text>
              )}
            </Card>
          );
        })}
      </div>

      {/* 已解决卡点 */}
      {resolvedBlockers.length > 0 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Text style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)', display: 'block' }}>
            已解决卡点 ({resolvedBlockers.length} 项)
          </Text>
          {resolvedBlockers.map(b => (
            <Card key={b.id} size="small" style={{ marginBottom: 'var(--space-3)', opacity: 0.7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <Tag color="gray" size="small">{BLOCKER_TYPE_LABELS[b.type] ?? b.type}</Tag>
                  <Text style={{ fontSize: 'var(--text-sm)' }}>{b.title}</Text>
                </Space>
                <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                  解决于 {b.resolvedAt} · {b.resolvedBy}
                </Text>
              </div>
              {b.resolutionNote && (
                <Text type="secondary" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)', display: 'block' }}>
                  结论: {b.resolutionNote}
                </Text>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 催款跟进流水 */}
      <div>
        <Text style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)', display: 'block' }}>
          催款跟进流水 ({dunning.length} 条)
        </Text>
        {dunning.length === 0 && (
          <Text type="secondary" style={{ fontSize: 'var(--text-sm)' }}>暂无催款记录</Text>
        )}
        {dunning.map((d, idx) => (
          <div key={d.id} style={{
            padding: 'var(--space-3)',
            borderLeft: `2px solid ${idx === dunning.length - 1 ? 'var(--brand-500)' : 'var(--color-border-2)'}`,
            marginBottom: 'var(--space-3)',
            marginLeft: 'var(--space-1)',
          }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
              <Text style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--text-sm)' }}>{d.date}</Text>
              <Tag size="small">{d.method}</Tag>
              <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>对接人: {d.contactPerson} ({d.createdBy})</Text>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', marginBottom: 'var(--space-1)' }}>
              结果: {d.result}
            </div>
            {d.promisedPayDate && (
              <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                客户承诺付款日: {d.promisedPayDate}
              </Text>
            )}
            {d.nextPlan && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-500)', marginTop: 'var(--space-1)' }}>
                下次计划: {d.nextPlan}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
