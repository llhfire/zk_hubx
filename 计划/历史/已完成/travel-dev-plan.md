# 差旅管理完整化 · 实现计划（文件级）

> 2026-08-19 · 对照代码展开，T1–T4 已全部编码完成（32 新单测全绿）
> PRD：`文档/PRD/PRD-差旅管理.md`（grill 收束）
> ADR：0089（差旅单必挂项目或线索）/ 0090（宿舍费用账本在宿舍模块）
> 前置：无硬依赖。报销双出口由本线 T3 定义签名；精益 L2 / 运营费用 B 后接（见 `计划/当前/README.md` 接缝表）。
> 代码现状：`pages/travel/`，travel-api 已有，零单测。

---

## 1. 现状与差距

| 点 | 现状 | 目标 |
|---|---|---|
| 打卡 | 整页 + 路由 + 菜单 + types + api + mock + **SubsidyTab 内联 7 天假考勤** | 全删，无残留 |
| `mockPunchRule` | `{ type, lateMinutes, locations }`，对不上 `PunchRule` | 随打卡删 |
| `mockExpenseStandards` | `{ city, hotelStandard, mealStandard }`，还有非法 `cityLevel:'new_first'` | 重造为 `ExpenseStandard`（版本+生效期+职级×城市等级） |
| 城市分级 4 套 | types: `first_tier/second_tier/third_tier/other`；mock: `new_first`；RuleEngine: `first/new_first/second/third`；ComplianceGuide: 「一线/新一线」 | **只留 types 的 4 档** |
| 补贴 | trip-1：7 天×150=1050；`calculateSubsidy` 用 `trip.days` | 自然日−出发−返回；trip-1 → 5×150=750；trip-2（4/26–4/27）→ 0 |
| 关联对象 | `Trip.projectId?`，无 `leadId`；表单只选客户/项目 | 项目或线索必选其一，客户带出 |
| 审批 | 写死王经理/陈财务 | 固定骨架 + 借款金额分级；人从组织角色解析 |
| 超标 | RuleEngine 自有城市表；报销 mock 含餐费 640 | `calcOverStandard`；餐费不进实报 |
| 冲抵 | reimb-1 手写 offset 3000，借款 remaining 仍 3000，自相矛盾 | 财务通过后按最早未结自动冲抵 |
| 双出口 | 无 | T3 纯函数，mock 层调用 |
| 宿舍 | `mockDormitories=[]` | T4 充实；费用账本不搬家 |
| 旧入口 | `/businesstrip`、`/reimbursement` + 财务菜单两项 + 提醒 mock 路由 | T1 重定向到 `/travel/trips`、`/travel/reimbursements` |
| 员工 ID | `emp-001` | T3 改档案 `'1'` |

---

## 2. 阶段 T1：删打卡 + 类型护栏 + 旧入口

打卡必须 grep 清零：`Punch` / `punch` / `TemporaryZone` / `打卡`。

| # | 文件 | 改动 |
|---|---|---|
| 1 | `pages/travel/punch/`（含 `PunchClock.tsx`） | 整目录删除 |
| 2 | `routes.tsx` | 删 PunchClock import 与 `travel/punch`；`businesstrip` / `reimbursement` 改为 `<Navigate to="/travel/trips" replace />` / `"/travel/reimbursements"` |
| 3 | `components/MainLayout.tsx` | 删差旅下「打卡管理」；删财务管理下「出差申请」「报销申请」（差旅一级菜单已有） |
| 4 | `pages/travel/types.ts` | 删 `PunchType/PunchStatus/PunchRecord/TemporaryZone/PunchRule/PunchRecordListParams` |
| 5 | `pages/travel/travel-api.ts` | 删 punch/getPunchRecords/getPunchRule/updatePunchRule/createTemporaryZone/deleteTemporaryZone 及对应 import |
| 6 | `pages/travel/mock-data.ts` | 删 `mockPunchRecords`/`mockPunchRule`；重造 `mockExpenseStandards`（见下） |
| 7 | `trip/TripDetail/SubsidyTab.tsx` | **删**顶部内联 `mockPunchRecords` 及考勤 UI（最容易漏） |
| 8 | `reminders/mockData.ts` | `route: '/businesstrip'` / `'/reimbursement'` 改新路径，避免铃铛进死页 |
| 9 | `components/TravelRuleEngine.tsx` + `ComplianceGuide.tsx` | `CITY_TIERS` 改为 `CityLevel`；废除 `new_first` / 「新一线」 |
| 10 | `__tests__/travelMockTypes.test.ts` | **新建**。mock 赋给 types；`details.length >= 1`；源码不得出现 `PunchRecord`、`/travel/punch`、`new_first` |

