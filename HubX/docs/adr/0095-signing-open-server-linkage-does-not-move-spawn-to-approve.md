# 服务端联动不把立项改挂到合同批准；线索洽谈 spawn 也走写时

ADR-0093 把「前端 diff 联动」迁到 Workers，这点仍成立。但它的第一句把当时阶段 3 的错误接线（批准才 `spawn`）写成了迁移动作，读起来像推翻 ADR-0067。不推翻。

未确认项目仍只在**签约开启**时产生（ADR-0066 / 0067 / `CONTEXT.md`）：线索进入合同洽谈/已签单，或未作废主合同一创建（草稿也算）。合同批准只对已指派的未开始/搁置项目 `startDelivery`；库中无项目时**不兜底 spawn**。

β 两条写时入口必须都在 Workers 内跑同一套 `shouldSpawnUnconfirmedProject` / `spawnUnconfirmedProject`，禁止只在某个打开的页面 `addProject`：

1. **合同 PUT**：`events.created`（及 B5 的草稿补洞 ③）→ spawn。这是 B5 P0 洞 C。
2. **线索 PUT / 跟进导致状态进入洽谈或已签单**：尚无项目则 spawn（无合同字段版，id 用 `ap-lead-{leadId}`）。这是统一视图 U1 剩余工作，**不在 B5**。α mock 的 LeadService 与 http 共用 mutations，不要再写一条前端专用 spawn。

ADR-0093「线索侧跟进弹窗显式联动保留」对 β 不成立：前端 `addProject` 不写 D1。α 桥只保留合同事件的内存 spawn（无 Workers）；β 桥只 `refresh()`。
