# Project Detail Summary Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `ProjectDetail` 顶部的 5 个大卡片重构为 1 行 4 个紧凑预警卡，突出交付延期、负责人并发压力、交付时效和工时集中度。

**Architecture:** 保持数据源不变，新增一个 `projectDetailSummary.ts` 纯函数 helper 统一计算 4 张卡片的展示数据和风险等级，再由 `ProjectDetail.tsx` 负责渲染紧凑摘要卡。测试只覆盖 helper 的纯计算逻辑，页面层通过 `npm run build` 做集成验证，避免为了 UI 测试引入新的测试依赖。

**Tech Stack:** React 18、TypeScript、Arco Design、Vitest、现有 `delivery-plan/utils.ts` 纯函数、现有项目 mock 数据。

---

## 文件结构

### 新建文件

| 文件 | 职责 |
|------|------|
| `src/app/pages/projectDetailSummary.ts` | 汇总 4 张预警卡的纯函数、类型定义、风险分级和日期差值计算 |
| `src/app/pages/__tests__/projectDetailSummary.test.ts` | 覆盖正常项目、延期步骤、无交付计划、无工时、无预计结束日期等场景 |

### 修改文件

| 文件 | 变更内容 |
|------|---------|
| `src/app/pages/ProjectDetail.tsx:3-47` | 调整 import，移除 `Statistic`、`Progress`、`DeliveryProgressCard`，引入摘要 helper |
| `src/app/pages/ProjectDetail.tsx:82-97` | 在现有 `project` / `memberHours` / `totalHours` 基础上生成 `summaryCards` |
| `src/app/pages/ProjectDetail.tsx:274-285` | 删除“总进度 + 负责人 + 预计结束日期 + 已用总工时 + 交付进度大卡”结构，替换为 1 行 4 张紧凑预警卡 |

### 不改动的文件

| 文件 | 原因 |
|------|------|
| `src/app/pages/Projects.tsx` | 规格明确排除项目列表页“总进度”列 |
| `src/app/pages/delivery-plan/DeliveryProgressCard.tsx` | 本次只改项目详情页首屏摘要，不改交付计划页面和原交付大卡本体 |
| `src/app/pages/project-management/mockData.ts` | 不为了这次首屏摘要重构去改全局 mock 数据；特殊场景由 helper 单测覆盖 |

---

## Task 1: 先写失败的摘要计算测试

**Files:**
- Create: `src/app/pages/__tests__/projectDetailSummary.test.ts`
- Read: `src/app/pages/project-management/mockData.ts:10-92`
- Read: `src/app/pages/delivery-plan/types.ts:28-88`

- [ ] **Step 1: 创建失败测试文件，锁定 4 张卡片的口径**