T1 **暂留** `BusinessTripList.tsx` / `ReimbursementList.tsx` 文件但不再挂路由；T4 再删文件。

费用标准 mock（必须可赋给 `ExpenseStandard[]`）：

```
一条 active 标准 std-2026，effectiveDate=2026-01-01
details:
  L1-L3 × first_tier：hotelLimit 500，高铁 second，飞机 economy，subsidyAmount 150
  L4-L6 × first_tier：hotelLimit 400，subsidyAmount 120
  二线/三线/其他：hotel 递减，补贴 100/80/60
废弃字段仍留在 StandardDetail 类型上但 mock 填 0：
  mealAllowance / communicationAllowance / miscellaneousAllowance / subsidyCalcMode
T2 再从类型里删这些字段
```

城市分级锁（T1 改常量，T2 接判定）：

- 北上广深 = `first_tier`
- 省会及杭州、成都 = `second_tier`（废除新一线；若业务要坚持杭州按一线，只改此表）
- 其余已知 = `third_tier`
- 未知 = `other`

T1 **还不动**补贴公式（trip-1 的 1050 留给 T2）。T1 结束：页面能开、打卡入口消失、`/businesstrip` 落到出差列表。

---

## 3. 阶段 T2：核心链细则

| # | 文件 | 改动 |
|---|---|---|
| 1 | `pages/travel/travelCalc.ts` | **新建**纯函数，见下 |
| 2 | `pages/travel/travelConfig.ts` | **新建**。`LOAN_FINANCE_THRESHOLD = 5000`（α 可改，不进系统配置页） |
| 3 | `types.ts` | `Trip` 增 `leadId?`/`leadName?`（与 `projectId` 互斥必填）；`TravelSubsidy` 删 `calcMode/workingDays/overtimeDays`；可删 `SubsidyCalcMode`；生成报销时过滤 meal |
| 4 | `travel-api.ts` | `calculateSubsidy` 改调 `calcSubsidyDays`；财务节点 `approveReimbursement` 调 `offsetLoans` + 剔餐费 |
| 5 | `trip/TripForm.tsx` | Radio「项目 / 线索」+ 下拉（项目 `initialProjects`，线索 `leadContextMock` 或项目域 lead）；选中带出客户；提交前 `assertTripBinding` |
| 6 | 审批人解析 | 从 `employee/mockData.ts` 找申请人部门主管（position 含「经理」或部门第一人）+ 财务部 `position==='财务'`；找不到兜底「王经理/陈财务」。出差单固定两级：主管→财务；借款走 `loanApprovalChain` |
| 7 | `mock-data.ts` | trip-1 subsidy 750；trip-2 subsidy 0；reimb-1 去掉 meal，金额重算；借款 remaining 与冲抵在「财务通过」样例上自洽；新增 1 条售前差旅挂 `lead-1` |
| 8 | `__tests__/travelCalc.test.ts` | **新建**。夹具见 §6 |

`travelCalc.ts`：

| 函数 | 规则 |
|---|---|
| `assertTripBinding(trip)` | `projectId` 与 `leadId` 恰好一个非空 |
| `calcSubsidyDays(start, end)` | 自然日数 − 2，最小 0（出发=返回 → 0） |
| `calcSubsidy(days, cityLevel, standard)` | days × 该城等级 `subsidyAmount`；单一包干 |
| `calcOverStandard(expense, segment, standard)` | 交通：席别高于标准 → 差额自付（硬）；住宿：单价&gt;hotelLimit → 软标旗，须 `overStandardReason`；餐饮：不进实报（调用方过滤） |
| `offsetLoans(reimb, loans)` | 财务通过后，按借款 `createDate` 升序冲未结（status `paid`/`offset` 且 remaining&gt;0）；返回更新后的 loans + reimb.netAmount |
| `loanApprovalChain(amount)` | ≤阈值仅部门主管终审；&gt;阈值 主管→财务 |

---

## 4. 阶段 T3：跨域与出口

