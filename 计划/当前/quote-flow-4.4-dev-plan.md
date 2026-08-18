# 报价 4.4 开发计划：审批配置接线（提交时拍快照）

> 2026-08-18 · 只规划不写码  
> 纲领计划：`计划/当前/quote-flow-prd-implementation.md` §4.4（本文是其展开）  
> 事实源：ADR `0010`（报价审批来自审批配置）、`0011`（盖章人来自配置）、`0023`（通知来自角色与配置）、`0049`（提交时拍配置快照）、`0009`（补充报价独立审批）；PRD v1.1  
> 前置：**4.1 先行**（`migrateQuote` 通道与 TRANSITIONS 表）

## 1. 现状与差距

### 1.1 系统里有三套互不相通的「审批」

| 体系 | 位置 | 人名 | 状态 |
|------|------|------|------|
| 报价自带会签 | `Quote.auditNodes` + `buildInitialAuditNodes`（`types.ts:398-404`） | 黄奕/罗总/闵总并行 + 盖章黄海 | 真实驱动报价流转 |
| 合同自带审批 | `createInitialApprovalFlow`（`services/contractMutations.ts:22-35`） | 王经理/陈财务/赵律师/赵总 | 真实驱动合同流转，**未接 approvals 域** |
| 通用审批域 | `approvals/configStore.ts`（模板+业务绑定，localStorage）+ `ApprovalContext` | 赵六（销售总监）/张三（财务主管） | 纯 mock，与上两者零关联 |

关键现状：

- 配置页存在且可用：`WorkflowTemplateList.tsx`（路由 `/approvals/templates`、`/system/workflow`），数据模型 `WorkflowTemplateDefinition`（节点 name+strategy+rejectPolicy）+ `BusinessApprovalDefinition`（bizCode/templateId/assignments），存 localStorage（`configStore.ts:41-42,124-138`）。
- 默认模板 T001「报价审批模板」= **业务负责人 -> 财务串行**，默认业务绑定 `business-quotation` 人名是赵六/张三财务--与报价真实会签完全对不上。
- 报价的会签执行引擎（`applyDecideAudit`、`resolveAuditOutcome`、驳回全员重审 `quotationMutations.ts:97-105`）已经完备且被 4.1 的测试覆盖。
- 人名 -> 角色（`AUDITOR_ID_TO_ROLE`，`quoteFlow.ts:131-135`）与审批决策按人名反查角色（`quotationMutations.ts:93-94`）都是写死。

### 1.2 计划的核心取舍

**不接通用审批域的「审批单」运行时**（ApprovalContext 不为报价生成 ApprovalRecord），只接**配置层**：报价会签引擎保持自建（它就是「快照」的容器），但节点从哪来--由 `configStore` 的业务绑定在**提交时**拍板。理由：

1. ADR 0049 拍的是「提交时拍配置快照」，`Quote.auditNodes`/`stampNode` 本身就是天然快照载体，不需要第二份数据。
2. 接审批单运行时意味着重写提交/驳回/撤回全链路，且「驳回全员重审」与通用模板「驳回至发起人」策略语义冲突，收益为零（α 单用户角色切换，没有真审批人登录）。
3. 合同域也没接 approvals 域，报价先接运行时会变成孤例。

## 2. 目标行为

1. 新业务类型：`quote-approval`（报价审批）、`supplement-quote-approval`（补充报价审批），默认模板 = **三人并行会签 + 盖章节点**（黄奕/罗总/闵总 + 黄海），即现网行为的配置化表达。
2. 提交审批（`submit_for_audit`）时：读当时配置 -> 构建 `auditNodes` + `stampNode` 写入 Quote（= 快照落库）。撤回再提、驳回再提**按提交当时配置重拍**（ADR 0049）。
3. `Stage4Approval` / `getPendingRoles` / `getPendingOwner` 全部读快照，代码里不再出现写死人名；人名 -> 报价角色的映射改为「assignments 携带 quoteRole」，缺失时按姓名查兜底映射。
4. 已提交未走完的单**不受配置后续修改影响**（快照的意义，验收标准）。
5. T001「业务负责人->财务」串行默认**不接到报价工作台**；只有管理员显式改了 `quote-approval` 绑定的模板才生效（拍板条款）。
6. 补充报价走 `supplement-quote-approval` 独立配置（4.7 落地时直接可用，本计划先建好配置项）。

## 3. 设计

### 3.1 配置侧新增（`approvals/configStore.ts`）

```
新模板 T-QUOTE-PARALLEL：
  节点1 会签-销售部负责人（strategy: 并行/会签）
  节点2 会签-技术部负责人（并行）
  节点3 会签-企业决策层（并行）
  节点4 盖章（单节点，约定 name === '盖章' 即盖章节点）
新业务绑定：
  quote-approval            -> T-QUOTE-PARALLEL，assignments 四节点（前三节点带 quoteRole，第四节点=盖章人）
  supplement-quote-approval -> 同上另一份绑定（可独立改人）
```

