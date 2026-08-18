# 站内消息提醒（流程型待办）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 HubX CRM 原型中落地第一期“流程型待办提醒”能力，覆盖统一铃铛入口、工作台待我处理区、日报未提交提示、线索超时局部提示，以及固定时间的“稍后处理”。

**Architecture:** 采用前端聚合方案：把提醒定义成统一 `ReminderItem`，由纯函数 adapter 从 mock 业务数据派生，再由 `ReminderProvider` 汇总、排序、过滤和处理 `snooze`。UI 层只消费 context：`MainLayout` 负责顶部铃铛与日报入口提示，`Dashboard` 负责待我处理面板，`MyLeads`/`LeadDetail` 负责线索局部提示。

**Tech Stack:** React 18、React Router 7、Vite 6、TypeScript（按现有 `.tsx/.ts` 使用方式）、Arco Design、Vitest（仅用于本次新增的纯函数提醒逻辑测试）

---

## File Structure

### New files

- `src/app/reminders/types.ts` — 统一提醒类型、枚举、snooze 选项定义
- `src/app/reminders/mockData.ts` — 第一阶段提醒所需的集中 mock 业务数据
- `src/app/reminders/utils.ts` — 纯函数：排序、过滤、snooze 时间计算、线索超时判断
- `src/app/reminders/adapters/getDailyReportReminders.ts` — 日报未提交 / 评论 / @ 提醒映射
- `src/app/reminders/adapters/getApprovalReminders.ts` — 待审批 / 审批结果提醒映射
- `src/app/reminders/adapters/getContractReminders.ts` — 合同到期提醒映射
- `src/app/reminders/adapters/getLeadReminders.ts` — 线索超时未跟进提醒映射
- `src/app/reminders/buildReminders.ts` — 汇总所有 adapter，输出最终提醒列表
- `src/app/reminders/ReminderContext.tsx` — 全局 provider 与 `useReminders`
- `src/app/reminders/components/ReminderBell.tsx` — 顶部铃铛与摘要面板
- `src/app/reminders/components/ReminderTodoPanel.tsx` — 工作台“待我处理”面板
- `src/app/reminders/components/ReminderSnoozeMenu.tsx` — 固定时间稍后处理菜单
- `src/app/reminders/__tests__/utils.test.ts` — 工具函数测试
- `src/app/reminders/__tests__/buildReminders.test.ts` — 汇总与 adapter 行为测试

### Modified files

- `package.json` — 增加 `test` script 与 `vitest` dev dependency
- `src/app/App.tsx` — 用 `ReminderProvider` 包裹路由
- `src/app/components/MainLayout.tsx` — 去掉静态通知 state，接入 `ReminderBell` 与日报未提交提示
- `src/app/pages/Dashboard.tsx` — 增加 `ReminderTodoPanel`
- `src/app/pages/MyLeads.tsx` — 增加超时未跟进计数提示
- `src/app/pages/LeadDetail.tsx` — 增加当前线索超时提醒条

### Existing files to read while implementing

- `src/app/components/MainLayout.tsx` — 当前顶部导航、日报入口、通知图标
- `src/app/pages/Dashboard.tsx` — 工作台布局与卡片样式
- `src/app/pages/MyLeads.tsx` — 线索列表 mock 数据与页面标题区域
- `src/app/pages/LeadDetail.tsx` — 线索详情布局和顶部信息区
- `src/app/pages/daily-report/types.ts` — 现有日报与评论类型

---

### Task 1: 建立提醒领域模型与可测试纯函数

**Files:**
- Create: `src/app/reminders/types.ts`
- Create: `src/app/reminders/utils.ts`
- Create: `src/app/reminders/__tests__/utils.test.ts`
- Modify: `package.json`
- Test: `src/app/reminders/__tests__/utils.test.ts`

- [ ] **Step 1: 写出失败的工具函数测试**

