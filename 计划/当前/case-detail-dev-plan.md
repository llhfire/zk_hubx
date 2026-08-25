# 业务单详情原型重构 详细开发计划（case-detail-dev-plan）

| 项目 | 内容 |
|---|---|
| 状态 | 已定稿（2026-08-25，文件/字段级，未写生产代码） |
| 上游 | grill 锁定记录：`计划/当前/case-detail-prototype-restyle.md`（7 项决策 + 继承默认 + 6 Tab 原型速记） |
| 事实源 | 原型已归档：`HubX/docs/prototype/ZKHubX-业务单详情全景.html`（原 Downloads 路径失效风险已消） |
| 范围 | `cases/CaseDetail.tsx` 重构 + `dashboard/Dashboard.tsx` 补齐；模式对齐 `project-detail-360-prototype-restyle.md` |
| 不做 | 见 §八（grill「明确不做」+ 本计划补充边界） |

## 一、现有接缝盘点（含 grill 后新发现的病灶）

### 1.1 数据接缝现状（可复用，不重建）

| 数据 | 来源 | 现状 |
|---|---|---|
| Case 主档 | `mockData.ts` `mockCases`（5 条） | 可用；缺 `extraContractIds` 字段（见 1.2-①） |
| 成本流水 | `mockData.ts` `mockCostItems` | 可用；分类是旧五类（labor×13 / commercial×4 / operation×15 / third_party×11，无 travel/promotion） |
| 合同/回款/期次 | `contractSeam.ts`（FD_CONTRACTS + 合同域 mock） | 可用；无补充合同查询函数 |
| 报价/评估 | `quoteSeam.ts` 直读 `initialQuotes` 种子 | 可用（绕过 localStorage，种子可安全追加）；无行级明细 |
| 派生指标 | `calc.ts` 12 个纯函数 + `__tests__/calc.test.ts` | 可用；五类派生需改口径 |
| 决算 | `mockPostMortems`（case-003 一条） | 可用，照搬 |

### 1.2 病灶清单（重构时必须一并消掉）

| # | 病灶 | 位置 | 处置 |
|---|---|---|---|
| ① | `caseData.extraContractIds` 类型上不存在（`Case` 接口无此字段），mock 也没设 → `deriveContractAmount` 补充段恒为 0，有效标的额恒等于主合同额 | `types.ts` Case / `CaseDetail.tsx:156` | 阶段 1 正式补类型 + mock |
| ② | 状态流转按钮比对旧状态值 `'lead'/'evaluating'/'executing'`，与 `CaseStatus` 枚举不匹配，永不渲染 | `CaseDetail.tsx:981-989` | 换 `calc.canTransit` 驱动的状态推进（grill 决策 4） |
| ③ | 财务模型 Modal（`ModelDetailContent` + `selectedModel`/`modelVisible`）无触发入口，死代码 | `CaseDetail.tsx:61-128,133-134,1019-1035` | 删除（原型无此卡） |
| ④ | 死按钮：导出（×3）、添加成本项、生成项目决算、提交评审等全是 `Message.info('开发中')` | CaseDetail 多处 | 导出→真 CSV（决策 7）；添加成本项→ForecastEntryModal；其余按原型删或接真 |
| ⑤ | Dashboard 硬编码 `lastCollDate='2026-07-01'`、`asOf='2026-08-19'` | `Dashboard.tsx:57-58` | 阶段 3 修（读 collections 末条 + today） |
| ⑥ | `DrillDownData`/`SimilarProject` 类型已定义未使用 | `types.ts:298-349` | 阶段 3 补穿透看板与相似项目（grill 决策 3） |
| ⑦ | `/edit`、`/create` 路由都指向 CaseDetail（伪编辑/伪新建） | `routes.tsx:188-189`、`index.tsx` | 删两路由（决策 4 只提 /edit；/create 一并收口，理由见 §2.7） |
| ⑧ | `post-mortems/:id` 路由是占位 div | `routes.tsx:190` | 不动（明确不做） |

## 二、阶段 1：数据层 + 纯函数（先写测试）

### 2.1 types.ts 修订（只增不删，改一处枚举值域）

```ts
/** 成本五类（ADR-0091）：人工/差旅/推广/商务/第三方 */
export type CostCategory = 'labor' | 'travel' | 'promotion' | 'commercial' | 'third_party';
```