- `BusinessApprovalDefinition.assignments` 的 `assigneeValue` 现为纯人名字符串；**扩展为可选携带 `quoteRole`**（加一个可选字段，向后兼容 approvals 域现有 mock）。
- 盖章节点识别约定：模板中 `name === '盖章'` 的节点即 stamp 节点，快照构建器把它拆到 `Quote.stampNode`，其余进 `auditNodes`。不扩展 configStore 的节点类型枚举（改动面最小）。

### 3.2 快照构建器（新纯函数，`services/quotationMutations.ts` 或独立 `quoteAuditSnapshot.ts`）

```
buildAuditSnapshot(binding: BusinessApprovalDefinition, template: WorkflowTemplateDefinition)
  -> { auditNodes: AuditNode[]; stampNode: StampNode }
```

- 并行会签节点 -> `AuditNode { auditorId, auditorName, role, status: 'PENDING' }`（auditorId 由 quoteRole 生成，替代 huangyi/luo/min 写死）。
- 找不到绑定/模板（管理员删配置的边界）-> 抛错并 toast「报价审批未配置，请联系管理员」，**不静默回退写死三人**。
- `AUDITOR_ID_TO_ROLE` 与 `applyDecideAudit` 的人名反查全部改走快照里存的 quoteRole。

### 3.3 service 层接线

- `quotationService` 增注入项 `loadApprovalBinding: (bizCode) => { template; binding } | null`（默认实现读 configStore；mock/http 共用，测试注入假配置）。
- `submitForAudit`（及 4.1 的重提路径）-> 先 `buildAuditSnapshot` 再 `applyTransition`；`applyNewVersion`/`resetAuditNodes` 同步改为「重提时重拍」而不是 `buildInitialAuditNodes()`。
- `buildInitialAuditNodes` 删除（或仅保留给迁移函数：旧数据无快照时按旧三人补一份快照，保证 `migrateQuote` 后旧单可继续走完）。

## 4. 文件改动清单

| # | 文件 | 改动 |
|---|------|------|
| 1 | `approvals/configStore.ts` | +T-QUOTE-PARALLEL 模板、+两个业务绑定、assignments 可携带 quoteRole |
| 2 | `services/quoteAuditSnapshot.ts`（新） | `buildAuditSnapshot` 纯函数 |
| 3 | `services/quotationService.ts` | +`loadApprovalBinding` 注入；submit/重提路径接快照 |
| 4 | `services/quotationMutations.ts` | `applyDecideAudit`/`applyNewVersion`/`resetAuditNodes` 去人名写死；`migrateQuote` 给无快照旧单补拍 |
| 5 | `pages/quotation/quoteFlow.ts` | `AUDITOR_ID_TO_ROLE` 删除，`getPendingRoles` 读节点自带 quoteRole |
| 6 | `pages/quotation/types.ts` | `AuditNode.quoteRole` 字段化；`buildInitialAuditNodes` 移除 |
| 7 | `pages/quotation/stages/Stage4Approval.tsx` | 会签列表/盖章人渲染读快照（预计已自动，核对） |
| 8 | 测试（新 `quoteAuditSnapshot.test.ts` + 改 `quoteFlow.test.ts`） | §5 |

## 5. 测试用例设计

### 5.1 快照构建

- 标准配置 -> 三个 PENDING 会签节点 + 盖章节点，auditorName/quoteRole 来自 assignments。
- 配置里的节点顺序/人数变化（两人会签、五人会签）-> 快照跟随，`getPendingRoles` 待办人跟随。
- 盖章节点缺失 -> `stampNode` 为空且提交时报错（无盖章人不能送审）。
- 绑定/模板不存在 -> 抛错，不回退写死三人。

### 5.2 快照不变性（ADR 0049 核心）

- 单已提交（快照=黄奕/罗总/闵总）-> 管理员把配置改成两人 -> 该单会签人**不变**；新单提交跟新配置。
- 驳回重提 -> 重拍当时配置（旧快照被替换，timeline 留痕）。
- 撤回再提 -> 同上。

### 5.3 迁移兼容

- 旧单（无 quoteRole 的 auditNodes）过 `migrateQuote` -> 按旧三人配置补 quoteRole，会签可继续走完。
- T001 串行默认未改时，`quote-approval` 绑定不受影响（两套绑定并存互不干扰）。

### 5.4 回归与人工

- 4.1 TRANSITIONS/迁移测试全绿；`npm run build`。
- 人工：改配置 -> 新单会签人变化 -> 提交后改配置 -> 在途单不变；补充报价绑定独立改人不影响主报价。

## 6. 边界决策

1. **不接 ApprovalContext 运行时**（理由见 §1.2），合同域是否照此模式接配置快照由后续阶段另议。
2. **盖章节点靠 name 约定识别**，不给 configStore 加节点类型枚举--若后续审批域升级节点模型，快照构建器是唯一适配点。
3. **配置缺失不静默兜底**：宁可报错也不能回到写死三人，否则「配置驱动」名存实亡。
4. **T001 与 `business-quotation` 旧绑定原样保留**，只是不被报价读取；不在本计划清理 approvals 域 mock。
5. **通知**（ADR 0023）：会签人快照变化后 `getPendingRoles` 自动跟随，待办/铃铛链路（4.2 已对齐）零改动。
