# 智能会议 UI 设计（smart-meetings-ui-design.md）

> 状态：设计已定稿，未编码。依据原型 `HubX/docs/prototype/ZKHubX-会议纪要与 todo.html` 与 `文档/PRD/PRD-智能会议.md`。
> 覆盖：路由与菜单、纪要列表页、纪要工作台、版本查看、行政来源入口、TODO 投影展示。

## 1. 路由与菜单

| 路由 | 页面 | 组件 |
| --- | --- | --- |
| `/smart-meetings` | 纪要列表 | `SmartMeetingListPage` |
| `/smart-meetings/new` | 新建纪要（工作台空态） | `SmartMeetingWorkbench` |
| `/smart-meetings/:id` | 纪要工作台（查看/编辑） | `SmartMeetingWorkbench` |

- `App.tsx` 注册路由；`MainLayout.tsx` 新增一级菜单「智能会议」（与「会议管理」并列，图标区分，菜单组归属「运营扩展」）。
- 列表页与工作台是**两个路由**而非页内 Tab 切换（原型用 switchMainView 模拟，实现走路由以支持 TODO route 直达）。
- `TodoItem.route = '/smart-meetings/:id'`，从待办中心点击直达工作台。

## 2. 页面结构总览

```
SmartMeetingListPage
├── MonthStatsBar          # 本月沉淀会议（待确认/已确认/已归档）
├── FilterBar              # 搜索 + 筛选（状态/业务引用/参会人/整理人/确认人/时间范围/未完成TODO）
└── MinuteList             # 纪要卡片/行 + 进入 + 新建

SmartMeetingWorkbench
├── WorkbenchHeader        # 标题/状态/会议时间/参会人/操作按钮组
├── SourcePanel            # 🎙️ 会议文本源（上传/粘贴/示例/解析状态）
├── MetaPanel              # 元信息（时间选择器/参会人多选/业务引用选择器）
├── DecisionsPanel         # 💡 核心决议列表
├── ContentPanel           # 正文 Markdown 编辑 + AI 润色预览
├── ActionItemsPanel       # 沉淀待办任务（行动项表格）
├── VersionDrawer          # 版本列表 + 版本对比 + 复制
└── ConfirmFlowModals      # 提交确认/确认/驳回意见/撤回/归档确认
```

## 3. 纪要列表页（SmartMeetingListPage）

### 3.1 MonthStatsBar

- 数据源：`boardQueries.monthDeposited(all, 当前月)`。
- 展示：`本月沉淀会议 N 篇`，分解 待确认 / 已确认 / 已归档 三个数字。
- 不统计草稿与已删除（PRD §8.2）。

### 3.2 FilterBar

- 搜索框 placeholder：`搜索会议主题、决议关键词、待办内容...`（对齐原型）。
- 下拉筛选：状态（草稿/待确认/已确认/已归档，多选）、业务引用（kind + 目录条目选择）、参会人/整理人/确认人（人员目录）、时间范围（DatePicker range）、「有未完成 TODO」开关。
- 全部走 `filterMinutes` 纯函数，输入变化即时过滤（数据量原型级，不做服务端分页）。

### 3.3 MinuteList

每行展示（`MinuteListSummary` 派生字段）：

- 状态 Tag：草稿（灰）/ 待确认（橙）/ 已确认（蓝）/ 已归档（默认）。
- 会议主题 + 会议时间。
- 参会摘要（前 3 人 + 等 N 人）。
- 行动项摘要：`进行中 · N 项待办` / `已归档 · N 项待办`（读行动项主数据）。
- 关联业务单 chips（当前权限去重后的 `refChips`）。
- 更新时间；有行政来源的显示来源小标识。
- 行点击进入 `/smart-meetings/:id`；顶部「新建纪要」按钮 -> `/smart-meetings/new`。

不可见纪要（biz_member 无权限）在 `summarizeMinutes` 阶段即被过滤，列表不出现。

## 4. 纪要工作台（SmartMeetingWorkbench）