- `CaseCostItem.costCategory` 类型由旧五类字面量联合改为 `CostCategory`（旧值 `operation`/`hardware` 删除）。
- `Case` 接口新增：`extraContractIds?: string[]`（1 主多补，病灶①）。
- `DrillDownData.costBreakdown` 按新五类重排：`{ laborCost: {total; development; rework}; travelCost: number; promotionCost: number; commercialCost: {total; entertainment}; thirdPartyCost: number }`（原 operationCost/hardware 字段删除；travel 从 commercial 拆出——ADR-0091 差旅独立）。
- 新增补充合同摘要类型：

```ts
export interface SupplementContractSummary {
  id: string; contractNo: string; name: string;
  amount: number;
  status: 'archived' | 'pending_approval' | 'voided';  // 已归档生效 / 审批中 / 已作废
  archived: boolean; voided: boolean;
  signingDate?: string; sourceQuoteId?: string;
}
```

### 2.2 calc.ts 修订与新增

**改**：
- `deriveCostStructure`：逻辑不变，key 随数据变为新五类。
- `deriveTrend`：月度分类拆分字段改为 `actualLaborCost / actualTravelCost / actualPromotionCost / actualCommercialCost / actualThirdPartyCost`（删 operation/hardware 分支）。
- `deriveHealth` 不动（eac>budgetCap 红、margin<target 红、wip 黄）；商务上限**不进健康灯**（四维卡单列，grill 决策 1：commercialCap 只管商务类）。

**增**（全部纯函数，先进测试）：

| 函数 | 签名 | 规则 |
|---|---|---|
| `COST_CATEGORIES` / `COST_CATEGORY_LABELS` | 常量 | `['labor','travel','promotion','commercial','third_party']` / 人工·差旅·推广·商务·第三方 |
| `deriveCommercialOverrun` | `(costItems, commercialCap) => { commercialActual, cap, overrun }` | 只统计 `costCategory==='commercial'` 的 actual 与上限比较 |
| `buildLifecycleTrack` | `(status: CaseStatus, supplements: SupplementContractSummary[]) => LifecycleNode[]` | 10 态节点数组；`reached`（已过）/`current`（当前，suspended 时黄标）/terminated 时全部灰化；每节点带 `supplementMarks`（该阶段生效的补充合同数，含 pending 标记） |
| `buildAmountEvolution` | `(mainAmount: number, supplements: SupplementContractSummary[]) => AmountStage[]` | `[{stage:'main',label:'主合同',delta, cumulative}, {stage:'bc01',label:'BC01 补充',delta:+35k, cumulative}, … , {stage:'baseline',label:'有效标的额',cumulative}]`；pending_approval 的补充单独带 `pending: true`（计入演进展示、不计入有效标的额） |
| `buildOperatingHints` | `(caseData, supplements, plans, collections, asOf) => string[]` | 规则派生（grill 继承默认，不手写文案）：① `supplements.filter(pending_approval)` → 「补充合同 BC0x 审批中（+¥20k），归档后计入有效标的额」；② `suggestCollecting(...)` → 「有逾期期次未收，建议催款」；空数组不渲染横幅 |
| `assembleCaseMetrics` | `(caseData, costItems, mainAmount, supplements, collections, plans, asOf) => CaseMetrics` | 单一装配函数：totalCost/EAC/有效标的额（`deriveContractAmount`，改吃 `SupplementContractSummary[]`）/双口径利润率/WIP/健康/五类结构/趋势。CaseDetail 与 Dashboard 共用（消 1.2-⑤，Dashboard 不再内联派生） |

**不动**：`deriveContractAmount` 语义保留但参数类型改 `SupplementContractSummary[]`；`simulateSensitivity`（只缩 labor forecast，新五类下语义不变）；`deriveQuotationTotals`；`sumEvalDaysByLeanRole`。

### 2.3 mockData.ts 重造（grill 决策 5，只造 case-001 链路）

**case-001 完整链路**：

