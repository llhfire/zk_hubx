# 合同回款 Kanban 看板 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在合同管理模块下新增全合同回款 Kanban 看板，支持五列拖拽、卡点管理、催款记录、回款录入。

**Architecture:** 在现有 ContractsContext 中扩展回款/卡点/催款操作，新建 PaymentKanban 页面及子组件，路由 `/contracts/payments`。数据通过 Context 内存态管理，UI 基于 Arco Design + Tailwind + react-dnd。

**Tech Stack:** React 18, TypeScript, Arco Design, Tailwind CSS v4, react-dnd (已安装)

**Spec:** `docs/superpowers/specs/2026-07-01-contract-payment-kanban-design.md`

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `src/app/pages/contracts/types.ts` | 新增 PaymentStatus、BlockerType、CollectionRecord、PaymentBlocker、DunningRecord 类型 |
| 修改 | `src/app/pages/contracts/mockData.ts` | 为示例合同添加回款/卡点/催款 mock 数据 |
| 新建 | `src/app/pages/contracts/paymentUtils.ts` | 回款状态计算、摘要指标计算等纯函数 |
| 新建 | `src/app/pages/contracts/__tests__/paymentUtils.test.ts` | 工具函数测试 |
| 修改 | `src/app/pages/contracts/ContractsContext.tsx` | 新增回款/卡点/催款操作方法 |
| 新建 | `src/app/pages/contracts/PaymentKanban.tsx` | 看板页面主组件 |
| 新建 | `src/app/pages/contracts/components/PaymentKanbanSummaryBar.tsx` | 7 指标摘要栏 |
| 新建 | `src/app/pages/contracts/components/PaymentKanbanBoard.tsx` | 五列容器 + 拖拽 |
| 新建 | `src/app/pages/contracts/components/PaymentKanbanCard.tsx` | 合同卡片 |
| 新建 | `src/app/pages/contracts/components/PaymentKanbanSideDrawer.tsx` | 侧边抽屉（含三 Tab） |
| 修改 | `src/app/routes.tsx` | 新增 `/contracts/payments` 路由 |
| 修改 | `src/app/components/MainLayout.tsx` | 合同管理菜单下新增「回款看板」 |

---

### Task 1: 扩展类型定义

**Files:**
- Modify: `src/app/pages/contracts/types.ts`

- [ ] **Step 1: 在 types.ts 末尾追加新类型定义**

在文件末尾 `// 合同模板接口` 之前插入：

```typescript
// ---- 回款看板相关类型 ----

export type PaymentStatus = 'normal' | 'upcoming' | 'overdue' | 'blocked' | 'settled';

export type BlockerType = 'overdue_unpaid' | 'customer_delay' | 'invoice_unpaid' | 'acceptance_stuck' | 'dispute';

export const BLOCKER_TYPE_LABELS: Record<BlockerType, string> = {
  overdue_unpaid: '逾期未付',
  customer_delay: '客户拖延',
  invoice_unpaid: '开票未回',
  acceptance_stuck: '验收卡住',
  dispute: '合同纠纷',
};

export interface CollectionRecord {
  id: string;
  contractId: string;
  amount: number;
  date: string;
  method: string;
  note: string;
}

export interface PaymentBlocker {
  id: string;
  contractId: string;
  type: BlockerType;
  title: string;
  description: string;
  amountBlocked: number;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface DunningRecord {
  id: string;
  contractId: string;
  date: string;
  method: string;
  contactPerson: string;
  result: string;
  nextPlan: string;
}
```

- [ ] **Step 2: 在 Contract 接口中追加字段**

在 `Contract` 接口的 `executionStatus?: ExecutionStatus;` 之后添加：

```typescript
  // 回款看板扩展
  collectionRecords?: CollectionRecord[];
  paymentBlockers?: PaymentBlocker[];
  dunningRecords?: DunningRecord[];
  paymentStatus?: PaymentStatus;
```

- [ ] **Step 3: 运行 TypeScript 编译检查**

```bash
cd HubX && npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/app/pages/contracts/types.ts
git commit -m "feat: add payment kanban types (CollectionRecord, PaymentBlocker, DunningRecord)"
```

---

### Task 2: 添加 Mock 数据

**Files:**
- Modify: `src/app/pages/contracts/mockData.ts`

- [ ] **Step 1: 在 mockData.ts 中为已归档合同添加回款相关数据**

找到 `buildInitialContracts` 函数中已归档合同（status: 'archived'），为 contract-1 和 contract-2 添加 mock 数据。在合同对象中添加以下字段：

```typescript
// 在 contract-1（已归档合同）对象中添加：
collectionRecords: [
  {
    id: 'col-1-1',
    contractId: 'contract-1',
    amount: 320000,
    date: '2026-04-14',
    method: '银行汇款',
    note: '一期付款到账',
  },
  {
    id: 'col-1-2',
    contractId: 'contract-1',
    amount: 160000,
    date: '2026-06-10',
    method: '银行汇款',
    note: '二期部分付款',
  },
],
paymentBlockers: [
  {
    id: 'blocker-1-1',
    contractId: 'contract-1',
    type: 'customer_delay' as BlockerType,
    title: '客户二期尾款迟迟不付',
    description: '已催款3次，客户财务说在走流程但一直没有实质进展',
    amountBlocked: 80000,
    createdAt: '2026-06-20 10:00',
  },
],
dunningRecords: [
  {
    id: 'dun-1-1',
    contractId: 'contract-1',
    date: '2026-06-20',
    method: '电话',
    contactPerson: '王经理',
    result: '对方说在走财务流程',
    nextPlan: '下周再跟进',
  },
  {
    id: 'dun-1-2',
    contractId: 'contract-1',
    date: '2026-06-28',
    method: '微信',
    contactPerson: '王经理',
    result: '未回复',
    nextPlan: '7月5日电话催款',
  },
],
paymentStatus: 'blocked' as PaymentStatus,
```

