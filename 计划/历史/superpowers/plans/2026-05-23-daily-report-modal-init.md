# 日报模态框初始化稳定性修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复点击日报按钮后，日报模态框首次打开时先显示空态、随后才渲染示例数据的问题，确保角色确认后首帧即显示对应默认内容。

**Architecture:** 保持现有“先选角色、再打开日报弹窗”的交互不变，只修正状态初始化时序。入口层移除基于 `setTimeout` 的时间驱动打开方式，弹窗层改为在“关闭 → 打开”的边界按角色一次性建立初始内容，并通过受控 `initialContent` 让模板首帧直接渲染完整默认数据。

**Tech Stack:** React 18、TypeScript、Arco Design、Vite、Vitest

---

## File Map

- Modify: `src/app/components/MainLayout.tsx`
  - 负责顶部日报入口、角色选择弹窗与日报弹窗的打开时序。
  - 本次改动用于移除延时打开逻辑，确保角色确认后再显示日报弹窗。

- Modify: `src/app/pages/daily-report/DailyReportModal.tsx`
  - 负责日报弹窗容器、日期状态、内容状态、模板选择与提交。
  - 本次改动用于在“关闭 → 打开”边界按当前角色同步建立初始内容，并移除无效初始化状态。

- Modify: `src/app/pages/daily-report/SalesDailyTemplate.tsx`
  - 负责销售日报模板渲染与本地字段状态。
  - 本次改动用于让模板在 `initialContent` 变化到新会话数据时重新同步一次内部状态，而不是只在首次挂载时初始化。

- Modify: `src/app/pages/daily-report/GeneralDailyTemplate.tsx`
  - 负责通用日报模板渲染与本地字段状态。
  - 本次改动用于让模板在 `initialContent` 变化到新会话数据时重新同步一次内部状态，而不是只在首次挂载时初始化。

- Create: `src/app/reminders/__tests__/dailyReportModalInit.test.ts`
  - 负责覆盖“首次打开即有默认内容”和“切换角色不残留上次内容”的回归测试。
  - 采用服务端静态渲染标记字符串的方式，沿用当前仓库已有 Vitest + `renderToStaticMarkup` 风格，避免引入新的测试依赖。

---

### Task 1: 写失败测试，锁定首帧初始化行为

**Files:**
- Create: `src/app/reminders/__tests__/dailyReportModalInit.test.ts`
- Test: `src/app/reminders/__tests__/dailyReportModalInit.test.ts`
- Reference: `src/app/pages/daily-report/DailyReportModal.tsx`
- Reference: `src/app/pages/daily-report/SalesDailyTemplate.tsx`
- Reference: `src/app/pages/daily-report/GeneralDailyTemplate.tsx`

- [ ] **Step 1: 创建失败测试文件，覆盖销售与通用两种首帧场景**

```ts
import { createElement } from 'react'
import { describe, expect, test } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DailyReportModal } from '@/app/pages/daily-report/DailyReportModal'

function renderDailyReportModal(defaultRole: 'sales' | 'general') {
  return renderToStaticMarkup(
    createElement(DailyReportModal, {
      visible: true,
      onCancel: () => {},
      onSubmit: () => {},
      currentUserId: 'user-sales-zhangsan',
      defaultRole,
    }),
  )
}

describe('DailyReportModal initialization', () => {
  test('renders sales default lead data on the first visible frame', () => {
    const markup = renderDailyReportModal('sales')

    expect(markup).toContain('阿里巴巴-企业管理系统')
    expect(markup).toContain('腾讯-云服务平台')
    expect(markup).not.toContain('今日暂无线索跟进记录')
  })

  test('renders general default structure on the first visible frame', () => {
    const markup = renderDailyReportModal('general')

    expect(markup).toContain('项目任务')
    expect(markup).toContain('添加项目任务')
    expect(markup).toContain('今日总结')
  })
})
```

- [ ] **Step 2: 运行单测，确认当前实现失败**

Run:
```bash
npm --prefix "D:/AIwork/OA/HubX" test -- src/app/reminders/__tests__/dailyReportModalInit.test.ts
```

Expected:
```text
FAIL  src/app/reminders/__tests__/dailyReportModalInit.test.ts
...expected markup to contain "阿里巴巴-企业管理系统"
```

- [ ] **Step 3: 增加“切换角色不残留”测试，锁定会话边界**

```ts
test('renders role-specific first frame without leaking previous role content', () => {
  const salesMarkup = renderDailyReportModal('sales')
  const generalMarkup = renderDailyReportModal('general')

  expect(salesMarkup).toContain('阿里巴巴-企业管理系统')
  expect(generalMarkup).not.toContain('阿里巴巴-企业管理系统')
  expect(generalMarkup).toContain('添加项目任务')
})
```