```ts
// mockCases 中 case-001 增补：
extraContractIds: ['contract-001-bc01', 'contract-001-bc02'],
quoteIds: ['quot-001', 'quot-001-supp1', 'quot-001-supp2'],   // 主 + 2 补充报价

// mockCostItems 中 case-001 流水按新五类重造（对齐原型量级）：
//   actual 合计 ≈ ¥118.5k：labor(开发工时，沿用现有人天×日薪条目改写)
//     + travel(郑州驻场差旅 2 条，含补贴) + promotion(获客推广分摊 2 条：投放直归 + 工天×35 公摊)
//     + commercial(宴请招待 2 条) + third_party(短信/云服务/硬件采购 3 条)
//   forecast 合计 ≈ ¥33.2k：五类各 1–2 条，供 Forecast 分区与模拟器
// 其余 case-002~005：现有条目 costCategory 值平移
//   operation → promotion、hardware → third_party、commercial/labor/third_party 不动；不加 travel
```

**护栏**：`leanMockTypes.test.ts` 的 10 条护栏（类型兼容/quoteIds 存在/汇总数已删/无 dr- 前缀 sourceId）重造后必须仍绿；新增护栏用例：case-001 的 `extraContractIds` 非空、成本条目 `costCategory` 全部 ∈ 新五类。

**decision point 已按 grill 决策 5 锁定**：其余 4 个 case 只改分类字段保可用，不造完整链路。

### 2.4 contractSeam.ts 扩展

- `FD_CONTRACTS` 追加两条补充合同：
  - `contract-001-bc01`：HT-2026-001-BC01，¥35,000，`status: 'archived'`（已归档生效），sourceQuoteId 指向补充报价 1；
  - `contract-001-bc02`：HT-2026-001-BC02，¥20,000，`status: 'pending_approval'`（审批中），sourceQuoteId 指向补充报价 2。
- 新增 `getSupplementSummaries(extraContractIds: string[]): SupplementContractSummary[]`：按 id 取 FD_CONTRACTS，映射 `archived = status==='archived'`、`voided = status==='voided'`。
- `getContract`/`getPaymentPlans`/`getCollections`/`totalCollected` 不动（补充合同不进回款口径，主合同期次不变）。

### 2.5 报价域种子追加（跨模块，最小侵入）

`quotation/mockData.ts` 的 `initialQuotes` 追加 2 份补充报价种子：

- `quot-001-supp1`：`isSupplement: true`、`sourceQuoteId: 'quot-001'`、状态 `approved`、`basicInfo.projectName` 同主报价 +「（补充）」、evalSheet/featureList 各给 2–3 行（供行级明细展示）、金额与 BC01 对齐（+¥35k 口径）。
- `quot-001-supp2`：同上，对应 BC02（+¥20k）。

**风险已评估**：`quoteSeam` 直读 `initialQuotes` 常量（不经过 Context/localStorage），种子追加对精益侧立即可见；报价域页面走 `QuotationContext`（localStorage 优先），旧浏览器看不到新种子属报价域既有行为，不影响本计划验收。

### 2.6 quoteSeam.ts 扩展（grill 决策 6：行级明细）

```ts
export interface QuoteLineItem {
  featureName: string;   // 功能行名（featureList 一级模块/子功能）
  role: LeanRole;        // 岗位
  days: number;          // 人天（evalSheet 按 EVAL_ROLE_MAP 聚到该行）
  unitPrice: number;     // 对外单价（quote.rolePrices 或默认 ROLE_PRICES）
  subtotal: number;      // days × unitPrice
}
export function getQuoteLineItems(quoteId: string): QuoteLineItem[];
```

实现：`initialQuotes.find(id)` → `featureList`（一级模块）× `evalSheet.evalDays` 拆行；补充报价行级沿用同一函数。`getQuoteSummaries` 增返 `isSupplement` 与 `sourceQuoteId` 字段。

### 2.7 routes.tsx / index.tsx 收口

- 删 `routes.tsx:188-189`（`/edit`、`/create`）与 `index.tsx` 对应两条；`/financial-delivery/cases/:id` 保留。
- **超出 grill 决策 4 的顺带收口（说明理由）**：grill 只锁定 /edit 合并；/create 同为伪路由且业务上 Case 由线索签约链路生成（ADR-0088 四视角），手工新建违背领域模型——一并删除。Dashboard「新建业务单」与 CaseList 同类按钮改为 `Message.info('业务单由线索签约链路生成，不支持手工创建')`。若用户否决，回退方案：按钮改跳 `/leads`。

