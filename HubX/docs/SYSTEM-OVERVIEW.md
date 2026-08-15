# ZK HubX 系统功能与规则总览

> 本文由遍历 `HubX/src` 全部源码生成，覆盖前端原型的完整功能与业务规则。
> 技术栈：React 18 + Vite 6 + React Router 7 + Arco Design + Tailwind v4；数据层为页面内 `useState` + 模块级 `mockData` + Context + localStorage，**无真实后端**。
> 与 `ARCHITECTURE.md`（架构/边界）、`CONTEXT.md`（业务术语）、`CLAUDE.md`（命令/约定）、`FRONTEND_CONVENTIONS.md`（编码规范）配合阅读。

---

# 一、系统概览

## 1.1 产品定位与边界

**ZK HubX（ZK = 中科）是贴合中科集团业务流程、供集团内部使用的管理工具。**

- 单租户、内部自用，不是对外 SaaS、不是多租户系统。
- 服务对象是中科集团内部员工（销售、投放、交付、财务、管理层等）。
- 业务范围是中科集团自身业务漏斗：**广告投放 → 线索 → 客户 → 合同 → 项目 → 交付 → 利润**。
- 公司业务模式：**软件外包 + 自运营投放获客**两条线，实为同一条漏斗。

**越界清单（新增功能前必查，答不上即越界）**：租户隔离 / 多公司数据隔离；对外售卖、计费、开放平台、客户自助门户；面向外部客户而非内部员工的功能。

## 1.2 技术栈

| 层 | 技术 |
|---|---|
| 框架 | React 18 + Vite 6 |
| 路由 | React Router 7（`createBrowserRouter`） |
| 业务 UI | Arco Design（主力；shadcn/Radix 已于 2026-08-13 清除） |
| 样式 | Tailwind v4 + CSS 变量主题（入口 `src/styles/index.css`） |
| 图表/拖拽/富文本 | recharts / react-dnd / react-quill / exceljs / html2canvas + jspdf |

## 1.3 应用分层与全局状态

```
main.tsx → App.tsx（10 个 Context Provider 嵌套）→ RouterProvider → MainLayout → 70+ 页面
```

| Provider | 文件 | 职责 |
|---|---|---|
| IntegrationProvider | `integrations/IntegrationContext.tsx` | 企业微信等集成、消息中心 |
| ApprovalProvider | `approvals/ApprovalContext.tsx` | 通用审批 |
| TodoProvider | `todos/TodoContext.tsx` | 待办中心 |
| FeedbackProvider | `feedback/FeedbackContext.tsx` | 意见反馈 |
| ReminderProvider | `reminders/ReminderContext.tsx` | 提醒（每分钟刷新） |
| EmployeeProvider | `pages/employee/EmployeeContext.tsx` | 员工/考勤/绩效/职级时薪 |
| JobWorkConfigProvider | `pages/daily-report/JobWorkConfigContext.tsx` | 日报工作种类配置 |
| ContractsProvider | `pages/contracts/ContractsContext.tsx` | 合同全生命周期 |
| ProjectInvoiceProvider | `pages/finance/ProjectInvoiceContext.tsx` | 项目开票 |
| QuotationProvider | `pages/quotation/QuotationContext.tsx` | 报价单全生命周期 |

（注：`ARCHITECTURE.md` 写「9 个」，实际已含 `QuotationProvider`，共 10 个。）

**贯穿性规律**：
1. **数据层三态**：绝大多数模块是「Context 内存 mock + 纯函数计算」；仅审批配置、待办、开票、反馈等少数模块用 `localStorage` 持久化；全程无网络层。
2. **纯函数 + 测试**：复杂逻辑抽成独立 `.ts` 纯函数配 Vitest 测试（标杆：`delivery-plan/__tests__/utils.test.ts`）。
3. **跨模块靠 import 共享 mock**：`contractCostData` import `project-management/mockData`、`reminders` import `daily-report/types`，用模块依赖图模拟真实业务依赖，而非全局 store。

## 1.4 当前登录用户

`src/app/currentUser.ts` 导出 `CURRENT_LOGIN_USER = { id: 'user-sales-zhangsan', name: '张三', isAdmin: true }`。`currentUserId` 在 MainLayout、Dashboard、ReminderContext、审批中心等处硬编码为该值，是原型内唯一的当前用户。

---

# 二、应用框架

## 2.1 MainLayout（`components/MainLayout.tsx`）

统一负责左侧 Sidebar、顶部 Header、菜单高亮/展开、日报入口、提醒铃铛、意见反馈弹窗。

- 顶栏：日报图标（未提交徽标）、`ReminderBell`（提醒中心，合并待办 + 站内信）、用户下拉（个人中心/系统设置/意见反馈/退出登录）。
- 日报入口：`handleDailyReportOpen` 先按 `getDailyReportRuleForUser(currentUserId).templateType` 决定默认模板再打开 `DailyReportModal`；通过 `<Outlet context={{ openDailyReport }}>` 下发给子页面。
- 一级菜单 23 项：工作台、个人工作台、待办中心、线索管理、线索成本、客户管理、报价管理、合同管理、项目管理、日报、数据报表、资产管理、售后运维、供应商管理、知识库、会议管理、全链路 ROI、AI 智能助手、员工管理、人资管理、财务管理、审批管理、系统管理。

## 2.2 Dashboard（首页工作台）

四张摘要卡（待处理/已逾期/今日截止/待审批，其中「待审批」口径 `source === 'approval' || source === 'wecom_approval'`）；`sortedTodos` 按「截止时间升序 → 优先级 high>medium>low」取前 5；快捷入口、业务概览、待跟进线索、项目进度（mock）。