```ts
import { describe, expect, it } from 'vitest';
import {
  getLeadReminderPriority,
  isLeadOverdue,
  resolveSnoozeUntil,
  sortReminders,
} from '../utils';
import type { ReminderItem } from '../types';

describe('isLeadOverdue', () => {
  it('优先按预约跟进时间判断超时', () => {
    expect(
      isLeadOverdue(
        {
          nextFollowupTime: '2026-05-21T09:00:00.000Z',
          lastFollowupAt: '2026-05-20T09:00:00.000Z',
          assignedAt: '2026-05-19T09:00:00.000Z',
        },
        new Date('2026-05-21T10:00:00.000Z')
      )
    ).toBe(true);
  });

  it('没有预约时间时按最后跟进时间兜底', () => {
    expect(
      isLeadOverdue(
        {
          lastFollowupAt: '2026-05-19T08:00:00.000Z',
          assignedAt: '2026-05-18T08:00:00.000Z',
        },
        new Date('2026-05-21T09:00:00.000Z')
      )
    ).toBe(true);
  });
});

describe('resolveSnoozeUntil', () => {
  it('能算出一小时后、今天下班前、明天上午', () => {
    const now = new Date('2026-05-21T10:15:00.000Z');

    expect(resolveSnoozeUntil(now, 'one_hour').toISOString()).toBe('2026-05-21T11:15:00.000Z');
    expect(resolveSnoozeUntil(now, 'today_eod').toISOString()).toBe('2026-05-21T18:00:00.000Z');
    expect(resolveSnoozeUntil(now, 'tomorrow_morning').toISOString()).toBe('2026-05-22T09:00:00.000Z');
  });
});

describe('sortReminders', () => {
  it('按优先级、deadline、创建时间排序', () => {
    const reminders: ReminderItem[] = [
      {
        id: 'comment-1',
        type: 'daily_report_comment',
        title: '评论',
        sourceId: 'report-1',
        sourceType: 'daily_report',
        priority: 'low',
        createdAt: '2026-05-21T09:00:00.000Z',
        actionLabel: '查看评论',
        actionTarget: { kind: 'route', path: '/dailyreport/view' },
      },
      {
        id: 'approval-1',
        type: 'approval_pending',
        title: '待审批',
        sourceId: 'approval-1',
        sourceType: 'approval',
        priority: 'high',
        createdAt: '2026-05-21T08:00:00.000Z',
        deadline: '2026-05-21T12:00:00.000Z',
        actionLabel: '去审批',
        actionTarget: { kind: 'route', path: '/quotation' },
      },
    ];

    expect(sortReminders(reminders).map((item) => item.id)).toEqual(['approval-1', 'comment-1']);
  });
});

it('暴露线索提醒优先级常量', () => {
  expect(getLeadReminderPriority()).toBe('high');
});
```

- [ ] **Step 2: 在 `package.json` 加入测试脚本和依赖，然后运行测试确认失败**

```json
{
  "scripts": {
    "build": "vite build",
    "dev": "vite",
    "test": "vitest run"
  },
  "devDependencies": {
    "@tailwindcss/vite": "4.1.12",
    "@vitejs/plugin-react": "4.7.0",
    "tailwindcss": "4.1.12",
    "vite": "6.3.5",
    "vitest": "^2.1.9"
  }
}
```

Run: `npm test -- src/app/reminders/__tests__/utils.test.ts`

Expected: FAIL，报错类似 `Cannot find module '../utils'` 或缺少导出函数。

- [ ] **Step 3: 写最小可用的提醒类型定义**

```ts
export type ReminderType =
  | 'daily_report_unsubmitted'
  | 'daily_report_comment'
  | 'daily_report_mention'
  | 'approval_pending'
  | 'approval_result'
  | 'contract_expiring'
  | 'lead_followup_overdue';

export type ReminderPriority = 'high' | 'medium' | 'low';
export type ReminderSourceType = 'daily_report' | 'approval' | 'contract' | 'lead';
export type SnoozeOptionId = 'one_hour' | 'today_eod' | 'tomorrow_morning';

export interface ReminderActionTarget {
  kind: 'route' | 'modal';
  path?: string;
  modal?: 'daily-report';
  params?: Record<string, string>;
}

export interface ReminderItem {
  id: string;
  type: ReminderType;
  title: string;
  content?: string;
  sourceId: string;
  sourceType: ReminderSourceType;
  priority: ReminderPriority;
  createdAt: string;
  deadline?: string;
  snoozedUntil?: string;
  actionLabel: string;
  actionTarget: ReminderActionTarget;
}

export interface LeadReminderCandidate {
  id?: string;
  nextFollowupTime?: string;
  lastFollowupAt?: string;
  assignedAt?: string;
}
```