- [ ] **Step 2: 为 contract-2 添加不同的回款 mock 数据**

```typescript
// 在 contract-2 对象中添加：
collectionRecords: [
  {
    id: 'col-2-1',
    contractId: 'contract-2',
    amount: 500000,
    date: '2026-05-10',
    method: '银行汇款',
    note: '全款到账',
  },
],
paymentBlockers: [],
dunningRecords: [],
paymentStatus: 'settled' as PaymentStatus,
```

- [ ] **Step 3: Commit**

```bash
git add src/app/pages/contracts/mockData.ts
git commit -m "feat: add payment/blocker/dunning mock data for sample contracts"
```

---

### Task 3: 回款工具函数

**Files:**
- Create: `src/app/pages/contracts/paymentUtils.ts`
- Create: `src/app/pages/contracts/__tests__/paymentUtils.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
// src/app/pages/contracts/__tests__/paymentUtils.test.ts
import { describe, it, expect } from 'vitest';
import { computePaymentStatus, computeKanbanSummary, getLatestDunning } from '../paymentUtils';
import type { Contract, PaymentPlanItem } from '../types';

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'test-1',
    contractNo: 'CT202607001',
    status: 'archived',
    current: {
      contractName: '测试合同',
      productCategory: '软件开发',
      signingEntity: '北京科技',
      customerName: '测试客户',
      customerContact: '张经理',
      customerPhone: '13800138000',
      customerEmail: '',
      customerAddress: '',
      customerTaxNo: '',
      bankName: '',
      bankAccount: '',
      contractContent: '',
      signDate: '2026-01-01',
      effectiveDate: '2026-01-01',
      endDate: '2026-12-31',
      paymentMethod: '公对公',
      totalAmount: 100000,
      rebateAmount: 0,
      paymentPlans: [
        { period: 1, expectedDate: '2026-03-01', amount: 50000, percentage: 50 },
        { period: 2, expectedDate: '2026-06-01', amount: 50000, percentage: 50 },
      ],
      templateId: 'software_sales',
    },
    versionHistory: [],
    approvalFlow: [],
    archivedScans: [],
    createdAt: '2026-01-01',
    createdBy: '张三',
    updatedAt: '2026-01-01',
    collectionRecords: [],
    paymentBlockers: [],
    dunningRecords: [],
    ...overrides,
  };
}

describe('computePaymentStatus', () => {
  it('returns settled when all paid', () => {
    const c = makeContract({
      collectionRecords: [
        { id: '1', contractId: 'test-1', amount: 100000, date: '2026-06-01', method: '汇款', note: '' },
      ],
    });
    expect(computePaymentStatus(c)).toBe('settled');
  });

  it('returns blocked when there are unresolved blockers', () => {
    const c = makeContract({
      paymentBlockers: [
        { id: 'b1', contractId: 'test-1', type: 'customer_delay', title: '拖', description: '', amountBlocked: 50000, createdAt: '' },
      ],
    });
    expect(computePaymentStatus(c)).toBe('blocked');
  });

  it('returns overdue when payment date passed with 7-day buffer', () => {
    // 当前日期 2026-07-01，付款节点 2026-06-01，已超过 7 天缓冲
    const c = makeContract({
      collectionRecords: [
        { id: '1', contractId: 'test-1', amount: 30000, date: '2026-03-01', method: '汇款', note: '' },
      ],
    });
    expect(computePaymentStatus(c, new Date('2026-07-01'))).toBe('overdue');
  });

  it('returns normal when within 7-day buffer', () => {
    const c = makeContract({
      collectionRecords: [
        { id: '1', contractId: 'test-1', amount: 50000, date: '2026-03-01', method: '汇款', note: '' },
      ],
    });
    // 第二期 2026-06-01，当前 2026-06-05，在 7 天缓冲内
    expect(computePaymentStatus(c, new Date('2026-06-05'))).toBe('normal');
  });

  it('returns upcoming when next payment within 7 days', () => {
    const c = makeContract();
    // 第一期 2026-03-01，当前 2026-02-25，在 7 天内
    expect(computePaymentStatus(c, new Date('2026-02-25'))).toBe('upcoming');
  });
});

describe('computeKanbanSummary', () => {
  it('calculates summary correctly', () => {
    const c1 = makeContract({
      collectionRecords: [
        { id: '1', contractId: 'test-1', amount: 100000, date: '2026-07-01', method: '', note: '' },
      ],
    });
    const c2 = makeContract({
      id: 'test-2',
      contractNo: 'CT202607002',
      current: {
        ...makeContract().current,
        totalAmount: 200000,
        paymentPlans: [
          { period: 1, expectedDate: '2026-08-01', amount: 200000, percentage: 100 },
        ],
      },
    });
    const summary = computeKanbanSummary([c1, c2], new Date('2026-07-15'));
    expect(summary.totalContracts).toBe(2);
    expect(summary.totalReceivable).toBe(300000);
    expect(summary.monthlyCollected).toBe(100000); // c1 在 7 月到账
    expect(summary.upcomingMonthEstimate).toBe(200000); // c2 在 8 月
  });
});

describe('getLatestDunning', () => {
  it('returns latest dunning record', () => {
    const records = [
      { id: '1', contractId: 't1', date: '2026-06-01', method: '电话', contactPerson: '王', result: '', nextPlan: '' },
      { id: '2', contractId: 't1', date: '2026-06-28', method: '微信', contactPerson: '王', result: '', nextPlan: '' },
    ];
    expect(getLatestDunning(records)?.id).toBe('2');
  });

  it('returns null for empty array', () => {
    expect(getLatestDunning([])).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd HubX && npx vitest run src/app/pages/contracts/__tests__/paymentUtils.test.ts 2>&1 | tail -15
```

- [ ] **Step 3: 实现工具函数**

