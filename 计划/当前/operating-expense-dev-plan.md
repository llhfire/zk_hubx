# 运营费用开发计划

> 2026-08-19 · grill 后展开，本文只规划不写码  
> PRD：`文档/PRD/PRD-运营费用管理.md` v1.0  
> 事实源：`HubX/CONTEXT.md` + `HubX/docs/adr/0076`–`0085`  
> 修订稿：`research/人资管理板块 · 运营费用管理重构策划案.md` v2.0  
> 本次开工范围：**阶段 A（α 台账骨架）**。B–E 只锁契约，不在本次编码。

---

## 1. 现状与差距

### 1.1 三套录入互不相通

| 现有入口 | 文件 | 问题 |
|---|---|---|
| 人资 / 费用管理 | `pages/hr/HrExpenseManagement.tsx` | 10 类扁平卡片；改金额选生效时间；无归属月、无出账、无池。含「工资」行，与 ADR 0076 冲突 |
| 财务统计 · 运营费用 | `pages/FinancialDashboard.tsx` `opExpenses` | 另一套类型（房租物业/水电网络…），可录入，公司级或部门 |
| 系统 · 费用分类 | `pages/ExpenseCategoryManager.tsx` | 5 个一级：`LABOR`/`TRAVEL`/`PROMOTION`/`BUSINESS`/`THIRD_PARTY`。`LABOR` 内置不可改 |

### 1.2 公摊还是写死数

`pages/contract-cost/contractCostData.ts`：`getHourlyOpCost = 月运营费用 ÷ ACTIVE_EMPLOYEE_COUNT(5) ÷ STANDARD_MONTHLY_HOURS(176)`。与大小周、在职折算无关。阶段 A **不改** 项目成本页怎么摊到项目（那是阶段 D），但本模块公摊参数必须用新公式，避免再写死 5 和 176。

### 1.3 花名册缺离职日

`Employee` 有 `hireDate`、`employmentStatus`（含 `已离职`），**没有 `leaveDate`**。阶段 A 编制工时：未离职按 `hireDate` 起算到月末；已离职且无离职日的种子先不当月计入，并在 mock 补 1～2 条带 `leaveDate` 的人，验证折算。完整离职日录入留给员工档案，不在本阶段做员工页。

### 1.4 工资表可引用

`SalaryPage` + `getSalaryForMonth` / `mockSalaryData`（最近月 `2026-05`）。平移 = 最近已出账月 `Σ(actualSalary ?? nominalSalary)`。工资表拆不出经常性/奖金，整表平移，图例标明。

### 1.5 源模块阶段 A 不接

差旅 `finance_approved`、投放日报 `spend-refund`、通用报销「财务审核通过」——阶段 B 再投影。阶段 A 台账种子可预置几条「来源=差旅/推广」的只读行，操作为禁用，演示投影形态。

---

## 2. 阶段 A 目标行为（改完必须成立）

1. 菜单「财务管理 / 运营费用」打开四 Tab；「人资管理 / 费用管理」和 `/hr/expenses` 重定向到 `/finance/expenses`。人资一级若只剩空壳则去掉该组。
2. 财务统计「运营费用」Tab **去掉录入按钮和编辑**，列表可改为只读摘要 + 「去运营费用」链接，禁止再写第二套账。
3. 费用分类种子变为：可录入 `OFFICE`/`BENEFIT`/`HR_ADMIN`/`OTHER`/`TRAVEL`/`PROMOTION`/`BUSINESS`/`THIRD_PARTY` + 内置不可录入 `LABOR`。本模块录入下拉不出现 `LABOR`。
4. 固定模板生成即入账；同一模板同一归属月再生成跳过；调价必须填生效月，已入账月金额不变。
5. 浮动模板生成 `pending`，不进池、不进大盘实际数；确认后变 `posted`。
6. 本台账写入的 `posted` 可改、可作废（`voided`），无物理删除；改/作废追加痕迹。
7. 大盘 6 个月：费用堆叠不含工资；工资平移单独一条。KPI 含池、`R_hour`、工资引用。
8. 公摊参数：`R_hour = 当月池 ÷ Σ(在职工天 ∩ 工天日历 × 8)`。工天先读 `mockWorkdaysByMonth`（手工每月天数），不是 176，人数不是 5。
9. 不能在本模块新增工资行，不能打开项目毛利率表。

---

## 3. 架构决策

### 决策 1：新目录 `pages/operating-expense/`，废掉人资页本体

不在 `HrExpenseManagement.tsx` 上继续长。新建：

```
pages/operating-expense/
  types.ts
  expenseMutations.ts      # 纯函数：生成/确认/调价/作废/改记录
  expenseCalc.ts           # 纯函数：池、编制工时、R_hour、WMA、预测切片
  mockData.ts
  OperatingExpensePage.tsx # 四 Tab 壳
  DashboardTab.tsx
  LedgerTab.tsx
  TemplateTab.tsx
  OverheadTab.tsx
  ExpenseFormDrawer.tsx
```

