# ZK HubX 工作区

中科集团内部运营系统（HubX）的**项目工作区**。应用代码在 `HubX/`，其余是需求、计划、标准件和产出。

各目录用途见下表。子目录里还有自己的 `README.md`。

| 路径 | 用途 |
|------|------|
| [`HubX/`](HubX/) | **唯一应用代码**。monorepo：`packages/ui` + `apps/prototype`（α）+ `apps/web`（β）+ `apps/api`。说明见 [`HubX/README.md`](HubX/README.md)、[`HubX/docs/README.md`](HubX/docs/README.md)。 |
| [`文档/`](文档/README.md) | 给人看的资料：PRD、需求池、报价标准件、会议、手册、进度表。 |
| [`计划/`](计划/README.md) | 实现计划与历史施工稿。当前开工看 `计划/当前/`。 |
| [`产出/`](产出/README.md) | 导出表、宣传视频等生成物，不是需求正文。 |
| [`ZK-HubX架构图.html`](ZK-HubX架构图.html) | 目标架构图。做了计划就要改。系统里点左侧「ZK HubX」可弹窗打开。 |
| [`下班交接.md`](下班交接.md) | 上下班仪式用的会话交接（固定这一份）。 |
| [`CLAUDE.md`](CLAUDE.md) | 给 AI 的仓库规则（语言、上下班、文档联动）。 |
| `.claude/` / `.agents/` | AI 技能、命令、本地设置。不要放业务文档。 |

日常开发：

```bash
cd HubX
npm run dev    # α 版 http://localhost:5173
```

计划和需求分析必须同时对齐：实现计划、PRD、功能看板、架构图。规则见 `CLAUDE.md`。