```typescript
// src/app/pages/contracts/paymentUtils.ts
import type { Contract, PaymentStatus, DunningRecord } from './types';

const BUFFER_DAYS = 7;

/** 计算收到的总金额 */
export function getReceivedAmount(c: Contract): number {
  return (c.collectionRecords ?? []).reduce((sum, r) => sum + r.amount, 0);
}

/** 获取下一个未全额支付的付款节点 */
function getNextPendingPlan(c: Contract, now: Date) {
  const plans = c.current.paymentPlans ?? [];
  const received = getReceivedAmount(c);
  let accumulated = 0;
  for (const plan of plans) {
    accumulated += plan.amount;
    if (received < accumulated) {
      return plan;
    }
  }
  return null;
}

/** 计算合同的回款状态 */
export function computePaymentStatus(c: Contract, now: Date = new Date()): PaymentStatus {
  const hasActiveBlocker = (c.paymentBlockers ?? []).some(b => !b.resolvedAt);
  if (hasActiveBlocker) return 'blocked';

  const total = c.current.totalAmount;
  const received = getReceivedAmount(c);
  if (received >= total) return 'settled';

  const plans = c.current.paymentPlans ?? [];
  const bufferMs = BUFFER_DAYS * 24 * 60 * 60 * 1000;

  for (const plan of plans) {
    const expected = new Date(plan.expectedDate);
    const deadline = new Date(expected.getTime() + bufferMs);
    // 计算该节点的已回金额
    let accBefore = 0;
    let accAfter = 0;
    for (const p of plans) {
      if (p.period < plan.period) accBefore += p.amount;
      if (p.period <= plan.period) accAfter += p.amount;
    }
    const planReceived = Math.max(0, received - accBefore);
    const planDue = accAfter - accBefore;

    if (now > deadline && planReceived < planDue) {
      return 'overdue';
    }
  }

  const nextPlan = getNextPendingPlan(c, now);
  if (nextPlan) {
    const expected = new Date(nextPlan.expectedDate);
    const diffMs = expected.getTime() - now.getTime();
    const diffDays = diffMs / (24 * 60 * 60 * 1000);
    if (diffDays <= BUFFER_DAYS && diffDays >= 0) {
      return 'upcoming';
    }
  }

  return 'normal';
}

/** 摘要指标 */
export interface KanbanSummary {
  totalContracts: number;
  totalReceivable: number;
  monthlyCollected: number;
  overdueAmount: number;
  blockedCount: number;
  blockedAmount: number;
  upcomingMonthEstimate: number;
}

export function computeKanbanSummary(contracts: Contract[], now: Date = new Date()): KanbanSummary {
  const year = now.getFullYear();
  const month = now.getMonth();
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  let totalReceivable = 0;
  let monthlyCollected = 0;
  let overdueAmount = 0;
  let blockedCount = 0;
  let blockedAmount = 0;
  let upcomingMonthEstimate = 0;

  for (const c of contracts) {
    if (c.status === 'voided') continue;
    totalReceivable += c.current.totalAmount;

    // 本月已回款
    for (const r of (c.collectionRecords ?? [])) {
      const d = new Date(r.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        monthlyCollected += r.amount;
      }
    }

    // 卡点
    const activeBlockers = (c.paymentBlockers ?? []).filter(b => !b.resolvedAt);
    if (activeBlockers.length > 0) {
      blockedCount++;
      blockedAmount += activeBlockers.reduce((s, b) => s + b.amountBlocked, 0);
    }

    // 预计本月回款（下个月付款节点）
    for (const plan of (c.current.paymentPlans ?? [])) {
      const d = new Date(plan.expectedDate);
      if (d.getFullYear() === nextYear && d.getMonth() === nextMonth) {
        upcomingMonthEstimate += plan.amount;
      }
    }
  }

  // 逾期金额
  for (const c of contracts) {
    if (c.status === 'voided') continue;
    const received = getReceivedAmount(c);
    for (const plan of (c.current.paymentPlans ?? [])) {
      const deadline = new Date(new Date(plan.expectedDate).getTime() + BUFFER_DAYS * 86400000);
      if (now > deadline) {
        let accBefore = 0;
        for (const p of (c.current.paymentPlans ?? [])) {
          if (p.period < plan.period) accBefore += p.amount;
          if (p.period === plan.period) {
            const planDue = p.amount;
            const planReceived = Math.max(0, received - accBefore - (p.period > 1 ? (c.current.paymentPlans ?? [])
              .filter(pp => pp.period < p.period).reduce((s, pp) => s + pp.amount, 0) : 0));
            // 简化：该节点应收回款 = plan.amount，实收 = max(0, received - accBefore)
            const planRcvd = Math.min(plan.amount, Math.max(0, received - accBefore));
            if (planRcvd < plan.amount) {
              overdueAmount += (plan.amount - planRcvd);
            }
          }
        }
      }
    }
  }

  return {
    totalContracts: contracts.filter(c => c.status !== 'voided').length,
    totalReceivable,
    monthlyCollected,
    overdueAmount,
    blockedCount,
    blockedAmount,
    upcomingMonthEstimate,
  };
}

/** 获取最近一条催款记录 */
export function getLatestDunning(records: DunningRecord[]): DunningRecord | null {
  if (!records || records.length === 0) return null;
  return records.reduce((latest, r) =>
    new Date(r.date) > new Date(latest.date) ? r : latest
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd HubX && npx vitest run src/app/pages/contracts/__tests__/paymentUtils.test.ts 2>&1 | tail -15
```

- [ ] **Step 5: Commit**

```bash
git add src/app/pages/contracts/paymentUtils.ts src/app/pages/contracts/__tests__/paymentUtils.test.ts
git commit -m "feat: add payment status computation and kanban summary utilities"
```

---

### Task 4: 扩展 ContractsContext

**Files:**
- Modify: `src/app/pages/contracts/ContractsContext.tsx`

- [ ] **Step 1: 在 ContractsContextValue 接口中添加新方法**

