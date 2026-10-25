# 报价 4.2 开发计划：责任人、权限、通知、列表

> 2026-08-18 · 只规划不写码  
> 纲领计划：`计划/当前/quote-flow-prd-implementation.md` §4.2（本文是其展开）  
> 事实源：ADR `0002`（一线索一确认单）、`0015`（有报价权限即可建）、`0033`（owners 来自配置）、`0047`（终态前可改指）、`0057`（线索改派不改报价销售）、`0046`（仅草稿可删）、`0051`/`0061`（终止线索冻结/恢复解冻）、`0032`（列表无已完成桶）；PRD `文档/PRD/PRD-报价流程管理.md` v1.1  
> 前置：**4.1 词表收口先行**（本计划的 pending_quote / confirmed 等词依赖它）

## 1. 现状与差距

### 1.1 没有用户实体，「有报价权限」无处挂载

- 人 = `QUOTE_ROLES` 六个硬编码映射（`pages/quotation/types.ts:57-74`：张产品/罗总/张三/黄奕/闵总/黄海），且报价、线索（MyLeads mock）、审批配置（赵六/张三财务）、合同（王经理/陈财务）**四域人名体系互不相同**。
- 「登录」是 `QuotationContext` 的 localStorage 角色切换（`QuotationContext.tsx:51-61`，默认 `sales`），只有角色没有身份。
- 路由 `/quotation/:id` 无守卫（`routes.tsx:113`），`getStageAccess` 只管编辑不管可见--**现在任何人能打开任何单**，没有 `canViewQuote` 类函数。

**决策**：4.2 不建用户体系。新增轻量「报价权限配置」模块 mock（同 `approvals/configStore` 的 localStorage 模式），内容只有两样：`quotePermission: { creators: string[]（有报价权限可建单的人名）; admins: string[]（有报价权限的管理员） }`，默认填现网六人 + 管理员。人名仍是字符串，但从此**报价域的准入判定只依赖这一份配置**，后续接真实用户体系时只换配置源。

### 1.2 责任人字段残缺，销售靠 ccSalesNames 兜底

- 现有：`basicInfo.creatorName`（创建人/产品经理）、`basicInfo.techEvaluatorName`（评估人）、`ccSalesNames: string[]`（新建写死 `['张三']`，`quotationMutations.ts:180`）。**没有「报价销售」字段**，`getPendingRoles` 里 stage3 一律返回 `sales` 角色（写死张三）。
- 目标：创建时选来源/签约主体/技术评估人/销售；默认评估人 ← 配置、销售 ← 线索负责人否则配置兜底；终态前可改指；线索改派不改报价销售（ADR 0057）。

**决策**：`Quote` 增 `salesOwnerName: string`（必填，迁移时从 `ccSalesNames[0]` 兜底「张三」）+ `basicInfo.techEvaluatorName` 语义升格为可改指字段。`getPendingOwner`/`getPendingRoles` 的 stage3 待办人从写死张三改为读 `salesOwnerName`。

### 1.3 报价拿不到线索状态（跨域无通道）

- `Quote.leadId` 存在但报价 service 完全不 join 线索；线索数据无共享 store（`MyLeads` 页面 mock + `leadDetailProfiles` 静态 mock），状态是八态中文字符串（`未联系/未接通/初步沟通/需求调研/方案报价/合同洽谈/已签单/已终止`，权威表 `pages/leads/LeadGovernance.tsx:38`）。
- 目标：线索已终止 -> 不能新建主报价、未终态主报价不能前进；恢复解冻（ADR 0051/0061）。

**决策**：不建 LeadsContext（那是线索域的事）。`QuotationContext` 增一个**注入的线索简况提供器** `leadBriefProvider?: (leadId) => { status: string; ownerName?: string } | null`，默认实现读两处 mock 的合并快照（模块级函数）。service 层所有「前进类」迁移入口（`applyTransition` 的调用方）前置一道纯函数闸门 `quoteLeadGate(leadStatus, action): boolean`。这也是「销售默认 = 线索负责人」的数据来源。

### 1.4 列表与通知

- 列表现状基本达标：无 Tab、无「已完成」桶（ADR 0032 ✓）、`mineOnly` 走 `getPendingRoles`（`QuotationCenter.tsx:38,132`）。缺：已发出行的**过期标记**（4.1 已交付 `isExpired` 纯函数，本计划接 UI）。
- 通知现状：`buildQuoteTodos` -> `TodoCenter` + `ReminderBell`（`QuotationContext.tsx:98`），`reminders/adapters/` 无报价 adapter。PRD：通知与待我处理**同一套收件人算法**。

**决策**：收件人算法就是 `getPendingRoles`（升级后含改指语义），4.2 只保证待办/列表/铃铛三者都从它取数，**不新增通知基建**（消息路由 IntegrationContext 不接）。通知内容升级（含会签人快照）自然随 `auditNodes` 快照（4.4）生效。

### 1.5 删除动作不存在

- `QuoteAction` 无 `delete`，service 无 `deleteQuote`，UI 写死「历史版本保留不可删除」。PRD：**从未提交过评估的草稿可删**；退回改清单的草稿（4.1 的 `return_to_edit_features` 产物）**不能删**。

