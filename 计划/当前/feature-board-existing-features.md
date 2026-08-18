# 计划：功能看板「覆盖范围」→「已有功能列表」+「功能列表」→「待设计功能」

## 背景
用户要求把功能看板的「覆盖范围」列改为可交互的「已有功能列表」（文字块矩阵排列，点击弹出功能说明）；同时「功能列表」列改名为「待设计功能」。

## 关键决策
- **描述数据源**：Claude 根据代码库知识（SYSTEM-OVERVIEW.md、页面代码、CONTEXT.md）为每个模块的已有功能生成初始描述（原始需求/功能流程/功能说明），后续 Claude 持续完善
- 功能描述存入配置文档 `featureBoard.config.json`，结构化字段

## 数据模型变更
`scope: string` → `features: ExistingFeature[]`，保留 `scope` 作为模块简介（不显示在 UI）

```ts
interface ExistingFeature {
  name: string;       // 功能名（显示为文字块）
  description: string; // 点击弹出的详细说明（需求+流程+说明，纯文本多行）
}
```

## 实现步骤
1. `featureBoardModel.ts`：新增 `ExistingFeature` 类型，`FeatureBoardModule` 加 `features` 字段，`normalizeFeatureBoard` 兼容旧数据（scope 降级为空 features），`isValidFeatureBoard` 不强制要求 features（向后兼容）
2. `featureBoard.config.json`：每个模块填充已有功能列表种子数据（Claude 根据代码库知识生成描述）
3. `VersionCompareModal.tsx`：
   - 「覆盖范围」列 → 「已有功能」列：渲染为小文字块（Tag 样式），点击打开详情弹窗
   - 新增功能详情弹窗：展示功能名 + 描述（多行文本，清晰展示原始需求、功能流程、功能说明）
   - 「功能列表」列名 → 「待设计功能」
4. `versionCompareModal.css`：新增文字块矩阵样式、详情弹窗样式
5. CLAUDE.md 补充：已有功能描述随代码变更/新功能上线时由 Claude 更新
6. 单测（features 校验）+ 构建 + 提交推送

## 触碰面
- `packages/ui/src/app/version/featureBoardModel.ts`
- `packages/ui/src/app/version/featureBoard.config.json`
- `packages/ui/src/app/version/VersionCompareModal.tsx`
- `packages/ui/src/app/version/versionCompareModal.css`
- `HubX/CLAUDE.md` §功能看板（补充）
- `packages/ui/src/app/version/__tests__/featureBoardModel.test.ts`

## 验证
- `npx vitest run` version 相关
- `npm run build` prototype/web
- Chrome 无头实测：文字块渲染、点击弹出详情、功能列表改名
