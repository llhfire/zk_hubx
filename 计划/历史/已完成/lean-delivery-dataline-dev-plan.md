# 精益交付数据链路收口 · 实现计划（文件级）

> 2026-08-19 · 对照代码展开，L1–L4 已全部编码完成（112 新单测全绿）
> PRD：`文档/PRD/PRD-精益交付数据链路.md`（grill 收束）
> ADR：0086（派生化+跨域引用）/ 0087（回款口径）/ 0088（Case 独立编号）
> 前置：无硬依赖。公摊率与运营费用共用 `pages/finance-shared/overhead.ts`（见 `计划/当前/README.md` 接缝表）。
> 代码现状：`pages/financial-delivery/`（类型全挤在 `mockData.ts`），零单测。

---

## 1. 现状与差距

| 点 | 现状 | 目标 |
|---|---|---|
| 汇总数 | `Case.totalCost/totalRevenue/eac/currentMargin/healthStatus` 硬编码；`mockDashboardData` 平行口径 | 全部 `calc.ts` 派生，Case 不再存这些字段 |
| 报价/评估 | 自建 `mockQuotations` 等，人天与报价域无关 | 读报价域 `Quote.evalSheet` |
| 合同 | `contractId: 'contract-001'` 不存在 | 合同域 **追加** `fd-ht-001/003/005`，不改旧 `'1'`–`'9'` |
| 回款 | Case 上写死收入；合同 1 的 `collectionRecords.contractId` 还写成 `'contract-1'`（自身 id 是 `'1'`） | 读合同域 `paymentPlans` + `collectionRecords` |
| 成本 | `sourceId: dr-001 / reimb-009` 全是假引用 | 三通道或 manual；删假 ID |
| 仪表盘 | 概览混用 Case 硬编码 + `mockDashboardData.bubbleChart`；**模拟器 UI 不存在**（只有 mock 字段） | 全派生；L3 **新建**模拟器 |
| 侧栏 | 工时评估/报价单管理/项目决算是占位空页 | 删独立路由；评估/报价进 CaseDetail Tab；决算留在详情 Tab |
| 岗位词 | 精益 `product/design/frontend/backend/test/other`；报价 `pm_days/ui_days/fe_days/be_days/qa_days` | L1 `EVAL_ROLE_MAP` |
| Case 轻实体 | 已有 `targetMargin/budgetCap/commercialCap` 和 10 态，但又存汇总数、无 `quoteIds` | 删汇总数，加 `quoteIds: string[]` |
| 事后总结 | `PnLSnapshot.grossMargin` 金额与 `netMargin` 百分比混用 | 金额+百分比双字段 |
| 日报通道 | 旧计划要补日报 mock；PRD 七写「不动日报模块」 | **不改** `pages/daily-report/`，接不上降级 manual |

跨域 ID **不搞全局统一**。报价继续 `q1/q2`，合同继续 `'1'`–`'9'`；精益只追加自己的 3 份合同/报价。

---

## 2. 阶段切分

### 阶段 L1：纯函数与常量（无 UI）

从 `mockData.ts` 拆类型，避免 calc 依赖整份 mock。

| # | 文件 | 改动 |
|---|---|---|
| 1 | `pages/financial-delivery/types.ts` | **新建**。从 `mockData.ts` 搬出类型。`Case` 去掉 `totalCost/totalRevenue/currentMargin/eac/wipValue/wipDays/healthStatus`；加 `quoteIds: string[]`；`PnLSnapshot` 改双字段；`CaseCostItem.sourceType` 增 `'overhead'`，加可选 `quantityDays?: number` |
| 2 | `pages/financial-delivery/calc.ts` | **新建**。常量 + 派生 + 状态机规则 |
| 3 | `pages/finance-shared/overhead.ts` | **已收口**。导出公共运营池、编制工时、动态 R_hour 与公摊金额的唯一公式 |
| 4 | `pages/financial-delivery/__tests__/calc.test.ts` | **新建**。夹具见 §4 |
| 5 | `mockData.ts` | L1 只改 import 路径（类型迁走）；数据大瘦身留 L2 |
| 6 | `dashboard/Dashboard.tsx`、`cases/*.tsx` | L1 若类型字段删除导致编译失败：页面暂从派生函数取数的最小补丁（用 `mockCostItems` + 空回款），或 L1 先把汇总数改成 optional 过渡、L2 再删。**优先**：L1 把字段标 optional，页面继续跑；L2 删除字段并改页面读 calc |

