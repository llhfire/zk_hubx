import type { Contract } from '../contracts/types';
import type { Quote } from './types';

export interface QuoteDiffItem {
  key: string;
  label: string;
  before: string;
  after: string;
  changed: boolean;
}

function featureSummary(quote: Quote) {
  return quote.featureList.flatMap((module) => module.subFeatures.map((feature) => `${module.name}/${feature.name}`)).join('；') || '无功能项';
}

function totalDays(quote: Quote) {
  return quote.evalSheet?.evaluationUnits.reduce((sum, unit) => sum + unit.totalDays, 0) ?? 0;
}

function paymentSummary(quote: Quote) {
  return quote.summary?.paymentTerms.map((term) => `${term.stage} ${term.percent}%`).join('；') || '未设置';
}

function fileSummary(quote: Quote) {
  if (quote.flowMode !== 'file') return '在线数据流转';
  return [quote.fileFlow?.evaluationFileName, ...quote.fileFlow?.scans.map((item) => item.name) ?? []].filter(Boolean).join('；') || '未上传文件';
}

export function buildQuoteDiff(before: Quote, after: Quote): QuoteDiffItem[] {
  const rows: Array<[string, string, string, string]> = [
    ['features', '功能范围', featureSummary(before), featureSummary(after)],
    ['days', '技术人天', `${totalDays(before)} 人天`, `${totalDays(after)} 人天`],
    ['addons', '销售增项', `${before.salesAddedRoles.length} 项 / ¥${before.salesAddedRoles.reduce((sum, item) => sum + item.subtotal, 0).toLocaleString()}`, `${after.salesAddedRoles.length} 项 / ¥${after.salesAddedRoles.reduce((sum, item) => sum + item.subtotal, 0).toLocaleString()}`],
    ['amount', '总报价', `¥${(before.summary?.grandTotalPrice ?? 0).toLocaleString()}`, `¥${(after.summary?.grandTotalPrice ?? 0).toLocaleString()}`],
    ['schedule', '项目工期', `${before.summary?.projectWorkDays ?? 0} 个工作日`, `${after.summary?.projectWorkDays ?? 0} 个工作日`],
    ['payment', '付款期次', paymentSummary(before), paymentSummary(after)],
    ['warranty', '免费维护期', `${before.summary?.warrantyYears ?? 0} 年`, `${after.summary?.warrantyYears ?? 0} 年`],
    ['files', '客户文件', fileSummary(before), fileSummary(after)],
  ];
  return rows.map(([key, label, oldValue, newValue]) => ({ key, label, before: oldValue, after: newValue, changed: oldValue !== newValue }));
}

export function buildSupplementImpact(quote: Quote, contract: Contract) {
  const change = quote.summary?.grandTotalPrice ?? quote.supplementChangeAmount ?? 0;
  return {
    contractAmount: contract.current.totalAmount,
    changeAmount: change,
    effectiveAmount: contract.current.totalAmount + change,
    featureCount: quote.featureList.reduce((sum, module) => sum + module.subFeatures.length, 0),
    scheduleChangeDays: quote.summary?.projectWorkDays ?? 0,
    paymentTerms: quote.summary?.paymentTerms ?? [],
  };
}