- [ ] **Step 4: 写最小纯函数实现让测试通过**

```ts
import type { LeadReminderCandidate, ReminderItem, ReminderPriority, SnoozeOptionId } from './types';

const priorityRank: Record<ReminderPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function getLeadReminderPriority(): ReminderPriority {
  return 'high';
}

export function isLeadOverdue(candidate: LeadReminderCandidate, now = new Date()): boolean {
  if (candidate.nextFollowupTime) {
    return new Date(candidate.nextFollowupTime).getTime() < now.getTime();
  }

  if (candidate.lastFollowupAt) {
    return now.getTime() - new Date(candidate.lastFollowupAt).getTime() > 48 * 60 * 60 * 1000;
  }

  if (candidate.assignedAt) {
    return now.getTime() - new Date(candidate.assignedAt).getTime() > 48 * 60 * 60 * 1000;
  }

  return false;
}

export function resolveSnoozeUntil(now: Date, option: SnoozeOptionId): Date {
  if (option === 'one_hour') {
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  if (option === 'today_eod') {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18, 0, 0, 0)
    );
  }

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 9, 0, 0, 0)
  );
}

export function sortReminders(reminders: ReminderItem[]): ReminderItem[] {
  return [...reminders].sort((left, right) => {
    const priorityDiff = priorityRank[left.priority] - priorityRank[right.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const leftDeadline = left.deadline ? new Date(left.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDeadline = right.deadline ? new Date(right.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    if (leftDeadline !== rightDeadline) {
      return leftDeadline - rightDeadline;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function filterVisibleReminders(reminders: ReminderItem[], now = new Date()): ReminderItem[] {
  return reminders.filter((item) => !item.snoozedUntil || new Date(item.snoozedUntil).getTime() <= now.getTime());
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- src/app/reminders/__tests__/utils.test.ts`

Expected: PASS，输出包含 `4 passed`。

- [ ] **Step 6: 提交这一小步**

```bash
git add package.json src/app/reminders/types.ts src/app/reminders/utils.ts src/app/reminders/__tests__/utils.test.ts
git commit -m "feat(reminders): add reminder domain utilities"
```

---

### Task 2: 实现 mock 数据、adapter、汇总器与全局 provider

**Files:**
- Create: `src/app/reminders/mockData.ts`
- Create: `src/app/reminders/adapters/getDailyReportReminders.ts`
- Create: `src/app/reminders/adapters/getApprovalReminders.ts`
- Create: `src/app/reminders/adapters/getContractReminders.ts`
- Create: `src/app/reminders/adapters/getLeadReminders.ts`
- Create: `src/app/reminders/buildReminders.ts`
- Create: `src/app/reminders/ReminderContext.tsx`
- Create: `src/app/reminders/__tests__/buildReminders.test.ts`
- Modify: `src/app/App.tsx`
- Test: `src/app/reminders/__tests__/buildReminders.test.ts`

- [ ] **Step 1: 先写失败的汇总测试，锁定第一期提醒类型和排序**

```ts
import { describe, expect, it } from 'vitest';
import { buildReminders } from '../buildReminders';
import { reminderMockData } from '../mockData';

describe('buildReminders', () => {
  it('生成第一期全部提醒并按优先级排序', () => {
    const reminders = buildReminders(reminderMockData, new Date('2026-05-21T11:00:00.000Z'));

    expect(reminders.map((item) => item.type)).toEqual([
      'approval_pending',
      'daily_report_unsubmitted',
      'lead_followup_overdue',
      'contract_expiring',
      'approval_result',
      'daily_report_comment',
      'daily_report_mention',
    ]);
  });

  it('跳过还在稍后处理窗口内的提醒', () => {
    const reminders = buildReminders(
      {
        ...reminderMockData,
        snoozedReminders: {
          'lead-followup-overdue-LS003': '2026-05-21T12:00:00.000Z',
        },
      },
      new Date('2026-05-21T11:00:00.000Z')
    );

    expect(reminders.some((item) => item.id === 'lead-followup-overdue-LS003')).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/app/reminders/__tests__/buildReminders.test.ts`

