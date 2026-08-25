# ZK HubX 版本架构（α版 / β版）

> 本文记录 ZK HubX 的**双版本 + monorepo + 数据接缝**架构，是接后端、部署、迭代的指引。
> 术语：**α版**=纯前端版（页面+mock），**β版**=前后端版（前端+Workers 后端）。两者都部署到 Cloudflare。

## 一、仓库结构（npm workspaces monorepo）

```
HubX/  （npm workspaces 根，git 仓库）
├── packages/
│   └── ui/                @zkhubx/ui —— 唯一 UI 源
│       └── src/
│           ├── app/       （页面/组件/Context/类型/纯函数，从旧 src/app 迁来）
│           ├── styles/    （全局样式）
│           ├── assets/
│           └── services/  ★ 数据访问接口 + mock/http 实现（数据接缝）
├── apps/
│   ├── prototype/         @hubx/prototype —— α版（纯前端，注入 mock service）
│   ├── web/               @hubx/web —— β版前端（Cloudflare Pages，注入 http service）
│   └── api/               @hubx/api —— β版后端（Cloudflare Workers + Hono）
└── docs/                  （文档，含 SYSTEM-OVERVIEW.md）
```

- 两个前端 app 通过 vite 的 `@` alias（→ `packages/ui/src`）复用**同一份 UI**：改 `packages/ui`，α/β 同时生效（自动拉）。
- `apps/api` 独立演进（Workers），不与 UI 耦合。

## 二、数据接缝（接后端的关键）

UI 不直接读写数据，而是依赖 `services/` 里的 **Service 接口**；数据来源由每个 app 注入：

```ts
// packages/ui/src/services/quotationService.ts
export interface QuotationService { list(): Promise<Quote[]>; createQuote(...): Promise<string>; ... }
export function createMockQuotationService(): QuotationService { /* 内存 + localStorage */ }
export function createHttpQuotationService(baseUrl: string): QuotationService { /* fetch /api/quotes */ }
```

- 业务逻辑（状态迁移/会签/版本）抽在 `quotationMutations.ts`，mock 与 http **共用**，保证口径一致。
- `QuotationContext` 接受 `service` prop：α版不传（默认 mock）、β版传 http。
- `App.tsx` 透传 `quotationService`；`apps/web/src/main.tsx` 注入 `createHttpQuotationService(apiBaseUrl)`，baseUrl 用 `VITE_API_BASE_URL`（本地默认 `http://localhost:8787`）。

**给一个新模块（如合同/线索）加接缝的步骤**（报价域已完成，作样板）：
1. 定义 `XxxService` 接口 + `createMockXxxService` + `createHttpXxxService`；
2. 抽共享 mutation 纯函数（mock/http 共用）；
3. 把 `XxxContext` 改成「注入 service + 异步加载 + loading」；
4. 后端实现对应 `/api/xxx` 路由；
5. `apps/web` 注入 http、`apps/prototype` 用 mock。

> **接线实况（2026-08-22 起）**以 [`ZK-HubX技术架构.html`](ZK-HubX技术架构.html) 为准。下文「当前进度」停在 2026-08-16，线索/项目/实收接缝与 B5 洞不要以本节为事实源。

## 三、当前进度（2026-08-16，历史）

**已完成：**
- monorepo 落地（packages/ui + apps/prototype/web/api），α/β 两个前端都能 build。
- **报价域** http 全通 + 后端 D1 持久化 + 状态迁移校验 + DELETE 端点。
- **合同域** http 全通 + 后端 D1（mock/http 共享 `contractMutations.ts`）。
- **Cloudflare 部署**：β后端 Workers + β前端 Pages + α版 Pages（地址见 `DEPLOYMENT.md`）。
- 报价域其他改造：全局模拟身份、待办三处落地、销售身份统一张三、状态机修复。

**待办（下一阶段）：**
1. 线索/待办等其余域抽 service 接缝（照合同/报价样板）。
2. 合同域加服务端状态迁移校验（照报价域样板）。
3. 绑自定义域名（`*.workers.dev`/`*.pages.dev` 国内直连被墙，需备案域名或换国内托管）。

## 四、本地运行

| 版本 | 命令 | 地址 |
|---|---|---|
| α版（纯前端） | `npm run dev -w apps/prototype`（或根 `npm run dev`） | http://localhost:5173 |
| β版前端 | `npm run dev -w apps/web` | http://localhost:5174 |
| β版后端 | `cd apps/api && npx wrangler dev` | http://localhost:8787 |

构建：`npm run build -w apps/prototype` / `-w apps/web`；测试：`npm test`（跑 `apps/prototype` 的 vitest，扫描 packages/ui）。

> 注意：β后端是内存存储，联调时别手动 PUT 不完整字段的报价（前端 `computeAmountBreakdown` 会崩）；重启后端即重置。
