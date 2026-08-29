# β 版真实数据计划：MySQL 迁移 + 服务接线 + 页面切换

> 2026-08-26 落稿（补记阶段 0-1，2026-08-25 已完成）
> 事实源：ADR-0094（doc-store + 乐观锁 + 服务端时钟）、ADR-0096（派发域）；范式基准同 `beta-foundation-dev-plan.md`（B0-B4 已完成，本计划是 B5 收口前的真实数据主线）。
> 业务规则不新增，无需新 PRD。

## 0. 背景

β 前端已注入 6 个 http 服务（报价/合同/线索/项目/回款/员工），但 D1 里只有演示种子；
真实业务数据（MySQL zkoadata）未迁移，派发域动作仍是「通用 PUT + 客户端手写事件」，
详情页对迁移线索会「不存在」。本计划分 5 个阶段把 β 切到真实数据。

## 1. 阶段划分

| 阶段 | 内容 | 状态 |
|---|---|---|
| 0 | MySQL -> D1 数据迁移（脚本 + seed SQL） | ✅ 2026-08-25 完成 |
| 1 | 前端服务层接线（employeeService + employees 表 + GET /api/employees） | ✅ 2026-08-25 完成 |
| 2 | 后端 API 补全：详情复合接口 + 派发域专门端点 + 服务方法接线 | ✅ 2026-08-26 完成 |
| 3 | β 前端页面切换（详情页等所有页面用服务数据渲染） | 待开工 |
| 4 | 部署与验证（D1 迁移执行 + Workers/Pages 部署 + 看板翻牌） | 待开工 |

## 2. 阶段 2 明细（2026-08-26）

**纯函数下沉**（`packages/ui/src/services/leadMutations.ts`，Workers 经 esbuild 单源导入）：
- `buildLeadDetailInfo`：列表字段 -> 详情组装（mock 兜底 / 服务端 detail 接口共用）
- `applyDispatchLead / applyUrge / applyLevelChange / applyQualityConfirm`：派发四动作
- `isLevelUpgrade`：S>A>B>C 序，升级免审/降级走审批

**Workers 新端点**（`apps/api/src/index.ts`；事件 id/时间服务端生成，actor 取 X-Actor，单请求原子写 doc）：
- `GET /api/leads/:id/detail` -> `{ detail, events, version }`
- `GET /api/projects/:id/detail` -> `{ project, contracts, collections, activities }`（合同按 contractId/leadId 双路匹配）
- `POST /api/leads/:id/dispatch`（target=sales 需 assignee；写流转记录）
- `POST /api/leads/:id/urge` / `POST /api/leads/:id/level-change` / `POST /api/leads/:id/level-audit`
- `GET /api/leads/:id/events`

**服务层**：`LeadService` 加 `dispatchLead/urgeLead/adjustLevel/confirmQuality`（mock 同构）；
http `getDetailInfo` 改调 detail 接口（失败本地组装兜底）；`ProjectService` 加 `getDetail`。

**前端接线**：`LeadContext` 暴露四方法；`LeadDispatchPage` 派发/催办/调级/质检四个 handler
从「updateLead 手写事件」切到服务方法（α 行为不变）。

**验证**：65 文件 886 -> 903 测试全绿；build 通过；本地 wrangler dev 冒烟（detail/dispatch/urge/
level-change 升降级/level-audit/events/项目复合双路匹配/非法入参校验全通过）。

## 3. 阶段 3 待做（下次）

1. `LeadDetail360`：`getLeadDetailProfile`（静态种子）切 `LeadContext.getDetailInfo`（服务 detail），
   demo profile 仅对演示线索保留。
2. `ProjectDetail360`：项目主档走 `getDetail` 复合数据；日报/文档/会议等静态 Tab 逐个接缝。
3. 其余 mockData 引用页面按漏斗主线逐域切 Context。

## 4. 不做的事

- lead_events 独立表：维持 doc 内嵌（ADR-0094 doc-store 决策）。
- 登录认证/权限拦截：看板「基础工具」planned 按自身节奏。
- 日报/差旅/运营费用等域接缝：漏斗主线跑通后再排。
