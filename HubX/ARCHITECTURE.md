# ZK HubX 架构文档

> 本文是 `CLAUDE.md` 的深化版：定位与边界规则、代码功能拆解、模块关系全景。
> 与 `CLAUDE.md`（命令/约定）和 `CONTEXT.md`（业务术语/模块全景）配合阅读。
> 完整的功能与规则总览见 [`docs/SYSTEM-OVERVIEW.md`](docs/SYSTEM-OVERVIEW.md)。

## 一、产品定位

**ZK HubX（ZK = 中科）是贴合中科集团业务流程、供集团内部使用的管理工具。**

- 单租户、内部自用，不是对外售卖的 SaaS，也不是多租户系统。
- 服务对象是中科集团内部员工（销售、投放、交付、财务、管理层等）。
- 业务范围是中科集团自身的业务漏斗：**广告投放 → 线索 → 客户 → 合同 → 项目 → 交付 → 利润**。

### 产品边界规则（新增功能前必查）

任何新增功能，先回答下面问题，**答不上来即视为越界**：

1. **服务对象**：这个功能服务中科集团哪个内部岗位/管理场景？
2. **业务环节**：它落在业务漏斗的哪个环节（投放/线索/客户/合同/项目/交付/利润/内部行政）？
3. **越界清单**：以下场景默认不做，除非用户明确改定位——
   - 租户隔离 / 多公司数据隔离
   - 对外售卖、计费、开放平台、客户自助门户
   - 面向外部客户而非内部员工的功能

新增功能时应主动向用户确认「这个功能是否服务于中科集团内部管理」，而不是默认假设对外 SaaS 能力。

---

## 二、技术栈

| 层 | 技术 |
|---|---|
| 框架 | React 18 + Vite 6 |
| 路由 | React Router 7（`createBrowserRouter`） |
| 业务 UI | Arco Design（`@arco-design/web-react`，主力） |
| 通用 UI | 已清除 shadcn/Radix，业务统一用 Arco（见 git tag `pre-cleanup-20260813`） |
| 样式 | Tailwind v4 + CSS 变量主题（入口 `src/styles/index.css`） |
| 图表/拖拽/表单 | recharts / react-dnd / react-hook-form / react-quill |

---

## 三、应用分层

```
main.tsx (挂载点)
 └─ App.tsx (应用壳层)
     └─ 9 个 Context Provider（全局状态层）
         └─ RouterProvider → MainLayout (根布局)
             └─ Outlet → 70+ 页面（按业务域划分）
```

### 全局状态：9 个 Context

| Provider | 文件 | 职责 |
|---|---|---|
| `IntegrationProvider` | `integrations/IntegrationContext.tsx` | 企业微信等集成 |
| `ApprovalProvider` | `approvals/ApprovalContext.tsx` | 通用审批 |
| `TodoProvider` | `todos/TodoContext.tsx` | 待办中心 |
| `FeedbackProvider` | `feedback/FeedbackContext.tsx` | 意见反馈 |
| `ReminderProvider` | `reminders/ReminderContext.tsx` | 提醒（每分钟刷新） |
| `EmployeeProvider` | `pages/employee/EmployeeContext.tsx` | 员工/考勤/绩效/职级时薪 |
| `JobWorkConfigProvider` | `pages/daily-report/JobWorkConfigContext.tsx` | 日报工作种类配置 |
| `ContractsProvider` | `pages/contracts/ContractsContext.tsx` | 合同全生命周期 |
| `ProjectInvoiceProvider` | `pages/finance/ProjectInvoiceContext.tsx` | 项目开票 |

---

## 四、核心模块拆解

### 1. 合同模块（`pages/contracts/`，43 文件）—— 状态机 + 版本快照 + 模板渲染

