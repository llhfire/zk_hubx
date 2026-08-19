# 合同回款看板与甘特图 · 开发计划（文件级）

> 2026-08-19 · grill 后展开
> 研究文档：`research/合同回款看板与甘特图.md`
> 事实源：`HubX/CONTEXT.md` + `HubX/docs/adr/`
> 本次开工范围：**全部阶段 P1–P5**

---

## 1. 现状与差距

| 点 | 现状 | 目标 |
|---|---|---|
| 看板 | `PaymentKanbanV2.tsx` 515 行，按里程碑展（一期一卡） | 按合同聚合（一合同一卡） |
| 回款预测 | `forecast/PaymentForecast.tsx` 存在 | 现金流预测面板 + 甘特图 + 交付联动 |
| 侧边抽屉 | 无 | 720px 抽屉 3 Tab（时间线/卡点催款/合同快照） |
| 卡点 | `PaymentBlocker` 类型已有，mock 1 份 | 全五态覆盖 + 弹窗交互 |
| 催款 | `DunningRecord` 类型已有，mock 1 份 | 独立模块 + 弹窗 |
| 确定性分级 | 无 | `ForecastCertaintyLevel` 独立字段 |
| 甘特图 | 无 | `gantt-task-react` + 交付联动 |
| 权限 | 无 | 常量模拟 4 角色 |
| 导出 | 无 | 占位按钮 |

---

## 2. 阶段 P1：纯函数 + 类型（无 UI）

| # | 文件 | 改动 |
|---|---|---|
| 1 | `pages/contracts/payment/types.ts` | **新建**。`ForecastCertaintyLevel` / `ForecastNode` / `CashflowMetric` / 看板五态派生接口 |
| 2 | `pages/contracts/payment/paymentCalc.ts` | **新建**。纯函数层 |
| 3 | `pages/contracts/payment/__tests__/paymentCalc.test.ts` | **新建**。单测 |
| 4 | `pages/contracts/types.ts` | 追加 `ForecastCertaintyLevel` / `ForecastOverride` |

`paymentCalc.ts` 导出：

| 函数 | 入参 | 出参 |
|---|---|---|
| `derivePaymentStatus(contract)` | contract + today | `PaymentStatus`（blocked > overdue > upcoming > normal > settled） |
| `deriveCertaintyLevel(contract, projectDelayDays)` | contract + 交付延期天数 | `ForecastCertaintyLevel` |
| `aggregateCashflow(contracts, months)` | 合同列表 + 月份范围 | `CashflowMetric[]`（按月按确定性分级聚合） |
| `buildGanttNodes(contracts)` | 合同列表 | `ForecastNode[]`（甘特图数据） |
| `deriveNextPayPeriod(contract)` | contract | 当前待付期次 + 金额 + 日期 |
| `deriveCollectionProgress(contract)` | contract | `{ received, total, percentage, remaining }` |

### 看板五态派生规则

```
settled  = Σ receivedAmount ≥ totalAmount
blocked  = 存在 paymentBlockers 中 resolvedAt == null（最高优先级）
overdue  = today > 当前待付期次 expectedDate，且未结清且无卡点
upcoming = 当前待付期次 expectedDate − today ≤ 7 天，且未逾期
normal   = 当前待付期次距今 > 7 天
```

### 确定性分级

```
high     = 已开票待打款 / 里程碑已验收签字
medium   = 项目正常推进，工期偏差 ≤3 天
low      = 交付延期 >7 天 / 客户轻度拖延
blocked  = 存在未解决的合同纠纷或严重卡点
```

---

## 3. 阶段 P2：看板 UI

| # | 文件 | 改动 |
|---|---|---|
| 1 | `pages/contracts/payment/PaymentDashboard.tsx` | **新建**。KPI 摘要栏 + 五列看板 + 筛选 |
| 2 | `pages/contracts/payment/ContractPaymentCard.tsx` | **新建**。合同卡片（10 维信息） |
| 3 | `pages/contracts/payment/RecordCollectionModal.tsx` | **新建**。录入回款弹窗 |
| 4 | `pages/contracts/payment/BlockerModal.tsx` | **新建**。标记/解决卡点弹窗 |
| 5 | `pages/contracts/payment/paymentMock.ts` | **新建**。扩展 mock 数据 |
| 6 | `pages/contracts/mockData.ts` | 补充五态合同 mock |

### 合同卡片 10 维

1. 合同编号 + 标题
2. 客户名称
3. 合同总金额
4. 回款进度条（received / total + 百分比）
5. 当前待付期次 + 金额
6. 到期倒计时 / 逾期天数
7. 卡点标签 + 受阻天数（仅卡点列）
8. 商务负责人 + PM
9. 最近催款时间 + 方式
10. 快捷操作（录入回款 / 上报卡点 / 打开抽屉）

### KPI 摘要栏 7 大指标

1. 总合同数
2. 总应收金额
3. 本月已回款
4. 预计本月待收
5. 即将到期金额
6. 逾期总金额
7. 卡点阻塞总额

---

## 4. 阶段 P3：侧边抽屉

