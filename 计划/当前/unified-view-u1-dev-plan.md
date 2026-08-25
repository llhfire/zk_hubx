# U1 开发计划：立项触发改回签约开启

> 2026-08-18 · 只规划不写码  
> 纲领计划：`计划/当前/unified-view-implementation.md` §U1（本文是其展开）  
> 事实源：ADR `0067`、`0066`、**0095**；PRD `文档/PRD/PRD-线索项目合同统一视图.md` v1.1

## 修订（2026-08-22，ADR-0095）— 接线作废，行为矩阵仍有效

§2 目标行为矩阵 **逐条保留**。作废的是 §3 决策 1 / 3 / 4 里「合同侧继续用桥 spawn、LeadDetail `addProject`」：

- **触发 3（主合同创建）**：B5 P0 洞 C 已规定在 `PUT /api/contracts`。U1 **不再改桥去 spawn**。β 桥只 `refresh()`。
- **触发 1/2（跟进写入洽谈/已签单、无合同）**：改为 `LeadService` mutations + **Workers `PUT /api/leads/:id`（及跟进写入导致状态变化）** 同一请求内 `shouldSpawnUnconfirmedProject` → spawn。项目 id = `ap-lead-{leadId}`。α mock 走同一函数，禁止只在页面 `addProject`。
- **触发 4**：批准无项目仍不 spawn（与 B5 / 现网 `continue` 一致）。
- T3「桥改造 spawn 移到 created」对 β 已由 B3/B5 接手；U1 的 T3 改为：核对 β 桥无 `addProject`，α 桥合同 created 仍可内存 spawn。
- T4 改为 Lead 写路径接 mutations，不再把 spawn 写进 `LeadDetail.onOk` 组件体。
- 开工顺序：B5 之后。决议全文：`计划/当前/conflict-spawn-and-collections.md`。

## 1. 现状与差距（为什么 U1 是接线问题，不是算法问题）

> 2026-08-18 原文。B2 已有 LeadService；B3 合同联动已在 Workers。以下「桥在批准时 spawn」对 β 已部分过时，以文首修订为准。

1. **纯函数层已按 ADR 0067 写好且有单测**：`business-case/caseUtils.ts` 的
   `hasEnteredSigning` / `shouldSpawnUnconfirmedProject` / `spawnUnconfirmedProject` / `startDelivery`
   已覆盖「洽谈 spawn、草稿合同 spawn、已作废不算、已终止不算、已有项目不重复、批准只对已指派项目 startDelivery」
   （`business-case/__tests__/caseUtils.test.ts` 六 + 五个用例）。**U1 不需要新算法。**
2. **唯一错误在接线**：`ApprovalDeliveryBridge.handleContractApproved` 在 `approvedAt` 首写时
   `if (!project) spawn`（`ApprovalDeliveryBridge.tsx` 93–99 行），把立项挂在了批准上。
3. **线索侧没有共享状态**：线索状态是页面局部静态 mock——
   - `LeadDetail.handleFollow` 是 stub（`console.log` + `Message.success`，不写任何状态）；
   - `MyLeads` 是页面 `useState` 静态列表，状态 Select 只是未接线的筛选。
   「线索打成合同洽谈」目前不产生任何可观察变化，**Trigger A 必须先把跟进写入变成真动作**。
4. **测试基建确认**：仓库无 `@testing-library` / `jsdom`，无组件测试能力 →
   测试策略 = 桥内逻辑全部下沉纯函数单测 + 人工验证脚本，不新增测试基建。

## 2. 目标行为矩阵（改完后必须逐条成立）

| # | 触发 | 项目现状 | 动作 |
|---|------|---------|------|
| 1 | 跟进写入「合同洽谈/已签单」 | 无项目 | spawn 未确认项目（无合同字段版） |
| 2 | 跟进写入「合同洽谈/已签单」 | 已有项目 | 无动作 |
| 3 | 主合同创建（草稿即算，非作废） | 无项目 | spawn 未确认项目（合同字段版） |
| 4 | 合同 `approvedAt` 首写 | 无项目 | **不 spawn**，仅提示线索缺项目（ADR 0067 严格执行） |
| 5 | 合同 `approvedAt` 首写 | 未确认 | 无状态动作，提示「待管理员确认指派」（阶段 3 行为保留） |
| 6 | 合同 `approvedAt` 首写 | 未开始/搁置 | `startDelivery` → 进行中 + SOP 计划 |
| 7 | 合同 `approvedAt` 首写 | 进行中/已完成 | 无动作（现有 `startDelivery` 返回 null 已保证） |
| 8 | 任意触发 | 线索已终止 | 不 spawn（`hasEnteredSigning` 已保证） |

