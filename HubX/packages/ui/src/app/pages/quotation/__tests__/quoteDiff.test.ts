import { describe, expect, it } from 'vitest';
import { buildQuoteDiff } from '../quoteDiff';
import { initialQuotes } from '../mockData';

describe('quote diff', () => {
  it('只比较重新报价链中的业务字段', () => {
    const before = structuredClone(initialQuotes[0]);
    const after = { ...structuredClone(before), id: 'q2', previousQuoteId: 'q1', summary: { totalLaborDays: 0, projectWorkDays: 20, grandTotalPrice: 100000, paymentTerms: [], taxIncluded: true, warrantyYears: 1 } };
    const result = buildQuoteDiff(before, after);
    expect(result.find((item) => item.key === 'amount')).toMatchObject({ changed: true, after: '¥100,000' });
    expect(result.map((item) => item.key)).toEqual(['features', 'days', 'addons', 'amount', 'schedule', 'payment', 'warranty', 'files']);
  });
});