| # | 文件 | 改动 |
|---|---|---|
| 1 | `pages/contracts/payment/PaymentDrawer.tsx` | **新建**。720px 抽屉壳 + 基本信息 + 快捷按钮 |
| 2 | `pages/contracts/payment/PaymentTimelineTab.tsx` | **新建**。Tab 1：回款时间线（期次 + 状态 + 交付关联） |
| 3 | `pages/contracts/payment/BlockerDunningTab.tsx` | **新建**。Tab 2：活跃卡点列表 + 催款流水 |
| 4 | `pages/contracts/payment/ContractSnapshotTab.tsx` | **新建**。Tab 3：合同正文预览 |
| 5 | `pages/contracts/payment/DunningModal.tsx` | **新建**。记录催款弹窗 |

### 侧边抽屉结构

```
+------------------------------------------------------------------------+
| 合同回款详情 - CT20260408 某智慧物流调度系统                       [ X ] |
+------------------------------------------------------------------------+
| [基本信息] 客户: XX物流 | 总额: ¥600,000 | 已回: ¥300,000 | 商务: 张三   |
| 快捷按钮: [ + 记录催款 ] [ ⚠️ 上报/编辑卡点 ] [ 💰 录入到账 ] [ 查看项目 ] |
+------------------------------------------------------------------------+
| 标签页: [ 1. 回款与交付时间线 ] [ 2. 卡点与催款记录 ] [ 3. 合同正文快照 ]  |
+------------------------------------------------------------------------+
```

---

## 5. 阶段 P4：甘特图 + 预测

| # | 文件 | 改动 |
|---|---|---|
| 1 | 安装 `gantt-task-react` | `npm install gantt-task-react` |
| 2 | `pages/contracts/payment/PaymentGantt.tsx` | **新建**。甘特图（展开/折叠、拖拽调期、交付联动虚线） |
| 3 | `pages/contracts/payment/CashflowForecast.tsx` | **新建**。现金流预测面板（确定性分级堆叠柱状图） |
| 4 | `pages/contracts/payment/ForecastDetailTable.tsx` | **新建**。单合同预测明细表 |

### 甘特图交互

- 合同行可展开/折叠各期次
- 期次节点显示在时间轴上，颜色区分确定性等级
- 已结清节点实色，待收节点空心，卡点节点红色标记
- 拖拽节点修改 `forecastDate`，弹窗补填调期原因
- 交付联动：读取项目 SOP 进度，延期时节点虚线后移

### 现金流预测面板

- 周期选择：3 / 6 / 12 个月
- 堆叠柱状图：高确信(100%) / 正常履约(80%) / 风险受阻(40%) / 卡点停滞(0%)
- 每月显示：预测总额 / 实收总额

---

## 6. 阶段 P5：路由 + 菜单 + 占位

| # | 文件 | 改动 |
|---|---|---|
| 1 | `routes.tsx` | `/contracts/payments` → PaymentDashboard；`/contracts/forecast` → 预测页 |
| 2 | `components/MainLayout.tsx` | 合同菜单加「回款看板」「回款预测」 |
| 3 | 权限常量 | `PAYMENT_ROLES = { sales, pm, finance, management }` |
| 4 | 导出按钮 | 占位，onClick 提示「α 版暂不支持」 |

---

## 7. 单测夹具（P1 必过）

| 夹具 | 期望 |
|---|---|
| 合同全额到账 | `paymentStatus = settled` |
| 有未解决卡点 | `paymentStatus = blocked`（最高优先级） |
| 逾期未结清无卡点 | `paymentStatus = overdue` |
| 7 天内到期 | `paymentStatus = upcoming` |
| 正常履约期 | `paymentStatus = normal` |
| 里程碑已验收 | `certaintyLevel = high` |
| 交付延期 >7 天 | `certaintyLevel = low` |
| 有未解决卡点 | `certaintyLevel = blocked` |
| 多合同多月聚合 | `aggregateCashflow` 按月按确定性分级求和 |
| 拖拽调期后 | `forecastDate` 更新，记录 `ForecastOverride` |

---

## 8. 验收清单

- [ ] `/contracts/payments` 可开，按合同聚合五列看板
- [ ] 合同卡片显示 10 维信息
- [ ] KPI 摘要栏 7 大指标实时计算
- [ ] 侧边抽屉 3 Tab 可切换
- [ ] 录入回款后进度条实时更新，全额到账自动流转「已结清」
- [ ] 标记/解决卡点后看板列实时变化
- [ ] 催款记录可录入、可查看
- [ ] `/contracts/forecast` 甘特图可展开/折叠各期次
- [ ] 甘特图拖拽调期可修改预测日
- [ ] 现金流预测面板按确定性分级堆叠
- [ ] 权限常量可切换角色，销售只看个人名下
- [ ] `npx vitest run packages/ui/src/app/pages/contracts/payment/__tests__` 全绿
- [ ] `npm run build` 通过

---

## 9. 明确不做

导出 Excel/PDF（占位）、权限矩阵真实实现、发票状态关联、客户信用画像、多币种、完工百分比收入确认。
