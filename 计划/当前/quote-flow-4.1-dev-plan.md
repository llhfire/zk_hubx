# 报价 4.1 开发计划：状态机与词表收口

> 2026-08-18 · 只规划不写码  
> 纲领计划：`计划/当前/quote-flow-prd-implementation.md` §4.1（本文是其展开）  
> 事实源：ADR `0001`–`0065`（重点 `0019` 单号、`0021` 重新报价、`0032` 无已完成桶、`0044`–`0045` 含税/有效期、`0046`–`0048` 删除/作废/再生成、`0050`–`0051` 状态回退、`0058` 单号年重置、`0064`–`0065` 退回改清单）；PRD `文档/PRD/PRD-报价流程管理.md` v1.1

## 1. 现状与差距

### 1.1 词表：13 态 -> 10 态

`types.ts` 现有 13 态，目标收敛（PRD §状态机）：

| 旧 status | 新 status | 新展示词 | 说明 |
|-----------|-----------|---------|------|
| `draft` | `draft` | 草稿 | 不变 |
| `feature_confirmed` | `pending_eval` | 待评估 | 提交清单即待评估 |
| `eval_completed` | `pending_quote` | 待报价 | 评估完待报价配置 |
| `assigned_sales` | `pending_quote` | 待报价 | 三态合一 |
| `quote_summarized` | `pending_quote` | 待报价 | 同上 |
| `auditing` | `auditing` | 待审核 | 展示词「审批中」改「待审核」 |
| `rejected` | `rejected` | 已驳回 | 展示词「驳回待修改」改 |
| `pending_stamp` | `pending_stamp` | 待盖章 | 不变 |
| `stamped` | `stamped` | 已盖章 | 不变 |
| `sent` | `sent` | 已发出 | 不变 |
| `deal` | `confirmed` | 已确认 | ADR 0066：已确认 ≠ 签约 |
| `pending_followup` | `sent` | 已发出 | **见 §6 决策 2** |
| `voided` | `voided` | 已废止 | 展示词「已作废」改 |

### 1.2 改动面盘点（谁在引用旧词表）

| 文件 | 引用点 | 改动性质 |
|------|--------|---------|
| `pages/quotation/types.ts` | `QuoteStatus` / `QUOTE_STATUS_LABELS` / `QUOTE_STATUS_COLORS` / `QuoteAction` / `QUOTE_ACTION_LABELS` | 词表本体 |
| `pages/quotation/quoteFlow.ts` | `deriveStage` / `getStageAccess` / `isTerminalStatus` / `getPendingOwner` / `getPendingRoles` 五个 switch | 全部按新词表重写 |
| `services/quotationMutations.ts` | `applySubmitFeatureList` 写 `feature_confirmed`；`applyNewVersion` 写 `assigned_sales`；`generateQuoteNo` 出 `ZK-YYYYMMDD-NNN` | 状态写入点 + 单号 |
| `services/quotationService.ts` | mock/HTTP 两套 `markDeal -> applyTransition('mark_deal', ..., 'deal')` | 动作改名 |
| `pages/quotation/QuotationContext.tsx` | `markDeal` API 名 | 对外接口名 |
| `pages/quotation/stages/Stage4Approval.tsx` | `quote.status === 'deal'` 判断 ×2、成交按钮、生成主合同按钮 | 终态 UI |
| `pages/quotation/QuotationCenter.tsx` + Workbench | labels/colors 间接引用 + 阶段导航 | 展示层 |
| `pages/quotation/mockData.ts` | 种子 `assigned_sales` / `draft` ×2 | 种子迁移 |
| `apps/api/src/index.ts` | `seedQuote()` status `draft`（线上 D1 还有存量行） | 种子 + 读时迁移 |
| `pages/quotation/__tests__/quoteFlow.test.ts` | 9 个 describe 大量旧状态断言 | **最大测试面** |
| `pages/contracts/dealQuotePrefill.ts` | 阶段 3 预填（读 quote 字段，不读 `deal` 字面量） | 只核对，预计不改 |

