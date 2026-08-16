import { describe, expect, it } from 'vitest';
import {
  buildPaymentPlansForRatio,
  canTransitionTo,
  convertAmountToChinese,
  findLatestApprovedQuote,
  generateContractNo,
  getNextVersionNo,
} from '../utils';
import type { ContractStatus, QuotationRecord } from '../types';

describe('buildPaymentPlansForRatio', () => {
  it('生成 3:3:3:1 的四期回款计划', () => {
    expect(buildPaymentPlansForRatio('3:3:3:1', 100000)).toEqual([
      { period: 1, expectedDate: '', expectedDateType: 'fixed', condition: '', amount: 30000, percentage: 30, amountType: 'percentage' },
      { period: 2, expectedDate: '', expectedDateType: 'fixed', condition: '', amount: 30000, percentage: 30, amountType: 'percentage' },
      { period: 3, expectedDate: '', expectedDateType: 'fixed', condition: '', amount: 30000, percentage: 30, amountType: 'percentage' },
      { period: 4, expectedDate: '', expectedDateType: 'fixed', condition: '', amount: 10000, percentage: 10, amountType: 'percentage' },
    ]);
  });

  it('生成 4:5:1 的三期回款计划', () => {
    expect(buildPaymentPlansForRatio('4:5:1', 100000).map((plan) => plan.percentage)).toEqual([40, 50, 10]);
  });
});

describe('convertAmountToChinese', () => {
  it('零元', () => {
    expect(convertAmountToChinese(0)).toBe('零元整');
  });

  it('普通整数', () => {
    expect(convertAmountToChinese(123)).toBe('壹佰贰拾叁元整');
  });

  it('万级', () => {
    expect(convertAmountToChinese(50000)).toBe('伍万元整');
  });

  it('含零的复杂数字（保持与 LeadDetail 原版 convertToChinese 行为一致）', () => {
    // NOTE: 严格的人民币规范是"壹拾万零叁拾"，但原函数（迁出自
    // LeadDetail.tsx:558）在跨万级的零处理上有遗留行为，输出"壹拾万叁拾"。
    // 本次只搬迁不改行为，测试锁定现有输出。
    expect(convertAmountToChinese(100030)).toBe('壹拾万叁拾元整');
  });

  it('忽略小数部分', () => {
    expect(convertAmountToChinese(1234.56)).toBe('壹仟贰佰叁拾肆元整');
  });

  it('亿级', () => {
    // 1.2 亿 = 1_2000_0000
    expect(convertAmountToChinese(120000000)).toBe('壹亿贰仟万元整');
  });
});

describe('canTransitionTo', () => {
  const cases: Array<{ from: ContractStatus; to: ContractStatus; ok: boolean }> = [
    // 合法
    { from: 'draft', to: 'approving', ok: true },
    { from: 'draft', to: 'voided', ok: true },
    { from: 'approving', to: 'draft', ok: true }, // 驳回
    { from: 'approving', to: 'pending_mail', ok: true }, // 通过
    { from: 'approving', to: 'voided', ok: true },
    { from: 'pending_mail', to: 'pending_return', ok: true },
    { from: 'pending_mail', to: 'draft', ok: true }, // 撤回
    { from: 'pending_return', to: 'archived', ok: true },
    { from: 'pending_return', to: 'pending_mail', ok: true }, // 寄丢重做
    { from: 'archived', to: 'archived', ok: true }, // 补充扫描件
    { from: 'archived', to: 'voided', ok: true },
    // 非法
    { from: 'draft', to: 'pending_mail', ok: false }, // 必须先过审批
    { from: 'draft', to: 'archived', ok: false },
    { from: 'voided', to: 'draft', ok: false }, // 终态不可恢复
    { from: 'voided', to: 'approving', ok: false },
    { from: 'archived', to: 'pending_return', ok: false }, // 已归档不能回退
  ];

  cases.forEach(({ from, to, ok }) => {
    it(`${from} → ${to} ${ok ? '合法' : '非法'}`, () => {
      expect(canTransitionTo(from, to)).toBe(ok);
    });
  });
});

describe('getNextVersionNo', () => {
  it('空数组返回 V1', () => {
    expect(getNextVersionNo([])).toBe('V1');
  });

  it('顺序递增', () => {
    expect(getNextVersionNo(['V1', 'V2'])).toBe('V3');
  });

  it('乱序按最大数字 + 1', () => {
    expect(getNextVersionNo(['V3', 'V1', 'V2'])).toBe('V4');
  });

  it('忽略不合法版本号', () => {
    expect(getNextVersionNo(['draft', 'V2'])).toBe('V3');
  });

  it('单元素', () => {
    expect(getNextVersionNo(['V5'])).toBe('V6');
  });
});

describe('findLatestApprovedQuote', () => {
  const make = (overrides: Partial<QuotationRecord>): QuotationRecord => ({
    id: 'q' + Math.random(),
    status: '未报价',
    flowStatus: '审核中',
    ...overrides,
  });

  it('空列表返回 null', () => {
    expect(findLatestApprovedQuote([])).toBeNull();
  });

  it('没有满足条件的报价返回 null', () => {
    expect(
      findLatestApprovedQuote([
        make({ id: '1', flowStatus: '审核中', status: '已报价' }),
        make({ id: '2', flowStatus: '已审核', status: '未报价' }),
      ]),
    ).toBeNull();
  });

  it('单个匹配返回该报价', () => {
    const q = make({
      id: '1',
      flowStatus: '已审核',
      status: '已报价',
      createTime: '2026-04-10 14:30',
    });
    expect(findLatestApprovedQuote([q])).toEqual(q);
  });

  it('多个匹配按 createTime 倒序取最近', () => {
    const older = make({
      id: '1',
      flowStatus: '已审核',
      status: '已报价',
      createTime: '2026-04-01 09:00',
    });
    const newer = make({
      id: '2',
      flowStatus: '已审核',
      status: '已报价',
      createTime: '2026-04-25 18:00',
    });
    expect(findLatestApprovedQuote([older, newer])?.id).toBe('2');
    expect(findLatestApprovedQuote([newer, older])?.id).toBe('2');
  });

  it('createTime 都缺失时取数组末尾', () => {
    const a = make({ id: '1', flowStatus: '已审核', status: '已报价' });
    const b = make({ id: '2', flowStatus: '已审核', status: '已报价' });
    expect(findLatestApprovedQuote([a, b])?.id).toBe('2');
  });
});

describe('generateContractNo', () => {
  it('格式正确', () => {
    const d = new Date(2026, 5, 13); // 2026-06-13
    expect(generateContractNo(d, 1)).toBe('CT20260613001');
  });

  it('seq 补零', () => {
    const d = new Date(2026, 0, 5);
    expect(generateContractNo(d, 12)).toBe('CT20260105012');
    expect(generateContractNo(d, 100)).toBe('CT20260105100');
  });

  it('支持按签约主体生成编号', () => {
    const d = new Date(2026, 6, 27);
    expect(generateContractNo(d, 1, 'ZKRT')).toBe('ZKRTHT-20260727001');
  });
});
