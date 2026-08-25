# 废弃补充协议对象收口设计（supplementary-agreement-sunset-design.md）

> 状态：设计定稿，未编码。性质：冲突清理 + 对象迁移，不是新功能。
> 依据：ADR-0008（需求变更走补充报价->补充合同）、`计划/当前/remaining-conflicts.md` A1（「补充协议没死」）、CONTEXT.md §Avoid。
> 建议开工时机：B5 之后（remaining-conflicts 建议的「下一刀」）；与 B5 无耦合，也可独立小步提交。

## 1. 现状（打架点）

「补充协议」`SupplementaryAgreement` 是内嵌在 `Contract` 上的旧对象，绕过评估直接改标的，与 ADR-0008 的正式链路并存：

| 位置 | 现状 | 问题 |
| --- | --- | --- |
| `contracts/types.ts:307-324` | `SupplementaryAgreement` 接口 + `Contract.supplementaryAgreements?` 字段 | 旧对象本体 |
| `contracts/types.ts:166` | `Contract.kind?: 'main' \| 'supplement'` | **已定义未使用**：无生成入口、无 mock 种子、无消费逻辑 |
| `ContractDetail.tsx:129-670` | 上传补充协议弹窗、列表展示、补充协议页面局部回款登记、金额动态计算（Σ已归档 `amountChange`） | 绕过补充报价链路；局部回款 360 看不见（remaining-conflicts B） |
| `ProjectDetail360.tsx:449-453` | 把 `supplementaryAgreements` 显示为「补充合同」（只显示数量） | 换皮不换骨，语义错位 |
| `docs/SYSTEM-OVERVIEW.md:270` | 整节「补充协议（Supplementary Agreement）」按旧口径描述 | 文档过期（假冲突 C 类） |

## 2. 目标行为

1. `SupplementaryAgreement` 对象整体删除；需求变更唯一入口 = ADR-0008 链路：补充报价（四步工作台）-> 已确认 -> 合同向导生成**补充合同**（`kind: 'supplement'` 的独立 `Contract`）。
2. 有效标的额口径统一：`合同额(主合同) + Σ(已归档且未作废的补充合同额)`；补充协议的 `amountChange` 增减口径废弃。
3. 补充协议的「页面局部回款登记」删除；补充合同回款走主合同同一套（`collections` 台账 / ContractsContext）。
4. 360 与合同详情显示真补充合同列表（`kind === 'supplement'` 且 `parentContractId` 指向主合同）。

## 3. 设计

### 3.1 类型（contracts/types.ts）

```ts
// 删除：
export interface SupplementaryAgreement { ... }          // 整体删除
export interface Contract { supplementaryAgreements?: ... } // 字段删除

// Contract.kind 启用并补关联：
kind?: 'main' | 'supplement';
/** 补充合同指向主合同（kind === 'supplement' 时必填） */
parentContractId?: string;
/** 来源补充报价（ADR-0008 链路溯源） */
sourceQuoteId?: string;
```

### 3.2 金额与标的计算

- 现 `ContractDetail.tsx:245` 的 `totalAmount = 合同额 + Σ(已归档补充协议 amountChange)` 改为：

```ts
// 纯函数，落 contracts/payment/paymentUtils.ts 或 contractModification.ts
export function effectiveAmount(main: Contract, supplements: Contract[]): number;
// = main.amount + Σ supplements.filter(s => s.kind==='supplement'
//        && s.status==='archived' && !s.voided).amount
```

- 回款口径：`receivableAmount = max(0, effectiveAmount - receivedAmount)`，`receivedAmount` 统一读 `collections`（与 B4 实收台账口径一致，本设计不展开 B5 洞 B 的双写）。

### 3.3 ContractDetail 改造

- 删：上传补充协议弹窗（:647）、补充协议列表区（:385,583）、补充协议回款登记弹窗（:669）、`supplements` state（:129）。
- 增：「补充合同」列表区：读 `ContractsContext.contracts.filter(c => c.kind==='supplement' && c.parentContractId === contract.id)`，每行显示名称/金额/状态/来源补充报价，点击跳 `/contracts/:id`（补充合同详情复用同一详情页）。
- 「需求变更」入口文案改指向：按钮「发起需求变更」-> 跳报价工作台新建补充报价（`supplementQuote` 入口），删除「上传补充协议」。

### 3.4 生成链路补线（向导侧）

`ContractWizard` 从已确认**补充报价**生成合同时：`kind: 'supplement'`、`parentContractId = 该线索当前主合同 id`、`sourceQuoteId = 补充报价 id`。主合同判定：该线索下 `kind === 'main'` 且非作废的最新合同。

### 3.5 ProjectDetail360 改造

- 「补充合同」卡片（:449）数据源从 `mainContract.supplementaryAgreements` 改为上述 `kind === 'supplement'` 过滤列表；空态文案不变。
- 金额口径随 §3.2（360 首帧/刷新分叉是 B5 洞 A 范畴，不在本设计内）。

### 3.6 数据处理

- **α mock**：`mockData.ts` 删除全部 `supplementaryAgreements` 种子；新增 1-2 条 `kind: 'supplement'` 补充合同种子（挂 lead-9 华信链路，供验证与回归）。
- **β D1**：`contracts` 表 data 列为整条 JSON；旧数据里的 `supplementaryAgreements` 字段读取侧已随类型删除自然忽略，**不写迁移**（原型阶段数据可弃）；若线上已有补充协议存量，先在发布说明中标注「补充协议数据不再展示，请走补充报价链路补录」。

### 3.7 文档

- `docs/SYSTEM-OVERVIEW.md`：删 §270 整节，改为指向 ADR-0008 链路一句话。
- 功能看板：`合同签约 :: 废弃补充协议对象` 状态 -> 编码时改「α 已实现」；`ContractDetail` 相关 features 描述更新。

## 4. 测试

| 用例 | 断言 |
| --- | --- |
| `effectiveAmount` | 主 + 已归档补充计入；未归档/作废补充不计；无补充 = 合同额 |
| 向导生成补充合同 | kind/parentContractId/sourceQuoteId 正确 |
| ContractDetail 渲染 | 无补充协议 UI 残留；补充合同列表出现 |
| 360 卡片 | 种子补充合同显示条数与金额 |
| 回归 | 现有合同域测试全绿（删除对象后无引用残留：`grep -r supplementaryAgreement` 为空） |

## 5. 决策记录（本设计拍板）

1. **存量直接删不保留只读兼容**：α 原型 + β 早期，补充协议无不可丢数据；保留半套对象违背 ADR-0008。
2. **`kind`/`parentContractId` 用现有 Contract 对象表达补充合同**，不新建类型：与主合同共用详情页/审批/回款，改动面最小。
3. **有效标的额 = 已归档补充合同计入**：沿用 ADR-0008 原计入规则，仅载体从补充协议换成补充合同。

## 6. 不做

- 不动 B5 洞 A/B（β 刷新、实收双写）；
- 不做旧补充协议 -> 补充合同的数据转换工具；
- 不动报价域补充报价工作台（已 α 实现）。