## 3. 架构决策

### 决策 1：三个触发点、两条接线

- **合同侧（触发 3/4/5/6/7）继续用桥**：合同在全局 `ContractsContext` 里，快照 diff 可靠。
  桥的 diff 从「只看 `approvedAt` 首写」扩成两类事件：**contractCreated / contractApproved**。
- **线索侧（触发 1/2）不用桥**：线索状态无共享 Context，唯一真实入口是跟进弹窗 `onOk`。
  在提交动作里**显式调用**联动（`LeadDetail` 已在 Project/BusinessCase Provider 树内，
  现成可 `useProjects()` / `useBusinessCases()`），不为此建 LeadsContext。
- 两条接线共用同一套纯函数决策层（§3 决策 2），防止行为分叉。

### 决策 2：纯函数下沉（新增两处）

1. `business-case/caseUtils.ts` 新增 `buildUnconfirmedProject(input: { lead; contract?; projectId; today })`：
   生成项目管理完整 `Project` 实体。现在桥里的 `toFullProject(spawned, contract, today)` 强依赖合同
   （`contract.current.customerName` / `signingEntity`），无合同场景拿不到字段——合并成一个
   contract 可选的构造函数，两条接线共用，`toFullProject` 随之删除。
2. 新文件 `pages/contracts/signingOpenEvents.ts`：`diffContractEvents(prev, next)` →
   `{ created: Contract[]; approved: Contract[] }`，把桥里 `approvedSnapshotRef` 的 diff
   逻辑抽成可单测纯函数。**保留「首帧（prev=null）不触发」原则**——否则刷新页面会把
   存量「合同洽谈」线索（如 MyLeads mock 的 LS003）批量刷成未确认项目。

### 决策 3：桥组件瘦身 + 改名

`ApprovalDeliveryBridge` 改名为 `SigningOpenBridge`（`App.tsx` 挂载点同步改一行）——
阶段 3 的文件名/头注释写的是「批准 → 交付启动」，与 U1 后的职责（签约开启 → 立项、批准 → 开工）
继续打架会误导下一个改代码的人。改造后组件只剩：

```
diffContractEvents(prev, next) → 逐事件:
  created   → shouldSpawn? → spawnUnconfirmedProject + buildUnconfirmedProject(合同版) → addProject/upsertCase → toast
  approved  → 保留阶段 3 全部逻辑（商机关联补全 + startDelivery + SOP 计划 + toast），
              仅删掉「无项目则 spawn」分支，改为无项目时 Message.warning
```

### 决策 4：文件改动清单（生产代码 7 个文件）

| 文件 | 改动 |
|------|------|
| `business-case/caseUtils.ts` | +`buildUnconfirmedProject`（contract 可选） |
| `business-case/__tests__/caseUtils.test.ts` | +用例（§5.1） |
| `pages/contracts/signingOpenEvents.ts` | 新文件：diff 纯函数 |
| `pages/contracts/__tests__/signingOpenEvents.test.ts` | 新文件：§5.2 |
| `pages/contracts/ApprovalDeliveryBridge.tsx` | 重写 effect + 改名 `SigningOpenBridge`，删合同版 `toFullProject` |
| `App.tsx` | 挂载点改名（1 行） |
| `pages/LeadDetail.tsx` | 跟进 `onOk`：写本地 `leadStatus` state（替换 stub）+ 状态 ∈ 签约词表且无项目时 spawn 联动；头部状态展示改用本地 state |

**不动**：`ContractsContext` / `contractService` / `ProjectContext` / `BusinessCaseContext` / `MyLeads`。

## 4. 实施步骤（小步、每步可验证）

| 步 | 内容 | 完成判据 |
|----|------|---------|
| T1 | `buildUnconfirmedProject` 纯函数 + 单测 | 新用例绿；全量 vitest 绿 |
| T2 | `signingOpenEvents.diff` 纯函数 + 单测 | 同上 |
| T3 | 桥改造（消费 T2；spawn 移到 created；approved 只 startDelivery）+ 改名 | 全量 vitest + `npm run build` 绿 |
| T4 | LeadDetail 跟进接线（Trigger A） | build 绿 |
| T5 | 人工验证脚本（§5.5）全过 | 7 条逐项勾掉 |
| T6 | 四件套核对（见 §7） | — |

