import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Input, Message, Select, Space, Tooltip, Typography } from '@/design-system';
import {
  IconClockCircle,
  IconEye,
  IconFile,
  IconSearch,
} from '@/design-system';
import { useContracts } from './ContractsContext';
import type { Contract, PaymentPlanItem } from './types';
import { useCollections } from '../../../collections/CollectionContext';
import { withCollectionLedger } from '../../../../services/collectionMutations';
import {
  CountdownTag,
  DataTable,
  DateText,
  EmptyState,
  MetricGrid,
  MoneyText,
  SectionCard,
  SplitLayout,
  SplitLayoutAside,
  SplitLayoutMain,
  type StatusTone,
  StatusTag,
  ProgressBar,
} from '@/design-system';
import './payment/paymentConsistency.css';

const Text = Typography.Text;

type MilestoneStage = 'blocked' | 'overdue' | 'week' | 'month' | 'future' | 'settled';

interface PaymentMilestone {
  id: string;
  contractId: string;
  contractNo: string;
  contractName: string;
  customerName: string;
  owner: string;
  totalAmount: number;
  plan: PaymentPlanItem;
  dueDate: Date;
  paidAmount: number;
  remainingAmount: number;
  receivedAmount: number;
  blockerAmount: number;
  daysLeft: number;
  stage: MilestoneStage;
  progress: number;
}

const STAGE_META: Record<MilestoneStage, { label: string; tone: 'danger' | 'warning' | 'info' | 'neutral' | 'success' }> = {
  blocked: { label: '风险卡点', tone: 'danger' },
  overdue: { label: '已逾期', tone: 'danger' },
  week: { label: '7天内', tone: 'warning' },
  month: { label: '30天内', tone: 'info' },
  future: { label: '后续回款', tone: 'neutral' },
  settled: { label: '已结清', tone: 'success' },
};

const FILTER_OPTIONS: Array<{ label: string; value: 'all' | MilestoneStage }> = [
  { label: '全部待办', value: 'all' },
  { label: '风险卡点', value: 'blocked' },
  { label: '已逾期', value: 'overdue' },
  { label: '7天内', value: 'week' },
  { label: '30天内', value: 'month' },
  { label: '后续回款', value: 'future' },
  { label: '已结清', value: 'settled' },
];

function asDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dayDiff(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.ceil((end - start) / 86400000);
}

function formatDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getReceivedAmount(contract: Contract): number {
  if (contract.collectionRecords?.length) {
    return contract.collectionRecords.reduce((sum, record) => sum + record.amount, 0);
  }
  return contract.receivedAmount ?? 0;
}

function getBlockerAmount(contract: Contract, paymentPeriod?: number, includeLegacy = false): number {
  return (contract.paymentBlockers ?? [])
    .filter((blocker) => !blocker.resolvedAt && (
      paymentPeriod == null
      || blocker.paymentPeriod === paymentPeriod
      || (includeLegacy && blocker.paymentPeriod == null)
    ))
    .reduce((sum, blocker) => sum + blocker.amountBlocked, 0);
}

function derivePlanDate(contract: Contract, plan: PaymentPlanItem, idx: number): Date {
  const base = asDate(
    contract.current.effectiveDate || contract.current.signDate,
    new Date('2026-01-01'),
  );
  const fallback = addDays(base, 45 * (idx + 1));
  return asDate(plan.expectedDate, fallback);
}

function getStage(
  remainingAmount: number,
  blockerAmount: number,
  daysLeft: number,
): MilestoneStage {
  if (remainingAmount <= 0) return 'settled';
  if (blockerAmount > 0) return 'blocked';
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 7) return 'week';
  if (daysLeft <= 30) return 'month';
  return 'future';
}

