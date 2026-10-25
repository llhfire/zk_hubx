# 全局搜索 详细设计（global-search-design）

| 项目 | 内容 |
|---|---|
| 状态 | 已定稿（2026-08-25，grill 收束后细化到文件/字段级，未写生产代码） |
| 上游 | PRD：`文档/PRD/PRD-全局搜索.md`；词条：`HubX/CONTEXT.md` §全局搜索；计划：`计划/当前/global-search-dev-plan.md`（S1–S3） |
| 范围 | 仅 L1 全局检索直达。六实体：线索/客户/报价/合同/项目/员工。无写入、无 Undo、无 AI 品牌、无角色过滤 |

## 0. 对 dev-plan 的一处修正（重要）

dev-plan S2 原写「适配器直接调 `services/`」。勘察后修正：**搜索不直接调 service，改读六个域 Context**。理由：

1. 服务实例在 `App.tsx` 顶部注入各 Provider（α 缺省 mock / β `apps/web/src/main.tsx` 注入 http）。搜索若自建 service，α 下会 new 出**第二个 mock 实例**（种子重复加载、与页面写操作状态分叉）。
2. 各 Context 已把全量列表加载进内存状态，搜索是同步内存过滤，无异步复杂度。
3. Context 本身就是服务接缝的消费者，α/β 差异已被它吸收；搜索读 Context 等于免费继承接缝。

客户域没有 Context（页面内联数组），见 §4 提取方案。dev-plan S2 表已同步改。

## 1. 架构总览

```
useLeads().leads ──┐
useQuotation().quotes ─┤
useContracts().contracts ─┤→ useGlobalSearchIndex()   matchEntities(keyword, items)   GlobalSearchPalette
useProjects().projects ─┤     （六域 → SearchItem[]）   （纯函数：过滤/AND/Top5）      （自绘弹层 + 键盘导航）
useEmployee().employees ─┤          searchIndex.ts            matchEntities.ts        GlobalSearchPalette.tsx
CUSTOMERS（提取后模块级）─┘
```

数据流：MainLayout 挂载 Palette -> Palette 内 `useGlobalSearchIndex()` 把六 Context 列表映射为 `SearchItem[]`（useMemo）-> 输入变化时 `matchEntities` 纯函数过滤 -> 分组渲染 -> Enter 跳 `navigate(route)` 并关闭。

## 2. 文件清单

```
packages/ui/src/app/global-search/
├── types.ts                    # 类型定义
├── matchEntities.ts            # 纯函数：匹配 + Top5 + 死线索排除 + 高亮分段
├── searchIndex.ts              # 六域数据 → SearchItem[] 映射（useGlobalSearchIndex hook）
├── GlobalSearchPalette.tsx     # 触发器 + 自绘弹层组件
└── __tests__/
    └── matchEntities.test.ts   # 单测（用例见 §8）

packages/ui/src/app/pages/customers/          # 新目录（客户 mockData 提取）
└── mockData.ts                 # CUSTOMERS 数组 + CustomerSummary 类型（从 Customers.tsx 内联数组原样搬出）
```

改动既有文件（仅两处）：
- `packages/ui/src/app/components/MainLayout.tsx`：Header 三段式 + 挂 Palette + ⌘K 监听（§7）
- `packages/ui/src/app/pages/Customers.tsx`：内联数组改为 import `CUSTOMERS`（行为不变）

## 3. types.ts（完整定义）

```ts
export type SearchEntityKind = 'lead' | 'customer' | 'quote' | 'contract' | 'project' | 'employee';

/** 全局搜索统一结果项：六域实体的只读投影 */
export interface SearchItem {
  kind: SearchEntityKind;
  /** 跳转路由（如 `/leads/l-001`） */
  route: string;
  /** 主标题（结果行第一行） */
  title: string;
  /** meta 行（结果行第二行，如 `L-001 · 归属: 李四`） */
  meta: string;
  /** 参与匹配的字段（小写化后 includes） */
  fields: string[];
  /** 类内排序键，新->旧（字符串比较） */
  sortKey: string;
}

export interface SearchGroup {
  kind: SearchEntityKind;
  label: string;   // '线索' | '客户' | '报价' | '合同' | '项目' | '员工'
  items: SearchItem[];  // 已 Top5 截断
}

export interface SearchOptions {
  /** 权限矩阵落地后的角色过滤接缝，本期恒为 undefined */
  actor?: string;
}

export const ENTITY_ORDER: SearchEntityKind[] = ['lead', 'customer', 'quote', 'contract', 'project', 'employee'];
export const ENTITY_LABEL: Record<SearchEntityKind, string> = { lead: '线索', customer: '客户', quote: '报价', contract: '合同', project: '项目', employee: '员工' };
export const PER_KIND_LIMIT = 5;
```

