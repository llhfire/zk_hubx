import { describe, expect, it } from 'vitest';
import {
  buildOverheadSnapshot,
  hourlyOverheadRate,
  overheadAmount,
} from '../overhead';
import { getAlphaOverheadSnapshot } from '../alphaOverhead';

describe('共享公摊费率', () => {
  it('只用已入账公共池和全公司编制工时计算', () => {
    const snapshot = buildOverheadSnapshot({
      month: '2026-08',
      records: [
        { amount: 12000, billingMonth: '2026-08', attribution: 'pool', status: 'posted' },
        { amount: 5000, billingMonth: '2026-08', attribution: 'project', status: 'posted' },
        { amount: 3000, billingMonth: '2026-08', attribution: 'pool', status: 'voided' },
      ],
      employees: [
        { hireDate: '2025-01-01', employmentStatus: '在职' },
        { hireDate: '2025-01-01', employmentStatus: '在职' },
      ],
      workdays: { '2026-08': 20 },
    });

    expect(snapshot.pool).toBe(12000);
    expect(snapshot.capacityHours).toBe(320);
    expect(snapshot.rate).toBe(37.5);
  });

  it('无编制工时时费率与金额均为 0', () => {
    expect(hourlyOverheadRate(12000, 0)).toBe(0);
    expect(overheadAmount(10, 0)).toBe(0);
  });

  it('α 当前月读取动态值而非固定 35', () => {
    const snapshot = getAlphaOverheadSnapshot('2026-08');
    expect(snapshot.pool).toBe(12000);
    expect(snapshot.capacityHours).toBe(1176);
    expect(snapshot.rate).toBeCloseTo(12000 / 1176, 8);
    expect(snapshot.rate).not.toBe(35);
  });
});
