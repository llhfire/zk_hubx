# 签约开启联动迁到服务端；前端只做展示刷新

> 修订（ADR-0095）：第一句描述的是阶段 3 当时的错误接线，**不是**把立项改挂到批准。未确认项目仍按 ADR-0067 在签约开启时产生；批准不兜底 spawn。线索洽谈 spawn 亦须写时进 Workers，不能留在跟进弹窗。

「合同批准 -> 生成未确认项目 -> 启动交付 + SOP」目前由前端 `SigningOpenBridge`（App.tsx 挂载）靠 React Context 内存快照 diff 触发（`signingOpenEvents.ts`）。α 单机单用户成立；β 有了真实后端后不成立：别人批准的合同，当前页面没有快照，diff 永不触发，项目漏生成。

决策：联动逻辑迁到 `apps/api`（Workers）——合同写入 `approved` 时在同一请求内完成 spawn 未确认项目 / startDelivery / SOP 计划生成。检测逻辑不复制：`signingOpenEvents.ts` / `caseUtils.ts` 是无 DOM 依赖的纯函数，Workers 直接从 `packages/ui` 导入同一份源（单源，禁双写）。前端桥降级为「合同列表变化时刷新项目/看板」的展示层刷新，不再承担业务联动。

曾考虑保留前端 diff 引擎 + 轮询（多请求竞态、事件丢失难测试）和 WebSocket 推送（β 期无在线要求，复杂度不成比例）。事件检测用「写时联动」而非后台队列：D1 + Workers 无常驻进程，写请求内同步完成最简单，失败则整个合同更新失败（原子性反而更好）。
