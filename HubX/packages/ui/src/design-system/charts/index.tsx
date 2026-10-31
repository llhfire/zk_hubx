/**
 * 图表适配层 —— 页面取图表的唯一入口。
 *
 * 为什么要有这一层：
 * 1. **出口单一**：`recharts` 只能在设计系统内部出现。页面直接 `import … from 'recharts'`
 *    等于绕开色板与刻度样式，严格门禁会把它算成直接 UI 引用。
 * 2. **颜色只在这里**：以前页面上 `fill="var(--primary)"`、`stroke="#165dff"`、
 *    `stroke="#00b42a"` 各自为政，深色主题下只有一部分会换色。
 * 3. **默认值只写一次**：刻度字号、轴色、网格虚线、Tooltip 卡片样式、扇区缝隙。
 *
 * 用法（都在 `Chart.` 下，一个入口）：
 *
 * ```tsx
 * <Chart.Canvas height={280}>
 *   <Chart.LineChart data={rows}>
 *     <Chart.Grid />
 *     <Chart.XAxis dataKey="month" />
 *     <Chart.YAxis />
 *     <Chart.Tooltip />
 *     <Chart.Legend />
 *     <Chart.Line dataKey="receivable" name="应收" stroke={Chart.tone.primary} />
 *     <Chart.Line dataKey="collected" name="实收" stroke={Chart.tone.success} />
 *   </Chart.LineChart>
 * </Chart.Canvas>
 * ```
 *
 * 类别色用 `Chart.series(i)`（位置即语义），状态色用 `Chart.tone.*`（与 StatusTag 同源）。
 */

import type { ComponentProps } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import {
  CHART_AXIS_STROKE,
  CHART_GRID_STROKE,
  CHART_ON_SERIES,
  CHART_SERIES,
  CHART_SURFACE,
  CHART_TICK,
  CHART_TONE,
  chartSeriesColor,
  type ChartTone,
} from './tokens';

type CanvasProps = Omit<ComponentProps<typeof ResponsiveContainer>, 'width' | 'height'> & {
  /** 高度：数字按像素，`'100%'` 跟随外层固定高度的容器 */
  height?: number | `${number}%`;
};

/** 画布：宽度永远撑满，高度由调用点决定 */
function Canvas({ height = 280, ...rest }: CanvasProps) {
  return <ResponsiveContainer width="100%" height={height} {...rest} />;
}

function Grid({ stroke = CHART_GRID_STROKE, ...rest }: ComponentProps<typeof CartesianGrid>) {
  return <CartesianGrid strokeDasharray="3 3" stroke={stroke} {...rest} />;
}

function ChartXAxis({ tick, ...rest }: ComponentProps<typeof XAxis>) {
  return <XAxis stroke={CHART_AXIS_STROKE} tick={tick ?? CHART_TICK} {...rest} />;
}

function ChartYAxis({ tick, ...rest }: ComponentProps<typeof YAxis>) {
  return <YAxis stroke={CHART_AXIS_STROKE} tick={tick ?? CHART_TICK} {...rest} />;
}

/** Tooltip 卡片：贴底色 + 描边 + 极轻阴影，字号跟随表格次要文字 */
const TOOLTIP_CONTENT_STYLE = {
  background: 'var(--color-bg-2)',
  border: '1px solid var(--color-border-2)',
  borderRadius: 'var(--radius-sm)',
  boxShadow: 'var(--ds-shadow-subtle)',
  fontSize: 'var(--text-xs)',
  padding: '6px 10px',
};

function ChartTooltip({ contentStyle, labelStyle, itemStyle, ...rest }: ComponentProps<typeof Tooltip>) {
  return (
    <Tooltip
      contentStyle={contentStyle ?? TOOLTIP_CONTENT_STYLE}
      labelStyle={labelStyle ?? { color: 'var(--color-text-2)', marginBottom: 4 }}
      itemStyle={itemStyle ?? { padding: '2px 0' }}
      {...rest}
    />
  );
}

function ChartLegend({ wrapperStyle, iconSize = 8, ...rest }: ComponentProps<typeof Legend>) {
  return <Legend wrapperStyle={wrapperStyle ?? { fontSize: 'var(--text-xs)' }} iconSize={iconSize} {...rest} />;
}

function ChartLine({ type = 'monotone', ...rest }: ComponentProps<typeof Line>) {
  return <Line type={type} {...rest} />;
}

function ChartPie({ fill = CHART_SERIES[0], stroke = CHART_SURFACE, ...rest }: ComponentProps<typeof Pie>) {
  return <Pie fill={fill} stroke={stroke} {...rest} />;
}

function ChartRadar({ fillOpacity = 0.15, ...rest }: ComponentProps<typeof Radar>) {
  return <Radar fillOpacity={fillOpacity} {...rest} />;
}

function ChartPolarGrid({ stroke = CHART_GRID_STROKE, ...rest }: ComponentProps<typeof PolarGrid>) {
  return <PolarGrid stroke={stroke} {...rest} />;
}

function ChartPolarAngleAxis({ tick, ...rest }: ComponentProps<typeof PolarAngleAxis>) {
  return <PolarAngleAxis tick={tick ?? CHART_TICK} {...rest} />;
}

function ChartPolarRadiusAxis({ tick, ...rest }: ComponentProps<typeof PolarRadiusAxis>) {
  return <PolarRadiusAxis tick={tick ?? CHART_TICK} {...rest} />;
}

export const Chart = {
  /* 画布与坐标系 */
  Canvas,
  Grid,
  XAxis: ChartXAxis,
  YAxis: ChartYAxis,
  Tooltip: ChartTooltip,
  Legend: ChartLegend,
  /* 图形 */
  BarChart,
  Bar,
  LineChart,
  Line: ChartLine,
  PieChart,
  Pie: ChartPie,
  Cell,
  RadarChart,
  Radar: ChartRadar,
  PolarGrid: ChartPolarGrid,
  PolarAngleAxis: ChartPolarAngleAxis,
  PolarRadiusAxis: ChartPolarRadiusAxis,
  /* 色板与语义色 */
  SERIES: CHART_SERIES,
  series: chartSeriesColor,
  tone: CHART_TONE,
  /** 扇区/色块之间的缝隙色 */
  SURFACE: CHART_SURFACE,
  /** 压在色块上的文字色 */
  ON_SERIES: CHART_ON_SERIES,
} as const;

export type { ChartTone, PieLabelRenderProps };