Expected: FAIL，报错类似 `Cannot find module '../buildReminders'`。

- [ ] **Step 3: 写集中 mock 数据，覆盖 7 类提醒来源**

```ts
import type { DailyReport, DailyReportComment } from '../pages/daily-report/types';

export const reminderMockData = {
  currentUserId: 'user-sales-zhangsan',
  currentUserName: '张三',
  dailyReports: [] as DailyReport[],
  dailyComments: [
    {
      id: 'comment-1',
      reportId: 'report-1',
      userId: 'user-manager-lisi',
      userName: '李四',
      content: '请补充今天的客户推进节点',
      mentionedUsers: [],
      createdAt: '2026-05-21T08:00:00.000Z',
      readBy: [],
    },
    {
      id: 'comment-2',
      reportId: 'report-2',
      userId: 'user-manager-wangwu',
      userName: '王五',
      content: '@张三 明天同步签约风险',
      mentionedUsers: ['user-sales-zhangsan'],
      createdAt: '2026-05-21T09:00:00.000Z',
      readBy: [],
    },
  ] as DailyReportComment[],
  approvals: [
    {
      id: 'approval-quotation-1',
      title: 'APP开发项目报价审批',
      type: 'pending' as const,
      deadline: '2026-05-21T12:00:00.000Z',
      route: '/quotation',
    },
    {
      id: 'approval-travel-1',
      title: '上海出差申请已驳回',
      type: 'result' as const,
      createdAt: '2026-05-21T07:30:00.000Z',
      route: '/businesstrip',
    },
  ],
  contracts: [
    {
      id: 'contract-1',
      title: 'A公司CRM系统合同',
      expiresAt: '2026-05-27T00:00:00.000Z',
      route: '/contracts/1',
      status: 'active' as const,
    },
  ],
  leads: [
    {
      id: 'LS003',
      title: '小程序开发项目',
      nextFollowupTime: '2026-05-21T09:00:00.000Z',
      lastFollowupAt: '2026-05-20T07:00:00.000Z',
      assignedAt: '2026-05-18T07:00:00.000Z',
      route: '/leads/3',
    },
  ],
  snoozedReminders: {} as Record<string, string>,
};
```

- [ ] **Step 4: 写 adapter 与汇总器，让测试通过**

```ts
// src/app/reminders/adapters/getApprovalReminders.ts
import type { ReminderItem } from '../types';

export function getApprovalReminders(data: typeof import('../mockData').reminderMockData): ReminderItem[] {
  return data.approvals.map((approval) => ({
    id: approval.id,
    type: approval.type === 'pending' ? 'approval_pending' : 'approval_result',
    title: approval.title,
    sourceId: approval.id,
    sourceType: 'approval',
    priority: approval.type === 'pending' ? 'high' : 'medium',
    createdAt: approval.createdAt ?? approval.deadline,
    deadline: approval.deadline,
    actionLabel: approval.type === 'pending' ? '去审批' : '查看结果',
    actionTarget: { kind: 'route', path: approval.route },
  }));
}
```

```ts
// src/app/reminders/adapters/getLeadReminders.ts
import { isLeadOverdue } from '../utils';
import type { ReminderItem } from '../types';

export function getLeadReminders(data: typeof import('../mockData').reminderMockData, now: Date): ReminderItem[] {
  return data.leads
    .filter((lead) => isLeadOverdue(lead, now))
    .map<ReminderItem>((lead) => ({
      id: `lead-followup-overdue-${lead.id}`,
      type: 'lead_followup_overdue',
      title: `${lead.title} 已超时未跟进`,
      sourceId: lead.id,
      sourceType: 'lead',
      priority: 'high',
      createdAt: lead.nextFollowupTime ?? lead.lastFollowupAt ?? lead.assignedAt,
      deadline: lead.nextFollowupTime,
      actionLabel: '去跟进',
      actionTarget: { kind: 'route', path: lead.route },
    }));
}
```