## 2.3 路由（`routes.tsx`）

集中配置全部页面路由。报价系统把旧三路由（`/quotation/eval|quote|approval/:quoteId`）redirect 收敛到统一工作台 `/quotation/:quoteId`。

---

# 三、业务漏斗各模块

## 3.1 线索管理

### 功能（列表页）
- **公海线索** `PublicLeads.tsx`：表格（线索ID/对接主体/名称/来源/关键词/联系人/手机/意向等级/标签/客户状态/创建时间/操作）。操作：查看、认领、丢弃垃圾线索（原因必填）。新建线索必填 `name/contact/phone/source/level/entity/status`。
- **我的线索** `MyLeads.tsx`：额外含 `customer/followCount/daysHeld/nextFollow/lastFollow`。操作：查看、添加跟进、转让（目标必填）、丢弃（丢回公海）、标记垃圾。顶部超时提醒来自 `useReminders()` 过滤 `lead_followup_overdue`。
- **垃圾线索** `TrashLeads.tsx`：含 `reason/discardBy/discardTime`；可重新认领、扔回公海。
- **成交线索** `ClosedLeads.tsx`：4 张统计卡（成交数/合同总额/已回款/平均转化周期）；点击跳 `/projects/:id`。

### 规则（线索）
- **客户状态 8 态**（全模块共用枚举）：`未联系 / 未接通 / 初步沟通 / 需求调研 / 方案报价 / 合同洽谈 / 已签单 / 已终止`。
- 意向等级：`高/中/低`；来源枚举：`百度推广/抖音/小红书/微信推广/其他`。
- 路由来源标记：`PublicLeads/MyLeads/TrashLeads` 进详情分别传 `state.from = public/my/trash`（ClosedLeads 不传）。

### 线索详情 `LeadDetail.tsx`（全仓最大单文件之一）
- 消费 `Reminder`/`Contract`/`Employee` 三个 Context，组装 8 个面板；左侧主 Tab + 右侧 Tab 双栏。
- `normalizeLeadReminderId(id)`：非 `lead-` 前缀补成 `lead-${id}`，与提醒系统 ID 对齐。
- 规则：无已审批合同（`approvedVersionNo` 为空或 `voided` 过滤）时，合同信息/回款发票两个主 Tab 不渲染，强制回 basic。
- 头部操作按钮按 `from` 区分（public/trash/closed/my 各不同）。

### 线索治理 `leads/LeadGovernance.tsx`
- 4 Tab：人员合规看板 / 违规记录 / 治理规则（可启用禁用）/ 线索明细。
- 合规率公式：`totalChecks = activeLeads×3`；`violationPoints = Σ(high=3, medium=2, low=1)`；`complianceRate = max(0, round((totalChecks - violationPoints)/totalChecks×100))`。
- **6 条治理规则**（阈值/处置/默认）：

| id | 名称 | 阈值 | 处置 | 默认 |
|---|---|---|---|---|
| r1 | 每日最低跟进次数 | 3 次/天 | 未达标提醒 | 启用 |
| r2 | 线索响应时间 | 24 小时 | 超时自动回收至公海 | 启用 |
| r3 | 跟进记录规范 | 100% | 限制提交 | 启用 |
| r4 | 状态更新频率 | 每 5 次跟进 | 系统提醒 | 启用 |
| r5 | 最大持有天数 | 30 天 | 自动回收至公海 | 启用 |
| r6 | 垃圾线索比例限制 | 30% | 限制领取新线索 | 禁用 |

- 违规类型：`overdue_followup / no_followup_record / status_not_updated / exceed_hold_days`。

## 3.2 线索成本（`lead-cost/`）

4 页：成本看板 / 投放日报 / 充值记录 / 渠道分析。`mockData.ts` 同时集中定义该模块类型与核心计算函数（成本、有效率、渠道汇总、综合评分）——改口径优先改这里的共享函数，避免页面重复计算。

## 3.3 客户与公司主体

- **客户**：`Customers.tsx`（列表，等级 S/A/B/C，状态 合作中/跟进中/已流失）+ `CustomerDetail.tsx`（4 Tab：客户信息/线索记录/合同记录/财务信息）。
- **公司主体** `company-entity/companyEntityData.ts`：`mockCompanyEntities` 6 个主体，每个含全称/合同号前缀/合同模板：

| 简称 | 合同号前缀 | 合同模板 |
|---|---|---|
| 中科软通 | ZKRT | software_sales |
| 中科软艺 | ZKRY | — |
| 武汉软艺 | WHRY | software_sales |
| 中科软齐 | ZKRQ | service_contract |
| 中科软盈 | ZKRY | cloud_service |
| 中科网联 | ZKWL | service_contract |

- 导出 `contractSigningEntities / findCompanyEntityByName / getCompanyContractTemplate / getContractNumberPrefix`（无匹配默认 `CT`）。

## 3.4 报价系统（`quotation/`，最近重构）

### 职责边界（四个工作台）

| 阶段 | 组件 | 责任角色 | 内容 |
|---|---|---|---|
| 1 功能清单 | `Stage1FeatureList.tsx` | PM（张产品） | 端+平台选型、一级模块、二级子功能 |
| 2 人天评估 | `Stage2EvalSheet.tsx` | tech（罗总） | 基础岗位、切片重组、逐项工时 |
| 3 报价配置 | `Stage3WebAutomation.tsx` | sales（李销售） | 销售增项、出差/驻场、其他成本、报价汇总、付款方式 |
| 4 审批盖章 | `Stage4Approval.tsx` | 会签三人 + 董助 | 三人会签、盖章、发送/成交/作废 |

