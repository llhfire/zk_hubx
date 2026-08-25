# 项目详情 360 原型样式对齐——详细开发计划

> 立项：2026-08-21（grill 收束 9 项边界决策，见文末附录）
> 事实源：`research/ZK-HubX-项目管理-ArcoDesign-70-30全功能交互原型.html`（只取详情页部分）
> 改动面：仅项目详情页；列表页（指标驾驶舱/看板）**不在本次范围**
> 状态：**计划已完成，未写生产代码**

---

## 一、现有接缝盘点（UI 元素 -> 数据源映射）

| UI 元素 | 数据源 | 现状结论 |
|---|---|---|
| 6 维胶囊数值 | `PROJECT_LIST`（types.ts `ProjectListItem` 计算字段：totalHours/budgetHours/bugP0Count/bugP1Count/daysRemaining/isOverdue/receivedAmount/contractAmount） | 已有，胶囊只需改样式+可点击 |
| 工期倒计时 | `getProjectCountdown()`（utils.ts） | 已有 |
| 生命周期步骤 | `getLifecycleStepIndex()`（types.ts） | 已有 |
| 主合同/补充协议 | `ContractsContext` -> `supplementaryAgreements[]`（含 amountChange/status/paymentPlans/collectionRecords） | 已有，Tab 需卡片化 |
| 回款期次 | 主合同 + 各补充协议的 `paymentPlans` + `collectionRecords` | 需新纯函数合并 |
| 发票 | `finance/ProjectInvoiceContext`：`ProjectInvoiceApplication`（projectId+periodId 键，status 开票中/已开票/已冲红，amount） | 需确认 Provider 覆盖 /projects/:id |
| 岗位已投入工时 | `initialDailyReports` + `buildProjectMemberHours()`（mockData.ts，已按人聚合） | 已有，需新增按岗位聚合 |
| 岗位计划人天 | 无 | 需新增 mock（PROJECT_EXTRAS 同模式） |
| 客户工商档案 | 线索 profile（客户名/对接人/电话）+ CustomerDetail 同口径局部 mock（信用代码/开票） | 需补 mock |
| 技术架构档案 | 无 | 需新增 mock |
| 大事记事件流 | `ACTIVITY_EVENTS` + `getActivitiesByProjectId()`（type: followup/meeting/confirmation/milestone/daily_report/contract/status_change，含 isPreSale） | 需新筛选纯函数 |
| 报价 | `QuotationContext` + `QuoteCard` + `QuotationWorkbench` 抽屉 | 已接通，不动 |

---

## 二、阶段 1：数据层 + 纯函数（先写测试）

### 1.1 types.ts 新增类型（只增不删）

```ts
/** 技术架构档案（按 projectId，PROJECT_TECH_PROFILES 台账） */
export interface ProjectTechProfile {
  projectId: string;
  frontendStack: string;   // 前端技术栈
  backendStack: string;    // 后端与数据库
  externalSystems: string; // 外部对接系统
  collaborationGroup?: string; // 协同微信群名
}

/** 岗位计划人天（按 projectId，PROJECT_ROLE_PLANS 台账） */
export interface ProjectRolePlan {
  projectId: string;
  role: string;        // 岗位角色：产品经理/UI/前端/后端/测试/运维
  members: string[];   // 指派成员（与 PROJECT_EXTRAS 角色名单同口径）
  plannedDays: number; // 计划人天
}

/** 客户工商档案（页面局部 mock，与 CustomerDetail 同口径，标注待共享层） */
export interface ProjectCustomerProfile {
  projectId: string;
  customerName: string;     // 取线索 profile
  contactName?: string;     // 对接人
  phone?: string;
  creditCode?: string;      // 统一社会信用代码（mock）
  invoiceTitle?: string;    // 开票抬头与信息（mock）
}
```

### 1.2 projectMockData.ts 新增三套台账 + 读取函数（沿用现有模式）

- `PROJECT_TECH_PROFILES: ProjectTechProfile[]`，8 个项目补齐；`getTechProfileByProjectId()`
- `PROJECT_ROLE_PLANS: ProjectRolePlan[]`，至少项目 1/3 完整（演示链路），其余给默认值；`getRolePlansByProjectId()`
- `PROJECT_CUSTOMER_PROFILES: ProjectCustomerProfile[]`，项目 1/2/3 有工商 mock；`getCustomerProfileByProjectId()`

