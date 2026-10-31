import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LeadTransferPopover } from '../LeadTransferPopover';
import { LeadsProvider } from '../LeadContext';

const renderTrigger = (props: { followCount?: number; daysHeld?: number; budget?: number }) => renderToStaticMarkup(
  createElement(
    LeadsProvider,
    null,
    createElement(LeadTransferPopover, {
      leadId: '5957',
      followCount: props.followCount ?? 2,
      daysHeld: props.daysHeld ?? 1,
      budget: props.budget,
    }),
  ),
);

/**
 * 触发器与流转记录表格的样式全部在 LeadTransferPopover.css 里，
 * 视觉属性不再写成内联 style —— 一旦有人加回来，strict 门禁会直接失败。
 */
describe('LeadTransferPopover 触发器', () => {
  it('两行触发器用样式类承载排版，不再内联视觉样式', () => {
    const markup = renderTrigger({});

    expect(markup).toContain('lead-transfer-popover__trigger');
    expect(markup).toContain('lead-transfer-popover__trigger-line');
    expect(markup).toContain('2次 · 1天');
    expect(markup).not.toMatch(/style="[^"]*(font-size|color)[^"]*"/);
  });

  it('无预算时显示金额占位符「—」，有预算时走 MoneyText 统一格式', () => {
    expect(renderTrigger({})).toContain('lead-transfer-popover__trigger-budget">—<');
    expect(renderTrigger({ budget: 1200000 })).toContain('¥1,200,000');
    expect(renderTrigger({ budget: 1234.5 })).toContain('¥1,234.5');
  });

  it('无障碍标签带上跟进次数与持有天数', () => {
    const markup = renderTrigger({ followCount: 3, daysHeld: 8 });

    expect(markup).toContain('aria-label="查看流转记录，跟进 3 次，持有 8 天"');
    expect(markup).toContain('3次 · 8天');
  });
});
