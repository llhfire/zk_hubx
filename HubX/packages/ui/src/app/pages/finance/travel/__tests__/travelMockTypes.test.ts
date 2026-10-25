/**
 * 差旅 T1 护栏测试
 * - mock 数据可赋给对应类型
 * - 源码不得出现 PunchRecord、/travel/punch、new_first
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import { mockTrips, mockReimbursements, mockLoans, mockDormitories, mockExpenseStandards } from '../mock-data';
import type { Trip, Reimbursement, Loan, DormitoryBuilding, ExpenseStandard } from '../types';

// ---- 类型兼容性 ----

describe('mock 数据类型兼容', () => {
  it('mockTrips 可赋给 Trip[]', () => {
    const trips: Trip[] = mockTrips;
    expect(trips.length).toBeGreaterThanOrEqual(1);
  });

  it('mockReimbursements 可赋给 Reimbursement[]', () => {
    const reims: Reimbursement[] = mockReimbursements;
    expect(reims.length).toBeGreaterThanOrEqual(1);
  });

  it('mockLoans 可赋给 Loan[]', () => {
    const loans: Loan[] = mockLoans;
    expect(loans.length).toBeGreaterThanOrEqual(1);
  });

  it('mockDormitories 可赋给 DormitoryBuilding[]', () => {
    const dorms: DormitoryBuilding[] = mockDormitories;
    expect(Array.isArray(dorms)).toBe(true);
  });

  it('mockExpenseStandards 可赋给 ExpenseStandard[]', () => {
    const stds: ExpenseStandard[] = mockExpenseStandards;
    expect(stds.length).toBeGreaterThanOrEqual(1);
  });

  it('mockExpenseStandards[0].details.length >= 1', () => {
    expect(mockExpenseStandards[0].details.length).toBeGreaterThanOrEqual(1);
  });

  it('费用标准无 new_first 城市等级', () => {
    for (const std of mockExpenseStandards) {
      for (const d of std.details) {
        expect(d.cityLevels).not.toContain('new_first' as any);
      }
    }
  });
});

// ---- 源码残留扫描 ----

function walkTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      results.push(...walkTsFiles(full));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

const TRAVEL_DIR = join(__dirname, '..');

describe('源码无打卡残留', () => {
  const files = walkTsFiles(TRAVEL_DIR);

  it('无 PunchRecord 引用', () => {
    for (const f of files) {
      const content = readFileSync(f, 'utf-8');
      expect(content).not.toContain('PunchRecord');
    }
  });

  it('无 /travel/punch 路由', () => {
    for (const f of files) {
      const content = readFileSync(f, 'utf-8');
      expect(content).not.toContain('/travel/punch');
    }
  });

  it('无 new_first 城市等级', () => {
    for (const f of files) {
      const content = readFileSync(f, 'utf-8');
      expect(content).not.toContain('new_first');
    }
  });
});
