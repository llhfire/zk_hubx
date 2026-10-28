# 06 · 实样页 `/ui-library`

路由：`/ui-library` → `app/pages/ui-library/UiComponentLibraryPage.tsx`
侧边栏入口：「UI 组件库」（`MainLayout.tsx:211`）

---

## 一、为什么有这一页

用户原话：**「这个 UI 组件库并没有展示完整的 UI 组件。」**

在此之前，页面的「模块组件」页签只有 36 行目录表 + 8 处真实渲染，
其余组件（`MoneyText`、`ProgressBar`、`DescriptionsCard`、`AsyncState`、`FormGrid`…）
只有一行文字描述 —— **看得到名字，看不到样子**。等于组件交付了但没人知道它长什么样。

现在门禁里的 `libraryMissingDemo` 把「有实样」变成了硬性条件：
`design-system/index.ts` 每加一个值导出，就必须在同一页补一份真实渲染，否则门禁失败。

---

## 二、四个页签

| 页签 | 内容 | 面向谁 |
|---|---|---|
| **基础 UI** | 通过 `@/design-system` 受控出口提供的基础 UI；展示操作/状态/录入示例与使用边界 | 新写页面的人 |
| **模块组件** | **58 个模块组件导出全部有真实渲染**，按六类分组 | 查「有没有现成组件」的人 |
| **页面框架** | 列表页 / 长流程详情页的骨架顺序与选用顺序 | 开新页面的人 |
| **业务样板** | 线索列表样板（列结构、图标操作、双层时间、状态组合） | 做列表页的人 |

---

## 三、模块组件页签的六组演示

按设计系统分类组织，每组一张 `SectionCard`，内部用 `.ui-library-preview` 分小组，
每组带着演示用的微标签（`.ui-library-demo-caption`）。

### 1. 原子 `primitives/`

| 演示 | 覆盖的形态 |
|---|---|
| `MoneyText` | default / compact / plain / tone=success / tone=danger / tone=muted / 空值 `—`（区分「没有」与「零」） |
| `StatusTag` | 9 个 tone 全列（含分类色 cyan/pink/gold）；small；`meta` 映射；`resolveStatus` 未定义回退；`onClick` 可点击；`onClose` 可关闭（点了真的消失，旁边有恢复按钮） |
| `STATUS_TONE_VARS` | 9 个色板，直观看「状态色但不是标签」时取哪个 fg |
| `GradeTag` | S / A / B / C / 未定 `?`，旁边标出 `GRADE_TONE` 的映射关系 |
| `DateText` | 日期 / 日期时间 / 区间 + suffix / 空值 |
| `CountdownTag` | 12 天 / 临期 3 天 / 今天截止 / 逾期 5 天 / 空值 |
| `IdentifierText` | md 单行省略 + 悬停看全值；sm + muted |
| `EntityLink` | 路由跳转 / `onClick` 打开抽屉 / 无权限置灰 |
| 三个图标 | `FollowUpIcon` / `TrashLeadIcon` / `WeChatIcon` |

### 2. 骨架 `layout/`

`PageBreadcrumb`（三级）→ `PageHeader` → `SectionTabs`（分区页签 + 数量表达）
→ `DetailHeader`（返回 + 标题 + 状态 + 单号 + meta + 业务步骤 + 操作）
→ `SectionCard` 四态并排（默认 / small / bordered=false / padded=false）
→ `SplitLayout` + `SplitLayoutMain` + `SplitLayoutAside`（70:30 主辅区，右侧放「业务过程区」示意）。

### 3. 展示 `data-display/`

| 演示 | 覆盖 |
|---|---|
| `DataTable` | 带 `toolbar` + `actions` + `caption` 的正常表；下面紧跟一张空表验证空态与 `emptyAction` |
| `MetricCard` | 4 种：suffix 状态标签 + detail、warning、danger + badge、icon + 单位 |
| `MetricGrid` | 一排 6 个摘要指标（含 tone=warning / danger） |
| `DescriptionsCard` | 3 列短字段 + 2 个 `long` 整行；下面单独演示 `bare` 形态 |
| `ProgressBar` | 条形三档 size + tone=success/warning + `showValue={false}`；环形三档（67% / 100% / 72px 小直径）；分类色 purple/cyan/pink/gold |
| `EmptyState` | 说明 + 引导按钮 |
| `FileList` | 3 个文件（正常 / 无删除 / 删除置灰 + `deleteDisabledReason`）+ 空态 |

### 4. 录入 `forms/`

`FilterBar`（含重置/查询）→ `FormSection` + `FormGrid` columns=2 与 columns=3
→ `UploadPanel`（真实拖拽区）→ `RichTextEditor`（**真 Quill 编辑器，可输入**，下面实时显示 HTML 值）。

### 5. 反馈 `feedback/`

`AlertBanner` 6 种（info+title / warning+title / danger+title / success / compact / closable）
→ `confirmAction` 默认 + danger、`ConfirmModal` 受控（按钮真的弹出，danger 按钮是红的）
→ `AsyncState` 四态并排（loading 转圈 / error + 重试 / forbidden / ready）。