- [ ] **Step 4: 再次运行单测，确认新增断言也失败或至少受当前缺陷约束**

Run:
```bash
npm --prefix "D:/AIwork/OA/HubX" test -- src/app/reminders/__tests__/dailyReportModalInit.test.ts
```

Expected:
```text
FAIL  src/app/reminders/__tests__/dailyReportModalInit.test.ts
```

- [ ] **Step 5: 提交测试基线**

```bash
git -C "D:/AIwork/OA/HubX" add src/app/reminders/__tests__/dailyReportModalInit.test.ts
git -C "D:/AIwork/OA/HubX" commit -m "test: lock daily report modal first-frame initialization"
```

---

### Task 2: 修正入口时序，移除延时打开

**Files:**
- Modify: `src/app/components/MainLayout.tsx:32-50`
- Test: `src/app/reminders/__tests__/dailyReportModalInit.test.ts`

- [ ] **Step 1: 先阅读并替换 `handleRoleSelect` 的延时打开逻辑**

将这段：

```ts
const handleRoleSelect = (role: 'sales' | 'general') => {
  setSelectedRole(role)
  setRoleSelectVisible(false)
  window.setTimeout(() => {
    setDailyReportVisible(true)
  }, 50)
}
```

改成：

```ts
const handleRoleSelect = (role: 'sales' | 'general') => {
  setSelectedRole(role)
  setRoleSelectVisible(false)
  setDailyReportVisible(true)
}
```

- [ ] **Step 2: 保持点击入口时总是从销售角色开始，但不提前打开日报弹窗**

确认保留如下逻辑：

```ts
const handleDailyReportOpen = () => {
  setSelectedRole('sales')
  setRoleSelectVisible(true)
}
```

如果当前文件不一致，调整为以上实现，避免在打开角色选择框前遗留旧的日报可见状态。

- [ ] **Step 3: 运行失败测试，确认仅移除延时还不足以让所有测试通过**

Run:
```bash
npm --prefix "D:/AIwork/OA/HubX" test -- src/app/reminders/__tests__/dailyReportModalInit.test.ts
```

Expected:
```text
FAIL  src/app/reminders/__tests__/dailyReportModalInit.test.ts
```

- [ ] **Step 4: 提交入口时序调整**

```bash
git -C "D:/AIwork/OA/HubX" add src/app/components/MainLayout.tsx
git -C "D:/AIwork/OA/HubX" commit -m "refactor: remove delayed daily report modal open"
```

---

### Task 3: 在日报弹窗打开边界同步建立初始内容

**Files:**
- Modify: `src/app/pages/daily-report/DailyReportModal.tsx:1-105`
- Reference: `src/app/pages/daily-report/templateConfig.ts:98-124`
- Reference: `src/app/pages/daily-report/types.ts:41-57`
- Test: `src/app/reminders/__tests__/dailyReportModalInit.test.ts`

- [ ] **Step 1: 引入按角色生成初始内容的纯函数，替换空内容占位态**

在 `DailyReportModal.tsx` 顶部 import 改为：

```ts
import { useEffect, useMemo, useState } from 'react';
import { Modal, DatePicker, Button, Message } from '@arco-design/web-react';
import { SalesDailyTemplate } from './SalesDailyTemplate';
import { GeneralDailyTemplate } from './GeneralDailyTemplate';
import { getSalesDailyLeadsData, mockUsers } from './templateConfig';
import { DailyReport, DailyReportContent, SalesReportContent, GeneralReportContent } from './types';
```

并在组件定义前新增：

```ts
function buildInitialContent(
  role: 'sales' | 'general',
  currentUserId: string,
  reportDate: Date,
): DailyReportContent {
  if (role === 'sales') {
    return {
      'lead-tracking': getSalesDailyLeadsData(currentUserId, reportDate),
      'assistance-needed': '',
      'tomorrow-plan': '',
    } satisfies SalesReportContent
  }

  return {
    'project-tasks': [],
    'today-summary': '',
    'problems-encountered': '',
    'tomorrow-plan': '',
  } satisfies GeneralReportContent
}
```

- [ ] **Step 2: 删除无效的 `isFirstRender`，把 `content` 初始化绑定到打开边界**

将这段状态与关闭逻辑：

```ts
const [reportDate, setReportDate] = useState(new Date());
const [content, setContent] = useState<DailyReportContent | null>(null);
const [isFirstRender, setIsFirstRender] = useState(true);

useEffect(() => {
  if (!visible) {
    setIsFirstRender(true);
    setContent(null);
  }
}, [visible]);
```

改成：

```ts
const [reportDate, setReportDate] = useState(() => new Date())
const currentTemplateType: 'sales' | 'general' = defaultRole || 'general'
const [content, setContent] = useState<DailyReportContent>(() =>
  buildInitialContent(currentTemplateType, currentUserId, new Date()),
)

useEffect(() => {
  if (!visible) {
    return
  }

  const nextDate = new Date()
  setReportDate(nextDate)
  setContent(buildInitialContent(currentTemplateType, currentUserId, nextDate))
}, [visible, currentTemplateType, currentUserId])
```

