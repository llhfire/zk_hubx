---
name: tui-xia
description: >
  Session pause ritual: save progress, sync the feature board, product architecture
  diagram, and β tech architecture, and do not commit or deploy. Use when the user
  says 「退下」, "/tui-xia", "/退下", or asks to save progress without committing or publishing.
---

# 退下

用户说「退下」即执行，不要再问要不要提交或发布。

权威步骤在根目录 `CLAUDE.md`「上下班仪式 · 退下」。本技能只负责触发，不另写一套规则。

执行：

1. 覆盖写根目录 `下班交接.md`（本次进度 / 当前状态 / 下次待办 / 踩坑）。
2. 按本次改动更新功能看板 `HubX/packages/ui/src/app/version/featureBoard.config.json`，并同步 `featureBoardModel.ts` 的 `PLANNED_SEED` / `FEATURES_SEED`。约定见 `HubX/CLAUDE.md` §功能看板。无板块/功能变化则回复「看板无需改」。
3. 按当天工作追加 `HubX/packages/ui/src/app/version/workLog.config.json`。无事可记则回复「工作记录无需改」。
4. 按本次改动更新根目录 `ZK-HubX架构图.html` 的 `module-items`。无新增板块/功能则回复「架构图无需改」。
5. 按本次改动更新 `HubX/docs/ZK-HubX技术架构.html`。接线/进度/洞无变化则回复「技术架构无需改」。
6. 禁止 `git commit`、`git push`、Cloudflare 部署。代码与文档留在工作区。

回复里说明：交接写了什么、看板/工作记录/功能架构图/技术架构改或未改、工作区仍有哪些未提交文件。
