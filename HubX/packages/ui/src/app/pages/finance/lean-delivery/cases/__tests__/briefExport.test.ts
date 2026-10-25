import { describe, expect, it } from 'vitest';
import { buildBriefRows, toCsv } from '../detail/briefExport';

describe('buildBriefRows', () => {
  it('生成完整行', () => {
    const rows = buildBriefRows({
      caseNo: 'CASE-001',
      contractAmount: 205000,
      totalCost: 118500,
      eac: 151700,
      lifecycleMargin: 0.26,
      collectedMargin: 0.13,
      wipValue: 16000,
      wipDays: 30,
      health: 'green',
      commercialActual: 13200,
      commercialCap: 25000,
    });
    expect(rows.length).toBe(10);
    expect(rows[0].指标).toBe('业务单编号');
    expect(rows[0].值).toBe('CASE-001');
    expect(rows[8].值).toBe('绿');
  });

  it('利润率 null 显示 -', () => {
    const rows = buildBriefRows({
      caseNo: 'CASE-002',
      contractAmount: 0,
      totalCost: 0,
      eac: 0,
      lifecycleMargin: null,
      collectedMargin: null,
      wipValue: 0,
      wipDays: 0,
      health: 'green',
      commercialActual: 0,
      commercialCap: 0,
    });
    expect(rows[5].值).toBe('-');
  });
});

describe('toCsv', () => {
  it('含 BOM + 表头 + 数据行', () => {
    const rows = buildBriefRows({
      caseNo: 'CASE-001',
      contractAmount: 205000,
      totalCost: 118500,
      eac: 151700,
      lifecycleMargin: 0.26,
      collectedMargin: 0.13,
      wipValue: 16000,
      wipDays: 30,
      health: 'green',
      commercialActual: 13200,
      commercialCap: 25000,
    });
    const csv = toCsv(rows);
    expect(csv.startsWith('﻿')).toBe(true); // BOM
    expect(csv).toContain('指标,值,单位,备注');
    expect(csv).toContain('CASE-001');
    expect(csv.split('\n').length).toBe(11); // header +10 rows
  });

  it('逗号转义', () => {
    const rows = [{ 指标: '测试', 值: 'a,b', 单位: '', 备注: '' }];
    const csv = toCsv(rows);
    expect(csv).toContain('"a,b"');
  });

  it('引号转义', () => {
    const rows = [{ 指标: '测试', 值: 'say "hi"', 单位: '', 备注: '' }];
    const csv = toCsv(rows);
    expect(csv).toContain('"say ""hi"""');
  });
});
