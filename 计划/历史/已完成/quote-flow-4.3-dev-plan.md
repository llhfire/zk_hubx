# 报价 4.3 开发计划：计价与作业字段

> 2026-08-18 · 只规划不写码  
> 纲领计划：`计划/当前/quote-flow-prd-implementation.md` §4.3（本文是其展开）  
> 事实源：ADR `0017`（利润率=开发人力毛利）、`0022`（利润率底线默认 15% 可配）、`0031`（自费项目=公司默认清单）、`0035`（付款期次结构化）、`0038`（质保是报价字段）、`0043`（工期=工作日）、`0059`（工作日只跳周六日）、`0044`（总价含税人民币）、`0062`（主报价人天/总价须>0）、`0056`（补充报价可为负）、`0063`（仅人民币）；PRD v1.1  
> 前置：**4.1 先行**（词表与 `migrateQuote` 通道）

## 1. 现状与差距

### 1.1 双口径总价并存（最大风险）

- `computeAmountBreakdown().grandTotal`（`quoteFlow.ts:224-253`）是列表与工作台的实时口径；
- `summary.grandTotalPrice`（`types.ts:367-374`）是 Stage3 向导手填的汇总口径；
- 两者**无同步机制**，列表用前者（`QuotationCenter.tsx:73-74`）、审批页用后者，已经可能出现两个「总价」。

**决策**：`computeAmountBreakdown` 升格为**唯一计算源**；`summary.grandTotalPrice` 降级为「向导保存时由计算源写入的快照」，任何展示位读快照、快照缺失时回退计算源；Step7 校验「成本小计之和 = 总报价」改为「快照与计算源偏差 ≤ 0.01」的黄灯（不再硬拦，见 1.4）。

### 1.2 自费项目语义矛盾（必须翻转的现行行为）

- `otherCosts` 目前**全额计入 grandTotal**（`quoteFlow.ts:232-233`）并进 Step7 硬校验，但 mock 文案写「客户自费或代采」（`mockData.ts:222`）--按 PRD（ADR 0031）自费项目**不进总价**，是公司默认清单预填、本单可改的独立区块。
- **这是本计划唯一的「破坏性口径变更」**：改计算、改校验、改 mock 种子金额，列表总价数字会变小（回归时人工核对）。

### 1.3 岗位日成本写死 600

- `TECH_DAILY_RATE = 600`（`quoteFlow.ts:203`）全局一个价，无岗位区分、无配置、无模板覆盖、无本单覆盖。PRD：配置岗位价 + 兜底 600；模板可覆盖；本单可改（ADR 0053）。

### 1.4 校验黄灯化

- `validateBeforeAudit`（`quoteFlow.ts:315-364`）现在全是硬拦（labor_days / cost_sum / payment_percent / travel_amount / no_eval / no_price）。PRD：会签前数字类只黄灯；**步骤完成条件除外**（空清单不能评估、主报价总人天/总价须 > 0 仍硬拦，ADR 0055/0062）。
- `ValidationIssue` 需加 `severity: 'error' | 'warning'`。

### 1.5 缺失字段

- **发票类型**：Quote 上无此字段（只在线索开票 mock `leads/paymentInvoiceModel.ts` 与字典里）。目标：`summary.invoiceType`，默认「专票」（ADR 0034/0063 配套）。
- **利润率**：报价域完全没有（只存在于 Reports/FinancialDashboard 统计 mock）。目标：开发人力毛利 = (开发售价 − 岗位成本) / 开发售价，开发售价 = 总价 − 增项；底线默认 15% 可配，低于黄灯；开发售价 ≤ 0 则空（ADR 0017/0022）。
- **工作日换算**：无任何日历函数。工期 = `EvalSheet.manualWorkDays` 手填 + `summary.projectWorkDays` 约定值，都是裸数字。目标：工作日推结束日（只跳周六日，ADR 0059），供向导展示与 4.8 合同预填复用。
- **报价模板**：不存在（只有付款模板/审批模板）。目标：增项结构、岗位日成本默认、工期参考三项（ADR 0018：模板不含清单/评估/利润率）。

### 1.6 旧 uplift 模型残留

- `leads/quotationPricing.ts`（upliftRate 倒推）与 `LeadQuotationItem.uplift*` 字段是线索侧旧模型，与新计价并存。**不在本计划清理**（归交接待办 #5 线索报价 mock 收口），但报价域新代码禁止引用，避免两套口径互写。

## 2. 目标行为

1. 单一口径：总价/成本展示全部源自 `computeAmountBreakdown`（升级版），`summary.grandTotalPrice` 为保存快照。
2. `otherCosts` 移出 grandTotal，独立汇总展示「自费项目合计（不计入报价）」；公司默认清单预填、本单可改。
3. 岗位日成本：`roleDailyCostConfig`（岗位 -> 日成本，兜底 600）+ 模板覆盖 + 本单覆盖，三级解析链 `resolveRoleDailyCost(roleKey, config, template?, quoteOverride?)`。
4. 利润率：`computeProfitRate({grandTotal, upliftTotal, roleCostTotal})`，低于 `minProfitRate`（默认 0.15，配置）黄灯；开发售价 ≤ 0 返回 null。
5. 工作日：`addWorkdays(start, days)` / `workdaysBetween(a, b)` 只跳周六日；向导按「签约日 + projectWorkDays」推预计结束日。
6. 校验分级：payment_percent / cost_sum / labor_days / travel_amount -> warning；no_eval / no_price（主报价）-> error；补充报价总价可为负（`no_price` 只对主报价生效，字段 `isSupplement` 由 4.7 引入，本计划预留入参）。
7. 质保默认 1 年（现 `warrantyYears` 已存在，核对默认值）；发票类型默认专票；币种仅人民币（不建字段，PRD 0063 明确不做多币种）。
8. 报价模板：`QuoteTemplate { upliftStructure; roleDailyCostDefaults; durationReference }`，新建单时预填，单内可改。