- `QuotationCenter`（列表）→ `QuotationWorkbench`（工作台外壳）→ 按 `deriveStage(status)` 渲染对应 Stage。
- 数据：`QuotationContext`（唯一状态源）→ `mockData.ts`（q1=assigned_sales、q2=draft）→ `defaultFeatures.ts`（约 20 项默认模板）；纯函数层 `quoteFlow.ts`。
- 注：`Stage3QuoteWizard.tsx`（7 步向导）与 `Stage3-WebAutomation-RULES.md`（网页自动化）均为重构前遗留，未被引用。

### 状态机（13 态，`QuoteStatus`）

`draft / feature_confirmed / eval_completed / assigned_sales / quote_summarized / auditing / rejected / pending_stamp / stamped / sent / deal / pending_followup / voided`
（`quote_summarized`、`pending_followup` 为预留态，Context 未产生对应迁移。）

| 动作 | 函数 | 角色 | 源 → 目标 |
|---|---|---|---|
| 创建 | createQuote | pm | — → draft |
| 提交功能清单 | submitFeatureList | pm | draft → feature_confirmed（初始化评估表逐项 SINGLE） |
| 提交人天评估 | submitEval | tech | feature_confirmed → eval_completed |
| 转派销售 | assignToSales | pm | eval_completed → assigned_sales |
| 退回技术重评 | returnToTech | sales | → feature_confirmed |
| 提交审批 | submitForAudit | sales | → auditing（重置盖章节点 LOCKED） |
| 撤回审批 | withdrawAudit | sales | auditing → assigned_sales |
| 会签决策 | decideAudit | 黄奕/罗总/闵总 | 任一 REJECTED → rejected（全员清空重审）；全 APPROVED → pending_stamp；否则停留 auditing |
| 盖章 | stampQuote | assistant（黄海） | pending_stamp → stamped |
| 发送客户 | markSent | sales | stamped → sent（写 sentAt，有效期起算） |
| 成交 | markDeal | sales | sent → deal |
| 作废 | markVoided | sales | 任意 → voided（原因必填） |
| 新建版本 | createNewVersion | sales | 复制快照 → 新单 assigned_sales |

- `deriveStage`：draft→1；feature_confirmed→2；eval_completed/assigned_sales/quote_summarized/rejected→3；其余→4。
- 终态：`deal || voided`，任何角色不可再编辑。

### 角色与权限（6 角色）

`pm`=张产品、`tech`=罗总、`sales`=李销售、`sales_manager`=黄奕、`decision`=闵总、`assistant`=黄海（董助）。`RoleSwitcher` 供原型切换视角。

- `getStageAccess` 返回 `editable/readonly/locked`：stage>current → locked；stage<current → readonly；终态 → readonly。
- `STAGE_OWNER_ROLES`：1=pm；2=tech；3=sales；4=sales_manager/tech/decision/assistant。阶段 4 内按状态收敛：auditing 仅三位会签人、pending_stamp 仅 assistant、stamped/sent 仅 sales。

### 三人并行会签 + 盖章
- 会签三人由 `buildInitialAuditNodes()` 生成：黄奕（销售部负责人）/ 罗总（技术部负责人）/ 闵总（企业决策层），初始 PENDING。
- `resolveAuditOutcome`：任一 REJECTED → rejected；全 APPROVED → pending_stamp；否则 auditing。
- **驳回硬规则**：任一驳回即 `resetAuditNodes()` 清空全部审批记录，销售改完须三人重新会签，禁止部分沿用。
- 盖章节点 `StampNode{stamperName:'黄海'}`，`StampStatus = LOCKED | PENDING_STAMP | COMPLETED`；盖章后可 html2canvas+jspdf 下载带「中科集团公章」PDF。
- 报价有效期 `calcExpiry(sentAt, quoteValidityDays)`。

### 版本快照（不可覆盖）
`createNewVersion`：旧版本不覆盖，深拷贝；`version` 递增 v1.0→v2.0；`previousQuoteId` 指向旧版；`status='assigned_sales'`；重置 `auditNodes/stampNode`、清空 `sentAt`；`timeline` 仅留一条 `new_version` 事件。作废单历史版本保留不可删除。

### 端 + 平台配置
- 平台全集 `PLATFORM_OPTIONS` 11 项：微信/支付宝/抖音小程序、iOS/Android/鸿蒙 APP、H5、PC Web、桌面应用、iPad、Android 平板。
- `EndpointConfig{id,name,platforms[]}`：一端可挂多平台；`FeatureModule.endpointId` 关联端；端列用原生 `<table>` rowspan 合并（Arco Table 不支持）。

### 切片重组 / 寄存值 / WASD（工作台二）
- 粒度 `Granularity = MODULE_PACK / SUB_GROUP / SINGLE`；纯函数 `packModule / groupSubFeatures（仅同模块≥2项，跨模块拒绝）/ ungroupUnit / ungroupPackedUnit / buildInitialUnits / sortUnitsByFeatureList / removeRoleFromUnits`。
- **寄存值机制**：解除合并后首行 `isRemainder=true` 继承原总值（红框），后续行填入值从寄存值扣减；下方值之和超过寄存值则寄存值清零；所有行都有值才消除红框。
- **WASD 导航**：W/S 上下行、A/D 左右岗位列，移动后 focus+select；方向键+Tab 填值。
- 上下键调值 `getStepFromCursor`：光标小数位 ±0.1、个位 ±1、十位 ±10、百位 ±100。
- 预设岗位 `PRESET_EVAL_ROLES` 10 个；删除岗位至少保留 1 个；提交校验 `manualWorkDays>0`、所有单元所有岗位必须填值。