### 2.8 阶段 1 测试（新增/修订）

| 文件 | 内容 |
|---|---|
| `__tests__/calc.test.ts` 修订 | 旧五类 fixture 全部改新五类；`deriveContractAmount` 用例改吃 `SupplementContractSummary[]` |
| `__tests__/calc.test.ts` 新增 describe | `buildLifecycleTrack`（10 节点/当前态/suspended 黄标/terminated 灰化/pending 补充标记）、`buildAmountEvolution`（main+archived 计入、pending 不计入有效标的额但显示）、`buildOperatingHints`（pending 补充提示、催款提示、空态）、`deriveCommercialOverrun`（只统计 commercial、travel 不进）——约 12 用例 |
| `__tests__/caseMetrics.test.ts` 新增 | `assembleCaseMetrics` 对 case-001 fixture 的全指标断言（有效标的额 = 205k+35k、EAC、双口径、五类结构合计校验）——约 6 用例 |
| `__tests__/briefExport.test.ts` 新增 | `buildBriefRows`（行齐全）+ `toCsv`（含逗号/引号转义）——约 4 用例 |
| `__tests__/leanMockTypes.test.ts` 增护栏 | §2.3 两条新护栏 |

## 三、阶段 2：CaseDetail 页面重构（1038 行 → 壳 + 10 组件）

### 3.1 组件拆分（文件清单）

```
cases/
├── CaseDetail.tsx            # 壳：数据装配（assembleCaseMetrics + 三个 seam）+ 顶栏 + Tab 容器（~250 行）
└── detail/
    ├── StatusTrack.tsx        # 10 态轨迹条（buildLifecycleTrack 渲染：当前高亮/挂起黄标/终止灰化/补充标记圆点）
    ├── HintBanner.tsx         # 多协议经营提示横幅（buildOperatingHints，空则不渲染）
    ├── AmountEvolutionCard.tsx# 有效标的额演进脉络卡（1主+N补+合并基准，pending 虚线）
    ├── HealthDimensionsCard.tsx # 四维健康卡（利润率达成 / EAC vs 预算帽 / WIP 天数 / 商务上限用了多少）
    ├── DualViewCard.tsx       # 双口径财务全景（全周期 vs 回款口径并排）
    ├── OverviewTab.tsx        # 概览：上述卡片 + 成本收入趋势 + 利润率趋势（含归因注解）+ 成本结构饼图(已发/预发切换)
    │                          #   + 成本构成 EAC 差异表 + 堆叠面积增长图 + 底部共享模拟器
    ├── EvalTab.tsx            # 工时评估：主合同块 + 补充协议块（getEvalSummaries + 补充报价 evalSheet 分组）
    ├── CostTab.tsx            # 成本归集：五分类卡 + Forecast 独立分区清单 + Actual 流水（含「写入通道」列）+ ForecastEntryModal
    ├── ContractsTab.tsx       # 主合同与补充协议：1主多补卡片（getSupplementSummaries，含生效影响提示）
    ├── QuoteTab.tsx           # 报价单版本池：主报价 + 补充报价卡片（isSupplement 分组）+ getQuoteLineItems 行级明细表
    ├── PostMortemTab.tsx      # 项目决算：沿用现有内容搬入（根因/经验/P&L 对比/效率指标）
    ├── ManageParamsModal.tsx  # 管理参数：targetMargin / budgetCap / commercialCap 三个 InputNumber
    ├── ForecastEntryModal.tsx # 录入预计未来费用：分类(新五类)/类型/金额/预计日期/描述 → push mockCostItems(forecast)
    └── briefExport.ts         # buildBriefRows + toCsv + downloadCsv（Blob，决策 7）
```

删除：`ModelDetailContent`、财务模型 Modal、`mockFinancialModels` 引用（病灶③；mockFinancialModels 常量本身保留在 mockData，决算/模型域未来可能用）。

### 3.2 壳与顶栏（对齐原型）

