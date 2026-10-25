import { describe, expect, it } from 'vitest';
import { EMPTY_AMOUNT, formatAmountPlain, formatMoney, formatMoneyCompact } from '../money';

describe('formatMoney 标准金额', () => {
  it('整数不带小数位', () => {
    expect(formatMoney(480000)).toBe('¥480,000');
    expect(formatMoney(0)).toBe('¥0');
  });

  it('保留最多两位小数，不强制补零', () => {
    expect(formatMoney(1234.5)).toBe('¥1,234.5');
    expect(formatMoney(1234.56)).toBe('¥1,234.56');
    expect(formatMoney(1234.567)).toBe('¥1,234.57');
  });

  it('空值返回破折号，而不是 ¥0', () => {
    expect(formatMoney(null)).toBe(EMPTY_AMOUNT);
    expect(formatMoney(undefined)).toBe(EMPTY_AMOUNT);
    expect(formatMoney(Number.NaN)).toBe(EMPTY_AMOUNT);
  });

  it('可指定占位符', () => {
    expect(formatMoney(null, { placeholder: '-' })).toBe('-');
  });

  it('可强制固定小数位', () => {
    expect(formatMoney(1000, { fractionDigits: 2 })).toBe('¥1,000.00');
    expect(formatMoney(1000, { fractionDigits: 0 })).toBe('¥1,000');
  });

  it('负数保留符号', () => {
    expect(formatMoney(-1234.5)).toBe('¥-1,234.5');
  });
});

describe('formatMoneyCompact 万单位', () => {
  it('超过一万用万单位，一位小数', () => {
    expect(formatMoneyCompact(480000)).toBe('¥48.0万');
    expect(formatMoneyCompact(1234567)).toBe('¥123.5万');
  });

  it('不足一万退化为标准金额，避免 ¥0.1万 失真', () => {
    expect(formatMoneyCompact(9999)).toBe('¥9,999');
    expect(formatMoneyCompact(1234)).toBe('¥1,234');
  });

  it('空值返回占位符', () => {
    expect(formatMoneyCompact(null)).toBe(EMPTY_AMOUNT);
  });
});

describe('formatAmountPlain 文书纯数字', () => {
  it('固定两位小数、无货币符号', () => {
    expect(formatAmountPlain(480000)).toBe('480,000.00');
    expect(formatAmountPlain(1234.5)).toBe('1,234.50');
  });

  it('空值补 0.00，文书里不能留空', () => {
    expect(formatAmountPlain(null)).toBe('0.00');
    expect(formatAmountPlain(undefined)).toBe('0.00');
  });
});
