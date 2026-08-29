# 剩余冲突与含糊点（下次开工再消）

> 记下：2026-08-22。本轮只存档，**不写生产代码**。
> 已消：立项时机 + 实收口径 → `conflict-spawn-and-collections.md` / ADR-0095；需求变更对象冲突 → ADR-0008 与 `HubX/docs/2026-08-28-α补充合同收口日志.md`。
> 公摊费率、差旅成本分类与 α 未确认项目唯一 ID 已于 2026-08-28 关闭；β 签约持久化仍归 B5/U1。

开工顺序仍是：先 B5（`beta-foundation-b5-design.md`）→ 再本文。项目 id 三套并进 U1 详细设计，不必单开。

---

## A. 还在打架

1. ~~**需求变更对象冲突**~~（2026-08-28 已关闭）
   运行时只保留补充报价与 `Contract.kind='supplement'` 补充合同；项目 360、合同详情和回款发票均按已归档补充合同派生有效标的额与实收，看板及系统概览已同步。

2. **未确认项目 ID（α 已关闭，β 待 B5/U1）**
   α 已统一为：有线索始终使用 `ap-lead-{线索id}`，无线索合同才回退 `ap-{合同id}`。`LeadDetail360` 跟进已写入 `LeadService`，线索首次进入“合同洽谈/已签单”时生成项目；后续合同创建按线索别名幂等合并并绑定 `contractId`。
   β Workers 仍需复制同一规则并验证刷新持久化；该部分未在本次 α 范围内改动。

3. **SOP 交付计划 α 有、β 没有**  
   α `saveDeliveryPlan` 本地；Workers 无 `delivery_plans`。B5 标非目标，B3 验收仍像「批准 → 交付计划」。β 交付计划页会空。

4. **回款看板半套且口径旧**  
   `contracts/payment/paymentCalc.ts` 已存在，仍 `Σ collectionRecords`。决议是进度读 `collections`。不要按 8-19 计划从零新建 P1。

5. **报价阶段 4 三份进度**  
   计划文首：13 态、未写代码。代码已 10 态；看板 note 写 4.1–4.7 完成；planned「双来源」已设计、「责任人」未开始。按钮仍「确认成交」，状态「已确认」。

6. ~~**公摊两套费率与差旅分类分叉**~~（2026-08-28 已关闭）
   公摊统一为“当月公共运营池 ÷ 全公司在职编制工时”，固定 `OVERHEAD_RATE=35` 已退出；差旅双出口及成本页均独立归入差旅，不再计入商务。

## B. 两套页面 / 两套账

- `/projects` 走 `ProjectList`，不是 `Projects.tsx`
- `LeadDetail` vs `LeadDetail360`
- ~~合同详情与项目 360 的补充合同回款口径分叉~~（2026-08-28 已关闭）
- 360 回款首帧 `PROJECT_LIST`，刷新后改合同标的 + 实收
- β `SigningOpenBridge` 注释写刷新，`isBeta()` 直接 return（B5 洞 A）
- 看板 `productionOn` 报价/合同/项目仍 false，http 已注入（P3 冒烟后按口头确认翻）

## C. 文档过期（假冲突）

- `HubX/docs/SYSTEM-OVERVIEW.md`：项目 7 态、无未确认、3 条旧 mock（合同变更章节已更新）
- `HubX/CLAUDE.md`：仍写没有 fetch/API；`services/` + Workers 已是主路径
- ADR 0093/0094 各两份（opex vs β），引用必须带全文件名
- ADR-0083 文件名四 Tab，正文已第五 Tab
- 运营费用 restyle grill 文头「待开工」，看板 restyle 项已「α 已实现」
- 勿用 B3 旧验收「批准才看到未确认项目」

## D. 已知债（不是规则打架）

CaseDetail #4 `getEvalSummaries`、#10 Slider；基线 5 个失败；登录/权限；日报差旅精益 β 接缝；D1 两个 `0002_*.sql`（B5 P1 改名）。