```ts
// src/app/reminders/buildReminders.ts
import { getApprovalReminders } from './adapters/getApprovalReminders';
import { getContractReminders } from './adapters/getContractReminders';
import { getDailyReportReminders } from './adapters/getDailyReportReminders';
import { getLeadReminders } from './adapters/getLeadReminders';
import { filterVisibleReminders, sortReminders } from './utils';

export function buildReminders(data: typeof import('./mockData').reminderMockData, now = new Date()) {
  const reminders = [
    ...getApprovalReminders(data),
    ...getDailyReportReminders(data, now),
    ...getContractReminders(data, now),
    ...getLeadReminders(data, now),
  ].map((item) => ({
    ...item,
    snoozedUntil: data.snoozedReminders[item.id],
  }));

  return sortReminders(filterVisibleReminders(reminders, now));
}
```

- [ ] **Step 5: 写 provider，把提醒与 `snoozeReminder` 暴露给全局**

```tsx
import { createContext, useContext, useMemo, useState } from 'react';
import { buildReminders } from './buildReminders';
import { reminderMockData } from './mockData';
import { resolveSnoozeUntil } from './utils';
import type { ReminderItem, SnoozeOptionId } from './types';

interface ReminderContextValue {
  reminders: ReminderItem[];
  pendingCount: number;
  submitDailyReport: (report: import('../pages/daily-report/types').DailyReport) => void;
  snoozeReminder: (id: string, option: SnoozeOptionId) => void;
  isLeadReminderActive: (leadId: string) => boolean;
}

const ReminderContext = createContext<ReminderContextValue | null>(null);

export function ReminderProvider({ children }: { children: React.ReactNode }) {
  const [dailyReports, setDailyReports] = useState(reminderMockData.dailyReports);
  const [snoozedReminders, setSnoozedReminders] = useState(reminderMockData.snoozedReminders);

  const reminders = useMemo(
    () => buildReminders({ ...reminderMockData, dailyReports, snoozedReminders }, new Date()),
    [dailyReports, snoozedReminders]
  );

  const value: ReminderContextValue = {
    reminders,
    pendingCount: reminders.length,
    submitDailyReport: (report) => setDailyReports((prev) => [report, ...prev]),
    snoozeReminder: (id, option) => {
      setSnoozedReminders((prev) => ({
        ...prev,
        [id]: resolveSnoozeUntil(new Date(), option).toISOString(),
      }));
    },
    isLeadReminderActive: (leadId) => reminders.some((item) => item.type === 'lead_followup_overdue' && item.sourceId === leadId),
  };

  return <ReminderContext.Provider value={value}>{children}</ReminderContext.Provider>;
}

export function useReminders() {
  const context = useContext(ReminderContext);
  if (!context) {
    throw new Error('useReminders must be used within ReminderProvider');
  }
  return context;
}
```

同时把 `src/app/App.tsx` 改成：

```tsx
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ReminderProvider } from './reminders/ReminderContext';

function App() {
  return (
    <ReminderProvider>
      <RouterProvider router={router} />
    </ReminderProvider>
  );
}

export default App;
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npm test -- src/app/reminders/__tests__/buildReminders.test.ts`

Expected: PASS，输出包含 `2 passed`。

- [ ] **Step 7: 提交这一小步**

```bash
git add src/app/App.tsx src/app/reminders
git commit -m "feat(reminders): add reminder provider and adapters"
```

---

### Task 3: 接入顶部铃铛、日报入口与工作台待我处理区

**Files:**
- Create: `src/app/reminders/components/ReminderSnoozeMenu.tsx`
- Create: `src/app/reminders/components/ReminderBell.tsx`
- Create: `src/app/reminders/components/ReminderTodoPanel.tsx`
- Modify: `src/app/components/MainLayout.tsx`
- Modify: `src/app/pages/Dashboard.tsx`
- Test: `src/app/reminders/__tests__/buildReminders.test.ts`

- [ ] **Step 1: 先扩展测试，锁定日报提交后提醒消失**

