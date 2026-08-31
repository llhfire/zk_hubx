// 客户报价单模板：字段和版式依据《中科【软通】报价模板.docx》适配。

import { buildQuoteTemplateLines, ZKRT_QUOTE_TEMPLATE } from './quoteDocumentTemplate';
import type { Quote } from './types';
import type { QuoteAmountBreakdown } from './quoteFlow';

export interface PdfTemplateData {
  quote: Quote;
  breakdown: QuoteAmountBreakdown;
  company: {
    name: string;
    logo?: string;
    address: string;
    phone: string;
    representative: string;
  };
  isSupplement?: boolean;
  watermark?: string;
}

function escape(value: string | number | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(value: number): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dateText(value?: string): string {
  const parsed = value ? new Date(value.replace(' ', 'T')) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function paymentDescription(quote: Quote): string {
  const terms = quote.summary?.paymentTerms ?? [];
  if (!terms.length) return '具体付款节点以双方最终签订的合同为准。';
  return terms.map((term) => `${term.stage}${term.percent}%`).join('，') + '。';
}

function renderQuoteRows(quote: Quote): string {
  const lines = buildQuoteTemplateLines(quote);
  if (!lines.length) return '<tr><td colspan="6" class="empty">暂无报价明细</td></tr>';
  return lines.map((line, index) => {
    const previous = lines[index - 1];
    const endpointStart = !previous || previous.endpoint !== line.endpoint;
    const moduleStart = !previous || previous.endpoint !== line.endpoint || previous.module !== line.module;
    const endpointSpan = endpointStart ? lines.slice(index).findIndex((item) => item.endpoint !== line.endpoint) : 0;
    const moduleSpan = moduleStart ? lines.slice(index).findIndex((item) => item.endpoint !== line.endpoint || item.module !== line.module) : 0;
    const normalizedEndpointSpan = endpointSpan < 0 ? lines.length - index : endpointSpan;
    const normalizedModuleSpan = moduleSpan < 0 ? lines.length - index : moduleSpan;
    return `<tr>
      ${endpointStart ? `<td rowspan="${normalizedEndpointSpan}">${escape(line.endpoint)}</td>` : ''}
      ${moduleStart ? `<td rowspan="${normalizedModuleSpan}">${escape(line.module)}</td>` : ''}
      <td>${escape(line.feature)}</td>
      <td class="number">${line.days > 0 ? line.days.toFixed(1) : '—'}</td>
      <td class="number">${money(line.amount)}</td>
      <td class="number">${line.moduleSubtotal == null ? '—' : money(line.moduleSubtotal)}</td>
    </tr>`;
  }).join('');
}

export function generateQuoteHtml(data: PdfTemplateData): string {
  const { quote, breakdown, company, watermark, isSupplement } = data;
  const projectWorkDays = quote.fileFlow?.quoteWorkDays ?? quote.evalSheet?.manualWorkDays ?? quote.summary?.projectWorkDays ?? 0;
  const selfPaidRows = quote.otherCosts.map((cost) => `<tr>
    <td>${escape(cost.name)}</td>
    <td>${escape(cost.note || '按实际采购')}（参考金额：¥${money(cost.amount)}）</td>
    <td>客户自费，不计入项目总价</td>
  </tr>`).join('');
  const invoiceType = quote.summary?.invoiceType === '普票' ? '增值税普通发票' : '增值税专用发票';

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#eef1f5;color:#172033;font-family:SimSun,"Songti SC",serif;font-size:14px;line-height:1.7}
  .quote-doc{width:794px;margin:0 auto;background:#fff}.page{position:relative;min-height:1123px;padding:64px 72px;page-break-after:always}.page:last-child{page-break-after:auto}
  .watermark{position:fixed;z-index:9;top:46%;left:50%;transform:translate(-50%,-50%) rotate(-28deg);font:700 72px/1 sans-serif;color:rgba(15,45,76,.07);pointer-events:none}
  .brand{color:#123d68;font-family:"Microsoft YaHei",sans-serif;font-weight:700}.company-name{font-size:22px;margin-top:92px}.document-title{font-size:38px;letter-spacing:18px;margin:8px 0 12px}.brand-rule{height:1px;background:#315c83;margin-bottom:130px}
  .recipient{display:inline-grid;grid-template-columns:auto auto;border:1px solid #172033;margin-bottom:42px}.recipient span{padding:2px 10px}.recipient span:last-child{color:#a22}.date{color:#a22;font-weight:700;margin-left:156px}
  h2{margin:18px 0 28px;text-align:center;color:#123d68;font:700 24px/1.4 "Microsoft YaHei",sans-serif}h3{color:#123d68;margin:28px 0 10px;font-size:17px}.lead{margin:0 0 24px;text-indent:2em;text-align:justify}
  table{width:100%;border-collapse:collapse;table-layout:fixed;margin:16px 0 28px}th,td{border:1px solid #27313e;padding:7px 8px;vertical-align:middle;word-break:break-word}th{background:#123d68;color:#fff;text-align:center;font-family:"Microsoft YaHei",sans-serif}.summary-table th{width:24%;background:#f2f4f7;color:#172033;text-align:left}.summary-table tr:last-child td{background:#fff3d2;color:#b42318;font-weight:700}.number{text-align:right;font-variant-numeric:tabular-nums}.empty{text-align:center;color:#7b8492}
  .notes{margin:0;padding-left:22px}.notes li{margin:4px 0}.company-intro p{margin:0 0 12px;text-align:justify}.company-intro strong{display:block;margin-bottom:2px}
  .quote-lines{font-size:12px}.quote-lines th:nth-child(1){width:18%}.quote-lines th:nth-child(2){width:17%}.quote-lines th:nth-child(3){width:25%}.quote-lines th:nth-child(n+4){width:13.33%}.quote-total td{background:#fff3d2;font-weight:700;color:#b42318}
  .signature{margin-top:70px;text-align:right}.signature strong{font-size:16px}.signature-grid{margin-top:44px;display:grid;grid-template-columns:auto 1fr auto 1fr;gap:12px 14px;text-align:left;align-items:end}.line{border-bottom:1px solid #172033;min-height:24px}
  @media print{body{background:#fff}.quote-doc{width:auto}.page{width:210mm;min-height:297mm;margin:0;box-shadow:none}}
</style></head><body><div class="quote-doc">
${watermark ? `<div class="watermark">${escape(watermark)}</div>` : ''}
<section class="page cover">
  <div class="brand company-name">${escape(company.name)}</div>
  <div class="brand document-title">${isSupplement ? '补充报价单' : '报价单'}</div>
  <div class="brand-rule"></div>
  <div class="recipient"><span>致</span><span>${escape(quote.basicInfo.customerName || '客户')}</span></div>
  <div class="date">日期：${dateText(quote.createdAt)}</div>
</section>
<section class="page">
  <h2>项目整体报价</h2>
  <p class="lead">贵司委托我司开发的【${escape(quote.basicInfo.projectName)}】项目，经双方沟通确认，我司已完成需求分析与技术评估。本报价覆盖已确认的端口、功能模块、实施服务与交付范围，详细内容以本报价清单及双方最终签订的合同为准。</p>
  <table class="summary-table"><tbody>
    <tr><th>项目名称</th><td>${escape(quote.basicInfo.projectName)}</td></tr>
    <tr><th>项目工期</th><td>${projectWorkDays > 0 ? `${projectWorkDays} 个工作日（具体以合同签订为准）` : '待确认'}</td></tr>
    <tr><th>开发人天</th><td>${breakdown.totalLaborDays.toFixed(1)} 人天</td></tr>
    <tr><th>项目总价</th><td>人民币 ¥${money(breakdown.grandTotal)}</td></tr>
  </tbody></table>
  <h3>备注说明</h3>
  <ol class="notes">
    <li>以上报价为含税价格，包含${invoiceType}。</li>
    <li>付款方式：${escape(paymentDescription(quote))}</li>
    <li>项目交付后，提供 ${quote.summary?.warrantyYears ?? 1} 年免费维护服务。</li>
    <li>如需增加或调整功能点，双方评估后另行计费并形成书面变更。</li>
  </ol>
  <div class="company-intro">
    <h2 style="margin-top:70px">公司介绍</h2>
    <p><strong>${escape(company.name)}</strong>成立于 2021 年，核心团队自 2018 年起持续从事软件技术服务，提供需求咨询、产品设计、技术研发、测试交付与运营维护的一站式定制开发服务。</p>
    <p><strong>技术实力</strong>研发团队覆盖 Java、PHP、Python、Go、Vue、React、Uni-App、Flutter、微信小程序等主流技术栈，并按项目质量管理流程完成设计、开发、测试与交付。</p>
    <p><strong>团队经验</strong>核心成员拥有 10 年以上软件研发与项目管理经验，已服务金融、医疗、教育、零售、制造等行业客户并交付百余个项目。</p>
  </div>
</section>
<section class="page">
  <h2>详细报价清单</h2>
  <table class="quote-lines"><thead><tr><th>端口/平台</th><th>模块</th><th>功能</th><th>人天(天)</th><th>单价(元)</th><th>小计(元)</th></tr></thead><tbody>
    ${renderQuoteRows(quote)}
    <tr class="quote-total"><td colspan="5" style="text-align:right">合计</td><td class="number">${money(breakdown.grandTotal)}</td></tr>
  </tbody></table>
  <h3>可能涉及的其他费用（自费项目）</h3>
  <table><thead><tr><th>费用类型</th><th>说明</th><th>备注</th></tr></thead><tbody>
    ${selfPaidRows || '<tr><td colspan="3" class="empty">暂无客户自费项目</td></tr>'}
  </tbody></table>
  <div class="signature">
    <strong>${escape(company.name)}</strong><div>（此处加盖公章）</div>
    <div class="signature-grid"><span>授权代表：</span><span class="line">${escape(company.representative)}</span><span>日期：</span><span class="line">${dateText(quote.sentAt ?? quote.updatedAt ?? quote.createdAt)}</span><span>电话：</span><span class="line">${escape(company.phone)}</span><span>地址：</span><span class="line">${escape(company.address)}</span></div>
  </div>
</section>
</div></body></html>`;
}

export function getDraftWatermark(status: string): string | undefined {
  if (status === 'draft' || status === 'pending_eval' || status === 'pending_quote' || status === 'rejected') return '草稿预览';
  return undefined;
}

export { ZKRT_QUOTE_TEMPLATE };