## 3. 新增纯函数（全部落 `quoteFlow.ts` 或新 `quotePricing.ts`）

| 函数 | 输入 -> 输出 |
|------|-------------|
| `computeProfitRate` | {grandTotal, upliftTotal, roleCostTotal} -> number \| null |
| `resolveRoleDailyCost` | (roleKey, config, template?, override?) -> number |
| `addWorkdays` / `workdaysBetween` | 日期字符串 + 天数 -> 日期 / 天数 |
| `selfPaySubtotal` | otherCosts -> number（不进总价的独立合计） |
| `computeAmountBreakdown`（改） | otherCosts 移出 grandTotal；techLaborCost 改用 resolveRoleDailyCost |
| `validateBeforeAudit`（改） | 每个 issue 带 severity；no_price 仅主报价 |

配套 mock：`quotePricingConfigStore.ts`（岗位日成本、利润率底线、自费默认清单、报价模板，localStorage 模式，同 4.2 权限配置做法）。

## 4. 文件改动清单

| # | 文件 | 改动 |
|---|------|------|
| 1 | `pages/quotation/quotePricing.ts`（新） | §3 新纯函数 |
| 2 | `pages/quotation/quoteFlow.ts` | `computeAmountBreakdown` 口径改造 + `TECH_DAILY_RATE` 删除（迁入配置兜底） |
| 3 | `pages/quotation/types.ts` | `summary.invoiceType`、`QuoteTemplate`、`RoleDailyCostConfig`、`ValidationIssue.severity` |
| 4 | `pages/quotation/quotePricingConfigStore.ts`（新） | 计价配置 + 模板 mock |
| 5 | `services/quotationMutations.ts` | `migrateQuote` 补 invoiceType 默认；`buildNewQuote` 接模板预填 |
| 6 | `stages/Stage2EvalSheet.tsx` / `Stage3QuoteWizard.tsx` | 人天成本列改三级解析；总价/自费分区展示；利润率黄灯；工作日推结束日 |
| 7 | `stages/Stage4Approval.tsx` + `QuotationCenter.tsx` | 校验分级展示（error 拦提交、warning 仅提示）；列表总价口径核对 |
| 8 | `mockData.ts` | 种子金额按新口径调（otherCosts 不进总价后数字变化） |
| 9 | 测试（新 `quotePricing.test.ts` + 改 `quoteFlow.test.ts`） | §5 |

## 5. 测试用例设计

### 5.1 利润率

- 总价 100 万、增项 10 万、岗位成本 60 万 -> (90−60)/90 ≈ 33.3%。
- 开发售价 ≤ 0（增项 ≥ 总价）-> null。
- 恰好等于底线 15% -> 不黄灯；14.9% -> 黄灯；底线配置改为 20% 后 18% 变黄灯。

### 5.2 岗位日成本三级链

- 无模板无覆盖 -> 配置价；配置缺岗位 -> 兜底 600。
- 模板覆盖 > 配置；本单覆盖 > 模板。

### 5.3 工作日

- 周五 + 1 工作日 -> 下周一；跨度含两个周末的累计正确；`workdaysBetween` 与 `addWorkdays` 互逆（随机样例锁 3 组）。

### 5.4 口径翻转回归（重点）

- `computeAmountBreakdown`：otherCosts 10 万、其余 90 万 -> grandTotal = 90 万、selfPaySubtotal = 10 万。
- 快照偏差：summary.grandTotalPrice 填 95 万 vs 计算源 90 万 -> warning 而非 error。
- Step7：payment_percent 98% -> warning；空清单 -> error；主报价总价 0 -> error；`isSupplement` + 总价 −20000 -> 通过（ADR 0056）。

### 5.5 人工验证

- 改岗位日成本/总价后利润率即时重算；种子单列表总价变小属预期（口径翻转）；自费区块增删不影响总价；补充负数报价（待 4.7 落地后复验，本计划只验纯函数）。

## 6. 边界决策

1. **口径翻转会改种子数字**：mock 总价变小是预期行为，人工验证项明示，不视为回归失败。
2. **质保/含税/人民币不加新字段**：`warrantyYears`/`taxIncluded` 已在，只核默认值；多币种明确不做（0063）。
3. **文件流转「表单不回写、不一致黄灯」的编辑器侧在 4.5 落地**：本计划只交付字段级 warning 帮助函数。
4. **旧 uplift 模型不动**：线索侧归待办 #5；报价域代码评审时检查无引用即可。
5. **模板不含清单/评估/利润率**（ADR 0018），超范围项写进模板类型会被 4.9 看板核对发现，别加。
