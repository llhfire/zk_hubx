# 合同回款 Kanban 看板 — 设计规格

## 概述

在合同管理模块下新增全合同回款进度看板，以 Kanban 五列布局展示所有合同的回款状态，集中呈现回款卡点，支持催款管理和回款录入。

## 一、路由与位置

- 路由：`/contracts/payments`
- 导航位置：合同管理菜单下新增「回款看板」子菜单
- 页面组件：`src/app/pages/contracts/PaymentKanban.tsx`

## 二、数据模型扩展

### 2.1 新增类型

```typescript
// 回款状态
type PaymentStatus = 'normal' | 'upcoming' | 'overdue' | 'blocked' | 'settled';

// 卡点类型
type BlockerType = 'overdue_unpaid' | 'customer_delay' | 'invoice_unpaid' | 'acceptance_stuck' | 'dispute';

// 回款记录
interface CollectionRecord {
  id: string;
  contractId: string;
  amount: number;
  date: string;
  method: string;     // 汇款/支票/线上
  note: string;
}

// 卡点事件
interface PaymentBlocker {
  id: string;
  contractId: string;
  type: BlockerType;
  title: string;
  description: string;
  amountBlocked: number;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// 催款记录
interface DunningRecord {
  id: string;
  contractId: string;
  date: string;
  method: string;     // 电话/微信/邮件/当面
  contactPerson: string;
  result: string;
  nextPlan: string;
}
```

### 2.2 Contract 扩展字段

在现有 `Contract` 接口上新增：

| 字段 | 类型 | 说明 |
|------|------|------|
| `collectionRecords` | `CollectionRecord[]` | 实际回款记录 |
| `paymentBlockers` | `PaymentBlocker[]` | 卡点列表 |
| `dunningRecords` | `DunningRecord[]` | 催款历史 |
| `paymentStatus` | `PaymentStatus` | 系统自动计算 |

### 2.3 卡点类型定义

| 类型 | 标识 | 触发场景 |
|------|------|---------|
| 逾期未付 | `overdue_unpaid` | 过付款节点未到账 |
| 客户拖延 | `customer_delay` | 已催款但客户无响应 |
| 开票未回 | `invoice_unpaid` | 发票已开款未到 |
| 验收卡住 | `acceptance_stuck` | 项目未验收无法触发付款 |
| 合同纠纷 | `dispute` | 有争议暂停付款 |

## 三、组件架构

```
PaymentKanban
├── KanbanSummaryBar        ← 7 个摘要指标
├── KanbanFilterBar         ← 筛选条件
├── KanbanBoard             ← 五列容器，支持拖拽
│   └── KanbanColumn × 5
│       └── ContractCard × N
└── KanbanSideDrawer        ← 侧边抽屉
    ├── PaymentTimeline     ← Tab 1
    ├── ContractTextViewer  ← Tab 2
    └── BlockerDunningPanel ← Tab 3
```

## 四、Kanban 列归类规则

系统根据以下规则自动计算 `paymentStatus`，优先级从高到低：

| 优先级 | 列 | 判断条件 |
|--------|---|---------|
| 1 | 卡点阻塞 | 存在未解决的 `PaymentBlocker` |
| 2 | 已结清 | `receivedAmount ≥ totalAmount` |
| 3 | 已逾期 | 存在逾期付款节点（当前 > 预计日期+7天）且无卡点 |
| 4 | 即将到期 | 下个付款节点在未来 7 天内 |
| 5 | 正常回款 | 以上均不满足 |

- 逾期缓冲期为 7 天（预计日期后 7 天内不计为逾期）
- `receivedAmount` = Σ `collectionRecords.amount`

## 五、摘要栏

7 个指标卡片横向排列：

| 指标 | 计算方式 |
|------|---------|
| 总合同数 | `contracts.length` |
| 总应收金额 | Σ `totalAmount` |
| 本月已回款 | Σ `collectionRecords` 本月到账 |
| 逾期金额 | Σ 逾期节点的 `amount - 已回` |
| 卡点合同数 | 有未解决 `PaymentBlocker` 的合同数 |
| 卡点总金额 | Σ 卡点合同的 `amountBlocked` |
| 预计本月回款 | Σ 付款节点在本月内的 `amount` |

## 六、合同卡片

### 6.1 展示信息（10 项）

1. 合同编号 + 客户名（标题行）
2. 回款进度条（百分比 + 色条）
3. 已回/总额 + 百分比数字
4. 下期应付金额 + 日期
5. 卡点标签（仅卡点列显示：类型 + 持续天数）
6. 最近催款时间 + 方式
7. 负责人（头像或姓名）

### 6.2 颜色标识

- 正常：蓝色左边框 + 蓝色进度条
- 即将到期：橙色左边框
- 已逾期：红色左边框
- 卡点阻塞：深红色左边框 + 红色卡点标签
- 已结清：绿色左边框 + 绿色进度条

## 七、侧边抽屉详情面板

宽度 400px，三 Tab 结构。

### Tab 1：回款时间线

垂直时间轴，展示：
- 合同签约时间点
- 每个付款节点（空心圆=未付，实心圆=已付）
  - 已付节点下方显示实际到账记录
  - 逾期节点显示逾期天数
  - 关联卡点的节点显示卡点标签
- 未来付款节点（虚线连接）

### Tab 2：合同文本

复用现有 `ContractWizard` 的模板渲染器，展示合同正文 HTML。

### Tab 3：卡点管理 + 催款记录

- 卡点列表：类型/标题/卡住金额/状态（未解决/已解决）/操作（解决按钮）
- 添加卡点按钮：类型选择 → 标题 → 描述 → 卡住金额
- 分割线
- 催款记录时间轴：日期/方式/联系人/结果/下一步
- 添加催款按钮：日期 → 方式 → 联系人 → 结果 → 下一步计划

### 快捷操作按钮

抽屉底栏固定：
- 标记催款
- 解决卡点
- 录入回款

## 八、筛选栏

支持组合筛选：
- 负责人（Select，多选）
- 客户名称（Input，模糊搜索）
- 日期范围（RangePicker，按付款节点日期筛选）
- 卡点类型（Select，多选，仅卡点列有效）

## 九、拖拽交互

- 支持拖动卡片到不同列，自动更新对应状态
- 拖到卡点列时弹出添加卡点弹窗
- 拖到已结清列时自动校验是否已全额回款
- 拖拽使用 `react-dnd`（项目已有依赖）

## 十、依赖

- `ContractsContext`：读取合同数据，新增回款/卡点/催款操作方法
- 现有合同模板渲染器：`src/app/pages/contracts/templates/`
- `react-dnd`：拖拽（项目已安装）
- Arco Design：Drawer、Card、Select、DatePicker、Timeline 组件

## 十一、路由更新

```typescript
// routes.tsx 新增
{ path: "contracts/payments", Component: PaymentKanban }
```

## 十二、术语

| 术语 | 英文 | 定义 |
|------|------|------|
| 回款 | Collection/Payment Received | 客户实际支付的款项 |
| 付款节点 | Payment Milestone | 合同中约定的分期付款时间点 |
| 卡点 | Payment Blocker | 阻碍回款的问题或障碍 |
| 催款 | Dunning | 向客户催促付款的行为 |
| 逾期 | Overdue | 超过付款节点约定日期仍未到账 |
| 已结清 | Settled | 全部合同款项已到账 |
