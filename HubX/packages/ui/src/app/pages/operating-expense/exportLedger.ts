// 台账导出纯函数（xlsx）

import type { ExpenseRecord } from './types';

export const LEDGER_EXPORT_HEADERS = [
  '单号', '发生日', '归属月', '科目', '归属', '金额', '来源', '经办', '状态',
] as const;

const SOURCE_LABEL: Record<string, string> = {
  manual: '手工',
  template: '周期模板',
  excel: 'Excel',
  travel: '差旅',
  promotion: '推广',
  reimbursement: '报销',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '待确认',
  posted: '已入账',
  voided: '已作废',
};

/** 生成导出行（9 列，无工资行、无毛利列） */
export function ledgerExportRows(records: ExpenseRecord[]): (string | number)[][] {
  return records
    .filter((r) => r.categoryPrimary !== 'LABOR')
    .map((r) => [
      r.expenseNo,
      r.occurDate,
      r.billingMonth,
      r.categoryPrimary + (r.categorySecondary ? `/${r.categorySecondary}` : ''),
      r.attribution,
      r.amount,
      SOURCE_LABEL[r.source] ?? r.source,
      r.handler,
      STATUS_LABEL[r.status] ?? r.status,
    ]);
}

/** 动态导入 exceljs 并下载 xlsx */
export async function downloadLedgerXlsx(
  records: ExpenseRecord[],
  filename: string,
): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('费用台账');

  sheet.addRow([...LEDGER_EXPORT_HEADERS]);
  for (const row of ledgerExportRows(records)) {
    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