- **数据模型**：`Contract` 一个对象挂全部生命周期数据——`current`(可编辑表单) + `versionHistory`(版本快照) + `approvalFlow`/`approvalRounds`(审批) + `archivedScans`(扫描归档) + 回款扩展。
- **状态机**：`draft → approving → pending_mail → pending_return → archived → voided`。
- **版本快照**：每次保存/提交把 `current` 整体克隆进 `versionHistory`，`approvedVersionNo` 指向终稿。
- **模板系统**：`templates/index.ts` 注册 3 个模板（软件销售/服务/云服务），每个 `render(formData): string` 返回 HTML 供 `dangerouslySetInnerHTML`。
- **Context**：`ContractsContext` 暴露 20 个方法（创建/版本/审批/邮寄扫描/回款/作废）。
- **页面**：`ContractWizard`(新建) / `ContractEditor`(1118行，编辑+审批) / `ContractDetail`(详情，复用 `leads/components` 的 4 个面板) / `ContractKanban` / `PaymentKanbanV2` / `PaymentForecast`。
- **子组件**：`components/` 16 个（状态徽标、动作栏、时间线、回款看板、扫描列表）。

### 2. 提醒系统（`reminders/`，14 文件）—— adapter 聚合 + 纯函数

- **模式**：`buildReminders` 聚合 4 个 adapter（审批/日报/线索/合同）→ `filterVisibleReminders`(小睡过滤) → `sortReminders`(优先级→截止→创建)。
- **`actionTarget` 判别联合**：`{kind:'route', path}` 或 `{kind:'modal', modal:'daily-report'}`，数据驱动点击行为。
- **纯函数**（`utils.ts`）：`isLeadOverdue`(三级判断) / `resolveSnoozeUntil` / `sortReminders` / `filterVisibleReminders`。
- **Context**：每分钟 `setNow` 触发 `useMemo` 重算提醒。

### 3. 日报系统（`pages/daily-report/`，16 文件）—— 类型驱动 + 三级建模

- **三级建模**：岗位(position) → 规则(`DailyReportRule`，决定 templateType/workKinds/costBucket) → 模板(`DailyTemplate`，fields 数组) → 内容(`DailyReportContent` 联合类型)。
- **8 种 `FieldType`**：text/textarea/lead-tracking/project-task-list/date/select/number/ad-delivery-table，表单控件由字段类型决定。
- **4 个模板组件**：`SalesDailyTemplate`/`GeneralDailyTemplate`/`AdDeliveryDailyTemplate`/`DevDailyTemplate`。
- **`DailyReportModal`**（558 行）：会话态初始化、日期切换、模板选择、校验、提交组装；被 `MainLayout` 和 `Dashboard` 复用。
- **对外辐射**：`WORK_KIND_ABILITY_MAP`(12 工种→能力维度+经验值，驱动员工能力成长)；`DailyCostBucket`(成本桶，驱动项目成本核算)。

### 4. 线索模块（`pages/leads/` + 根散页，~7000 行）—— 业务枢纽

- **`LeadDetail`**（2186 行，全仓最大单文件之一）消费 `Reminder`/`Contract`/`Employee` 三个 Context，组装 8 个面板。
- **纯函数层**：`quotationPricing.ts`(报价计算) / `paymentInvoiceModel.ts`(回款/开票状态机) / `leadDetailContracts.ts`(合同→卡片映射)。
- **跨模块**：线索→合同转化(`buildLeadContextFromDetail`)、`entity` 对齐公司主体、提醒 ID 规范化(`normalizeLeadReminderId`)。

### 5. 项目成本核算（`contract-cost/` + `project-management/`）

- **公式**：项目利润 = 合同金额 − 项目成本；项目成本 = 研发人力 + 商务 + 外包 + 其他 + 分摊运营。
- **研发人力成本** = Σ(日报工时 × 时薪)；时薪 = `actualSalary/actualHours` 或名义值(`getHourlyRate`)。
- **关键映射**：`contractProjectMap`(合同ID→项目ID[])，`contractCostData.ts` 直接 `import` `project-management/mockData` 的 `initialDailyReports`。
- **5 类成本**：科研(研发人力)/商务/外包/其他/分摊运营（`ContractCostDetail.tsx`）。