vitest 工作目录：`HubX/apps/prototype`。

## 5. 测试用例设计

### 5.1 `caseUtils.test.ts` 新增：`buildUnconfirmedProject`

1. **有合同**：customerName/signingEntity/contractId 取自合同；status 未确认、owner 空、productUsers 空；
   progress 文案含「等待管理员确认」。
2. **无合同**：客户名/主体取自线索入参；contractId 为空；remark 为「签约开启自动生成，尚未确认」。
3. **projectId 回写**：产出实体 id = 入参 projectId，且与 `spawnUnconfirmedProject` 的 project.id 一致。

### 5.2 `signingOpenEvents.test.ts` 新增：`diffContractEvents`

1. **首帧**（prev = null）→ created/approved 均空（防初始加载误判，与现桥行为一致）。
2. 新增非作废合同（草稿也算）→ 进 created。
3. 新增即已作废 → 不进 created。
4. 合同从快照消失 → 无事件。
5. `approvedAt` undefined→有 且 status≠voided → 进 approved。
6. voided 合同 `approvedAt` 首写 → 不进 approved（与现桥 `status !== 'voided'` 守卫一致）。
7. 撤销审批（`approvedAt` 有→无）→ 无事件、不报错。
8. 同帧混合：A 新建 + B 批准 → 两个事件都出、互不影响。

### 5.3 回归（现有测试不改、必须全绿）

- `shouldSpawnUnconfirmedProject` 六用例（洽谈 spawn / 草稿合同 spawn / 已有项目不建 / 已终止不建 / 仅作废合同不算）。
- `startDelivery` 五用例（未确认不启动 / 搁置可拉起 / 进行中不重复 / 绑其他合同不拉起）。
- 已知旧债不新增：4 个存量断言失败 + react-quill jsdom 问题维持原状，不算 U1 失败项。

### 5.4 组件接线为什么不写测试

无组件测试基建；桥内全部决策已下沉 §5.1/§5.2 纯函数，组件只剩「查项目 → 调函数 → toast」。
接线正确性由 §5.5 人工脚本覆盖。不新增基建是范围决策，不是遗漏。

### 5.5 人工验证脚本（本地 α，管理员视角）

1. **洽谈 spawn**：任一线索 → 跟进 → 客户状态选「合同洽谈」→ 提交 → toast「已生成未确认项目」；
   项目管理列表出现未确认项目（管理员可见，产品经理不可见）。
2. **草稿 spawn**：报价已确认线索 → 合同向导建草稿（不提交审批）→ 未确认项目即出现。
3. **批准 = 开工 ≠ 立项**：对 1 的项目确认指派产品经理（未开始）→ 同一合同走完审批 →
   项目进行中 + SOP 交付计划生成。
4. **批准不 spawn**：项目仍处未确认时批准合同 → 项目状态不变、列表无第二个项目。
5. **不重复 spawn**：spawn 后再跟进（仍选洽谈）/ 再建合同 → 仍只有一个项目。
6. **已终止不 spawn**：跟进状态选「已终止」提交 → 无项目产生。
7. 全量 `npx vitest run` + `npm run build` 无新增失败。

## 6. 边界决策（提前拍死，写码时不许现场发挥）

- **批准时无项目不兜底 spawn**：严格按 ADR 0067。存量 mock 合同批准时若无线索项目，只 warning 提示。
  演示需要时删旧合同重走向导（创建即 spawn）。理由：一旦兜底，「批准才第一次出现」就回来了，
  ADR 0067 等于作废。
- **合同作废 → 新建**：新合同 created 事件会查「已有项目」而不动作（项目还绑着旧合同）——
  这是 U3（作废 ↔ 搁置）的地盘，U1 不扩。
- **首帧不触发**：验收 1 必须走真实「跟进提交」动作，不能靠刷新页面让存量洽谈线索自动出项目。
- **阶段 3 人工验证项作废**：交接文档里「成交生成合同 → 批准 spawn」的验证路径在 U1 合入后失效，
  以 §5.5 为准。

## 7. 四件套对齐说明

- **实现计划**：本文 + `unified-view-implementation.md` §U1 链接（已改）。
- **PRD**：无业务规则变化（v1.1 已含 ADR 0067 语义），不动。
- **功能看板**：U1 仍在原 planned 条目内，无新增功能项，不动。
- **架构图**：无新增板块/模块，不动。
