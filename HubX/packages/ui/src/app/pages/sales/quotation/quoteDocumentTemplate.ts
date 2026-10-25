import { computeAmountBreakdown } from './quoteFlow';
import type { Quote } from './types';
import { PLATFORM_OPTIONS } from './types';

export const ZKRT_QUOTE_TEMPLATE = {
  id: 'zkrt-standard-quote',
  name: '中科【软通】报价模板',
  sourceFileName: '中科【软通】报价模板.docx',
  signingEntity: '中科软通',
  sections: ['项目整体报价', '公司介绍', '详细报价清单', '其他费用', '签章信息'],
  defaultPaymentTerms: [
    { stage: '合同签订首付款', percent: 30 },
    { stage: '项目交付款', percent: 60 },
    { stage: '验收尾款', percent: 10 },
  ],
} as const;

/**
 * 源 Word 模板的「单价」列实际承载功能项金额；「小计」只在模块首行显示模块合计。
 * 这里沿用源模板列名，但用明确字段名避免再次把它误解为日单价。
 */
export interface QuoteTemplateLine {
  id: string;
  endpoint: string;
  module: string;
  feature: string;
  days: number;
  amount: number;
  moduleSubtotal?: number;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function endpointLabel(quote: Quote, endpointId: string): string {
  const endpoint = quote.endpointConfigs.find((item) => item.id === endpointId);
  if (!endpoint) return '未分配端';
  const platforms = endpoint.platforms
    .map((platformId) => PLATFORM_OPTIONS.find((item) => item.id === platformId)?.name ?? platformId)
    .filter(Boolean);
  return platforms.length ? `${endpoint.name}（${platforms.join('、')}）` : endpoint.name;
}

/** 按权重分摊金额，最后一项吸收分位舍入差，保证金额守恒。 */
function allocateAmount(total: number, weights: number[]): number[] {
  if (!weights.length) return [];
  const normalizedWeights = weights.map((weight) => Math.max(weight, 0));
  const weightTotal = normalizedWeights.reduce((sum, weight) => sum + weight, 0);
  const fallbackWeights = weightTotal > 0 ? normalizedWeights : normalizedWeights.map(() => 1);
  const fallbackTotal = fallbackWeights.reduce((sum, weight) => sum + weight, 0);
  let allocated = 0;
  return fallbackWeights.map((weight, index) => {
    if (index === fallbackWeights.length - 1) return round2(total - allocated);
    const amount = round2(total * weight / fallbackTotal);
    allocated = round2(allocated + amount);
    return amount;
  });
}

function attachModuleSubtotals(lines: QuoteTemplateLine[]): QuoteTemplateLine[] {
  const totals = new Map<string, number>();
  lines.forEach((line) => {
    const key = `${line.endpoint}\u0000${line.module}`;
    totals.set(key, round2((totals.get(key) ?? 0) + line.amount));
  });
  const seen = new Set<string>();
  return lines.map((line) => {
    const key = `${line.endpoint}\u0000${line.module}`;
    if (seen.has(key)) return line;
    seen.add(key);
    return { ...line, moduleSubtotal: totals.get(key) ?? 0 };
  });
}

/**
 * 把端/模块/功能及评估人天映射到报价模板。技术评估金额按功能人天分摊，
 * 增项与项目服务使用其业务金额；文件报价和补充报价的差额单列为价格调整。
 */
export function buildQuoteTemplateLines(quote: Quote): QuoteTemplateLine[] {
  const breakdown = computeAmountBreakdown(quote);
  const unitBySubFeature = new Map<string, { days: number; divisor: number }>();
  quote.evalSheet?.evaluationUnits.forEach((unit) => {
    const divisor = Math.max(unit.boundSubFeatureIds.length, 1);
    unit.boundSubFeatureIds.forEach((subFeatureId) => {
      unitBySubFeature.set(subFeatureId, { days: unit.totalDays, divisor });
    });
  });

  const rawFeatureLines = quote.featureList.flatMap((module) => module.subFeatures.map((feature) => {
    const evaluation = unitBySubFeature.get(feature.id);
    const days = evaluation ? evaluation.days / evaluation.divisor : 0;
    return {
      id: feature.id,
      endpoint: endpointLabel(quote, module.endpointId),
      module: module.name,
      feature: feature.name,
      days,
    };
  }));
  const featureAmounts = allocateAmount(breakdown.techLaborCost, rawFeatureLines.map((line) => line.days));
  const featureLines: QuoteTemplateLine[] = rawFeatureLines.map((line, index) => ({
    ...line,
    amount: featureAmounts[index] ?? 0,
  }));

  const addedRoleLines: QuoteTemplateLine[] = quote.salesAddedRoles.map((role) => ({
    id: role.id,
    endpoint: '项目增项',
    module: role.roleName || '增项岗位',
    feature: role.reason || `${role.headcount} 人 × ${role.days} 天`,
    days: role.headcount * role.days,
    amount: round2(role.subtotal),
  }));

  const serviceLines: QuoteTemplateLine[] = [];
  if (quote.travelOnsite.enableTravel && quote.travelOnsite.travelSubtotal > 0) {
    serviceLines.push({ id: 'quote-travel', endpoint: '项目服务', module: '差旅服务', feature: '项目实施差旅', days: 0, amount: round2(quote.travelOnsite.travelSubtotal) });
  }
  if (quote.travelOnsite.enableOnsite && quote.travelOnsite.onsiteSubtotal > 0) {
    serviceLines.push({ id: 'quote-onsite', endpoint: '项目服务', module: '驻场服务', feature: '现场技术支持', days: 0, amount: round2(quote.travelOnsite.onsiteSubtotal) });
  }

  const lines = [...featureLines, ...addedRoleLines, ...serviceLines];
  const currentTotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const adjustment = round2(breakdown.grandTotal - currentTotal);
  if (Math.abs(adjustment) >= 0.01) {
    lines.push({
      id: quote.isSupplement ? 'quote-supplement-adjustment' : 'quote-price-adjustment',
      endpoint: quote.isSupplement ? '补充协议' : '报价调整',
      module: quote.isSupplement ? '变更费用' : '商务调整',
      feature: quote.isSupplement ? (quote.basicInfo.requirementDesc || '补充协议变更费用') : '报价总额调整',
      days: 0,
      amount: adjustment,
    });
  }
  return attachModuleSubtotals(lines);
}

export function getQuoteTemplateLineTotal(quote: Quote): number {
  return round2(buildQuoteTemplateLines(quote).reduce((sum, line) => sum + line.amount, 0));
}

export function getQuoteTemplateMissingFields(quote: Quote): string[] {
  const missing: string[] = [];
  if (!quote.basicInfo.customerName.trim()) missing.push('客户名称');
  if (!quote.basicInfo.projectName.trim()) missing.push('项目名称');
  if (!quote.signingEntity?.trim()) missing.push('签约主体');
  if (!quote.featureList.some((module) => module.subFeatures.length > 0)) missing.push('功能清单');
  if (!quote.isSupplement && !quote.evalSheet?.manualWorkDays && !quote.fileFlow?.quoteWorkDays) missing.push('项目工期');
  if (!quote.summary?.paymentTerms?.length) missing.push('付款方式');
  else if (Math.abs(quote.summary.paymentTerms.reduce((sum, term) => sum + term.percent, 0) - 100) > 0.01) missing.push('付款比例合计 100%');
  const breakdown = computeAmountBreakdown(quote);
  if (breakdown.grandTotal <= 0) missing.push('有效报价总额');
  if (Math.abs(getQuoteTemplateLineTotal(quote) - breakdown.grandTotal) >= 0.01) missing.push('报价明细金额与总额一致');
  return missing;
}