**不在范围**：线索侧 `flowStatus`（`leadDetailProfiles.ts` 的「已审核」等）是线索域自己的 mock 词表，收口是交接待办 #5 / U4 的事，4.1 不碰。

### 1.3 已就绪、不用新建的

- `Quote.sentAt?` 与 `basicInfo.quoteValidityDays`（默认 30）字段已存在，过期只差一个纯函数。
- `resolveAuditOutcome` / `resetAuditNodes` / `nextVersion` 与状态词表解耦，不动。
- `withdraw_audit`（撤回审批回待报价）动作已存在，PRD 要求保留。

## 2. 目标行为（改完后必须成立）

1. 全库不存在 `feature_confirmed` / `eval_completed` / `assigned_sales` / `quote_summarized` / `deal` / `pending_followup` 字面量（grep 可验）。
2. 主链：`draft -> pending_eval -> pending_quote -> auditing -> pending_stamp -> stamped -> sent -> confirmed`；`rejected` 从 `auditing` 驳回产生，回 `pending_quote`。
3. 新增四个回退动作（PRD §回退）：撤回发出（`sent -> stamped`）、退回盖章（`stamped -> pending_stamp`，未发出才可）、退回改清单（`rejected -> draft`，ADR 0064）、退回技术重评（已有 `return_to_tech`，核对去向 = `pending_eval`）。
4. `mark_deal` 全面改名 `mark_confirmed`，终态 `confirmed`；`isTerminalStatus = confirmed | voided`。
5. 过期是 `sent` 上的标记：`isExpired(quote, today)` = `sentAt + quoteValidityDays < today`，不改 status、不进终态。
6. 单号 `QT-YYYY-序号`：主/补共用当年序列，每年从 1 计（ADR 0019 + 0058）。
7. `deriveStage`：draft=1，pending_eval=2，pending_quote/rejected=3，其余（含 confirmed/voided）=4。
8. 阶段 3 按钮文案：成交 -> 「确认成交/已确认」；「生成主合同」入口与 `dealQuotePrefill` 预填链路保留不动。

## 3. 架构决策

### 决策 1：迁移做成「读时迁移」纯函数，锁在单测里

`services/quotationMutations.ts` 新增：

```ts
migrateQuote(quote: Quote): Quote   // status 逐条映射 §1.1 表 + timeline.action 映射（§6 决策 3）
```

- mock service 从 localStorage 读出后、HTTP service 从 API 拿到后、`apps/api` 从 D1 读出后，**三处读路径统一过这道函数**再进 UI。懒迁移、不主动写回（下次保存自然落新词表）。
- 迁移表本身就是单测的断言对象（§5.1），以后谁改词表先红测试。
- 新建 `buildNewQuote` / `applySubmitFeatureList` / `applyNewVersion` 直接写新词表，不再产旧状态。

### 决策 2：动作层集中收口，Context 只改名不改语义

- `QuoteAction` 联合类型：`mark_deal -> mark_confirmed`；新增 `withdraw_sent` / `return_to_stamp` / `return_to_edit_features`；`return_to_tech` 保留核对。
- 新增一个**合法迁移表**纯函数 `canTransition(from, action): boolean`（或 `TRANSITIONS: Record<action, {from[], to}>` 常量导出），service 层四个新动作都先查表再 `applyTransition`，替代散落的 if。这是本计划唯一新增的「结构」，换来的是动作合法性可单测全覆盖。
- `QuotationContext.markDeal` 改名 `markConfirmed`（调用方只有 Stage4Approval 一处）；service 接口同步。

### 决策 3：单号与「列表长度」脱钩

现 `generateQuoteNo(listLength)` 用列表长度 +1，作废/删除后**会重号**，且格式是 `ZK-YYYYMMDD-NNN`。改为：

```ts
generateQuoteNo(existing: { quoteNo: string }[], year: number): string  // QT-{year}-{当年最大序号+1}
```

按 `QT-YYYY-` 前缀过滤现有单号取最大序号，每年自然从 1 重新开始；主/补共用由调用方传全量（4.7 补充报价落地时零改动接入）。

### 决策 4：过期是派生，不是字段