| # | 文件 | 改动 |
|---|---|---|
| 1 | `pages/travel/expenseExits.ts` | **新建**。签名见下。α 推进模块级数组 `emittedLedger[]` / `emittedCostItems[]`（不写运营费用 Context，避免依赖阶段 A 是否已合并） |
| 2 | `travel-api.ts` `approveReimbursement` 财务通过 | 调双出口 |
| 3 | mock 员工/客户/项目 ID | 张三改 `'1'`，项目改 `'1'`，客户名能跟项目/合同域对齐就对齐 |
| 4 | 宿舍月汇总 | `getDormitoryMonthlySummary(month)`：Σ 该月 `DormitoryExpense`+`UtilityPayment`；运营费用 B 再引用。T3 可先函数+单测，数据 T4 填 |

出口签名：

```
emitExpenseLedgerEntry(reimb, trip): {
  source:'travel', sourceRefId, categoryPrimary:'TRAVEL',
  amount, month,
  attribution: trip.projectId ? 'project' : 'lead_channel',
  projectId?, leadId?
}  // 禁止 attribution='pool'

emitCostItem(reimb, trip): {
  sourceType:'reimbursement', sourceId: reimb.id,
  costCategory:'commercial', costType:'差旅',
  amount, date, status:'actual',
  caseBinding: { projectId?, leadId? }
}
```

α 单测断言调用后数组增长。精益 L3 若已合并可选择读 `emittedCostItems`；**不强制同 PR 接通**。

---

## 5. 阶段 T4：mock 充实 + 看板

| # | 文件 | 改动 |
|---|---|---|
| 1 | `mock-data.ts` | 宿舍：1 栋 2 层 4 房、2 条入住（长期+出差）、租金/水电各 1 条（唯一写入方）。报销/借款覆盖 draft/pending/finance_approved/超标住宿/已冲抵 |
| 2 | `dashboard/TravelDashboard.tsx` + `components/FinanceAuditDashboard.tsx` | 统计改走 travel-api 派生，删 `tripCount:12` 等写死数 |
| 3 | `pages/BusinessTripList.tsx`、`pages/ReimbursementList.tsx` | T1 已断路由，本阶段物理删除 |
| 4 | OCR | 演示件保留，看板 planned 不动 |

---

## 6. 单测夹具

工作目录：`HubX/apps/prototype`。

### 6.1 `travelMockTypes.test.ts`（T1）

- `mockTrips` / `mockReimbursements` / `mockLoans` / `mockExpenseStandards` / `mockDormitories` 可赋给对应类型
- `mockExpenseStandards[0].details.length >= 1`
- `pages/travel` 源码不得出现 `PunchRecord`、`/travel/punch`、`new_first`

### 6.2 `travelCalc.test.ts`（T2）

| 夹具 | 期望 |
|---|---|
| 2026-04-28 ~ 05-04 | days=5，×150=750 |
| 2026-04-26 ~ 04-27 | days=0 |
| 同日往返 | 0 |
| 无 project 无 lead | assert 失败 |
| 两者都有 | 失败 |
| 高铁一等 vs 标准二等 | 硬超标，差额&gt;0 |
| 住宿 800 vs limit 500 | 软标旗；无原因则校验失败 |
| 借款 3000 早、2000 晚，报销 3526 财务通过 | 先冲 3000，再冲 526，净额 0；第二笔 remaining=1474 |
| 借款 4000 | 链长 1；借款 6000 | 链长 2 |

### 6.3 出口（T3）

- 财务通过后 `emittedLedger` 增长；`attribution !== 'pool'`
- 挂线索的单 `attribution === 'lead_channel'`

---

## 7. 验收口径

- `rg PunchRecord packages/ui/src/app/pages/travel` 无命中；菜单无打卡；`/travel/punch` 无路由。
- `/businesstrip` 落到出差列表。
- 类型护栏 + `travelCalc` 单测通过；mock 全部匹配 types。
- 抽查链路：售前差旅挂线索 → 超标住宿填原因 → 报销财务通过 → 自动冲抵借款 → 补贴按驻地天数（trip-1 = 750）→ `emittedLedger` 的 attribution ≠ pool。
- `npm run build` + 全部单测通过（在 `HubX/apps/prototype` 下跑）。

---

## 8. 明确不做

可配置审批引擎、真实 OCR、打卡/考勤、宿舍新功能（只充实 mock + 月汇总）、真实后端、多币种、运营费用 B 真接投影。