- 数据：`useMemo` 调 `assembleCaseMetrics(caseData, costItems, mainAmount, getSupplementSummaries(...), getCollections(...), getPaymentPlans(...), today)`；本地 `useState` 维护 caseData 可变副本（状态推进/参数修改改本地 + 直改 `mockCases` 元素，α 惯例同线索模块，刷新还原可接受）。
- 顶栏：`返回` + CASE 编号（`caseNo`）+ 状态 Tag + **健康徽标**（红黄绿圆点）+ **关联计数徽标**（报价 N / 合同 N / 成本 N，取自三个 seam）+ 右侧：`导出经营简报`（真 CSV）、`打印`（`window.print`）、`管理参数`（Modal）、**状态推进** Dropdown。
- 状态推进（病灶②/决策 4）：Dropdown 列 `CASE_STATUS_TRANSITIONS[当前态]` 全部合法目标态（非法目标不渲染）；选中弹确认 Modal（显示 `canTransit` 通过 + 影响提示，如「进入已挂起将黄标当前节点」）；确认后更新状态。

### 3.3 六 Tab 内容要点（与原型逐节对齐）

| Tab | 关键点 |
|---|---|
| 概览 | 沿序：StatusTrack → HintBanner → AmountEvolutionCard → HealthDimensionsCard → DualViewCard → 成本收入趋势图（保留现有收款进度分析块，数据不变）→ 利润率趋势（双口径两线 + 目标基线）→ 成本结构饼图（五类、已发/预发切换沿用）→ EAC 差异表（五类行 × 已发生/预测/差异）→ 堆叠面积图（五类）→ `SensitivitySimulator`（共享组件，见 3.4） |
| 工时评估 | `getEvalSummaries()` 按主/补充分组：`isSupplement===false` 归主合同块、`true` 归补充协议块；每块保留现有卡片折叠 + 岗位人天表 |
| 成本归集 | 五分类汇总卡（新五类）+ **Forecast 独立分区**（清单表 + 合计 + 「录入预计费用」按钮开 Modal）+ Actual 流水表新增「写入通道」列（sourceType：日报/报销/工作项/手动/公摊，已有映射微调为五类文案） |
| 主合同与补充协议 | 主合同卡（金额/状态/期次/回款摘要）+ 补充卡列表（BC01 已归档绿色、BC02 审批中橙色 + 生效影响提示「归档后有效标的额 +¥20k」由 buildAmountEvolution 派生） |
| 报价单版本池 | 主报价 + 补充报价分组卡片（沿用折叠展开）；展开内加行级明细表：`getQuoteLineItems` 的 功能行 × 岗位 × 人天 × 单价 × 小计 |
| 项目决算 | 现有 renderPostMortemTab 内容原样搬入 PostMortemTab.tsx |

### 3.4 共享模拟器组件

```
shared/SensitivitySimulator.tsx
props: { title, costItems, contractAmount, targetMargin }
内部: scope 滑杆(50–150%) + target 滑杆(10–50%) → simulateSensitivity
输出: EAC / 模拟利润率 / 盈亏平衡合同额 / 底线价 / 安全边际 = (contractAmount − breakeven)/contractAmount
```

Dashboard 现有模拟器块替换为本组件；详情页概览 Tab 底部接入同一组件（grill 继承默认）。

### 3.5 打印与 CSV（决策 7）

- `briefExport.ts`：`buildBriefRows(metrics, caseData)` 产出「经营简报」行集（基本信息/双口径/五类成本/EAC/健康四维/期次回款）；`toCsv` 处理引号转义；`downloadCsv` 用 Blob + `URL.createObjectURL` + a[download]，文件名 `经营简报-${caseNo}.csv`。
- 打印：`window.print()` + 新增 `@media print` 样式（隐藏 Sider/Header/多余按钮，仅当前 Tab 内容流式输出）；样式追加到既有全局样式文件（`packages/ui/src/styles/` 或页面局部 CSS 文件，编码时看现状择一，不引新依赖）。

## 四、阶段 3：Dashboard 补齐（grill 决策 3）