```ts
import { describe, expect, it } from 'vitest';
import type { DeliveryPlan, SopPhase, SopStep } from '../delivery-plan/types';
import type { Project, ProjectMemberHours } from '../project-management/mockData';
import { buildProjectSummaryCards } from '../projectDetailSummary';

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    projectNo: 'PRJ202606001',
    name: 'A公司CRM系统开发',
    latestProgress: '进入开发联调阶段。',
    priority: '高',
    entity: '中科软艺',
    status: '进行中',
    businessLine: '外包',
    salesUsers: ['张三'],
    owner: '李四',
    assistants: ['王五'],
    productUsers: ['李四'],
    uiUsers: ['孙七'],
    frontendUsers: ['王五'],
    backendUsers: ['赵六'],
    opsUsers: ['周八'],
    testUsers: ['钱九'],
    legalUsers: ['张三'],
    progress: 65,
    startDate: '2026-05-01',
    expectedEndDate: '2026-06-30',
    remark: '',
    attachments: [],
    contractId: '4',
    createdAt: '2026-05-01 09:30',
    ...overrides,
  };
}

function createPlan(stepOverrides: Partial<SopStep>[] = []): DeliveryPlan {
  const phases: SopPhase[] = [
    {
      id: 'phase-3',
      projectId: 'project-1',
      phaseNo: 3,
      phaseName: '项目交付执行',
      manager: '李四',
      status: 'in_progress',
      startDate: '2026-05-20',
      dueDate: '2026-06-25',
    },
  ];

  const baseSteps: SopStep[] = [
    {
      id: 'step-1',
      phaseId: 'phase-3',
      projectId: 'project-1',
      stepNo: '3.4',
      stepName: '接口联调',
      department: '研发',
      assignee: '王五',
      status: 'in_progress',
      startDate: '2026-06-01',
      dueDate: '2026-06-18',
      deliverables: '联调记录',
      description: '接口联调',
      notes: '',
      tools: 'Apifox',
      isCustom: false,
      isEvergreen: false,
      userNotes: '',
    },
    {
      id: 'step-2',
      phaseId: 'phase-3',
      projectId: 'project-1',
      stepNo: '3.5',
      stepName: 'UI 走查',
      department: '设计',
      assignee: '孙七',
      status: 'pending',
      startDate: '2026-06-19',
      dueDate: '2026-06-24',
      deliverables: '走查清单',
      description: 'UI 走查',
      notes: '',
      tools: 'Figma',
      isCustom: false,
      isEvergreen: false,
      userNotes: '',
    },
  ].map((step, index) => ({ ...step, ...(stepOverrides[index] ?? {}) }));

  return {
    projectId: 'project-1',
    phases,
    steps: baseSteps,
    milestones: [
      {
        id: 'milestone-1',
        projectId: 'project-1',
        name: '一期交付',
        date: '2026-06-30',
        completed: false,
      },
    ],
    deliveryType: '网站+小程序',
    contractId: '4',
  };
}

const defaultHours: ProjectMemberHours[] = [
  { key: '李四', personName: '李四', position: '产品经理', hours: 32 },
  { key: '王五', personName: '王五', position: '前端工程师', hours: 28 },
  { key: '赵六', personName: '赵六', position: '后端工程师', hours: 20 },
  { key: '孙七', personName: '孙七', position: 'UI 设计师', hours: 12 },
];

describe('buildProjectSummaryCards', () => {
  it('存在延期步骤时，交付进度卡显示延期最严重的工作项', () => {
    const cards = buildProjectSummaryCards({
      project: createProject(),
      allProjects: [createProject()],
      deliveryPlan: createPlan([
        { dueDate: '2026-06-12' },
        { dueDate: '2026-06-15' },
      ]),
      memberHours: defaultHours,
      totalHours: 92,
      today: '2026-06-20',
    });

    const deliveryCard = cards.find((card) => card.key === 'delivery');
    expect(deliveryCard).toMatchObject({
      level: '严重',
      alert: '接口联调逾期 8 天',
    });
  });

  it('无交付计划时，交付进度卡显示注意态空状态', () => {
    const cards = buildProjectSummaryCards({
      project: createProject(),
      allProjects: [createProject()],
      deliveryPlan: undefined,
      memberHours: defaultHours,
      totalHours: 92,
      today: '2026-06-20',
    });

    const deliveryCard = cards.find((card) => card.key === 'delivery');
    expect(deliveryCard).toMatchObject({
      level: '注意',
      value: '暂无计划',
      alert: '暂未生成交付计划',
      detail: '无法识别延期步骤',
    });
  });

  it('负责人卡统计同负责人下的其他高优先级项目', () => {
    const currentProject = createProject();
    const cards = buildProjectSummaryCards({
      project: currentProject,
      allProjects: [
        currentProject,
        createProject({ id: 'project-2', name: '高优商城项目', status: '进行中' }),
        createProject({ id: 'project-3', name: '高优会员项目', status: '验收中' }),
        createProject({ id: 'project-4', name: '普通项目', priority: '中' }),
      ],
      deliveryPlan: createPlan(),
      memberHours: defaultHours,
      totalHours: 92,
      today: '2026-06-20',
    });

    const ownerCard = cards.find((card) => card.key === 'owner');
    expect(ownerCard).toMatchObject({
      level: '预警',
      value: '李四',
      alert: '另有 2 个高优项目并行',
    });
    expect(ownerCard?.detail).toContain('高优商城项目');
    expect(ownerCard?.detail).toContain('高优会员项目');
  });

  it('交付时间卡在未设置预计结束日期时返回注意态', () => {
    const cards = buildProjectSummaryCards({
      project: createProject({ expectedEndDate: '' }),
      allProjects: [createProject({ expectedEndDate: '' })],
      deliveryPlan: createPlan(),
      memberHours: defaultHours,
      totalHours: 92,
      today: '2026-06-20',
    });

    const deadlineCard = cards.find((card) => card.key === 'deadline');
    expect(deadlineCard).toMatchObject({
      level: '注意',
      value: '未设置',
      alert: '未设置交付日期',
      detail: '无法判断剩余/逾期时间',
    });
  });

  it('总工时卡返回前三成员和集中度', () => {
    const cards = buildProjectSummaryCards({
      project: createProject(),
      allProjects: [createProject()],
      deliveryPlan: createPlan(),
      memberHours: defaultHours,
      totalHours: 92,
      today: '2026-06-20',
    });

    const hoursCard = cards.find((card) => card.key === 'hours');
    expect(hoursCard).toMatchObject({
      value: '92H',
      alert: '李四 32H / 王五 28H / 赵六 20H',
      detail: '前三成员占比 87%',
    });
  });
});
```

