# 全局搜索 dev-plan（单阶段）

> 2026-08-25 grill 收束；同日详细设计定稿：`计划/当前/global-search-design.md`（文件/字段级，本计划与它冲突处以设计稿为准）。PRD：`文档/PRD/PRD-全局搜索.md`；词条：`HubX/CONTEXT.md` §全局搜索。
> 范围：只做 L1 全局检索直达。原型其余三层（斜杠表单 / NL2Action / AI 诊断）不做，见 PRD §10。
> 决议备注：本计划推翻 8-24 线索派发 grill 的「⌘K 不做」——那条正名为只约束线索派发列表局部搜索；全局入口按本计划做。

## 硬约束（写码前再读一遍）

1. **不建数据副本**：搜索是六域数据的只读投影，禁止新建汇总 mockData。
2. **无 AI 品牌**：不加 spark 图标 / Copilot 字样 / 旋转 placeholder / chips 条。
3. **无写入、无 Undo**：只有搜索与跳转。
4. **不按角色过滤**：`globalSearch(keyword, opts?)` 预留 `opts.actor`，本期恒为空。

## 阶段切分（单阶段三步，一次做完）

### S1 纯函数层（先行，可独立验证）

新建 `packages/ui/src/app/global-search/`：

| 文件 | 内容 |
|---|---|
| `types.ts` | `SearchEntityKind`（lead/customer/quote/contract/project/employee 六类）、`SearchItem`（kind/id/title/meta/fields/route）、`GlobalSearchResult` |
| `matchEntities.ts` | 纯函数：大小写不敏感包含匹配、空格分词 AND、每类 Top 5（类内新->旧）、死线索排除；导出 `highlightParts(text, keyword)` 供高亮 |
| `__tests__/matchEntities.test.ts` | 用例：①多词 AND（「郑州 物联网」两段都命中才出）②大小写不敏感 ③每类 Top 5 截断 ④垃圾箱/已作废线索排除、作废合同仍可搜 |

### S2 六域适配器（2026-08-25 详细设计修正：读 Context，不直接调 service）

`searchIndex.ts`：`useGlobalSearchIndex()` 统一入口。**修正**：服务实例在 App 顶注入各域 Context，且各 Context 已把全量列表加载进内存；搜索直接调 service 在 α 下会 new 出第二个 mock 实例（种子重复、状态分叉）。故搜索**读六个域 Context**，客户域读提取后的模块级 mockData。详见 `global-search-design.md` §0/§4。

| 域 | 数据来源 | 检索字段 |
|---|---|---|
| 线索 | `useLeads().leads`（映射时排除 `clueType === 'trash'`） | 线索名/公司/联系人/手机号/编号 |
| 客户 | `pages/customers/mockData.ts` 的 `CUSTOMERS`（自 Customers.tsx 内联数组原样提取） | 客户名/联系人/电话/编号 |
| 报价 | `useQuotation().quotes` | 报价名/编号/客户名 |
| 合同 | `useContracts().contracts` | 合同名/编号/客户名 |
| 项目 | `useProjects().projects` | 项目名/编号/PM |
| 员工 | `useEmployee().employees` | 姓名/部门/岗位 |

跳转路由：`/leads/:id`、`/customers/:key`、`/quotation/:quoteId`、`/contracts/:id`、`/projects/:id`、`/employees/:id`。

### S3 弹层组件 + MainLayout 接线

`GlobalSearchPalette.tsx`（自绘弹层，不用 Arco Modal）：

- 触发器：灰底搜索框（放大镜 + 静态 placeholder「搜索线索、客户、报价、合同、项目、员工…」+ ⌘K 徽标）；窄屏（<md）隐藏。
- 全局键：`⌘K`/`Ctrl+K` 唤起；`Esc`/点遮罩关闭；`↑↓` 跨类焦点（索引计算用纯函数便于测试）；`Enter` 执行焦点行；打开自动聚焦全选。
- 默认视图：六类静态提示卡（图标 + 可搜字段说明，点击填示例词）。
- 结果行：图标 + 标题（命中词高亮）+ meta（编号 · 负责人/客户）+「↵ 跳转」；无结果空态；跳转后关闭。

`MainLayout.tsx`：Header 由 `justify-content: flex-end` 改三段式（左空 / 中触发器 / 右图标组），其余不动。

## 验证

- `npx vitest run packages/ui/src/app/global-search` 全绿。
- `npm run build` 通过。
- 浏览器冒烟：⌘K 开/关、六类各搜一条命中跳转、垃圾箱线索不出现在结果、「郑州 物联网」AND 命中、↑↓ Enter 键盘流、窄屏隐藏。

## 文档联动（已完成于 2026-08-25 grill 收束）

- CONTEXT.md §全局搜索：已加
- PRD-全局搜索.md：已建
- 功能看板：基础工具 +1 planned（已设计），config.json + featureBoardModel.ts 双改
- 根架构图：基础工具 module-items 已加
- 技术架构 HTML：无需改（纯 α/β 共用只读投影，无新 D1 表、无 Workers 接口、无接线变化）
