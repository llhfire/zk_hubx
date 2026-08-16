# 合同审批流收敛为总经理单节点 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将合同域所有审批路径（主模块提交、侧面板、新建草稿、撤回重提、版本再提交、补充协议、mock 数据）统一收敛为**总经理单节点**审批流，保留 `'standard'` 显式模式能力。

**Architecture:** 通过改 `createInitialApprovalFlow()` 与 `applySubmitVersionForApproval()` 的**默认值**（standard → general-manager）实现一处收敛、全路径统一；随后把 mock 初始数据与补充协议初始化的审批流形态同步为 `[发起申请(自动通过), 总经理审批]`。TDD：先写失败断言，再改实现。

**Tech Stack:** TypeScript + React 18 + Vitest（`npm test` 跑 `apps/prototype` 的 vitest，扫描 `packages/ui`）。

**设计文档:** `docs/superpowers/specs/2026-08-16-contract-approval-gm-singlenode-design.md`

---

## 素材总账（当前代码事实，供各 Task 参考）

- `createInitialApprovalFlow(mode = 'standard')` 在 `packages/ui/src/services/contractMutations.ts:30`；`'general-manager'` 分支已存在 → `['发起申请', '总经理审批']`，`DEFAULT_APPROVERS['总经理审批'] = '赵总 - 总经理'`。
- `applySubmitVersionForApproval(..., approvalMode = 'standard')` 在 `contractMutations.ts:175`。
- `LeadContractHistoryPanel` prop 默认 `approvalMode = 'standard'` 在 `packages/ui/src/app/pages/leads/components/LeadContractHistoryPanel.tsx:202`；两个调用点（`LeadDetail.tsx:911`、`ProjectDetailWorkspace.tsx:1603`）均已显式传 `"general-manager"`。
- `buildInitialContracts()` 在 `packages/ui/src/app/pages/contracts/mockData.ts`：合同 1/2/3/4/5/9/7/8 的 `approvalFlow` 均为 4 段（商务审核→财务审核→法务审核，全 approved）；合同 6 为 `[发起✓, 商务✓, 财务(pending), 法务(pending)]`。helper：`approved(step, approver, time, comment)` / `pending(step, approver)`（mockData.ts:22-28）。
- `handleAddSupplement` 的 `approvalFlow`（5 节点）在 `packages/ui/src/app/pages/ContractDetail.tsx:143-152`。
- 现有测试仅 `pages/contracts/__tests__/approvalFlow.test.ts`（11 行）显式引用 `createInitialApprovalFlow`，测 `'general-manager'` 显式模式。
- 合同域内 `ApprovalStepName` 类型（`contracts/types.ts:16`）保留全部 step 名；`DEFAULT_APPROVERS` 保留全部映射（standard 能力不删）。

---

### Task 1: 纯函数层 + 侧面板默认收敛（TDD）

**Files:**
- Test: `packages/ui/src/app/pages/contracts/__tests__/approvalFlow.test.ts`（追加）
- Modify: `packages/ui/src/services/contractMutations.ts:30`（`createInitialApprovalFlow` 默认值）
- Modify: `packages/ui/src/services/contractMutations.ts:175`（`applySubmitVersionForApproval` 默认值）
- Modify: `packages/ui/src/app/pages/leads/components/LeadContractHistoryPanel.tsx:202`（prop 默认值）

- [ ] **Step 1: 写失败的默认断言**

在 `approvalFlow.test.ts` 的 `describe('createInitialApprovalFlow', ...)` 内追加：

```ts
  it('defaults to the general-manager single-node flow', () => {
    expect(createInitialApprovalFlow()).toEqual([
      { step: '发起申请', approver: '张三', status: 'pending', time: '', comment: '' },
      { step: '总经理审批', approver: '赵总 - 总经理', status: 'pending', time: '', comment: '' },
    ]);
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd HubX && npx vitest run packages/ui/src/app/pages/contracts/__tests__/approvalFlow.test.ts`
Expected: 新增断言 **FAIL**（当前默认返回 4 节点 standard 流），原「general-manager 显式」断言 PASS。

- [ ] **Step 3: 改默认值（3 处）**

`contractMutations.ts:30`：

```ts
export function createInitialApprovalFlow(mode: 'standard' | 'general-manager' = 'general-manager'): ApprovalNode[] {
```