- [ ] **Step 2: 运行单测，确认它先失败**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npx vitest run src/app/pages/__tests__/projectDetailSummary.test.ts`

Expected: FAIL，报错 `Cannot find module '../projectDetailSummary'` 或 `Failed to resolve import`，因为 helper 文件还不存在。

- [ ] **Step 3: 提交失败测试基线**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/__tests__/projectDetailSummary.test.ts
git commit -m "test(project-detail): lock summary card requirements"
```

---

## Task 2: 实现摘要 helper 让单测通过

**Files:**
- Create: `src/app/pages/projectDetailSummary.ts`
- Modify: `src/app/pages/__tests__/projectDetailSummary.test.ts`（如断言文案需要跟实现统一，只允许改文案，不改口径）
- Read: `src/app/pages/delivery-plan/utils.ts:110-245`

- [ ] **Step 1: 创建 helper 文件，集中计算四张卡的数据**

```ts
import type { DeliveryPlan } from './delivery-plan/types';
import { calcOverallCompletion, derivePhaseStatus, isStepOverdue } from './delivery-plan/utils';
import type { Project, ProjectMemberHours } from './project-management/mockData';

export type SummaryRiskLevel = '正常' | '注意' | '预警' | '严重';

export interface ProjectSummaryCard {
  key: 'delivery' | 'owner' | 'deadline' | 'hours';
  title: string;
  value: string;
  alert: string;
  detail: string;
  level: SummaryRiskLevel;
}

interface BuildProjectSummaryCardsInput {
  project: Project;
  allProjects: Project[];
  deliveryPlan?: DeliveryPlan;
  memberHours: ProjectMemberHours[];
  totalHours: number;
  today: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function diffDays(from: string, to: string) {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / DAY_MS);
}

function formatConcurrentProjectNames(projects: Project[]) {
  if (projects.length <= 2) {
    return projects.map((item) => item.name).join('、');
  }
  return `${projects.slice(0, 2).map((item) => item.name).join('、')} 等 ${projects.length} 个`;
}

function buildDeliveryCard(project: Project, deliveryPlan: DeliveryPlan | undefined, today: string): ProjectSummaryCard {
  if (!deliveryPlan) {
    return {
      key: 'delivery',
      title: '交付进度',
      value: '暂无计划',
      alert: '暂未生成交付计划',
      detail: '无法识别延期步骤',
      level: '注意',
    };
  }

  const completionPct = Math.round(calcOverallCompletion(deliveryPlan.phases, deliveryPlan.steps) * 100);
  const phaseSummaries = deliveryPlan.phases.map((phase) => {
    const phaseSteps = deliveryPlan.steps.filter((step) => step.phaseId === phase.id);
    return {
      phase,
      status: derivePhaseStatus(phaseSteps),
    };
  });

  const currentPhase =
    phaseSummaries.find((item) => item.status === 'in_progress')?.phase ??
    phaseSummaries.find((item) => item.status === 'pending')?.phase ??
    deliveryPlan.phases[deliveryPlan.phases.length - 1];

  const overdueSteps = deliveryPlan.steps
    .filter((step) => isStepOverdue(step, today))
    .map((step) => ({ step, overdueDays: diffDays(step.dueDate, today) }))
    .sort((left, right) => right.overdueDays - left.overdueDays);

  if (overdueSteps.length > 0) {
    const worst = overdueSteps[0];
    const nextMilestone = deliveryPlan.milestones
      .filter((item) => !item.completed)
      .sort((left, right) => left.date.localeCompare(right.date))[0];

    return {
      key: 'delivery',
      title: '交付进度',
      value: `${currentPhase.phaseName} / ${completionPct}%`,
      alert: `${worst.step.stepName}逾期 ${worst.overdueDays} 天`,
      detail: nextMilestone ? `下一里程碑：${nextMilestone.name}（${nextMilestone.date}）` : '暂无未完成里程碑',
      level: worst.overdueDays >= 7 ? '严重' : '预警',
    };
  }

  const nearestStep = deliveryPlan.steps
    .filter((step) => step.status === 'pending' || step.status === 'in_progress')
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))[0];

  return {
    key: 'delivery',
    title: '交付进度',
    value: `${currentPhase.phaseName} / ${completionPct}%`,
    alert: '当前无逾期',
    detail: nearestStep ? `最接近到期：${nearestStep.stepName}（${nearestStep.dueDate}）` : '当前无进行中的交付任务',
    level: '正常',
  };
}

function buildOwnerCard(project: Project, allProjects: Project[]): ProjectSummaryCard {
  const concurrentHighPriorityProjects = allProjects.filter((item) => {
    return item.id !== project.id && item.owner === project.owner && item.priority === '高' && item.status !== '已完成';
  });

  if (concurrentHighPriorityProjects.length === 0) {
    return {
      key: 'owner',
      title: '负责人',
      value: project.owner,
      alert: '当前无高优并行项目',
      detail: '当前项目可优先推进',
      level: '正常',
    };
  }

  const count = concurrentHighPriorityProjects.length;
  const level: SummaryRiskLevel = count >= 3 ? '严重' : count >= 2 ? '预警' : '注意';

  return {
    key: 'owner',
    title: '负责人',
    value: project.owner,
    alert: `另有 ${count} 个高优项目并行`,
    detail: formatConcurrentProjectNames(concurrentHighPriorityProjects),
    level,
  };
}

function buildDeadlineCard(project: Project, today: string): ProjectSummaryCard {
  if (!project.expectedEndDate) {
    return {
      key: 'deadline',
      title: '交付时间',
      value: '未设置',
      alert: '未设置交付日期',
      detail: '无法判断剩余/逾期时间',
      level: '注意',
    };
  }

  const remainingDays = diffDays(today, project.expectedEndDate);

  if (remainingDays < 0) {
    return {
      key: 'deadline',
      title: '交付时间',
      value: `已逾期 ${Math.abs(remainingDays)} 天`,
      alert: `合同约定交付日：${project.expectedEndDate}`,
      detail: '已逾期',
      level: '严重',
    };
  }

  if (remainingDays <= 7) {
    return {
      key: 'deadline',
      title: '交付时间',
      value: `剩余 ${remainingDays} 天`,
      alert: `合同约定交付日：${project.expectedEndDate}`,
      detail: '临近交付',
      level: '预警',
    };
  }

  return {
    key: 'deadline',
    title: '交付时间',
    value: `剩余 ${remainingDays} 天`,
    alert: `合同约定交付日：${project.expectedEndDate}`,
    detail: '时间充足',
    level: '正常',
  };
}

function buildHoursCard(memberHours: ProjectMemberHours[], totalHours: number): ProjectSummaryCard {
  if (memberHours.length === 0 || totalHours === 0) {
    return {
      key: 'hours',
      title: '总工时',
      value: '0H',
      alert: '暂无工时记录',
      detail: '暂无高消耗成员',
      level: '注意',
    };
  }

  const topMembers = [...memberHours]
    .sort((left, right) => right.hours - left.hours)
    .slice(0, 3);

  const topHours = topMembers.reduce((sum, item) => sum + item.hours, 0);
  const concentration = Math.round((topHours / totalHours) * 100);
  const alert = topMembers.map((item) => `${item.personName} ${item.hours}H`).join(' / ');
  const level: SummaryRiskLevel = concentration >= 80 ? '预警' : concentration >= 60 ? '注意' : '正常';

  return {
    key: 'hours',
    title: '总工时',
    value: `${totalHours}H`,
    alert,
    detail: `前三成员占比 ${concentration}%`,
    level,
  };
}

export function buildProjectSummaryCards(input: BuildProjectSummaryCardsInput): ProjectSummaryCard[] {
  const { project, allProjects, deliveryPlan, memberHours, totalHours, today } = input;

  return [
    buildDeliveryCard(project, deliveryPlan, today),
    buildOwnerCard(project, allProjects),
    buildDeadlineCard(project, today),
    buildHoursCard(memberHours, totalHours),
  ];
}
```

