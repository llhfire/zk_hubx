import { describe, expect, it } from 'vitest';
import { applyDealQuotePrefill, buildDealQuotePrefill, paymentTermsToPlans } from '../dealQuotePrefill';
import type { Quote, QuoteSummary } from '../../quotation/types';
import type { ContractFormData } from '../types';

function makeSummary(): QuoteSummary {
  return {
    totalLaborDays: 40,
    projectWorkDays: 90,
    grandTotalPrice: 300000,
    paymentTerms: [
      { stage: '合同签订首付款', percent: 50, amount: 150000 },
      { stage: '系统交付款', percent: 40, amount: 0 },
      { stage: '验收尾款', percent: 10, amount: 0 },
    ],
    taxIncluded: true,
    warrantyYears: 2,
    invoiceType: '专票',
  };
}

function makeQuote(): Quote {
  return {
    id: 'q-deal-1',
    quoteNo: 'ZK-20260818-001',
    version: 'v1.0',
    status: 'deal',
    leadId: 'lead-9',
    basicInfo: {
      projectName: '智慧园区管理平台',
      projectType: '管理系统',
      creatorName: '李四',
      techEvaluatorName: '罗总',
      requirementDesc: '园区一体化管理',
      customerName: '智慧园区科技公司',
      customerContact: '王总',
      customerPhone: '13900000000',
      quoteValidityDays: 30,
    },
    endpointConfigs: [],
    featureList: [],
    salesAddedRoles: [],
    frontendConfig: {} as Quote['frontendConfig'],
    backendConfig: {} as Quote['backendConfig'],
    travelOnsite: {} as Quote['travelOnsite'],
    otherCosts: [],
    summary: makeSummary(),
    auditNodes: [],
    stampNode: { stamperName: '黄海', status: 'COMPLETED' },
    timeline: [],
    ccSalesNames: [],
    createdAt: '2026-08-01',
    updatedAt: '2026-08-18',
  };
}

function makeBaseForm(): ContractFormData {
  return {
    contractName: '',
    productCategory: '软件开发',
    signingEntity: '中科软艺',
    signingEntityTaxNo: '',
    signingPerson: '',
    signingEntityAddress: '',
    signingEntityPhone: '',
    signingEntityEmail: '',
    signingEntityPostalCode: '',
    customerName: '',
    customerContact: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    customerTaxNo: '',
    customerPostalCode: '',
    bankName: '',
    bankAccount: '',
    contractContent: '乙方按甲方需求规格说明书完成系统设计、开发、测试、部署及培训，提供 12 个月免费质保。',
    signDate: '2026-08-18',
    effectiveDate: '2026-08-19',
    endDate: '2026-12-31',
    paymentMethod: '对公',
    privatePaymentChannel: undefined,
    privatePaymentRecipient: '',
    privatePaymentAccount: '',
    totalAmount: 0,
    rebateAmount: 0,
    paymentPlans: [],
    templateId: 'software_sales',
  };
}

describe('paymentTermsToPlans', () => {
  it('付款条款映射为期次：首付->首期款、交付->二期款、验收尾款->尾款，金额缺省按比例折算', () => {
    const plans = paymentTermsToPlans(makeSummary());
    expect(plans).toHaveLength(3);
    expect(plans[0].periodName).toBe('首期款');
    expect(plans[0].amount).toBe(150000);
    expect(plans[1].periodName).toBe('二期款');
    expect(plans[1].amount).toBe(120000); // 300000 * 40%
    expect(plans[2].periodName).toBe('尾款');
    expect(plans[2].amount).toBe(30000);
    expect(plans[2].condition).toBe('验收尾款');
  });

  it('无 summary 时返回空数组', () => {
    expect(paymentTermsToPlans(undefined)).toEqual([]);
  });
});

describe('buildDealQuotePrefill', () => {
  it('抽取报价关键信息', () => {
    const prefill = buildDealQuotePrefill(makeQuote());
    expect(prefill.quoteId).toBe('q-deal-1');
    expect(prefill.leadId).toBe('lead-9');
    expect(prefill.totalAmount).toBe(300000);
    expect(prefill.projectWorkDays).toBe(90);
    expect(prefill.warrantyYears).toBe(2);
    expect(prefill.customerName).toBe('智慧园区科技公司');
  });
});

describe('applyDealQuotePrefill', () => {
  it('空表单补齐合同名/客户信息/金额/期次，按工期重算终止日期，质保写进正文', () => {
    const result = applyDealQuotePrefill(makeBaseForm(), buildDealQuotePrefill(makeQuote()));
    expect(result.contractName).toBe('智慧园区管理平台合同');
    expect(result.customerName).toBe('智慧园区科技公司');
    expect(result.totalAmount).toBe(300000);
    expect(result.paymentPlans).toHaveLength(3);
    // 生效日 2026-08-19 + 90 个工作日
    expect(result.endDate).toBe('2026-12-23');
    expect(result.contractContent).toContain('2 年免费质保');
    expect(result.invoiceType).toBe('专票');
  });

  it('减额补充报价保留负金额并标记父合同', () => {
    const quote = makeQuote();
    quote.isSupplement = true;
    quote.contractId = 'contract-main-1';
    quote.summary = { ...makeSummary(), grandTotalPrice: -5000 };
    const prefill = buildDealQuotePrefill(quote);
    const result = applyDealQuotePrefill(makeBaseForm(), prefill);
    expect(prefill.kind).toBe('supplement');
    expect(prefill.parentContractId).toBe('contract-main-1');
    expect(result.totalAmount).toBe(-5000);
  });

  it('线索已有的客户信息优先（不为空不覆盖）', () => {
    const base = { ...makeBaseForm(), customerName: '线索客户' };
    const result = applyDealQuotePrefill(base, buildDealQuotePrefill(makeQuote()));
    expect(result.customerName).toBe('线索客户');
    expect(result.totalAmount).toBe(300000);
  });
});
