# 审批模板详细设计（approval-template-design.md）

> 状态：设计定稿，未编码。业务规格事实源：`文档/PRD/PRD-审批流程管理.md`（633 行，本设计不重复其行为规则，只补落地设计）。
> 看板条目：工作台与审批 :: 审批模板（串行/并行/会签节点配置）[已调研]。

## 1. 现状与差距

| 层 | 现状 | 差距 |
| --- | --- | --- |
| 配置层 | `approvals/configStore.ts`：`WorkflowTemplateDefinition`（节点 name+strategy+rejectPolicy）+ `BusinessApprovalDefinition`（bizCode/templateId/assignments），localStorage；默认模板 T001/T002/T003 + 4.4 的报价并行模板与两条绑定 | 基本可用；缺 PRD §6.4 的操作约束（绑定中不得删/停用）、复制模板、实质调整二次确认 |
| 报价侧接入 | `quotation/quoteAuditSnapshot.ts`（4.4 已落地）：`buildAuditSnapshotFromConfig` 提交时拍快照进 `Quote.auditNodes` | ✅ 完成，是本设计运行时引擎的参照实现 |
| 运行时 | `approvals/ApprovalContext.tsx`：`ApprovalRecord`（含 nodes）纯 mock 种子 + localStorage，通过/驳回直接改记录 | **无引擎**：实例不从配置生成；或签「他人自动关闭」、会签「任一驳回即止」、实例快照、作废（PRD §9-11）全部缺失 |
| 页面 | `WorkflowTemplateList.tsx`（模板+绑定配置）、`ApprovalCenter.tsx`（待办/已办）、`ApprovalTypeRegistry.tsx` | 模板编辑器缺节点排序/策略语义预览/复制 |
| β | 全部 localStorage，无 D1 | 无服务端校验与持久化 |

**关键架构决策（沿用 4.4 已拍板）**：审批域分**配置层**（模板+绑定）与**运行时**（审批实例）；业务域接入遵循 PRD §8.3（业务模块完成接入才可发起真实审批）。报价已按 4.4 只接配置层（自带会签引擎做快照容器），**本设计不为报价迁移到通用运行时**；通用运行时先建引擎+改造 ApprovalCenter，业务接入（合同先行）按各自计划排队。

## 2. 目录结构

```
packages/ui/src/app/approvals/
  types.ts                 # 扩展：实例/节点任务类型（见 §3）
  configStore.ts           # 已有，补操作约束与复制（§4.1）
  instanceEngine.ts        # 新：实例生成 + 节点流转纯函数（§3.3）
  instanceService.ts       # 新：IApprovalInstanceService 接口 + α mock/localStorage
  ApprovalContext.tsx      # 改造：mock 种子 -> 引擎驱动
  __tests__/instanceEngine.test.ts
  __tests__/configRules.test.ts
```

## 3. 领域模型与引擎

### 3.1 类型（types.ts 扩展）

```ts
export type NodeTaskStatus = 'pending' | 'approved' | 'rejected' | 'auto_closed';

export interface ApproverSnapshot {
  userId: string;
  name: string;
}

/** 实例节点：模板节点 + 审批人快照 + 任务状态（PRD §9.2） */
export interface InstanceNode {
  nodeId: string;
  name: string;
  strategy: ApproveStrategy;      // 单人审批 | 或签 | 会签
  approvers: ApproverSnapshot[];  // 提交时已确定的人员快照
  tasks: Array<{ approverId: string; status: NodeTaskStatus; decidedAt?: string }>;
  nodeStatus: 'pending' | 'approved' | 'rejected';
}

export interface ApprovalInstance {
  id: string;
  approvalNo: string;             // BJSP-yyyymmddNNN
  bizCode: string;
  bizObjectId: string;            // 业务对象 ID（如合同 id）
  bizTitle: string;
  action?: string;                // PRD §8.2：新建/变更/作废标识
  applicant: ApproverSnapshot;
  amount?: number;
  route: string;
  /** 提交时快照（PRD §9.2）：模板结构+绑定+人员，之后配置修改不影响 */
  nodes: InstanceNode[];
  status: ApprovalStatus;         // approving/approved/rejected/withdrawn/invalidated
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 发起前校验（PRD §9.1 -> 纯函数）

```ts
export function validateLaunch(input: {
  binding: BusinessApprovalDefinition;
  template: WorkflowTemplateDefinition;
  pendingInstance?: ApprovalInstance;   // 同业务对象进行中的实例
}): { ok: true } | { ok: false; reasons: string[] };
```

校验项按 PRD §9.1 的 8 条映射；α 阶段「人员在职有效账号」退化为「人员目录存在」（PRD 校验 5 按人员目录 mock 实现）。

### 3.3 节点流转引擎（instanceEngine.ts，纯函数）

```ts
export function launchInstance(...): ApprovalInstance;
export function decide(instance: ApprovalInstance, nodeId: string, approverId: string,
  decision: 'approve' | 'reject', now: string): ApprovalInstance;
