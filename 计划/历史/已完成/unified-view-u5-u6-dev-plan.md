# U5 + U6 开发计划：改指产品经理、客户/甲方黄灯、内部项目

> 2026-08-18 · 只规划不写码（U6 体量小，与 U5 合并一份计划）  
> 纲领计划：`计划/当前/unified-view-implementation.md` §U5、§U6（本文是其展开）  
> 事实源：ADR `0074`（管理员可改指产品经理）、`0075`（线索客户与合同甲方各自维护、对不上黄灯不回写）、`0071`（内部项目不进统一视图）；PRD `文档/PRD/PRD-线索项目合同统一视图.md` v1.1  
> 前置：无硬依赖，可与 U3/U4 并行；但「未开始」态语义依赖 U1 合入后的 spawn 流程（人工验证路径）

## 1. 现状与差距

### 1.1 改指入口零门槛、owner 与产品经理不联动（U5）

- 编辑弹窗已能改 `owner`（required）与 `productUsers`（多选）（`Projects.tsx:344-379`），保存走 `updateProjectInContext`（`Projects.tsx:203-204`）。**但编辑按钮无任何门槛**（`Projects.tsx:294-296`）：任何状态（含未确认/搁置/已完成）、任何身份都能改，且两字段手工改不联动。
- 联动语义只存在于「确认指派」弹窗：`confirmProject`（`caseUtils.ts:66-82`）才做 `owner = productUsers[0]` 同步，且仅限未确认态 + admin（`Projects.tsx:284-290`）。
- 目标：**未开始/进行中** + 管理员可改当前产品经理（ADR 0074），改指后 owner 联动、列表按当前产品经理过滤（过滤已有，见 1.2）。

### 1.2 列表过滤已就绪，但「管理员视角」无法演示

- `filterProjectsForViewer` 已是 Projects 列表唯一过滤入口（`Projects.tsx:110-116`），viewer 来自 `currentUser.ts:1-5` --**写死 `{ name: '张三', isAdmin: true }`**，无切换机制，页面上演示不了产品经理视角，权限分支只能靠单测。
- 目标补一个最小身份切换（localStorage 覆盖，同 `QuotationContext` 角色切换模式），不建登录。

### 1.3 客户域三张皮，黄灯只能做字符串对比（U5）

- 线索客户：`LeadDetailInfo.customer`（自由字符串，`leads/leadDetailProfiles.ts:3`）；「绑定客户主体」是**假动作**（`LeadDetail.tsx:432-440` 只 console.log，可选列表写死 4 条，结果不落任何字段）。
- 合同甲方：`ContractFormData.customerName` 自由文本（`contracts/types.ts:86`），向导从线索预填（`leadContextMock.ts:85` -> `ContractWizard.tsx:141-147`）后可随意改、无回溯。
- 客户库（`Customers.tsx`/`CustomerDetail.tsx`）是 mock 孤岛，与前两者无外键关联。
- 目标：线索客户 ≠ 合同甲方 -> 黄灯（ADR 0075），**不自动回写**。现状下只能做 trim 后字符串对比；客户域收口是另一个立项，本计划不做外键。

### 1.4 内部项目：判定无标识、Tab 不隐藏、成本页误报（U6）

- `Project.leadId`/`contractId` 均可空（`project-management/mockData.ts:35-36`）；`BusinessLine` 含 `'自运营'`（:3）但种子 5 个项目全是外包，**无内部项目种子、无「内部项目」概念字段**。
- 详情页「售前历程 / 合同信息 / 回款与发票」三个三视角 Tab **无条件渲染**（`ProjectDetailWorkspace.tsx:1411-1453,1629`），无线索时靠 Panel 内 Empty 兜底（`ProjectPresalesHistoryPanel.tsx:94-96`）--ADR 0071 要求内部项目**不进**三视角，应隐藏 Tab 而非显示空态。
- 成本两处都读**静态** `initialProjects` 而非 ProjectContext（`contract-cost/ProjectCostAccounting.tsx:87`、`ProjectCostPage.tsx:11-13`，顺带的接缝债）；`budgetAlert` 以合同额为分母（`:113-118`，毛利 <15% warning、<0 danger），**内部项目无合同额会被全线误报 danger**。目标：成本统计照常展示，但不做成本 vs 合同额提醒（纲领 U6）。
- 日报侧**已有**内部项目归属概念：`workAttribution.ts:29-30` external/internal-project，按 `businessLine === '外包'` 判定（:104-120）--与 U6 的「有无 leadId」是两套口径，需对齐约定（见 §6 决策 5）。

## 2. 目标行为

### U5

1. 改指：仅 `admin` 且项目状态 ∈ {未开始, 进行中} 可改当前产品经理；改后 `productUsers = [新PM]`、`owner = 新PM` 联动（复用 confirmProject 的同步语义）；未确认仍走原「确认指派」弹窗；搁置/已完成等状态编辑弹窗中 PM 字段只读。
2. 列表：按当前产品经理过滤（现状保留，回归项）。
3. 黄灯：项目详情「合同信息」Tab 中，线索客户（trim 后）≠ 合同甲方 -> `Alert type="warning"`「线索客户与合同甲方不一致，请人工核实」；一致或任一侧为空 -> 不显示；**不提供任何回写按钮**。
4. 身份：Projects 页提供 mock 身份切换（管理员张三 / 产品经理某员工），localStorage 持久化，仅影响 `filterProjectsForViewer` 与改指门槛的演示。

