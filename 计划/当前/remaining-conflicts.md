# 剩余冲突与含糊点（下次开工再消）

> 记下：2026-08-22。本轮只存档，**不写生产代码**。
> 已消：立项时机 + 实收口径 → `conflict-spawn-and-collections.md` / ADR-0095。
> 建议下一刀：**补充协议**（同时污染合同详情、有效标的额、回款、SYSTEM-OVERVIEW）。

开工顺序仍是：先 B5（`beta-foundation-b5-design.md`）→ 再本文。项目 id 三套并进 U1 详细设计，不必单开。

---

## A. 还在打架

1. **补充协议没死**  
   ADR-0008 / CONTEXT：补充报价 → 补充合同，「补充协议」废弃。  
   `ContractDetail` 仍上传/登记「补充协议」；`SYSTEM-OVERVIEW` 整节还在；360 把 `supplementaryAgreements` 显示成「补充合同」。看板「需求变更闭环 α 已实现」与「废弃补充协议 已设计」并存。有效标的额加哪张表会分叉。

2. **未确认项目三套 id**  
   合同创建：`ap-{合同id}`；`LeadDetail` 跟进（已在页面）：`lead-spawn-{线索id}`；ADR-0095：`ap-lead-{线索id}`。  
   跟进只 `setLeadStatus` + 内存 `addProject`，不写 LeadService。β 刷新丢失。先洽谈再向导则 B5 冒烟找不到 `ap-{合同id}`。U1 计划写「未写代码」，半套错误接线已在。

3. **SOP 交付计划 α 有、β 没有**  
   α `saveDeliveryPlan` 本地；Workers 无 `delivery_plans`。B5 标非目标，B3 验收仍像「批准 → 交付计划」。β 交付计划页会空。

4. **回款看板半套且口径旧**  
   `contracts/payment/paymentCalc.ts` 已存在，仍 `Σ collectionRecords`。决议是进度读 `collections`。不要按 8-19 计划从零新建 P1。

5. **报价阶段 4 三份进度**  
   计划文首：13 态、未写代码。代码已 10 态；看板 note 写 4.1–4.7 完成；planned「双来源」已设计、「责任人」未开始。按钮仍「确认成交」，状态「已确认」。

6. **公摊两套费率**  
   运营费用 `hourlyOverheadRate` vs 精益 `OVERHEAD_RATE=35`。已知未接缝，报表上像算错。

## B. 两套页面 / 两套账

- `/projects` 走 `ProjectList`，不是 `Projects.tsx`
- `LeadDetail` vs `LeadDetail360`
- 合同详情主合同回款 vs 补充协议页面局部回款（360 看不见后者）
- 360 回款首帧 `PROJECT_LIST`，刷新后改合同标的 + 实收
- β `SigningOpenBridge` 注释写刷新，`isBeta()` 直接 return（B5 洞 A）
- 看板 `productionOn` 报价/合同/项目仍 false，http 已注入（P3 冒烟后按口头确认翻）

## C. 文档过期（假冲突）

- `HubX/docs/SYSTEM-OVERVIEW.md`：项目 7 态、无未确认、3 条旧 mock、补充协议
- `HubX/CLAUDE.md`：仍写没有 fetch/API；`services/` + Workers 已是主路径
- ADR 0093/0094 各两份（opex vs β），引用必须带全文件名
- ADR-0083 文件名四 Tab，正文已第五 Tab
- 运营费用 restyle grill 文头「待开工」，看板 restyle 项已「α 已实现」
- 勿用 B3 旧验收「批准才看到未确认项目」

## D. 已知债（不是规则打架）

CaseDetail #4 `getEvalSummaries`、#10 Slider；基线 5 个失败；登录/权限；日报差旅精益 β 接缝；D1 两个 `0002_*.sql`（B5 P1 改名）。