`quoteFlow.ts` 新增 `isExpired(quote, today: string): boolean`（默认天数取 `quote.basicInfo.quoteValidityDays ?? 30`）。列表页「已发出」行打过期标记的消费在 4.2（列表/待我处理），本计划只交付纯函数 + 单测，UI 接标记留给 4.2，避免越界。

## 4. 文件改动清单（生产代码 11 处）

| # | 文件 | 改动 |
|---|------|------|
| 1 | `pages/quotation/types.ts` | 词表 13->10、LABELS/COLORS、动作枚举 + 标签 |
| 2 | `services/quotationMutations.ts` | +`migrateQuote`、+`TRANSITIONS` 表、`applySubmitFeatureList`/`applyNewVersion` 写新词表、`generateQuoteNo` 重写 |
| 3 | `pages/quotation/quoteFlow.ts` | 五个 switch 按新词表重写、+`isExpired` |
| 4 | `services/quotationService.ts` | mock/HTTP 读路径接 `migrateQuote`；`markDeal -> markConfirmed`；四个新动作方法 |
| 5 | `pages/quotation/QuotationContext.tsx` | `markDeal -> markConfirmed` + 新动作透传 |
| 6 | `pages/quotation/stages/Stage4Approval.tsx` | `'deal' -> 'confirmed'` 判断、按钮文案「确认成交」、新增撤回发出/退回盖章按钮（按 TRANSITIONS 控制显隐） |
| 7 | `pages/quotation/QuotationCenter.tsx` | 列表 labels/colors 随 types 自动生效，核对即可 |
| 8 | `pages/quotation/mockData.ts` | 两条种子写新词表 + 单号改 QT 格式 |
| 9 | `apps/api/src/index.ts` | seed 单号/状态核对 + D1 读路径过迁移（Workers 有改动，下次发布需发 Workers，交接时注意） |
| 10 | `pages/quotation/__tests__/quoteFlow.test.ts` | 旧状态断言全量改写 + 新用例（§5） |
| 11 | `services/quotationMutations` 对应测试（如无独立文件则并入 quoteFlow.test.ts 或新开 `quotationMutations.test.ts`） | 迁移表/单号/TRANSITIONS 用例 |

## 5. 测试用例设计

### 5.1 迁移表（新，最优先）

逐条锁 §1.1 的 13 行映射，每行一个断言；再加：

- `pending_followup -> sent`（保留 `sentAt`，决策见 §6）。
- `deal -> confirmed` 且 `timeline` 中 `mark_deal` 事件 action 改写为 `mark_confirmed`。
- 已是新词表的 quote 过迁移函数**幂等**（两次调用结果相等）。
- 未知 status（脏数据）兜底 -> `draft`？**不**：原样抛出/保留并 console 警告，单测断言不静默吞（脏数据要看得见）。

### 5.2 状态机核心（改写现有 describe）

- `deriveStage`：新词表 10 态逐态断言（rejected=3、confirmed/voided=4）。
- `isTerminalStatus`：confirmed/voided 为真，sent/stamped 为假。
- `getPendingRoles`/`getPendingOwner`：pending_eval 待技术、pending_quote 待销售、auditing 待会签人、pending_stamp 待董助、stamped/sent 待销售、confirmed/voided 空。

### 5.3 TRANSITIONS 合法迁移矩阵（新）

每行动作一条「from 集合」断言：

- `mark_confirmed`: 仅 `sent`
- `withdraw_sent`: 仅 `sent`（-> stamped，ADR 0050）
- `return_to_stamp`: 仅 `stamped` 且**未发出**（`sentAt` 为空）
- `return_to_edit_features`: 仅 `rejected`（-> draft，ADR 0064）
- `return_to_tech`: 核对现去向，应为 `pending_quote -> pending_eval`
- `withdraw_audit`: 仅 `auditing`（-> pending_quote，现有）
- `mark_voided`: 非终态（4.8 的「有未作废合同不能废止」是后续阶段的前置条件，这里只锁终态互斥）
- `new_version`: 保持现语义（重新报价复制新号，ADR 0021），from = 已驳回/已废止

