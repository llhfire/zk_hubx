// Excel 导入纯函数（费用台账 + 报价清单共用解析逻辑）

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult<T> {
  valid: T[];
  errors: ImportError[];
  totalRows: number;
}

/** 校验 Excel 表头是否完全匹配 */
export function validateExcelHeaders(actual: string[], expected: readonly string[]): boolean {
  if (actual.length < expected.length) return false;
  return expected.every((h, i) => actual[i]?.trim() === h);
}

/** 解析 YYYY-MM-DD 日期，无效返回 null */
export function parseDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(value.trim());
  return match ? match[0] : null;
}

/** 解析 YYYY-MM 月份，无效返回 null */
export function parseMonth(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^\d{4}-\d{2}$/.exec(value.trim());
  return match ? match[0] : null;
}

/** 解析正数金额，无效返回 null */
export function parseAmount(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/** 从发生日推导归属月 */
export function deriveMonthFromDate(occurDate: string): string {
  return occurDate.slice(0, 7);
}