```typescript
interface ContractsContextValue {
  // ... 现有方法保持不变

  // 回款操作
  addCollection: (contractId: string, record: Omit<CollectionRecord, 'id' | 'contractId'>) => void;
  addBlocker: (contractId: string, blocker: Omit<PaymentBlocker, 'id' | 'contractId' | 'createdAt'>) => void;
  resolveBlocker: (contractId: string, blockerId: string) => void;
  addDunning: (contractId: string, record: Omit<DunningRecord, 'id' | 'contractId'>) => void;
}
```

- [ ] **Step 2: 实现新方法**

在 `ContractsProvider` 函数内部，`voidContract` 之后添加：

```typescript
const addCollection = useCallback(
  (contractId: string, record: Omit<CollectionRecord, 'id' | 'contractId'>) => {
    updateContract(contractId, (c) => {
      const newRecord: CollectionRecord = {
        ...record,
        id: `col-${Date.now()}`,
        contractId,
      };
      const records = [...(c.collectionRecords ?? []), newRecord];
      const received = records.reduce((s, r) => s + r.amount, 0);
      return { ...c, collectionRecords: records, receivedAmount: received };
    });
  },
  [updateContract],
);

const addBlocker = useCallback(
  (contractId: string, blocker: Omit<PaymentBlocker, 'id' | 'contractId' | 'createdAt'>) => {
    updateContract(contractId, (c) => {
      const newBlocker: PaymentBlocker = {
        ...blocker,
        id: `blocker-${Date.now()}`,
        contractId,
        createdAt: nowString(),
      };
      return { ...c, paymentBlockers: [...(c.paymentBlockers ?? []), newBlocker] };
    });
  },
  [updateContract],
);

const resolveBlocker = useCallback(
  (contractId: string, blockerId: string) => {
    updateContract(contractId, (c) => ({
      ...c,
      paymentBlockers: (c.paymentBlockers ?? []).map((b) =>
        b.id === blockerId ? { ...b, resolvedAt: nowString(), resolvedBy: '当前用户' } : b,
      ),
    }));
  },
  [updateContract],
);

const addDunning = useCallback(
  (contractId: string, record: Omit<DunningRecord, 'id' | 'contractId'>) => {
    updateContract(contractId, (c) => {
      const newRecord: DunningRecord = { ...record, id: `dun-${Date.now()}`, contractId };
      return { ...c, dunningRecords: [...(c.dunningRecords ?? []), newRecord] };
    });
  },
  [updateContract],
);
```

- [ ] **Step 3: 在 value useMemo 和 Provider 中暴露新方法**

在 `value` 的 `useMemo` 中添加新方法，在依赖数组中添加对应的 callback。

- [ ] **Step 4: Commit**

```bash
git add src/app/pages/contracts/ContractsContext.tsx
git commit -m "feat: add collection, blocker, and dunning operations to ContractsContext"
```

---

### Task 5: 摘要栏组件

**Files:**
- Create: `src/app/pages/contracts/components/PaymentKanbanSummaryBar.tsx`

- [ ] **Step 1: 实现摘要栏**

```typescript
// src/app/pages/contracts/components/PaymentKanbanSummaryBar.tsx
import { Card } from '@arco-design/web-react';
import type { KanbanSummary } from '../paymentUtils';

const SUMMARY_ITEMS: { key: keyof KanbanSummary; label: string; format: (v: number) => string; color: string }[] = [
  { key: 'totalContracts', label: '总合同数', format: (v) => `${v}`, color: '#3b82f6' },
  { key: 'totalReceivable', label: '总应收金额', format: (v) => `¥${(v / 10000).toFixed(1)}万`, color: '#6366f1' },
  { key: 'monthlyCollected', label: '本月已回款', format: (v) => `¥${(v / 10000).toFixed(1)}万`, color: '#10b981' },
  { key: 'overdueAmount', label: '逾期金额', format: (v) => `¥${(v / 10000).toFixed(1)}万`, color: '#ef4444' },
  { key: 'blockedCount', label: '卡点合同数', format: (v) => `${v} 个`, color: '#dc2626' },
  { key: 'blockedAmount', label: '卡点总金额', format: (v) => `¥${(v / 10000).toFixed(1)}万`, color: '#b91c1c' },
  { key: 'upcomingMonthEstimate', label: '预计本月回款', format: (v) => `¥${(v / 10000).toFixed(1)}万`, color: '#f59e0b' },
];

interface Props {
  summary: KanbanSummary;
}

export function PaymentKanbanSummaryBar({ summary }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginBottom: 16 }}>
      {SUMMARY_ITEMS.map((item) => (
        <Card
          key={item.key}
          size="small"
          style={{
            borderLeft: `3px solid ${item.color}`,
            background: '#fff',
          }}
        >
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{item.label}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>
            {item.format(summary[item.key] as number)}
          </div>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/contracts/components/PaymentKanbanSummaryBar.tsx
git commit -m "feat: add kanban summary bar with 7 metric cards"
```

---

### Task 6: 合同卡片组件

**Files:**
- Create: `src/app/pages/contracts/components/PaymentKanbanCard.tsx`

- [ ] **Step 1: 实现合同卡片**

