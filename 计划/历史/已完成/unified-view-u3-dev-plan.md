# U3 开发计划：主合同作废 ↔ 项目搁置

> 2026-08-18 · 只规划不写码  
> 纲领计划：`计划/当前/unified-view-implementation.md` §U3（本文是其展开）  
> 事实源：ADR `0072`（主合同作废搁置进行中项目）、`0073`（线索终止不停止交付）、`0048`（作废合同后同一已确认报价可再生成）；PRD `文档/PRD/PRD-线索项目合同统一视图.md` v1.1  
> 前置：**U1 先行**（桥已改名 SigningOpenBridge、`diffContractEvents` 已存在、spawn 已移到签约开启）

## 1. 现状与差距

### 1.1 作废联动是零实现，且没有监听点

- `applyVoidContract`（`services/contractMutations.ts:240-243`）只做两件事：状态机校验 + `status='voided'` 和作废原因写进合同内容。**不改 approvedAt、无任何跨域联动**。
- 桥的快照只 diff `approvedAt`（`ApprovalDeliveryBridge.tsx:66-81`），合同变 voided 时 `approvedAt` 不变、diff 为空、**什么都不会触发**。作废后全仓的 voided 消费点全是「过滤掉/标红」（PaymentKanban、paymentUtils 等），没有任何写操作。
- 作废是死终点（`contracts/utils.ts:102-107`，`voided: []`）；`applyVoidContract` 不清 `approvedAt`，所以「重签新合同批准」走**新合同 id** 的 approvedAt 首写，天然可行。

### 1.2 「搁置」状态已存在但没有自动入口

- `ProjectStatus` 已含 `'搁置'`（`project-management/mockData.ts:2`），列表色卡、详情页、线索执行 Tab、`leadProjectBanner`（搁置归 `assigned`，`caseUtils.ts:133`）都已支持展示。
- **没有代码自动置搁置**：唯一入口是 Projects 页编辑弹窗手动改状态（`Projects.tsx:335-336`）；mock 无搁置种子。
- 恢复侧 `startDelivery` 已支持搁置 -> 进行中（`caseUtils.ts:102`，有单测），但有两个洞：① 103 行「项目已绑其他合同不启动」会挡住「绑着旧作废合同的搁置项目被新合同拉起」；② 桥拉起成功时**无条件重生成 SOP 交付计划并覆盖旧的**（`ApprovalDeliveryBridge.tsx:122-131`），复工场景会把进行中的计划清掉。

### 1.3 主/补充合同无模型区分（ADR 0072 的前提缺失）

- `Contract` 无 type/isMain/kind 字段（`contracts/types.ts:161-206`）；`BusinessCase.extraContractIds` 全部写入点都是空数组、无任何消费。
- 现存「补充协议」是 `ContractDetail` 页面**局部 useState** 的 `SupplementaryAgreement`（`ContractDetail.tsx:130-160`，不落 Context、不持久化、无 leadId）--它不是合同实体，4.7 会用「补充报价 -> 补充合同向导」整体替代它。
- ADR 0072 说「补充合同作废不搁置项目」，但现在代码层面**判定不了谁是补充合同**。

### 1.4 顺手发现的报价 0048 断链（与作废联动同根因）

- 合同创建时回写 `quote.contractId`（`ContractWizard.tsx:292-296`），但作废时**无人清空**；Stage4 只看 `quote.contractId ? 查看主合同 : 生成主合同`（`Stage4Approval.tsx:464-472`），不查合同是否 voided。
- 结果：作废后按钮不回来，销售被跳去一张作废合同。看板已声称「对应合同作废后可再生成」，实现缺位。

## 2. 目标行为

| # | 触发 | 项目现状 | 动作 |
|---|------|---------|------|
| 1 | 主合同作废 | 进行中且 `contractId` 绑该合同 | 置搁置（progress 文案记原因），日报/交付计划保留 |
| 2 | 主合同作废 | 未确认/未开始/验收中/已完成 | 不动 |
| 3 | 补充合同作废（4.7 落地后） | 任意 | 不动项目状态 |
| 4 | 进行中但绑的是别的合同 | 该合同作废 | 不动 |
| 5 | 新主合同批准 | 搁置（旧绑定合同已作废） | 复工 -> 进行中 + 重绑新合同，**不重生成 SOP 计划** |
| 6 | 新主合同批准 | 未开始 | 首启 -> 进行中 + 生成 SOP（U1 行为保留） |
| 7 | 线索终止 | 任意 | 不动项目（ADR 0073，已保证，回归项） |

## 3. 架构决策

### 决策 1：`Contract.kind` 字段先落地，补充合同实体留给 4.7

- `Contract` 增 `kind: 'main' | 'supplement'`，`migrateQuote` 对应的合同侧迁移（contractService 读路径/种子）统一补 `kind: 'main'`；向导创建默认 main。
- U3 的联动只对 `kind === 'main'` 生效--「补充合同作废不动项目」从第一天就是可判定的，4.7 落地向导时传 `kind: 'supplement'` 即零改动接入。
- `ContractDetail` 局部 state 的旧「补充协议」**不迁移不清理**（4.7 整体废弃该入口）。

### 决策 2：作废事件进同一个 diff 纯函数

U1 已建 `diffContractEvents(prev, next) -> { created, approved }`，本计划扩成 `{ created, approved, voided }`：