`PnLSnapshot` 目标字段：

```
revenue, laborCost, commercialCost, operationCost, thirdPartyCost, totalCost,
grossMarginAmount, grossMarginRate, netMarginAmount, netMarginRate
```

α 无税差则净利率 = 毛利率，两对字段仍都存。

#### 2.1 calc.ts 导出

常量：

```
COST_DAY_RATES = { product:400, design:350, frontend:500, backend:450, test:450, other:350 }
ROLE_PRICES    = { product:1000, design:800, frontend:1200, backend:1200, test:600, other:800 }
EVAL_ROLE_MAP  = { pm_days:'product', ui_days:'design', fe_days:'frontend', be_days:'backend', qa_days:'test' }
# 其余 eval key（arch/algo/embed/dba/ops 及未知）→ other
WIP_DAYS_YELLOW = 14
R_hour 从 finance-shared 动态公摊读模型取得
CASE_STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]>
```

状态机（人推进；calc 只给合法下一态；催款中可由逾期建议）：

```
drafting     → quoting | terminated
quoting      → negotiating | drafting | terminated
negotiating  → signed | quoting | terminated
signed       → in_progress | terminated
in_progress  → suspended | accepting | collecting | terminated
suspended    → in_progress | terminated
accepting    → collecting | in_progress
collecting   → completed | in_progress
completed    → ∅
terminated   → ∅
suggestCollecting(status, plans, collections, asOf): boolean
  // 有逾期未收到期次且当前为 in_progress/accepting
```

函数：

| 函数 | 入参（原子） | 出参 |
|---|---|---|
| `deriveTotalCost` | costItems | Σ actual |
| `deriveEac` | costItems | Σ actual + Σ forecast |
| `deriveRevenue` | collectionRecords | Σ amount（可按到账月分组） |
| `deriveContractAmount` | 主合同额 + 已归档未作废补充变更额 | 有效标的额 |
| `deriveLifecycleMargin` | 标的额, EAC | (标的额−EAC)/标的额；标的额≤0 则 null |
| `deriveCollectedMargin` | 回款, Σactual | (回款−actual)/回款；回款=0 则 null |
| `deriveWip` | Σactual, 回款, 最近回款日, asOf | `{ value, days }`；value=max(0, actual−回款)；无回款则 days=从首笔 actual 日起算 |
| `deriveHealth` | lifecycleMargin, targetMargin, eac, budgetCap, wipDays | 红：margin&lt;target **或** eac&gt;budgetCap；黄：未红且 wipDays&gt;14；否则绿。红优先于黄 |
| `deriveCostStructure` | costItems | 按 costCategory 汇总 actual/forecast |
| `deriveTrend` | paymentPlans, collectionRecords, costItems | 按月：应收累计 / 实收累计 / 成本累计 |
| `sumEvalDaysByLeanRole` | `EvalSheet` | `Record<LeanRole, number>` |
| `deriveQuotationTotals` | roleDays, rolePrices, marginRate, serviceItems | `{ featureQuote, serviceTotal, passthroughTotal, totalAmount }`。功能报价=Σ(人天×对外单价)；totalAmount=功能报价×(1+加成率)+非代收服务项；代收代付（云/域名/SSL/短信）不进 totalAmount |
| `simulateSensitivity` | costItems, contractAmount, scopePct, targetMargin | `{ eac, margin, breakevenAmount, floorPrice }`。**只把 forecast 且 costCategory=labor 的金额 × scopePct**；actual、商务、运营、第三方不缩。floorPrice=EAC/(1−targetMargin) |
| `canTransit` / `suggestCollecting` | 状态 + 回款 | boolean |

页面不要直接加总，一律调这些函数。

健康灯口径锁死：

- 气泡图纵轴 = 全周期利润率，不是回款口径
- 仪表盘「总利润/利润率」= Σ(标的额−EAC)/Σ标的额（全周期）
- 回款口径利润率只出现在 CaseDetail 趋势区，标题写「回款口径（仅现金流）」
- 仪表盘「总收入」文案改为「累计回款」