- [ ] **Step 3: 删除重复的模板类型声明，保证提交时使用当前会话角色**

删除原文件中旧的：

```ts
const currentTemplateType: 'sales' | 'general' = defaultRole || 'general';
```

并保留 `handleSubmit` 内以下字段不变：

```ts
templateId: currentTemplateType === 'sales' ? 'sales-template-default' : 'general-template-default',
templateType: currentTemplateType,
content,
```

如果 `content` 类型仍包含 `null`，同步改为非空 `DailyReportContent`，避免提交路径继续处理空值分支。

- [ ] **Step 4: 让模板接收当前会话初值，而不是空值占位**

保留 `renderTemplate()` 结构，但确保传参形态是：

```ts
<SalesDailyTemplate
  userId={currentUserId}
  date={reportDate}
  initialContent={content as SalesReportContent}
  onChange={handleContentChange}
/>
```

```ts
<GeneralDailyTemplate
  initialContent={content as GeneralReportContent}
  onChange={handleContentChange}
/>
```

不要再传 `undefined` 作为“等模板自己初始化”的信号。

- [ ] **Step 5: 运行单测，确认日报弹窗首帧测试开始通过或至少只剩模板同步问题**

Run:
```bash
npm --prefix "D:/AIwork/OA/HubX" test -- src/app/reminders/__tests__/dailyReportModalInit.test.ts
```

Expected:
```text
PASS  src/app/reminders/__tests__/dailyReportModalInit.test.ts
```

如果仍失败，失败点应只剩模板内部“只在挂载时读取初值”的问题，进入下一任务处理。

- [ ] **Step 6: 提交弹窗初始化逻辑修复**

```bash
git -C "D:/AIwork/OA/HubX" add src/app/pages/daily-report/DailyReportModal.tsx
git -C "D:/AIwork/OA/HubX" commit -m "fix: initialize daily report modal content before first render"
```

---

### Task 4: 让两个日报模板在新会话初值到达时同步内部状态

**Files:**
- Modify: `src/app/pages/daily-report/SalesDailyTemplate.tsx:1-147`
- Modify: `src/app/pages/daily-report/GeneralDailyTemplate.tsx:1-198`
- Test: `src/app/reminders/__tests__/dailyReportModalInit.test.ts`

- [ ] **Step 1: 去掉销售模板“只在首次挂载初始化”的 `hasInitializedRef` 守卫**

把这段：

```ts
const hasInitializedRef = useRef(false)

useEffect(() => {
  if (hasInitializedRef.current) {
    return
  }

  if (initialContent) {
    setLeadTracking(initialContent['lead-tracking'] || [])
    setAssistanceNeeded(initialContent['assistance-needed'] || '')
    setTomorrowPlan(initialContent['tomorrow-plan'] || '')
  } else {
    const leadsData = getSalesDailyLeadsData(userId, date)
    setLeadTracking(leadsData)
  }

  hasInitializedRef.current = true
}, [])
```

改成：

```ts
useEffect(() => {
  if (initialContent) {
    setLeadTracking(initialContent['lead-tracking'] || [])
    setAssistanceNeeded(initialContent['assistance-needed'] || '')
    setTomorrowPlan(initialContent['tomorrow-plan'] || '')
    return
  }

  setLeadTracking(getSalesDailyLeadsData(userId, date))
  setAssistanceNeeded('')
  setTomorrowPlan('')
}, [initialContent, userId, date])
```

并删除未使用的 `useRef` import。

- [ ] **Step 2: 去掉通用模板“只在首次挂载初始化”的 `hasInitializedRef` 守卫**

把这段：

```ts
const hasInitializedRef = useRef(false)

useEffect(() => {
  if (hasInitializedRef.current) {
    return
  }

  if (initialContent) {
    setProjectTasks(initialContent['project-tasks'] || [])
    setTodaySummary(initialContent['today-summary'] || '')
    setProblemsEncountered(initialContent['problems-encountered'] || '')
    setTomorrowPlan(initialContent['tomorrow-plan'] || '')
  }

  hasInitializedRef.current = true
}, [])
```

改成：

```ts
useEffect(() => {
  setProjectTasks(initialContent?.['project-tasks'] || [])
  setTodaySummary(initialContent?.['today-summary'] || '')
  setProblemsEncountered(initialContent?.['problems-encountered'] || '')
  setTomorrowPlan(initialContent?.['tomorrow-plan'] || '')
}, [initialContent])
```

并删除未使用的 `useRef` import。

- [ ] **Step 3: 运行日报初始化测试，确认全部通过**

