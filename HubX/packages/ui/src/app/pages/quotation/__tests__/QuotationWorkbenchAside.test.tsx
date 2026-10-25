import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { QuotationWorkbench } from '../QuotationWorkbench';
import type { Quote } from '../types';

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ quoteId: 'quote-test-aside-1' }),
    Link: ({ children, to, className }: any) => createElement('a', { href: to, className }, children),
  };
});

vi.mock('@/app/pages/employee/EmployeeContext', () => ({
  useEmployee: () => ({ employees: [] }),
}));

vi.mock('@/app/todos/TodoContext', () => ({
  useTodos: () => ({ activeTodos: [], updateTodo: vi.fn() }),
}));

const mockQuote: Quote = {
  id: 'quote-test-aside-1',
  quoteNo: 'QT-2026-ASIDE-01',
  version: 'v1.0',
  status: 'pending_quote',
  leadId: 'lead-test-1',
  salesOwnerName: '王销售',
  flowMode: 'online',
  basicInfo: {
    projectName: '微商城小程序定制研发',
    projectType: '其他定制',
    creatorName: '李产品',
    techEvaluatorName: '张架构',
    requirementDesc: '支持微信支付与分销',
    customerName: '某新零售电商科技',
    customerContact: '李总',
    customerPhone: '13800001111',
    quoteValidityDays: 30,
  },
  endpointConfigs: [],
  featureList: [],
  salesAddedRoles: [],
  frontendConfig: { platforms: [] },
  backendConfig: { services: [], language: 'Java' },
  travelOnsite: {
    enableTravel: false,
    travelCity: '',
    travelDays: 0,
    travelHeadcount: 0,
    travelSubtotal: 0,
    travelDetails: [],
    enableOnsite: false,
    onsiteCity: '',
    onsiteDays: 0,
    onsiteDailyCost: 0,
    onsiteSubtotal: 0,
    onsiteDetails: [],
  },
  otherCosts: [],
  auditNodes: [
    { auditorId: 'u-1', auditorName: '技术负责人-罗总', role: '技术把关', quoteRole: 'tech_lead', status: 'PENDING' },
    { auditorId: 'u-2', auditorName: '财务部-赵主管', role: '利润把关', quoteRole: 'finance', status: 'PENDING' },
  ],
  stampNode: { status: 'NOT_STARTED' },
};

vi.mock('../QuotationContext', () => ({
  useQuotation: () => ({
    getQuoteById: (id: string) => (id === mockQuote.id ? mockQuote : undefined),
    currentRole: 'sales',
    currentViewer: '王销售',
    isAdmin: true,
    markVoided: vi.fn(),
    reassignOwner: vi.fn(),
    deleteQuote: vi.fn(),
    createNewVersion: vi.fn(),
    isLeadFrozen: () => false,
    loading: false,
    decideAudit: vi.fn(),
    stampQuote: vi.fn(),
    updateQuote: vi.fn(),
  }),
}));

describe('报价工作台最右侧【报价动态】与【审批流程】高密度侧边栏测试', () => {
  it('1. 正确渲染最右侧aside并应用紧凑样式类 quotation-workbench__aside', () => {
    const html = renderToStaticMarkup(createElement(QuotationWorkbench));

    // 侧边栏样式类挂载
    expect(html).toContain('quotation-workbench__aside');

    // 包含【报价动态】卡片与字段
    expect(html).toContain('报价动态');
    expect(html).toContain('客户');
    expect(html).toContain('某新零售电商科技');
    expect(html).toContain('当前阶段');
    expect(html).toContain('总报价');
    expect(html).toContain('报价有效期');
    expect(html).toContain('30 天');

    // 包含【审批流程】卡片与节点
    expect(html).toContain('审批流程');
    expect(html).toContain('技术负责人-罗总');
    expect(html).toContain('财务部-赵主管');
  });

  it('2. 顶部步进条包含四阶段引导描述，侧边栏审批流程纯只读无冗余操作按钮并带全景闭环节点', () => {
    const html = renderToStaticMarkup(createElement(QuotationWorkbench));

    // 顶部步进条阶段引导描述
    expect(html).toContain('功能拆解与范围定义');
    expect(html).toContain('研发角色人天评估');
    expect(html).toContain('商务增项与阶梯定价');

    // 侧边栏审批全景只读闭环节点
    expect(html).toContain('公章管理员');
    expect(html).toContain('企业公章加盖');
    expect(html).toContain('客户成交闭环');

    // 彻底消灭侧边栏重复操作表单与按钮
    expect(html).not.toContain('同意并通过');
    expect(html).not.toContain('驳回报价');
    expect(html).not.toContain('确认使用所选文件');
  });
});