- [ ] **Step 2: 运行单测，确认 helper 已满足规格**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npx vitest run src/app/pages/__tests__/projectDetailSummary.test.ts`

Expected: PASS，显示 `5 passed`。

- [ ] **Step 3: 如果有断言文案不一致，只调整测试文案，不改业务口径**

```ts
// 只允许改这一类细节：
expect(deliveryCard?.alert).toBe('接口联调逾期 8 天');
// 不允许把“最严重延期项”“无计划”“无预计结束日期”等口径删掉
```

- [ ] **Step 4: 提交 helper 和通过的测试**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/projectDetailSummary.ts src/app/pages/__tests__/projectDetailSummary.test.ts
git commit -m "feat(project-detail): add summary card calculation helpers"
```

---

## Task 3: 在 ProjectDetail 中替换首屏摘要区

**Files:**
- Modify: `src/app/pages/ProjectDetail.tsx:3-47`
- Modify: `src/app/pages/ProjectDetail.tsx:82-97`
- Modify: `src/app/pages/ProjectDetail.tsx:274-285`
- Test: `src/app/pages/__tests__/projectDetailSummary.test.ts`

- [ ] **Step 1: 调整 imports，删掉旧大卡依赖，引入新的 helper**

```ts
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  Message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconDelete, IconEdit, IconFile, IconLeft, IconLink, IconPlus, IconSend } from '@arco-design/web-react/icon';
import {
  ProjectDocument,
  ProjectFollowUp,
  ProjectLeadRelation,
  ProjectStatus,
  availableLeads,
  buildProjectMemberHours,
  calculateProjectHours,
  initialDailyReports,
  initialDocuments,
  initialFollowUps,
  initialLeadRelations,
  initialProjects,
  projectStatuses,
  summarizeProgress,
} from './project-management/mockData';
import { buildProjectSummaryCards, type ProjectSummaryCard, type SummaryRiskLevel } from './projectDetailSummary';
import { initialDeliveryPlans } from './delivery-plan/mockData';
```