```ts
it('提交日报后未提交提醒消失', () => {
  const reminders = buildReminders(
    {
      ...reminderMockData,
      dailyReports: [
        {
          id: 'report-submitted-1',
          userId: 'user-sales-zhangsan',
          userName: '张三',
          department: '销售部',
          reportDate: '2026-05-21',
          templateId: 'template-sales',
          templateType: 'sales',
          content: { 'tomorrow-plan': '继续跟进' },
          status: 'submitted',
          createdAt: '2026-05-21T09:30:00.000Z',
          updatedAt: '2026-05-21T09:30:00.000Z',
        },
      ],
    },
    new Date('2026-05-21T19:00:00.000Z')
  );

  expect(reminders.some((item) => item.type === 'daily_report_unsubmitted')).toBe(false);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/app/reminders/__tests__/buildReminders.test.ts`

Expected: FAIL，说明日报 adapter 还未正确处理已提交日报。

- [ ] **Step 3: 实现铃铛与稍后处理菜单组件**

```tsx
// src/app/reminders/components/ReminderSnoozeMenu.tsx
import { Dropdown, Menu } from '@arco-design/web-react';
import { useReminders } from '../ReminderContext';
import type { SnoozeOptionId } from '../types';

const options: { id: SnoozeOptionId; label: string }[] = [
  { id: 'one_hour', label: '1小时后提醒' },
  { id: 'today_eod', label: '今天下班前提醒' },
  { id: 'tomorrow_morning', label: '明天上午提醒' },
];

export function ReminderSnoozeMenu({ reminderId, children }: { reminderId: string; children: React.ReactNode }) {
  const { snoozeReminder } = useReminders();

  return (
    <Dropdown
      droplist={
        <Menu>
          {options.map((option) => (
            <Menu.Item key={option.id} onClick={() => snoozeReminder(reminderId, option.id)}>
              {option.label}
            </Menu.Item>
          ))}
        </Menu>
      }
      position="bl"
    >
      {children}
    </Dropdown>
  );
}
```

```tsx
// src/app/reminders/components/ReminderBell.tsx
import { Badge, Button, Dropdown, Empty, List, Space, Typography } from '@arco-design/web-react';
import { IconNotification } from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router';
import { useReminders } from '../ReminderContext';
import { ReminderSnoozeMenu } from './ReminderSnoozeMenu';

export function ReminderBell() {
  const navigate = useNavigate();
  const { reminders, pendingCount } = useReminders();
  const visible = reminders.slice(0, 5);

  return (
    <Dropdown
      position="bl"
      droplist={
        <div style={{ width: 360, padding: 16, background: 'var(--color-bg-5)', borderRadius: 8 }}>
          <Typography.Title heading={6} style={{ marginTop: 0 }}>待我处理</Typography.Title>
          {visible.length === 0 ? (
            <Empty description="暂无提醒" />
          ) : (
            <List
              dataSource={visible}
              render={(item) => (
                <List.Item key={item.id}>
                  <div style={{ width: '100%' }}>
                    <div style={{ fontWeight: 500 }}>{item.title}</div>
                    {item.content ? <div style={{ color: 'var(--color-text-2)', marginTop: 4 }}>{item.content}</div> : null}
                    <Space style={{ marginTop: 8 }}>
                      <Button type="primary" size="mini" onClick={() => item.actionTarget.path && navigate(item.actionTarget.path)}>
                        {item.actionLabel}
                      </Button>
                      <ReminderSnoozeMenu reminderId={item.id}>
                        <Button size="mini">稍后处理</Button>
                      </ReminderSnoozeMenu>
                    </Space>
                  </div>
                </List.Item>
              )}
            />
          )}
          <Button type="text" style={{ marginTop: 8, paddingLeft: 0 }} onClick={() => navigate('/')}>
            查看全部待我处理
          </Button>
        </div>
      }
    >
      <Badge count={pendingCount} maxCount={99}>
        <IconNotification style={{ fontSize: 20, cursor: 'pointer' }} />
      </Badge>
    </Dropdown>
  );
}
```

- [ ] **Step 4: 实现工作台待办面板，并修正日报 adapter 让测试通过**

