// 客户报价单模板：1:1 严格复刻《中科-微官网(基础版)-报价单.pdf》标准件排版与高清印章

import { buildQuoteTemplateLines, ZKRT_QUOTE_TEMPLATE } from './quoteDocumentTemplate';
import type { Quote } from './types';
import type { QuoteAmountBreakdown } from './quoteFlow';
import type { QuoteAssetBundle } from './quoteAssets';
import { formatAmountPlain as money } from '../../../utils/money';

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
  /**
   * 内嵌图片资源（logo / 印章）。由调用方先 `await loadQuoteAssets()` 传入。
   * 缺省时用 1x1 透明占位，保证函数保持同步；生产路径必须传入。
   */
  assets?: QuoteAssetBundle;
}

function escape(value: string | number | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toChineseCurrency(num: number): string {
  if (!num || num === 0) return '零元整';
  if (num >= 10000) {
    const wan = (num / 10000).toFixed(1).replace(/\.0$/, '');
    return `${wan} 万元整`;
  }
  return `${money(num)} 元整`;
}

function dateText(value?: string): string {
  const parsed = value ? new Date(value.replace(' ', 'T')) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function dateDotText(value?: string): string {
  const parsed = value ? new Date(value.replace(' ', 'T')) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

function paymentDescription(quote: Quote): string {
  if (quote.fileFlow?.paymentPlan?.milestones?.length) {
    return quote.fileFlow.paymentPlan.milestones
      .map((m) => `${m.name} ${m.ratio}%${m.note ? `（${m.note}）` : ''}`)
      .join('，') + '。';
  }
  const terms = quote.summary?.paymentTerms ?? [];
  if (terms.length) {
    return terms.map((term) => `${term.stage} ${term.percent}%`).join('，') + '。';
  }
  return '合同签订后预付 50%，项目交付前支付 40%，验收后支付 10%。';
}

// 原 PDF 标准件 22 项功能清单明细（原版 6 页标准件基准）
export interface StandardFeatureRow {
  seq: number;
  module: string;
  sub: string;
  desc: string;
  remark: string;
}

const DEFAULT_STANDARD_FEATURES: StandardFeatureRow[] = [
  // Page 4 承载前 4 个模块（合计 14 行）
  { seq: 1, module: '首页展示', sub: '品牌Banner轮播', desc: '首页顶部轮播展示品牌核心宣传内容，支持图片/视频轮播，展示最新产品、活动、品牌理念等', remark: '支持后台配置轮播内容' },
  { seq: 2, module: '首页展示', sub: '快捷入口导航', desc: '首页设置核心功能快捷入口，如产品中心、技术与研发、联系我们、客户留资等', remark: '可自定义图标和跳转链接' },
  { seq: 4, module: '首页展示', sub: '热点内容推荐', desc: '首页推荐最新新闻资讯、热门产品、行业洞察等内容', remark: '支持手动设置推荐内容' },
  { seq: 5, module: '首页展示', sub: '市场行业分类入口', desc: '展示行业分类入口', remark: '点击进入对应行业解决方案页' },

  { seq: 6, module: '关于我们', sub: '公司简介', desc: '图文展示贵公司简介', remark: '支持图文+视频展示' },
  { seq: 7, module: '关于我们', sub: '发展历程', desc: '企业发展里程碑时间轴', remark: '交互展示' },
  { seq: 8, module: '关于我们', sub: '企业文化与使命', desc: '展示企业使命、核心价值观、ESG理念等', remark: '-' },

  { seq: 13, module: '产品中心', sub: '产品分类导航', desc: '按产品型分类', remark: '支持多级分类' },
  { seq: 17, module: '产品中心', sub: '创新产品推荐', desc: '展示创新产品', remark: '可设置热门标签' },
  { seq: 18, module: '产品中心', sub: '产品详情展示', desc: '单个产品详情页，包含产品图片、规格参数、材料结构、应用场景、优势特点、相关产品推荐等', remark: '可转发商品详情到微信、收藏商品、联系我们' },
  { seq: 19, module: '产品中心', sub: '产品搜索', desc: '支持关键词搜索产品名称、类别、应用行业等', remark: '支持模糊搜索和筛选' },

  { seq: 33, module: '新闻资讯', sub: '公司新闻', desc: '展示企业最新新闻、公告、财报信息等，如领导层任命、工厂扩建、获奖消息等', remark: '列表+详情页' },
  { seq: 34, module: '新闻资讯', sub: '行业资讯/洞察', desc: '发布行业趋势分析、包装技术洞察、市场研究报告等内容', remark: '支持分类浏览' },
  { seq: 35, module: '新闻资讯', sub: '活动与展会', desc: '展示即将参加的行业展会和会议', remark: '支持添加到日历' },

  // Page 5 承载后 3 个模块（及新闻资讯第 4 项，合计 12 行）
  { seq: 36, module: '新闻资讯', sub: '成功案例', desc: '展示与客户合作的包装解决方案案例', remark: '图文+视频展示' },

  { seq: 38, module: '客户留资', sub: '在线留资表单', desc: '提供结构化留资表单，字段包括：姓名、手机号或微信号', remark: '支持表单验证' },
  { seq: 44, module: '客户留资', sub: '留资成功反馈', desc: '提交成功后显示感谢页面，告知预计响应时间，并提供相关资源推荐', remark: '可配置自动回复' },
  { seq: 47, module: '客户留资', sub: '留资数据管理', desc: '后台管理所有留资数据，支持筛选、导出', remark: '-' },

  { seq: 58, module: '会员中心', sub: '注册/登录', desc: '支持手机号+验证码注册，微信授权登录', remark: '-' },
  { seq: 60, module: '会员中心', sub: '我的留资/咨询记录', desc: '用户可查看自己提交的留资记录、咨询记录和处理进度', remark: '-' },
  { seq: 61, module: '会员中心', sub: '我的收藏', desc: '用户可收藏感兴趣的产品、解决方案、新闻等', remark: '-' },

  { seq: 63, module: '后台管理', sub: '内容管理系统(CMS)', desc: '支持图文、视频、文件等多媒体内容的发布、编辑、排序、上下架', remark: '富文本编辑器' },
  { seq: 64, module: '后台管理', sub: '产品管理', desc: '产品信息的新增、编辑、分类管理、上下架', remark: '-' },
  { seq: 66, module: '后台管理', sub: '数据统计分析', desc: '访问量、页面浏览、用户行为、留资转化等数据统计', remark: '可视化报表' },
  { seq: 67, module: '后台管理', sub: '用户管理', desc: '后台用户权限管理、角色分配', remark: '-' },
  { seq: 68, module: '后台管理', sub: 'SEO优化配置', desc: '页面标题、描述、关键词等SEO元素配置', remark: '-' },
];

// 标准默认自费项目清单（原 PDF 第 5~6 页标准件）
const DEFAULT_SELF_PAID_ITEMS = [
  { name: '服务器', spec: '阿里云/腾讯云，2 核 4G 约 2000-4000 元/年', note: '按实际采购' },
  { name: '对象存储 OSS', spec: '图片/文件存储，约 500-1500 元/年', note: '按实际采购' },
  { name: '短信费用', spec: '0.03-0.05 元/条，按量计费', note: '按实际采购' },
  { name: '微信认证', spec: '微信小程序认证 300 元/年', note: '按实际采购' },
  { name: '微信支付', spec: '费率 0.6%，按交易额收取', note: '微信收取' },
  { name: '电子发票平台', spec: '航信/百望等平台开户及服务费', note: '按实际采购' },
];

/**
 * 渲染包含合并单元格的表格行 HTML
 */
function renderFeatureTableRows(rows: StandardFeatureRow[]): string {
  // 计算当前切片中各模块连续出现次数（用于 rowspan）
  let html = '';
  let i = 0;
  while (i < rows.length) {
    const currentModule = rows[i].module;
    let span = 0;
    while (i + span < rows.length && rows[i + span].module === currentModule) {
      span++;
    }

    for (let j = 0; j < span; j++) {
      const item = rows[i + j];
      const modTd = j === 0 ? `<td class="text-center font-bold" rowspan="${span}">${escape(item.module)}</td>` : '';
      html += `<tr>
        <td class="text-center">${item.seq}</td>
        ${modTd}
        <td class="font-bold">${escape(item.sub)}</td>
        <td class="text-desc">${escape(item.desc)}</td>
        <td class="text-center text-remark">${escape(item.remark)}</td>
      </tr>`;
    }
    i += span;
  }
  return html;
}

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export function generateQuoteHtml(data: PdfTemplateData): string {
  const { quote, breakdown, company, watermark, isSupplement, assets } = data;
  // 资源未加载时退化为透明像素，避免输出 "undefined" 字符串。
  const logo = assets?.logo || TRANSPARENT_PIXEL;
  const seal = assets?.seal || TRANSPARENT_PIXEL;
  const projectName = quote.basicInfo.projectName || '微官网系统定制研发项目';
  const customerName = quote.basicInfo.customerName || '和昇塑料制品有限公司';

  const projectWorkDays =
    quote.fileFlow?.quoteWorkDays ??
    quote.fileFlow?.evaluationWorkDays ??
    quote.evalSheet?.manualWorkDays ??
    quote.summary?.projectWorkDays ??
    20;

  const totalLaborDays =
    quote.fileFlow?.evaluationTotalDays ??
    (breakdown.totalLaborDays > 0 ? breakdown.totalLaborDays : (quote.summary?.totalLaborDays || 30));

  const grandTotal =
    quote.fileFlow?.quoteAmount ??
    (breakdown.grandTotal > 0 ? breakdown.grandTotal : (quote.summary?.grandTotalPrice || 19000));

  const warrantyYears = quote.fileFlow?.warrantyYears ?? quote.summary?.warrantyYears ?? 1;
  const invoiceType =
    quote.fileFlow?.invoiceType ??
    (quote.summary?.invoiceType === '普票' ? '增值税普通发票' : '增值税专用发票');

  // 构建功能清单数据集合
  let featureRows: StandardFeatureRow[] = [];
  if (quote.featureList && quote.featureList.length > 0 && quote.featureList.some((m) => m.subFeatures?.length > 0)) {
    let seq = 1;
    quote.featureList.forEach((mod) => {
      const endpointSuffix = mod.endpointId ? ` (${mod.endpointId})` : '';
      const modTitle = `${mod.name}${endpointSuffix}`;
      if (!mod.subFeatures || mod.subFeatures.length === 0) {
        featureRows.push({
          seq: seq++,
          module: modTitle,
          sub: '-',
          desc: '-',
          remark: '-',
        });
      } else {
        mod.subFeatures.forEach((sub) => {
          featureRows.push({
            seq: seq++,
            module: modTitle,
            sub: sub.name,
            desc: sub.description || '-',
            remark: sub.remark || '支持多端/后台',
          });
        });
      }
    });
  } else {
    // 兼容回退与单测
    const lines = buildQuoteTemplateLines(quote);
    if (lines.length > 0 && lines.some((l) => l.feature)) {
      lines.forEach((line, idx) => {
        featureRows.push({
          seq: idx + 1,
          module: `${line.module} (${line.endpoint})`,
          sub: line.feature,
          desc: '包含端口/平台交互与研发落地',
          remark: line.days > 0 ? `${line.days.toFixed(1)} 人天(天)` : '支持配置',
        });
      });
    } else {
      // 默认使用原版 PDF 标准件 22 项清单
      featureRows = DEFAULT_STANDARD_FEATURES;
    }
  }

  // 1:1 分页切片：Page 4 放前 14 项，Page 5 放剩余项
  const SPLIT_INDEX = 14;
  const page4Rows = featureRows.slice(0, SPLIT_INDEX);
  const page5Rows = featureRows.slice(SPLIT_INDEX);

  const page4TableHtml = renderFeatureTableRows(page4Rows);
  const page5TableHtml = renderFeatureTableRows(page5Rows);

  // 自费项目列表
  const selfPaidList =
    quote.otherCosts && quote.otherCosts.length > 0
      ? quote.otherCosts.map((c) => ({
          name: c.name,
          spec: c.note || '按实际采购',
          note: '按实际采购',
        }))
      : DEFAULT_SELF_PAID_ITEMS;

  // 原版 PDF：第 5 页放第 1 行（服务器），第 6 页放剩余 5 行
  const p5SelfPaid = selfPaidList.slice(0, 1);
  const p6SelfPaid = selfPaidList.slice(1);

  const renderSelfPaidRows = (items: typeof selfPaidList) =>
    items
      .map(
        (item) => `<tr>
          <td class="font-bold text-center">${escape(item.name)}</td>
          <td>${escape(item.spec)}</td>
          <td class="text-center">${escape(item.note)}</td>
        </tr>`
      )
      .join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${escape(projectName)} - 报价单</title>
  <style>
    /* 严格 scoped 样式，仅在当前文档容器与打印视图生效 */
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 0;
      background: #525659;
      color: #000000;
      font-family: SimSun, "Songti SC", "STSong", "Microsoft YaHei", serif;
      font-size: 13.5px;
      line-height: 1.65;
      -webkit-font-smoothing: antialiased;
    }
    .quote-doc-container {
      width: 794px;
      margin: 0 auto;
    }
    .a4-page {
      position: relative;
      width: 794px;
      min-height: 1123px;
      height: auto;
      box-sizing: border-box;
      margin: 0 auto 28px auto;
      padding: 42px 64px 68px 64px;
      background: #ffffff;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
      page-break-after: always;
      overflow: visible;
    }
    .a4-page:last-child {
      margin-bottom: 0;
      page-break-after: auto;
    }

    /* 水印 */
    .draft-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 96px;
      font-weight: bold;
      color: rgba(220, 38, 38, 0.08);
      letter-spacing: 24px;
      pointer-events: none;
      z-index: 100;
      user-select: none;
    }

    /* 分页胶囊指示器（屏幕预览专属，打印时自动隐藏） */
    .page-top-badge {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: -24px -36px 18px -36px;
      padding: 6px 16px;
      background: #f7f8fa;
      border-radius: 4px;
      border: 1px dashed #d9d9d9;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      font-size: 11.5px;
      color: #666666;
      user-select: none;
    }
    .badge-num {
      font-weight: 600;
      color: #165dff;
      background: #e8f3ff;
      padding: 2px 8px;
      border-radius: 10px;
    }
    .badge-title {
      font-size: 11px;
      color: #8c8c8c;
    }

    /* 单页查看模式样式 */
    .quote-doc-container.single-page-mode .a4-page {
      display: none !important;
    }
    .quote-doc-container.single-page-mode .a4-page.single-page-active {
      display: block !important;
      margin-bottom: 0 !important;
    }
    .quote-doc-container.single-page-mode .a4-page.cover-page.single-page-active {
      display: flex !important;
      margin-bottom: 0 !important;
    }

    /* 页眉与页脚 (Page 2~6) */
    .page-header {
      margin-bottom: 24px;
    }
    .header-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 8px;
    }
    .header-logo {
      height: 22px;
      width: auto;
      object-fit: contain;
    }
    .header-divider {
      color: #808080;
      font-size: 14px;
    }
    .header-company-name {
      font-size: 14px;
      font-family: SimSun, "Songti SC", "Microsoft YaHei", sans-serif;
      color: #333333;
    }
    .header-rule {
      height: 1px;
      background: #222222;
      width: 100%;
    }
    .page-footer {
      position: absolute;
      bottom: 36px;
      left: 64px;
      right: 64px;
    }
    .footer-rule {
      height: 1px;
      background: #222222;
      width: 100%;
      margin-bottom: 8px;
    }
    .footer-page-num {
      text-align: center;
      font-size: 12px;
      font-family: Arial, sans-serif;
      color: #333333;
    }

    /* ─── 封面专属样式 (Page 1) ─── */
    .cover-page {
      padding: 90px 64px 60px 64px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .cover-logo-wrap {
      margin-top: 10px;
      margin-bottom: 60px;
      text-align: center;
    }
    .cover-logo-img {
      width: 320px;
      height: auto;
    }
    .cover-company-title {
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 2px;
      color: #000000;
      margin-bottom: 24px;
      font-family: "Microsoft YaHei", "SimHei", sans-serif;
      text-align: center;
    }
    .cover-main-title {
      font-size: 42px;
      font-weight: bold;
      letter-spacing: 24px;
      padding-left: 24px;
      color: #003366;
      margin-bottom: 28px;
      font-family: SimSun, "Songti SC", serif;
      text-align: center;
    }
    .cover-blue-line {
      width: 540px;
      height: 1.5px;
      background: #003366;
      margin: 0 auto 130px auto;
    }
    .cover-table {
      width: 540px;
      border-collapse: collapse;
      margin-bottom: 50px;
    }
    .cover-table td {
      border: 1px solid #333333;
      padding: 7px 16px;
      font-size: 14px;
    }
    .cover-table td.zhi-label {
      width: 120px;
      background: #e8e8e8;
      text-align: center;
      font-weight: bold;
      letter-spacing: 6px;
      padding-left: 6px;
    }
    .cover-table td.customer-val {
      text-align: center;
      font-weight: normal;
    }
    .cover-date-text {
      font-size: 14px;
      color: #000000;
      letter-spacing: 2px;
      text-align: center;
      width: 100%;
      font-family: SimSun, "Songti SC", serif;
    }

    /* ─── 正文与章节排版 ─── */
    .section-title {
      text-align: center;
      font-size: 22px;
      font-weight: bold;
      color: #003366;
      margin-top: 10px;
      margin-bottom: 24px;
      font-family: "Microsoft YaHei", "SimHei", sans-serif;
      letter-spacing: 1px;
    }
    .lead-paragraph {
      text-indent: 2em;
      text-align: justify;
      line-height: 1.8;
      font-size: 14px;
      color: #111111;
      margin-bottom: 30px;
    }

    /* 整体报价 4 行核心表格 */
    .overview-table-container {
      position: relative;
      margin-bottom: 30px;
    }
    .overview-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #333333;
    }
    .overview-table td {
      border: 1px solid #333333;
      padding: 10px 14px;
      font-size: 14px;
    }
    .overview-table td.label-cell {
      width: 140px;
      background: #e8e8e8;
      font-weight: bold;
      text-align: center;
      color: #000000;
    }
    .overview-table tr.total-price-row td {
      background: #fff2cc;
      font-weight: bold;
    }
    .overview-table tr.total-price-row td.val-cell {
      color: #000000;
      font-size: 15px;
    }

    /* 备注说明 */
    .notes-block {
      margin-top: 24px;
    }
    .notes-heading {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 12px;
      color: #000000;
    }
    .notes-list {
      margin: 0;
      padding-left: 22px;
      line-height: 2.0;
      font-size: 13.5px;
      color: #222222;
    }

    /* 公司介绍各小节 */
    .company-intro-sub {
      text-align: center;
      font-size: 15px;
      font-weight: bold;
      color: #000000;
      margin-top: -12px;
      margin-bottom: 4px;
    }
    .company-intro-tagline {
      text-align: center;
      font-size: 13px;
      color: #555555;
      margin-bottom: 22px;
    }
    .intro-section-title {
      font-size: 14px;
      font-weight: bold;
      color: #000000;
      margin-top: 18px;
      margin-bottom: 6px;
    }
    .intro-paragraph {
      text-align: justify;
      line-height: 1.75;
      font-size: 13.5px;
      color: #222222;
      margin: 0 0 10px 0;
    }

    /* 清单大表格 */
    .quote-lines-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #333333;
      margin-top: 14px;
      font-size: 12px;
    }
    .quote-lines-table th {
      background: #1f4e79;
      color: #ffffff;
      padding: 8px 6px;
      font-size: 12.5px;
      font-weight: bold;
      border: 1px solid #333333;
      text-align: center;
      font-family: "Microsoft YaHei", sans-serif;
    }
    .quote-lines-table td {
      border: 1px solid #333333;
      padding: 6px 8px;
      vertical-align: middle;
      line-height: 1.45;
    }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .text-desc { color: #222222; text-align: justify; }
    .text-remark { color: #333333; font-size: 11.5px; }

    /* 自费项目表格 */
    .self-paid-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #333333;
      margin-top: 12px;
      font-size: 12.5px;
    }
    .self-paid-table th {
      background: #f2f2f2;
      color: #000000;
      padding: 7px 10px;
      font-weight: bold;
      border: 1px solid #333333;
      text-align: center;
      font-size: 12.5px;
    }
    .self-paid-table td {
      border: 1px solid #333333;
      padding: 7px 10px;
      line-height: 1.5;
    }

    /* 鲜红公章印章覆盖 */
    .seal-img-p2 {
      position: absolute;
      right: 90px;
      top: 18px;
      width: 146px;
      height: 146px;
      pointer-events: none;
      mix-blend-mode: multiply;
      opacity: 0.94;
      z-index: 20;
      transform: rotate(-3deg);
    }
    .signature-area {
      position: relative;
      margin-top: 50px;
      padding-top: 20px;
    }
    .seal-img-p6 {
      position: absolute;
      right: 90px;
      top: -10px;
      width: 152px;
      height: 152px;
      pointer-events: none;
      mix-blend-mode: multiply;
      opacity: 0.95;
      z-index: 20;
      transform: rotate(-2deg);
    }
    .signature-company {
      font-size: 16px;
      font-weight: bold;
      color: #000000;
      margin-bottom: 4px;
      text-align: right;
      padding-right: 45px;
      font-family: "Microsoft YaHei", sans-serif;
    }
    .signature-hint {
      font-size: 12px;
      color: #666666;
      text-align: right;
      padding-right: 85px;
      margin-bottom: 28px;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 80px 180px 65px 1fr;
      gap: 12px 10px;
      font-size: 13.5px;
      line-height: 1.6;
      align-items: start;
    }
    .signature-label {
      font-weight: bold;
      color: #000000;
    }

    /* 打印导出优化：精确 A4，去除页面阴影与外边距 */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .quote-doc-container {
        width: 210mm !important;
        margin: 0 !important;
      }
      .a4-page {
        width: 210mm !important;
        height: 297mm !important;
        min-height: 297mm !important;
        max-height: 297mm !important;
        margin: 0 !important;
        padding: 22mm 20mm 20mm 20mm !important;
        box-shadow: none !important;
        page-break-after: always !important;
        page-break-inside: avoid !important;
      }
      .a4-page:last-child {
        page-break-after: auto !important;
      }
      .page-top-badge {
        display: none !important;
      }
      @page {
        size: A4 portrait;
        margin: 0;
      }
    }
  </style>