- [ ] **Step 2: 在 `ProjectDetail.tsx` 内新增紧凑预警卡组件和标签色映射**

```ts
const SUMMARY_TAG_COLOR_MAP: Record<SummaryRiskLevel, 'green' | 'arcoblue' | 'orange' | 'red'> = {
  正常: 'green',
  注意: 'arcoblue',
  预警: 'orange',
  严重: 'red',
};

function SummaryHighlightCard({ card }: { card: ProjectSummaryCard }) {
  return (
    <Card bodyStyle={{ padding: 16 }} style={{ height: '100%' }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div className="flex items-center justify-between gap-3">
          <Text type="secondary">{card.title}</Text>
          <Tag color={SUMMARY_TAG_COLOR_MAP[card.level]}>{card.level}</Tag>
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, lineHeight: '30px', color: 'var(--color-text-1)' }}>
          {card.value}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-1)' }}>{card.alert}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>{card.detail}</Text>
      </Space>
    </Card>
  );
}
```

- [ ] **Step 3: 基于现有页面数据生成 4 张卡片，并替换旧首屏结构**

```ts
const today = new Date().toISOString().split('T')[0];
const deliveryPlan = initialDeliveryPlans[project.id];
const summaryCards = useMemo(
  () =>
    buildProjectSummaryCards({
      project,
      allProjects: initialProjects,
      deliveryPlan,
      memberHours,
      totalHours,
      today,
    }),
  [deliveryPlan, memberHours, project, totalHours, today],
);
```