1. **口径联动**：删内联 caseMetrics，改 `assembleCaseMetrics`（消病灶⑤硬编码日期：`lastCollDate = collections 末条?.date`，`asOf = new Date()` 当日）。
2. **穿透看板**（用满 `DrillDownData`）：按 `industry` 聚合全部 case 的利润 → 行业卡（利润/占比）→ 点开项目列表（caseNo/利润/五类成本分解，`development/rework` 与 `entertainment` 细分条目由 mockCostItems 的 description 前缀约定派生，不做新字段）。
3. **相似项目**（用满 `SimilarProject`）：`similarProjects(caseData, allCases)` 纯函数（industry+projectType 同类且状态 completed 的 case，取 margin/durationDays/totalCost top3），挂模拟器卡片下方。
4. **风格统一**：沿用 `lean-dashboard-kpi`/`lean-bubble-chart` 既有类；预警/最近更新表保留。
5. KPI 区「新建业务单」按钮处置见 §2.7。

## 五、阶段 4：验证清单

1. `npx vitest run packages/ui/src/app/pages/financial-delivery` 全绿（含 calc 修订 + 4 个新 describe + leanMockTypes 新护栏）。
2. `npx vitest run packages/ui/src/app/pages/quotation` 不回归（报价域只加种子）。
3. `npm run build` 通过。
4. 浏览器冒烟（case-001 为主线）：
   - 六 Tab 逐个可开；轨迹条 10 态、当前 in_progress 高亮；BC01/BC02 标记正确
   - 有效标的额 = ¥240k（205k + 35k 已归档）；BC02 +¥20k 以 pending 虚线展示不计入
   - 多协议提示横幅出现（BC02 审批中）
   - 四维健康卡、双口径全景数字与 calc 一致
   - 状态推进：in_progress → accepting 可推进；completed/terminated 后无推进项
   - 管理参数 Modal 改 targetMargin 后健康四维联动
   - 成本归集：五分类卡 + Forecast 分区 + 录入 Modal 写入后 Forecast 合计变化
   - 报价版本池：主 + 2 补充分组、行级明细表数字正确
   - 导出经营简报：真下载 CSV，Excel 打开无乱码（UTF-8 BOM）
   - 打印预览：仅内容区
   - Dashboard：穿透看板可下钻、相似项目出 top3、模拟器与详情页同源
   - case-002~005 可打开不报错（旧分类平移后）
5. 回归：报价中心列表/详情不受新增种子影响（localStorage 场景人工核一次）。

## 六、阶段 5：文档四联动收尾

- 功能看板：精益交付「业务单详情原型重构」翻「α 已实现」（**人工确认后翻，不代开**）。
- 根架构图：module-items 已含「1主多补演进 · 穿透看板 · 成本五类」（grill 时已加），编码完成无需再改。
- 技术架构 HTML：仍纯 α 内存 mock，无 D1/Workers 变化，无需改。
- 工作记录：下班/退下仪式追加。

## 七、风险与依赖

| 风险 | 处置 |
|---|---|
| CaseDetail 1038 行重构成 10 组件，回归面大 | 阶段 1 先行 + PostMortem/趋势图等大块**原样搬移不改写**，只重组外壳 |
| 报价域加种子影响报价中心页面 | 种子只增不改旧数据；localStorage 优先导致旧浏览器看不到新种子是报价域既有行为，不在本计划修复 |
| `deriveContractAmount` 参数类型变更会破坏现有调用方 | 全库仅 CaseDetail 一处调用，随阶段 2 一起改；calc.test.ts 同步 |
| mock 重造导致 leanMockTypes 护栏红 | 护栏先跑再提交；新护栏同批落 |
| 打印样式影响其他页面 | print 规则限定在业务单详情容器类下，不做全局 |
| 状态推进直改 mock 内存，刷新还原 | α 既有惯例（同线索模块），验收口径已注明 |

## 八、不做（边界外，防蔓延）

grill 已锁定：完工百分比收入确认；PDF 导出；接真实后端；CaseList 重构；运营费用模块改动。
本计划补充：post-mortems/:id 路由占位；报价域页面 UI 任何改动；DrillDown 的 development/rework/entertainment 细分不建新数据字段（mock description 约定派生）；仪表盘列表页/驾驶舱重构；FC01/BC02 审批流真流转（审批中心接缝属审批模板线）。

## 附录：grill 锁定的 7 项决策（速查）

见 `计划/当前/case-detail-prototype-restyle.md` §锁定决策（成本五类以原型为准 ADR-0091 / 详情+仪表盘一起 / 补穿透与相似项目 / 状态推进+参数 Modal+edit 合并 / mock 只造 case-001 / 报价行级明细 / CSV+打印不做 PDF）。
