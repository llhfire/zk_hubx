# ZK HubX 部署指南（Cloudflare）

> 三个部署目标：**β后端**（Workers）、**β前端**（Pages）、**α版**（Pages）。
> 前置：一个 Cloudflare 账号，本机已 `npm install`。

## 当前已部署实例（2026-08-16）

| 版本 | 地址 |
|---|---|
| β后端（Workers） | https://zkhubx-api.llhfire.workers.dev |
| β前端（Pages） | https://zkhubx-web.pages.dev |
| α版（Pages） | https://zkhubx-alpha.pages.dev |

> ⚠️ **国内访问注意**：`*.workers.dev` / `*.pages.dev` 直连被墙（GFW），需走代理/VPN 才能访问；长期需绑自定义域名（已备案）或换国内托管。

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

> ⚠️ 当前后端是**内存存储**（无 D1），Workers 是无状态的，跨请求不持久；重启/多 isolate 后数据会回到种子。上线验证连通性够用，正式持久化待接 D1。

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

## 常见问题

- **SPA 深链接 404**：两个前端都已加 `public/_redirects`（`/* /index.html 200`），Pages 会自动读取。
- **跨域报错**：β后端已开 CORS（`app.use('*', cors())`），生产环境可收紧为具体域名。
- **改了 UI 重新部署**：`packages/ui` 是共享 UI，改完重新 build 对应的 app 再 deploy 即可（α/β 各自 build）。

## 建议的下一步

1. 先按上面三步跑通「能访问」，确认 α/β 都在线。
2. 再接 D1（让 β后端持久化）+ 把 CORS 收紧 + Git 集成自动部署。
