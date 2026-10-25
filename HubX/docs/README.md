# HubX/docs/

应用工程文档，跟着代码走。产品 PRD 在仓库根的 `文档/`。

## 常驻文档

| 路径 | 用途 |
|------|------|
| `ZK-HubX技术架构.html` | **β 技术实况图**（接线、D1、洞、施工进度）。功能看板场景「技术架构」页签；下班/退下必核。产品目标图仍是仓库根 `ZK-HubX架构图.html`（「功能架构」页签）。 |
| `SYSTEM-OVERVIEW.md` | 模块与代码结构总览（实现向）。 |
| `ALPHA-BETA-ARCHITECTURE.md` | α / β 分工（进度以技术架构 HTML 为准）。 |
| `DEPLOYMENT.md` | Cloudflare 发布，含下班发布步骤。 |
| `adr/` | 领域硬决策（0001–0106）。`CONTEXT.md` 是词表，ADR 是为什么。 |

## 归档区（只读，不随代码更新）

| 路径 | 用途 |
|------|------|
| `logs/` | **历史收口日志**，按日期命名（30 份）。是当时的验收记录，不作为现行规范；其中的代码路径可能已因目录重构而失效，查现状请看代码或 `SYSTEM-OVERVIEW.md`。 |
| `design/` | 设计与 UX 优化方案 + 设计对照图（`design-qa.md` 及 cost-overview 系列 PNG）。 |
| `prototype/` | 交互原型 HTML，先于代码存在，用于确认形态。 |

临时构建物：`HubX/tmp/`（本地 PDF/脚本）、`HubX/output/`（导出 html/pdf）。不要当需求源。

> 目录约定（2026-10-25）：结项后当日就把日志移入 `logs/`，不要堆在 `docs/` 根；`docs/` 根只留上表 4 份 + `ZK-HubX技术架构.html`。
