# 功能看板 α 信息与详情 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 调整功能看板交互：待设计条目仅悬停标题行显示删除、隐藏未开始圆点；已有功能详情维护功能级 α 三项 checkbox；α 列显示版本更新次数和最近日期。

**Architecture:** 在 `featureBoardModel.ts` 扩展已有功能级 α 状态与版本级 `alphaMeta`，统一由 normalize 兼容旧配置。组件通过显式 changeType 区分 α 更新与计划/β/备注/验收标记保存，详情弹窗负责功能级 checkbox，列表列负责展示版本级元数据。样式只控制待设计删除按钮的 hover，不改变既有状态机。

**Tech Stack:** React 18、Arco Design、TypeScript、Vitest、localStorage/α Vite feature-board endpoint。

---

## 文件地图

- Modify `HubX/packages/ui/src/app/version/featureBoardModel.ts`: 类型、seed、normalize、校验、纯函数与带变更类型的保存辅助。
- Modify `HubX/packages/ui/src/app/version/VersionCompareModal.tsx`: 详情 checkbox、α 版本元数据列、待设计条目渲染和显式变更类型。
- Modify `HubX/packages/ui/src/app/version/versionCompareModal.css`: 待设计标题行 hover 删除按钮样式。
- Modify `HubX/packages/ui/src/app/version/__tests__/featureBoardModel.test.ts`: 迁移、功能级 checkbox、α 元数据累计测试。
- Modify `HubX/packages/ui/src/app/version/featureBoard.config.json`: 将当前事实源迁移为新 schema（通过模型规范化后保存）。
- Create `docs/superpowers/specs/2026-08-24-feature-board-alpha-display-design.md`: 已完成设计文档。

### Task 1: 扩展领域模型与迁移

**Files:**
- Modify: `HubX/packages/ui/src/app/version/featureBoardModel.ts`
- Test: `HubX/packages/ui/src/app/version/__tests__/featureBoardModel.test.ts`

- [ ] **Step 1: 写失败测试**

在 `featureBoardModel.test.ts` 增加测试，锁定：

```ts
it('每个已有功能拥有独立 alpha 检查项与版本级 alpha 元数据', () => {
  const board = createSeedBoard();
  const feature = board.modules.find(m => m.features.length > 0)!.features[0];
  expect(feature.alpha).toEqual({ '页面场景': false, '功能流程': false, 'UX 优化': false });
  expect(board.alphaMeta).toEqual({ updateCount: 0, lastUpdatedAt: '' });
});

it('normalize migrates old module alpha and missing feature/meta fields', () => {
  const normalized = normalizeFeatureBoard({
    modules: [{
      module: '报价工作台',
      alpha: { '页面场景': true, '功能流程': false, 'UX 优化': true },
      features: [{ name: 'Stage1 功能清单', description: '说明' }],
      planned: [],
      beta: { productionOn: false, devStatus: '未开始' },
    }],
  });
  expect(normalized.alphaMeta).toEqual({ updateCount: 0, lastUpdatedAt: '' });
  expect(normalized.modules[0].features[0].alpha).toEqual({ '页面场景': false, '功能流程': false, 'UX 优化': false });
});

it('toggles a single existing feature alpha check without changing other features', () => {
  const board = createSeedBoard();
  const module = board.modules.find(m => m.features.length > 1)!;
  const next = toggleFeatureAlphaCheck(board, module.module, module.features[0].name, '页面场景');
  expect(next.modules.find(m => m.module === module.module)!.features[0].alpha.页面场景).toBe(true);
  expect(next.modules.find(m => m.module === module.module)!.features[1].alpha.页面场景).toBe(false);
});

it('marks alpha update explicitly and leaves checklist updates uncounted', () => {
  const board = createSeedBoard();
  const counted = markAlphaUpdate(board, '2026-08-24');
  expect(counted.alphaMeta).toEqual({ updateCount: 1, lastUpdatedAt: '2026-08-24' });
  const unchanged = counted;
  expect(unchanged.alphaMeta.updateCount).toBe(1);
});
```

- [ ] **Step 2: 运行测试确认失败**

运行：

```bash
cd HubX && npx vitest run packages/ui/src/app/version/__tests__/featureBoardModel.test.ts
```

