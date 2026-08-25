# 运营费用菜单重构

> 详细设计：[`计划/当前/operating-expense-restyle-design.md`](./operating-expense-restyle-design.md)
> 2026-08-21 · grill 收束，待开工  
> 原型：`/Users/pc/Downloads/gemini-code-1787284344900.html`（只收视觉与入口，领域规则以本次 grill 为准）  
> PRD：`文档/PRD/PRD-运营费用管理.md` v1.1  
> 事实源：`HubX/CONTEXT.md` + `HubX/docs/adr/0076`–`0085`、`0092`–`0094`  
> 前序：`计划/当前/operating-expense-dev-plan.md`（A–E 已编码，计算函数不动）

---

## 1. 定位

现网 `/finance/expenses` 四 Tab 骨架和入账规则已经落地。这次是 **α 的 UX 优化**：把大盘做成原型那种流式演进，补齐口径切换、排行、异动、导出、公摊公式条、只读项目表、科目入口。

不是重开账本。工资仍不进台账、不进池；本模块不自算项目毛利；科目仍是系统那一棵树。

---

## 2. Grill 锁定（对照原型的取舍）

| 原型 | 本次 |
|---|---|
| 五个 Tab，含项目核算和科目配置 | 五个 Tab：大盘 / 台账 / 周期模板 / 公摊参数 / 科目入口。科目 = 系统费用分类同一棵树（ADR-0094） |
| 当月总支出含工资且无切换 | 默认含人力 = 当月台账合计 + 工资表引用；可切不含人力（ADR-0092） |
| 堆叠把人力当科目层，差旅与商务合层，推广叫市场推广 | 按一级科目八层；含人力时工资单独垫底；差旅/商务分列 |
| 部门+项目混排，含公摊/综合/成本率 | 两张排行分开，都只用本台账直接支出 |
| 公摊公式 60 人 × 21 天 × 8h + 自算毛利表 | 公式用在职编制工时；项目表只读引用成本核算（ADR-0093） |
| 异动含打车超标 | 只三条：科目环比、固定模板未生成、浮动待确认逾期 |
| 来源含薪酬封账、合同付款 | 六种来源不动；本阶段无这两项 |
| 全局顶栏录入 + 分析总表导出 | 主操作按 Tab 分放；导出台账明细，不含工资行、不含毛利 |

抽屉按已有术语补发生日 + 归属月；手工录入不含差旅/推广/商务；模板仍分固定/浮动。

---

## 3. 做 / 不做

**做（一刀全做，公摊结果表不推迟）**

1. 大盘：双口径头条、支撑卡（池 / 项目直接 / 线索直接 / `R_hour` / 工资引用）、八层流式 6 个月、部门归口排行、项目直接排行、三条异动、含人力切换、当月台账导出
2. 台账：筛选变密（月 / 科目 / 归属 / 来源 / 作废 / 搜索）、录入抽屉发生日、导出当前筛选、Excel 导入入口保留
3. 周期模板：视觉对齐原型，固定/浮动、一键生成、调价历史都留
4. 公摊参数：公式条 + 编制工时/入离职明细 + **公摊结果表**（只读，mock 对齐精益交付字段：项目工时、人力成本、台账直接、工时×本页 `R_hour`、合同标的、毛利率、已分摊/未分摊）
5. 科目 Tab：嵌系统费用分类同一棵树；`LABOR` 只读；不开放任意新增一级

**不做**

- 改 `R_hour` / 入离职折算 / 模板不覆盖已入账 / 作废规则
- 接新的差旅或投流源、薪酬封账、合同付款来源
- 本模块自算毛利、编成本项
- 工资写入台账或堆叠成科目
- 关账、反冲、真实后端
- 用项目交付排期当费用预测（仍是模板确定数 + WMA + 工资平移）

---

## 4. 文件

| # | 文件 | 改动 |
|---|---|---|
| 1 | `operating-expense/expenseCalc.ts` | 加 `postedLedgerTotal`（当月台账合计）、`directByProject` / `directByDepartment`、`categoryStack`；**不改** `overheadPool` / `hourlyOverheadRate` / `wma` |
| 2 | `operating-expense/DashboardTab.tsx` | 双口径 KPI、流式堆叠、两张排行、异动、切换、导出当月 |
| 3 | `operating-expense/LedgerTab.tsx` | 筛选、导出、录入入口 |
| 4 | `operating-expense/ExpenseFormDrawer.tsx` | 发生日与归属月分开；手工一级排除 TRAVEL / PROMOTION / BUSINESS |
| 5 | `operating-expense/TemplateTab.tsx` | 视觉对齐，行为不变 |
| 6 | `operating-expense/OverheadTab.tsx` | 公式条 + 只读公摊结果表 |
| 7 | `operating-expense/CategoryTab.tsx`（新） | 读 `categorySeed` / 系统费用分类；`LABOR` 只读 |
| 8 | `operating-expense/OperatingExpensePage.tsx` | 五 Tab；无全局工具栏 |
| 9 | `operating-expense/exportLedger.ts`（新） | 当前筛选 → xlsx 行；无工资行 |
| 10 | `operating-expense/overheadReadModel.ts`（新） | 从精益交付 mock/成本项拼只读行；缺字段用对齐 mock，不在本模块重算毛利 |
| 11 | `__tests__/expenseCalc.test.ts` 等 | 双口径、排行不含公摊、导出不含工资、手工抽屉拒 TRAVEL |

样式跟现网 Arco + 页面内 class，可对照原型密度，不引入第二套设计系统。

---

## 5. 验收

- [ ] `/finance/expenses` 五个 Tab 可开
- [ ] 大盘默认含人力，切换后头条和堆叠去掉工资层；池和 `R_hour` 两种口径都不变
- [ ] 堆叠八层科目名与术语表一致；差旅/商务分列
- [ ] 部门排行、项目排行分开，数字 = 台账直接支出
- [ ] 异动只有三条，无打车超标
- [ ] 导出 xlsx 无工资行、无毛利率列
- [ ] 抽屉有发生日；归属含线索；不能手录差旅
- [ ] 公摊公式分母是编制工时，不是 人数×21×8
- [ ] 公摊结果表只读，点项目不在本页编辑成本
- [ ] 科目 Tab 改二级写回同一棵树；不能把 `LABOR` 录成台账行
- [ ] 现有 `expenseMutations` / `hourlyOverheadRate` 单测仍绿
- [ ] `npx vitest run packages/ui/src/app/pages/operating-expense/__tests__` 在 `apps/prototype` 下全绿

---

## 6. 看板与架构图

- 功能看板：运营费用新增 planned（已设计）；α「UX 优化」仍待编码完成后勾。
- 架构图 `运营费用` module-items 改为五视图 + 双口径 + 只读公摊结果表 + 科目入口。