`contractMutations.ts:175`（仅改默认参数）：

```ts
export function applySubmitVersionForApproval(c: Contract, versionNo: string, note = '', approvalMode: 'standard' | 'general-manager' = 'general-manager'): Contract {
```

`LeadContractHistoryPanel.tsx:202`（仅改解构默认）：

```ts
  approvalMode = 'general-manager',
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd HubX && npx vitest run packages/ui/src/app/pages/contracts/__tests__/approvalFlow.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/ui/src/services/contractMutations.ts packages/ui/src/app/pages/leads/components/LeadContractHistoryPanel.tsx packages/ui/src/app/pages/contracts/__tests__/approvalFlow.test.ts
git commit -m "refactor: 合同审批默认收敛为总经理单节点"
```

---

### Task 2: mock 数据审批流收敛（TDD）

**Files:**
- Create: `packages/ui/src/app/pages/contracts/__tests__/mockApprovalFlow.test.ts`
- Modify: `packages/ui/src/app/pages/contracts/mockData.ts`（9 个合同的 `approvalFlow`）

- [ ] **Step 1: 写失败的 mock 断言**

新建 `mockApprovalFlow.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { buildInitialContracts } from '../mockData';

const STANDARD_STEPS = ['商务审核', '财务审核', '法务审核'];

describe('buildInitialContracts 审批流收敛', () => {
  it('所有 mock 合同的审批流都不含标准多级审核节点，且都含总经理审批', () => {
    for (const contract of buildInitialContracts()) {
      const steps = contract.approvalFlow.map((node) => node.step);
      for (const step of STANDARD_STEPS) {
        expect(steps, `${contract.contractNo} 不应包含 ${step}`).not.toContain(step);
      }
      expect(steps, `${contract.contractNo} 应包含 总经理审批`).toContain('总经理审批');
    }
  });

  it('审批中的合同 6 停在总经理审批待审', () => {
    const contract6 = buildInitialContracts().find((contract) => contract.id === '6');
    expect(contract6).toBeDefined();
    const pendingSteps = contract6!.approvalFlow.filter((node) => node.status === 'pending').map((node) => node.step);
    expect(pendingSteps).toEqual(['总经理审批']);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd HubX && npx vitest run packages/ui/src/app/pages/contracts/__tests__/mockApprovalFlow.test.ts`
Expected: 两个断言 **FAIL**（当前 mock 均为 standard 多节点）。

- [ ] **Step 3: 收敛 mock 数据的 approvalFlow（9 处）**

将下列合同的 `approvalFlow` 各替换为两行（总经理审批时间取原最后一步通过时间，approver 统一 `'赵总 - 总经理'`）：

合同 1（`mockData.ts:140-145`）：
```ts
    approvalFlow: [
      approved('发起申请', '张三', '2026-03-12 16:30', '提交合同审批'),
      approved('总经理审批', '赵总 - 总经理', '2026-03-14 11:00'),
    ],
```

合同 2（`mockData.ts:227-232`）：
```ts
    approvalFlow: [
      approved('发起申请', '李四', '2026-03-18 14:00'),
      approved('总经理审批', '赵总 - 总经理', '2026-03-19 17:00'),
    ],
```

合同 3（`mockData.ts:276-281`）：
```ts
    approvalFlow: [
      approved('发起申请', '张三', '2026-03-29 10:00'),
      approved('总经理审批', '赵总 - 总经理', '2026-03-31 11:00'),
    ],
```

合同 4（`mockData.ts:312-317`）：
```ts
    approvalFlow: [
      approved('发起申请', '李四', '2026-02-08 09:00'),
      approved('总经理审批', '赵总 - 总经理', '2026-02-09 16:00'),
    ],
```

合同 5（`mockData.ts:348-353`）：
```ts
    approvalFlow: [
      approved('发起申请', '张三', '2026-02-26 10:00'),
      approved('总经理审批', '赵总 - 总经理', '2026-02-27 16:00'),
    ],
```

合同 9（`mockData.ts:397-402`）：
```ts
    approvalFlow: [
      approved('发起申请', '张三', '2026-06-18 15:30', '提交合同审批'),
      approved('总经理审批', '赵总 - 总经理', '2026-06-19 16:20'),
    ],
```

