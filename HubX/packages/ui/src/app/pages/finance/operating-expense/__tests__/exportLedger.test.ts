import { describe, expect, it } from 'vitest';
import { ledgerExportRows, LEDGER_EXPORT_HEADERS } from '../exportLedger';
import type { ExpenseRecord } from '../types';

function makeRecord(overrides: Partial<ExpenseRecord> = {}): ExpenseRecord {
  return {
    id: 'r1', expenseNo: 'EXP-202608-001', categoryPrimary: 'OFFICE', amount: 1000,
    occurDate: '2026-08-01', billingMonth: '2026-08', attribution: 'pool',
    source: 'manual', status: 'posted', handler: '张三', audit: [],
    ...overrides,
  } as ExpenseRecord;
}

describe('ledgerExportRows', () => {
  it('9 列输出', () => {
    const rows = ledgerExportRows([makeRecord()]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(9);
  });

  it('无工资行', () => {
    const rows = ledgerExportRows([makeRecord({ categoryPrimary: 'LABOR' })]);
    expect(rows).toHaveLength(0);
  });

  it('无毛利列表头', () => {
    expect(LEDGER_EXPORT_HEADERS).not.toContain('毛利');
    expect(LEDGER_EXPORT_HEADERS).not.toContain('工资');
  });

  it('来源映射', () => {
    const rows = ledgerExportRows([makeRecord({ source: 'template' })]);
    expect(rows[0][6]).toBe('周期模板');
  });
});