`HrExpenseManagement.tsx` 阶段 A 末删除（或改成 `Navigate` 到新页）。旧 10 类扁平记录 **不迁移**（mock，无生产数据）。

### 决策 2：规则锁在纯函数，页面只调

与报价 `quoteFlow.ts` / `quotationMutations.ts` 同一套路。至少导出并单测：

| 函数 | 行为 |
|---|---|
| `canGenerate(template, month, existing)` | 已有同模板同月 `posted`/`pending` → false |
| `generateFromTemplate(template, month)` | 固定 → `posted`；浮动 → `pending` |
| `adjustTemplatePrice(template, amount, effectiveMonth)` | 写调价历史，不改已入账 |
| `voidExpense(record, actor, at)` | `posted` → `voided`，留痕迹 |
| `patchPostedExpense(record, patch, actor, at)` | 只允许本台账写入方；投影来源拒绝 |
| `workdaysInRange(month, hireDate, leaveDate, workdays)` | 在职 ∩ 当月工天 |
| `capacityHours(employees, month, workdays)` | Σ 工天 × 8 |
| `overheadPool(records, month)` | 非作废、归属池、该月 |
| `hourlyOverheadRate(pool, hours)` | hours=0 则 0 |
| `wma(values)` | 0.5/0.3/0.2，缺月有几月用几月 |
| `forecastSlice(...)` | 确定模板 + WMA + 工资平移分列 |
| `latestPayrollTotal(salaryRows)` | 最近月合计 |

### 决策 3：阶段 A 工天是「每月天数表」，不是完整日历

`mockWorkdaysByMonth: Record<string, number>`，按大小周估 2026-05～2026-11 的工天数（种子写进 `mockData.ts`，注释写「大周/小周估数」）。`workdaysInRange` 阶段 A 用「工天数 × 在职自然日占比」**不够准**；更简单且可测的近似：

- 给定 `workdayCount`，假定工天均匀落在月初到月末。
- 在职区间与该月日历相交的自然日比例 × `workdayCount`，四舍五入到整数工天。
- 阶段 C 换成真实日期表后，同一函数改实现、单测换夹具，签名尽量不变。

### 决策 4：科目种子抽一份，分类页和本模块共用

`pages/expense-category/categorySeed.ts`（或放 `operating-expense/categorySeed.ts` 给分类页 import）：一级 9 个（8 可录入 + LABOR）。`ExpenseCategoryManager` 的 `initialCategories` 改读这份。本模块录入：`RECORDABLE_PRIMARY` 过滤掉 `LABOR`。

二级种子最低集：办公（房租/物业/水电/网络/用品/保洁）、福利（团建/节日/体检）、人资行政（招聘/培训）、其他（杂费）、差旅/推广/商务/第三方沿用现有二级。

### 决策 5：α 状态放模块 Context + localStorage，不抽 Workers

`OperatingExpenseContext`：records / templates / workdays。key：`hubx-operating-expense-v1`。阶段 E 再抽 `expenseService`。不要在阶段 A 写 `apps/api`。

### 决策 6：财务统计只删写入，不删合同 KPI

`FinancialDashboard` 合同汇总 Tab 不动。运营费用 Tab：删 `openCreate` / 编辑 / 保存；保留只读表或改成跳转。`opExpenses` 本地 state 不再作为真相源。

---

## 4. 阶段 A 文件改动清单

| # | 文件 | 改动 |
|---|---|---|
| 1 | `pages/operating-expense/types.ts` | 新建。见 §6 |
| 2 | `pages/operating-expense/expenseMutations.ts` | 新建。生成/调价/作废/改记录 |
| 3 | `pages/operating-expense/expenseCalc.ts` | 新建。池、工时、费率、WMA、预测 |
| 4 | `pages/operating-expense/mockData.ts` | 模板 5 条（房租/物业/专线/飞书/水电浮动）、已入账 2～3 个月、工天数表、1 个中途入职 + 1 个中途离职 |
| 5 | `pages/operating-expense/OperatingExpenseContext.tsx` | 状态 + localStorage |
| 6 | `pages/operating-expense/OperatingExpensePage.tsx` 及 4 Tab + Drawer | UI |
| 7 | `pages/operating-expense/categorySeed.ts` | 科目种子；`ExpenseCategoryManager` 改 import |
| 8 | `pages/ExpenseCategoryManager.tsx` | 换种子；`LABOR` 仍不可改删 |
| 9 | `pages/hr/HrExpenseManagement.tsx` | 删除，或改为 `<Navigate to="/finance/expenses" replace />` |
| 10 | `routes.tsx` | `finance/expenses` → 新页；`hr/expenses` 重定向 |
| 11 | `components/MainLayout.tsx` | 财务下加「运营费用」；去掉人资费用项；人资组若空则删 |
| 12 | `pages/FinancialDashboard.tsx` | 运营费用 Tab 去录入 |
| 13 | `pages/operating-expense/__tests__/expenseMutations.test.ts` | 生成跳过、调价不改历史、作废、投影拒绝 patch |
| 14 | `pages/operating-expense/__tests__/expenseCalc.test.ts` | 费率、入离职折算、WMA 缺月、预测不含工资进堆叠 |
| 15 | `version/featureBoard.config.json` | 阶段 A 完成后把对应 planned 标推进（编码时再改，现在保持已设计） |