### 4.1 状态与权限驱动的按钮组

| 状态 | 按钮（按角色收敛） |
| --- | --- |
| draft | 保存草稿 / 提交确认 / AI 生成纪要 / 删除（organizer/admin） |
| pending_review | 保存（整理人可改后重新提交）/ 确认（reviewer/admin）/ 驳回（reviewer/admin） |
| confirmed | 撤回修改（organizer/admin）/ 归档（reviewer/admin）/ Markdown 复制 |
| archived | Markdown 复制 |

- 按钮可见性 = `accessControl.viewMinute().canTransitionTo`；非编辑角色只读渲染（表单禁用态）。
- 已确认无「编辑」入口：须先撤回（PRD §5.1）。

### 4.2 SourcePanel（会议文本源）

- 上传区：`点击或拖拽上传会议转写文本`；接受的格式白名单（.txt/.md/.srt/.vtt 等）；不支持格式 toast 明确提示「不支持的格式，请粘贴纯文本」，**不做伪装解析**。
- 粘贴区：`可粘贴纯文本、包含说话人标签的转写记录...` 多行输入。
- 「快速载入会议转写示例」按钮（开发演示种子，对齐原型）。
- 保存后显示：文件名 + 上传时间 + 解析状态徽标（parsed/partial/failed/unsupported）。
- **重新解析生成新草稿，不覆盖原文**；原文仅整理人/确认人/管理员可见（`canSeeSourceText=false` 时该面板整体隐藏）。

### 4.3 MetaPanel

- 会议主题：文本输入。
- 会议时间：`📅 会议时间 (点击下拉选择)` DatePicker。
- 参会人：人员目录多选（`+ 联想添加人员...`，来自共享人员 mock 目录）。
- 整理人 / 确认人：人员目录单选（新建时整理人默认当前用户，确认人必选）。
- 业务引用选择器：`+ 添加项目...` 起始，支持 lead/contract/project/case 四类 Tab 的目录搜索选择；**只读不写业务对象，不允许手输编号**；保存为 `BusinessRef{kind,id,displaySnapshot,savedAsView}`。

### 4.4 DecisionsPanel（核心决议）

- 列表编辑：增删改行，顺序可调。
- AI 解析结果先填充此处（草稿态），人工增删改。

### 4.5 ContentPanel（正文）

- Markdown textarea 编辑 + 预览切换。
- 「AI 润色」按钮：生成 `polishPreview`（不落正文）；预览区提供「采用」「放弃」：采用 -> 正文更新并生成新版本（`reason: 'ai_regenerate'` 同类或单独 polish 版本原因，实现取 `'ai_regenerate'`），放弃 -> 清空预览。润色不改变核心决议与行动项（PRD §6.6）。

### 4.6 ActionItemsPanel（行动项）

表格列：

| 列 | 编辑控件 | 规则 |
| --- | --- | --- |
| 内容 | textarea | 必填 |
| 责任人 | 人员目录选择 | 待指派（null）时标橙 + 「不可确认」提示 |
| 优先级 | P0/P1/P2 徽标点击切换（对齐原型 cyclePriorityBadge） | AI 默认 P1 时行内「待确认」标记 |
| 截止日期 | DatePicker + 「无截止」选项 | 模糊日期不自动推算 |
| 业务引用 | 引用选择器（默认继承会议级，可覆盖） | 可多选 |
| 状态 | 完成 checkbox / 取消按钮 | 已完成行只读，不重开；取消为软取消 |
| 同步就绪 | ✓/✗ 派生自 `isActionItemSyncable` | ✗ 时 tooltip 说明缺什么 |

- 「+ 添加行动项」行内新增，actionItemId 在保存时分配并终身稳定。
- 已确认状态下行动项维护：仅内容/优先级/责任人/截止日期/完成确认可改（不撤回整篇纪要；变更后保存即触发 TODO 同步 diff，见 domain-design §6）。

### 4.7 VersionDrawer