function buildMilestones(contracts: Contract[], today: Date): PaymentMilestone[] {
  return contracts.flatMap((contract) => {
    const receivedAmount = getReceivedAmount(contract);
    const firstPendingIndex = contract.current.paymentPlans.findIndex((plan, index) => {
      const accumulated = contract.current.paymentPlans
        .slice(0, index + 1)
        .reduce((sum, item) => sum + item.amount, 0);
      return receivedAmount < accumulated;
    });
    let accumulatedBefore = 0;

    return contract.current.paymentPlans.map((plan, idx) => {
      const blockerAmount = getBlockerAmount(contract, plan.period, idx === firstPendingIndex);
      const paidInPlan = Math.max(0, Math.min(plan.amount, receivedAmount - accumulatedBefore));
      const remainingAmount = Math.max(0, plan.amount - paidInPlan);
      const dueDate = derivePlanDate(contract, plan, idx);
      const daysLeft = dayDiff(today, dueDate);
      const progress = plan.amount > 0 ? Math.round((paidInPlan / plan.amount) * 100) : 0;
      accumulatedBefore += plan.amount;

      return {
        id: `${contract.id}-${plan.period}`,
        contractId: contract.id,
        contractNo: contract.contractNo,
        contractName: contract.current.contractName,
        customerName: contract.current.customerName,
        owner: contract.createdBy,
        totalAmount: contract.current.totalAmount,
        plan,
        dueDate,
        paidAmount: paidInPlan,
        remainingAmount,
        receivedAmount,
        blockerAmount,
        daysLeft,
        stage: getStage(remainingAmount, blockerAmount, daysLeft),
        progress,
      };
    });
  });
}

