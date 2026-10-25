# 计划/当前/

**还在推进、需要对照着做的**实现计划。已完成的移入 `计划/历史/已完成/`。

> 更新：2026-10-25（目录整理：44 份 → 11 份；33 份已完成计划归档）

## 一、尚未闭环（真待办）

| 优先级 | 事项 | 依据 | 状态 |
|---|---|---|---|
| **P0** | 核心漏斗真实闭环：β 真实数据阶段 3、4 + B5 签约联动，验证刷新后持久化与幂等 | `beta-realdata-dev-plan.md`、`beta-foundation-b5-design.md` | 待开工 |
| **P2** | 生产支撑底座：登录会话、用户目录、RBAC、路由/API 权限、服务端审批/待办/提醒持久化、共享工天服务 | — | 未立项 |
| **P3** | 资源与运维域：资源生命周期、运维工单 PRD 与状态机 | — | 未立项 |

详细依据见 `全域流程完整性评估.md`。核心漏斗通过前，暂缓新增独立页面和管理驾驶舱能力。

## 二、计划文件一览（11 份）

**待实施 / 设计已定稿待编码**

- `报价双轨分离-PLAN.md` — 数据流转 / 文件流转事实源与审批前路径分离（已 grill 锁定，阶段 A–E 待实施）
- `项目确认书流程-PLAN.md` — 确认书状态机与归档流程
- `beta-foundation-b5-design.md` — B5 β 上线收口详细设计（Approved 待编码；`productionOn` 目标已确认，P3 冒烟后执行）
- `operating-expense-restyle-design.md` — 运营费用菜单重构详细设计（评审 0 issue，P0–P6 待编码）
- `operating-expense-restyle.md` — 运营费用菜单重构（grill 已收束）

**进行中 / 滚动对照**

- `beta-foundation-dev-plan.md` — β 平台底座与漏斗主线接缝（B0–B4 编码完成，B5 待开工）
- `beta-realdata-dev-plan.md` — β 真实数据推进
- `payment-kanban-dev-plan.md` — 合同回款看板与甘特图（α P1–P5 已实现，β 持久化待 B5）

**参照性文档（长期有效，非一次性计划）**

- `全域流程完整性评估.md` — 全局缺口评估，P0/P2/P3 的依据
- `feature-board-existing-features.md` — 功能看板既有功能核对口径

## 三、已归档（`计划/历史/已完成/`，33 份）

销售域 α、报价流程 4.1–4.8、统一视图 U1–U6、精益交付 L1–L4、差旅 T1–T4、运营费用 A–E、线索派发 A–E、全局搜索 S1–S3、智能会议、业务单详情、UI 08261727、全页面一致性检查等，均已完成落地。

对应验证记录在 `HubX/docs/logs/`（30 份按日期命名的收口日志）。

## 四、代码结构速查（2026-10-25 重构后）

`packages/ui/src/app/pages/` 已按功能看板的 8 大业务域分层：

```
sales/        leads · lead-dispatch · quotation · contracts · customers · company-entity · compliance
delivery/     project · daily-report · plan
finance/      operating-expense · travel · lean-delivery · contract-cost · invoice · overhead
acquisition/  lead-cost
support/      approvals · hr/employee · system · workbench · meetings · smart-meetings · feedback · todos
resource/     assets · suppliers · knowledge
ops/          maintenance
cross/        roi · ai · reports · integrations · components
ui-library/
```

领域词以 `HubX/CONTEXT.md` 为准，硬决策见 `HubX/docs/adr/`。