### 阶段 L2：跨域 mock 重造

| # | 文件 | 改动 |
|---|---|---|
| 1 | `pages/financial-delivery/quoteSeam.ts` | **新建**。`getQuotesForCase` / `toQuotationAtoms`。α import 报价域 mock（或 Context list）。删除精益侧 `FeatureList/Feature/Quotation` 类型与 mock |
| 2 | `pages/quotation/mockData.ts` | **追加** 3 份已确认报价，**不动** `q1/q2` |
| 3 | `pages/financial-delivery/contractSeam.ts` | **新建**。`getContract` / `effectiveAmount` / collections / paymentPlans |
| 4 | `pages/contracts/mockData.ts` | `buildInitialContracts()` **追加** 3 份，**不改** `'1'`–`'9'` 主故事 |
| 5 | `pages/financial-delivery/mockData.ts` | Case 瘦身；成本流水重造；删平行 mock |
| 6 | `__tests__/leanMockTypes.test.ts` | mock 结构匹配 types；`mockCostItems` 无 `dr-`/`reimb-` 前缀 |

追加报价：

| 新报价 id | 挂 Case | 要点 |
|---|---|---|
| `fd-q-001` | case-001 | 已确认；EvalSheet 岗位人天与成本流水大致同量级；`otherCosts` 含云/域名（代收） |
| `fd-q-003` | case-003 | 已确认；已完结故事 |
| `fd-q-005` | case-005 | 已确认；催款中故事 |

追加合同：

| 新合同 id | 挂 Case | 金额自洽 |
|---|---|---|
| `fd-ht-001` | case-001 | `totalAmount` = 期次合计 = 205000；回款累计 &lt; 标的额（制造 WIP）；每条 `collectionRecords.contractId` **必须等于** `fd-ht-001` |
| `fd-ht-003` | case-003 | 回款累计 = 合同额 250000 |
| `fd-ht-005` | case-005 | 有逾期未收到期次（喂 `suggestCollecting`）；标的额 180000 |

补充合同本轮可以没有；`deriveContractAmount` 仍实现加法，单测覆盖。

`mockCases` 只留轻实体：

```
id, caseNo, leadId?, projectId?, contractId?, quoteIds[],
status, targetMargin, budgetCap, commercialCap,
industry, projectType, techStack, durationDays, dates, 展示名
```

删：`totalCost/totalRevenue/currentMargin/eac/wipValue/wipDays/healthStatus/contractAmount`。

`mockCostItems`：

- 删所有 `dr-xxx` / `reimb-xxx`
- 出差补贴：`costCategory:'commercial'`, `costType:'差旅'`（不是 labor）
- 运营分摊：`sourceType:'overhead'`，amount = 人力 `quantityDays` × 8 × 当月动态 `R_hour`
- 报销通道：差旅 T3 前全部 `sourceType:'manual'`，注释「待 travel.emitCostItem」
- 日报通道：**不改** `pages/daily-report/`。现网项目工时挂的是项目 `'1'`（A公司CRM），与阿里巴巴 Case 对不上 → labor 也降级 `manual`，description 写「α 无对应日报」
- 保留 actual+forecast 混合，保证模拟器有可缩的 forecast 人力

删除平行 mock：`mockQuotations` / `mockFeatureLists` / `mockFeatures` / `mockQuotationFeatureItems` / `mockQuotationServiceItems` / `mockCostTrends` / `mockCostStructures` / `mockForecastCostStructures` / `mockDashboardData`。

`mockFinancialModels` / `mockProfitModes`：L3 若概览不再展示则删；否则只读文案，不参与数字。

成本三通道（旧 L2.5，并入 L2，降级）：日报不改模块；报销等 T3；公摊在 mock 里按公式写静态 overhead 流水。

### 阶段 L3：页面接派生