- 快照值从 `approvedAt` 扩为 `{ approvedAt, status }`。
- `voided` 事件 = status 变为 `voided`（首帧不触发原则照旧；作废是死终点，不存在「取消作废」回退事件）。
- 桥的 `voided` 处理：`kind === 'main'` + 项目存在 + 进行中 + `project.contractId === contract.id` -> `shelveProject`。

### 决策 3：`shelveProject` 纯函数 + `startDelivery` 重绑规则

- `caseUtils.ts` 新增 `shelveProject(input: { project; reason; today }) -> DeliveryShelvePatch | null`：仅 `进行中` 返回 `{ status: '搁置', latestProgress: '主合同已作废（原因），项目搁置，待新主合同批准复工。' }`；其余返回 null。
- `startDelivery` 增可选入参 `boundContractVoided?: boolean`：项目 `contractId` 已绑但该合同已作废 -> **允许重绑**新合同（修复 1.2 的洞 ①）。桥调用时按「旧绑定 id 查 contracts 是否 voided」传入。
- 桥的复工路径：拉起前项目状态为搁置 -> **跳过 `generateDeliveryPlan`**（保留原计划与日报）；未开始首启才生成（修复洞 ②）。

### 决策 4：报价 0048 一并修（同一次桥改造最顺）

桥挂在 `QuotationProvider` 内（`App.tsx`），可直接 `useQuotation().updateQuote`：

- `voided` 事件处理里追加：`quote.contractId === contract.id` 的报价 -> 清空 `contractId`（timeline 不动，生成记录在合同侧）。
- 清空后 Stage4 的「生成主合同」按钮自然回来，`Stage4Approval` 只需核对不用改逻辑。
- 语义上属纲领 4.8 的范围，此处只做「释放引用」这一小步；4.8 的完整联动（废止前置校验等）仍在 4.8。

## 4. 文件改动清单（生产代码）

| # | 文件 | 改动 |
|---|------|------|
| 1 | `pages/contracts/types.ts` | `Contract.kind: 'main' \| 'supplement'` |
| 2 | `services/contractMutations.ts` | `applyCreateFromWizard` 写 kind（默认 main）；合同侧读路径迁移补 kind |
| 3 | `pages/contracts/signingOpenEvents.ts`（U1 产物） | 快照值扩 `{approvedAt, status}`，+`voided` 事件 |
| 4 | `business-case/caseUtils.ts` | +`shelveProject`；`startDelivery` 增 `boundContractVoided` 重绑规则 |
| 5 | `pages/contracts/SigningOpenBridge.tsx`（U1 产物） | +voided 分支（搁置 + 清 quote.contractId）；复工跳过 SOP 重生成 |
| 6 | `pages/contracts/components/ContractActionBar.tsx` | 作废确认文案补「进行中项目将搁置」提示（1 行，可选） |
| 7 | 测试：`signingOpenEvents.test.ts` / `caseUtils.test.ts` 扩用例 | §5 |

## 5. 测试用例设计

### 5.1 `diffContractEvents` 扩展

- status archived -> voided -> 进 voided；draft -> voided 同理。
- 首帧即 voided（存量作废合同）-> 无事件。
- approvedAt 与 status 同帧同变（理论上不可能，防御）-> 两事件独立产出。

### 5.2 `shelveProject`

- 进行中 + 原因 -> 搁置 patch，文案含原因与「待新主合同批准复工」。
- 未确认/未开始/搁置本身 -> null。

### 5.3 `startDelivery` 重绑

- 搁置 + 绑定已作废合同 + 新合同 -> 进行中 + contractId 换新（`boundContractVoided: true`）。
- 搁置 + 绑定**未作废**合同 + 另一张新合同 -> 仍拒绝（防串单，保留现 103 行语义）。
- 未开始 + 新合同 -> 原行为回归。

### 5.4 报价释放

- 作废合同 + `quote.contractId` 指向它 -> 清空；指向别的合同 -> 不动。

### 5.5 回归

- U1 全部用例（spawn 在 created、批准不重复 spawn）绿；搁置后 `leadProjectBanner` 显示 assigned 类条幅；`npm run build`。

### 5.6 人工验证（依赖 U1 已合入，先走到进行中）

1. 进行中项目 -> 作废其主合同 -> 项目列表变搁置、详情进度文案更新、**日报与交付计划仍可看**。
2. 搁置项目 -> 走向导重签主合同 -> 批准 -> 项目回进行中、原 SOP 计划未被覆盖。
3. 作废后回 Stage4 -> 「生成主合同」按钮回来，可再次生成。
4. 线索终止 -> 项目状态不动（0073 回归）。
5. 未确认/未开始项目作废其草稿合同 -> 项目不动。

## 6. 边界决策

1. **只有进行中搁置**：ADR 0072 只说进行中；未确认/未开始本来就没开工，无搁置意义。
2. **复工不重生成计划**：计划/日报是交付资产，作废-重签循环不应清空；只有未开始首启生成。
3. **搁置期间日报照常读写**：产品未定义限制，不新增 gate（谁需要停写日报，谁提需求）。
4. **`kind` 迁移全量 main**：现存合同没有一张是真补充合同（旧补充协议是页面局部 state），不存在误标风险。
5. **ProjectContext 仍是内存 mock**：搁置后刷新页面会回种子状态--已知 mock 边界，不算 U3 缺陷；β 落 D1 时消失。
6. **`extraContractIds` 不动**：留待 4.7 决定补充合同是否挂这里；U3 只靠 `kind` 判定。
