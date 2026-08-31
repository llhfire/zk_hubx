import { describe, expect, it } from 'vitest';
import { initialQuotes } from '../mockData';
import { buildQuoteTemplateLines, getQuoteTemplateLineTotal, getQuoteTemplateMissingFields } from '../quoteDocumentTemplate';
import { computeAmountBreakdown } from '../quoteFlow';

describe('quoteDocumentTemplate', () => {
  it('把端、模块、功能和评估人天映射为 Word 模板六列表', () => {
    const quote = initialQuotes[0];
    const lines = buildQuoteTemplateLines(quote);
    expect(lines[0]).toMatchObject({
      endpoint: '用户端（微信小程序）',
      module: '首页展示',
      feature: '品牌 Banner 轮播',
    });
    expect(lines[0].amount).toBeGreaterThan(0);
    expect(lines[0].moduleSubtotal).toBeGreaterThan(0);
    const featureDays = lines.filter((line) => !['项目增项', '项目服务'].includes(line.endpoint)).reduce((sum, line) => sum + line.days, 0);
    const evaluationDays = quote.evalSheet?.evaluationUnits.reduce((sum, unit) => sum + unit.totalDays, 0) ?? 0;
    expect(featureDays).toBeCloseTo(evaluationDays, 5);
    expect(getQuoteTemplateMissingFields(quote)).toEqual([]);
  });

  it.each(initialQuotes.map((quote) => [quote.quoteNo, quote] as const))('报价 %s 的清单金额与总额守恒', (_quoteNo, quote) => {
    expect(getQuoteTemplateLineTotal(quote)).toBeCloseTo(computeAmountBreakdown(quote).grandTotal, 2);
  });

  it('补充报价把协议变更额单列，不要求填写原项目工期', () => {
    const quote = initialQuotes.find((item) => item.isSupplement)!;
    const lines = buildQuoteTemplateLines(quote);
    expect(lines.some((line) => line.id === 'quote-supplement-adjustment')).toBe(true);
    expect(getQuoteTemplateMissingFields(quote)).not.toContain('项目工期');
  });
});