```typescript
// src/app/pages/contracts/components/PaymentKanbanCard.tsx
import { Card, Tag, Progress } from '@arco-design/web-react';
import { IconUser } from '@arco-design/web-react/icon';
import type { Contract, PaymentStatus } from '../types';
import { computePaymentStatus, getReceivedAmount, getLatestDunning } from '../paymentUtils';
import { BLOCKER_TYPE_LABELS } from '../types';

const STATUS_COLORS: Record<PaymentStatus, string> = {
  normal: '#3b82f6',
  upcoming: '#f59e0b',
  overdue: '#ef4444',
  blocked: '#dc2626',
  settled: '#10b981',
};

const STATUS_BORDER_COLORS: Record<PaymentStatus, string> = {
  normal: '#3b82f6',
  upcoming: '#f59e0b',
  overdue: '#ef4444',
  blocked: '#dc2626',
  settled: '#10b981',
};

interface Props {
  contract: Contract;
  onClick: (contract: Contract) => void;
}

export function PaymentKanbanCard({ contract, onClick }: Props) {
  const status = computePaymentStatus(contract);
  const total = contract.current.totalAmount;
  const received = getReceivedAmount(contract);
  const pct = total > 0 ? Math.round((received / total) * 100) : 0;
  const latestDunning = getLatestDunning(contract.dunningRecords ?? []);
  const activeBlockers = (contract.paymentBlockers ?? []).filter(b => !b.resolvedAt);

  // 下一个待付款节点
  const pendingPlan = contract.current.paymentPlans?.find((plan, i) => {
    let acc = 0;
    for (let j = 0; j <= i; j++) acc += (contract.current.paymentPlans?.[j]?.amount ?? 0);
    return received < acc;
  });

  return (
    <Card
      size="small"
      hoverable
      onClick={() => onClick(contract)}
      style={{
        marginBottom: 12,
        borderLeft: `3px solid ${STATUS_BORDER_COLORS[status]}`,
        cursor: 'pointer',
      }}
    >
      {/* 标题 */}
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
        {contract.contractNo}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
        {contract.current.customerName}
      </div>

      {/* 进度条 */}
      <div style={{ marginBottom: 8 }}>
        <Progress
          percent={pct}
          color={STATUS_COLORS[status]}
          size="small"
          showText={false}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
          <span style={{ color: STATUS_COLORS[status], fontWeight: 600 }}>
            ¥{(received / 10000).toFixed(1)}万 / ¥{(total / 10000).toFixed(1)}万
          </span>
          <span style={{ color: '#94a3b8' }}>{pct}%</span>
        </div>
      </div>

      {/* 下期付款 */}
      {pendingPlan && status !== 'settled' && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
          下期：¥{(pendingPlan.amount / 10000).toFixed(1)}万  {pendingPlan.expectedDate}
        </div>
      )}

      {/* 卡点标签 */}
      {activeBlockers.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          {activeBlockers.map(b => (
            <Tag key={b.id} color="red" style={{ fontSize: 10, marginBottom: 2 }}>
              {BLOCKER_TYPE_LABELS[b.type]}
            </Tag>
          ))}
        </div>
      )}

      {/* 最近催款 */}
      {latestDunning && (
        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
          上次催款：{latestDunning.date}  {latestDunning.method}
        </div>
      )}

      {/* 负责人 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
        <IconUser style={{ fontSize: 12 }} />
        {contract.createdBy}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/contracts/components/PaymentKanbanCard.tsx
git commit -m "feat: add kanban contract card with progress bar and blocker tags"
```

---

### Task 7: Kanban Board（五列容器 + 拖拽）

**Files:**
- Create: `src/app/pages/contracts/components/PaymentKanbanBoard.tsx`

- [ ] **Step 1: 实现 Board 组件**

```typescript
// src/app/pages/contracts/components/PaymentKanbanBoard.tsx
import { useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { Contract, PaymentStatus } from '../types';
import { computePaymentStatus } from '../paymentUtils';
import { PaymentKanbanCard } from './PaymentKanbanCard';

const COLUMNS: { status: PaymentStatus; label: string; color: string; bg: string }[] = [
  { status: 'normal', label: '正常回款', color: '#3b82f6', bg: '#eff6ff' },
  { status: 'upcoming', label: '即将到期', color: '#f59e0b', bg: '#fffbeb' },
  { status: 'overdue', label: '已逾期', color: '#ef4444', bg: '#fef2f2' },
  { status: 'blocked', label: '卡点阻塞', color: '#dc2626', bg: '#fef2f2' },
  { status: 'settled', label: '已结清', color: '#10b981', bg: '#f0fdf4' },
];

interface Props {
  contracts: Contract[];
  onCardClick: (contract: Contract) => void;
  onCardDrop: (contractId: string, newStatus: PaymentStatus) => void;
}

function DraggableCard({ contract, onClick }: { contract: Contract; onClick: (c: Contract) => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'CONTRACT_CARD',
    item: { id: contract.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <PaymentKanbanCard contract={contract} onClick={onClick} />
    </div>
  );
}

function KanbanColumn({
  status,
  label,
  color,
  bg,
  contracts,
  onCardClick,
  onDrop,
}: {
  status: PaymentStatus;
  label: string;
  color: string;
  bg: string;
  contracts: Contract[];
  onCardClick: (c: Contract) => void;
  onDrop: (contractId: string) => void;
}) {
  const [, drop] = useDrop(() => ({
    accept: 'CONTRACT_CARD',
    drop: (item: { id: string }) => onDrop(item.id),
  }));

  return (
    <div
      ref={drop}
      style={{
        flex: 1,
        minWidth: 220,
        maxWidth: 300,
        background: bg,
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: 13,
          color,
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: `2px solid ${color}`,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{label}</span>
        <span style={{ background: color, color: '#fff', borderRadius: 10, padding: '0 8px', fontSize: 11 }}>
          {contracts.length}
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {contracts.map((c) => (
          <DraggableCard key={c.id} contract={c} onClick={onCardClick} />
        ))}
        {contracts.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 24 }}>
            拖拽合同到此列
          </div>
        )}
      </div>
    </div>
  );
}

export function PaymentKanbanBoard({ contracts, onCardClick, onCardDrop }: Props) {
  const grouped = useMemo(() => {
    const map: Record<PaymentStatus, Contract[]> = {
      normal: [],
      upcoming: [],
      overdue: [],
      blocked: [],
      settled: [],
    };
    contracts.forEach((c) => {
      if (c.status === 'voided') return;
      const status = computePaymentStatus(c);
      map[status].push(c);
    });
    return map;
  }, [contracts]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display: 'flex', gap: 12, overflow: 'auto', paddingBottom: 16 }}>
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            color={col.color}
            bg={col.bg}
            contracts={grouped[col.status]}
            onCardClick={onCardClick}
            onDrop={(contractId) => onCardDrop(contractId, col.status)}
          />
        ))}
      </div>
    </DndProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/contracts/components/PaymentKanbanBoard.tsx
git commit -m "feat: add kanban board with 5 columns and drag-and-drop"
```

