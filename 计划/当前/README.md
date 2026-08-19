# 计划/当前/

正在执行或刚定稿、还要对照着做的实现计划。

- `quote-flow-prd-implementation.md`：报价流程按 PRD grill 收口（阶段 4，未写代码）
- `unified-view-implementation.md`：线索·项目·合同统一视图（grill 后，未写代码）
- `operating-expense-dev-plan.md`：运营费用阶段 A–E（文件级已展开，已全部编码完成）
- `lean-delivery-dataline-dev-plan.md`：精益交付 L1–L4（文件级已展开，已全部编码完成）
- `travel-dev-plan.md`：差旅 T1–T4（文件级已展开，已全部编码完成）
- `phase3-deal-to-delivery.md`：销售域阶段 3（已完成；立项 spawn 点将被 U1 改回签约开启）
- `feature-board-existing-features.md`：功能看板既有功能核对
- `payment-kanban-dev-plan.md`：合同回款看板与甘特图（P1–P5，grill 已收束，未写代码）

---

## 合同回款看板：待开工

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
