# 合同审批流收敛为总经理单节点 — 设计文档

> 日期：2026-08-16
> 状态：待用户审阅
> 涉及代码：`HubX/packages/ui/src/`（合同域）

## 一、背景与目标

P0 ①「合同审批单节点部分实现」：合同审批流应收敛为**总经理单节点**（`发起申请` 自动通过 → 仅剩 `总经理审批` 一个待审节点），与报价域已收敛的样板口径一致。

现状：纯函数层（`createInitialApprovalFlow('general-manager')`）与侧面板（`LeadDetail` 的 `LeadContractHistoryPanel`、项目工作台均已传 `approvalMode="general-manager"`）**已就绪**；但**合同主模块提交路径**与 **mock 数据**仍走 standard 多节点流（商务审核→财务审核→法务审核），未收敛。

**目标**：合同域所有审批路径统一为总经理单节点，保留 `'standard'` 显式模式能力。

## 二、需求（已与用户逐项确认）

| 维度 | 决策 |
|---|---|
| 收敛策略 | **默认收敛**：`createInitialApprovalFlow()` 默认值改为总经理单节点，所有不传 mode 的路径自动统一；保留 `'standard'` 显式模式 |
| 补充协议 | **一并收敛**：ContractDetail 新建补充协议的 5 节点审批流 → 总经理单节点 |
| 审批人命名 | **合同域内统一**：总经理节点统一「赵总 - 总经理」；审批中心 configStore/静态记录属另一套 mock，不动 |
| 范围外 | 不做审批中心（ApprovalCenter）与合同域联动、不删 standard 模式 |

## 三、改动设计

### ① 纯函数层默认收敛 — `services/contractMutations.ts`
- `createInitialApprovalFlow(mode: 'standard' | 'general-manager' = 'general-manager')`：默认值 `standard` → `general-manager`
- `applySubmitVersionForApproval(..., approvalMode = 'general-manager')`：默认值同步
- **效果**：`applySubmitForApproval`（主模块提交）、`applyCreateFromWizard`（新建草稿）、`applyWithdrawApproval`（撤回重提）、`applySaveAsVersion` / `applySaveVersionWithDetails` / `applySubmitLatestVersionForApproval`（版本再提交）全部自动收敛为 `[发起申请(自动通过), 总经理审批(待审)]`
- `DEFAULT_APPROVERS`、`ApprovalStepName` 类型、standard 分支代码**保留不动**（standard 显式能力仍可用）

### ② mock 数据收敛 — `pages/contracts/mockData.ts`
- 已通过合同（含合同 7/8）：`approvalFlow` `[发起✓, 商务✓, 财务✓, 法务✓]` → `[发起✓, 总经理审批✓]`（审批人「赵总 - 总经理」）
- 合同 6（审批中）：`[发起✓, 商务✓, 财务(pending), 法务(pending)]` → `[发起✓, 总经理审批(pending)]`
- 复用现有 `approved()` / `pending()` mock helper

### ③ 补充协议收敛 — `pages/ContractDetail.tsx`
- `handleAddSupplement`：`approvalFlow` 5 节点（发起→商务→财务→法务→总经理）→ `[发起申请(approved), 总经理审批(pending)]`

### ④ 测试补充 — `pages/contracts/__tests__/approvalFlow.test.ts`
- 补断言：`createInitialApprovalFlow()` 不传参 = `[{step:'发起申请'}, {step:'总经理审批'}]`
- 既有「general-manager 显式」断言保留

## 四、影响面与风险

- **改动文件**：`services/contractMutations.ts`、`pages/contracts/mockData.ts`、`pages/ContractDetail.tsx`、`pages/contracts/__tests__/approvalFlow.test.ts`（共 4 个）
- **已核查**：合同域内标准节点名硬引用仅 3 处（`contractMutations.ts` 定义、`ContractDetail.tsx:146` 补充协议、`types.ts` 类型枚举）；出差/报销/报价等**其他业务域**的审批流不受影响
- **流程行为变化**：提交审批后审批流只显示「总经理审批」一个待审节点；`[演示] 通过下一节点` 通过即进 `pending_mail`
- **低风险**：全部为默认值/数据形态调整，无新增依赖、无删除能力

## 五、验收标准

1. `createInitialApprovalFlow()` 不传参返回总经理单节点流；显式 `'standard'` 仍返回原 4 节点流
2. 合同主模块「提交审批」后，`approvalFlow` 为 `[发起申请✓, 总经理审批(pending)]`
3. 所有 mock 合同的 `approvalFlow` 均收敛为总经理节点形态；合同 6 停在总经理待审
4. 新建补充协议初始化审批流为总经理单节点
5. 既有测试全部通过，新增默认断言通过；`npm run build` 通过

## 六、验证方式

```bash
cd HubX
npm test        # vitest 全量（含新增 approvalFlow 默认断言）
npm run build   # 生产构建
```
