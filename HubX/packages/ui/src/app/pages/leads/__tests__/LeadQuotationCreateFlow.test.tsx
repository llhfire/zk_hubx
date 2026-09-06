import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildNewQuote } from '../../../../services/quotationMutations';
import { LeadQuotationManager } from '../components/LeadQuotationManager';

describe('新建报价与数据流转方式闭环测试 (LeadQuotationCreateFlow)', () => {
  it('1. 选择「数据流转方式 (flowMode: online)」正确生成报价单并初始化功能清单', () => {
    const newQuote = buildNewQuote(
      'quote-new-online-1',
      'QT-2026-ONLINE-001',
      'lead-1',
      [],
      {
        projectName: '电商小程序定制开发项目',
        customerName: '某品牌服饰电商公司',
        customerContact: '李总',
        customerPhone: '13800003333',
      },
      '张销售',
      'online',
    );

    expect(newQuote.id).toBe('quote-new-online-1');
    expect(newQuote.flowMode).toBe('online');
    expect(newQuote.status).toBe('draft');
    expect(newQuote.version).toBe('v1.0');
    expect(newQuote.featureList.length).toBeGreaterThan(0);
    expect(newQuote.basicInfo.projectName).toBe('电商小程序定制开发项目');
  });

  it('2. 选择「文件流转方式 (flowMode: file)」正确生成包含 fileFlow 结构的报价单', () => {
    const newQuote = buildNewQuote(
      'quote-new-file-1',
      'QT-2026-FILE-001',
      'lead-1',
      [],
      {
        projectName: '工业控制系统定制研发',
        customerName: '某智能装备制造厂',
      },
      '王销售',
      'file',
    );

    expect(newQuote.flowMode).toBe('file');
    expect(newQuote.fileFlow).toBeDefined();
    expect(newQuote.fileFlow?.onlineDocument.status).toBe('empty');
  });

  it('3. LeadQuotationManager 正确渲染新生成的在线数据流转方案', () => {
    const onlineQuote = buildNewQuote(
      'quote-test-online-99',
      'QT-2026-ONLINE-099',
      'lead-1',
      [],
      {
        projectName: '数字化智能看板项目',
        customerName: '某工业互联网企业',
      },
      '张销售',
      'online',
    );

    const markup = renderToStaticMarkup(
      createElement(LeadQuotationManager, {
        leadId: 'lead-1',
        leadName: '数字化智能看板项目',
        quotes: [onlineQuote],
        onOpenWorkbench: () => {},
        onCreateQuote: () => {},
      })
    );

    expect(markup).toContain('数字化智能看板项目');
    expect(markup).toContain('QT-2026-ONLINE-099');
    expect(markup).toContain('在线数据流转');
    expect(markup).toContain('v1.0');
  });

  it('4. LeadQuotationManager 正确渲染新生成的文件流转方案', () => {
    const fileQuote = buildNewQuote(
      'quote-test-file-99',
      'QT-2026-FILE-099',
      'lead-1',
      [],
      {
        projectName: '离线部署安全网关项目',
        customerName: '某涉密研究所',
      },
      '李销售',
      'file',
    );

    const markup = renderToStaticMarkup(
      createElement(LeadQuotationManager, {
        leadId: 'lead-1',
        leadName: '离线部署安全网关项目',
        quotes: [fileQuote],
        onOpenWorkbench: () => {},
        onCreateQuote: () => {},
      })
    );

    expect(markup).toContain('离线部署安全网关项目');
    expect(markup).toContain('QT-2026-FILE-099');
    expect(markup).toContain('文件流转');
    expect(markup).toContain('v1.0');
  });
});
