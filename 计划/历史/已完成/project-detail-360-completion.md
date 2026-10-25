# 项目详情 360 构造完成（对齐线索详情结构 + 五域接通共享数据）

> 日期：2026-08-20
> 状态：已完成（编码+测试+文档对齐，待「下班」一并提交发布）
> 背景：路由 `projects/:id` 指向的 `ProjectDetail360.tsx` 是展示壳——所有业务数据为页面局部 mock，「报价历史」写死空表，与线索/合同/报价域零联动；且存在两套项目 mock 同名 id 分叉的裂缝。

## 本次做了什么

### 阶段 0：项目数据层统一（PROJECT_LIST 唯一事实源）

- `projectMockData.ts` `PROJECT_LIST` 8 条补齐 `leadId` / `contractId`（按客户名对齐合同 mock：项目1->lead-1/合同1、项目2->lead-2/合同2、项目6/7/8->lead-6/7/8/合同6/7/8）。
- **项目 3 统一为华信口径**：原「C集团OA流程优化」改为「华信科技内部OA流程优化」（lead-9 / 合同9），保住 lead-9 完整演示链路（线索详情->项目执行->售前历程）。老数据里 LS001/LS002（星河/青橙）链路确认无实际消费，随老数据退役。
- `mockData.ts` `initialProjects` 不再独立维护，改为从 `PROJECT_LIST` 派生（角色团队/附件收进 `PROJECT_EXTRAS` 按 projectId 维护）——ProjectContext（共享 Context）种子随之统一，消除「列表页 8 条 vs Context 5 条」分叉。
- 报价域两条 mock（QT-2026-1/2）项目名客户口径对齐（原「和昇塑料/瑞康医疗」->「A公司CRM / B公司小程序」）。
- `leadDetailProfiles.ts` 新增 lead-1 / lead-2 专属 profile（此前只有 lead-9 有），售前历程面板对项目 1/2 不再显示默认假数据。

### 阶段 1：共享业务数据补齐（只增不删）

- `types.ts` 新增 `ProjectMeetingMinutes` / `ProjectConfirmation` / `ProjectDemoEnv`；`projectMockData.ts` 新增三套按 projectId 组织的台账 + `getMeetingsByProjectId` 等读取函数。
- 任务复用现有 `projectTasks.ts`，日报复用 `initialDailyReports`，回款期次从合同域 `paymentPlans` 读取。

### 阶段 2：ProjectDetail360 重构（对齐 LeadDetail360 结构）

- 结构：头部控制台（元数据+生命周期 Steps+6 维指标胶囊）→ 70:30 主体。
  - 左侧 70%：项目档案卡 + 主 Tab（基础信息 / 合同信息 / 回款与发票 / 团队与工时 / 日报 / 任务管理 / 项目动态）。
  - 右侧 30% 次级 Tab：跟进 / 报价 / 合同记录 / 售前历程 / 会议纪要 / 演示 / 资料（确认书+文档）/ 出差 / 报销。
- 跨域接通：报价接 QuotationContext（新建报价 `createQuote` + `QuotationWorkbench` 全屏抽屉）；合同接 ContractsContext（contractId 优先、leadId 兜底匹配，卡片跳 `/contracts/:id`）；售前历程复用 `ProjectPresalesHistoryPanel`；线索详情的 `getProjectByLeadId` 反查随 Context 统一自动打通。
- **修复**：任务编辑 Modal 原来永远 push 新任务（编辑=新增重复项），改为 editingTaskId 区分更新/新增。
- `QuoteCard` 从 LeadDetail360 抽为共享组件 `quotation/QuoteCard.tsx`，两处共用。

### 阶段 3：测试

- 新增 `__tests__/ProjectDetail360.test.ts`（6 测试：SSR 渲染结构 / 华信口径 / 报价空态 / 兜底空态 / 数据缝对齐 / 台账函数）。
- 更新 `projectDetailSummary.test.ts`（项目 3 改名 + contractId='9'）、`workAttribution.test.ts`（新增自研业务线项目，内部项目选项非空）。

## 验证

- `npm test`：36 文件 / 531 测试全绿（基线 525 + 新增 6）。
- `npm run build`：通过。
- dev server `/projects/1`、`/projects/3` 可访问。

## 不做什么（本次范围外）

- 项目成本核算 / 报价配置器 / 质量面板（老 Workspace 的 `ProjectCostPanel` 等）未迁入 360 页，仍在成本页路由使用。
- 老 `ProjectDetail.tsx` + `ProjectDetailWorkspace.tsx` 保留（不在路由，仅测试引用），后续可择机清理。
- Bug 明细、出差、报销为页面局部演示数据（与线索详情同口径，无跨页共享层）。

## 文档对齐

- 功能看板：`featureBoard.config.json` + `featureBoardModel.ts`「项目基础信息」描述更新为 ProjectDetail360 新结构。
- 架构图：「项目管理」module-items 补 360 详情 / 报价合同联动 / 回款期次 / 会议纪要等。
- PRD：项目管理无专项 PRD 稿，无需更新。

## 踩坑

- vitest 必须在 `apps/prototype` 目录下跑（或 `npm test` 走 workspace），在 HubX 根目录直接 `npx vitest` 不加载 vite.config 的 `@` 别名，会误报 `Failed to load url @/app/business-case`。
- Arco `Descriptions` 的 `data` 里 `??` 与 `||` 混用需加括号（esbuild 报错）。