### U6

5. 内部项目判定：`isInternalProject(project) = !leadId && !contractId`（现状客户信息只能来自线索，leadId 空即无客户）。
6. 详情页：内部项目**不渲染**售前历程 / 合同信息 / 回款与发票三个 Tab（隐藏，不是空态）。
7. 成本：内部项目在成本页/成本 Tab 照常展示成本明细，`budgetAlert` 一律不出（豁免，不是改成 ok）；顺手把两处静态 `initialProjects` 数据源换成 ProjectContext（修接缝债，否则 Context 新建项目在成本页看不见）。
8. 日报：内部项目照常写日报（现状已支持，回归项）。
9. 种子：mock 增 1 个内部项目（`businessLine: '自运营'`、无 leadId/contractId），供人工验证与后续回归。

## 3. 新增/改动纯函数（全部落 `business-case/caseUtils.ts` 或 `project-management/utils.ts`）

| 函数 | 逻辑 |
|------|------|
| `canReassignProject(project, viewer)` | `viewer.isAdmin && ['未开始','进行中'].includes(project.status)` |
| `reassignProductManager(project, pm)` | `{ productUsers: [pm], owner: pm }`（pm 空抛错，同 confirmProject） |
| `customerPartyMismatch(leadCustomer, contractParty)` | 双侧 trim 非空且不等 -> true |
| `isInternalProject(project)` | `!leadId && !contractId` |
| `projectBudgetAlert(project, metrics)` | 内部项目 -> `'none'`（不渲染）；否则沿用现阈值 |

## 4. 文件改动清单（生产代码）

| # | 文件 | 改动 |
|---|------|------|
| 1 | `business-case/caseUtils.ts` | §3 五个纯函数 |
| 2 | `pages/Projects.tsx` | 编辑弹窗 PM 字段按 `canReassignProject` 置只读；保存路径改走 `reassignProductManager`；页头 mock 身份切换 |
| 3 | `currentUser.ts` | 支持 localStorage 覆盖 name/isAdmin（默认仍是张三 admin） |
| 4 | `pages/ProjectDetailWorkspace.tsx` | 合同信息 Tab 黄灯 Alert；内部项目隐藏三个三视角 Tab（改一个 1811 行大文件，改完跑全量回归） |
| 5 | `pages/contract-cost/ProjectCostAccounting.tsx` / `ProjectCostPage.tsx` | 数据源换 ProjectContext；`projectBudgetAlert` 豁免内部项目 |
| 6 | `pages/project-management/mockData.ts` | +内部项目种子（自运营） |
| 7 | 测试：`caseUtils.test.ts` 扩用例 | §5 |

## 5. 测试用例设计

### 5.1 改指矩阵

- admin × 未开始 / 进行中 -> 允许；admin × 未确认 / 搁置 / 验收中 / 已完成 -> 拒。
- 非 admin × 任意状态 -> 拒。
- `reassignProductManager`：PM 空抛错；改后 owner=PM、productUsers 仅含 PM（多人被收敛为单人，ADR 0074 是「当前产品经理」单数）。
- 未确认项目不走改指（走 confirmProject，回归现有用例）。

### 5.2 黄灯

- `'北京科技有限公司'` vs `' 北京科技有限公司 '` -> 不亮（trim）。
- 不等 -> 亮；任一侧空串 -> 不亮（不误报）。

### 5.3 内部项目

- `isInternalProject`：无 leadId 无 contractId -> true；有其一 -> false。
- `projectBudgetAlert`：内部项目即使毛利为负 -> 'none'；外包项目沿用 warning/danger 阈值（回归）。
- 成本明细展示不受豁免影响（豁免的只是提醒，不是数据）。

### 5.4 回归与人工

- U1 已有的 spawn/过滤/banner 用例全绿；`npm run build`。
- 人工（依赖 U1 合入后走到进行中）：① 进行中项目 admin 改 PM -> 列表换人过滤、owner 联动；② 切产品经理身份 -> 看不到未指派单；③ 改合同甲方名 -> 项目详情黄灯亮、无回写按钮；④ 内部项目种子 -> 详情无三视角 Tab、成本页无红/黄预警、可写日报。

## 6. 边界决策

1. **黄灯只做字符串对比**：不建客户外键、不动绑定客户主体假动作、不动客户库孤岛--客户域统一另立项（待办池）。
2. **不建登录**：身份切换是演示工具，默认仍是张三 admin；β 接真实用户体系时 `currentUser.ts` 是唯一替换点。
3. **豁免而非改成 ok**：`budgetAlert: 'none'` 表示「不渲染提醒」，与「健康」区分，避免把无合同额误读为利润良好。
4. **成本明细仍挂 contractId 的债不在本计划还**：内部项目成本明细天然无 contractId，展示层容错即可；明细维度迁移（contractId -> projectId）记入 β 债。
5. **两套「内部」口径约定**：项目域用 `isInternalProject`（有无 leadId/contractId），日报 `workAttribution` 沿用 `businessLine`（它管的是工作归属不是三视角）；种子保证内部项目 `businessLine='自运营'` 使两口径对同一项目结论一致。若未来出现「有线索的自运营项目」再统一。
6. **搁置项目不可改指**（ADR 0074 只拍未开始/进行中）：搁置本质是等新合同，复工后如需换人走进行中改指。
