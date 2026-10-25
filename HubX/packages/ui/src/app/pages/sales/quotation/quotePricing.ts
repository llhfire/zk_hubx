// 报价计价与作业字段纯函数
// 利润率、岗位日成本、工作日换算。全部纯函数，便于 Vitest 覆盖。

// ─── 利润率 ──────────────────────────────────────────────

/** 岗位日成本配置：roleKey → 日成本（元/天） */
export type RoleDailyCostConfig = Record<string, number>;

/** 默认岗位日成本（兜底） */
export const DEFAULT_ROLE_DAILY_COST = 600;

/** 默认利润率底线（15%） */
export const DEFAULT_MIN_PROFIT_RATE = 0.15;

/**
 * 利润率 = (开发售价 − 岗位成本) / 开发售价
 * 开发售价 = 总价 − 增项总额
 * 增项不进利润率分母。
 * 开发售价 ≤ 0 时返回 null（无法计算）。
 */
export function computeProfitRate(args: {
  grandTotal: number;
  upliftTotal: number;
  roleCostTotal: number;
}): number | null {
  const devPrice = args.grandTotal - args.upliftTotal;
  if (devPrice <= 0) return null;
  return (devPrice - args.roleCostTotal) / devPrice;
}

// ─── 岗位日成本 ──────────────────────────────────────────

/**
 * 三级解析链：配置兜底 → 模板覆盖 → 本单覆盖
 * 优先级：quoteOverride > templateOverride > config > DEFAULT
 */
export function resolveRoleDailyCost(
  roleKey: string,
  config?: RoleDailyCostConfig,
  templateOverride?: RoleDailyCostConfig,
  quoteOverride?: RoleDailyCostConfig,
): number {
  if (quoteOverride?.[roleKey] != null) return quoteOverride[roleKey];
  if (templateOverride?.[roleKey] != null) return templateOverride[roleKey];
  if (config?.[roleKey] != null) return config[roleKey];
  return DEFAULT_ROLE_DAILY_COST;
}

// ─── 工作日换算（只跳周六日）────────────────────────────

/** 判断是否为工作日（周一~周五） */
function isWorkday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

/**
 * 从起始日期加 N 个工作日（只跳周六日），返回目标日期字符串 YYYY-MM-DD。
 * start 必须为 YYYY-MM-DD 格式；days ≥ 0。
 */
export function addWorkdays(start: string, days: number): string {
  const d = new Date(start.slice(0, 10));
  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    if (isWorkday(d)) remaining--;
  }
  return d.toISOString().slice(0, 10);
}

/**
 * 计算两个日期之间的工作日天数（只跳周六日，含首不含尾）。
 * a < b 时返回正数；a ≥ b 返回 0。
 */
export function workdaysBetween(a: string, b: string): number {
  const start = new Date(a.slice(0, 10));
  const end = new Date(b.slice(0, 10));
  if (start >= end) return 0;
  let count = 0;
  const d = new Date(start);
  while (d < end) {
    d.setDate(d.getDate() + 1);
    if (isWorkday(d)) count++;
  }
  return count;
}

// ─── 报价模板 ────────────────────────────────────────────

export interface QuoteTemplate {
  id: string;
  name: string;
  /** 增项结构（岗位 → 默认人天/日均） */
  upliftStructure: Record<string, { dailyRate: number }>;
  /** 岗位日成本默认值 */
  roleDailyCostDefaults: RoleDailyCostConfig;
  /** 工期参考（工作日） */
  durationReference: number;
}
