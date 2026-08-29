import { Card, Tag, Progress, Space, Typography, Button } from '@arco-design/web-react';
import { derivePaymentStatus, deriveCollectionProgress, findNextPayPeriod } from './paymentCalc';
import { BLOCKER_TYPE_LABELS } from './paymentMock';
import type { Contract } from '../types';
import type { KanbanColumn } from './types';
import { KANBAN_COLUMNS } from './types';

const { Text } = Typography;

interface Props {
  contract: Contract;
  today: string;
  onClick: () => void;
  onRecordCollection: () => void;
  onReportBlocker: () => void;
}

const STATUS_COLORS: Record<KanbanColumn, string> = {
  normal: 'blue',
  upcoming: 'orange',
  overdue: 'red',
  blocked: 'red',
  settled: 'green',
};

export function ContractPaymentCard({ contract, today, onClick, onRecordCollection, onReportBlocker }: Props) {
  const status = derivePaymentStatus(contract, today);
  const progress = deriveCollectionProgress(contract);
  const plans = contract.paymentPlans ?? [];
  const collections = contract.collectionRecords ?? [];
  const blockers = (contract.paymentBlockers ?? []).filter(b => !b.resolvedAt);
  const dunning = contract.dunningRecords ?? [];
  const nextPeriod = findNextPayPeriod(plans, collections);

  // 逾期天数
  const overdueDays = nextPeriod?.expectedDate
    ? Math.max(0, Math.round((new Date(today).getTime() - new Date(nextPeriod.expectedDate).getTime()) / 86400000))
    : 0;

  // 卡点受阻天数
  const blockerDays = blockers.length > 0
    ? Math.round((new Date(today).getTime() - new Date(blockers[0].createdAt).getTime()) / 86400000)
    : 0;

  // 最近催款
  const lastDunning = dunning.length > 0 ? dunning[dunning.length - 1] : null;

  return (
    <Card
      size="small"
      hoverable
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderLeft: status === 'blocked'
          ? '3px solid var(--destructive-500)'
          : status === 'overdue'
          ? '3px solid var(--destructive-400)'
          : undefined,
      }}
    >
      {/* 1. 合同编号 + 标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
        <div>
          <Text style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--text-sm)' }}>
            {contract.contractNo}
          </Text>
          <Text type="secondary" style={{ fontSize: 'var(--text-xs)', marginLeft: 'var(--space-2)' }}>
            {contract.name}
          </Text>
        </div>
        <Tag color={STATUS_COLORS[status]} size="small">{KANBAN_COLUMNS[status].label}</Tag>
      </div>

      {/* 2. 客户 */}
      <Text type="secondary" style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: 'var(--space-2)' }}>
        客户: {contract.customerName}
      </Text>

      {/* 3. 合同总金额 */}
      <Text style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-bold)', display: 'block', marginBottom: 'var(--space-2)' }}>
        ¥{contract.totalAmount.toLocaleString()}
      </Text>

      {/* 4. 回款进度条 */}
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
          <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
            ¥{progress.received.toLocaleString()} / ¥{progress.total.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)' }}>
            {progress.percentage}%
          </Text>
        </div>
        <Progress
          percent={progress.percentage}
          size="small"
          showText={false}
          color={status === 'settled' ? 'var(--success-500)' : 'var(--brand-500)'}
        />
      </div>

      {/* 5. 当前待付期次 */}
      {nextPeriod && status !== 'settled' && (
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
            下期: {nextPeriod.planName} ¥{nextPeriod.amount.toLocaleString()}
          </Text>
        </div>
      )}

      {/* 6. 到期时间 / 逾期天数 */}
      {status === 'overdue' && overdueDays > 0 && (
        <Tag color="red" size="small" style={{ marginBottom: 'var(--space-2)' }}>
          已逾期 {overdueDays} 天
        </Tag>
      )}
      {status === 'upcoming' && nextPeriod && (
        <Tag color="orange" size="small" style={{ marginBottom: 'var(--space-2)' }}>
          {Math.round((new Date(nextPeriod.expectedDate).getTime() - new Date(today).getTime()) / 86400000)} 天后到期
        </Tag>
      )}

      {/* 7. 卡点标签（仅卡点列） */}
      {status === 'blocked' && blockers.length > 0 && (
        <div style={{ marginBottom: 'var(--space-2)' }}>
          {blockers.map(b => (
            <Tag key={b.id} color="red" size="small">
              {BLOCKER_TYPE_LABELS[b.type] ?? b.type} · {blockerDays}天
            </Tag>
          ))}
        </div>
      )}

      {/* 8. 负责人 */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
        <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>商务: {contract.salesOwner}</Text>
        {contract.projectManager && (
          <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>PM: {contract.projectManager}</Text>
        )}
      </div>

      {/* 9. 最近催款 */}
      {lastDunning && (
        <Text type="secondary" style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: 'var(--space-2)' }}>
          最近催款: {lastDunning.date.slice(5)} ({lastDunning.method})
        </Text>
      )}

      {/* 10. 快捷操作 */}
      {status !== 'settled' && (
        <Space size="small">
          <Button size="mini" type="outline" onClick={onRecordCollection}>录入回款</Button>
          <Button size="mini" type="outline" status="warning" onClick={onReportBlocker}>上报卡点</Button>
        </Space>
      )}
    </Card>
  );
}
