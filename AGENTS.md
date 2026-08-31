# 仓库指南

## 上下班仪式

- **上班**（用户说「上班」即触发）：
  1. 先读根目录 `下班交接.md` 恢复上下文，核对 Git 状态。
  2. 启动本地 α 版开发服务器（`cd HubX && npm run dev`，即 `apps/prototype`，后台运行），确认可访问后再开工。
- **下班**（用户说「下班」即触发，不要再问要不要发）：
  1. 覆盖写 `下班交接.md`（本次进度 / 当前状态 / 下次待办 / 踩坑）。
  2. 按本次改动对齐 `HubX/docs/ZK-HubX技术架构.html`（β 接线、D1、洞、施工进度）。无变化则写明「技术架构无需改」。
  3. 按当天工作追加 `HubX/packages/ui/src/app/version/workLog.config.json`（按分类写一句话；无事可记则写明「工作记录无需改」）。
  4. **代码没动则跳过提交与发布**：`packages/ui/`、`apps/` 无任何改动（`git status` 确认）时，不提交、不发布 Cloudflare，交接文档留在工作区下次一并提交；仅根目录文档改动同理。**例外**：`HubX/docs/ZK-HubX技术架构.html` 有改时仍要发 α/β 前端（构建会 copy 进 Pages）。
  5. 有代码改动（或技术架构 HTML 有改）才做：提交到仓库（交接文档一并提交，避免线上和 Git 分叉），并发布到 Cloudflare，步骤见 `HubX/docs/DEPLOYMENT.md` 「下班发布」：α 前端必发；β 前端必发（与 α 共用 `packages/ui`）；`apps/api` 有改动才发 Workers；最后用 `wrangler pages deployment list` 核对线上 Source SHA = 当前 HEAD。
- **退下**（用户说「退下」即触发，不要再问要不要提交或发布）：
  1. 覆盖写 `下班交接.md`（本次进度 / 当前状态 / 下次待办 / 踩坑）。
  2. 按本次改动对齐功能看板：`HubX/packages/ui/src/app/version/featureBoard.config.json`，以及 `featureBoardModel.ts` 的 `PLANNED_SEED` / `FEATURES_SEED`。无板块/功能变化则在回复里写明「看板无需改」。
  3. 按当天工作追加 `HubX/packages/ui/src/app/version/workLog.config.json`。无事可记则写明「工作记录无需改」。
  4. 按本次改动对齐根目录 `ZK-HubX架构图.html` 的 `module-items`。无新增板块/功能则写明「架构图无需改」。
  5. 按本次改动对齐 `HubX/docs/ZK-HubX技术架构.html`。接线/进度/洞无变化则写明「技术架构无需改」。
  6. **禁止** `git commit` / `git push` / Cloudflare 部署。代码与文档都留在工作区，等「下班」再一并提交发布。

## 项目结构与模块组织

本仓库为文档先行的 Workspace 项目，代码集中在 `HubX/`，文档与计划位于仓库根目录周边。  

主要目录：
- `HubX/package.json`：根工作区入口，所有命令在此目录执行  
- `HubX/packages/ui/`：前端核心源码（页面、Context、服务、`__tests__`）  
- `HubX/apps/prototype/`：Vite α 版（默认开发入口）  
- `HubX/apps/web/`：Vite β 版（接入生产链路）  
- `HubX/apps/api/`：Cloudflare Workers + D1  
- `HubX/docs/`、`文档/`、`计划/`：架构、PRD、进度与历史文档  
- `HubX/packages/ui/src/assets/`：静态资源

## 构建、测试与开发命令

- `cd HubX && npm install`：安装依赖  
- `npm run dev`：启动 `apps/prototype`，默认访问 `http://localhost:5173`  
- `npm run build`：构建 `apps/prototype`  
- `npm test`：运行全部 Vitest  
- `npm run test:reminders`：运行提醒相关测试  
- `npm run dev --workspace apps/web` / `npm run build --workspace apps/web`：Web β 端本地与构建  
- `npm run dev --workspace apps/api` / `npm run deploy --workspace apps/api`：API 本地调试与部署  

## 编码风格与命名约定

遵循 `HubX/FRONTEND_CONVENTIONS.md`：  
- 默认使用 `@arco-design/web-react` 组件库  
- 组件文件 `PascalCase.tsx`，工具/服务文件 `camelCase.ts`  
- 测试文件紧邻代码，放在 `__tests__/*.test.ts`（或 `.tsx`）  
- 优先 `className` 与主题变量，避免大块内联样式  
- 变量与类型命名清晰，逻辑优先做纯函数提取，2 空格缩进

## 测试规范

- 测试框架：Vitest；主入口在 `HubX/packages/ui/src/**/*/__tests__`  
- 复杂计算、状态机与业务规则必须补齐单测  
- 运行全部：`npm test`  
- 运行单文件：`npx vitest run HubX/packages/ui/src/app/reminders/__tests__/utils.test.ts`

## 提交与 PR 规范

仓库提交历史使用前缀约定（`feat`、`fix`、`style`、`refactor` 等），建议沿用。  
示例：
- `feat: 完成线索派发全阶段配置`
- `fix: 修复项目列表返回路径`
- `style: 详情页信息密度统一`

PR 建议包含：变更范围、影响模块、验证命令与结果、相关文档链接（`README`/`计划`/`文档`，如有）、UI 变更请附截图。

## 安全与配置建议

- 禁止提交密钥与环境变量  
- 推荐使用 Node >= 20；较低版本可能出现 `react-router@7` 的引擎警告