---

### Task 8: 回款时间线组件

**Files:**
- Create: `src/app/pages/contracts/components/PaymentTimeline.tsx`

- [ ] **Step 1: 实现时间线**

```typescript
// src/app/pages/contracts/components/PaymentTimeline.tsx
import { Timeline } from '@arco-design/web-react';
import { IconCheckCircleFill, IconExclamationCircleFill, IconClockCircle } from '@arco-design/web-react/icon';
import type { Contract } from '../types';
import { getReceivedAmount } from '../paymentUtils';
import { BLOCKER_TYPE_LABELS } from '../types';

const TimelineItem = Timeline.Item;

interface Props {
  contract: Contract;
}

export function PaymentTimeline({ contract }: Props) {
  const received = getReceivedAmount(contract);
  const plans = contract.current.paymentPlans ?? [];
  const collections = contract.collectionRecords ?? [];
  const blockers = contract.paymentBlockers ?? [];

  let accumulatedPlan = 0;

  return (
    <Timeline>
      {/* 签约 */}
      <TimelineItem
        dot={<IconCheckCircleFill style={{ color: '#3b82f6' }} />}
        label={contract.current.signDate}
      >
        签约 · ¥{(contract.current.totalAmount / 10000).toFixed(1)}万
      </TimelineItem>

      {/* 付款节点 */}
      {plans.map((plan) => {
        accumulatedPlan += plan.amount;
        const planCols = collections.filter((col) => {
          // 按日期分配——在实际项目中会精确匹配，这里按日期范围简化
          const colDate = new Date(col.date);
          const planDate = new Date(plan.expectedDate);
          return colDate <= planDate;
        });
        const planReceived = planCols.reduce((s, c) => s + c.amount, 0);
        const isPaid = planReceived >= plan.amount;
        const isOverdue = !isPaid && new Date() > new Date(new Date(plan.expectedDate).getTime() + 7 * 86400000);
        const relatedBlockers = blockers.filter(b => !b.resolvedAt);

        return (
          <TimelineItem
            key={plan.period}
            dot={
              isPaid ? (
                <IconCheckCircleFill style={{ color: '#10b981' }} />
              ) : isOverdue ? (
                <IconExclamationCircleFill style={{ color: '#ef4444' }} />
              ) : (
                <IconClockCircle style={{ color: '#f59e0b' }} />
              )
            }
            label={plan.expectedDate}
          >
            {plan.period === 1 ? '一期' : plan.period === 2 ? '二期' : plan.period === 3 ? '三期' : `${plan.period}期`}
            付款 ¥{(plan.amount / 10000).toFixed(1)}万（{plan.percentage}%）
            {isPaid && planCols.length > 0 && (
              <div style={{ color: '#10b981', fontSize: 11 }}>
                ✅ 实际到账 ¥{(planReceived / 10000).toFixed(0)}万
              </div>
            )}
            {isOverdue && (
              <div style={{ color: '#ef4444', fontSize: 11 }}>
                ⚠️ 逾期 {Math.floor((Date.now() - new Date(plan.expectedDate).getTime()) / 86400000)} 天
              </div>
            )}
            {relatedBlockers.map(b => (
              <div key={b.id} style={{ color: '#dc2626', fontSize: 10, marginTop: 2 }}>
                🔴 {BLOCKER_TYPE_LABELS[b.type]}：{b.title}
              </div>
            ))}
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/contracts/components/PaymentTimeline.tsx
git commit -m "feat: add payment timeline with milestone status visualization"
```

---

### Task 9: 合同文本查看器组件

**Files:**
- Create: `src/app/pages/contracts/components/ContractTextViewer.tsx`

- [ ] **Step 1: 实现合同文本查看器**

```typescript
// src/app/pages/contracts/components/ContractTextViewer.tsx
import type { Contract } from '../types';
import { renderTemplate } from '../templates';

interface Props {
  contract: Contract;
}

export function ContractTextViewer({ contract }: Props) {
  const html = (() => {
    try {
      return renderTemplate(contract.current.templateId, contract.current);
    } catch {
      return `<p style="color:#94a3b8">合同模板渲染失败</p>`;
    }
  })();

  return (
    <div
      style={{
        background: '#fff',
        padding: 16,
        borderRadius: 8,
        maxHeight: 'calc(100vh - 300px)',
        overflow: 'auto',
        fontSize: 13,
        lineHeight: 1.8,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/contracts/components/ContractTextViewer.tsx
git commit -m "feat: add contract text viewer reusing template renderer"
```

---

### Task 10: 卡点与催款管理面板

**Files:**
- Create: `src/app/pages/contracts/components/BlockerDunningPanel.tsx`

- [ ] **Step 1: 实现卡点/催款面板**

