// 客户报价单 PDF 模板
// 按中科标准件版式：封面→整体报价→详细清单→自费项目→签章
// 数据流转：盖章生成无水印正式版；文件流转在线编辑终稿+扫描件

import type { Quote } from './types';
import type { QuoteAmountBreakdown } from './quoteFlow';

export interface PdfTemplateData {
  quote: Quote;
  breakdown: QuoteAmountBreakdown;
  /** 签约主体信息 */
  company: {
    name: string;
    logo?: string;
    address: string;
    phone: string;
    representative: string;
  };
  /** 是否为补充报价 */
  isSupplement?: boolean;
  /** 水印文字（草稿预览用，盖章后为空） */
  watermark?: string;
}

/** 生成报价单 HTML（供 html2canvas 渲染或在线预览） */
export function generateQuoteHtml(data: PdfTemplateData): string {
  const { quote, breakdown, company, watermark, isSupplement } = data;
  const today = new Date().toISOString().slice(0, 10);

  const featureRows = quote.featureList.flatMap(mod =>
    mod.subFeatures.map(sub => `
      <tr>
        <td>${mod.name}</td>
        <td>${sub.name}</td>
        <td>${sub.description || '-'}</td>
      </tr>
    `)
  ).join('');

  const selfPaidRows = quote.otherCosts.map(c => `
    <tr><td>${c.name}</td><td>¥${c.amount.toLocaleString()}</td><td>${c.note || '-'}</td></tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Microsoft YaHei', sans-serif; font-size: 12px; color: #333; padding: 40px; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 60px; color: rgba(200,200,200,0.3); pointer-events: none; z-index: 999; }
  .cover { text-align: center; padding: 80px 0; }
  .cover h1 { font-size: 28px; margin-bottom: 20px; }
  .cover .subtitle { font-size: 16px; color: #666; }
  .section { margin: 30px 0; }
  .section h2 { font-size: 16px; border-bottom: 2px solid #165DFF; padding-bottom: 8px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #e5e5e5; padding: 8px 12px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  .summary { background: #f0f5ff; padding: 16px; border-radius: 8px; }
  .summary .total { font-size: 20px; color: #165DFF; font-weight: bold; }
  .stamp-area { margin-top: 60px; display: flex; justify-content: space-between; }
  .stamp-box { width: 200px; text-align: center; }
  .stamp-box .line { border-bottom: 1px solid #333; height: 60px; margin-bottom: 8px; }
</style>
</head>
<body>
${watermark ? `<div class="watermark">${watermark}</div>` : ''}

<div class="cover">
  <h1>${company.name}</h1>
  <div class="subtitle">${isSupplement ? '补充' : ''}报价单</div>
  <div style="margin-top: 20px; color: #999;">
    编号：${quote.quoteNo}<br>
    日期：${today}<br>
    客户：${quote.basicInfo.customerName}
  </div>
</div>

<div class="section">
  <h2>项目信息</h2>
  <table>
    <tr><th>项目名称</th><td>${quote.basicInfo.projectName}</td><th>项目类型</th><td>${quote.basicInfo.projectType}</td></tr>
    <tr><th>客户名称</th><td>${quote.basicInfo.customerName}</td><th>联系人</th><td>${quote.basicInfo.customerContact}</td></tr>
    <tr><th>产品经理</th><td>${quote.basicInfo.creatorName}</td><th>技术评估</th><td>${quote.basicInfo.techEvaluatorName}</td></tr>
  </table>
</div>

<div class="section">
  <h2>公司介绍</h2>
  <p style="line-height: 1.8;">
    ${company.name} 为客户提供软件产品设计、研发实施与交付服务。本报价以双方确认的需求范围为依据，
    由项目团队按约定流程完成设计、开发、测试与上线支持。
  </p>
  <table>
    <tr><th>地址</th><td>${company.address}</td><th>联系电话</th><td>${company.phone}</td></tr>
    <tr><th>授权代表</th><td colspan="3">${company.representative}</td></tr>
  </table>
</div>

<div class="section">
  <h2>功能清单</h2>
  <table>
    <tr><th>模块</th><th>子功能</th><th>描述</th></tr>
    ${featureRows}
  </table>
</div>

<div class="section">
  <h2>费用汇总</h2>
  <div class="summary">
    <table>
      <tr><th>软件开发服务费</th><td>¥${breakdown.laborSubtotal.toLocaleString()}</td></tr>
      <tr><th>差旅驻场</th><td>¥${(breakdown.travelSubtotal + breakdown.onsiteSubtotal).toLocaleString()}</td></tr>
      ${breakdown.selfPaidSubtotal > 0 ? `<tr><th>自费项目（不计入报价）</th><td>¥${breakdown.selfPaidSubtotal.toLocaleString()}</td></tr>` : ''}
      <tr><th>项目总报价</th><td class="total">¥${breakdown.grandTotal.toLocaleString()}</td></tr>
    </table>
  </div>
</div>

${quote.otherCosts.length > 0 ? `
<div class="section">
  <h2>自费项目（不计入报价总价）</h2>
  <table>
    <tr><th>项目</th><th>金额</th><th>备注</th></tr>
    ${selfPaidRows}
  </table>
</div>
` : ''}

<div class="stamp-area">
  <div class="stamp-box">
    <div class="line"></div>
    <div>甲方（客户）签章</div>
  </div>
  <div class="stamp-box">
    <div class="line"></div>
    <div>乙方（${company.name}）签章</div>
  </div>
</div>

</body>
</html>
  `.trim();
}

/** 生成水印文字（草稿预览用） */
export function getDraftWatermark(status: string): string | undefined {
  if (status === 'draft' || status === 'pending_eval' || status === 'pending_quote' || status === 'rejected') {
    return '草稿预览';
  }
  return undefined;
}
