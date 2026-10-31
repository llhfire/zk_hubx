/**
 * 图表色板与刻度样式 —— 页面里不再出现图表色值。
 *
 * 两套颜色，用途不同，别混：
 *
 * 1. `CHART_SERIES`（分类系列色）取自 theme.css 的 `--chart-1..5`，用于「多个并列
 *    类别」——饼图扇区、成本构成、多平台雷达。**位置即语义**：第 1 类永远是
 *    `--chart-1`，这样同一组类别在饼图、图例、排行条上颜色一致，切换筛选不换色。
 * 2. `CHART_TONE`（语义色）用于「状态 / 好坏」——应收与实收、现金流确定性分层。
 *    值直接复用 `STATUS_TONE_VARS`，与旁边 StatusTag 完全同源，不会出现
 *    「图例是绿色、标签是另一种绿色」。
 *
 * 图表只吃 token，不写 hex：`--chart-*` 与 `--ds-tone-*` 在深色主题下会一起换，
 * 写死的 `#165dff` 不会。
 */

import { STATUS_TONE_VARS } from '../primitives/StatusTag';

/** 多类别系列色，顺序固定（深色主题自动换色） */
export const CHART_SERIES: readonly string[] = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

/**
 * 取第 `index` 个系列色。
 *
 * 索引必须来自**固定的类别顺序**（例如 `['labor', 'travel', …]`），不能来自
 * 「当前数据里第几条」：否则某个类别缺数据时后面所有类别会集体串色。
 */
export function chartSeriesColor(index: number): string {
  const safe = Math.max(0, Math.trunc(index));
  return CHART_SERIES[safe % CHART_SERIES.length];
}

/**
 * 语义色：与 StatusTag 同源，图表里表示状态/好坏时用它，不要用系列色。
 *
 * ⚠️ `info` 与 `primary` 是同一个蓝（Arco 的 info 就是主色）。同一张图里要区分
 * 「主色」与「另一个类别」时用 `cyan`，否则两条线会撞色。
 */
export const CHART_TONE = {
  primary: 'rgb(var(--primary-6))',
  success: STATUS_TONE_VARS.success.fg,
  warning: STATUS_TONE_VARS.warning.fg,
  danger: STATUS_TONE_VARS.danger.fg,
  info: STATUS_TONE_VARS.info.fg,
  neutral: STATUS_TONE_VARS.neutral.fg,
  purple: STATUS_TONE_VARS.purple.fg,
  cyan: STATUS_TONE_VARS.cyan.fg,
  gold: STATUS_TONE_VARS.gold.fg,
} as const;

export type ChartTone = keyof typeof CHART_TONE;

/** 网格线：与卡片描边同一档，图表不抢内容 */
export const CHART_GRID_STROKE = 'var(--color-border-2)';

/** 坐标轴与刻度：比正文浅一档，仍然可读 */
export const CHART_AXIS_STROKE = 'var(--color-text-3)';

/** 刻度文字：与表格次要列同字号 */
export const CHART_TICK = { fontSize: 'var(--text-xs)', fill: 'var(--color-text-3)' } as const;

/** 扇区之间的缝隙用底色而不是白：深色主题下白色描边会变成一圈亮线 */
export const CHART_SURFACE = 'var(--color-bg-2)';

/** 压在色块上的文字（饼图扇区内的百分比） */
export const CHART_ON_SERIES = 'var(--color-white)';
