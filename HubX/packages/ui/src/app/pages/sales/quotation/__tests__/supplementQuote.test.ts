import { describe, expect, it } from 'vitest';
import {
  canCreateSupplementQuote,
  canVoidConfirmedQuote,
  buildSupplementQuote,
  buildSupplementQuotePrefill,
} from '../supplementQuote';
import type { Quote } from '../types';
import type { Contract } from '../../contracts/types';

function fakeContract(id: string, extra?: Partial<Contract>): Contract {
  return { id, contractNo: `CT${id}`, status: 'archived', current: {} as any, createdAt: '2026-08-01', ...extra } as Contract;
}

function fakeQuote(id: string, extra?: Partial<Quote>): Quote {
  return {
    id, quoteNo: `QT-${id}`, version: 'v1.0', status: 'confirmed', leadId: 'lead-1',
    salesOwnerName: '张三', basicInfo: { projectName: 'P', projectType: '', creatorName: '',
    techEvaluatorName: '', requirementDesc: '', customerName: 'C', customerContact: '',
    customerPhone: '', quoteValidityDays: 30 }, endpointConfigs: [], featureList: [],
    salesAddedRoles: [], frontendConfig: { platforms: [] }, backendConfig: { services: [], language: '' },
    travelOnsite: { enableTravel: false, travelSubtotal: 0, enableOnsite: false, onsiteSubtotal: 0 },
    otherCosts: [], auditNodes: [], stampNode: { stamperName: '', status: 'LOCKED' },
    timeline: [], ccSalesNames: [], createdAt: '2026-08-01', updatedAt: '2026-08-01',
    ...extra,
  } as Quote;
}

describe('canCreateSupplementQuote', () => {
  it('主合同已批准 → 可建', () => {
    expect(canCreateSupplementQuote(fakeContract('c1', { approvedAt: '2026-08-10' }))).toBe(true);
  });

  it('主合同未批准 → 不可建', () => {
    expect(canCreateSupplementQuote(fakeContract('c1', { approvedAt: undefined }))).toBe(false);
  });

  it('合同已作废 → 不可建', () => {
    expect(canCreateSupplementQuote(fakeContract('c1', { status: 'voided', approvedAt: '2026-08-10' }))).toBe(false);
  });

  it('无合同 → 不可建', () => {
    expect(canCreateSupplementQuote(undefined)).toBe(false);
  });
});

describe('buildSupplementQuote', () => {
  it('基于主报价创建补充报价', () => {
    const source = fakeQuote('q1', { contractId: 'ct-1' });
    const result = buildSupplementQuote({
      sourceQuote: source,
      contractId: 'ct-1',
      newId: 'q-sup-1',
      newQuoteNo: 'QT-2026-3',
    });
    expect(result.id).toBe('q-sup-1');
    expect(result.quoteNo).toBe('QT-2026-3');
    expect(result.isSupplement).toBe(true);
    expect(result.contractId).toBe('ct-1');
    expect(result.status).toBe('draft');
    expect(result.featureList).toEqual([]);
    expect(result.supplementChangeAmount).toBe(0);
    expect(result.summary?.grandTotalPrice).toBe(0);
  });
});

describe('buildSupplementQuotePrefill', () => {
  it('预填金额=报价总价', () => {
    const quote = fakeQuote('q1', { summary: { grandTotalPrice: -5000 } as any });
    const prefill = buildSupplementQuotePrefill(quote);
    expect(prefill.changeAmount).toBe(-5000);
  });
});

describe('canVoidConfirmedQuote', () => {
  it('有未作废合同 → 不可废止', () => {
    const quote = fakeQuote('q1', { status: 'confirmed' });
    const contracts = [fakeContract('c1', { quoteId: 'q1', status: 'archived' })];
    expect(canVoidConfirmedQuote(quote, contracts).allowed).toBe(false);
  });

  it('无未作废合同 → 可废止', () => {
    const quote = fakeQuote('q1', { status: 'confirmed' });
    const contracts = [fakeContract('c1', { quoteId: 'q1', status: 'voided' })];
    expect(canVoidConfirmedQuote(quote, contracts).allowed).toBe(true);
  });

  it('报价未确认 → 不可废止', () => {
    expect(canVoidConfirmedQuote(fakeQuote('q1', { status: 'sent' }), []).allowed).toBe(false);
  });
});