### 报价计算（`quoteFlow.ts`，新口径）
- 常量 `TECH_DAILY_RATE = 600`（技术人天内部日均成本）。
- `computeAmountBreakdown`：
  - `techDays = sumEvalDays(evalSheet)`；`addedDays = Σ salesAddedRoles.headcount×days`
  - `techLaborCost = techDays × 600`；`addedCost = Σ salesAddedRoles.subtotal`
  - `laborSubtotal = techLaborCost + addedCost`
  - `grandTotal = laborSubtotal + travelSubtotal + onsiteSubtotal + otherCostSubtotal`
  - `travelSubtotal = round2(交通费×人数 + (住宿+补贴)×人数×天数)`；`onsiteSubtotal = round2(服务费×人数×天数)`；`addedRoleSubtotal = round2(人数×天数×日均单价)`
  - 占比 `ratios`，grandTotal=0 防 NaN。
- 保留精度：`round1`（人天 1 位）、`round2`（金额 2 位）。

### 提交审批前硬校验 `validateBeforeAudit`
校验码 `labor_days / cost_sum / payment_percent / travel_amount / no_eval / no_price`：
1. `no_eval` 无评估数据拦截；2. `labor_days` 分项人天之和与 techDays 差 >0.05 报不一致；3. `cost_sum` 分项成本与 grandTotal 差 >0.01 报不一致；4. `no_price` grandTotal≤0 拦截；5. `payment_percent` 无付款方式或 Σ比例与 100 差 >0.01 拦截（**必须精确 100%**）；6. `travel_amount` 开启出差/驻场但金额 ≤0 拦截。

- 付款模板 `PAYMENT_TERM_TEMPLATES`：50-40-10 / 30-40-20-10 / 全额预付。

### 线索侧旧报价口径（并存，注意区分）
`leads/quotationPricing.ts`：`calculateQuotationAmount = projectTotal×(1+upliftRate/100)`、`calculateQuotationAmountByFixed = projectTotal+upliftAmount`、`calculateUpliftRate = (amount/projectTotal-1)×100`。与新报价系统 `TECH_DAILY_RATE=600` 人天成本模型是两套并存口径。

## 3.5 合同管理（最大模块，`contracts/`）

### 状态机（`ContractStatus`）
`draft / approving / pending_mail（待寄出）/ pending_return（待回寄）/ archived / voided（终态）`

**转移表 `TRANSITION_TABLE`**（`utils.ts`，单测锁定 15 组合法/非法）：

| from | 可流向 |
|---|---|
| draft | approving、voided |
| approving | draft（驳回/撤回）、pending_mail（通过）、voided |
| pending_mail | pending_return（寄出）、draft（撤回）、voided |
| pending_return | archived（回寄扫描归档）、pending_mail（寄丢重做）、voided |
| archived | archived（补扫描件）、voided |
| voided | （终态） |

### 审批流 approvalFlow / approvalRounds
- `ApprovalStepName` 5 步：`发起申请 / 商务审核 / 财务审核 / 法务审核 / 总经理审批`。
- `createInitialApprovalFlow(mode)`：`standard` = 前 4 节点；`general-manager` = `[发起申请, 总经理审批]`（2 节点，项目侧合同记录用）。
- `DEFAULT_APPROVERS`：发起=张三、商务=王经理、财务=陈财务、法务=赵律师、总经理=赵总。
- 提交审批时 `flow[0]`（发起申请）直接置 approved；`approveStep` 全通过后置 `pending_mail` 并写 `approvedVersionNo`、`approvedAt`；`rejectStep`/`withdrawApproval` 回 draft。

### 版本快照
- `getNextVersionNo` 格式 `V{N}`，取最大数字+1，容忍乱序、忽略非法号。
- `saveAsVersion`：voided 不修改；审批中先撤回并重置 approvalFlow；追加含 `renderedHtml` 快照的新版本。
- `approvedVersionNo` 仅在审批全通过时写入，详情页高亮「已审批」版本。

### 3 个合同模板
| 模板 id | 适用 productCategories | 关键条款 |
|---|---|---|
| software_sales | 软件开发、系统集成 | 逾期违约金 0.5‰/日（累计≤5%）、质保 12 月、验收 10 工作日 |
| service_contract | 技术服务、系统集成 | SLA 响应（常规 4h/重要 1h/紧急 30min）、未达标按月服务费 5% 补偿（单次封顶 20%） |
| cloud_service | 云服务 | 月度可用性≥99.5%、终止后 60 日删除数据并出销毁证明、违约赔剩余周期 200% |

- `shared.ts` 提供 `escape`（防 XSS）、`renderPaymentPlanTable`、`renderSignatureBlock`、`renderAmountClause`（数字+中文大写 `convertAmountToChinese`）、`wrapDocument`（A4 + 默认「草案」水印）。
- `renderContractDocument`：`customContractHtml` 非空则直接用它，否则 `renderTemplate`。