## 4. searchIndex.ts（六域映射，字段级）

### 4.1 客户 mockData 提取（前置小重构）

`Customers.tsx` 内联 `customers` 数组（约 10 条，`key/name/type/industry/scale/contact/phone/level/status/contractCount/contractAmount/receivable/createTime`）**原样搬出**到 `pages/customers/mockData.ts`，导出 `CUSTOMERS`；`Customers.tsx` 改为 `const customers = CUSTOMERS`（渲染与行为零变化）。

```ts
// pages/customers/mockData.ts
export interface CustomerSummary { key: string; name: string; type: string; industry: string; scale: string; contact: string; phone: string; level: string; status: string; contractCount: number; contractAmount: string; receivable: string; createTime: string; }
export const CUSTOMERS: CustomerSummary[] = [ /* 自 Customers.tsx 原样搬移 */ ];
```

注意：`CustomerDetail.tsx` 是静态演示页（自带硬编码 `customerInfo`，不读 id），本期不动它；跳转按 `key` 进 `/customers/:key`，命中后显示的是静态页，属既有现状。

### 4.2 映射表（真实字段名）

| kind | 数据源（hook） | title | meta | fields（匹配） | route | 排序 sortKey | 排除规则 |
|---|---|---|---|---|---|---|---|
| lead | `useLeads().leads: LeadListItem[]` | `name` | `${id} · 归属: ${owner}` | `[name, customer, contact, phone, id]` | `/leads/${id}` | `createTime` 倒序 | `clueType === 'trash'` 全排除（含已作废/垃圾池；`public`/`assigned`/`hightech` 全保留，已成交照常可搜） |
| customer | `CUSTOMERS` | `name` | `${level} · ${status}` | `[name, contact, phone, key]` | `/customers/${key}` | `createTime` 倒序 | 无 |
| quote | `useQuotation().quotes: Quote[]` | `basicInfo.projectName` | `${quoteNo} · ${basicInfo.customerName}` | `[basicInfo.projectName, quoteNo, basicInfo.customerName]` | `/quotation/${id}` | `quoteNo` 倒序（含日期 ZK-YYYYMMDD-NNN） | 无（草稿照常可搜） |
| contract | `useContracts().contracts: Contract[]` | `current.contractName` | `${contractNo} · ${current.customerName}` | `[current.contractName, contractNo, current.customerName]` | `/contracts/${id}` | `contractNo` 倒序（CT-YYYYMMNNN） | 无（作废照常可搜，PRD §3） |
| project | `useProjects().projects: Project[]` | `name` | `${projectNo} · ${owner} · ${status}` | `[name, projectNo, owner]` | `/projects/${id}` | `createdAt` 倒序 | 无（搁置照常可搜） |
| employee | `useEmployee().employees: Employee[]` | `name` | `${department} · ${position}` | `[name, department, position, jobNumber]` | `/employees/${id}` | `jobNumber` 倒序 | 无 |

### 4.3 Hook 签名

```ts
export function useGlobalSearchIndex(): SearchItem[];   // useMemo 汇总六域，任一 Context 变化自动重算
```

实现：六个 hook 各取列表，`useMemo(() => [...leads.map(toLeadItem), ...], [leads, quotes, contracts, projects, employees])`。customers 是静态模块常量，不进依赖。

## 5. matchEntities.ts（纯函数规约）

```ts
/** 主入口：keyword -> 分组结果（只含命中数>0 的组，按 ENTITY_ORDER 排） */
export function matchEntities(keyword: string, items: SearchItem[], opts?: SearchOptions): SearchGroup[];

/** 高亮分段：把 title 按（大小写不敏感的）命中词切段，供渲染 <mark> */
export function highlightParts(text: string, keyword: string): Array<{ text: string; hit: boolean }>;

/** 键盘焦点移动：给扁平化后的结果列表算下一个焦点下标（-1 表示无焦点） */
export function nextFocusIndex(current: number, delta: 1 | -1, total: number): number;
```

### 5.1 匹配算法（逐步）