## 2. 目标行为

1. 打开范围（五类人并集）：创建人、`salesOwnerName`、评估人、快照会签人/盖章人（`auditNodes`/`stampNode` 里的人）、报价权限配置里的 admins。能打开就能看岗位成本与利润率（报价域内不设成本隐藏）。
2. 创建：`quotePermission.creators` 里的人才可见「新建报价」；创建表单选来源/签约主体/评估人/销售；默认评估人 ← 配置、销售 ← `leadBriefProvider` 的线索负责人，拿不到则配置兜底。
3. 改指：非终态（confirmed/voided）可改评估人与销售，各记一条 timeline 事件；线索改派不影响已存 `salesOwnerName`。
4. 终止闸门：线索「已终止」时，不能新建主报价、未终态主报价所有前进动作被拒（黄灯提示而非报错弹窗）；补充报价只看主合同状态不看线索（ADR 0051 补充语义）；线索恢复即解冻。
5. 删除：`canDeleteQuote` = draft 且 timeline 中**从未出现** `submit_eval` / `return_to_edit_features` 事件；删除后列表消失（mock 删 localStorage 记录）。
6. 列表：`sent` 行显示过期 Tag（红/灰）。

## 3. 文件改动清单（生产代码）

| # | 文件 | 改动 |
|---|------|------|
| 1 | `pages/quotation/quoteAccess.ts`（新） | `canViewQuote` / `canCreateQuote` / `canDeleteQuote` / `quoteLeadGate` 四个纯函数 + `QuotePermission` 类型 |
| 2 | `pages/quotation/quotePermissionStore.ts`（新） | localStorage 配置 mock（load/save，默认六人） |
| 3 | `pages/quotation/types.ts` | `Quote.salesOwnerName`；`QuoteAction` + `delete_quote` / `reassign_sales` / `reassign_evaluator` |
| 4 | `services/quotationMutations.ts` | `buildNewQuote` 增 salesOwnerName 入参；`applyReassign` 纯函数；`migrateQuote`（4.1）补 salesOwnerName 兜底 |
| 5 | `services/quotationService.ts` | mock/http 增 `deleteQuote` / `reassignOwner`；前进类动作前置闸门（读注入的 leadBriefProvider） |
| 6 | `pages/quotation/QuotationContext.tsx` | +`leadBriefProvider` 注入口、+`deleteQuote`/`reassignOwner` 透传、`currentViewer`（含姓名+isAdmin） |
| 7 | `pages/quotation/QuotationCenter.tsx` | 新建按钮按 `canCreateQuote` 显隐；sent 行过期 Tag；列表按 `canViewQuote` 过滤（非 admin 只见自己的单） |
| 8 | `pages/quotation/QuotationWorkbench.tsx` | `!canViewQuote` -> 无权访问空态；改指入口（非终态） |
| 9 | 测试（新 `quoteAccess.test.ts` + 改 `quoteFlow.test.ts`） | §5 |

## 4. 测试用例设计

### 4.1 `canViewQuote` 矩阵

- 五类人逐类通过：创建人 / salesOwnerName / 评估人 / 快照会签人 / 盖章人 / admin。
- 无关人名拒绝；`ccSalesNames` 里但非 owner 的抄送人**不算**打开范围（只读抄送，PRD 未授权）。
- admin 能打开 voided 单。

### 4.2 `quoteLeadGate`

- 线索「已终止」：新建主报价 false、前进动作 false、`withdraw_*` 回退类 true（回退不受冻结限制）。
- 补充报价：不看线索状态（主合同状态是 4.7 的事，这里只断言不查 leadStatus）。
- 线索「已签单」/「方案报价」/拿不到线索简况：全通过（解冻语义）。

### 4.3 `canDeleteQuote`

- draft 且 timeline 只有 `create` -> 可删。
- draft 但有 `return_to_edit_features` 事件 -> 拒。
- 任意非 draft -> 拒（含已驳回）。
- 有 `submit_eval` 历史又回到 draft（理论路径）-> 拒。

### 4.4 改指与默认指派

- 默认销售 = 线索负责人；`leadBriefProvider` 返回空 -> 配置兜底人名。
- 非终态改销售成功 + timeline 两条事件（reassign_sales）；confirmed 后拒绝。
- 改指后 `getPendingRoles` 的 stage3 待办人 = 新销售（不再写死张三）。

### 4.5 回归

- 4.1 的迁移/状态机测试全绿；`npm run build`；人工：角色切换后列表只见可打开单；终止线索冻结黄灯；过期 Tag 显示。

## 5. 边界决策

1. **不建用户体系、不动四域人名**：权限配置只服务报价域准入；线索/合同/审批配置的人名归各域后续收口。
2. **`ccSalesNames` 保留语义**：纯抄送展示，不进打开范围；`salesOwnerName` 才是责任人。
3. **冻结是黄灯不是硬拦弹窗**：前进按钮置灰 + 提示「线索已终止，恢复后可继续」。
4. **通知不新增基建**：复用 `buildQuoteTodos` 链路，铃铛/待办中心自动跟进。
5. **β 后置**：`leadBriefProvider` 在 β 下换 HTTP join；权限配置落 D1（纲领 §5）。