### 1.3 新文件 `project-management/diagnosticModel.ts`（诊断派生纯函数）

```ts
export type DiagnosticDimension = 'pm' | 'client' | 'contract' | 'schedule' | 'hours' | 'bug';
export type DiagnosticVerdict = 'success' | 'warning' | 'danger';

export interface DiagnosticMetric { label: string; val: string; }
export interface DiagnosticReport {
  dimension: DiagnosticDimension;
  title: string;
  verdict: DiagnosticVerdict;
  verdictTitle: string;      // 结论一句话
  verdictDesc: string;       // 结论描述（含插值）
  metrics: DiagnosticMetric[];      // 2x2 指标剖析
  blockers: string;          // 风险归因文案
  recommendations: string[]; // 处置建议列表（1~2 条）
  drillDownTab: string;      // 钻取目标主 Tab key
  actionText: string;        // 采纳处置建议按钮文案
}

export function buildDiagnosticReports(input: DiagnosticInput): Record<DiagnosticDimension, DiagnosticReport>;
export function getDimensionAlertLevel(report): 'none' | 'warning' | 'danger'; // 胶囊徽标颜色
```

**派生输入 `DiagnosticInput`**（全部来自现有 metrics/合同/台账，不新增推导数据源）：
`project: ProjectListItem`、`countdown`（getProjectCountdown 结果）、`contracts: Contract[]`（含补充协议）、`confirmations: ProjectConfirmation[]`、`dailyReports: ProjectDailyReport[]`、`rolePlans: ProjectRolePlan[]`

**六维阈值规则（v1 口径，写在代码注释与测试里）：**

| 维度 | danger 条件 | warning 条件 | 钻取 Tab |
|---|---|---|---|
| pm（团队配置） | 岗位空缺（某 rolePlans 行 members 为空）且状态≠未确认 | 本月日报填报人 < 2 人 | team |
| client（客户协同） | 存在待签署确认书且已过 expectedDate | 存在待签署确认书 / 补充协议 pending_return | basic |
| contract（合同回款） | 有期次已逾期未回（expectedDate < 今天且未收全） | 回款比例 < 50% 且状态进行中/验收中 | payments |
| schedule（交付工期） | isOverdue 或 status='延迟' | 剩余天数 < 14 且 progress < 80 | tasks |
| hours（工时成本） | totalHours / budgetHours >= 100% | 占比 >= 75% | team |
| bug（缺陷质量） | bugP0Count > 0 | bugP1Count > 0 | tasks |

- verdictTitle/verdictDesc/blockers/recommendations 用**规则映射模板文案**（按维度 x verdict 预置模板，插值实际数值，如「工时消耗已达 {pct}%，剩余 {rest}h」）
- pm 维不推导「负载」类无数据源指标；指标卡只放可派生项（PM 名/团队人数/本月日报条数/岗位计划人天合计）

### 1.4 新文件 `project-management/paymentLedger.ts`（跨合同合并台账纯函数）

```ts
export interface PaymentLedgerRow {
  key: string;
  contractLabel: string;   // '主合同' | 补充协议名
  periodName: string;
  amount: number;
  condition?: string;
  expectedDate: string;
  receivedAmount: number;  // collectionRecords 按 contractId+period 聚合
  paymentStatus: '已收全款' | '部分回款' | '待回款' | '已逾期';
}

export function buildPaymentLedgerRows(contracts: Contract[]): PaymentLedgerRow[];
export function getEffectiveContractAmount(mainContract): number; // 已归档主合同 + Σ(archived 补充协议 amountChange)，符合 CONTEXT.md 口径
```

- 已逾期判定：expectedDate < 今天 且 receivedAmount < amount
- 发票状态列**不进纯函数**（页面从 `ProjectInvoiceContext.findApplication(projectId, periodId)` 查，查不到显示「待申请」）——periodId 拼法实现时对齐 ProjectInvoicePage 现有约定

### 1.5 utils.ts 新增（或独立 majorEvents.ts）