```typescript
// src/app/pages/contracts/components/BlockerDunningPanel.tsx
import { useState } from 'react';
import { Button, Select, Input, Modal, Form, Timeline, Tag, Message } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { useContracts } from '../ContractsContext';
import type { Contract, BlockerType } from '../types';
import { BLOCKER_TYPE_LABELS } from '../types';

const FormItem = Form.Item;
const TimelineItem = Timeline.Item;

interface Props {
  contract: Contract;
}

export function BlockerDunningPanel({ contract }: Props) {
  const { addBlocker, resolveBlocker, addDunning } = useContracts();
  const [blockerVisible, setBlockerVisible] = useState(false);
  const [dunningVisible, setDunningVisible] = useState(false);
  const [blockerForm] = Form.useForm();
  const [dunningForm] = Form.useForm();

  const activeBlockers = (contract.paymentBlockers ?? []).filter(b => !b.resolvedAt);
  const resolvedBlockers = (contract.paymentBlockers ?? []).filter(b => b.resolvedAt);
  const dunningRecords = contract.dunningRecords ?? [];

  const handleAddBlocker = () => {
    blockerForm.validate().then((values: Record<string, unknown>) => {
      addBlocker(contract.id, {
        type: values.type as BlockerType,
        title: values.title as string,
        description: values.description as string,
        amountBlocked: Number(values.amountBlocked) || 0,
      });
      setBlockerVisible(false);
      blockerForm.resetFields();
      Message.success('卡点已添加');
    });
  };

  const handleAddDunning = () => {
    dunningForm.validate().then((values: Record<string, unknown>) => {
      addDunning(contract.id, {
        date: values.date as string,
        method: values.method as string,
        contactPerson: values.contactPerson as string,
        result: values.result as string,
        nextPlan: values.nextPlan as string,
      });
      setDunningVisible(false);
      dunningForm.resetFields();
      Message.success('催款记录已添加');
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 卡点管理 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>卡点管理</span>
          <Button size="mini" type="primary" icon={<IconPlus />} onClick={() => setBlockerVisible(true)}>
            添加卡点
          </Button>
        </div>
        {activeBlockers.map(b => (
          <div key={b.id} style={{ background: '#fef2f2', borderRadius: 6, padding: 8, marginBottom: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Tag color="red" size="small">{BLOCKER_TYPE_LABELS[b.type]}</Tag>
                <span style={{ fontWeight: 600, marginLeft: 4 }}>{b.title}</span>
              </div>
              <Button
                size="mini"
                type="outline"
                status="success"
                onClick={() => {
                  resolveBlocker(contract.id, b.id);
                  Message.success('卡点已解决');
                }}
              >
                解决
              </Button>
            </div>
            <div style={{ color: '#94a3b8', marginTop: 4 }}>卡住金额：¥{(b.amountBlocked / 10000).toFixed(1)}万</div>
          </div>
        ))}
        {activeBlockers.length === 0 && resolvedBlockers.length === 0 && (
          <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 16 }}>暂无卡点</div>
        )}
        {resolvedBlockers.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
            已解决 {resolvedBlockers.length} 个卡点
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #e5e7eb' }} />

      {/* 催款记录 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>催款记录</span>
          <Button size="mini" type="primary" icon={<IconPlus />} onClick={() => setDunningVisible(true)}>
            添加催款
          </Button>
        </div>
        {dunningRecords.length > 0 ? (
          <Timeline>
            {dunningRecords.map(d => (
              <TimelineItem key={d.id} label={d.date}>
                <div style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{d.method}</span> · 联系人：{d.contactPerson}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>结果：{d.result}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>下一步：{d.nextPlan}</div>
              </TimelineItem>
            ))}
          </Timeline>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 16 }}>暂无催款记录</div>
        )}
      </div>

      {/* 添加卡点 Modal */}
      <Modal
        title="添加卡点"
        visible={blockerVisible}
        onCancel={() => setBlockerVisible(false)}
        onOk={handleAddBlocker}
      >
        <Form form={blockerForm} layout="vertical">
          <FormItem label="卡点类型" field="type" rules={[{ required: true, message: '请选择' }]}>
            <Select placeholder="请选择">
              {Object.entries(BLOCKER_TYPE_LABELS).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v}</Select.Option>
              ))}
            </Select>
          </FormItem>
          <FormItem label="标题" field="title" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="如：客户验收迟迟不签字" />
          </FormItem>
          <FormItem label="描述" field="description">
            <Input.TextArea placeholder="卡点详细描述" />
          </FormItem>
          <FormItem label="卡住金额（元）" field="amountBlocked">
            <Input type="number" placeholder="0" />
          </FormItem>
        </Form>
      </Modal>

      {/* 添加催款 Modal */}
      <Modal
        title="添加催款记录"
        visible={dunningVisible}
        onCancel={() => setDunningVisible(false)}
        onOk={handleAddDunning}
      >
        <Form form={dunningForm} layout="vertical">
          <FormItem label="日期" field="date" rules={[{ required: true }]}>
            <Input placeholder="2026-07-01" />
          </FormItem>
          <FormItem label="方式" field="method" rules={[{ required: true }]}>
            <Select placeholder="请选择">
              <Select.Option value="电话">电话</Select.Option>
              <Select.Option value="微信">微信</Select.Option>
              <Select.Option value="邮件">邮件</Select.Option>
              <Select.Option value="当面">当面</Select.Option>
            </Select>
          </FormItem>
          <FormItem label="联系人" field="contactPerson" rules={[{ required: true }]}>
            <Input placeholder="对方联系人" />
          </FormItem>
          <FormItem label="结果" field="result">
            <Input.TextArea placeholder="催款结果" />
          </FormItem>
          <FormItem label="下一步计划" field="nextPlan">
            <Input placeholder="下一步计划" />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/contracts/components/BlockerDunningPanel.tsx
git commit -m "feat: add blocker management and dunning record panel"
```

---

### Task 11: 侧边抽屉组件

**Files:**
- Create: `src/app/pages/contracts/components/PaymentKanbanSideDrawer.tsx`

- [ ] **Step 1: 实现侧边抽屉**