### 回款状态与金额（`paymentUtils.ts`）
- `computePaymentStatus(c, now)`：①有未解决 blocker→`blocked`；②实收≥总额→`settled`；③某期 `expectedDate+7天` 已过且未收满→`overdue`；④下期 `diffDays≤7`→`upcoming`；⑤否则 `normal`。`BUFFER_DAYS=7`。
- `computeKanbanSummary`：排除 voided，算应收/本月已回/卡点/逾期/预计下月回款。
- 回款比例模板 `PAYMENT_RATIO_OPTIONS`：`3:3:3:1 → [30,30,30,10]`、`4:5:1 → [40,50,10]`。

### 补充协议（Supplementary Agreement）
- 状态：`draft → approving → approved → archived`，任一非 voided 可作废 → voided；复用合同 5 步审批流。
- **金额计入规则**：仅 `status==='archived'` 的补充协议计入合同总额；`totalAmount = 合同额 + Σ(已归档补充协议 amountChange)`；`receivableAmount = max(0, totalAmount - receivedAmount)`；作废即回滚（不计入）。

### 页面
`Contracts`（列表，仅展示已关联项目的合同）/ `ContractDetail`（基础/甲方画像/款项/文件/跟进记录）/ `ContractWizard`（新建，从 leadContext 恢复线索上下文，`periodToDays` 解析工期）/ `ContractEditor`（字段+付款+回款计划编辑，模板 contentEditable）/ `ContractDocumentPreview`（A4 正文编辑+模板切换）/ `ContractKanban`（统计看板）/ `PaymentKanban` + `PaymentKanbanV2`（回款拖拽看板 + 里程碑）/ `PaymentForecast`（现金流预测 + 甘特图）。

### 16 个子组件
`ContractActionBar`（按状态切按钮）、`ContractFlowProgress`（竖向 Steps）、`ContractProcessTimeline`、`ContractStatusBadge`、`ContractTextViewer`、`ContractModificationPanel`、`BlockerDunningPanel`（卡点+催款）、`DocumentUploadPanel`、`PaymentKanbanBoard/Card/SideDrawer/SummaryBar`、`PaymentTimeline`、`QuoteMismatchAlert`（`|合同额-报价额|≥0.01` 警告）、`ScanFileList`（≤20MB PDF/图片，`设为主件` 切 isPrimary）、`VersionTimeline`。

## 3.6 项目管理

### 数据模型（`project-management/mockData.ts`）
- `ProjectStatus` 7 态：`未开始/进行中/已完成/验收中/搁置/延迟/催款中`；`BusinessLine = 外包/自研/自运营`。
- `Project` 含各角色成员数组、`progress`、`leadId?/contractId?`。
- `initialProjects` 3 条：项目1 A公司CRM（contractId='4'）、项目2 B公司小程序（contractId='2'）、项目3 内部OA（leadId='lead-9' 无合同）。

### 项目详情 `ProjectDetail.tsx` + `ProjectDetailWorkspace.tsx`（1807 行）
- 4 张摘要卡 `buildProjectSummaryCards`（交付进度/负责人/交付时间/总工时），风险分级 `严重/预警/注意/正常`。
- 左主 Tab：基础/合同信息/回款发票（projectMode）/成本核算/项目团队/项目日报/任务管理；右 Tab：跟进/报价/合同记录（general-manager 2 节点）/会议纪要/演示/资料/出差/报销。
- 项目报价状态机：`未提交审批 → 提交审批(审批中) → approve(已审核) / reject(已驳回)`；审批流 = 发起申请(approved) + 总经理审批(pending)。

### 项目子模块纯函数
- **功能** `projectFeatures.ts`：`FeatureStatus = 待确认/已确认/开发中/待测试/已上线/已取消`；Excel 导入。
- **任务** `projectTasks.ts`：`TASK_NEXT_STATUSES` 状态机（未开始→[进行中,已搁置,已取消] 等）；流转「已完成」强制进度 100。
- **质量** `projectQuality.ts`：`BugStatus = 新建/修复中/待验证/已关闭`；`BUG_NEXT_STATUSES`（新建→[修复中] 等）；存在未关闭 P0/P1 → 预警。
- **报价成本** `projectQuotationConfigModel.ts`：`laborItemCost = 人数×天数×日薪`；`travelItemCost = 交通×2×人数×趟 + 住宿×天数×人数×趟 + (餐补+补贴)×天数×人数×趟`；`onsiteItemCost = 住宿/月×人数×月 + 餐补×天数×人数 + 交通/月×人数×月`；`totalAmount = labor + travel + onsite + other`。
- **成本面板** `ProjectCostPanel.tsx`：成本大类 差旅/推广/商务/第三方 + 人工；预计人工 `hours=workdays×8×allocation/100`、`cost=hours×standardHourlyRate`；项目利润 `contractAmount - totalCost`；支持导出 CSV。

## 3.7 交付计划（`delivery-plan/`）

### SOP 七大板块（`constants.ts`）
1 合同交接 → 2 项目启动准备 → 3 项目交付执行 → 4 资质备案&上架 → 5 测试验收 → 6 运维支持 → 7 项目总结。

### DeliveryType 7 种
`网站 / 小程序 / APP / 网站+小程序 / 网站+APP / 小程序+APP / 全平台`，`DELIVERY_TYPE_PHASE4_STEPS` 决定板块四适用步骤。

