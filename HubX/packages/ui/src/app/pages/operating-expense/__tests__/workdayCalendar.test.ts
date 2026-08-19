/**
 * 运营费用 C 单测 — 工天日历
 */
import { describe, it, expect } from 'vitest';
import {
  isWorkday,
  workdaysInMonth,
  employeeWorkdaysInMonth,
  HOLIDAYS_2026,
} from '../workdayCalendar';

describe('isWorkday', () => {
  it('周一 → true', () => {
    expect(isWorkday('2026-08-03')).toBe(true); // 周一
  });

  it('周日 → false', () => {
    expect(isWorkday('2026-08-02')).toBe(false); // 周日
  });

  it('法定节假日 → false', () => {
    expect(isWorkday('2026-10-01')).toBe(false); // 国庆
  });

  it('调休上班日 → true', () => {
    expect(isWorkday('2026-10-10')).toBe(true); // 国庆调休
  });

  it('5月1日劳动节 → false', () => {
    expect(isWorkday('2026-05-01')).toBe(false);
  });
});

describe('workdaysInMonth', () => {
  it('2026-08 应有合理工天数（20~23）', () => {
    const days = workdaysInMonth('2026-08');
    expect(days).toBeGreaterThanOrEqual(20);
    expect(days).toBeLessThanOrEqual(23);
  });

  it('2026-10（国庆）工天应少于正常月', () => {
    const oct = workdaysInMonth('2026-10');
    const aug = workdaysInMonth('2026-08');
    expect(oct).toBeLessThan(aug);
  });
});

describe('employeeWorkdaysInMonth', () => {
  it('足月在职 → 等于该月工天', () => {
    const full = workdaysInMonth('2026-08');
    expect(employeeWorkdaysInMonth('2026-08', '2024-01-01', undefined)).toBe(full);
  });

  it('月中入职 → 少于足月', () => {
    const full = workdaysInMonth('2026-08');
    const partial = employeeWorkdaysInMonth('2026-08', '2026-08-15', undefined);
    expect(partial).toBeLessThan(full);
    expect(partial).toBeGreaterThan(0);
  });

  it('月中离职 → 少于足月', () => {
    const full = workdaysInMonth('2026-09');
    const partial = employeeWorkdaysInMonth('2026-09', '2025-01-01', '2026-09-20');
    expect(partial).toBeLessThan(full);
    expect(partial).toBeGreaterThan(0);
  });

  it('离职月之前 → 0', () => {
    expect(employeeWorkdaysInMonth('2026-10', '2025-01-01', '2026-09-20')).toBe(0);
  });
});
