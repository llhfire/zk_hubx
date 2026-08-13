# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言偏好

始终使用中文进行所有交流和回复。

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
