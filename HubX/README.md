# HubX

应用代码仓库（npm workspaces）。工作区总说明见上一级 [`README.md`](../README.md)。

```bash
npm install
npm run dev      # α：apps/prototype → http://localhost:5173
npm run build
npm test
```

| 路径 | 用途 |
|------|------|
| `packages/ui/` | 唯一前端源码（页面、Context、纯函数、`services/`） |
| `apps/prototype/` | α 版 Vite 入口（mock） |
| `apps/web/` | β 版前端（接 Workers） |
| `apps/api/` | β 版 Cloudflare Workers + D1 |
| `docs/` | 工程文档与 ADR，见 [`docs/README.md`](docs/README.md) |
| `tmp/`、`output/` | 本地临时文件与导出，不当事需求 |
| `scripts/` | 一次性脚本（如手册生成） |
| `guidelines/` | 设计稿导出时的 Guidelines |

术语：[`CONTEXT.md`](CONTEXT.md)。开发约定：[`CLAUDE.md`](CLAUDE.md)、[`FRONTEND_CONVENTIONS.md`](FRONTEND_CONVENTIONS.md)。
