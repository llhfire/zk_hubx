# ZK HubX 前端开发规范

> 本文是代码层面的「怎么写」规范，配合 `CLAUDE.md`（命令/约定）、`ARCHITECTURE.md`（架构/边界）使用。
> 新写或修改代码时遵循本规范；与本规范冲突的既有代码可渐进式修正，不必一次重写。

## 一、组件库

**业务组件一律用 Arco Design**（`@arco-design/web-react`）。

- 表单、表格、弹窗、菜单、布局、消息提示等统一用 Arco 组件；图标用 `@arco-design/web-react/icon`。
- `packages/ui/src/app/components/ui/` 下的 shadcn/Radix 组件及其依赖已于 2026-08-13 清除（git tag `pre-cleanup-20260813` 可回滚）；不要重新引入 shadcn/Radix 或第三方 UI 库。
- 需要 Arco 没有的通用组件时，优先用 Arco 组件组合实现，其次才在 `packages/ui/src/app/components/` 下自建（遵循 Arco 风格），不要引入新的第三方 UI 库。

## 二、命名与文件组织

| 类型 | 约定 | 示例 |
|---|---|---|
| 组件文件 | PascalCase `.tsx` | `LeadDetail.tsx` |
| 工具/数据文件 | camelCase `.ts` | `paymentUtils.ts`、`mockData.ts` |
| 业务域目录 | kebab-case | `daily-report/`、`lead-cost/` |
| Context | `XxxContext.tsx`，Provider + `useXxx` hook 同文件 | `ReminderContext.tsx` |
| 测试 | 同域 `__tests__/*.test.ts` | `__tests__/paymentUtils.test.ts` |
| 类型 | 模块级 `types.ts` | `contracts/types.ts` |

文件组织：
- 页面按业务域放 `packages/ui/src/app/pages/<domain>/`；简单模块是「列表页/详情页」并列，复杂模块把页面、`components/`、`templates/`、`mockData`、`types`、`utils`、`__tests__` 放同一子目录。
- 可复用子组件放本域 `components/`；跨域复用时再考虑提到 `packages/ui/src/app/components/`。

## 三、样式

**优先 CSS 变量主题 + `className`，减少 inline style。**

- 用 `className` 承载样式；`style={{...}}` 仅用于少量动态值（如计算出的尺寸/位置），避免大段内联样式。
- 颜色、间距、字号优先用 Arco/主题的 CSS 变量（`var(--arcoblue-*)`、`var(--color-*)` 等），不写死具体色值。
- 全局样式统一放 `packages/ui/src/styles/`（`index.css` 按 Arco → 字体 → Tailwind → 主题 → 全局 的顺序引入，勿改顺序）；模块级样式放同域的 `.css` 文件。
- 新写代码以 Arco 组件 + 主题变量为主，不引入新的 CSS-in-JS 或额外样式框架。

## 四、数据与状态

- **无网络层**：数据用模块级 `mockData` + Context + 纯函数，不接 `axios`/`fetch`/React Query。
- 页面局部状态用 `useState`；跨页面共享状态放对应 Context（现有 9 个，见 `ARCHITECTURE.md`）。
- 可复用的计算逻辑（成本、报价、审批流、提醒排序等）抽成独立 `.ts` 纯函数，不散落在组件里。
- 持久化仅「审批配置」「待办」用 `localStorage`；其余保持内存态，除非明确需求。

## 五、测试

- 用 Vitest；**测纯函数，不做 UI 快照/组件渲染测试**（除非关键交互逻辑）。
- 复杂计算/状态机逻辑必须配测试（标杆：`delivery-plan/__tests__/utils.test.ts` 覆盖 10 个纯函数）。
- 跑单个测试：`npx vitest run <文件路径> -t "测试名"`。

## 六、提交前检查清单

1. `npm run build` 通过（无 lint/typecheck 脚本，build 是主要验证）。
2. `git diff --check` 通过。
3. 浏览器控制台无报错。
4. 改动涉及提醒/成本/报价等计算逻辑时，补或跑对应纯函数测试。
