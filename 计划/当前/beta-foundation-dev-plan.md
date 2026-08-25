# β 版开发计划：平台底座与漏斗主线接缝

> 2026-08-21 · 规划定稿，B1 起可开工
> 事实源：ADR-0093（签约联动服务端化）、ADR-0094（β 数据底座）、ADR-0083 及各域既有 ADR；业务规则以 `文档/PRD/` 各现行稿为准，本计划不新增业务规则，**无需新 PRD**。
> 范式基准：报价域（`QuotationService` 接口 + mutations 纯函数 + mock/http 双实现 + 服务端状态机校验），所有新接缝照抄此模式。

## 0. 背景与现状判断

β 版（apps/web + apps/api + D1）目前只打通了报价、合同两个域。开工前的三个结构性缺口：

| 缺口 | 现状 | 决策 |
|---|---|---|
| 接缝只覆盖 2 域 | 线索/项目/回款等 20+ 域仍页面局部 useState + 模块 mockData | 按漏斗主线逐域补接缝（本计划 B2/B4） |
| 跨域联动是前端 diff 引擎 | `SigningOpenBridge` 靠内存快照 diff，多用户下事件丢失 | 迁 Workers（ADR-0093，本计划 B3） |
| HTTP 服务无并发/身份控制 | GET-改-PUT 整对象、actor 客户端传入、客户端时钟 | 乐观锁 + actor/时钟服务端化（ADR-0094，本计划 B1） |

## 1. 阶段划分

| 阶段 | 内容 | 依赖 | 状态 |
|---|---|---|---|
| B0 | ADR-0093 / ADR-0094 定稿 | - | ✅ 随本计划完成 |
| B1 | 数据底座：乐观锁 + 服务端时钟 + X-Actor | - | ✅ 编码完成（655/655 全绿；D1 迁移将在下次发布线上执行） |
| B2 | 线索域接缝（LeadService） | B1 | ✅ 编码完成 |
| B3 | 签约联动服务端化（Workers 内 spawn/startDelivery/SOP） | B1 | ✅ 编码完成 |
| B4 | 项目域接缝 + 回款域接缝 | B1；B3（项目种子要吃联动产物） | ✅ 编码完成（回款看板 UI 仍走独立计划，本阶段只接实收台账） |
| B5 | β 上线收口：全域切换、D1 初始化、看板翻牌 | B1–B4 | 待开工 |

B2 与 B3 无相互依赖，可并行；B4 的项目接缝需在 B3 之后（否则服务端 spawn 的项目前端看不见）。

## 2. B1 数据底座（apps/api + 两个既有 http service）

改动文件：`apps/api/src/index.ts`、`packages/ui/src/services/quotationService.ts`、`contractService.ts`。

1. **DDL 加 version 列**：`quotes` / `contracts` 表加 `version INTEGER`（wrangler d1 execute 迁移，存量行默认 0）。
2. **PUT 校验**：请求体带 `version`；服务端读当前 version，不匹配返回 409 + 当前数据；匹配则写入并 `version + 1`。
3. **服务端时钟**：`updated_at` 一律服务端生成；PUT 响应回传服务端时间，前端覆盖本地 `updatedAt`。
4. **X-Actor**：PUT 请求头携带操作人（前端从 `currentUser` 取）；服务端暂只透传记录到响应，登录认证落地后再换成会话身份（见「基础工具」planned「登录认证」）。
5. **前端 409 处理**：http service 捕获 409 -> Message 提示「数据已被他人修改，已刷新」-> 重新拉取列表。不做合并 UI（β 期不值得）。

验收：并发写单测（mock 两把 PUT 交错的场景）；`updatedAt` 不再来自客户端的 grep 验证。

## 3. B2 线索域接缝

改动文件：新建 `packages/ui/src/services/leadService.ts` + `leadMutations.ts`；`pages/leads/` 下五池列表与 LeadDetail 改为走 Context + Service。

