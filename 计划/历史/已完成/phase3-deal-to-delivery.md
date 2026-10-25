# 阶段 3 计划：报价成交生成主合同 + 合同批准后交付启动（回款 Tab 联动）

> 2026-08-18 · 销售域重构阶段 3 · 以 α 版（apps/prototype + packages/ui）为主
> 依据：下班交接待办 1；三路代码调研（报价域 / 合同域 / 项目域）

## 已确认的设计决策（用户拍板）

1. **报价成交 → 主合同**：成交后在 Stage4 显示「生成主合同」按钮，跳合同向导并预填报价数据，人工确认后创建（不自动创建）。
2. **交付启动触发点**：合同审批流**最后一个节点通过**（`approvedAt` 写入、状态 `approving → pending_mail`）时触发。
3. **回款 Tab**：ContractDetail **新增**「回款」Tab，期次状态展示 + 登记回款**写回** `ContractsContext.addCollection`（不再是页面局部 state）。

## 现状要点（调研结论）

- `Quote.contractId?` 已预留但无写入点；`Stage4Approval.tsx` deal 态只有一句静态文案「可据此创建合同」，无按钮。
- `BusinessCase.quoteIds/contractId` 已建模但无维护代码；`spawnUnconfirmedProject` 只在单测里被调用，未接线任何页面动作（现有「未确认项目」是 mock 静态数据）。
- `applyApproveStep`（contractMutations.ts）是批准唯一收口，批准后**零副作用**；合同无独立「已批准」状态，批准即 `pending_mail` + `approvedAt`。
- ContractDetail 右侧 Tabs：跟进/审批/版本/补充；**无回款 Tab**；「补充」Tab 里的登记回款弹窗是页面局部 useState，不落 Context。
- 交付计划（delivery-plan）是页面局部 mock，无 Context/接缝；`generateDeliveryPlan(config, projectData, date, milestones)` 可一键生成，config 已带 `contractId` 字段。
- 项目域已有 `ProjectContext`（阶段 2），BusinessCase 还是模块级 mock，无 Context。
- **必修 bug**：`services/contractService.ts:166` 与 `services/quotationService.ts:157` 的 `getOne` 模板串被工具链吞成字面量 `$glm-5.3_common`，id 未插值，β版读单条必错。

## 实施步骤（按顺序）

### 0. 修 HTTP getOne 模板串 bug
`contractService.ts` / `quotationService.ts` 两处 `getOne` 改为字符串拼接（`'/api/contracts/' + id`），顺带 grep 全库 `glm-5.3_common` 确认无残留。

### 1. ContractDetail 新增「回款」Tab（独立，先做）
- 右侧 Tabs 增加「回款」：汇总条（总额/已回款/待回款/到账率）+ `paymentPlans` 期次表（每期状态：待收/本周到期/逾期/已收，复用 `paymentUtils.computePaymentStatus` 口径）+「登记回款」按钮。
- 登记回款弹窗从「补充」Tab 的局部 state 迁移过来，提交调 `useContracts().addCollection`（自动重算 `receivedAmount`），删除旧局部双入口。

### 2. BusinessCaseContext（轻量）
- 新建 `business-case/BusinessCaseContext.tsx`（仿 ProjectContext：包住 mockCases，暴露 cases / getByLeadId / upsertCase / updateCase），App.tsx 挂 Provider。
- `Projects.tsx` 的「确认指派」改走 Context（原来直接动模块 mock），保证三域读写同一份。

### 3. 报价成交 → 生成主合同
- **Stage4Approval.tsx**：deal 态且 `quote.contractId` 为空时，静态文案处换「生成主合同」按钮 → `navigate('/contracts/new?leadId=..&quoteId=..', { state: { dealQuotePrefill: {...} } })`。
- **预填映射纯函数**（放 `pages/contracts/` 或 quotation utils，可单测）：真实 `Quote` summary → 合同向导字段：`grandTotalPrice → totalAmount`、付款条款（PAYMENT_TERM_TEMPLATES 比例）→ `paymentPlans`（复用 `buildPaymentPlansForRatio`）、工期 → `endDate`、`warrantyYears` → 质保文案。
- **ContractWizard.tsx**：新增识别 `location.state.dealQuotePrefill`，优先于 mock `QuotationRecord` 预填（identity 仍用 leadId/quoteId 参数）。
- **创建成功回写**：向导完成创建后，若带成交报价 → 调 `QuotationContext` 新增方法回写 `quote.contractId`；同时 BusinessCaseContext 更新（`quoteIds` 去重加入、`contractId` 为空则设置）。
- 成交报价在向导确认页与合同详情可互相跳转（`quote.contractId` 有值时 Stage4 显示「查看主合同」）。

### 4. 合同批准 → 交付启动
- **ContractsContext.approveStep**：mutation 保持纯函数，在 Context 层判断「本次调用后 `approvedAt` 首次写入」→ 执行联动副作用：
  1. `contract.leadId` 存在时，查/建 BusinessCase、更新 `contractId`；
  2. `getProjectByLeadId` 无项目 → `spawnUnconfirmedProject` 接线：生成「未确认」项目加入 ProjectContext（产品经理确认指派走既有 Projects.tsx 流程）；
  3. 项目状态为「未开始」（已确认等合同）→ 新纯函数 `startDelivery(project, contract)`：`status → 进行中`、写 startDate、关联 contractId、按合同配置 `generateDeliveryPlan` 生成交付计划。
- **交付计划最小接缝**：新建 `delivery-plan/deliveryPlanStore.ts`（模块级 store + 订阅，或最小 Context），`DeliveryPlanPage` 改为读写 store（替换页面局部 mock），合同批准侧写入同一 store，实现跨页同步。
- 批准完成 `Message.success` 提示已生成项目/交付启动，可跳转。
- 无 leadId 的手动合同：不做自动联动（本轮范围）。

### 5. 单测
- 新纯函数：成交报价→合同预填映射、`startDelivery`、批准完成判定（approvedAt 首写）。
- 跑全量 vitest，对照既有基线（4 断言失败 + react-quill jsdom 为既有债，不新增失败）。

### 6. 状态文档同步（新联动规则）
- **ZK-HubX架构图.html**：销售域「报价工作台」「合同签约」与交付域「项目管理」「交付支撑」的 module-items 补充：报价成交生成主合同 / 合同批准触发交付启动 / 合同回款 Tab。
- **featureBoard.config.json**：对应 planned 项状态推进、`features[]` 描述更新（新功能上线）。

## 明确不做（本轮）
- β版后端复合 endpoint（成交生成合同 / 批准生成项目的跨表事务）——联动都在前端 Context 层，α/β 同构，后置。
- 售前跟进 mock（PRESALES_FOLLOW_MOCK）与线索跟进收拢——交接待办 3，挪到阶段 4 一起做。
- 合同「标的视角 + 补充合同列表」——阶段 4。

## 风险与注意
- **工具链吞 `${...}` 模板插值**：全程用字符串拼接，收尾 grep `glm-5.3_common`。
- mutations 纯函数约定：跨域副作用一律挂 Context/页面层，不塞进 `applyXxx`。
- vitest 在 `HubX/apps/prototype` 下跑；`featureBoard.config.json` 改动过 `isValidFeatureBoard` 校验。
