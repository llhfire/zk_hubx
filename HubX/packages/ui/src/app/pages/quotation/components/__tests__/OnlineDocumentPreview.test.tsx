import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OnlineDocumentPreview } from '../OnlineDocumentPreview';
import { QuotePageThumbnails } from '../QuotePageThumbnails';
import { generateQuoteHtml, type PdfTemplateData } from '../../quotePdfTemplate';

function createMockTemplateData(): PdfTemplateData {
  return {
    quote: {
      id: 'quote-test-doc',
      quoteNo: 'QT-2026-DOC-001',
      version: 'v1.0',
      status: 'pending_quote',
      leadId: 'lead-test',
      salesOwnerName: '张经理',
      flowMode: 'file',
      basicInfo: {
        projectName: '智能工业管理平台',
        projectType: '软件定制',
        creatorName: '王工',
        techEvaluatorName: '李工',
        requirementDesc: '包含物联网与后台',
        customerName: '某智能制造集团',
        customerContact: '陈总',
        customerPhone: '13900001111',
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
        onsiteDelivery: false,
        onsiteStaff: '',
        onsiteDays: 0,
      },
      otherCosts: [],
      auditNodes: [],
      stampNode: { status: 'pending' },
      timeline: [],
      ccSalesNames: [],
    },
    breakdown: {
      items: [],
      subtotalDays: 20,
      subtotalAmount: 160000,
      managementFee: 16000,
      taxFee: 10560,
      grandTotal: 186560,
    },
    company: {
      name: '中科软通（北京）科技有限公司',
      address: '北京市海淀区科技园',
      contact: '400-800-8888',
    },
    isSupplement: false,
  };
}

describe('OnlineDocumentPreview 在线审阅与修改工作台', () => {
  it('1. 渲染工作台主入口按钮与状态指示标签', () => {
    const data = createMockTemplateData();
    const markup = renderToStaticMarkup(
      createElement(OnlineDocumentPreview, {
        data,
        document: { status: 'saved', savedAt: '2026-09-06 21:00' },
        onDocumentChange: vi.fn(),
        quoteStatus: 'pending_quote',
      })
    );

    expect(markup).toContain('在线预览与修改报价单');
    expect(markup).toContain('一键保存当前版本');
    expect(markup).toContain('下载报价单 HTML');
    expect(markup).toContain('已保存于 2026-09-06 21:00');
  });

  it('2. 未保存时呈现警示标识与保存提醒', () => {
    const data = createMockTemplateData();
    const markup = renderToStaticMarkup(
      createElement(OnlineDocumentPreview, {
        data,
        document: { status: 'draft' },
        onDocumentChange: vi.fn(),
        quoteStatus: 'pending_quote',
      })
    );

    expect(markup).toContain('未保存 — 必须保存过才能提交审批');
    expect(markup).toContain('在提交审批前，请务必点击「在线预览与修改报价单」核对条款并保存终稿');
  });
});

describe('QuotePageThumbnails 左侧 6 页高拟真缩略图组件', () => {
  it('3. 正确渲染 6 页缩略图卡片且高亮当前激活页', () => {
    const markup = renderToStaticMarkup(
      createElement(QuotePageThumbnails, {
        currentPage: 2,
        onSelectPage: vi.fn(),
        collapsed: false,
        onToggleCollapse: vi.fn(),
        customerName: '某智能制造集团',
        projectName: '智能工业管理平台',
        grandTotal: 186560,
      })
    );

    expect(markup).toContain('页面缩略图');
    expect(markup).toContain('共 6 页');
    expect(markup).toContain('某智能制造集团');
    expect(markup).toContain('智能工业管理平台');
    expect(markup).toContain('封面');
    expect(markup).toContain('报价+盖章');
    expect(markup).toContain('公司介绍');
    expect(markup).toContain('清单(一)');
    expect(markup).toContain('清单(二)');
    expect(markup).toContain('自费+盖章');
    expect(markup).toContain('当前页');
  });
});

describe('generateQuoteHtml 标准 A4 HTML 规范与单页模式 CSS', () => {
  it('4. 生成的 HTML 包含 6 个独立 A4 页面容器及专属 data-page 与 id', () => {
    const data = createMockTemplateData();
    const html = generateQuoteHtml(data);

    expect(html).toContain('id="quote-page-1" data-page="1"');
    expect(html).toContain('id="quote-page-2" data-page="2"');
    expect(html).toContain('id="quote-page-3" data-page="3"');
    expect(html).toContain('id="quote-page-4" data-page="4"');
    expect(html).toContain('id="quote-page-5" data-page="5"');
    expect(html).toContain('id="quote-page-6" data-page="6"');
  });

  it('5. 包含完善的 scoped 单页模式 CSS 控制规则（非内联强行修改）', () => {
    const data = createMockTemplateData();
    const html = generateQuoteHtml(data);

    expect(html).toContain('.quote-doc-container.single-page-mode .a4-page');
    expect(html).toContain('display: none !important');
    expect(html).toContain('.quote-doc-container.single-page-mode .a4-page.single-page-active');
    expect(html).toContain('display: block !important');
    expect(html).toContain('.quote-doc-container.single-page-mode .a4-page.cover-page.single-page-active');
    expect(html).toContain('display: flex !important');
  });
});
