# 线索派发工作台 UI 详细设计 PLAN.md

> Grill 收束：2026-08-25，22 项决策。原型：`docs/prototype/ZKHubX-线索派后管理.html`
> 事实源：`HubX/CONTEXT.md` §线索系列 + ADR-0096 + `文档/PRD/PRD-线索派发管理.md`
> 阶段 A 已完成（纯函数层 6 模块 + 34 测试）。本文锁定阶段 B-D UI 规格。

## 22 项决策速查

1. **业务线枚举**：`software_outsource` / `immigration` / `operation`（对齐原型 + CONTEXT.md）
2. **录入表单 9 字段**：业务线/客户名/联系人/手机号/来源渠道/渠道计划/主体/客户等级/初始分配
3. **列表 14 列**：checkbox/业务线/客户信息/主体渠道/等级/入库派发时间/时效/承接销售/跟进状态/操作
4. **告警卡 5 类**：入库派发量/待派发超时/首联超时/等级审核/质检分桶 + Cohort 成交率
5. **客户等级**：S/A/B/C，无 D 级，无效线索走垃圾
6. **意向评分**：不落库，从原型删除
7. **渠道**：英文 key（xiaohongshu/baidu/douyin/wechat/website），数据字典维护
8. **公司主体**：沿用现有全称，UI 可选简称展示
9. **销售列表**：从 EmployeeContext 动态读取，不写死
10. **催办**：α 站内提醒 + 事件留痕，按钮文案不提企微
11. **穿透抽屉**：底部加「查看完整详情 →」跳 LeadDetail360
12. **角色值**：admin / promoter / recorder
13. **业务域切换**：不在本次实现
14. **筛选器**：8 个全部实现（关键词/主体/渠道/部门/等级/业务线/时间/排序）
15. **侧边栏**：去掉，改用 KPI 卡片（可点击筛选）+ 快捷分类 Tab
16. **快捷分类 Tab**：6 个（全部/待派发/首联超时/S-A重点/等级审核/质检分桶）
17. **时间范围**：recorder 强制今日，admin/promoter 默认今日可切换
18. **行高亮优先级**：红（首联超时）> 橙（派发超期）> 琥珀（待审核）
19. **批量派发**：先勾选行 → 再点按钮 → 弹窗选统一目标
20. **本次范围**：阶段 0 + B-D，阶段 E（销售域联动）后续单独排
21. **渠道迁移**：阶段 0 先做，再做阶段 B
22. **初始分配**：存待派发池 / 立即指派（二选一）

## 阶段切分

### 阶段 0：渠道词表迁数据字典

- 新建 `pages/lead-dispatch/channelDictionary.ts`：5 值字典种子
- 改 `LeadSource` 类型为英文 key
- grep 所有引用点平移存量数据
- `leadSourceDictionary.guard.test.ts` 断言无残留硬编码

### 阶段 B：工作台页面

**页面结构**（无侧边栏）：
```
┌─────────────────────────────────────────────────┐
│  页头：标题 + 视角切换器 + 新建线索按钮            │
├─────────────────────────────────────────────────┤
│  KPI 卡片行（5 卡片，可点击筛选）                  │
├─────────────────────────────────────────────────┤
│  快捷分类 Tab（6 个，角色可见性控制）              │
├─────────────────────────────────────────────────┤
│  业务线 Tab + 时间范围 + 排序                     │
├─────────────────────────────────────────────────┤
│  筛选栏（关键词/主体/渠道/部门/等级 + 批量派发）   │
├─────────────────────────────────────────────────┤
│  列表表格（14 列 + 分页）                         │
└─────────────────────────────────────────────────┘
```

**新建文件**：
- `pages/lead-dispatch/LeadDispatchPage.tsx` — 页面壳
- `pages/lead-dispatch/components/KpiCards.tsx` — 5 个告警卡片
- `pages/lead-dispatch/components/CategoryTabs.tsx` — 快捷分类 Tab
- `pages/lead-dispatch/components/FilterBar.tsx` — 筛选栏
- `pages/lead-dispatch/components/LeadTable.tsx` — 列表表格
- `pages/lead-dispatch/components/CreateLeadModal.tsx` — 录入表单
- `pages/lead-dispatch/LeadDispatchContext.tsx` — Context Provider

**录入表单字段**（9 字段）：

| 字段 | 类型 | 必填 | 选项 |
|---|---|---|---|
| 业务线 | Select | ✅ | software_outsource / immigration / operation |
| 客户名称 | Input | ✅ | |
| 联系人 | Input | ✅ | |
| 手机号 | Input | ✅ | |
| 来源渠道 | Select | ✅ | 数据字典 5 值 |
| 渠道计划 | Input | ❌ | 自由文本 |
| 主体 | Select | ✅ | 现有 CompanyEntity |
| 客户等级 | Select | ❌ | S/A/B/C |
| 初始分配 | Radio | ✅ | 存待派发池 / 立即指派 |

**列表列**（14 列）：对齐原型，时效列调 `slaCalc` 纯函数。

### 阶段 C：派发与催办动作

- `components/DispatchModal.tsx`：选部门→选销售（EmployeeContext）或公海
- 催办：调 ReminderContext + appendLeadEvent
- 批量派发：checkbox 勾选 → 统一目标

### 阶段 D：等级调整与质检

- `components/LevelAdjustModal.tsx`：升级免审 / 降级走审批
- 质检卡片：returnQualityBucket 分桶 + 管理员确认

## 验证口径

- 阶段 0：guard test 确认无残留硬编码
- 阶段 B-D：每阶段补测试
- `npm run build` 通过
- 冒烟：三视角数字对得上；派发到公海后可领；降级走审批；满 3 人退回出待确认