预期：因 `FeatureBoard.alphaMeta`、`ExistingFeature.alpha`、`toggleFeatureAlphaCheck`、`markAlphaUpdate` 尚不存在而失败。

- [ ] **Step 3: 实现最小模型改动**

在 `featureBoardModel.ts`：

1. 定义 `AlphaChecks` 复用结构，并给 `ExistingFeature` 增加 `alpha: AlphaChecks`。
2. 给 `FeatureBoard` 增加 `alphaMeta: { updateCount: number; lastUpdatedAt: string }`。
3. 在 `createSeedBoard()` 的每个已有功能上补默认 `alpha`，返回顶层补 `{ updateCount: 0, lastUpdatedAt: '' }`。
4. 在 `normalizeFeatureBoard()` 中：
   - 缺失/非法 `alphaMeta` 回退到默认值；
   - 每个已有功能读取并规范化 `entry.alpha`；
   - 旧模块级 `alpha` 仅保留，不把它复制给全部功能，避免误把模块完成度伪装成每项完成。
5. 在 `isValidFeatureBoard()` 中校验 `alphaMeta` 和每个 feature 的三个 boolean。
6. 增加纯函数：

```ts
export function toggleFeatureAlphaCheck(
  board: FeatureBoard,
  module: string,
  featureName: string,
  key: AlphaCheckKey,
): FeatureBoard;

export function markAlphaUpdate(board: FeatureBoard, date: string): FeatureBoard;
```

`markAlphaUpdate` 只接受 `YYYY-MM-DD`，非法日期返回原 board；合法日期将次数加一并更新日期。

- [ ] **Step 4: 运行测试确认通过**

运行同一 Vitest 命令，预期新增测试与原测试全部 PASS。

- [ ] **Step 5: 提交模型变更**

```bash
git add HubX/packages/ui/src/app/version/featureBoardModel.ts HubX/packages/ui/src/app/version/__tests__/featureBoardModel.test.ts
git commit -m "feat: add feature-level alpha checks and metadata"
```

### Task 2: 增加显式变更类型与事实源迁移

**Files:**
- Modify: `HubX/packages/ui/src/app/version/featureBoardModel.ts`
- Modify: `HubX/packages/ui/src/app/version/VersionCompareModal.tsx`
- Modify: `HubX/packages/ui/src/app/version/featureBoard.config.json`

- [ ] **Step 1: 增加保存变更类型**

定义：

```ts
type BoardChangeType = 'alpha' | 'planned' | 'beta' | 'note' | 'checklist';
```

将组件内部 `update(next)` 改为 `update(next, changeType)`：

- `alpha`：调用 `markAlphaUpdate(next, today)` 后保存；
- 其他类型：原样保存；
- `checklist`：功能级 checkbox 保存但不计数。

不要修改底层 `saveFeatureBoard` 的直接调用契约；计数必须发生在组件明确确认变更类型时，避免待设计/β/备注误计数。

- [ ] **Step 2: 更新现有调用点**

在 `VersionCompareModal.tsx`：

- 删除/新增/改名/状态：`planned`；
- β 开关/β 状态：`beta`；
- 备注：`note`；
- 功能级 α checkbox：`checklist`；
- 已有功能说明编辑（如本轮不提供编辑控件则不新增）：仅未来显式编辑入口使用 `alpha`。

- [ ] **Step 3: 迁移并保存当前配置**

让 `loadFeatureBoard()` 返回 normalize 后数据，并通过一次受控保存将当前 `featureBoard.config.json` 补齐：

- 每个已有功能增加 `alpha` 默认对象；
- 顶层增加 `alphaMeta`；
- 保留模块级 `alpha` 以兼容旧数据；
- 不改变现有 planned、beta、note 值。

- [ ] **Step 4: 运行模型测试与构建**

```bash
cd HubX && npx vitest run packages/ui/src/app/version/__tests__/featureBoardModel.test.ts
cd HubX && npm run build
```

预期：测试通过，生产构建通过。

### Task 3: 调整看板 UI 交互

**Files:**
- Modify: `HubX/packages/ui/src/app/version/VersionCompareModal.tsx`
- Modify: `HubX/packages/ui/src/app/version/versionCompareModal.css`