function stageWeight(stage: MilestoneStage): number {
  return {
    blocked: 0,
    overdue: 1,
    week: 2,
    month: 3,
    future: 4,
    settled: 5,
  }[stage];
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadMilestoneList(items: PaymentMilestone[]): void {
  if (items.length === 0) {
    Message.warning('当前筛选条件下没有可导出的回款节点');
    return;
  }

  const rows = items.map((item) => [
    item.contractNo,
    item.contractName,
    item.customerName,
    `第${item.plan.period}期`,
    formatDate(item.dueDate),
    item.remainingAmount,
    STAGE_META[item.stage].label,
    item.owner,
  ]);
  const csv = [
    ['合同编号', '合同名称', '客户', '回款节点', '计划日期', '待回款金额', '优先级', '负责人'],
    ...rows,
  ].map((row) => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `回款行动清单-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  Message.success(`已导出 ${items.length} 个回款节点`);
}

export function PaymentKanbanV2() {
  const navigate = useNavigate();
  const { contracts } = useContracts();
  const { collections } = useCollections();
  const [keyword, setKeyword] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | MilestoneStage>('all');

  const today = useMemo(() => new Date(), []);
  const financialContracts = useMemo(() => {
    const hasRecoveryBoard = contracts.some((contract) => contract.dataSource === 'recovery-board');
    return contracts
      .filter((contract) => !hasRecoveryBoard || contract.dataSource === 'recovery-board')
      .map((contract) => withCollectionLedger(contract, collections));
  }, [contracts, collections]);
  const milestones = useMemo(
    () => buildMilestones(financialContracts, today).sort((a, b) => {
      const stageDelta = stageWeight(a.stage) - stageWeight(b.stage);
      if (stageDelta !== 0) return stageDelta;
      return a.dueDate.getTime() - b.dueDate.getTime();
    }),
    [financialContracts, today],
  );

  const filteredMilestones = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return milestones.filter((item) => {
      const matchStage = stageFilter === 'all' || item.stage === stageFilter;
      const matchKeyword =
        !text ||
        item.contractName.toLowerCase().includes(text) ||
        item.customerName.toLowerCase().includes(text) ||
        item.contractNo.toLowerCase().includes(text);
      return matchStage && matchKeyword;
    });
  }, [keyword, milestones, stageFilter]);

  const summary = useMemo(() => {
    const receivableTotal = milestones.reduce((sum, item) => sum + item.remainingAmount, 0);
    const overdueTotal = milestones
      .filter((item) => item.stage === 'overdue' || item.stage === 'blocked')
      .reduce((sum, item) => sum + item.remainingAmount, 0);
    const next30Total = milestones
      .filter((item) => item.remainingAmount > 0 && item.daysLeft >= 0 && item.daysLeft <= 30)
      .reduce((sum, item) => sum + item.remainingAmount, 0);
    const receivedThisMonth = financialContracts.reduce((sum, contract) => {
      return sum + (contract.collectionRecords ?? [])
        .filter((record) => monthKey(asDate(record.date, today)) === monthKey(today))
        .reduce((recordSum, record) => recordSum + record.amount, 0);
    }, 0);
    const overdueItems = milestones.filter((item) => item.remainingAmount > 0 && item.daysLeft < 0);
    const avgOverdueDays = overdueItems.length
      ? Math.round(overdueItems.reduce((sum, item) => sum + Math.abs(item.daysLeft), 0) / overdueItems.length)
      : 0;

    return {
      receivableTotal,
      overdueTotal,
      next30Total,
      receivedThisMonth,
      avgOverdueDays,
      activeCount: milestones.filter((item) => item.remainingAmount > 0).length,
    };
  }, [financialContracts, milestones, today]);

  const focusItems = useMemo(
    () => milestones
      .filter((item) => item.stage === 'blocked' || item.stage === 'overdue')
      .slice(0, 5),
    [milestones],
  );

  const cashBuckets = useMemo(() => {
    const buckets: Array<{ key: string; label: string; amount: number; tone: StatusTone }> = [
      { key: 'overdue', label: '逾期积压', amount: 0, tone: 'danger' },
      { key: 'week', label: '7天内', amount: 0, tone: 'warning' },
      { key: 'month', label: '8-30天', amount: 0, tone: 'info' },
      { key: 'two-month', label: '31-60天', amount: 0, tone: 'success' },
      { key: 'quarter', label: '61-90天', amount: 0, tone: 'purple' },
    ];

    milestones.forEach((item) => {
      if (item.remainingAmount <= 0) return;
      if (item.daysLeft < 0) buckets[0].amount += item.remainingAmount;
      else if (item.daysLeft <= 7) buckets[1].amount += item.remainingAmount;
      else if (item.daysLeft <= 30) buckets[2].amount += item.remainingAmount;
      else if (item.daysLeft <= 60) buckets[3].amount += item.remainingAmount;
      else if (item.daysLeft <= 90) buckets[4].amount += item.remainingAmount;
    });
    return buckets;
  }, [milestones]);

  const maxBucketAmount = Math.max(...cashBuckets.map((bucket) => bucket.amount), 1);
  const filtersActive = Boolean(keyword.trim() || stageFilter !== 'all');

  const columns = [
    {
      title: '优先级',
      width: 110,
      render: (_: unknown, item: PaymentMilestone) => (
        <StatusTag tone={STAGE_META[item.stage].tone}>{STAGE_META[item.stage].label}</StatusTag>
      ),
    },
    {
      title: '合同 / 客户',
      render: (_: unknown, item: PaymentMilestone) => (
        <Space direction="vertical" size={2}>
          <Text bold>{item.contractName}</Text>
          <Text type="secondary">
            {item.contractNo} · {item.customerName}
          </Text>
        </Space>
      ),
    },
    {
      title: '回款节点',
      width: 170,
      render: (_: unknown, item: PaymentMilestone) => (
        <Space direction="vertical" size={2}>
          <Text>第 {item.plan.period} 期 · {item.plan.percentage}%</Text>
          <Text type="secondary">
            {item.plan.condition || '未填写回款条件'}
          </Text>
        </Space>
      ),
    },
    {
      title: '计划日期',
      width: 120,
      render: (_: unknown, item: PaymentMilestone) => <DateText value={item.dueDate} />,
    },
    {
      title: '待回款',
      width: 130,
      render: (_: unknown, item: PaymentMilestone) => (
        <MoneyText value={item.remainingAmount} fractionDigits={0} />
      ),
    },
    {
      title: '进度',
      width: 170,
      render: (_: unknown, item: PaymentMilestone) => (
        <ProgressBar
          percent={item.progress}
          valueText={`${item.progress}%`}
          size="small"
          tone={item.progress >= 100 ? 'success' : 'info'}
        />
      ),
    },
    {
      title: '负责人',
      dataIndex: 'owner',
      width: 90,
    },
    {
      title: '操作',
      width: 72,
      render: (_: unknown, item: PaymentMilestone) => (
        <Tooltip content="查看合同">
          <Button
            className="hubx-icon-action"
            type="text"
            size="small"
            aria-label={`查看合同${item.contractNo}第${item.plan.period}期回款节点`}
            icon={<IconEye />}
            onClick={() => navigate(`/contracts/${item.contractId}`)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="payment-kanban-v2">
      <div className="payment-kanban-v2__toolbar">
        <div>
          <div className="payment-kanban-v2__title">回款行动队列</div>
          <div className="payment-kanban-v2__description">按风险、时点和金额组织回款动作，优先处理最影响现金流的合同节点。</div>
        </div>
        <Space className="payment-kanban-v2__actions">
          <Button icon={<IconFile />} onClick={() => downloadMilestoneList(filteredMilestones)}>
            生成清单
          </Button>
        </Space>
      </div>

      <MetricGrid items={[
        { key: 'receivable', label: '未回款总额', value: <MoneyText variant="compact" value={summary.receivableTotal} />, detail: `${summary.activeCount} 个待处理节点` },
        { key: 'next30', label: '30天内应收', value: <MoneyText variant="compact" value={summary.next30Total} />, detail: '需要本月重点推进', tone: summary.next30Total > 0 ? 'warning' : 'neutral' },
        { key: 'overdue', label: '逾期与卡点', value: <MoneyText variant="compact" value={summary.overdueTotal} />, detail: `平均逾期 ${summary.avgOverdueDays} 天`, tone: summary.overdueTotal > 0 ? 'danger' : 'success' },
        { key: 'received', label: '本月已回', value: <MoneyText variant="compact" value={summary.receivedThisMonth} />, detail: '来自已登记实收台账', tone: 'success' },
      ]} />

      <SplitLayout>
        <SplitLayoutMain>
          <SectionCard title="回款队列">
            <DataTable
              columns={columns}
              data={filteredMilestones}
              rowKey="id"
              pagination={{ pageSize: 8 }}
              scroll={{ x: 1080 }}
              toolbar={(
                <Space size={8}>
                  <Input
                    style={{ width: 260 }}
                    prefix={<IconSearch />}
                    placeholder="搜索合同、客户、编号"
                    value={keyword}
                    onChange={setKeyword}
                  />
                  <Select
                    style={{ width: 130 }}
                    value={stageFilter}
                    onChange={setStageFilter}
                    options={FILTER_OPTIONS}
                  />
                </Space>
              )}
              actions={filtersActive ? (
                <Button type="text" onClick={() => { setKeyword(''); setStageFilter('all'); }}>重置筛选</Button>
              ) : (
                <span>共 {filteredMilestones.length} 个节点</span>
              )}
            />
          </SectionCard>
        </SplitLayoutMain>
        <SplitLayoutAside>
          <>
          <SectionCard title="今日优先处理">
            <Space direction="vertical" size="medium" style={{ width: '100%' }}>
              {focusItems.length === 0 ? (
                <EmptyState description="暂无逾期或卡点合同" />
              ) : (
                focusItems.map((item) => (
                  <div
                    key={item.id}
                    className="payment-kanban-v2__focus-item"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <Text bold ellipsis style={{ maxWidth: 210 }}>{item.customerName}</Text>
                      <StatusTag tone={STAGE_META[item.stage].tone}>{STAGE_META[item.stage].label}</StatusTag>
                    </div>
                    <div style={{ marginTop: 6 }}>{item.contractName}</div>
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <IconClockCircle style={{ marginRight: 4 }} />
                        <CountdownTag days={item.daysLeft} />
                      </span>
                      <MoneyText variant="compact" value={item.remainingAmount} />
                    </div>
                  </div>
                ))
              )}
            </Space>
          </SectionCard>

          <SectionCard title="90天现金流节奏">
            <Space direction="vertical" size="medium" style={{ width: '100%' }}>
              {cashBuckets.map((bucket) => (
                <div key={bucket.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span>{bucket.label}</span>
                    <MoneyText variant="compact" value={bucket.amount} />
                  </div>
                  <ProgressBar
                    percent={Math.max(4, (bucket.amount / maxBucketAmount) * 100)}
                    size="small"
                    showValue={false}
                    tone={bucket.tone}
                  />
                </div>
              ))}
            </Space>
          </SectionCard>
          </>
        </SplitLayoutAside>
      </SplitLayout>
    </div>
  );
}
