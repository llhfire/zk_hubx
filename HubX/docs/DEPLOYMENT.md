# ZK HubX 部署指南（Cloudflare）

> 三个部署目标：**β后端**（Workers）、**β前端**（Pages）、**α版**（Pages）。
> 前置：一个 Cloudflare 账号，本机已 `npm install`。

## 当前已部署实例（2026-08-17）

| 版本 | 地址 |
|---|---|
| β后端（Workers） | https://zkhubx-api.llhfire.workers.dev |
| β前端（Pages） | https://beta.zkhubx.com（原 https://zkhubx-web.pages.dev） |
| α版（Pages） | https://alpha.zkhubx.com（原 https://zkhubx-alpha.pages.dev） |

> 两个前端已绑定自定义域名 `alpha.zkhubx.com` / `beta.zkhubx.com`，国内可直连。β后端仍是 `*.workers.dev`（浏览器直连若被墙需代理，可考虑后端也绑自定义域名）。

## 0. 一次性登录

```bash
cd apps/api && npx wrangler login
```

会弹浏览器走 OAuth。或者用 API Token：`export CLOUDFLARE_API_TOKEN=xxx`。

验证：`npx wrangler whoami` 能看到账号即成功。

## 1. 部署 β后端（Workers）

```bash
cd apps/api
npx wrangler deploy
```

部署成功后会输出一个地址，形如：
```
https://zkhubx-api.<你的子域>.workers.dev
```

**记下这个地址**，β前端要用它。验证：浏览器打开 `https://zkhubx-api.xxx.workers.dev/api/quotes`，应返回种子报价 JSON。

> ✅ 后端已接 **D1（SQLite）**，数据持久化、重启不丢。首次部署前需初始化 D1：`npx wrangler d1 create zkhubx-db`（拿到 id 填入 wrangler.toml）+ `npx wrangler d1 execute zkhubx-db --file schema.sql --remote`。

## 2. 部署 β前端（Pages）

β前端要在**构建时**把 API 地址写死进去（Vite 编译期内联）：

```bash
cd <仓库根>   # 即 HubX/
VITE_API_BASE_URL=https://zkhubx-api.xxx.workers.dev npm run build -w apps/web
npx wrangler pages deploy apps/web/dist --project-name zkhubx-web
```

首次会让你确认 project 创建。部署完会得到 `https://zkhubx-web.pages.dev`。

> 后续如果走 Git 集成（GitHub → Cloudflare Pages 自动构建），就在 Pages 面板里设：
> - 构建命令：`npm run build -w apps/web`
> - 输出目录：`apps/web/dist`
> - 环境变量：`VITE_API_BASE_URL = https://zkhubx-api.xxx.workers.dev`

## 3. 部署 α版（Pages）

```bash
cd <仓库根>
npm run build -w apps/prototype
npx wrangler pages deploy apps/prototype/dist --project-name zkhubx-alpha
```

α版纯前端（mock），无需 API 地址。部署完得到 `https://zkhubx-alpha.pages.dev`。

## 下班发布（用户说「下班」即执行）

在 `HubX/` 下执行。先提交当天改动，再构建部署，最后核对线上 Source SHA = 当前 `git rev-parse --short HEAD`。

```bash
# α 前端（必发）
npm run build -w apps/prototype
npx wrangler pages deploy apps/prototype/dist --project-name zkhubx-alpha

# β 前端（必发，构建期内联 API）
VITE_API_BASE_URL=https://zkhubx-api.llhfire.workers.dev npm run build -w apps/web
npx wrangler pages deploy apps/web/dist --project-name zkhubx-web

# β 后端（仅 apps/api 有改动时）
# cd apps/api && npx wrangler deploy
```

核对：

```bash
npx wrangler pages deployment list --project-name zkhubx-alpha
npx wrangler pages deployment list --project-name zkhubx-web
```

生产地址：`https://alpha.zkhubx.com` / `https://beta.zkhubx.com`。`*.pages.dev` 是同一套 Pages 项目。

## 常见问题

- **SPA 深链接 404**：两个前端都已加 `public/_redirects`（`/* /index.html 200`），Pages 会自动读取。
- **跨域报错**：β后端已开 CORS（`app.use('*', cors())`），生产环境可收紧为具体域名。
- **改了 UI 重新部署**：`packages/ui` 是共享 UI，改完重新 build 对应的 app 再 deploy 即可（α/β 各自 build）。

## 建议的下一步

1. 先按上面三步跑通「能访问」，确认 α/β 都在线。
2. 再接 D1（让 β后端持久化）+ 把 CORS 收紧 + Git 集成自动部署。
