# U4 开发计划：线索侧合同/回款入口

> 2026-08-18 · 只规划不写码  
> 纲领计划：`计划/当前/unified-view-implementation.md` §U4（本文是其展开）  
> 事实源：ADR `0066`（已确认≠签约，合同经向导不自动插入）、`0069`（报价是独立对象三视角只读引用）；PRD `文档/PRD/PRD-线索项目合同统一视图.md` v1.1  
> 前置：无硬依赖；人工验证最好在 U1 之后（合同创建即 spawn，线索-项目条幅联动完整）

## 1. 现状与差距

### 1.1 两个 Tab 只对「已批准合同」开放，还会踢人

- 「合同信息」(`contracts-history`) 与「回款与发票」(`payments-invoice`) 两个 TabPane 都挂在 `hasApprovedContract` 下（`LeadDetail.tsx:762-764`），即 `approvedVersionNo && status !== 'voided'`（:129-135）。
- 还有一个 useEffect 主动把用户踢回「基础信息」（`LeadDetail.tsx:249-251`：无批准合同时这两个 Tab 被选中即重置）。
- **PRD 要求**：Tab 一直在；无合同空态；主合同**草稿**即可只读引用。现状从 gate 到踢人整条都违背。

### 1.2 合同 Tab 只显示单张已批准合同，不是列表

- `contracts-history` 渲染 `LeadFinalContractPanel contract={approvedContract}`（`LeadDetail.tsx:813-819`）--单实体面板，多张合同（草稿 + 已批准、含作废历史）无法呈现。
- 有趣的是 `LeadFinalContractPanel.getFinalVersion` 本身有兜底（取 `versionHistory` 最后一版，`LeadFinalContractPanel.tsx:30-33`），组件能显示草稿，**只是入口被 gate 挡死**。
- 组件库里已有一个名字就叫合同历史列表的 `pages/leads/components/LeadContractHistoryPanel.tsx`--落码前先核对其 props 与数据口径，能复用则改造、不能则新写列表项。

### 1.3 默认线索走静态 demo 合同，向导草稿进不来

- `getLeadDetailProfile` 三分支（`leadDetailProfiles.ts:326/360/368`）：lead-9 与餐厅公海线索 `useLiveContracts: true`（live 读 ContractsContext 按 leadId 过滤，`LeadDetail.tsx:120-127`）；**其余默认线索 `useLiveContracts: false` + `DEFAULT_DEMO_CONTRACTS` 静态 mock**。
- 后果：在默认线索上走向导建草稿，合同 Tab（即便去掉 gate）也看不到--demo 分支挡住了 live 数据。验收场景「向导刚建出草稿，线索详情能看见」只在两条特例线索上可演示。

### 1.4 回款侧现状基本符合方向

- 回款 Tab 渲染 `LeadPaymentInvoicePanel`（只读：合同额、期次、开票信息，`LeadDetail.tsx:823-840`）。
- 写入入口在合同域：`LeadFinalContractPanel` 的「登记动作」按钮只是 `Message.info('请在合同详情中登记回款或催收记录')`（:354-355）；主合同回款登记在 `ContractDetail.handleRegisterMainPayment` -> `addCollection`（`ContractDetail.tsx:190-210`）。**线索侧不写**--与 PRD 一致，保留。
- 线索侧不展示日报/成本核算：现状本来没有，回归核对即可。

## 2. 目标行为

1. **Tab 常驻**：合同信息、回款与发票两个 TabPane 无条件渲染；删除踢人 effect 中对这两个 Tab 的重置（项目执行 Tab 的 gate 保留，那是 U1/阶段 2 的语义）。
2. **合同列表**：合同 Tab 展示该线索全部合同（live 按 `leadId` 过滤，含 draft/approving/voided），主合同排前、作废沉底标灰；每条只读摘要（编号/状态/金额/签约主体）+ 跳合同详情；草稿条目打「草稿」Tag，不做任何编辑入口（只读引用，ADR 0066）。
3. **空态**：无线索合同时合同 Tab 显示 Empty + 引导（「从已确认报价生成合同」跳向导入口，`handleCreateContract` 复用）；回款 Tab 无**已批准**合同时显示空态「暂无已批准合同，回款在合同详情登记」。
4. **数据口径统一 live**：默认分支切 `useLiveContracts: true`、`demoContracts: []`，`DEFAULT_DEMO_CONTRACTS` 退役（保留定义不再引用，或直接删）；`relatedContracts` 的 demo 分支随之删除。
5. **回款写入仍在合同域**：线索侧零 `addCollection` 调用；「登记动作」从 Message.info 升级为跳转合同详情回款区（有已批准合同时）。
6. **不展示日报与成本核算**：核对现状无泄漏即可。

