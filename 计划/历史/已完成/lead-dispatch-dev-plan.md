# 线索派发工作台 dev-plan

> 2026-08-24 grill 收束（17 项决策），PRD：`文档/PRD/PRD-线索派发管理.md`；事实源：`HubX/CONTEXT.md` §线索系列 + ADR-0096。
> 纯 α 前端优先；β 接线（企微催办、登录权限）仅留 services 接缝，本计划不含 β 编码。

## 决策速查（17 项）

1. 同一 Lead 实体，不建第二套线索表（ADR-0096）
2. 客户分级收口 S/A/B/C；无 D 级、0-100 评分不落库
3. 业务线只落 `Lead.businessLine`（必填三值），不向下游铺开
4. 无效线索走「标记垃圾」，不设 D 级
5. 主体沿用系统公司主体配置（`entity` 字段）
6. 派发 SLA 只标红+告警+催办，不自动派发；数字入配置
7. 首联 = 首条跟进记录（含未接通），2h 超时 / 1h 临期，数字入配置
8. 催办 α 站内提醒 + 事件留痕；企微 β 接缝
9. 等级调整：升级免审+「新晋升」弱提示；降级走审批中心新业务类型；管理员直改只留痕
10. 待派发锁定领取；派发目标 = 销售或公海（派发到公海不算放弃，领取时起算首联）
11. 渠道词表迁数据字典（5 值英文 key：xiaohongshu/baidu/douyin/wechat/website，grill 终版）；`channelPlan` 自由文本挂 Lead
12. 成交率 = 已签单按录入月归因；只做只读卡片
13. 三视角 = RoleSwitcher + 权限过滤纯函数；「负责渠道」多选字段落用户档案
14. 退回质检：不同销售去重计数，满 3 人转管理员确认进垃圾
15. 抽屉只读 + 跳 LeadDetail360；时光轴唯一源 `leadEvents`（只增不删）
16. 路由 `/lead-dispatch` 菜单「线索派发」挂获客域；⌘K 不做
17. 销售域同步加时效监控（五池列表时效列 + LeadDetail360 派发信息/事件时光轴）

## 阶段切分

### 阶段 A：领域纯函数 + 类型（先测试后 UI）

新目录 `packages/ui/src/app/pages/lead-dispatch/`：

- `types.ts`：`LeadBusinessLine`、`DispatchTarget`、`LeadEvent`（含 kind: inbound/dispatch_to_sales/dispatch_to_pool/urge/level_change/level_audit_result/return/trash_confirm）、SLA 配置类型
- `slaCalc.ts`：`dispatchSlaState(lead, now, config)` / `firstContactSlaState(lead, now, config)`（超时/临期/正常/已首联；派发到公海按领取时刻起算）
- `dispatchRules.ts`：`canBeDispatched` / `canBeClaimed`（待派发锁领取、退回公海可领）/ `returnQualityBucket(lead)`（退回按不同销售去重、1 人/2 人放弃分桶、满 3 人待确认）
- `roleViewFilter.ts`：`filterLeadsByRoleView(leads, role, user)`（管理员全量；推广 = 负责渠道 ∪ 本人录入；录入员 = 本人当日录入）
- `cohortCalc.ts`：`admissionCohortRate(leads)`（录入月归因 × 已签单口径）
- `eventLog.ts`：`appendLeadEvent` / `buildTimeline`（只增不删）
- 对应 `__tests__/`（≥1 文件/模块）

改动 `pages/leads/types.ts`：`businessLine` / `channelPlan` / `dispatchedAt` / `dispatchTarget` / `leadEvents` 字段；`CustomerLevel` 不动。

### 阶段 B：工作台页面（录入 + 列表 + 三视角）

- 路由 `/lead-dispatch`、菜单「线索派发」（获客域）；RoleSwitcher 加三视角
- 列表页：默认「今日录入」筛选、业务线/主体/渠道/部门/等级/派发状态多维筛选、时效列（派发 + 首联两道）、告警卡（待派发超时 / 首联超时 / S-A 重点客资 / 待审核 / 质检分桶）、成交率卡片
- 录入表单（Drawer/Modal）：字段见 PRD §4；初始分配二选一（存待派发池 / 立即指派）
- 列表搜索用常规搜索框（无 ⌘K）

### 阶段 C：派发与催办动作

- 派发弹窗：选部门 -> 选销售（人员来自组织架构，不写死）或派发到公海；批量派发
- 催办：站内提醒（现有 ReminderContext）+ `leadEvents` 留痕
- services 接缝：`sendRemind` mock 实现（站内）；企微 β 预留

### 阶段 D：等级调整与质检

- 升级：直改 + 「新晋升」弱提示小标（列表时效同款 Tag）
- 降级：提审进审批中心（新增业务类型「线索等级调整」，审批配置按业务线定审核人，快照模式复用报价审批那套）
- 质检卡片：分桶列表 + 管理员垃圾确认（满 3 人退回后）
- 用户档案加「负责渠道」多选字段（组织与权限域）

### 阶段 E：销售域联动 + 穿透抽屉

- 五池列表（PublicLeads/MyLeads/AllLeads/ClosedLeads）：加「时效」列，调 `slaCalc` 同一函数
- LeadDetail360：头部派发时间 + 首联状态；动态/时光轴读 `leadEvents`
- 穿透抽屉：三节点进展 + 流转属性 + 事件时光轴（只读）+ 跳 LeadDetail360

### 横切任务：渠道词表迁数据字典

- `LeadSource` 硬编码 census（grep 全部点位）-> 数据字典种子（5 值英文 key，grill 终版决策）
- 录入表单与筛选动态读字典；`lead` 存量 source 值平移
- guard：`leadSourceDictionary.guard.test.ts` 断言无残留硬编码引用（allowlist 收缩式）

## 验证口径

- 阶段 A 全部单测绿；B-E 每阶段补对应测试
- `npm run build` 通过
- 冒烟：三视角数字对得上（录入员视角条数 = 本人今日录入）；派发到公海后销售可领；降级走审批；满 3 人退回出「待确认」

## 明确不做

见 PRD §11（移民下游、企微推送、Cohort 报表、⌘K、意向等级去留、去重清洗）。
