# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言偏好

始终使用中文进行所有交流和回复。

## 仓库结构（monorepo）

本目录（`HubX/`）是 npm workspaces 根，按「前端可复用」拆成多个 workspace：

- `packages/ui/`（`@zkhubx/ui`）：**共享 UI + 业务逻辑**（页面/组件/类型/纯函数/Context + `services/` 数据访问接口）。这是唯一 UI 源。
- `apps/prototype/`（`@hubx/prototype`）：**纯前端 demo**——入口、构建配置、依赖、mock 注入。日常 `npm run dev` 在这里跑。
- `apps/api/`（`@hubx/api`）：Cloudflare Workers 后端（骨架）。
- `apps/web/`（`@hubx/web`）：前后端版前端（Cloudflare Pages，骨架）。

要点：源码已从旧的 `src/` 迁到 `packages/ui/src/`（`src/app` → `packages/ui/src/app`）；`apps/prototype` 和 `apps/web` 通过 vite 的 `@` alias 复用同一份 UI；UI 经 `packages/ui/src/services/` 接口访问数据（prototype 注入 mock、web 注入 http）。

## 产品定位与边界规则

ZK HubX（ZK = 中科）是贴合**中科集团**业务流程、供集团内部使用的管理工具（单租户、内部自用，不是对外 SaaS，也不是多租户系统）。

**新增任何功能前，先确认它是否服务于中科集团内部管理**：服务哪个内部岗位/管理场景？落在业务漏斗（投放 → 线索 → 客户 → 合同 → 项目 → 交付 → 利润）的哪个环节？以下场景默认不做，除非用户明确改定位：租户隔离 / 多公司数据隔离、对外售卖与计费、开放平台、客户自助门户。

详细功能拆解见 `ARCHITECTURE.md`，业务术语与模块全景见 `CONTEXT.md`，前端开发规范见 `FRONTEND_CONVENTIONS.md`。

## 项目性质

这是一个基于 Arco Design 的企业销售管理系统（CRM）前端原型，代码包来自 Figma/Make 导出。当前代码以页面内状态、mock 数据和少量 context 驱动，**不要默认假设已接入真实后端**。

## 常用命令

在 `HubX/` 目录下执行：

```bash
npm install
npm run dev
npm run build
npm test
npm run test:reminders
npx vitest run packages/ui/src/app/reminders/__tests__/utils.test.ts -t "测试名称"
```

说明：
- 当前没有 `lint` 或 `typecheck` 脚本。
- 常规验证优先跑 `npm run build`；改动提醒逻辑时再补 `npm test` 或 `npm run test:reminders`。
- 仓库虽有 `pnpm-workspace.yaml`，但 README 与现有脚本都以 `npm` 为准。
- `react-router@7.13.0` 声明需要 Node `>=20.0.0`；在 Node 18 下 `npm install` 会出现 `EBADENGINE` 警告。当前 Node 18.17.0 下构建和测试能通过，但长期建议使用 Node 20+。

## 技术栈

- React 18 + Vite 6
- React Router 7（`createBrowserRouter`）
- Arco Design 作为主要业务 UI 组件库
- Tailwind CSS v4 + 全局主题变量
- `packages/ui/src/app/components/ui/` 下有一套 shadcn / Radix 风格通用组件，但业务页面目前更多直接使用 Arco 组件

## 应用结构

- `apps/prototype/src/main.tsx`：应用入口，挂载根节点并加载全局样式。
- `packages/ui/src/app/App.tsx`：应用壳层，使用 `ReminderProvider` 包裹 `RouterProvider`。
- `packages/ui/src/app/routes.tsx`：所有页面路由的集中配置点。
- `packages/ui/src/app/components/MainLayout.tsx`：统一负责侧边栏、顶部栏、菜单高亮/展开、提醒入口和日报弹窗；新增或调整一级导航时，通常要同时修改这里和 `routes.tsx`。
- `packages/ui/src/app/pages/`：按业务域组织页面。简单模块通常是“列表页 / 详情页”并列；复杂模块会把页面、类型、mock 数据、模板、弹窗放在同一子目录，例如 `daily-report/`、`lead-cost/`、`contract-cost/`。

## 数据与状态模式

- 当前没有发现 `axios`、`fetch`、React Query、Redux、Zustand 等真实数据层或全局状态方案。
- 大多数页面直接使用 `useState`、模块级 `mockData`、`types`、`utils`，以及少量 context。
- 改页面前先确认数据属于“页面局部状态”还是“业务目录下的共享 mockData / types / utils”；不要默认去找 API 层。
- 如果后续接入真实后端，接口适配层大概率需要新增，而不是在现有页面里做少量替换。

## 关键模块

### 提醒系统