### 纯函数规则（`utils.ts`，全项目测试最完整）
- `addBusinessDays`：跳过周末；days=0 且周末则移到下一工作日。
- `filterPhase4Steps`：按交付类型筛板块四步骤，保持模板顺序，应用名称覆盖。
- `derivePhaseStatus`：空→pending；全 completed/skipped→completed；否则取 `STATUS_PRIORITY`（completed:4/skipped:3/in_progress:2/pending:1）最低者。
- `calcPhaseCompletion`：skipped 排除分母，completed=1、in_progress=0.5、pending=0。
- `generateDeliveryPlan`：拓扑排序板块；板块1 锚定 contractSignDate（否则 project.startDate，缺省 2026-06-15）；依赖板块锚定「最晚依赖结束日+1 工作日」；非 evergreen 步骤 `start=依赖步骤截止+1 工作日`、`due=start+(durationDays-1)工作日`。
- `SOP_STEP_TEMPLATES` 37 个步骤；`SOP_STEP_DEPENDENCIES`/`SOP_PHASE_DEPENDENCIES` 定义依赖；`3.8 需求变更全流程管理` 为常驻（evergreen）步骤。
- 步骤状态机 `VALID_TRANSITIONS`：pending→[in_progress,skipped]；in_progress→[completed,skipped]；completed→[in_progress]；skipped→[]（不可恢复）。

### 甘特图 `GanttChart.tsx`
`PX_PER_DAY = day:40/week:20/month:8`；`ROW_HEIGHT=40`；逾期红色+⚠；evergreen 虚线斜纹；自定义步骤「C」角标；里程碑菱形。

## 3.8 日报（`daily-report/`）

### 三级建模
岗位(position) → 规则(`DailyReportRule`，决定 templateType/workKinds/costBucket) → 模板(`DailyTemplate`，fields 数组) → 内容(`DailyReportContent` 联合类型)。

`dailyReportRules` 4 条：销售→sales（costBucket `lead-pending`，requireRelation true）；新媒体→ad-delivery（`ad-operation`）；开发→dev（`project`）；运营→general（`operation`）。

### 8 种 FieldType
`text / textarea / lead-tracking / project-task-list / date / select / number / ad-delivery-table`，表单控件由字段类型决定。

### 关键枚举与成本口径
- `WorkKind` 12 种；`WORK_KIND_ABILITY_MAP`（12 工种→能力维度+经验值，驱动员工能力成长）。
- `DailyCostBucket = project / internal-project / lead-pending / operation / ad-operation`（成本归集桶，喂给成本核算）。
- `getWorkAttributionAccounting(type)`：external-project→`{project, project}`；internal-project→`{project, internal-project}`；presales-lead→`{lead, lead-pending}`；其余→`{operation, operation}`。

### 4 个模板组件
`SalesDailyTemplate / GeneralDailyTemplate / AdDeliveryDailyTemplate（7 类工作项）/ DevDailyTemplate（主要工种+任务明细，工时 max 24）`。

### 提交校验（`DailyReportModal.tsx`，重点）
1. 非补录且明日计划为空 → 警告必填；2. sales → `validateSalesContent`（有效行须有归属+工作性质+内容+工时>0）；3. ad-delivery → 7 类逐项校验；4. dev/general → 缺归属提示；5. `buildDailyReportTasks` 生成 tasks、`totalHours` 求和；6. tasks 空 → 拦截；7. 非补录 `totalHours>24` → 拦截「单日工时不能超过 24 小时」；8. 非补录 `totalHours>12` → 二次确认；9. 通过后 `onSubmit`（status 固定 submitted）。
- 补录模式（backfill）：日期仅允许过去、可切换撰写人、剔除 assistance-needed/tomorrow-plan、无 24h/12h 限制。

### 岗位工作配置 `JobWorkConfigPage`
`JOB_DEPARTMENTS` 7 大部门；`DEFAULT_WORK_NATURES` 按岗位映射工作性质；`DEFAULT_DEPARTMENT_ROUTINES` 部门日常项目；默认日常项目只能停用不能删除。localStorage key `hubx-job-work-config-v1`、`hubx-daily-project-config-v4`。

## 3.9 财务与成本

### 项目成本核算公式（`contract-cost/`）
- `getHourlyRate(record, useActual)`：有 actual 用 `actualSalary/actualHours`，否则 `nominalSalary/nominalHours`。
- `getHourlyOpCost(month) = 月运营费用 / 在职员工数(5) / 标准月工时(176)`。
- **`totalCost = rdCost + opCost + businessCost + outsourceCost + otherCost`**（科研/商务/外包/其他/分摊运营 5 类）。
- **`profit = contractAmount - totalCost`**；**`profitMargin = round(profit/contractAmount×100)`**。
- 预警：`profitMargin<0` 亏损预警；`<15` 利润率偏低；否则健康。
- `contractProjectMap = {'1':['1'],'2':['2'],'3':['3'],'4':['1']}`（合同→项目 ID 映射）。

### 页面
- `FinancialDashboard`（合同总额/到账/待收/成本/利润率，运营成本 Tab 支出明细）。
- `SalaryPage`（工资表，名义/实际时薪，沿用上月标 inherited）。
- `ContractCostDetail`（5 张概览卡 + 5 Tab，`contractCostDetail` 权限控制时薪列显示）。
- `ProjectCostAccounting`（项目成本总表，收支明细 Drawer）。
- `ProjectInvoicePage` + `ProjectInvoiceContext`：开票状态机 `开票中 → 已开票 → 已冲红`；`redFlushInvoice` 仅「已开票」可冲红，生成新「重开」记录，原记录置「已冲红」；同 projectId+periodId 去重；localStorage `hubx-project-invoice-applications`。

### 回款发票 / 出差 / 报销列表
- `PaymentInvoiceList`（回款/开票进度）、`BusinessTripList`（3 节点审批：发起/部门主管/财务）、`ReimbursementList`（3 节点审批，按费用类别明细）。

