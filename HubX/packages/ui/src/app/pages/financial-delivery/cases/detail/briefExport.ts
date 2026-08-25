/**
 * 经营简报 CSV 导出
 *
 * 设计规约见 case-detail-dev-plan.md §3.2 决策 7：
 * - CSV 含 BOM + 逗号/引号转义
 * - 下载通过 Blob + URL.createObjectURL
 */

/** 简报行数据 */
export interface BriefRow {
  指标: string;
  值: string;
  单位: string;
  备注: string;
}

/** 构建简报行 */
export function buildBriefRows(params: {
  caseNo: string;
  contractAmount: number;
  totalCost: number;
  eac: number;
  lifecycleMargin: number | null;
  collectedMargin: number | null;
  wipValue: number;
  wipDays: number;
  health: string;
  commercialActual: number;
  commercialCap: number;
}): BriefRow[] {
  const pct = (v: number | null) => v !== null ? `${(v * 100).toFixed(1)}%` : '-';
  return [
    { 指标: '业务单编号', 值: params.caseNo, 单位: '', 备注: '' },
    { 指标: '有效标的额', 值: params.contractAmount.toLocaleString(), 单位: '元', 备注: '主合同 + 已归档补充' },
    { 指标: '已发生成本', 值: params.totalCost.toLocaleString(), 单位: '元', 备注: 'Σ actual' },
    { 指标: '完工估算 EAC', 值: params.eac.toLocaleString(), 单位: '元', 备注: 'actual + forecast' },
    { 指标: '全周期利润率', 值: pct(params.lifecycleMargin), 单位: '', 备注: '(标的额-EAC)/标的额' },
    { 指标: '回款口径利润率', 值: pct(params.collectedMargin), 单位: '', 备注: '(回款-actual)/回款' },
    { 指标: 'WIP 金额', 值: params.wipValue.toLocaleString(), 单位: '元', 备注: 'max(0, actual-revenue)' },
    { 指标: 'WIP 天数', 值: String(params.wipDays), 单位: '天', 备注: '' },
    { 指标: '健康状态', 值: params.health === 'red' ? '红' : params.health === 'yellow' ? '黄' : '绿', 单位: '', 备注: '' },
    { 指标: '商务费用', 值: params.commercialActual.toLocaleString(), 单位: '元', 备注: `上限 ${params.commercialCap.toLocaleString()}` },
  ];
}

/** CSV 转义（含逗号/引号/换行） */
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** 导出为 CSV 字符串（含 BOM） */
export function toCsv(rows: BriefRow[]): string {
  const header = '指标,值,单位,备注';
  const body = rows.map((r) =>
    [r.指标, r.值, r.单位, r.备注].map(escapeCsv).join(',')
  ).join('\n');
  // BOM for Excel UTF-8
  return '﻿' + header + '\n' + body;
}

/** 下载 CSV 文件 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
