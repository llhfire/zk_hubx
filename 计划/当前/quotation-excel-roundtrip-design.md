# 报价域 Excel 双向导入导出设计（quotation-excel-roundtrip-design.md）

> 状态：设计定稿，未编码。看板条目：报价与合规增强 :: Excel 双向导入导出 [已调研]。
> 范围：报价工作台 Stage1 功能清单与 Stage2 人天评估的 Excel 导出与再导入（round-trip）。**不含** Stage3/4 导出、PDF/Word、多报价单批量。

## 1. 现状

| 能力 | 现状 | 位置 |
| --- | --- | --- |
| Stage1 导入 | ✅ 已实现：Excel 五列（模块/子功能/描述/备注/端）-> 两级功能清单，表头校验 + 行级错误 | `quotation/fileFlow.ts`（`parseFeature清单` / `validateHeaders`）+ `FeatureListUpload.tsx` |
| Stage2 导入 | ❌ PRD §4.3「可导入 Excel 评估表」未实现 | - |
| 导出 | ❌ 无（项目里 exceljs 已在运营费用台账导出、360 导出使用，能力现成） | 参考 `operating-expense/exportLedger.ts` |
| 模板下载 | ❌ 无 | - |

问题：导入格式只存在于用户脑中（五列约定），没有官方模板；评估表无格式定义；导出后无法再导入（无 round-trip）。

## 2. 目标

1. **一份官方 Excel 模板**（两个 sheet），下载即模板、导出即模板，导入解析同一格式。
2. Stage1 功能清单：导出当前清单 / 导入替换（现有能力并入）。
3. Stage2 人天评估：导出当前评估（只读清单+可填人天列）/ 导入人天。
4. 全程纯前端 exceljs，无网络依赖，α/β 行为一致（报价数据本身已有 mock/http 接缝，导出导入不关心数据来源）。

## 3. 格式设计（唯一事实源：本节）

### 3.1 Sheet「功能清单」（沿用现有五列，零破坏）

| 模块 | 子功能 | 描述 | 备注 | 端 |
| --- | --- | --- | --- | --- |
| 会员系统 | 登录注册 | 手机号+验证码登录 | | 小程序 |

- 表头与 `EXPECTED_HEADERS` 完全一致；「备注」「端」允许整列空。
- 解析规则沿用 `parseFeature清单`（模块相同行归并为同一 module 下子功能）。

### 3.2 Sheet「人天评估」

| 模块 | 子功能 | 岗位-前端 | 岗位-后端 | 岗位-测试 | 岗位-设计 | 技术备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 会员系统 | 登录注册 | 3 | 5 | 2 | | 短信服务商已定 |

- **岗位列动态**：以当前报价已配置的岗位集合（Stage2 评估表单的岗位）为列头，`岗位-{名称}` 命名；导入时按列头反查岗位，未知岗位列报错（不静默丢弃）。
- 评估行粒度 = 子功能级（与 Stage2 表单一致）；空白单元格 = 未填（区分 0）。
- 技术备注为模块级语义，但按行冗余存储（Excel 无合并语义），导入时取首个非空值。

### 3.3 元信息（不进 Excel）

报价名称、客户、状态机字段**不导出**：导出物是「清单/评估数据」，不是报价单备份；round-trip 只作用于当前打开的报价对象的工作数据，防止绕过状态机整单导入。

## 4. 纯函数层（`quotation/excelRoundtrip.ts` 新文件）

```ts
// ── 导出 ──
export function buildWorkbookBuffer(quote: Quote): Promise<ArrayBuffer>;
// 组装两个 sheet（功能清单 + 人天评估），exceljs 生成

// ── 模板 ──
export async function buildTemplateBuffer(positions: string[]): Promise<ArrayBuffer>;
// 空 sheet + 表头 + 1 行示例（示例行带「示例」标记，导入时跳过标记行）

// ── 导入 ──
export interface ImportResult {
  modules: FeatureModule[];
  evaluations: ModuleEvaluation[];   // 人天 + 技术备注
  errors: ParseError[];              // 行级错误（沿用 fileFlow.ParseError）
  skippedExampleRows: number;
}
export function parseWorkbook(rows清单: Raw清单Row[], rows评估: Raw评估Row[],
  knownPositions: string[]): ImportResult;
// 表头校验复用 validateHeaders（清单）；评估表头校验新增（模块/子功能必在首两列）
```

- 导入语义：**整表替换**（与现有 FeatureListUpload 一致），不做行级 merge；预览确认后写入。
- 错误处理对齐现有模式：错误行不阻断整体，返回行级错误列表由 UI 展示（`解析有 N 个错误` banner + 明细）。
- 单 sheet 缺失：只导入了「功能清单」sheet -> 仅替换清单；只导入「人天评估」-> 仅替换评估（两 sheet 独立生效）。

## 5. UI 接线

| 位置 | 增量 |
| --- | --- |
| Stage1 `FeatureListUpload` | 「下载模板」「导出当前清单」两按钮；导入解析改走 `parseWorkbook`（兼容单 sheet 旧文件：仍走 `parseFeature清单`） |
| Stage2 评估表单 | 「导出评估表」「导入评估表」按钮；导入预览 Modal 显示岗位列映射 + 错误行 |
| 导出文件名 | `功能清单-{报价编号}.xlsx` / `评估表-{报价编号}.xlsx`（单文件双 sheet 时用报价编号） |

- 导入权限：Stage1 在待报价/已驳回/评估中状态可用；Stage2 仅被指派技术（沿用现有编辑权限判定）。
- 已确认/已归档报价：导出可用，导入禁用（状态机不因导入开口子）。

## 6. 测试（`__tests__/excelRoundtrip.test.ts`）

| 用例 | 断言 |
| --- | --- |
| 导出 -> 导入 round-trip | `parseWorkbook(buildWorkbookBuffer 的行数据)` 深度还原 modules/evaluations |
| 空清单/空评估导出 | 仅表头，导入为空集不报错 |
| 评估岗位列动态 | 已知岗位生成列；未知岗位列 -> 行级错误 |
| 未知岗位整列 | 错误信息含岗位名，不静默丢弃 |
| 示例行跳过 | 「示例」标记行 skippedExampleRows |
| 单 sheet 导入 | 另一份数据不动 |
| 空白 vs 0 | 空白 = 未填，0 = 明确零人天 |
| 旧五列文件兼容 | 无评估 sheet 时走原路径 |

## 7. 决策记录

1. **导出物 = 数据不 = 备份**：报价元信息与状态不进 Excel，防止绕过状态机整单迁移（对齐 ADR-0002/0004 的单据状态不可绕过原则）。
2. **整表替换不 merge**：与现有导入语义一致，merge 的冲突仲裁复杂度不值。
3. **岗位列动态 + 未知列报错**：岗位集合是报价级配置，模板无法预知；报错优于静默。
4. **复用 exceljs 现有能力**，不引新依赖；文件组织对齐 `exportLedger.ts`。

## 8. 不做

- 不做 Stage3 增项/Stage4 审批导出；
- 不做多报价单批量导入；
- 不做 CSV（Excel/CSV 双格式维护成本 > 收益）；
- 不做 β 服务端生成（纯前端，数据已由报价接缝保障）。
