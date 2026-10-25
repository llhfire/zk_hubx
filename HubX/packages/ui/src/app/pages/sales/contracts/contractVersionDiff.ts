import type { ContractVersion } from './types';

export interface ContractVersionDiffItem {
  key: string;
  label: string;
  before: string;
  after: string;
  changed: boolean;
}

export function compareContractVersions(before: ContractVersion, after: ContractVersion): ContractVersionDiffItem[] {
  const a = before.formData;
  const b = after.formData;
  const rows: Array<[string, string, unknown, unknown]> = [
    ['name', '合同名称', a.contractName, b.contractName],
    ['customer', '甲方', a.customerName, b.customerName],
    ['amount', '合同总额', a.totalAmount, b.totalAmount],
    ['term', '合同期限', `${a.effectiveDate} 至 ${a.endDate}`, `${b.effectiveDate} 至 ${b.endDate}`],
    ['payment', '回款计划', a.paymentPlans.map((item) => `${item.periodName ?? item.period}:${item.amount}`).join('；'), b.paymentPlans.map((item) => `${item.periodName ?? item.period}:${item.amount}`).join('；')],
    ['template', '模板版本', a.templateVersionId ?? a.templateId, b.templateVersionId ?? b.templateId],
    ['content', '合同内容', a.contractContent, b.contractContent],
  ];
  return rows.map(([key, label, oldValue, newValue]) => ({ key, label, before: String(oldValue ?? '—'), after: String(newValue ?? '—'), changed: JSON.stringify(oldValue) !== JSON.stringify(newValue) }));
}