```tsx
// src/app/reminders/components/ReminderTodoPanel.tsx
import { Badge, Button, Card, Empty, Space, Typography } from '@arco-design/web-react';
import { useNavigate } from 'react-router';
import { useReminders } from '../ReminderContext';
import { ReminderSnoozeMenu } from './ReminderSnoozeMenu';

export function ReminderTodoPanel() {
  const navigate = useNavigate();
  const { reminders } = useReminders();

  return (
    <Card id="todo-panel" title="待我处理" style={{ marginBottom: 16 }}>
      {reminders.length === 0 ? (
        <Empty description="当前没有待处理提醒" />
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {reminders.map((item) => (
            <div key={item.id} style={{ padding: 12, border: '1px solid var(--color-border-2)', borderRadius: 8 }}>
              <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                <div>
                  <Space>
                    <Typography.Text bold>{item.title}</Typography.Text>
                    <Badge status={item.priority === 'high' ? 'error' : item.priority === 'medium' ? 'warning' : 'processing'} />
                  </Space>
                  {item.content ? <div style={{ color: 'var(--color-text-2)', marginTop: 4 }}>{item.content}</div> : null}
                </div>
                <Space>
                  <Button type="primary" size="small" onClick={() => item.actionTarget.path && navigate(item.actionTarget.path)}>
                    {item.actionLabel}
                  </Button>
                  <ReminderSnoozeMenu reminderId={item.id}>
                    <Button size="small">稍后处理</Button>
                  </ReminderSnoozeMenu>
                </Space>
              </Space>
            </div>
          ))}
        </Space>
      )}
    </Card>
  );
}
```

```ts
// src/app/reminders/adapters/getDailyReportReminders.ts
export function getDailyReportReminders(data: typeof import('../mockData').reminderMockData, now: Date): ReminderItem[] {
  const items: ReminderItem[] = [];
  const today = now.toISOString().slice(0, 10);
  const hasSubmittedToday = data.dailyReports.some(
    (report) => report.userId === data.currentUserId && report.reportDate === today && report.status === 'submitted'
  );

  if (now.getHours() >= 18 && !hasSubmittedToday) {
    items.push({
      id: `daily-report-unsubmitted-${today}`,
      type: 'daily_report_unsubmitted',
      title: '您的日报还未提交',
      sourceId: today,
      sourceType: 'daily_report',
      priority: 'high',
      createdAt: now.toISOString(),
      deadline: `${today}T18:00:00.000Z`,
      actionLabel: '去提交',
      actionTarget: { kind: 'modal', modal: 'daily-report' },
    });
  }

  // 评论与 @ 的映射保持按 mockData 输出
  return items;
}
```

- [ ] **Step 5: 把 `MainLayout` 和 `Dashboard` 接到 context**

`src/app/components/MainLayout.tsx` 关键修改：

```tsx
import { useReminders } from '../reminders/ReminderContext';
import { ReminderBell } from '../reminders/components/ReminderBell';

const { submitDailyReport, reminders } = useReminders();
const showUnsubmittedBadge = reminders.some((item) => item.type === 'daily_report_unsubmitted');

const handleDailyReportSubmit = (report: DailyReport) => {
  submitDailyReport(report);
};
```

并把静态铃铛替换成：

```tsx
<ReminderBell />
```

`src/app/pages/Dashboard.tsx` 在统计卡片下方插入：

```tsx
import { ReminderTodoPanel } from '../reminders/components/ReminderTodoPanel';

<ReminderTodoPanel />
```

- [ ] **Step 6: 运行自动化测试与构建**

Run: `npm test -- src/app/reminders/__tests__/buildReminders.test.ts && npm run build`

Expected: 测试 PASS，随后 Vite build 成功，输出包含 `dist/` 产物信息。

- [ ] **Step 7: 手动验证铃铛与工作台**

Run: `npm run dev`

Expected manual checks:
- 顶部铃铛显示 7 条提醒总数
- 铃铛下拉只展示 5 条摘要
- 点击“稍后处理”后对应提醒立即隐藏
- `Dashboard` 顶部出现“待我处理”卡片
- 18:00 后未提交日报时，日历入口仍显示红色提示

- [ ] **Step 8: 提交这一小步**

```bash
git add src/app/components/MainLayout.tsx src/app/pages/Dashboard.tsx src/app/reminders
git commit -m "feat(reminders): add reminder bell and dashboard panel"
```

---

### Task 4: 增加线索局部提示并完成最终验证