Run:
```bash
npm --prefix "D:/AIwork/OA/HubX" test -- src/app/reminders/__tests__/dailyReportModalInit.test.ts
```

Expected:
```text
PASS  src/app/reminders/__tests__/dailyReportModalInit.test.ts
```

- [ ] **Step 4: 运行已有提醒组件测试，确认没有破坏现有测试基线**

Run:
```bash
npm --prefix "D:/AIwork/OA/HubX" test -- src/app/reminders/__tests__/components.test.ts src/app/reminders/__tests__/dailyReportModalInit.test.ts
```

Expected:
```text
PASS  src/app/reminders/__tests__/components.test.ts
PASS  src/app/reminders/__tests__/dailyReportModalInit.test.ts
```

- [ ] **Step 5: 提交模板同步修复**

```bash
git -C "D:/AIwork/OA/HubX" add src/app/pages/daily-report/SalesDailyTemplate.tsx src/app/pages/daily-report/GeneralDailyTemplate.tsx src/app/reminders/__tests__/dailyReportModalInit.test.ts
git -C "D:/AIwork/OA/HubX" commit -m "fix: sync daily report templates with session initial content"
```

---

### Task 5: 运行真实界面验证并收尾

**Files:**
- Modify: `src/app/components/MainLayout.tsx`
- Modify: `src/app/pages/daily-report/DailyReportModal.tsx`
- Modify: `src/app/pages/daily-report/SalesDailyTemplate.tsx`
- Modify: `src/app/pages/daily-report/GeneralDailyTemplate.tsx`
- Test: `src/app/reminders/__tests__/dailyReportModalInit.test.ts`

- [ ] **Step 1: 启动当前项目开发服务器**

Run:
```bash
npm --prefix "D:/AIwork/OA/HubX" run dev -- --host 0.0.0.0 --port 5174
```

Expected:
```text
VITE v6.3.5 ready
Network: http://192.168.1.11:5174/
```

- [ ] **Step 2: 在运行中的界面验证销售日报首帧**

操作：
1. 打开 `http://192.168.1.11:5174/`
2. 点击顶部日报按钮
3. 在角色弹窗中选择“销售日报”

Expected:
```text
弹窗首帧直接显示“阿里巴巴-企业管理系统”“腾讯-云服务平台”等销售默认线索项；不出现“今日暂无线索跟进记录”闪一下再消失。
```

- [ ] **Step 3: 在运行中的界面验证通用日报首帧与角色隔离**

操作：
1. 关闭日报弹窗
2. 再次点击顶部日报按钮
3. 选择“通用日报”

Expected:
```text
弹窗首帧直接显示“项目任务”“添加项目任务”“今日总结”；不出现销售线索内容残留。
```

- [ ] **Step 4: 在运行中的界面验证编辑内容不会被二次初始化覆盖**

操作：
1. 在通用日报里输入“今日总结”和“明日工作计划”
2. 停留 2-3 秒，不关闭弹窗

Expected:
```text
输入内容保持不变，不会被自动清空或替换。
```

- [ ] **Step 5: 运行生产构建，确认无编译回归**

Run:
```bash
npm --prefix "D:/AIwork/OA/HubX" run build
```

Expected:
```text
vite build completed successfully
```

- [ ] **Step 6: 提交最终收尾**

```bash
git -C "D:/AIwork/OA/HubX" add src/app/components/MainLayout.tsx src/app/pages/daily-report/DailyReportModal.tsx src/app/pages/daily-report/SalesDailyTemplate.tsx src/app/pages/daily-report/GeneralDailyTemplate.tsx src/app/reminders/__tests__/dailyReportModalInit.test.ts
git -C "D:/AIwork/OA/HubX" commit -m "fix: stabilize daily report modal first-frame initialization"
```

---

## Self-Review

- **Spec coverage:**
  - 首帧直接显示对应角色默认内容：Task 1、Task 3、Task 4、Task 5 覆盖。
  - 移除时间驱动打开方式：Task 2 覆盖。
  - 打开时初始化一次、避免编辑中被覆盖：Task 3、Task 4、Task 5 覆盖。
  - 销售/通用角色隔离且不残留：Task 1、Task 4、Task 5 覆盖。
  - 不改提交流程：Task 3 明确保留原 `handleSubmit` 提交路径，Task 5 运行时验证覆盖。

- **Placeholder scan:**
  - 无 TBD/TODO。
  - 每个代码步骤都给出了具体代码块。
  - 每个验证步骤都给出了明确命令和期望输出。

- **Type consistency:**
  - 计划统一使用 `defaultRole: 'sales' | 'general'`、`currentTemplateType: 'sales' | 'general'`、`DailyReportContent`、`SalesReportContent`、`GeneralReportContent`。
  - 所有测试与实现引用的组件路径、类型名、脚本命令都与当前仓库一致。
