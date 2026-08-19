# 精益交付数据链路收口 · 实现计划

> PRD：`文档/PRD/PRD-精益交付数据链路.md`（grill 2026-08-19 收束）
> ADR：0086（派生化+跨域引用）/ 0087（回款口径）/ 0088（Case 独立编号）
> 前置：无硬依赖。与运营费用阶段 A 共用公摊率常量，谁先落地谁定义，后落的一方接上。

## 阶段切分

### 阶段 L1：纯函数与常量（无 UI 改动）
1. 新建 `pages/financial-delivery/calc.ts`：
   - `COST_DAY_RATES`（成本日薪 400/350/500/450/450/350）与 `OVERHEAD_RATE`（时薪公摊率占位常量，注明与运营费用模块共用）。
   - 派生函数：`deriveTotalCost` / `deriveEac` / `deriveRevenue`（回款累计，按到账日落月）/ `deriveLifecycleMargin`（全周期：标的额 vs EAC，管健康灯）/ `deriveCollectedMargin`（回款口径，仅趋势展示）/ `deriveWip` / `deriveHealth`（全周期利润率 vs targetMargin + budgetCap 红灯 + WIP 天数黄灯）/ `deriveCostStructure` / `deriveTrend`（双线：应收基线按期次预计回款日落月 vs 实际回款）/ `deriveQuotationTotals`（2.2 公式）/ `simulateSensitivity`（敏感性+底线价，**只缩 forecast 人力成本**，商务/运营/第三方不随范围缩）。
   - Case 状态机：10 态常量表 + 迁移规则（自有状态，不派生；催款中可由回款逾期半自动建议）。
2. 单测（在 `HubX/apps/prototype` 下跑）：每个派生函数对 mock 原子事实跑通，覆盖「actual+forecast 混合」「回款晚于成本（WIP>0）」「范围% 只缩预测人力」「交付前期回款口径利润率为负但健康灯仍绿」。

### 阶段 L2：跨域接缝（mock 重造）
1. 合同域 `contracts/mockData.ts`：补建 3 份合同（对应 case-001/003/005），含分期 paymentPlans + collectionRecords；金额自洽（期次合计 = 合同额）。
2. 报价域 mock：补建对应 case 的报价数据（Stage1/2 岗位人天 + Stage3 金额），评估天数 = 报价岗位天数同源。
3. 精益交付 `mockData.ts` 大瘦身：
   - 删 `mockQuotations` / `mockFeatureLists` / `mockFeatures` / `mockQuotationFeatureItems` / `mockQuotationServiceItems`（改从报价域接缝读）；
   - 删 `mockCostTrends` / `mockCostStructures` / `mockDashboardData`（全派生）；
   - `mockCases` 只留轻实体字段（caseNo、quoteIds/contractId 引用、targetMargin/budgetCap/commercialCap、自有状态）；
   - `mockCostItems` 出差补贴改商务差旅、运营分摊改「工天×公摊率」口径；sourceId 按三通道规则对齐（能接真实日报域 mock 就接，接不上降级 manual，**删假 dr-xxx/reimb-xxx**）。

### 阶段 L2.5：成本三通道接缝（可并入 L2/L3）
- 日报通道：日报 mock 补 3 个 case 对应的项目工时记录（岗位×人天），成本流水由其派生；
- 报销通道：报销 mock（或降级 manual）+ 归集规则注释；
- 公摊通道：月结分摊流水按「项目工天 × OVERHEAD_RATE」生成。

### 阶段 L3：页面接派生数据
1. `Dashboard.tsx`：概览/气泡图/穿透看板全改派生值；模拟器改 `simulateSensitivity` 双输出（敏感性+底线价）；相似项目从已完结 case 派生。
2. `CaseDetail.tsx`：功能清单/评估/报价 Tab 读报价域接缝；成本/趋势/结构/EAC 全派生；收入双线（应收基线 vs 实际回款）。
3. `CaseList.tsx`：列显示派生指标。
4. 事后总结接口：毛利金额+百分比双字段；predictedPnl 快照注释来源。

### 阶段 L4：术语与文档
1. 模块 `CONTEXT.md` 已重写（本次 grill 已落）。
2. 核对页面用词与 PRD/术语表一致（业务单/回款/差旅）。
3. 权限：仅财务+管理层可见；管理参数/成本项仅财务可改（PRD 六C，编码时按角色表落矩阵）。

## 验收口径

- 任一页面的任一数字都能沿 `数字 -> 派生函数 -> 原子事实` 追溯（抽查表随验）。
- ①-⑦ 全部矛盾点（PRD 背景清单）消失：totalCost = 明细加总、EAC 唯一、报价三口径合一、合同 ID 可解析、回款总额 = 合同额、仪表盘单口径、穿透与列表同故事线。
- **复审新增**：Case 状态可人工推进（10 态）；交付前期业务单健康灯不为红（全周期口径）；成本流水 sourceId 无死链（三通道或 manual）。
- `npm run build` + 全部单测通过（在 `HubX/apps/prototype` 下跑 vitest）。

## 明确不做

完工百分比收入确认、真实后端接入、运营费用模块本体、日报/工时模块改动、蒙特卡洛模拟。