- `packages/ui/src/app/reminders/ReminderContext.tsx` 在内存中维护提醒相关 mock 数据，并每分钟刷新当前时间。
- `packages/ui/src/app/reminders/buildReminders.ts` 会把审批、日报、线索、合同四类提醒通过 adapters 聚合后统一排序。
- `MainLayout` 顶栏中的 `ReminderBell`、日报未提交徽标，以及工作台中的 `ReminderTodoPanel` 都依赖这个上下文。
- 改提醒行为时，优先复用 `packages/ui/src/app/reminders/` 下已有纯函数，并补充现有 Vitest 测试，而不是把时间判断散落到页面组件里。

### 日报系统

- 日报是“角色决定模板、模板决定内容结构”的前端建模。
- `packages/ui/src/app/pages/daily-report/templateConfig.ts` 定义销售模板、通用模板、模拟用户与模板选择逻辑。
- `packages/ui/src/app/pages/daily-report/DailyReportModal.tsx` 负责会话态初始化、日期切换、必填校验和提交对象组装。
- `SalesDailyTemplate` 与 `GeneralDailyTemplate` 分别对应不同内容结构；新增字段时通常要同步修改 `types.ts`、模板配置、模板组件和提交逻辑。
- 当前日报提交仍是前端内存态：`submitDailyReport` 只是把结果写回提醒上下文持有的 mock 数据。

### 线索成本模块

- `packages/ui/src/app/pages/lead-cost/mockData.ts` 不只是模拟数据文件，也集中定义该模块的类型和核心计算函数，例如成本、有效率、渠道汇总、综合评分。
- 修改线索成本看板、日报、充值记录、渠道分析等页面的口径或公式时，优先改这里的共享函数，避免在页面中重复计算。

### 项目管理与合同成本

- `packages/ui/src/app/pages/project-management/mockData.ts` 集中定义项目、项目跟进、线索关联、项目日报、项目文档、工时等数据结构和初始数据。
- `packages/ui/src/app/pages/contract-cost/contractCostData.ts` 直接复用了项目管理模块中的日报/工时相关数据，说明合同成本口径依赖项目管理的数据模型。
- 涉及项目字段扩展、工时口径或合同映射调整时，优先先看这两个文件，而不是只改单个页面。

## 跨模块联动

- `DailyReportModal` 同时被 `packages/ui/src/app/components/MainLayout.tsx` 和 `packages/ui/src/app/pages/Dashboard.tsx` 复用；提交日报会直接影响顶部提醒、工作台待办和未提交日报提示。
- `LeadDetail`、`MyLeads`、`ReminderBell`、`ReminderTodoPanel` 都依赖 reminders 上下文；调整提醒 `type`、`actionTarget` 或 ID 规则时，需要一起检查这些入口。
- `packages/ui/src/app/pages/LeadDetail.tsx` 通过 `normalizeLeadReminderId()` 把路由参数转换成提醒系统使用的 `lead-*` ID；修改线索 ID 规则时不要只改页面数据。
- `PublicLeads` 和 `MyLeads` 都会通过 `findCompanyEntityByName()` 打开 `CompanyEntityInfoModal`；线索里的 `entity` 字段实际上与 `packages/ui/src/app/pages/company-entity/companyEntityData.ts` 中的主体名称/简称对齐。
- `PublicLeads`、`MyLeads`、`TrashLeads` 进入 `LeadDetail` 时会传入不同的 `location.state.from`；详情页依赖这个状态决定返回和部分流转行为。
- `FinancialDashboard` 通过 `/finance/contract-cost/:contractId` 跳转到合同成本详情；财务统计、合同成本、项目日报三者共享合同 / 项目 / 工时映射关系。

## 样式与构建约定

- 全局样式入口是 `packages/ui/src/styles/index.css`，按顺序引入 Arco CSS、字体、Tailwind、主题变量和全局样式；修改全局样式时尽量保持这个顺序。
- `apps/prototype/vite.config.ts` 中将 `@` 映射到 `packages/ui/src/`。
- 项目实现了自定义 `figma:asset/<filename>` resolver，会把资源映射到 `packages/ui/src/assets/<filename>`。
- `vite.config.ts` 明确要求保留 `react()` 和 `tailwindcss()` 两个插件，即使 Tailwind 使用不多也不要移除。
- `assetsInclude` 目前只额外包含 `svg` 和 `csv`；不要把 `.css`、`.ts`、`.tsx` 加进去。

## 环境变量与 Vite 中间件

- `.env.example` 定义 DeepSeek 相关变量（`DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL`）；实际值放 `.env.local`（已被 gitignore，勿提交）。
- `vite.config.ts` 内置开发服务器中间件 `wx-cli-bridge`：暴露 `/api/wechat/group-communication?groupName=...`，用 `wx` CLI 导出微信售前群聊天记录并调用 DeepSeek 做沟通总结；无 API Key 或调用失败时回退到 `buildSummary()` 的本地规则总结。该功能需要本机安装 `wx` CLI 并配置 `.env.local`。
