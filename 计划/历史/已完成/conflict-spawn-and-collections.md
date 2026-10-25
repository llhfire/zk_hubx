# 冲突决议：立项时机 × 实收口径

| 字段 | 内容 |
|---|---|
| 日期 | 2026-08-22 |
| 状态 | 已决议（不写生产代码） |
| 事实源 | ADR-0066/0067/0068；ADR-0093（被 0095 修订）；ADR-0095；`HubX/CONTEXT.md` 签约开启 / 回款期次 / 实收 |
| 不涉及 | 报价 4.x 计划与现网进度差（那是清单过期，不是规则打架） |

本文只消掉两处**文档互相打架**。B5 仍按 `beta-foundation-b5-design.md` 编码；U1 / 回款看板按本文改过的计划再开工。

---

## 冲突 1：未确认项目何时出现

### 打架的三句话

| 出处 | 写法 | 问题 |
|---|---|---|
| ADR-0067、CONTEXT「签约开启」 | 洽谈/已签单 **或** 主合同创建（草稿）→ spawn；批准只开工 | 领域规则，赢 |
| ADR-0093 第一句、B3 验收 | 「合同批准 → 生成未确认项目」 | 把阶段 3 的错误接线当成迁到服务端的对象 |
| U1 开发计划决策 1 | 合同侧继续用前端桥 spawn；线索跟进在 `LeadDetail` 显式 `addProject` | 合同侧 B3 已迁 Workers；β 上 `addProject` 不落 D1 |

现网代码（工作区，未发）：`PUT /api/contracts/:id` 仅 `if (old)` 才联动，`created` 实际不可达；`events.approved` 无项目则 `continue`。α 仍靠桥 `addProject`。这是 B5 洞 C 要修的 **接线 bug**，不是改规则。

纯函数早已按 0067 写好：`shouldSpawnUnconfirmedProject` 看线索状态或有效合同，不看 `approvedAt`。

### 决议

1. **领域**：继续 ADR-0067。禁止再写「批准才第一次立项」。
2. **合同创建 spawn**：B5 P0 洞 C（`prevSnapshotForWrite({})` + ③ 补洞）。向导确认创建草稿后就该有 `ap-{合同id}`。批准路径仍不兜底 spawn。
3. **线索洽谈 spawn（无合同）**：仍要做（U1 验收：「打成洽谈、尚无合同，管理员队列出现未确认项目」）。实现改为 **Lead 写时联动**（`PUT /api/leads/:id` 与跟进写入导致状态变化时，Workers 内 spawn），id = `ap-lead-{leadId}`，`buildUnconfirmedProject` 无合同字段版。α 走同一 mutations。前端禁止 β `addProject`。
4. **顺序**：B5 冒烟不覆盖「无合同的洽谈 spawn」。U1 在 B5 之后，且必须改计划接线（见 `unified-view-u1-dev-plan.md` 文首修订）。
5. **ADR-0093**：保留「联动在 Workers、前端只刷新」。第一句由 ADR-0095 纠正。B3 验收改为「创建主合同草稿 → 未确认项目落 D1，不依赖任何前端开着」。

否决：把洽谈无合同的 spawn 砍掉（与 CONTEXT 冲突）；批准时再兜底 spawn（0067 禁止）；U1 继续只改前端桥（β 丢事件）。

---

## 冲突 2：回款看板读哪一层钱

### 打架的两句话

| 出处 | 写法 | 问题 |
|---|---|---|
| CONTEXT 回款期次 / 实收；ADR-0094 文档式 `collections` 表；B4 | 期次 = `paymentPlans`（计划）；实收 = 独立台账 | 赢 |
| `payment-kanban-dev-plan.md` P1 | `deriveCollectionProgress(contract)`、自建 `paymentMock`、录入弹窗只打合同 | 把嵌套 `collectionRecords` 当已到账；会与 360 / B5 双写分叉 |
| B4 计划 §5.2 | 看板「先于」B4 执行 | 实际 B4 已先接实收；看板未开工 |

B5 洞 B：合同详情登记走 `registerMainPaymentDualWrite`（先嵌套流水、后台账，共用 id）。嵌套流水留下是因为旧看板还要读它——**在看板改口径后，新写入仍双写，派生进度只认台账**。

### 决议

1. **待付 / 逾期 / 即将到期**：只读合同 `paymentPlans`（回款期次）。
2. **已回 / 进度 / 本月已回款**：只读 `CollectionService` 台账（按 `contractId` 切片合计）。禁止用 `contract.collectionRecords` 当看板进度的事实源。
3. **录入到账**（看板弹窗 / 抽屉）：必须调用与合同详情同一套 `registerMainPaymentDualWrite`，禁止只 `applyAddCollection` 或另写一套 mock。
4. **不要**新建平行 `paymentMock` 当主数据；五态演示用现有合同 + 台账种子。
5. 排期：看板 P1–P5 **后于** B4/B5（实收表 + 双写已在）。B4 原文「看板先于本阶段」作废。
6. 甘特「已结清节点」= 该期次计划金额已被实收覆盖的派生，不把实收写回期次字段。

否决：看板只读嵌套流水（CONTEXT _Avoid_）；服务端从合同 JSON 抽实收替代 `collections` 表（B5 已否）；为看板再做第三套回款写入。

---

## 编码入口（本文不写代码）

| 何时 | 做什么 |
|---|---|
| 现在 | B5 P0–P3 按 `beta-foundation-b5-design.md` |
| B5 之后 | U1：Lead 写时 spawn（ADR-0095），删计划里「桥 spawn / LeadDetail addProject」 |
| B5 双写之后 | 回款看板 P1 起按本文改过的 `payment-kanban-dev-plan.md` |

---

## 文档已改

- 新 ADR-0095；ADR-0093 文首修订
- `CONTEXT.md` 签约开启 / 实收 _Avoid_
- `unified-view-u1-dev-plan.md`、`unified-view-implementation.md`、`beta-foundation-dev-plan.md`、`payment-kanban-dev-plan.md`、`beta-foundation-b5-design.md` 口径句