| # | 文件 | 改动 |
|---|---|---|
| 1 | `dashboard/Dashboard.tsx` | 概览/预警/最近更新从 `deriveHealth` 等聚合；气泡图用派生 margin/WIP，删 `mockDashboardData`；**新增**模拟器卡片（合同额滑杆、范围%、目标利润率；商务预算只读 `commercialCap`）；相似项目 = 同行业 + 已完结 Case，删 `proj-sim-xxx` |
| 2 | `cases/CaseList.tsx` | 列：标的额/EAC/全周期利润率/健康灯/WIP 均为派生 |
| 3 | `cases/CaseDetail.tsx` | Tab：概览（双线趋势、结构、EAC）；工时评估（报价域 feature+eval）；报价单（`toQuotationAtoms`，代收代付单列）；成本（流水+派生合计）；决算（双字段）。状态推进走 `canTransit`；催款建议黄条走 `suggestCollecting` |
| 4 | `index.tsx` + `routes.tsx` + `MainLayout.tsx` | 删 `/financial-delivery/feature-lists\|quotations\|post-mortems` 路由与菜单；侧栏只留仪表盘、业务单 |
| 5 | `mockData.ts` | `predictedPnl` 按 PRD 五：人力=最终评估人天×成本日薪；商务/运营/第三方=结项时点 forecast 快照；注释「不可变快照，α 手写」 |

权限（PRD 六C）：α 无真实用户体系。用常量 `FINANCIAL_DELIVERY_ROLES = { finance, management, other }`（可参考 `contractCostPermissions`）；非财务隐藏「改管理参数/改成本项」。不建新用户系统。

合并注意：运营费用 A 也会改 `MainLayout`，别互删菜单。

### 阶段 L4：用词与核对

1. 模块 `CONTEXT.md` 已重写（grill 已落），只核对页面。
2. 页面「Case」展示为「业务单」；收入相关写「回款」；差旅不写「出差补贴归人力」。
3. 抽查：仪表盘任一数字 → `calc.ts` → mock 原子行（验收必做 case-001 的 EAC、回款、健康灯）。

---

## 3. 文件改动总表（生产代码，按阶段）

见各阶段表格。不改：`pages/daily-report/`、`contractCostData.getHourlyOpCost`、运营费用模块本体、`apps/api`、报价 `q1/q2` 主故事、合同 `'1'`–`'9'` 主故事。

---

## 4. L1 单测夹具

工作目录：`HubX/apps/prototype`。L1 不读真实 mock，夹具写在测试文件。

| 夹具 | 期望 |
|---|---|
| actual 100 + forecast 40 | totalCost=100, EAC=140 |
| 回款 0、actual 80、asOf 距首笔 20 天、标的额充足 | collectedMargin=null，WIP value=80，health **绿**（全周期达标） |
| 标的额 200、EAC 140、target 30% | lifecycle=30% 刚好绿；target 31% 变红 |
| EAC &gt; budgetCap | 红，即使 margin 达标 |
| WIP days=15、无红条件 | 黄 |
| 范围 50%：forecast 人力 80、actual 人力 100、商务 forecast 20 | 新 EAC=100+40+20=160，不是所有 forecast 都腰斩 |
| 底线价 target=30%、EAC=140 | 140/0.7≈200 |
| `deriveQuotationTotals`：产品 10 天×1000、服务 5000、代收 2000、加成 0 | feature=10000, totalAmount=15000, passthrough=2000 |
| `sumEvalDaysByLeanRole`：pm_days 2 + arch_days 1 | product=2, other=1 |
| `canTransit(completed, in_progress)` | false |
| 逾期未收到期次 + in_progress | `suggestCollecting` true |

L2 护栏：`leanMockTypes.test.ts` 断言无假 `dr-`/`reimb-` sourceId。

---

## 5. 验收口径

- 任一页面的任一数字都能沿 `UI → calc.ts → 原子事实` 追溯。
- ①–⑦ 矛盾点消失：totalCost=明细加总、EAC 唯一、报价走 2.2、合同 ID 可解析、完结单回款=合同额、仪表盘单口径、穿透与列表同故事线。
- Case 状态可人工推进（10 态）；交付前期健康灯不为红（全周期口径）。
- 成本流水 sourceId 无死链（三通道或 manual）。
- `npx vitest run packages/ui/src/app/pages/financial-delivery/__tests__` 在 `apps/prototype` 下全绿 + `npm run build`。

---

## 6. 明确不做

完工百分比收入确认、真实后端、运营费用模块本体、日报/工时模块改动、蒙特卡洛、独立报价/评估页面、全局 ID 重整。