</head>
<body>
<div class="quote-doc-container">

  <!-- ═══════════════════ PAGE 1: 封面 ═══════════════════ -->
  <div id="quote-page-1" data-page="1" class="a4-page cover-page single-page-active">
    <div class="page-top-badge">
      <span class="badge-num">第 1 页 / 共 6 页</span>
      <span class="badge-title">报价封面</span>
    </div>
    ${watermark ? `<div class="draft-watermark">${escape(watermark)}</div>` : ''}

    <div class="cover-logo-wrap">
      <img src="${logo}" class="cover-logo-img" alt="中科集团" />
    </div>

    <div class="cover-company-title">
      ${escape(company.name)}
    </div>

    <div class="cover-main-title">
      ${isSupplement ? '补充报价单' : '报 价 单'}
    </div>

    <div class="cover-blue-line"></div>

    <table class="cover-table">
      <tr>
        <td class="zhi-label">致</td>
        <td class="customer-val">${escape(customerName)}</td>
      </tr>
    </table>

    <div class="cover-date-text">
      日 期：${dateText(quote.createdAt)}
    </div>
  </div>

  <!-- ═══════════════════ PAGE 2: 项目整体报价 ═══════════════════ -->
  <div id="quote-page-2" data-page="2" class="a4-page">
    <div class="page-top-badge">
      <span class="badge-num">第 2 页 / 共 6 页</span>
      <span class="badge-title">项目整体报价与盖章</span>
    </div>
    ${watermark ? `<div class="draft-watermark">${escape(watermark)}</div>` : ''}

    <div class="page-header">
      <div class="header-content">
        <img src="${logo}" class="header-logo" alt="中科集团" />
        <span class="header-divider">|</span>
        <span class="header-company-name">${escape(company.name.includes('中科') ? '中科软通' : company.name)}</span>
      </div>
      <div class="header-rule"></div>
    </div>

    <div class="section-title">项目整体报价</div>

    <p class="lead-paragraph">
      贵司委托我司开发的【${escape(projectName)}】项目，经双方沟通确认，我司对该项目进行了全面的需求分析和技术评估。本项目包含用户端（小程序/H5）、后台管理系统等多个功能模块，涵盖首页展示、产品中心、新闻资讯、客户留资、会员中心等完整业务流程。
    </p>

    <div class="overview-table-container">
      <table class="overview-table">
        <tr>
          <td class="label-cell">项目名称</td>
          <td>${escape(projectName)}</td>
        </tr>
        <tr>
          <td class="label-cell">项目工期</td>
          <td>${projectWorkDays} 个工作日（具体以合同签订为准）</td>
        </tr>
        <tr>
          <td class="label-cell">开发人天</td>
          <td>${Number(totalLaborDays).toFixed(1)} 人天</td>
        </tr>
        <tr class="total-price-row">
          <td class="label-cell">项目总价</td>
          <td class="val-cell">人民币 ${toChineseCurrency(grandTotal)}（¥${money(grandTotal)}）</td>
        </tr>
      </table>

      <!-- 整体报价公章覆盖 -->
      <img src="${seal}" class="seal-img-p2" alt="中科软通公章" />
    </div>

    <div class="notes-block">
      <div class="notes-heading">备注说明：</div>
      <ol class="notes-list">
        <li>以上报价为含税价格，包含${escape(invoiceType)}。</li>
        <li>付款方式：${escape(paymentDescription(quote))}</li>
        <li>项目交付后，首年提供免费维护服务（质保期 ${warrantyYears} 年）。</li>
        <li>如需增加功能点，双方协商另行计费。</li>
      </ol>
    </div>

    <div class="page-footer">
      <div class="footer-rule"></div>
      <div class="footer-page-num">· 2 ·</div>
    </div>
  </div>

  <!-- ═══════════════════ PAGE 3: 公司介绍 ═══════════════════ -->
  <div id="quote-page-3" data-page="3" class="a4-page">
    <div class="page-top-badge">
      <span class="badge-num">第 3 页 / 共 6 页</span>
      <span class="badge-title">公司介绍与资质</span>
    </div>
    ${watermark ? `<div class="draft-watermark">${escape(watermark)}</div>` : ''}

    <div class="page-header">
      <div class="header-content">
        <img src="${logo}" class="header-logo" alt="中科集团" />
        <span class="header-divider">|</span>
        <span class="header-company-name">${escape(company.name.includes('中科') ? '中科软通' : company.name)}</span>
      </div>
      <div class="header-rule"></div>
    </div>

    <div class="section-title">公司介绍</div>
    <div class="company-intro-sub">${escape(company.name)}</div>
    <div class="company-intro-tagline">（企业移动/PC 软件定制开发专家）</div>

    <p class="intro-paragraph">
      公司位于武汉光谷高新技术开发区，正式成立于 2021 年，核心团队自 2018 年起深耕行业软件与互联网产品，积累了丰富的项目实战经验。我们专注于为企业提供从战略咨询、定制开发、用户推广到联合运营、微信服务的一站式解决方案。
    </p>

    <div class="intro-section-title">技术实力</div>
    <p class="intro-paragraph">
      公司拥有 50 余人的纯开发团队，技术栈全面覆盖主流后端、前端、移动端及小程序开发（HTML5、Java、.NET、Go、Python、PHP、iOS、Android）等主流领域，持有大量软件著作权，并严格遵循 QA 管理标准，确保产品高可靠、高稳定。
    </p>

    <div class="intro-section-title">团队经验</div>
    <p class="intro-paragraph">
      核心成员均具备十年以上技术研发与项目管理经验，曾服务于国内外知名企业。团队秉持“技术为先、合作共赢”的理念，从需求沟通到后期维护全程把控，已完成上百个定制开发项目。
    </p>

    <div class="intro-section-title">行业覆盖广泛</div>
    <p class="intro-paragraph">
      我们成功为中国石油、东风汽车集团、国家电网、中信戴卡等众多知名企业及机构提供了定制化解决方案，涵盖能源、汽车、电力、制造等多个行业，获得客户一致赞誉。
    </p>

    <div class="intro-section-title">未来展望</div>
    <p class="intro-paragraph">
      未来，中科软通将继续以精湛的技术与专业的服务，成为企业“互联网+”战略的最佳合作伙伴。
    </p>

    <div class="page-footer">
      <div class="footer-rule"></div>
      <div class="footer-page-num">· 3 ·</div>
    </div>
  </div>

  <!-- ═══════════════════ PAGE 4: 详细报价清单（前 4 大模块） ═══════════════════ -->
  <div id="quote-page-4" data-page="4" class="a4-page">
    <div class="page-top-badge">
      <span class="badge-num">第 4 页 / 共 6 页</span>
      <span class="badge-title">详细报价清单 (一)</span>
    </div>
    ${watermark ? `<div class="draft-watermark">${escape(watermark)}</div>` : ''}

    <div class="page-header">
      <div class="header-content">
        <img src="${logo}" class="header-logo" alt="中科集团" />
        <span class="header-divider">|</span>
        <span class="header-company-name">${escape(company.name.includes('中科') ? '中科软通' : company.name)}</span>
      </div>
      <div class="header-rule"></div>
    </div>

    <div class="section-title">详细报价清单</div>

    <table class="quote-lines-table">
      <thead>
        <tr>
          <th style="width: 46px;">序号</th>
          <th style="width: 125px;">功能模块 (端口/平台)</th>
          <th style="width: 135px;">子功能</th>
          <th>功能描述</th>
          <th style="width: 120px;">人天(天) / 备注</th>
        </tr>
      </thead>
      <tbody>
        ${page4TableHtml}
      </tbody>
    </table>

    <div class="page-footer">
      <div class="footer-rule"></div>
      <div class="footer-page-num">· 4 ·</div>
    </div>
  </div>

  <!-- ═══════════════════ PAGE 5: 详细报价清单（续）+ 自费项目（第一项） ═══════════════════ -->
  <div id="quote-page-5" data-page="5" class="a4-page">
    <div class="page-top-badge">
      <span class="badge-num">第 5 页 / 共 6 页</span>
      <span class="badge-title">详细报价清单 (二)</span>
    </div>
    ${watermark ? `<div class="draft-watermark">${escape(watermark)}</div>` : ''}

    <div class="page-header">
      <div class="header-content">
        <img src="${logo}" class="header-logo" alt="中科集团" />
        <span class="header-divider">|</span>
        <span class="header-company-name">${escape(company.name.includes('中科') ? '中科软通' : company.name)}</span>
      </div>
      <div class="header-rule"></div>
    </div>

    <table class="quote-lines-table" style="margin-top: 6px;">
      <thead>
        <tr>
          <th style="width: 46px;">序号</th>
          <th style="width: 125px;">功能模块 (端口/平台)</th>
          <th style="width: 135px;">子功能</th>
          <th>功能描述</th>
          <th style="width: 120px;">人天(天) / 备注</th>
        </tr>
      </thead>
      <tbody>
        ${page5TableHtml}
      </tbody>
    </table>

    <div class="intro-section-title" style="font-size: 14.5px; margin-top: 18px; margin-bottom: 8px;">
      可能涉及的其他费用（自费项目）
    </div>

    <table class="self-paid-table">
      <thead>
        <tr>
          <th style="width: 130px;">费用类型</th>
          <th>说明</th>
          <th style="width: 120px;">备注</th>
        </tr>
      </thead>
      <tbody>
        ${renderSelfPaidRows(p5SelfPaid)}
      </tbody>
    </table>

    <div class="page-footer">
      <div class="footer-rule"></div>
      <div class="footer-page-num">· 5 ·</div>
    </div>
  </div>

  <!-- ═══════════════════ PAGE 6: 自费项目（续）+ 盖章授权落款 ═══════════════════ -->
  <div id="quote-page-6" data-page="6" class="a4-page">
    <div class="page-top-badge">
      <span class="badge-num">第 6 页 / 共 6 页</span>
      <span class="badge-title">自费项目与授权签章</span>
    </div>
    ${watermark ? `<div class="draft-watermark">${escape(watermark)}</div>` : ''}

    <div class="page-header">
      <div class="header-content">
        <img src="${logo}" class="header-logo" alt="中科集团" />
        <span class="header-divider">|</span>
        <span class="header-company-name">${escape(company.name.includes('中科') ? '中科软通' : company.name)}</span>
      </div>
      <div class="header-rule"></div>
    </div>

    <table class="self-paid-table" style="margin-top: 10px;">
      <thead>
        <tr>
          <th style="width: 130px;">费用类型</th>
          <th>说明</th>
          <th style="width: 120px;">备注</th>
        </tr>
      </thead>
      <tbody>
        ${renderSelfPaidRows(p6SelfPaid)}
      </tbody>
    </table>

    <!-- 签章落款区域 -->
    <div class="signature-area">
      <div class="signature-company">${escape(company.name)}</div>
      <div class="signature-hint">(此处加盖公章)</div>

      <!-- 落款公章覆盖 -->
      <img src="${seal}" class="seal-img-p6" alt="中科软通公章" />

      <div class="signature-grid">
        <div class="signature-label">授权代表：</div>
        <div>${escape(company.representative || '吴丹丹')}</div>

        <div class="signature-label">日 期：</div>
        <div>${dateDotText(quote.sentAt ?? quote.updatedAt ?? quote.createdAt)}</div>

        <div class="signature-label">电 话：</div>
        <div>${escape(company.phone || '15972061454')}</div>

        <div class="signature-label">地 址：</div>
        <div>${escape(company.address || '武汉市东湖高新技术开发区高新二路北辰光谷里 8A 栋 1202 室')}</div>
      </div>
    </div>

    <div class="page-footer">
      <div class="footer-rule"></div>
      <div class="footer-page-num">· 6 ·</div>
    </div>
  </div>

</div>
</body>
</html>`;
}

export function getDraftWatermark(status: string): string | undefined {
  if (
    status === 'draft' ||
    status === 'pending_eval' ||
    status === 'pending_quote' ||
    status === 'rejected'
  ) {
    return '草稿预览';
  }
  return undefined;
}

export { ZKRT_QUOTE_TEMPLATE };