**不改（阶段 A）**：`contractCostData.getHourlyOpCost`、`ContractCostDetail`、差旅/线索成本/报销写入、`SalaryPage`、`apps/api`、工天配置页。

---

## 5. 单测（阶段 A 必过）

工作目录：`HubX/apps/prototype`（与报价域相同，根目录跑别名会挂）。

| 夹具 | 期望 |
|---|---|
| 固定模板 8 月已 posted，再 generate 8 月 | `canGenerate=false`，列表仍 1 条 65000 |
| 调价生效 9 月 68000 | 8 月记录仍 65000；9 月生成 68000 |
| 浮动 generate | status=`pending`，`overheadPool` 不含它；confirm 后含 |
| `voidExpense` | 池减去该额；列表能查到 voided |
| 投影 `source=travel` 调 `patchPostedExpense` | 拒绝 |
| 10 月工天 20，60 人足月 | hours=9600 |
| 12 日入职（按相交比例） | 该人 hours < 160 |
| WMA 仅 2 个月 [100, 200] | 用两期权重归一，不是当 0 |
| `forecastSlice` | `payroll` 字段独立；`expenseLayers` 无工资 |

---

## 6. 阶段 A 类型（契约，编码时按此建）

```ts
type ExpenseStatus = 'pending' | 'posted' | 'voided';
type Attribution = 'pool' | 'project' | 'lead_channel';
type ExpenseSource = 'manual' | 'template' | 'excel' | 'travel' | 'promotion' | 'reimbursement';
type BillingCycle = 'monthly' | 'quarterly' | 'yearly';
type TemplateKind = 'fixed' | 'variable';

// categoryPrimary: OFFICE | BENEFIT | HR_ADMIN | OTHER | TRAVEL | PROMOTION | BUSINESS | THIRD_PARTY
// LABOR 不出现在 ExpenseRecord
```

- `ExpenseRecord`：id、expenseNo（`EXP-YYYYMM-序号`）、科目、金额、发生日、归属月、attribution、departmentId?、projectId?、channelId?、source、sourceRefId?、templateId?、status、handler、description、attachments?、audit[]、isProjection
- `RecurringExpenseTemplate`：kind、amount、cycle、billingDay、startMonth、endMonth?、status active/paused、priceHistory[]
- 归属校验：差旅必须 project；推广必须 channel；商务必须 project 或 lead；第三方必须 pool 或 project；办公/福利/人资行政/其他默认 pool

---

## 7. 阶段 B–E（本次不编码，只锁接口）

### B · 只读归集

- 差旅报销 `status === 'finance_approved'`（及之后未取消）→ `TRAVEL` 投影，归属项目（`trip.projectId`，无项目则挂待确认，**不准默认进池**）。
- 投放日报按月按渠道 `Σ(spend-refund)` → `PROMOTION` 投影。
- 通用报销：财务节点通过且 `type !== 差旅费` → 商务或办公；差旅类型忽略（防双记）。
- 源单不再满足「确认会发生」→ 对应投影 `voided`。
- 台账 `isProjection` 禁止改金额/科目/归属。

### C · 工天日历

- 基础工具落地日期表（大小周锚点 + 法定节假日 + 调休）。
- `workdaysInRange` 改为数日期，不再按比例近似。
- `Employee` 补 `leaveDate`。
- 仍不改职级时薪的 176。

### D · 成本核算接池

- `getHourlyOpCost(month)` 改为读本模块 `hourlyOverheadRate`。
- 删除 `ACTIVE_EMPLOYEE_COUNT`、公摊路径上的 `STANDARD_MONTHLY_HOURS`。
- 项目成本页展示已分摊 / 未分摊。不在运营费用页画毛利。

### E · β

- `expenseService` mock/http；D1 表；权限按 PRD 第九章。供应商付款归集后置。

---

## 8. 验收清单（阶段 A）

- [ ] `/finance/expenses` 四 Tab 可开；`/hr/expenses` 落到同一页
- [ ] 侧栏人资下不再有独立费用账
- [ ] 财务统计不能再录入运营费用
- [ ] 录入抽屉无「人力成本/工资」
- [ ] 固定模板一键生成；再点跳过；调价不改历史月
- [ ] 浮动生成后池不变，确认后变
- [ ] 作废后池下降，行还在（筛作废可见）
- [ ] 大盘堆叠无工资层；工资 KPI/折线单独
- [ ] 公摊参数 `R_hour` 随工天数和入离职变，不是 费用÷5÷176
- [ ] `npx vitest run packages/ui/src/app/pages/operating-expense/__tests__` 在 `apps/prototype` 下全绿

---

## 9. 明确不做（阶段 A）

项目毛利表、关账、反冲、生产/职能两套除数、每月 1 号静默生成、覆盖已入账、接差旅/投流真源、改 `getHourlyOpCost`、D1、权限矩阵落地、工天日期表 UI。
