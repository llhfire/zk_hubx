import { describe, expect, it } from 'vitest';
import {
  calculateQuotationAmount,
  calculateQuotationAmountByFixed,
  calculateUpliftRate,
} from '../quotationPricing';

describe('calculateQuotationAmount', () => {
  it('calculates the quotation amount from the project total and uplift rate', () => {
    expect(calculateQuotationAmount(100000, 20)).toBe(120000);
    expect(calculateQuotationAmount(1234.56, 10)).toBe(1358.02);
  });

  it('calculates the quotation amount from a fixed uplift amount', () => {
    expect(calculateQuotationAmountByFixed(100000, 20000)).toBe(120000);
    expect(calculateQuotationAmountByFixed(1234.56, 100.12)).toBe(1334.68);
  });

  it('calculates the uplift rate from an edited quotation amount', () => {
    expect(calculateUpliftRate(100000, 130000)).toBe(30);
    expect(calculateUpliftRate(100000, 95000)).toBe(-5);
    expect(calculateUpliftRate(0, 100000)).toBe(0);
  });
});