```ts
/** 大事记筛选：只保留 milestone/contract/confirmation/status_change（含售前里程碑） */
export function filterMajorEvents(events: ActivityEvent[]): ActivityEvent[];

/** 日报 CSV 导出：UTF-8 BOM + csvEscape，返回 Blob */
export function exportDailyReportsCsv(projectNo: string, reports: ProjectDailyReport[]): void;
```

### 1.6 阶段 1 测试（新增 3 个测试文件）

- `__tests__/diagnosticModel.test.ts`：六维 verdict 阈值边界（76%/100%、P0=1、逾期期次、待签确认书）、模板插值正确、钻取 Tab 映射
- `__tests__/paymentLedger.test.ts`：主合同+补充协议期次合并、部分回款/逾期判定、getEffectiveContractAmount 只算 archived
- `__tests__/majorEvents.test.ts`：过滤规则（followup/meeting/daily_report 被排除、isPreSale 里程碑保留）、csvEscape 转义（逗号/引号/换行）、CSV 含 BOM

---

## 三、阶段 2：页面重构（ProjectDetail360.tsx + 新抽屉组件）

### 2.1 组件拆分

- **新文件 `project-management/detail/ProjectDiagnosticDrawer.tsx`**（约 300 行）：720px Drawer，props `{ reports, visible, dimension, onChangeDimension, onDrillDown }`；内部结构 = 6 维切换胶囊 + verdict 结论框（success/warning/danger 三色）+ 指标 2x2 + 风险归因块 + 处置建议列表 + 底部「采纳处置建议」按钮（= 调 onDrillDown 切主 Tab 并关抽屉）+「查看完整台账」链接（同钻取）
- **ProjectDetail360.tsx 主体改造**，其余 Tab 内容保持页面内（沿用现状风格，不进一步拆分）

### 2.2 头部控制台（三合一单卡）

1. 标题行：现有元数据 + 行动栏（登记跟进/新建任务/录入纪要/甘特图，按钮不变），去掉独立 Divider 布局改原型紧凑排列
2. 生命周期 Steps：现有逻辑不动，仅调 size/样式密度
3. **胶囊改 6 列 grid**（Grid.Row 6 Col 或 CSS grid），每格：label 行（含 ●正常 / ! 预警徽标）+ 值行；背景按 alert 级别（warning/danger 浅色底）；**onClick 打开诊断抽屉**并定位到对应维度
4. 删除三张分离 Card，合并为一张 `Card`

### 2.3 左侧 7 主 Tab 改造点

| Tab | 改造 |
|---|---|
| 基础信息 | 双栏：左「客户工商与商务档案」表（getCustomerProfileByProjectId）+ 右「技术架构与系统对接」表（getTechProfileByProjectId）；替换现有 14 字段 Descriptions |
| 合同信息 | 主合同大卡（编号/名称/标的/签约日/状态 Tag/已回款）+ 补充协议卡片列表（name/amountChange 正负色/状态 SUPPLEMENT_STATUS_LABELS/签约日/附件名）；右上「发起补充合同」按钮 -> `navigate('/contracts/' + mainContract.id)`；补充协议卡也点击跳合同详情 |
| 回款与发票 | 4 指标卡（有效总标的 getEffectiveContractAmount / 已到账 / 待催收 / 已开专票-ProjectInvoiceContext 聚合）+ `buildPaymentLedgerRows` 表格 8 列（所属合同/期次/应回/触发条件/计划日期/实际到账/状态/发票状态） |
| 团队与工时 | 左：岗位表格（rolePlans join 日报按岗位聚合的已投入工时/占比）；右：预算环（现有三卡 + Progress 改为环形/粗进度条） |
| 日报 | 表格不变 + 右上「导出日报台账」按钮 -> `exportDailyReportsCsv` |
| 任务管理 | 不动（Bug Tracker 已在 Tab 内） |
| 项目动态 | **改大事记**：顶部说明横幅（Alert，文案对齐 CONTEXT.md 大事记定义）+ `filterMajorEvents(activities)` 事件卡片列表（milestone/contract 左侧色条区分）；**删除**现有四维健康诊断卡（被抽屉替代）与事件类型筛选 Tag 组 |

