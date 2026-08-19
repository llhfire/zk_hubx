# 差旅管理完整化 · 实现计划

> PRD：`文档/PRD/PRD-差旅管理.md`（grill 2026-08-19 收束）
> ADR：0089（差旅单必挂项目或线索）/ 0090（宿舍费用账本在宿舍模块）
> 前置：无硬依赖。与精益交付 L1-L4（报销通道出口）和运营费用阶段 A（TRAVEL 科目归集）在接缝处对接，各方先落地先定义。

## 阶段切分

### 阶段 T1：删打卡 + 类型护栏
1. 删除打卡：`PunchClock.tsx`、`/travel/punch` 路由、MainLayout 菜单项、types.ts 打卡段（`PunchRecord`/`TemporaryZone`/`PunchRule`/`PunchType`/`PunchStatus`）、travel-api 打卡函数、mock 打卡数据。
2. 修 mock-类型脱节：`mockPunchRule` 随打卡删除；`mockExpenseStandards` 重造为 `ExpenseStandard` 结构（版本 + 生效期 + 职级 × 城市等级明细）。
3. 类型护栏单测：`__tests__/travelMockTypes.test.ts` 断言 mock 结构匹配 types（防止仓库无 tsc 导致再次静默脱节）。

### 阶段 T2：核心链细则落地
1. 出差单：`projectId`/`leadId` 必选其一（表单校验 + 类型改必填语义），客户带出；状态机不变。
2. 审批流：固定骨架 + 借款金额分级（阈值入系统配置常量）；审批人从组织域角色解析。
3. 超标判定：`calcOverStandard`（交通席别差额折算 / 住宿软标准标旗 / 餐饮不入实报项），`TravelRuleEngine` 城市分级改统一城市等级。
4. 补贴：`calcSubsidy` = 城市等级标准 ×（自然日 − 出发日 − 返回日）；废弃 `calcMode`、`mealAllowance` 等字段；随薪发放月标注。
5. 借款冲抵：报销财务审批通过后按最早未结借款顺序自动冲抵，余额退补。

### 阶段 T3：跨域与出口
1. 员工/部门接组织域员工 mock；客户/项目/线索 ID 对齐真实域 mock。
2. 报销双出口函数：`emitExpenseLedgerEntry`（运营费用 TRAVEL 科目只读归集）+ `emitCostItem`（项目/线索成本流水，对齐精益交付 R3），mock 层实现 + 接口留缝。
3. 宿舍：费用台账保持唯一写入方；新增「月度汇总视图」供运营费用只读引用（不做新功能）。

### 阶段 T4：mock 充实 + 看板
1. mock 补齐：宿舍楼/床位/入住记录、多状态报销/借款样例（覆盖超标/冲抵/补贴场景）。
2. 差旅看板、财务审计看板接 travel-api 派生数据。

## 验收口径
- 打卡模块全链路移除（路由/菜单/类型/引用无残留）。
- 类型护栏单测通过；mock 全部匹配 types。
- 抽查链路：售前差旅挂线索 -> 超标住宿填原因 -> 报销财务通过 -> 自动冲抵借款 -> 补贴按驻地天数 -> 运营台账/成本流水出口函数可追。
- `npm run build` + 全部单测通过（在 `HubX/apps/prototype` 下跑）。

## 明确不做
可配置审批引擎、真实 OCR、打卡/考勤、宿舍新功能、真实后端。
