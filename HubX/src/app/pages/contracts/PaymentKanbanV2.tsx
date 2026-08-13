import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Card,
  Grid,
  Input,
  Message,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react';
import {
  IconClockCircle,
  IconFile,
  IconPlus,
  IconSearch,
} from '@arco-design/web-react/icon';
import { useContracts } from './ContractsContext';
import type { Contract, PaymentPlanItem } from './types';

const { Row, Col } = Grid;
const Title = Typography.Title;
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

const STAGE_META: Record<MilestoneStage, { label: string; color: string }> = {
  blocked: { label: '风险卡点', color: 'red' },
  overdue: { label: '已逾期', color: 'orangered' },
  week: { label: '7天内', color: 'orange' },
  month: { label: '30天内', color: 'arcoblue' },
  future: { label: '后续回款', color: 'gray' },
  settled: { label: '已结清', color: 'green' },
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

function currency(value: number): string {
  if (Math.abs(value) >= 10000) return `¥${(value / 10000).toFixed(1)}万`;
  return `¥${value.toLocaleString()}`;
}

function fullCurrency(value: number): string {
  return `¥${Math.round(value).toLocaleString()}`;
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

function getBlockerAmount(contract: Contract): number {
  return (contract.paymentBlockers ?? [])
    .filter((blocker) => !blocker.resolvedAt)
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
    const blockerAmount = getBlockerAmount(contract);
    let accumulatedBefore = 0;

    return contract.current.paymentPlans.map((plan, idx) => {
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

export function PaymentKanbanV2() {
  const navigate = useNavigate();
  const { contracts } = useContracts();
  const [keyword, setKeyword] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | MilestoneStage>('all');

  const today = useMemo(() => new Date(), []);
  const milestones = useMemo(
    () => buildMilestones(contracts, today).sort((a, b) => {
      const stageDelta = stageWeight(a.stage) - stageWeight(b.stage);
      if (stageDelta !== 0) return stageDelta;
      return a.dueDate.getTime() - b.dueDate.getTime();
    }),
    [contracts, today],
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
    const receivedThisMonth = contracts.reduce((sum, contract) => {
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
  }, [contracts, milestones, today]);

  const focusItems = useMemo(
    () => milestones
      .filter((item) => item.stage === 'blocked' || item.stage === 'overdue')
      .slice(0, 5),
    [milestones],
  );

  const cashBuckets = useMemo(() => {
    const buckets = [
      { key: 'overdue', label: '逾期积压', amount: 0, color: 'rgb(var(--red-6))' },
      { key: 'week', label: '7天内', amount: 0, color: 'rgb(var(--orange-6))' },
      { key: 'month', label: '8-30天', amount: 0, color: 'rgb(var(--blue-6))' },
      { key: 'two-month', label: '31-60天', amount: 0, color: 'rgb(var(--green-6))' },
      { key: 'quarter', label: '61-90天', amount: 0, color: 'rgb(var(--purple-6))' },
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

  const columns = [
    {
      title: '优先级',
      width: 110,
      render: (_: unknown, item: PaymentMilestone) => (
        <Tag color={STAGE_META[item.stage].color}>{STAGE_META[item.stage].label}</Tag>
      ),
    },
    {
      title: '合同 / 客户',
      render: (_: unknown, item: PaymentMilestone) => (
        <div>
          <div style={{ fontWeight: 600 }}>{item.contractName}</div>
          <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-3)' }}>
            {item.contractNo} · {item.customerName}
          </div>
        </div>
      ),
    },
    {
      title: '回款节点',
      width: 170,
      render: (_: unknown, item: PaymentMilestone) => (
        <div>
          <div>第 {item.plan.period} 期 · {item.plan.percentage}%</div>
          <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-3)' }}>
            {item.plan.condition || '未填写回款条件'}
          </div>
        </div>
      ),
    },
    {
      title: '计划日期',
      width: 120,
      render: (_: unknown, item: PaymentMilestone) => formatDate(item.dueDate),
    },
    {
      title: '待回款',
      width: 130,
      render: (_: unknown, item: PaymentMilestone) => (
        <span style={{ fontWeight: 700 }}>{fullCurrency(item.remainingAmount)}</span>
      ),
    },
    {
      title: '进度',
      width: 170,
      render: (_: unknown, item: PaymentMilestone) => (
        <Progress
          size="small"
          percent={item.progress}
          color={item.progress >= 100 ? 'rgb(var(--green-6))' : 'rgb(var(--blue-6))'}
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
      width: 110,
      render: (_: unknown, item: PaymentMilestone) => (
        <Button type="text" size="small" onClick={() => navigate(`/contracts/${item.contractId}`)}>
          查看合同
        </Button>
      ),
    },
  ];

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <div>
          <Title heading={4} style={{ margin: 0 }}>回款看板</Title>
          <Text type="secondary">按风险、时点和金额组织回款动作，优先处理最影响现金流的合同节点。</Text>
        </div>
        <Space>
          <Button icon={<IconFile />} onClick={() => Message.info('已生成当前筛选条件下的回款清单')}>
            生成清单
          </Button>
          <Button type="primary" icon={<IconPlus />} onClick={() => Message.info('请在合同详情中登记回款或催收记录')}>
            登记动作
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <MetricCard
            title="未回款总额"
            value={currency(summary.receivableTotal)}
            caption={`${summary.activeCount} 个待处理节点`}
            color="rgb(var(--blue-6))"
          />
        </Col>
        <Col span={6}>
          <MetricCard
            title="30天内应收"
            value={currency(summary.next30Total)}
            caption="需要本月重点推进"
            color="rgb(var(--green-6))"
          />
        </Col>
        <Col span={6}>
          <MetricCard
            title="逾期与卡点"
            value={currency(summary.overdueTotal)}
            caption={`平均逾期 ${summary.avgOverdueDays} 天`}
            color="rgb(var(--red-6))"
          />
        </Col>
        <Col span={6}>
          <MetricCard
            title="本月已回"
            value={currency(summary.receivedThisMonth)}
            caption="来自已登记回款记录"
            color="rgb(var(--orange-6))"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={17}>
          <Card
            title="回款队列"
            bordered={false}
            extra={
              <Space>
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
            }
          >
            <Table
              columns={columns}
              data={filteredMilestones}
              rowKey="id"
              pagination={{ pageSize: 8 }}
              scroll={{ x: 1080 }}
            />
          </Card>
        </Col>
        <Col span={7}>
          <Card title="今日优先处理" bordered={false}>
            <Space direction="vertical" size="medium" style={{ width: '100%' }}>
              {focusItems.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-3)' }}>
                  暂无逾期或卡点合同
                </div>
              ) : (
                focusItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: 12,
                      background: 'var(--color-fill-2)',
                      border: '1px solid var(--color-border-2)',
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <Text bold ellipsis style={{ maxWidth: 210 }}>{item.customerName}</Text>
                      <Tag color={STAGE_META[item.stage].color}>{STAGE_META[item.stage].label}</Tag>
                    </div>
                    <div style={{ marginTop: 6, color: 'var(--color-text-2)' }}>{item.contractName}</div>
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-3)' }}>
                        <IconClockCircle style={{ marginRight: 4 }} />
                        {item.daysLeft < 0 ? `逾期 ${Math.abs(item.daysLeft)} 天` : `${item.daysLeft} 天后到期`}
                      </span>
                      <Text bold>{currency(item.remainingAmount)}</Text>
                    </div>
                  </div>
                ))
              )}
            </Space>
          </Card>

          <Card title="90天现金流节奏" bordered={false} style={{ marginTop: 16 }}>
            <Space direction="vertical" size="medium" style={{ width: '100%' }}>
              {cashBuckets.map((bucket) => (
                <div key={bucket.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: 'var(--color-text-2)' }}>{bucket.label}</span>
                    <Text bold>{currency(bucket.amount)}</Text>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: 'var(--color-fill-2)',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(4, (bucket.amount / maxBucketAmount) * 100)}%`,
                        height: '100%',
                        background: bucket.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function MetricCard({
  title,
  value,
  caption,
  color,
}: {
  title: string;
  value: string;
  caption: string;
  color: string;
}) {
  return (
    <Card bordered={false} bodyStyle={{ padding: 16 }}>
      <div style={{ color: 'var(--color-text-3)', fontSize: 13 }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ marginTop: 6, color: 'var(--color-text-2)' }}>{caption}</div>
    </Card>
  );
}
