import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Chart } from '../charts';
import { STATUS_TONE_VARS } from '../primitives/StatusTag';

const HEX_OR_RGB = /#[0-9a-f]{3,8}\b|rgba?\(\s*\d|hsla?\(\s*\d/i;

/**
 * 图表适配层是「色值与默认样式只有一个出口」的落点：
 * 页面拿到的每一档颜色都必须是 token，否则深色主题下会有一半图表不换色。
 */
describe('图表适配层色板', () => {
  it('系列色全部是 --chart-* token，不含写死色值', () => {
    expect(Chart.SERIES).toHaveLength(5);
    for (const color of Chart.SERIES) {
      expect(color).toMatch(/^var\(--chart-[1-5]\)$/);
      expect(color).not.toMatch(HEX_OR_RGB);
    }
  });

  it('系列色按位置取，越界与负数都不会取到 undefined', () => {
    expect(Chart.series(0)).toBe(Chart.SERIES[0]);
    expect(Chart.series(4)).toBe(Chart.SERIES[4]);
    expect(Chart.series(5)).toBe(Chart.SERIES[0]);
    expect(Chart.series(-3)).toBe(Chart.SERIES[0]);
    expect(Chart.series(7.8)).toBe(Chart.SERIES[2]);
  });

  it('语义色与 StatusTag 同源，不另开一套状态色', () => {
    expect(Chart.tone.success).toBe(STATUS_TONE_VARS.success.fg);
    expect(Chart.tone.warning).toBe(STATUS_TONE_VARS.warning.fg);
    expect(Chart.tone.danger).toBe(STATUS_TONE_VARS.danger.fg);
    expect(Chart.tone.info).toBe(STATUS_TONE_VARS.info.fg);
    expect(Chart.tone.neutral).toBe(STATUS_TONE_VARS.neutral.fg);
    for (const color of Object.values(Chart.tone)) {
      expect(color).not.toMatch(HEX_OR_RGB);
    }
  });

  it('扇区缝隙与色块文字也是 token，深色主题跟着换', () => {
    expect(Chart.SURFACE).toBe('var(--color-bg-2)');
    expect(Chart.ON_SERIES).toBe('var(--color-white)');
  });
});

type ChartElement = { props: Record<string, unknown> };

/**
 * 适配层自己就是「包一层默认值」：直接调用包装组件，看它产出的 recharts 元素上
 * 真正带出去的 props。recharts 在服务端不渲染图形，只能这样验默认值合并。
 */
const propsOf = (element: unknown) => (element as ChartElement).props;

describe('图表适配层默认样式', () => {
  it('网格、坐标轴、刻度默认吃 token', () => {
    const grid = propsOf(Chart.Grid({}));
    expect(grid.stroke).toBe('var(--color-border-2)');
    expect(grid.strokeDasharray).toBe('3 3');

    const xAxis = propsOf(Chart.XAxis({ dataKey: 'month' }));
    expect(xAxis.stroke).toBe('var(--color-text-3)');
    expect(xAxis.tick).toEqual({ fontSize: 'var(--text-xs)', fill: 'var(--color-text-3)' });

    const yAxis = propsOf(Chart.YAxis({}));
    expect(yAxis.tick).toEqual({ fontSize: 'var(--text-xs)', fill: 'var(--color-text-3)' });
  });

  it('调用点传的值覆盖默认值，不会被吃掉', () => {
    const xAxis = propsOf(Chart.XAxis({ tick: { fontSize: 'var(--text-sm)' } }));
    expect(xAxis.tick).toEqual({ fontSize: 'var(--text-sm)' });

    const legend = propsOf(Chart.Legend({ iconSize: 12 }));
    expect(legend.iconSize).toBe(12);
  });

  it('扇区缝隙走底色 token，缝隙不写白', () => {
    const pie = propsOf(Chart.Pie({ data: [], dataKey: 'value' }));
    expect(pie.stroke).toBe('var(--color-bg-2)');
    expect(pie.fill).toBe(Chart.SERIES[0]);
  });

  it('Tooltip 卡片用 token 组样式，不再是 recharts 默认描边', () => {
    const tooltip = propsOf(Chart.Tooltip({}));
    expect(tooltip.contentStyle).toMatchObject({
      background: 'var(--color-bg-2)',
      border: '1px solid var(--color-border-2)',
      fontSize: 'var(--text-xs)',
    });
  });
});