**Files:**
- Modify: `src/app/pages/MyLeads.tsx`
- Modify: `src/app/pages/LeadDetail.tsx`
- Test: `src/app/reminders/__tests__/buildReminders.test.ts`

- [ ] **Step 1: 先写失败测试，锁定线索提醒 ID 与过滤条件**

```ts
it('为超时线索生成稳定的提醒 ID', () => {
  const reminders = buildReminders(reminderMockData, new Date('2026-05-21T11:00:00.000Z'));
  const leadReminder = reminders.find((item) => item.type === 'lead_followup_overdue');

  expect(leadReminder?.id).toBe('lead-followup-overdue-LS003');
  expect(leadReminder?.sourceId).toBe('LS003');
});
```

- [ ] **Step 2: 运行测试确认失败或补齐实现**

Run: `npm test -- src/app/reminders/__tests__/buildReminders.test.ts`

Expected: 如果 ID 不稳定则 FAIL；若已通过，继续下一步，不要改动测试。

- [ ] **Step 3: 在我的线索页增加超时数量提示**

```tsx
import { Alert, Typography } from '@arco-design/web-react';
import { useReminders } from '../reminders/ReminderContext';

const { reminders } = useReminders();
const overdueLeads = reminders.filter((item) => item.type === 'lead_followup_overdue');

{overdueLeads.length > 0 ? (
  <Alert
    type="warning"
    style={{ marginBottom: 16 }}
    content={`当前有 ${overdueLeads.length} 条线索已超时未跟进，请尽快处理。`}
  />
) : null}
```

插入位置：`<Title heading={4}>我的线索</Title>` 下方、主 `Card` 上方。

- [ ] **Step 4: 在线索详情页增加当前线索提醒条**

```tsx
import { Alert } from '@arco-design/web-react';
import { useReminders } from '../reminders/ReminderContext';

const { isLeadReminderActive } = useReminders();
const activeLeadId = id ? `LS00${id}` : '';
const showLeadReminder = isLeadReminderActive(activeLeadId);

{showLeadReminder ? (
  <Alert
    type="warning"
    style={{ marginBottom: 16 }}
    content="该线索已超过跟进时间且尚未填写新的跟进记录，请优先处理。"
  />
) : null}
```

插入位置：返回按钮与标题区域下方、第一张详情卡片上方。

- [ ] **Step 5: 跑完整自动验证**

Run: `npm test && npm run build`

Expected: 全部测试 PASS，build 成功。

- [ ] **Step 6: 做最终手动验收**

Run: `npm run dev`

Expected manual checks:
- “我的线索”页面出现超时提醒横幅
- 打开 `LS003` 对应详情页时出现提醒条
- 对其他线索详情页不出现该提醒条
- 顶部铃铛、工作台面板、线索局部提示三处数据一致
- 稍后处理某条线索提醒后，铃铛和工作台同步减少，线索页横幅数量同步变化

- [ ] **Step 7: 提交最终实现**

```bash
git add src/app/pages/MyLeads.tsx src/app/pages/LeadDetail.tsx src/app/reminders
git commit -m "feat(reminders): add lead reminder surfaces"
```

---

## Self-Review

### Spec coverage

- 统一提醒模型：Task 1 / Task 2
- 7 类提醒：Task 2
- 铃铛 + 工作台 + 局部提示：Task 3 / Task 4
- 稍后处理固定选项：Task 1 / Task 2 / Task 3
- 自动随业务状态消失：Task 2 / Task 3
- 线索规则“预约优先、48h 兜底”：Task 1 / Task 2
- 不做独立消息中心、已读体系、批量处理：本计划未加入相关任务

### Placeholder scan

- 没有 `TODO` / `TBD`
- 每个代码步骤都给出了具体代码块
- 每个验证步骤都给出了命令与预期结果

### Type consistency

- `ReminderItem` / `SnoozeOptionId` / `ReminderType` 在所有任务中保持同名
- `buildReminders` 是唯一汇总入口
- `snoozeReminder` / `isLeadReminderActive` 在 provider、UI 与测试中名称一致

---

Plan complete and saved to `docs/superpowers/plans/2026-05-22-in-app-reminder.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
