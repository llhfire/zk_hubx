import { describe, expect, it } from 'vitest';
import { initialQuotes } from '../mockData';
import { computeAmountBreakdown } from '../quoteFlow';
import { generateQuoteHtml } from '../quotePdfTemplate';

describe('generateQuoteHtml', () => {
  it('输出客户版式且不暴露内部计价字段', () => {
    const quote = initialQuotes[0];
    const html = generateQuoteHtml({
      quote,
      breakdown: computeAmountBreakdown(quote),
      company: {
        name: '中科公司',
        address: '湖南省长沙市',
        phone: '0731-00000000',
        representative: '授权代表',
      },
    });

    expect(html).toContain('公司介绍');
    expect(html).toContain('软件开发服务费');
    expect(html).toContain('授权代表');
    expect(html).not.toMatch(/岗位成本|日单价|利润率|人力成本/);
  });
});