1. `keyword.trim()`；空串 -> 返回 `[]`（调用方渲染默认视图）。
2. 分词：`keyword.split(/\s+/)` -> `terms[]`（每段再 trim，丢空段）。
3. 单项命中：`item.fields` 全部 `toLowerCase()` 后，**每个 term 都必须在至少一个 field 上 `includes`**（AND 语义）。
4. 类内排序：`sortKey` 字符串倒序（新->旧）。
5. 截断：每 kind 取前 `PER_KIND_LIMIT = 5`。
6. 分组：命中 0 条的 kind 不出组；组序 = `ENTITY_ORDER`。

注意：死线索排除**不在** matchEntities 里做（它只见 SearchItem）——lead 映射时（§4.2）就已不生成 trash 项，匹配层保持通用。单测里用含 trash 标记的构造数据走 searchIndex 的排除用例会依赖映射层，故把「trash 不生成」的断言放映射层测试（见 §8 用例 4）。

### 5.2 highlightParts 算法

对 title 逐个 term 做大小写不敏感 indexOf 切段；多 term 命中区间取并集后切段。返回段数组，渲染层 `hit: true` 的段包 `<mark>`。空 keyword 返回单段原文。

### 5.3 nextFocusIndex 算法

- total === 0 -> 恒 -1。
- current === -1：delta 1 -> 0；delta -1 -> total-1（从底部进入）。
- 否则 `(current + delta + total) % total` 环绕。

## 6. GlobalSearchPalette.tsx 组件规格

### 6.1 结构

```
GlobalSearchPalette（自包含：触发器 + 弹层）
├── 触发器 <div>（MainLayout Header 中间渲染位）
│   放大镜图标 · placeholder「搜索线索、客户、报价、合同、项目、员工…」 · ⌘K 徽标
└── 弹层（open 时，fixed 遮罩 z-index 高于内容、低于 Arco Modal 层级）
    ├── 输入行：放大镜 + <input> + ESC 徽标（清空按钮仅 keyword 非空时显示）
    ├── body（max-height 60vh 滚动）
    │   ├── 默认视图（keyword 空）：六类提示卡网格 2×3
    │   │   每卡：实体图标 + label + 可搜字段说明（如「线索：公司 / 联系人 / 手机号」）
    │   │   点击卡片 -> 填入该类示例词（lead:'CRM'，customer:'科技'，quote:'ZK-2026'，
    │   │   contract:'CT2026'，project:'郑州'，employee:'王'）并聚焦
    │   └── 结果视图：SearchGroup[] 逐组渲染
    │       组头：`线索 (2)`；行：图标 + title(高亮) + meta + 右侧「↵ 跳转」
    │       无结果空态：机器人图标 + 「未检索到…试试其他关键词」
    └── 底栏：↑↓ 导航 · ↵ 跳转 · esc 关闭（无 Copilot 署名）
```

### 6.2 状态与行为

```ts
const [open, setOpen] = useState(false);
const [keyword, setKeyword] = useState('');
const [focusIndex, setFocusIndex] = useState(-1);
const items = useGlobalSearchIndex();                       // §4
const groups = useMemo(() => matchEntities(keyword, items), [keyword, items]);
const flat = useMemo(() => groups.flatMap(g => g.items), [groups]);  // 键盘导航的扁平序列
```

- 打开：`setOpen(true)` 后 `requestAnimationFrame` 内 focus + select input；keyword/focusIndex 不清（会话内保持，简化状态机；再次打开显示上次关键词）。
- 关闭：`Esc`（输入框 onKeyDown 与遮罩 onClick）、⌘K 再按切换。
- 全局键：`MainLayout` `useEffect` 注册 `window keydown`（`metaKey||ctrlKey` + `k`）`preventDefault` 后 `setOpen(o => !o)`；组件卸载注销。
- 输入变化：`setKeyword(v)` 且 `setFocusIndex(-1)`。
- Enter：`focusIndex >= 0` 跳 `flat[focusIndex]`；`focusIndex === -1` 且 `flat.length > 0` 跳 `flat[0]`；否则无操作。
- 跳转：`navigate(item.route)` -> `setOpen(false)`。
- ↑↓：`setFocusIndex(nextFocusIndex(focusIndex, ±1, flat.length))`；焦点行滚动进可视区（`scrollIntoView({ block: 'nearest' })`）。
- 焦点行样式：`background: var(--brand-50)` + 左侧 2px 高亮条；hover 样式同源。

### 6.3 样式要点（Tailwind v4，无新依赖）