- [ ] **Step 1: 重写待设计条目行结构**

将每个条目包装为 `.feature-board-planned-item`，标题部分使用 `.feature-board-planned-name`；删除按钮增加 `.feature-board-planned-delete`，默认由 CSS 隐藏，父行 hover 显示。

`item.status === '未开始'` 时不渲染 `Dropdown` 和 `StatusDot`；其他状态保留状态下拉和圆点。

- [ ] **Step 2: 替换 α 列**

删除 `ALPHA_CHECK_KEYS.map(...)` 和模块级 checkbox。改为显示：

```tsx
<div className="feature-board-alpha-summary">
  <Text>更新 {board.alphaMeta.updateCount} 次</Text>
  <Text type="secondary">
    {board.alphaMeta.lastUpdatedAt ? `最近更新：${board.alphaMeta.lastUpdatedAt}` : '暂无更新记录'}
  </Text>
</div>
```

- [ ] **Step 3: 扩展已有功能详情弹窗**

在 `featureDetail` 弹窗说明文字下方渲染三个 Checkbox，读取 `featureDetail.feature.alpha[key]`；点击时调用 `toggleFeatureAlphaCheck`，更新局部 `featureDetail` 为新 board 中对应 feature，再调用 `update(next, 'checklist')`。关闭/重新打开时从 board 读取最新状态。

checkbox 文案固定为“页面场景 / 功能流程 / UX 优化”，保持用户手动维护。

- [ ] **Step 4: 增加 CSS**

```css
.feature-board-planned-delete {
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.15s;
}

.feature-board-planned-item:hover .feature-board-planned-delete {
  visibility: visible;
  opacity: 1;
}

.feature-board-alpha-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.5;
}
```

- [ ] **Step 5: 运行构建与测试**

```bash
cd HubX && npm run build
cd HubX && npx vitest run packages/ui/src/app/version/__tests__/featureBoardModel.test.ts
```

### Task 4: 浏览器验证与文档联动

**Files:**
- Modify: `HubX/packages/ui/src/app/version/featureBoard.config.json`（若浏览器验证触发迁移写回）
- Modify: `HubX/packages/ui/src/app/version/workLog.config.json`
- Modify: `HubX/packages/ui/src/app/version/featureBoard.config.json`（状态/说明同步）
- Modify: `ZK-HubX架构图.html`（如功能看板自身功能描述需同步）
- Modify: `HubX/docs/ZK-HubX技术架构.html`（仅 β 接线变化时）

- [ ] **Step 1: 启动 α 并打开功能看板**

```bash
cd HubX && npm run dev
```

打开 `http://localhost:5173/`，点击侧栏版本标识进入功能看板。

- [ ] **Step 2: 验证待设计交互**

逐项观察：

1. 未开始条目无小圆点；
2. 已调研/设计中/已设计条目有小圆点；
3. 鼠标未悬停标题行时删除按钮不可见；
4. 鼠标悬停标题行时删除按钮显示；
5. 删除后条目从配置和页面消失。

- [ ] **Step 3: 验证已有功能详情**

点击同模块两个已有功能：

1. 每个弹窗均显示三个 checkbox；
2. 勾选一个功能的“页面场景”；
3. 关闭并重新打开确认保留；
4. 打开同模块第二个功能确认未被联动修改；
5. α 更新次数不因 checkbox 改变而增加。

- [ ] **Step 4: 验证 α 版本列**

确认 α 列只显示更新次数和最近日期，不显示模块级 checkbox；执行一次明确 α 更新后，确认次数加一、日期变为当前日期；执行待设计/β/备注修改后，确认次数不增加。

- [ ] **Step 5: 更新工作记录并完成验证**

在 `workLog.config.json` 追加当天“功能看板 α 信息与已有功能详情交互调整”记录；运行：

```bash
cd HubX && npm test
cd HubX && npm run build
```

预期：全量测试与构建均通过；若存在基线失败，记录具体失败输出，不宣称全绿。

- [ ] **Step 6: 提交实现**

```bash
git add HubX/packages/ui/src/app/version docs/superpowers/specs docs/superpowers/plans HubX/packages/ui/src/app/version/workLog.config.json
 git commit -m "feat: refine feature board alpha display"
```