```

策略语义（PRD §6.3 的 MUST 条款）：

| 策略 | 通过 | 驳回 | 副作用 |
| --- | --- | --- | --- |
| 单人审批 | 该人通过 | 该人驳回 | - |
| 或签 | 任意一人通过 | 任意一人驳回 | 结束时其余 pending 任务置 `auto_closed` |
| 会签 | 所有人通过 | 任意一人驳回 | 驳回时其余 pending 任务置 `auto_closed` |

节点间串行：当前节点 `approved` 才激活下一节点；任一节点 `rejected` -> 实例 `rejected`（PRD §9.3）。最后一个节点通过 -> 实例 `approved`。

幂等：同一 approver 对同一任务重复 decide 返回原实例不变（PRD §10.3）；`auto_closed` 任务不可再操作。

### 3.4 作废（PRD §11）

```ts
export function invalidateInstances(instances: ApprovalInstance[], templateId: string, now: string): ApprovalInstance[];
// 模板实质调整保存时，绑定该模板的进行中实例 -> invalidated
```

触发条件按 PRD §11.1；α 用确认弹窗列出受影响实例数。

## 4. 配置层补强（configStore.ts + WorkflowTemplateList.tsx）

### 4.1 操作约束（纯函数 + UI）

```ts
export function canDeleteTemplate(t, bindings): { ok: boolean; reason?: string };   // 有绑定 -> 拒（PRD §6.4.1）
export function canDisableTemplate(t, bindings): { ok: boolean; reason?: string };  // 启用中绑定 -> 拒（§6.4.2）
export function isSubstantiveChange(before: WorkflowTemplateDefinition, after): boolean; // §6.4.4：节点名/数量/顺序/策略
```

- 复制模板：新模板编号（T 前缀递增），节点深拷贝，不带绑定（§6.4.3）。
- 实质调整保存前二次确认，提示将作废进行中审批数量（§6.4.5）。
- 模板编辑器：节点列表增删 + 上下移排序 + 策略 Select（单人/或签/会签，选中或签/会签时审批人输入允许多选）；「上一节点负责人」仅允许非首节点（PRD §9.1.6 的配置时约束）。

### 4.2 业务绑定编辑

沿用现有 `ApprovalTypeRegistry` / 绑定编辑页，补：

- 节点审批人 `assigneeValue` 从纯人名字符串升级为 `string | string[]`（或签/会签多人；configStore 类型已兼容，UI 补多选）。
- 绑定切换模板时：assignments 按新模板节点重建（旧 assignments 丢弃，提示）。
- 配置预览（PRD §7.6）：按节点顺序渲染 发起 -> 节点(策略/审批人) -> 结束。

## 5. ApprovalContext 改造

- 保留现有 `ApprovalRecord` 对外形状（ApprovalCenter 不大改）：内部 `ApprovalRecord.nodes` 由 `InstanceNode[]` 映射，`currentApprover` = 当前节点 pending 任务人员。
- mock 种子：保留 2 条历史种子（已办演示），新增 1 条「由引擎从 T002 绑定生成的进行中合同审批」种子，验证引擎路径。
- `decide` 动作走 `instanceEngine.decide`；完成后按 bizCode 回调业务动作（合同先行：approved -> 合同状态机推进，另行排期，本设计只留回调钩子 `onInstanceDecided?: (inst) => void`）。

## 6. β 接线（须 productionOn 后编码，此处只定边界）

- D1 三表：`approval_templates` / `approval_bindings` / `approval_instances`（data-JSON + version 乐观锁，同 contracts 模式）。
- API：`GET/PUT /api/approval-templates|bindings`、`GET /api/approval-instances`、`POST /api/approval-instances/:id/decide`。
- 服务端校验：§3.2 发起校验、§3.3 幂等、模板删除/停用约束（§4.1）；实例快照生成放服务端（时钟可信，对齐 ADR-0094）。
- α/β 共用 `instanceEngine` 纯函数（同智能会议 services 接缝模式）。

## 7. 测试清单

| 文件 | 覆盖 |
| --- | --- |
| instanceEngine.test.ts | 三策略通过/驳回矩阵；或签自动关闭；会签驳回即止；串行激活；实例终态；幂等重复 decide；auto_closed 拒操作 |
| configRules.test.ts | 模板删/停约束；复制不带绑定；实质调整判定（改名/说明对比）；上一节点负责人非首节点 |
| validateLaunch | 8 条校验逐条 + 组合失败 |
| invalidateInstances | 作废只影响进行中+绑定该模板 |

## 8. 排期建议

1. **本设计 P1**：instanceEngine 纯函数 + 测试（零 UI 依赖，小步）。
2. **P2**：configStore 约束 + WorkflowTemplateList 编辑器补强。
3. **P3**：ApprovalContext 接引擎 + 审批中心回归。
4. **P4**：合同域接入（依赖合同状态机对齐，另立计划）。
5. β 接线看板翻牌后（§6）。

## 9. 决策记录

1. **不为报价迁移通用运行时**：4.4 已拍板（快照容器 + 自建会签引擎语义完备），迁移收益为零。
2. **运行时先引擎后业务**：PRD §8.3 要求业务完成接入才可发起真实审批，本设计只交付引擎与中心改造，业务接入另排。
3. **ApprovalRecord 对外形状不变**：ApprovalCenter 与待办中心零改动，内部换引擎。
4. **α 的「在职有效账号」退化为人员目录存在性**：无账号体系，β 再收紧。