## 3.10 员工与 HR

### 能力建模（`employee/mockData.ts`）
- 五维能力 `AbilityDimension = tech/biz/mgmt/tool/domain`（0-100）；`JobLevel = L1..L10`。
- 职位权重表 `DEFAULT_POSITION_WEIGHTS`（10 职位），如前端 `{tech:.40,biz:.15,mgmt:.10,tool:.25,domain:.10}`；`calcWeightedScore = Σ(能力值×权重)`。
- 晋级门槛 `DEFAULT_THRESHOLDS`：L1→L2=10 … L9→L10=90。
- 技能树 `skillTreeDefinitions` 32 节点（3 层、prerequisites、requiredScore）。
- `calcPerformance`：`totalScore = round(kpi×0.7 + behavior×0.3)`；rank `≥90 S / ≥80 A / ≥70 B / ≥60 C / 否则 D`。
- 薪资公式：`regularSalary = standardHourlyRate×160`；`probationSalary = regularSalary×0.8`；`socialSecurity = regularSalary×0.1`；`housingFund = regularSalary×0.07`。

### 级联更新（重点）
`updateLevelRate(level, position, rate)` 更新职级时薪时，**同步级联更新**该职级该职位下所有员工的 `standardHourlyRate`（喂给成本核算）。

### 页面
`EmployeeList`（组织树筛选、Excel 导入导出、转正/离职）/ `EmployeeDetail`（档案/能力/性格测评/考勤/绩效五 Tab，自绘雷达图）/ `AttendanceManagement` / `PerformanceManagement`（KPI+行为双滑块）/ `LevelRateSettings`（职级时薪配置）/ `HrExpenseManagement`（10 类 HR 费用，金额变更需选生效时间，待生效标签）。

---

# 四、横向支撑系统

## 4.1 提醒系统（`reminders/`）

- `ReminderContext`：内存态，**每 60 秒刷新 now**；`buildReminders(data, now)` 生成提醒。
- `buildReminders` 聚合 4 类 adapter（审批→日报→线索→合同）→ `sortReminders(filterVisibleReminders(...))`。
- `ReminderType` 9 种：`daily_report_unsubmitted / daily_report_comment / daily_report_mention / approval_pending / approval_result / contract_expiring / contract_mail_overdue / contract_draft_stale / lead_followup_overdue`。
- `ReminderActionTarget` 判别联合：`{kind:'route', path}` 或 `{kind:'modal', modal:'daily-report'}`。
- **排序规则** `sortReminders`：优先级降序（high:3/medium:2/low:1）→ deadline 升序（缺失排最后）→ createdAt 降序。
- **小睡** `filterVisibleReminders`：snoozedUntil 为 null 可见；否则仅到期（≤now）才重新显示；`resolveSnoozeUntil`：1 小时后 / 当天 18:00 / 次日 09:00。
- **线索逾期三级判断** `isLeadOverdue`：有 nextFollowupTime→其≤now；否则有 lastFollowupAt→超 48h；否则有 assignedAt→超 48h。
- 各 adapter 规则：审批 pending→high、结果→low；合同到期窗口 7 天/回寄超 7 天/草稿超 7 天；日报未提交仅在 `hour≥18` 生成；线索逾期恒 high。

## 4.2 待办中心（`todos/`）

- `TodoSource` 7 种：`approval / technical_evaluation / lead_followup / daily_report / project_task / wecom_approval / customer_communication`。
- `TodoItem` 含 `route / snoozedUntil / external / sourceId / module`。
- 持久化 `hubx-todo-center-v1`；**联动**：订阅 `approvalRecords`，`approved/rejected→completed`、`withdrawn/invalidated→canceled`（待办完成由业务结果驱动，非手动）。
- `activeTodos = pending ∪ in_progress`；`openTodo` 置 in_progress。

## 4.3 审批系统（`approvals/`）

### 双层模型
- `WorkflowTemplateDefinition`（模板：节点+策略+驳回策略）→ `BusinessApprovalDefinition`（业务：模板绑定 + 每节点审批人）。
- `ApproveStrategy = 单人审批 | 或签 | 会签`；`RejectPolicy = 驳回至发起人`（唯一）。
- 默认模板：T001 报价、T002 合同、T003 通用。
- localStorage `hubx-workflow-templates-v2`、`hubx-business-approvals-v2`、`hubx-approval-management-v1`。
- 审批决策当前硬编码「张三」；`decideApproval` 仅对 `source==='hubx' && status==='approving'` 生效。
- 业务映射校验：业务编码唯一（大写）、必选模板、每节点必须有审批人（或勾 skipIfEmpty）。

## 4.4 意见反馈（`feedback/`）
- `FeedbackType = bug/suggestion/experience/other`；附件存 IndexedDB（库 `hubx-feedback-attachments`），元数据存 localStorage `hubx-feedback-items`。
- 内容 ≤500 字、附件最多 5 个、自动携带 pagePath；`reporterName` 硬编码「张三」。

## 4.5 集成（企业微信，`integrations/`）
- `WeComConfig`（凭证保存为掩码 `••••••••`）、`SmsConfig`（阿里云，escalationHours:24、dailyLimit:500、employeeDailyLimit:3）、`SyncPolicy`（matchOrder wecomUserId→phone→email、conflictAction manual、preserveHistory 强制开启）。
- **数据边界**：姓名/手机/邮箱/部门/职位/状态由企业微信维护；职级/成本/绩效/能力等由 HubX 维护，同步不覆盖。
- `simulateRule`：短信仅 `priority==='high'` 才 success，否则 skipped。
- 消息模块→路由映射 `messageRoutes.ts`。
- **`wx-cli-bridge` 中间件**（`vite.config.ts`）：`GET /api/wechat/group-communication?groupName=...` 用 `wx export` 导出微信售前群，`generateSummary` 优先调 DeepSeek（temperature 0.2，强制 JSON），无 Key 回退本地 `buildSummary()` 规则总结。

