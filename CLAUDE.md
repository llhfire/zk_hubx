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
  2. **代码没动则跳过提交与发布**：`packages/ui/`、`apps/` 无任何改动（git status 确认）时，不提交、不发布 Cloudflare，交接文档留在工作区下次一并提交；仅根目录文档改动同理。
  3. 有代码改动才做：提交到仓库（交接文档一并提交，避免线上和 git 分叉），并**发布到 Cloudflare**，步骤见 `HubX/docs/DEPLOYMENT.md`「下班发布」：α 前端必发；β 前端必发（与 α 共用 `packages/ui`）；`apps/api` 有改动才发 Workers；最后用 `wrangler pages deployment list` 核对线上 Source SHA = 当前 HEAD。

## 状态指示文档联动规则

本项目有三份指示状态的文档，做计划、写代码时必须按以下规则保持同步：

1. **`ZK-HubX架构图.html`（根目录）**：整体项目的目标性文档。**每次做了计划（新功能规划、阶段计划等）就要更新这个文档**，保持与计划同步。
2. **功能看板 `HubX/packages/ui/src/app/version/featureBoard.config.json`**：**做了计划或完成了某个模块的编码，就要更新看板里的对应细则**（planned 状态、`beta.devStatus`、`features[]` 描述等，详细行为约定见 `HubX/CLAUDE.md` §功能看板）。
3. **看板新增板块（模块）或新增功能时**：在看板同步记录的同时，**也要更新到架构图文档里**，保证两份文档不脱节。

## 仓库结构（先读这里）

本仓库根目录是「项目工作区」，真正的应用代码在 `HubX/` 子目录，且 `HubX/` 是一个**独立的嵌套 git 仓库**（自带 `.git`，根仓库将 `HubX/` 视为未跟踪目录）。

- **`HubX/`**：HubX Ops 企业销售管理系统（CRM）前端原型。**所有代码改动、构建、测试都在这里进行。** 应用级开发规范（路由、提醒系统、日报、线索成本、项目管理/合同成本、跨模块联动、样式约定）见 **`HubX/CLAUDE.md`**，请优先阅读，勿在根目录重复。
- 根目录其余内容多为中文项目文档与生成/中间产物，不属于代码本体：
  - 需求与流程文档：`OA需求文档.md`、`原始需求池.md`、`录音分析结果.md`、`软件外包项目交付执行 SOP 1.md`
  - 规划/中间产物：`outputs/`、`videos/`、`.planning/`、`.codex-tmp/`、`.codex_tmp/`、`HubX.zip`
  - 根目录 `README.md` 仅占位（`# zkhubx`），无实质内容
- 业务术语与模块全景见 `HubX/CONTEXT.md`（公司业务模式、已有/规划模块、线索/合同/项目/日报等关键概念）。

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
- 技术栈：React 18 + Vite 6 + React Router 7 + Arco Design（业务 UI）+ Tailwind v4。