- 版本列表（时间倒序）：`v3 · 确认 · 2026-08-24 14:00 · 张三`。
- 点开版本：只读快照渲染 + 与当前版本 diff 高亮（决议/正文/行动项）。
- 「复制此版本」：复制 Markdown 到剪贴板；**无回滚按钮**。

### 4.8 ConfirmFlowModals

- 提交确认：校验必填（标题/时间/确认人）；二氧确认。
- 确认：提示「确认后行动项将同步至责任人待办」；执行 `confirm` -> 生成版本 -> `diffActionItemsToTodo` -> TodoContext 更新。
- 驳回：必填驳回意见（写入版本备注）；状态保持待确认。
- 撤回：提示「将生成新版本，已同步待办不受影响」。
- 归档：提示「归档不取消未完成待办」。

## 5. 行政来源入口（MeetingManagement.tsx 修改）

- 会议记录 Tab 的操作列新增 `创建智能纪要` 按钮（仅 completed/ongoing 会议显示）。
- 点击 -> `meetingSource.buildAdminSnapshot` -> 跳 `/smart-meetings/new` 并携带快照预填（title/time/organizer/attendees/projectRefs）。
- 已有当前纪要（`hasActiveMinute`）-> 按钮置灰，tooltip「该会议已有智能纪要」。
- 行政会议取消/删除 -> 智能会议侧只更新 `adminSource.sourceStatus`，工作台头部显示「来源会议已取消/删除」提示条。

## 6. TODO 投影展示（待办中心）

- `TodoSource` 增加 `'smart_meeting'` 后，待办中心现有渲染链路自动兼容（source 图标/文案映射表加一行：`智能会议`）。
- 待办中心对 smart_meeting 待办：**不提供完成/忽略按钮**（只读投影；完成在纪要工作台操作）。实现方式：TodoCenter 按 `source === 'smart_meeting'` 收敛操作列。
- 点击待办 -> 直达 `/smart-meetings/:id`（route 字段）。
- 可见性过滤（责任人/会议角色/业务权限）在 TodoContext 取数时按 `accessControl` 谓词过滤。

## 7. α 持久化

- `SmartMeetingContext` 持有 `SmartMinute[]`，`createMockSmartMeetingService` + localStorage（key `smart-meetings/v1`），模式同 `operating-expense/OperatingExpenseContext.tsx`。
- TODO 投影不落 localStorage 新键：直接写入现有 TodoContext 状态（重启后由纪要数据重放同步？**否**——TodoContext 已有 mock 种子，smart_meeting 待办随纪要 mock 种子一起作为 TodoContext 种子注入，运行时 diff 更新）。

## 8. 组件文件清单

```
pages/smart-meetings/
  SmartMeetingContext.tsx        # 状态容器 + service 注入
  SmartMeetingListPage.tsx
  SmartMeetingWorkbench.tsx      # 工作台骨架 + 状态驱动按钮组
  panels/SourcePanel.tsx
  panels/MetaPanel.tsx
  panels/DecisionsPanel.tsx
  panels/ContentPanel.tsx
  panels/ActionItemsPanel.tsx
  panels/VersionDrawer.tsx
  panels/BusinessRefPicker.tsx   # 四类目录选择器（复用给行动项）
  panels/ConfirmFlowModals.tsx
```

## 9. UI 验收要点（编码后浏览器点验用）

1. 新建 -> 粘贴文本 -> AI 生成 -> 编辑 -> 提交 -> 驳回 -> 再提交 -> 确认 -> 待办中心出现行动项待办。
2. 确认后行动项改责任人 -> 待办中心同一待办更新（数量不变）。
3. 撤回 -> 改正文 -> 再确认 -> 版本 +2，旧版本只读可复制。
4. 草稿可删；待确认/已确认/已归档无删除按钮。
5. 待办中心 smart_meeting 待办无完成/忽略按钮；点击直达工作台。
6. 行政会议入口创建纪要带快照；二次进入置灰。
7. 上传 .pdf 等不支持格式 -> 明确提示不解析。