## 4.6 系统管理
- `Organization`（部门树 + 人员）、`UserPermission`（用户/角色/权限 Tree 三档数据权限 all/department/self）、`Dictionary`（字典分类+项）、`SystemLog`（操作/登录日志）、`SystemConfig`（消息渠道/备份恢复/业务参数——含线索自动回收 7 天、跟进提醒 3 天、客户闲置 90 天、合同到期提醒 30 天）、`WorkflowTemplateList` + `BusinessMappingList`（审批模板/业务映射）、`ExpenseCategoryManager`（费用分类，LABOR 人力成本系统内置不可改）。

---

# 五、扩展模块

| 模块 | 功能要点 | 关键规则 |
|---|---|---|
| 个人工作台 `workbench/PersonalWorkbench.tsx` | 六项核心指标 + 四 Tab（概览/任务/能力/项目） | `nextSkill` 取第一个 locked 技能 |
| 资产管理 `assets/AssetManagement.tsx` | 7 类资产（服务器/域名/SSL/设备/许可证/软著/专利） | `calcStatus`：days<0→expired、≤30→expiring、否则 active |
| 售后运维 `maintenance/MaintenanceManagement.tsx` | 4 Tab：维护期/工单/续费/费用 | SLA：critical→当天16:00、high→次日12:00、medium/low→+3天12:00 |
| 供应商 `suppliers/SupplierManagement.tsx` | 供应商档案/分包合同/付款记录 | `paidAmount = totalAmount - unpaidAmount` |
| 知识库 `knowledge/KnowledgeBase.tsx` | 文档分类+权限+预览 | `canManage = isAdmin \|\| author===当前用户名` |
| 会议 `meetings/MeetingManagement.tsx` | 会议安排/会议室/会议记录 | 预约仅可选 available 会议室 |
| 全链路 ROI `roi/FullChainROI.tsx` | 漏斗/渠道/人员/项目 ROI | `整体ROI = totalProfit/max(totalSpend,1)×100`（%） |
| AI 助手 `ai/AIDriven.tsx` | 4 Tab：任务拆解/人员分配/跟进提醒/会议安排 | 匹配度≥90 高亮；剩余≤5 天红、≤10 橙 |
| 数据报表 `Reports.tsx` | 销售分析/人员业绩/项目成本 | recharts，时间周期未联动数据 |

---

# 六、跨模块联动规则

1. **线索 → 报价 → 合同**：`LeadDetail.handleStartEval` 将功能清单扁平化为 `FeatureModule[]` → `createQuote`（draft）→ 工作台流程 → 成交后 `handleCreateContract` 查 `flowStatus==='已审核' && status==='已报价'` 的最新报价跳 `/contracts/new`。
2. **合同 → 项目**：`findLinkedProject` 三路匹配（projectId/contractId/leadId）；`ProjectDetail` 反向 `getById(contractId) ?? find(contractId||projectId)`。
3. **合同/项目 → 财务成本**：`contractProjectMap` 映射，财务从 `project-management/mockData` 的 `initialDailyReports` 聚合工时。
4. **日报 → 成本/能力**：`DailyCostBucket` 是成本核算上游口径；`WORK_KIND_ABILITY_MAP` 与员工 `AbilityDimension` 同构，驱动能力成长。
5. **审批 ↔ 待办**：`TodoContext` 订阅 `ApprovalContext.records`，审批结果自动完成/取消待办。
6. **提醒 ↔ 线索/合同/日报**：`normalizeLeadReminderId` 对齐线索 ID；提醒 `actionTarget` 数据驱动跳转/打开日报弹窗。
7. **员工 ↔ 集成 ↔ 成本**：`EmployeeList` 展示企业微信绑定状态；`updateLevelRate` 级联更新 `standardHourlyRate` 喂成本核算。

# 七、已发现的疑点/不一致（供后续核实）

1. `deriveStage('eval_completed')=3`，但 `quoteFlow.ts` 的 `getStageAccess` 有段注释写「停在阶段 2，责任人是 PM 核对转派」，代码/注释不一致；UI 实际显示待办人为「李销售」。
2. `quote_summarized`、`pending_followup` 状态及 `raise_tech_issue/resolve_tech_issue` 动作为预留，Context 无对应迁移函数。
3. `Stage3WebAutomation.tsx` 名字带 WebAutomation 但内容是真实报价配置；`Stage3-WebAutomation-RULES.md` 描述已废弃的网页自动化。
4. 线索侧 `entity` 下拉（中科软艺/软艺信息/中科集团）与公司主体 6 个简称（中科软通/中科软艺/武汉软艺/…）命名不统一（「软艺信息」在主体表无对应）。
5. `quotationPricing.ts`（项目总价×上浮）与 `quoteFlow.ts`（TECH_DAILY_RATE=600 人天成本）两套报价口径并存。
6. `AttendanceManagement` 的 `LEAVE_TYPE_COLORS` 键（婚宴/产宴/丧宴）与 `ALL_LEAVE_TYPES`（婚假/产假/丧假）不一致。