合同 6（approving，`mockData.ts:456-461`）——停在总经理待审：
```ts
    approvalFlow: [
      approved('发起申请', '张三', '2026-06-11 09:30', '提交合同审批'),
      pending('总经理审批', '赵总 - 总经理'),
    ],
```

合同 7（`mockData.ts:492-497`）：
```ts
    approvalFlow: [
      approved('发起申请', '李四', '2026-06-07 14:00'),
      approved('总经理审批', '赵总 - 总经理', '2026-06-08 16:00'),
    ],
```

合同 8（`mockData.ts:528-533`）：
```ts
    approvalFlow: [
      approved('发起申请', '张三', '2026-06-02 10:00'),
      approved('总经理审批', '赵总 - 总经理', '2026-06-03 14:00'),
    ],
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd HubX && npx vitest run packages/ui/src/app/pages/contracts/__tests__/mockApprovalFlow.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/ui/src/app/pages/contracts/mockData.ts packages/ui/src/app/pages/contracts/__tests__/mockApprovalFlow.test.ts
git commit -m "feat: 合同 mock 数据审批流收敛为总经理单节点"
```

---

### Task 3: 补充协议审批流收敛

**Files:**
- Modify: `packages/ui/src/app/pages/ContractDetail.tsx:143-152`（`handleAddSupplement` 的 `approvalFlow`）

- [ ] **Step 1: 收敛补充协议初始化审批流**

将 `ContractDetail.tsx` 中 `handleAddSupplement` 里 `newSupplement` 的 `approvalFlow`（当前 5 节点）替换为：

```ts
        approvalFlow: [
          { step: '发起申请', approver: contract.createdBy || '张三', status: 'approved', time: now.toISOString().slice(0, 16).replace('T', ' '), comment: '' },
          { step: '总经理审批', approver: '赵总 - 总经理', status: 'pending', time: '', comment: '' },
        ],
```

- [ ] **Step 2: 构建验证**

Run: `cd HubX && npm run build -w apps/prototype`
Expected: 构建通过（无类型错误）。

- [ ] **Step 3: 提交**

```bash
git add packages/ui/src/app/pages/ContractDetail.tsx
git commit -m "feat: 补充协议审批流收敛为总经理单节点"
```

---

### Task 4: 全量验证 + 收尾

- [ ] **Step 1: 全量单测**

Run: `cd HubX && npm test`
Expected: 全部通过（含 Task 1/2 新增断言）。

- [ ] **Step 2: 生产构建**

Run: `cd HubX && npm run build`
Expected: 构建通过。

- [ ] **Step 3: push 备份**

```bash
git push origin main
```

- [ ] **Step 4: 更新演进史 P0 快照（可选加分项）**

更新根目录 `演进史.md` 第四章「当前状态快照」中 P0 ① 的现状：由「合同审批单节点部分实现」改为「已收敛为总经理单节点（纯函数默认值 + mock + 补充协议 + 侧面板 prop 默认均统一）」，标注 08-16。

```bash
git add "演进史.md"
git commit -m "docs: 演进史更新 P0① 合同审批单节点已收敛"
git push origin main
```

---

## Self-Review 记录

- **Spec 覆盖**：spec ① 纯函数默认收敛 ↔ Task 1；spec ② mock 数据收敛 ↔ Task 2（含合同 6 停在总经理待审）；spec ③ 补充协议收敛 ↔ Task 3；spec ④ 测试补充 ↔ Task 1（默认断言）+ Task 2（mock 断言）；spec ⑤ 范围外（不做联动/不删 standard/不统一审批中心）在计划中未涉及，符合。验收标准 1-6 均可由 Task 1-4 的测试/构建步骤验证。✅
- **占位符扫描**：无 TBD/TODO；每个 Task 的改动代码完整给出。✅
- **类型一致性**：`ApprovalNode` / `approved()` / `pending()` 沿用现有定义；`createInitialApprovalFlow` 与 `applySubmitVersionForApproval` 参数名 `mode` / `approvalMode` 与现有签名一致；测试中 `step` / `status` / `approver` 字段名与 `types.ts` 的 `ApprovalNode` 一致。✅
- **影响面**：Task 1 只改默认参数（行为：不传 mode 的路径变 GM）；两个侧面板调用点显式传 GM 不受影响；`approvalFlow.test.ts` 原断言不受影响。✅