```tsx
<Grid.Row gutter={16} style={{ marginBottom: 16 }}>
  {summaryCards.map((card) => (
    <Grid.Col span={6} key={card.key}>
      <SummaryHighlightCard card={card} />
    </Grid.Col>
  ))}
</Grid.Row>
```

```tsx
// 删除这两段旧结构：
// 1. 总进度 / 负责人 / 预计结束日期 / 已用总工时 四张 Statistic 卡
// 2. 单独一行的 <DeliveryProgressCard projectId={project.id} ... />
```

- [ ] **Step 4: 运行单测和构建，确认 UI 重构没有破坏现有页面**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npx vitest run src/app/pages/__tests__/projectDetailSummary.test.ts && npm run build`

Expected:
- `projectDetailSummary.test.ts` 全部通过
- `vite build` 成功
- TypeScript / JSX 不再引用已删除的 `Statistic`、`Progress`、`DeliveryProgressCard`

- [ ] **Step 5: 手动核对 4 个验收场景**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npm run dev`

在浏览器核对：
- 项目 1 默认能看到 4 张等宽紧凑卡，而不是原来的 5 个大框。
- 若把 `deliveryPlan` 临时置空，交付进度卡显示“暂无计划 / 暂未生成交付计划 / 无法识别延期步骤”。
- 若把 `project.expectedEndDate` 临时改为空字符串，交付时间卡显示“未设置 / 未设置交付日期 / 无法判断剩余/逾期时间”。
- 若把 `memberHours` 临时传空数组且 `totalHours=0`，总工时卡显示“0H / 暂无工时记录 / 暂无高消耗成员”。

Expected: 4 张卡的风险标签、主值、预警句、补充说明均符合设计文档，不需要往下滚动即可看出风险。

- [ ] **Step 6: 提交页面重构结果**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git add src/app/pages/ProjectDetail.tsx src/app/pages/projectDetailSummary.ts src/app/pages/__tests__/projectDetailSummary.test.ts
git commit -m "feat(project-detail): redesign summary cards with risk-focused layout"
```

---

## Task 4: 最终回归与交付说明

**Files:**
- Read: `src/app/pages/ProjectDetail.tsx`
- Read: `src/app/pages/projectDetailSummary.ts`
- Read: `src/app/pages/__tests__/projectDetailSummary.test.ts`

- [ ] **Step 1: 再跑一遍最小回归命令，记录结果**

Run: `cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX && npx vitest run src/app/pages/__tests__/projectDetailSummary.test.ts && npm run build`

Expected: 测试通过，构建成功。

- [ ] **Step 2: 写交付说明，明确本次没改动的范围**

```md
本次只改了 `ProjectDetail` 顶部摘要区：
- 去掉“总进度”大卡
- 将交付进度纳入首行 4 卡
- 四张卡全部改为风险预警摘要
- 新增 `projectDetailSummary.ts` 统一做口径计算

本次未改：
- 项目列表页 `总进度` 列
- 跟进弹窗的 `总进度` 输入
- 交付计划详情页和原 `DeliveryProgressCard` 组件
```

- [ ] **Step 3: 提交最终整理（如上一步只改说明文字则可与上一个 commit 合并）**

```bash
cd /Users/pc/Documents/AI\ work/01-PROJECTS/HubX/Code/hubX-master/HubX
git status
# 若无新增改动，此步跳过；若有说明性改动再提交
git commit -m "chore(project-detail): finalize summary card verification notes"
```

---

## 计划自检

- 规格覆盖：已覆盖 4 张卡片的职责、紧凑布局、统一风险标签、无交付计划、无预计结束日期、无工时记录、延期步骤和负责人并行高优项目等场景。
- 占位符扫描：计划中没有 `TBD`、`TODO`、`类似 Task N`、`写一些测试` 这类空指令。
- 类型一致性：计划统一使用 `Project`、`ProjectMemberHours`、`DeliveryPlan`、`ProjectSummaryCard`，没有在后续步骤中改名或更换字段口径。