### 5.4 过期（新）

- `sent` + `sentAt` + 29 天 -> 未过期；30 天 -> 过期（默认 30）。
- `quoteValidityDays = 7` 覆盖默认。
- 非 `sent` 状态（含 confirmed）恒不过期；`sentAt` 缺失恒不过期。

### 5.5 单号（新）

- 空列表 -> `QT-2026-1`。
- 已有 `QT-2026-1..3`（混入 `QT-2025-99`）-> 下一号为 `QT-2026-4`（跨年重置 + 忽略他年）。
- 非常规单号（旧 `ZK-20260814-001`）混入不炸、不参与计数。

### 5.6 回归

- `resolveAuditOutcome`、`validateBeforeAudit`、金额汇总、切片重组 describe 与词表无关，**不改应全绿**。
- 已知基线债（4 断言 + react-quill）不新增。
- `npx vitest run` 全量 + `npm run build`（vitest 工作目录 `HubX/apps/prototype`）。

### 5.7 人工验证（本地 α）

1. 旧词表清零：列表/工作台/流转轨迹里不再出现「成交、功能清单已确认、已转派销售、报价已汇总、待跟进、已作废」字样。
2. 新回退链实测：已发出 -> 撤回发出回已盖章；已盖章（未发）-> 退回盖章；已驳回 -> 退回改清单回草稿。
3. 成交改名：sent 单点「确认成交」-> 已确认 + 「生成主合同」仍可用且预填金额正确（阶段 3 链路不回归）。
4. 浏览器带旧 localStorage 数据的页面刷新后列表正常（读时迁移生效）。
5. 过期标记留给 4.2，不在本轮人工项。

## 6. 边界决策（提前拍死）

1. **`rejected` 是状态不是阶段**：阶段 3 的「已驳回」单仍可改后重提，展示词统一「已驳回」。
2. **`pending_followup -> sent`**：待跟进语义上仍是「已发出等客户」，PRD 新词表没有它的位置；迁移到 `sent`，跟进动作由 4.2 的通知/待办承接。种子与 mock 中无实例，风险为零。
3. **timeline 历史动作一并迁移**：`mark_deal -> mark_confirmed` 在 `migrateQuote` 内同步改写，否则旧单轨迹显示「客户成交」与新按钮「确认成交」打架。其余历史 action 标签不变。
4. **脏数据不静默**：迁移遇到未知 status 不兜底、不吞，保留原值并在 console 警告——词表收敛期脏数据必须可见。
5. **`apps/api` 有改动**：D1 读路径过迁移函数意味着 Workers 要随本阶段发布（CLAUDE.md 下班发布规则：api 有改必发）。
6. **看板/架构图**：4.1 属于纲领计划已在看板 planned 的「报价工作台」板块内，完成编码时把该条描述推到实现进度（纲领 §4.9 已约定），架构图无新入口不动。

## 7. 实施步骤（每步全量 vitest + build 绿再进下一步）

| 步 | 内容 | 产出 |
|----|------|------|
| T1 | `types.ts` 词表收敛 + `migrateQuote` + 迁移单测（此时编译会红，T2/T3 接着补） | §5.1 |
| T2 | `quoteFlow.ts` 五函数重写 + `isExpired` + 测试改写 | §5.2/5.4 |
| T3 | `TRANSITIONS` 表 + 四个新动作 + `markConfirmed` 改名（service/Context/Stage4）+ 测试 | §5.3 |
| T4 | `generateQuoteNo` 重写 + 测试 | §5.5 |
| T5 | 种子迁移（mockData + apps/api）+ 读路径接 `migrateQuote` | - |
| T6 | UI 文案核对（Stage4 按钮、Center 标签）+ grep 验证旧词清零 | §5.7.1 |
| T7 | 人工验证 §5.7 全过 + 四件套收尾（看板进度推进） | - |

T1 完成时全库编译短暂红是预期的（词表是根依赖），T2/T3 连续做完即恢复；不要为了保持每步绿而保留旧词表兼容层——本计划的目标就是删掉它。
