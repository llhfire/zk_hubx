# 计划/当前/

正在执行或刚定稿、还要对照着做的实现计划。

- `quote-flow-prd-implementation.md`：报价流程按 PRD grill 收口（阶段 4，未写代码）
- `unified-view-implementation.md`：线索·项目·合同统一视图（grill 后，未写代码）
- `operating-expense-dev-plan.md`：运营费用阶段 A–E（文件级已展开，已全部编码完成）
- `operating-expense-restyle.md`：运营费用菜单重构（grill 已收束）
- `operating-expense-restyle-design.md`：运营费用菜单重构详细设计（评审 0 issue，待按 P0–P6 编码，不写生产代码阶段已完成）
- `lean-delivery-dataline-dev-plan.md`：精益交付 L1–L4（文件级已展开，已全部编码完成）
- `travel-dev-plan.md`：差旅 T1–T4（文件级已展开，已全部编码完成）
- `phase3-deal-to-delivery.md`：销售域阶段 3（已完成；立项 spawn 点将被 U1 改回签约开启）
- `feature-board-existing-features.md`：功能看板既有功能核对
- `payment-kanban-dev-plan.md`：合同回款看板与甘特图（P1–P5，grill 已收束，未写代码）
- `beta-foundation-dev-plan.md`：β 版平台底座与漏斗主线接缝（B0–B4 编码完成；B5 待开工。B4 实收台账已接，回款看板 P1–P5 UI 仍待独立计划）
- `beta-foundation-b5-design.md`：B5 β 上线收口详细设计（2026-08-22，Approved 待编码。评审 0 issue；`productionOn` 目标已口头确认，P3 冒烟后执行）
- `conflict-spawn-and-collections.md`：立项时机与实收口径冲突决议（ADR-0095；U1 接线改 Lead 写时；回款看板进度读台账）
- `remaining-conflicts.md`：其余冲突/含糊点存档（2026-08-22 记下，下次开工再消；建议先补充协议）
- `lead-dispatch-dev-plan.md`：线索派发工作台（2026-08-24 grill 收束，17 项决策，PRD-线索派发管理 + ADR-0096；阶段 A–E + 渠道词表迁数据字典横切，未写代码）
- `global-search-dev-plan.md`：全局搜索（2026-08-25 grill 收束，⌘K 六实体检索直达，单阶段 S1–S3，PRD-全局搜索；推翻派发 grill 的「⌘K 不做」正名为全局另议，未写代码）
- `global-search-design.md`：全局搜索详细设计（2026-08-25 定稿，文件/字段级：读六域 Context 而非直调 service、客户 mockData 提取、组件/键盘/测试规格，未写代码）
- `case-detail-prototype-restyle.md`：业务单详情原型重构 grill 锁定记录（2026-08-21，7 项决策；原型已归档 `HubX/docs/prototype/ZKHubX-业务单详情全景.html`）
- `case-detail-dev-plan.md`：业务单详情原型重构详细开发计划（2026-08-25 定稿，文件/字段级：新五类成本 ADR-0091 / mock 重造 case-001 链路 / 组件拆分 10 文件 / Dashboard 补穿透与相似项目，未写代码）

---

## 合同回款看板：待开工（后于 B5 双写；进度读 collections）

| 阶段 | 内容 | 状态 |
|---|---|---|
| P1 | 纯函数 + 类型 | 待开工 |
| P2 | 看板 UI | 待 P1 |
| P3 | 侧边抽屉 | 待 P2 |
| P4 | 甘特图 + 预测 | 待 P1 |
| P5 | 路由 + 菜单 + 占位 | 待 P2+P4 |

---

## 财务三线：建议开工顺序与接缝

**三线已全部完成（2026-08-19）。**

| 序 | 阶段 | 状态 |
|---|---|---|
| 1 | 差旅 T1–T4 | ✅ 已完成 |
| 2 | 精益交付 L1–L4 | ✅ 已完成 |
| 3 | 运营费用 A–E | ✅ 已完成 |

| 接缝 | 主人 | 文件 | 后落的一方怎么接 |
|---|---|---|---|
| 时薪公摊率 | 运营费用 A 定义公式；L1 先用占位常量 | `pages/finance-shared/overhead.ts` 导出 `OVERHEAD_RATE`（占位 35 元/工时） | 精益公摊流水 = 项目工天 × 8 × 该常量；运营费用 OverheadTab 展示同一常量直到公式接上 |
| 报销双出口 | 差旅 T3 定义签名 | `pages/travel/expenseExits.ts`：`emitExpenseLedgerEntry` / `emitCostItem` | 精益消费成本流水；运营费用 B 消费台账投影。T3 之前精益报销通道降级 manual |
| TRAVEL 归属 | ADR-0089 | 有 `projectId` → `project`；仅 `leadId` → `lead_channel`；**禁止 pool** | 运营费用阶段 A/B 已按此修订 |

跨域 ID **不搞全局统一**：报价继续 `q1/q2`，合同继续 `'1'`–`'9'`；精益 L2 只 **追加** `fd-q-*` / `fd-ht-*`。日报模块本轮不改（精益 PRD 七）。