- 触发器：`h-9 w-full max-w-[480px] rounded-lg bg-[var(--grey-100)] border border-[var(--grey-200)]`，hover 白底 + 品牌色边；`hidden md:flex`（窄屏隐藏，PRD §7）。
- 弹层：遮罩 `fixed inset-0 z-[900] bg-black/45`；面板 `w-[680px] max-w-[92vw] mx-auto mt-[10vh] rounded-xl bg-white shadow-2xl`，出入场 `opacity + translateY` 过渡 200ms。
- 复用既有 CSS 变量（`--grey-*`、`--brand-*`，与 MainLayout 同源），不引 Arco Modal/Trigger。

## 7. MainLayout.tsx 接线（diff 级）

1. Header 容器：`justifyContent: 'flex-end'` -> `space-between`；插入三段：
   - 左：空占位 `<div style={{ width: 200 }} />`（与折叠侧栏宽度对齐，纯视觉平衡）
   - 中：`<GlobalSearchPalette />`（组件自含触发器；flex-1 max-w 限制在组件内）
   - 右：现有 `div.flex.items-center.gap-3` 原样不动
2. `import { GlobalSearchPalette } from '../global-search/GlobalSearchPalette'`。
3. Palette 在 Provider 树内（MainLayout 由路由渲染，位于 App 全部 Provider 之下），六个 Context hook 均可安全调用。

## 8. 测试规格

### 8.1 matchEntities.test.ts（单测，6 用例）

| # | 用例 | 断言 |
|---|---|---|
| 1 | 多词 AND | 「郑州 物联网」：两词都命中的项出现；只命中一个词的项不出现 |
| 2 | 大小写不敏感 | `crm` 命中含 `CRM` 的 field |
| 3 | Top 5 截断 | 同 kind 构造 8 条命中 -> 只出 5 条，且是 sortKey 最新 5 条 |
| 4 | trash 排除（映射层） | 构造含 `clueType: 'trash'` 的 leads 走 searchIndex 映射 -> 不生成 SearchItem；`clueType: 'public'` 生成 |
| 5 | 空关键词 | `''` 与 `'   '` 均返回 `[]` |
| 6 | 组序与空组 | 只命中 employee 时结果仅一组且 label 为「员工」 |

（用例 4 依赖映射函数，导出 `toSearchItems(leads, quotes, contracts, projects, employees)` 供测试直调；hook 只做薄封装。）

### 8.2 highlightParts/nextFocusIndex 用例（并入同文件，3 用例）

- 高亮：`crm` 对 `A公司CRM系统` -> 三段，中段 `hit: true` 且原文大小写保留
- 焦点环绕：total=3, current=2, delta=1 -> 0；current=0, delta=-1 -> 2
- 空表：total=0 恒 -1

### 8.3 浏览器冒烟（人工，dev-plan 验证节同源）

⌘K 开/关；六类各搜一条命中并跳转正确路由；垃圾箱线索不出现在结果（先在垃圾池造一条可见线索）；「郑州 物联网」AND；↑↓ Enter 全键盘流；<md 窄屏触发器隐藏；报价/合同/项目三域在 β（http）下结果与列表页一致。

## 9. 边界与风险

| 风险 | 处置 |
|---|---|
| Quote 列表在 QuotationContext 是全量 `svc.list()`（含草稿/补充报价），量增大后 Top5 截断已兜底 | 无需额外处理 |
| `Contract.current` 在草稿早期可能字段不全（contractName 空） | title 兜底 `contractNo`；`fields` 过滤空串 |
| Project `createdAt` http 路径才有（ADR-0094 注入），mock 数据可能缺 | sortKey 兜底链：`createdAt || projectNo` |
| Employee 数据为 mock（无服务接缝），β 后端化时 | 映射层单点改 searchIndex，不影响匹配层 |
| 遮罩层级与 Arco Drawer/Modal 冲突 | z-index 900（低于 Arco modal 1000+），Palette 打开时页面无 Modal 场景 |
| 输入法组合键（中文输入法回车确认候选词） | keydown 里判 `e.nativeEvent.isComposing` 跳过 Enter |

## 10. 验证门（完成的定义）

1. §8.1/8.2 单测全绿；`npm run build` 通过。
2. §8.3 冒烟全过。
3. 功能看板「全局搜索」planned 状态翻「α 已实现」需人工确认后改（不代开，看板约定）。
4. 技术架构 HTML 无需改（无 D1/Workers/接线变化）；工作记录按下班/退下仪式追加。
