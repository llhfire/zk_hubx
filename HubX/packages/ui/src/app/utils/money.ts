/**
 * 金额展示统一口径。
 *
 * 背景：全仓曾有 20 处各自实现的 money / formatMoney / formatCurrency，
 * 同一笔钱在不同页面显示不同 —— 例如合同看板的「已回款」是 `¥480.0万`，
 * 合同详情同一指标是 `¥480,000`；客户列表空值显示 `—`，合同详情显示 `¥0`。
 *
 * 这里只收敛「语义相同」的实现。刻意的格式差异保留为独立函数：
 * - `formatMoneyCompact`：看板卡片用的万单位压缩显示（`¥48.0万`），不是精度丢失。
 * - `formatAmountPlain`：合同文书模板里的纯数字（无货币符号、固定两位小数）。
 *
 * 不要为了"统一"把上面两者合并进来 —— 它们的差异是有意的。
 */

/** 空金额的默认占位。表格里用破折号，比 `¥0` 更能区分「没有」与「零」。 */
export const EMPTY_AMOUNT = '—';

/**
 * 标准金额：`¥1,234.56`。
 *
 * @param value 金额；`null` / `undefined` / `NaN` 返回占位符
 * @param options.placeholder 空值占位，默认 `—`
 * @param options.fractionDigits 小数位，默认最多 2 位且不强制补零
 *   （`480000` → `¥480,000`，`1234.5` → `¥1,234.5`）
 */
export function formatMoney(
  value: number | null | undefined,
  options: { placeholder?: string; fractionDigits?: number } = {},
): string {
  const { placeholder = EMPTY_AMOUNT, fractionDigits } = options;
  if (value === null || value === undefined || Number.isNaN(value)) return placeholder;

  if (fractionDigits !== undefined) {
    return `¥${value.toLocaleString('zh-CN', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })}`;
  }
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * 万单位紧凑显示：`¥48.0万`。用于看板卡片等空间受限处。
 *
 * 注意：不足 1 万时退化为标准金额，避免 `¥0.1万` 这种失真。
 */
export function formatMoneyCompact(value: number | null | undefined, placeholder = EMPTY_AMOUNT): string {
  if (value === null || value === undefined || Number.isNaN(value)) return placeholder;
  if (Math.abs(value) < 10000) return formatMoney(value, { placeholder });
  return `¥${(value / 10000).toFixed(1)}万`;
}

/** 合同文书用：纯数字、固定两位小数、无货币符号（`1,234.56`）。 */
export function formatAmountPlain(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0.00';
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