### 6. 审批系统（`approvals/`，5 文件）—— 双层模型 + localStorage

- **双层**：`WorkflowTemplateDefinition`(模板：节点+策略+驳回) → `BusinessApprovalDefinition`(业务：节点→具体审批人)。
- **策略**：单人审批/或签/会签；驳回至发起人；来源 hubx/wecom。
- **持久化**：`localStorage`（key `hubx-workflow-templates-v2`、`hubx-business-approvals-v2`）。
- 与合同内置的 `approvalFlow`（5 步审批节点）是两套独立系统。

### 7. 待办中心（`todos/`，3 文件）

- 7 种来源（approval/lead_followup/daily_report/project_task/wecom_approval/customer_communication 等）。
- `TodoItem` 带 `route`(跳转) + `snoozedUntil`(小睡) + `external`(企业微信外部待办)。
- 持久化：`localStorage`（key `hubx-todo-center-v1`）。

### 8. 员工能力建模（`pages/employee/`，8 文件）

- `EmployeeProvider` 管 5 类数据：employees(含五维能力值)/attendance/performanceReviews/levelRates/positions。
- **级联更新**：`updateLevelRate` 更新职级时薪时，同步级联更新该职级该职位下员工的 `standardHourlyRate`（喂给成本核算）。
- 页面：`EmployeeList`(942)/`EmployeeDetail`(592，能力面板)/`AttendanceManagement`/`PerformanceManagement`/`LevelRateSettings`(时薪配置)。

### 9. 交付计划（`pages/delivery-plan/`，13 文件）—— SOP 七大板块

- **七大板块**：合同交接 → 项目启动准备 → 项目交付执行 → 资质备案&上架 → 测试验收 → 运维支持 → 项目总结。
- **`DeliveryType`**（7 种交付类型）决定板块四的适用步骤（`DELIVERY_TYPE_PHASE4_STEPS`）。
- **`sopTemplate.ts`**：`SOP_STEP_TEMPLATES` + 步骤依赖 + 板块依赖。
- **`utils.ts`** 10 个纯函数 + **723 行测试**（全项目测试最完整）：`addBusinessDays`/`filterPhase4Steps`/`derivePhaseStatus`(取最落后)/`calcPhaseCompletion`(skipped 排除分母、in_progress 算 0.5)/`generateDeliveryPlan` 等。
- 组件：`DeliveryPlanPage`(641) + `GanttChart`(538，甘特图) + `TaskList` + 3 个 Modal。

---

## 五、贯穿性架构规律

1. **数据层三态**：绝大多数模块是「Context 持有纯内存 mock + 纯函数计算」；仅审批和待办用 `localStorage` 持久化；全程无网络层。
2. **纯函数 + 测试**：复杂模块把手算逻辑抽成独立 `.ts` 纯函数配 Vitest 测试（标杆：交付计划 723 行测试）。
3. **跨模块靠 import 共享 mock**：`contractCostData` import `project-management/mockData`、`reminders` import `daily-report/types`，用模块依赖图模拟真实业务依赖，而非全局 store。
4. **业务漏斗主线**：投放 → 线索 → 客户 → 合同 → 项目 → 交付 → 利润，模块之间通过这条链串联。

---

## 六、模块关系全景

```
                    App.tsx — 9 个 Context Provider
                                        │
                        MainLayout（侧边栏+顶栏+菜单+提醒+日报）
                                        │
   ┌────────────┬────────────┬────────────┼────────────┬────────────┐
   │ 线索        │ 合同        │ 项目        │ 日报        │ 财务/成本    │
   │ LeadDetail │ Contract   │ Delivery   │ DailyReport │ ContractCost│
   │ (枢纽)      │ (状态机)    │ Plan(SOP)  │ (模板驱动)   │ (时薪×工时)  │
   └─────┬──────┴─────┬──────┴─────┬──────┴─────┬──────┴─────┬──────┘
         └────────────┴────────────┴────────────┴────────────┘
                        业务漏斗：投放→线索→客户→合同→项目→交付→利润
```