```typescript
// src/app/pages/contracts/components/PaymentKanbanSideDrawer.tsx
import { useState } from 'react';
import { Drawer, Tabs } from '@arco-design/web-react';
import type { Contract } from '../types';
import { PaymentTimeline } from './PaymentTimeline';
import { ContractTextViewer } from './ContractTextViewer';
import { BlockerDunningPanel } from './BlockerDunningPanel';

const TabPane = Tabs.TabPane;

interface Props {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
}

export function PaymentKanbanSideDrawer({ visible, contract, onClose }: Props) {
  const [activeTab, setActiveTab] = useState('timeline');

  if (!contract) return null;

  return (
    <Drawer
      title={`${contract.contractNo} · ${contract.current.customerName}`}
      visible={visible}
      onCancel={onClose}
      width={480}
      footer={null}
    >
      <Tabs activeTab={activeTab} onChange={setActiveTab}>
        <TabPane key="timeline" title="回款时间线">
          <PaymentTimeline contract={contract} />
        </TabPane>
        <TabPane key="contract" title="合同文本">
          <ContractTextViewer contract={contract} />
        </TabPane>
        <TabPane key="blockers" title="卡点 / 催款">
          <BlockerDunningPanel contract={contract} />
        </TabPane>
      </Tabs>
    </Drawer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/contracts/components/PaymentKanbanSideDrawer.tsx
git commit -m "feat: add side drawer with payment timeline, contract text, and blocker tabs"
```

---

### Task 12: 页面主组件

**Files:**
- Create: `src/app/pages/contracts/PaymentKanban.tsx`

- [ ] **Step 1: 实现 PaymentKanban 页面**

```typescript
// src/app/pages/contracts/PaymentKanban.tsx
import { useState, useMemo } from 'react';
import { useContracts } from './ContractsContext';
import { PaymentKanbanSummaryBar } from './components/PaymentKanbanSummaryBar';
import { PaymentKanbanBoard } from './components/PaymentKanbanBoard';
import { PaymentKanbanSideDrawer } from './components/PaymentKanbanSideDrawer';
import { computeKanbanSummary, computePaymentStatus } from './paymentUtils';
import type { Contract, PaymentStatus } from './types';

export default function PaymentKanban() {
  const { contracts } = useContracts();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const kanbanContracts = useMemo(
    () => contracts.filter(c => c.status !== 'voided' && c.status !== 'draft'),
    [contracts],
  );

  const summary = useMemo(() => computeKanbanSummary(kanbanContracts), [kanbanContracts]);

  const handleCardClick = (contract: Contract) => {
    setSelectedContract(contract);
    setDrawerVisible(true);
  };

  const handleCardDrop = (contractId: string, newStatus: PaymentStatus) => {
    // 拖拽到不同列的处理——在实际版本中可能触发状态变更逻辑
    console.log(`Contract ${contractId} dropped to ${newStatus}`);
  };

  return (
    <div style={{ padding: 0 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>合同回款看板</h2>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
          拖拽合同卡片切换回款状态，点击卡片查看回款详情
        </p>
      </div>

      <PaymentKanbanSummaryBar summary={summary} />

      <PaymentKanbanBoard
        contracts={kanbanContracts}
        onCardClick={handleCardClick}
        onCardDrop={handleCardDrop}
      />

      <PaymentKanbanSideDrawer
        visible={drawerVisible}
        contract={selectedContract}
        onClose={() => setDrawerVisible(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pages/contracts/PaymentKanban.tsx
git commit -m "feat: add PaymentKanban page with summary, board, and side drawer"
```

---

### Task 13: 添加路由

**Files:**
- Modify: `src/app/routes.tsx`

- [ ] **Step 1: 导入并添加路由**

```typescript
// 在 import 区域添加：
import PaymentKanban from './pages/contracts/PaymentKanban';

// 在 children 数组中，contracts 路由组后面添加：
{ path: "contracts/payments", Component: PaymentKanban },
```

- [ ] **Step 2: Commit**

```bash
git add src/app/routes.tsx
git commit -m "feat: add /contracts/payments route"
```

---

### Task 14: 添加导航菜单项

**Files:**
- Modify: `src/app/components/MainLayout.tsx`

- [ ] **Step 1: 在合同管理菜单下添加子项**

在 `menuItems` 中，合同管理项的 children 数组中添加：

```typescript
{ key: '/contracts/payments', label: '回款看板' },
```

- [ ] **Step 2: 更新 getOpenKeys**

在 `getOpenKeys` 函数中添加：

```typescript
if (path.startsWith('/contracts/')) {
  return ['contracts'];
}
```

（如果还不存在此判断）

- [ ] **Step 3: Commit**

```bash
git add src/app/components/MainLayout.tsx
git commit -m "feat: add payment kanban nav item under contracts menu"
```

---

### Task 15: 整合测试

**Files:**
- Run: 全量构建验证

- [ ] **Step 1: 构建验证**

```bash
cd HubX && npx vite build 2>&1 | tail -15
```

- [ ] **Step 2: 启动 dev server 手动验证**

```bash
npm run dev
# 打开 http://localhost:5173/contracts/payments
```

验证清单：
- [ ] 摘要栏 7 个指标正确显示
- [ ] 五列 Kanban 正确归类合同
- [ ] 合同卡片显示所有 10 项信息
- [ ] 点击卡片打开侧边抽屉
- [ ] 回款时间线展示付款节点状态
- [ ] 合同文本 Tab 正确渲染
- [ ] 卡点管理可添加/解决
- [ ] 催款记录可添加
- [ ] 拖拽切换列

---

## 实施顺序

```
Task 1 (类型) → Task 2 (mock) → Task 3 (工具函数+TDD) → Task 4 (Context)
                                                    ↓
Task 5 (摘要栏) ← Task 6 (卡片) ← Task 7 (看板) ← Task 8 (时间线) ← Task 9 (文本) ← Task 10 (面板)
                                                                                    ↓
                                                                          Task 11 (抽屉)
                                                                                    ↓
                                                          Task 12 (页面) → Task 13 (路由) → Task 14 (导航)
                                                                                    ↓
                                                                          Task 15 (集成测试)
```

依赖关系：Task 1-4 是基础层，Task 5-11 是组件层（内部有依赖但可以灵活调整），Task 12-14 是集成层。