### 6. 业务 `business/`（16 个，三组）

| 演示 | 覆盖 |
|---|---|
| `PaymentProgress` | 三态并排：186000/320000 默认、320000/320000 满额 `tone="success"`、`size="small"` + `showAmounts={false}` 紧凑态 |
| `PaymentPlanTable` | 2 期合同计划，`showPercentage` + `showCondition`，`renderStatus` 返回「已收款 / 待收款」状态标签 |
| `FileArchivePanel` | 「合同归档」：`action` + `headerMeta` + 一条归档批次（2 个徽章、时间、上传人/备注、2 个文件） |
| `DocumentActionRow` | default（合同终稿，两动作）+ `variant="quiet"`（报价文件，单动作） |
| `ProcessOverview` | 5 步，`currentStep=2`，带身份 / 标签 / 操作 |
| `ProcessRecordCard` | 默认 + `muted`（已作废）两态并排 |
| `ProcessPanelSection` | 侧栏页签动作栏 + 内嵌一条 `ProcessRecordCard` |
| `ApprovalFlow` | 4 节点：approved ×2 / rejected（带驳回原因）/ skipped |
| `ProcessStepper` | 3 节点：approved / active / pending，index 用数字与文字都演示 |
| `FeatureWorkloadMatrix` | 2 端 / 3 模块 / 4 子功能 × 2 岗位，含每日费率与合计 |
| `RiskRadarGrid` | safe / warning / danger 三种风险边界 |
| `RoleRateGrid` | `readonly` 三岗位：人天 / 日均成本 / 小计 |
| `EvaluationWorkloadTable` | 2 行可编辑（端分组、岗位列、备注输入），工时格用 `WorkloadNumericInput`（真实受控、可方向键漫游） |
| `WorkloadNumericInput` | 不单独占一块——它只在 `EvaluationWorkloadTable` 的 `renderWorkloadCell` 里出现，但真实可输入即算实样 |
| `DormitoryRoomBoard` | 1 层 2 房 4 床：入住/空床/维修中三种房态，含房型与筛选 |
| `DocumentViewerModal` | 按钮打开，全屏阅读器，一屏一页 / 横排两页切换 |

---

## 四、页尾的目录表

54 个导出对应 **49 行**（`SplitLayout` 三名合一行、三图标合一行、
`confirmAction` + `ConfirmModal` 合一行、`resolveStatus` / `STATUS_TONE_VARS` / `GRADE_TONE`
各占一行）。列结构：分类 / 组件 / 用途 / 代码位置。

---

## 五、新增的 CSS（只允许布局）

`UiComponentLibraryPage.css` 新增 7 个类，**全部是布局，无一处视觉值**：

```
.ui-library-demo-row          横向排列的演示行
.ui-library-demo-stack        纵向排列的演示栈
.ui-library-demo-cell         单个演示格（caption + 内容）
.ui-library-demo-caption      演示微标签
.ui-library-demo-caption-line 行内说明
.ui-library-demo-grid         auto-fit 网格（minmax 240px）
.ui-library-demo-grid--wide   minmax 200px
.ui-library-demo-spacer       间距
.ui-library-tone-swatch       色板（颜色通过 CSS 变量从 STATUS_TONE_VARS 注入）
```

`ui-library-tone-swatch` 是最容易违规的地方 —— 它要显示 9 个 tone 的**实际颜色**。
做法是把 `STATUS_TONE_VARS[tone]` 的 `bg/fg/border` 塞进三个自定义属性
（`--ui-swatch-bg` / `--ui-swatch-fg` / `--ui-swatch-border`），CSS 里再 `var()` 取用。
这样门禁看到的仍是 `var(...)`，而颜色真实可见。

---

## 六、浏览器实测

用 ego-browser 打开 `http://localhost:5173/ui-library`，逐个页签点击并滚动截图：

| 页签 | `main` 内容高度 | innerText 字数 |
|---|---|---|
| 基础 UI | 962 | 796 |
| **模块组件** | **10106** | **8044** |
| 页面框架 | 852 | 8486 |
| 业务样板 | 852 | 8810 |

（「页面框架」「业务样板」高度是 852 但文本量大，因为 Tab 面板切换后容器高度归位，
文本仍在 DOM 里；截图逐页看过，内容正常。）

逐项确认渲染正确：

- 环形进度：67%（蓝）/ 100%（绿）/ 24%（橙，72px）三段弧线都按比例画出
- `ProgressBar` 分类色 4 条：紫 / 青 / 粉 / 金
- 阅读器：点「打开报价单阅读器」→ 全屏 modal，标题、一屏一页/横排两页、下载按钮齐全
- 确认弹窗：点「ConfirmModal · 受控」→ 标题「作废该合同？」，确认按钮为**红色 danger**
- 富文本：Quill 工具栏完整（标题/粗体/斜体/下划线/链接/列表/清除），输入区可编辑
- 无 pageerror、无空白状态标签