1. 接口：`list / getById / create / 领取 / 分配 / 退回（第3次自动垃圾）/ 标记垃圾 / 软删除 / 转客户 / 写跟进记录`。
2. 状态迁移/操作规则抽 `leadMutations.ts` 纯函数（对齐 PRD-线索管理模块：8 态漏斗、24h 限制、重复检查），mock/http 共用。
3. `apps/api` 加 `leads` 表 + CRUD（文档式，带 version），服务端校验领取/退回的前置条件。
4. 线索列表五池数据源从模块 mockData 切到 LeadContext（α/β 同构，mock 实现继续用现有 mockData 作种子）。

验收：五池流转 + 退回三次进垃圾的既有行为在 β 不回退；`grep mockData` 线索域引用清零（种子除外）。

## 4. B3 签约联动服务端化（ADR-0093）

改动文件：`apps/api/src/index.ts`（或拆 `apps/api/src/linkage.ts`）；`pages/contracts/ApprovalDeliveryBridge.tsx` 降级。

1. Workers 在合同 PUT 检测到 **created / approved / voided** 时，同一请求内写 `projects` / `cases`（及既有 SOP 调用）：**created → spawn 未确认项目**（ADR-0067；B5 修首次 INSERT）；**approved → startDelivery**（无项目则不 spawn）；**voided → 搁置**。禁止把 spawn 挂在 `approvedAt`。线索洽谈 spawn 不在 B3，见 ADR-0095 / U1。
2. 检测逻辑**单源导入** `packages/ui/src/app/pages/contracts/signingOpenEvents.ts` 与 `business-case/caseUtils.ts` 纯函数，禁止复制（Workers 打包用 esbuild，相对路径导入无 DOM 依赖文件即可）。
3. 前端 `SigningOpenBridge` 降级：β 只刷新项目 Context，删掉 spawn；α 仍可内存 spawn 合同 created。线索侧跟进 **不得** 只在弹窗 `addProject`（ADR-0095：β 不落 D1）。
4. 联动产物幂等：重复批准/同帧事件不重复 spawn（沿用 `diffContractEvents` 首帧不触发语义）。

验收：β 下「向导创建主合同草稿 → D1 出现未确认项目；批准已指派项目 → 进行中」。全链路不依赖任何前端页面开着。不要用「批准才看到未确认项目」当验收。

## 5. B4 项目域 + 回款域接缝

1. **ProjectService**：`list / getById / spawn（服务端调）/ 指派产品经理 / 搁置 / 状态推进`；`project-management` 7 个 mockData 引用文件切 Context；服务端 spawn 入口由 B3 调用。
2. **回款域**：回款期次目前长在合同 `paymentPlans` 里，B4 只加「回款记录 + 实收台账」服务（`collections` 表）。看板/甘特图 **后于** 本阶段与 B5 双写（`conflict-spawn-and-collections.md`）；进度读台账，期次读 `paymentPlans`。
3. `ProjectContext` / 回款相关 Context 切 http 实现时沿用 App props 注入模式（`apps/web/src/main.tsx`）。

验收：项目详情 360 的元数据/生命周期/回款 Tab 在 β 有真实数据；`caseUtils` 纯函数行为不变（既有单测全绿）。

## 6. B5 β 上线收口

1. `apps/web` 全域确认走 http 服务（报价/合同/线索/项目/回款）。
2. D1 表结构迁移脚本入库（`apps/api/migrations/`），生产 D1 执行并核对。
3. 部署 Cloudflare（α/β 前端 + Workers），`wrangler pages deployment list` 核对 Source SHA。
4. 功能看板：相关模块 `beta.devStatus` 从「未开始」翻到对应状态，`productionOn` 按实际上线情况翻。

## 7. 不做的事（本计划范围外）

- 登录认证 / 权限拦截 / 操作日志：看板「基础工具」planned 已有条目，按其自身节奏做，B1 的 X-Actor 只是过渡。
- 日报/差旅/运营费用/精益交付等域的接缝：等漏斗主线（线索->报价->合同->项目->回款）β 跑通后再排。
- D1 关系建模拆列、WebSocket 推送、合并冲突 UI：ADR-0094 明确 β 期不做。
