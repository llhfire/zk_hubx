# 智能会议实现计划（smart-meetings-dev-plan.md）

> 状态：设计与计划已定稿，**未编码**。业务规则：`文档/PRD/PRD-智能会议.md`；领域/UI/AI-β 设计：同目录三份 design 文档；边界总纲：根目录 `PLAN.md`。
> 阶段划分对齐 PLAN.md §三实现阶段；每阶段含验收标准，全部完成前不宣称模块完成。

## 阶段 A：领域底座（纯函数 + 测试，无 UI）

**产出**

- `pages/smart-meetings/types.ts`
- `minuteStateMachine.ts` / `versioning.ts` / `accessControl.ts` / `actionItemSync.ts` / `boardQueries.ts` / `meetingSource.ts` / `aiParser.ts`
- `todos/types.ts`：`TodoSource` 增加 `'smart_meeting'`
- `__tests__/` 七个测试文件（清单见 domain-design §10）

**不做**：任何页面组件、路由、Context、mockData。

**验收**

- `npx vitest run src/app/pages/smart-meetings` 全绿。
- 现有全量 `npm test` 不回归（TodoSource 扩展为纯类型，理论零影响）。

**估时**：领域 7 文件 + 7 测试文件，一次会话可完成。

## 阶段 B：α 数据与列表页

**产出**

- `mockData.ts`（种子：≥3 篇各状态纪要 + 行动项 + 行政来源一篇 + TODO 种子注入）
- `minuteService.ts`（接口 + mock/localStorage 实现）
- `SmartMeetingContext.tsx`
- 路由 `/smart-meetings`、`/smart-meetings/new`、`/smart-meetings/:id`；MainLayout 一级菜单
- `SmartMeetingListPage.tsx`（MonthStatsBar + FilterBar + MinuteList）

**验收**

- 浏览器：列表统计口径正确（不混行政会议、不统计草稿）、搜索/筛选全维度可用、点行进入工作台（此时为空态骨架）。
- `npm run build` 通过。

## 阶段 C：工作台 + TODO 投影 + 行政入口

**产出**

- `SmartMeetingWorkbench.tsx` + panels 全套（Source/Meta/Decisions/Content/ActionItems/VersionDrawer/BusinessRefPicker/ConfirmFlowModals）
- α AI：`aiParser` 接入「AI 智能提取并生成纪要」与「AI 润色」
- `MeetingManagement.tsx` 加「创建智能纪要」入口（快照预填 + 置灰规则）
- `TodoContext`/`TodoCenter`：smart_meeting 待办只读投影（无完成/忽略按钮，route 直达）
- confirm 触发 `diffActionItemsToTodo` 接 TodoContext

**验收**（浏览器全链路，ui-design §9 七条）

1. 新建 -> 粘贴 -> AI 生成 -> 提交 -> 驳回 -> 再提交 -> 确认 -> 待办中心出现待办。
2. 行动项改责任人 -> 同一待办更新不重建。
3. 撤回 -> 改正文 -> 再确认 -> 版本 +2 只读。
4. 草稿可删，其余状态无删除。
5. 待办中心 smart_meeting 待办只读 + 直达。
6. 行政入口快照 + 二次置灰 + 来源取消不删纪要。
7. 不支持格式明确提示。

## 阶段 D：β 接线（须功能看板 productionOn 许可后开工）

**产出**（设计见 ai-and-beta-design §3）

- `apps/api/schema.sql`：smart_minutes 表
- `apps/api/src/index.ts`：CRUD 端点 + 服务端不变量校验（DELETE 仅 draft、version 乐观锁）
- `createHttpSmartMeetingService` + Context 接缝切换
- 更新 `HubX/docs/ZK-HubX技术架构.html`（D1/接线/洞）

**验收**：β 环境 D1 读写、409 乐观锁、403 非 draft 删除；α 行为不变。

## 阶段 E：β AI 服务（须密钥与账号）

**产出**：extract/polish 端点 + Secret；前端 AI 接缝切 β。
**验收**：AI 结果仍为草稿、失败回落手工编辑、密钥不出服务端。

## 里程碑外（本期不做）

见 PRD §9；以及：服务端 TODO 生成、行动项子表拆分、流式 AI 输出、外部推送。

## 风险与注意

1. **TodoSource 扩展**是全链路唯一动现有类型的点，先跑全量测试确认零回归。
2. TODO 种子注入与运行时 diff 的重放边界：mock 种子里直接带 smart_meeting 待办，运行时只 diff 不重建（避免重启重复创建）。
3. 行政会议 `Meeting` 结构是页面局部 mockData（MeetingManagement.tsx 内），创建入口须从该文件导出或以 props 传递，不复制结构。
4. localStorage key `smart-meetings/v1` 带版本号，schema 演进时换 v2 不做原地迁移（原型级持久化）。
5. 阶段 D/E 开工前必须先对齐功能看板 `productionOn` 与 β 计划条目，遵守 PLAN.md §六约束。