### 2.4 右侧 9 次 Tab 改造点

- 跟进：时间轴节点加里程碑紫色标记（关键节点跟进显示 tag）
- 其余 8 个 Tab：不动

### 2.5 跟进 Modal：关键节点标记

- 新增 `milestoneTag` Select（可空）：预置 6 项——原型与交互确认书盖章 / UI设计确认书盖章 / 需求增项确认单签署 / 阶段验收单签署 / 项目终验报告签署 / 关键版本交付上线（与 PROJECT_CONFIRMATIONS 的 type 口径对齐）
- 提交时：插右侧跟进流水（现状逻辑）+ **若勾选**，同时生成 `ActivityEvent { type: 'milestone', title: 节点名 }` 追加到页面局部 activities state（与 tasks 同口径：共享台账初始化 + 页面内可增）
- 跟进记录需要携带 milestoneTag 字段吗：**不加到 ProjectFollowUp 类型**，仅生成 milestone 事件即可（避免跟进模型膨胀），里程碑信息在大事记里

---

## 四、阶段 3：验证清单

1. `npm test` 全绿（预期新增 ~20 用例，更新 ProjectDetail360.test.ts 断言：诊断抽屉打开/胶囊可点/大事记横幅/回款 4 卡/岗位表格）
2. `npm run build` 通过（注意 Arco Descriptions data 里 `??`/`||` 混用要加括号——历史踩坑）
3. **dev server 过页面**（type-only import 重复声明只有 dev 的 babel 报，build/测试抓不到——历史踩坑）：/projects/1（完整链路：胶囊 6 维可点、抽屉钻取、大事记、补充协议卡、回款 8 列）/projects/3（华信链路）/projects/5（无合同项目，验证空态）
4. 发票接缝确认：ProjectDetail360 是否在 ProjectInvoiceProvider 树内；若不在，第 4 卡与发票状态列降级（显示合同域 blockers 推断值）并记录到计划的踩坑节

## 五、阶段 4：文档四联动收尾

- 本计划已立；CONTEXT.md「大事记」术语已加；看板/架构图已随 grill 更新
- 编码完成后：看板 planned 条目移入 features 描述（项目基础信息 description 更新）；架构图如需再对齐
- PRD：无需改（项目管理无专项 PRD 稿）

---

## 六、风险与依赖

| 风险 | 缓解 |
|---|---|
| ProjectInvoiceProvider 未覆盖 /projects/:id 路由 | 实现前先验证；降级方案已备（第 4 卡从合同域推导） |
| ProjectDetail360.tsx 膨胀（1170 -> 预计 ~1600 行） | 诊断抽屉独立文件；其余维持现状风格 |
| 大事记改版破老断言 | ProjectDetail360.test.ts 属预期破坏，更新断言 |
| collectionRecords 与期次 period 对不上（部分合同无回款记录） | receivedAmount 默认 0，状态显示「待回款」，空态合理 |
| 诊断模板文案生硬 | 文案集中在 diagnosticModel.ts 常量，便于单独润色 |

## 七、不做（边界外，防蔓延）

列表页驾驶舱/看板；补充合同创建 Modal；PM 负载/延期预测/毛利率预测等无数据源指标；Bug/出差/报销跨页共享层；右侧 8 个次 Tab 重构。

---

## 附录：grill 收束的 9 项边界决策

| # | 决策点 | 结论 |
|---|---|---|
| 1 | 替换范围 | 只替换详情页 |
| 2 | 样式实现 | Arco 组件 + 局部样式对齐，不搬原型自定义 CSS |
| 3 | 智能诊断抽屉 | 迁入，按规则从 metrics 派生，行动按钮=钻取 |
| 4 | 项目动态 | 收敛大事记；跟进关键节点标记同步；砍类型筛选 |
| 5 | 补充合同 | 卡片化展示 + 跳合同域创建 |
| 6 | 团队与工时 | 岗位表格（日报聚合 + 新增计划人天 mock） |
| 7 | 基础信息 | 双栏 + mock 补齐 |
| 8 | 回款与发票 | 4 卡 + 跨合同合并台账完整对齐 |
| 9 | 日报导出 | CSV 真导出 |
