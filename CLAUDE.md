# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言偏好

始终使用中文进行所有交流和回复。

## 上下班仪式

- **上班**：
  1. 先读根目录 `下班交接.md` 恢复上下文，核对 git 状态。
  2. 启动本地 α 版开发服务器（`cd HubX && npm run dev`，即 apps/prototype，后台运行），确认可访问后再开工。
- **下班**（用户说「下班」即触发，不要再问要不要发）：
  1. 覆盖写 `下班交接.md`（本次进度 / 当前状态 / 下次待办 / 踩坑）。
  2. 按本次改动对齐 `HubX/docs/ZK-HubX技术架构.html`（β 接线、D1、洞、施工进度）。无变化则写明「技术架构无需改」。
  3. 按当天工作追加 `HubX/packages/ui/src/app/version/workLog.config.json`（按分类写一句话；无事可记则写明「工作记录无需改」）。
  4. **代码没动则跳过提交与发布**：`packages/ui/`、`apps/` 无任何改动（git status 确认）时，不提交、不发布 Cloudflare，交接文档留在工作区下次一并提交；仅根目录文档改动同理。**例外**：`HubX/docs/ZK-HubX技术架构.html` 有改时仍要发 α/β 前端（构建会 copy 进 Pages）。
  5. 有代码改动（或技术架构 HTML 有改）才做：提交到仓库（交接文档一并提交，避免线上和 git 分叉），并**发布到 Cloudflare**，步骤见 `HubX/docs/DEPLOYMENT.md`「下班发布」：α 前端必发；β 前端必发（与 α 共用 `packages/ui`）；`apps/api` 有改动才发 Workers；最后用 `wrangler pages deployment list` 核对线上 Source SHA = 当前 HEAD。
- **退下**（用户说「退下」即触发，不要再问要不要提交或发布）：
  1. 覆盖写 `下班交接.md`（本次进度 / 当前状态 / 下次待办 / 踩坑）。
  2. 按本次改动对齐功能看板：`HubX/packages/ui/src/app/version/featureBoard.config.json`，以及 `featureBoardModel.ts` 的 `PLANNED_SEED` / `FEATURES_SEED`（约定见 `HubX/CLAUDE.md` §功能看板）。无板块/功能变化则在回复里写明「看板无需改」。
  3. 按当天工作追加 `HubX/packages/ui/src/app/version/workLog.config.json`。无事可记则写明「工作记录无需改」。
  4. 按本次改动对齐根目录 `ZK-HubX架构图.html` 的 `module-items`。无新增板块/功能则写明「架构图无需改」。
  5. 按本次改动对齐 `HubX/docs/ZK-HubX技术架构.html`。接线/进度/洞无变化则写明「技术架构无需改」。
  6. **禁止** `git commit` / `git push` / Cloudflare 部署。代码与文档都留在工作区，等「下班」再一并提交发布。

## 状态指示文档联动规则

做计划、需求 grill / 需求分析、完成模块编码时，必须同时对齐下面几份（缺一不可）：

1. **实现计划**（`计划/当前/`）：本次要做什么、不做完什么、阶段切分。新开计划就落一份；计划变更就改这份。
2. **PRD**（`文档/PRD/`）：业务规则与状态机以 grill 后的 PRD 为准，并在文首标明领域事实源（`HubX/CONTEXT.md` + `HubX/docs/adr/`）。
3. **功能看板 `HubX/packages/ui/src/app/version/featureBoard.config.json`**：更新对应模块的 `planned` 状态、`features[]` 描述、`note`（约定见 `HubX/CLAUDE.md` §功能看板）。`featureBoardModel.ts` 的 `PLANNED_SEED` / `FEATURES_SEED` 一并改。
4. **`ZK-HubX架构图.html`（根目录）**：整体目标文档。计划变更、看板新增板块/功能时同步改 `module-items`，两份不能脱节。
5. **`HubX/docs/ZK-HubX技术架构.html`**：β 技术实况。接线、D1、洞、施工进度变了就改。下班/退下必核。功能看板场景页签查看。

领域用词以 `HubX/CONTEXT.md` 为准，硬决策记在 `HubX/docs/adr/`。不要只改其中一份。

## 仓库结构（先读这里）

根目录是项目工作区，目录地图见根 `README.md`。各文件夹用途见该目录下的 `README.md`。

- **`HubX/`**：唯一应用代码（`packages/ui` + `apps/prototype` α + `apps/web` β + `apps/api`）。规范见 **`HubX/CLAUDE.md`**。
- **`文档/`**：PRD、需求、报价标准件、会议、手册。报价现行稿：`文档/PRD/PRD-报价流程管理.md`。
- **`计划/`**：实现计划。当前开工：`计划/当前/`。
- **`产出/`**：导出表和视频，不是需求。
- 根上只留：`CLAUDE.md`、`下班交接.md`、`ZK-HubX架构图.html`、`README.md`。
- 业务术语见 `HubX/CONTEXT.md`。硬决策见 `HubX/docs/adr/`。

## 常用命令

所有命令需在 `HubX/` 目录下执行（根目录没有 `package.json`）：

```bash
cd HubX
npm install
npm run dev          # 启动 Vite 开发服务器
npm run build        # 生产构建（常规验证优先用它）
npm test             # vitest run，跑全部单测
npm run test:reminders  # 只跑提醒系统单测
```

- 没有 `lint` / `typecheck` 脚本；单测用 Vitest。
- 跑单个测试文件：`npx vitest run <文件路径> -t "测试名"`。
- `react-router@7` 要求 Node `>=20`（Node 18 下 `npm install` 会有 `EBADENGINE` 警告，但当前仍能构建/测试通过）。
- 仓库虽有 `pnpm-workspace.yaml`，但 README 与现有脚本均以 `npm` 为准。

## 关键背景（跨文件才能看清的「大图景」）

- HubX 是「软件外包 + 自运营投放获客」复合型公司的 CRM，核心是一条业务漏斗：广告投放 → 线索 → 客户 → 合同 → 项目 → 交付 → 利润。
- 前端来自 Figma/Make 导出，以页面内 `useState`、模块级 `mockData`、`types`、`utils` 和少量 context 驱动，**未接真实后端**（没有 axios / fetch / React Query / Redux / Zustand）。改功能前先确认数据属于「页面局部状态」还是「业务目录下共享 mockData/types/utils」，不要默认去找 API 层。
- 技术栈：React 18 + Vite 7 + React Router 7.18 + Arco Design（业务 UI）+ Tailwind v4。