## 3. 纯函数（落 `pages/leads/leadDetailContracts.ts`，先核对该文件现有内容再定增改）

| 函数 | 逻辑 |
|------|------|
| `pickLeadContracts(contracts, leadId)` | 过滤 leadId；排序：主合同（kind==='main'，U3 产物）优先、draft/approving 在前、voided 沉底 |
| `leadContractViewState(contracts)` | `''` 无合同 -> 'empty'；无已批准 -> 'draft-only'；有已批准 -> 'approved'（驱动回款 Tab 空态与登记跳转） |

## 4. 文件改动清单（生产代码）

| # | 文件 | 改动 |
|---|------|------|
| 1 | `pages/LeadDetail.tsx` | Tab 常驻 + 删踢人分支；合同 Tab 改列表渲染（复用/改造 `LeadContractHistoryPanel`）；回款 Tab 按 viewState 分空态/数据；登记按钮跳合同详情 |
| 2 | `pages/leads/leadDetailProfiles.ts` | 默认分支切 live；`DEFAULT_DEMO_CONTRACTS` 退役 |
| 3 | `pages/leads/leadDetailContracts.ts` | +§3 两个纯函数（核对现有导出避免重名） |
| 4 | `pages/leads/components/LeadContractHistoryPanel.tsx` | 复用则按 props 改造；草稿 Tag、作废置灰 |
| 5 | 测试：`pages/leads/__tests__/` 增纯函数用例 | §5 |

## 5. 测试用例设计

### 5.1 `pickLeadContracts`

- 只取该 leadId 的合同；他线索合同不串。
- 排序：main-draft 在 supplement 前；voided 排最后。
- 空输入 -> 空数组。

### 5.2 `leadContractViewState`

- 无合同 -> 'empty'；仅草稿 -> 'draft-only'；含已批准（哪怕同时有草稿）-> 'approved'。
- 只有 voided -> 'draft-only'？（决策：voided 不算可见资产，回款 Tab 仍空态--按 'draft-only' 归类，文案统一「暂无已批准合同」）。

### 5.3 回归

- `hasApprovedContract` 的其余消费点（向导入口显隐等）不受影响；项目执行 Tab gate 原样。
- `npm run build`；全量 vitest 不新增失败。

### 5.4 人工验证

1. 任意线索（含默认分支线索）-> 向导建草稿 -> 线索详情合同 Tab **立即**出现草稿条目（草稿 Tag、只读）。
2. 无合同线索 -> 合同 Tab 空态 + 引导按钮；回款 Tab 空态。
3. 草稿走完审批 -> 回款 Tab 出现数据；点登记跳合同详情，在线索侧全程无写入。
4. 作废该合同 -> 列表沉底标灰，回款 Tab 回到空态。

## 6. 边界决策

1. **默认分支切 live 是行为变化**：默认线索原本「假装有合同」的 demo 数据消失、变空态--更真实，且是验收 1 的前提；`DEFAULT_DEMO_CONTRACTS` 直接删，不留死代码。
2. **草稿只读**：不在线索侧提供合同编辑/送审入口，一切动作跳合同详情（三视角只读引用的边界，ADR 0069 精神）。
3. **voided 合同显示但不参与任何判定**（`hasApprovedContract` 语义已排除 voided，保持）。
4. **回款 Tab 展示维度**：仍只展示「已批准主合同」的回款数据（多合同时取最新批准单，现 `approvedContracts[0]` 逻辑保留）；补充合同回款并入是 4.7 的事。
5. **报价 Tab 口径不动**：线索侧 `quotationHistory` 静态 mock 与报价域 live 数据并存的双口径问题归交接待办 #5（售前跟进 mock 收口），本计划不碰，只保证不新增引用。
6. **`useLiveContracts` 字段保留但值恒 true**：类型不动、消费分支删简，避免 `leadDetailProfiles` 类型连锁改动；彻底删字段留给 #5 收口。
