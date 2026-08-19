/**
 * 运营费用 A 单测 — expenseMutations + expenseCalc
 */
import { describe, it, expect } from 'vitest';
import {
  canGenerate,
  generateFromTemplate,
  adjustTemplatePrice,
  voidExpense,
  patchPostedExpense,
  confirmExpense,
  importTravelReimbursement,
} from '../expenseMutations';
import {
  workdaysInRange,
  capacityHours,
  overheadPool,
  hourlyOverheadRate,
  wma,
  latestPayrollTotal,
} from '../expenseCalc';
import type { ExpenseRecord, RecurringExpenseTemplate, EmployeeForOverhead } from '../types';

// ==================== 夹具 ====================

const fixedTemplate: RecurringExpenseTemplate = {
  id: 'tpl-1', name: '房租', kind: 'fixed',
  categoryPrimary: 'OFFICE', amount: 65000,
  cycle: 'monthly', billingDay: 1, startMonth: '2026-06',
  attribution: 'pool', status: 'active', priceHistory: [],
};

const variableTemplate: RecurringExpenseTemplate = {
  id: 'tpl-2', name: '水电', kind: 'variable',
  categoryPrimary: 'OFFICE', amount: 5000,
  cycle: 'monthly', billingDay: 5, startMonth: '2026-06',
  attribution: 'pool', status: 'active', priceHistory: [],
};

const postedRecord: ExpenseRecord = {
  id: 'exp-1', expenseNo: 'EXP-202608-001',
  categoryPrimary: 'OFFICE', amount: 65000,
  occurDate: '2026-08-01', billingMonth: '2026-08',
  attribution: 'pool', source: 'template', templateId: 'tpl-1',
  status: 'posted', handler: '系统', audit: [], isProjection: false,
};

const projectionRecord: ExpenseRecord = {
  id: 'exp-proj', expenseNo: 'EXP-202608-002',
  categoryPrimary: 'TRAVEL', amount: 5000,
  occurDate: '2026-08-01', billingMonth: '2026-08',
  attribution: 'project', source: 'travel',
  status: 'posted', handler: '系统', audit: [], isProjection: true,
};

const mockEmployees: EmployeeForOverhead[] = [
  { id: '1', name: '张三', hireDate: '2024-03-01', employmentStatus: '在职' },
  { id: '2', name: '李四', hireDate: '2026-06-12', employmentStatus: '在职' },
  { id: '3', name: '王五', hireDate: '2025-01-10', leaveDate: '2026-09-20', employmentStatus: '已离职' },
];

// ==================== canGenerate ====================

describe('canGenerate', () => {
  it('固定模板 8 月已 posted，再 generate 8 月 → false', () => {
    const existing: ExpenseRecord[] = [postedRecord];
    expect(canGenerate(fixedTemplate, '2026-08', existing)).toBe(false);
  });

  it('固定模板 9 月无记录 → true', () => {
    expect(canGenerate(fixedTemplate, '2026-09', [])).toBe(true);
  });

  it('暂停模板 → false', () => {
    const paused = { ...fixedTemplate, status: 'paused' as const };
    expect(canGenerate(paused, '2026-09', [])).toBe(false);
  });

  it('月份在 startMonth 之前 → false', () => {
    expect(canGenerate(fixedTemplate, '2026-05', [])).toBe(false);
  });
});

// ==================== generateFromTemplate ====================

describe('generateFromTemplate', () => {
  it('固定模板 → posted', () => {
    const record = generateFromTemplate(fixedTemplate, '2026-09', '测试', 1);
    expect(record.status).toBe('posted');
    expect(record.amount).toBe(65000);
  });

  it('浮动模板 → pending', () => {
    const record = generateFromTemplate(variableTemplate, '2026-09', '测试', 2);
    expect(record.status).toBe('pending');
  });
});

// ==================== adjustTemplatePrice ====================

describe('adjustTemplatePrice', () => {
  it('调价生效 9 月 68000，历史记录增加', () => {
    const updated = adjustTemplatePrice(fixedTemplate, 68000, '2026-09', '管理员');
    expect(updated.amount).toBe(68000);
    expect(updated.priceHistory).toHaveLength(1);
    expect(updated.priceHistory[0].effectiveMonth).toBe('2026-09');
    expect(updated.priceHistory[0].oldAmount).toBe(65000);
  });
});

// ==================== voidExpense ====================

describe('voidExpense', () => {
  it('posted → voided', () => {
    const voided = voidExpense(postedRecord, '管理员');
    expect(voided.status).toBe('voided');
    expect(voided.audit.some(a => a.action === 'void')).toBe(true);
  });

  it('非 posted → 抛错', () => {
    const pending = { ...postedRecord, status: 'pending' as const };
    expect(() => voidExpense(pending, '管理员')).toThrow();
  });
});

// ==================== patchPostedExpense ====================

describe('patchPostedExpense', () => {
  it('投影记录 → 拒绝', () => {
    expect(() => patchPostedExpense(projectionRecord, { amount: 6000 }, '管理员')).toThrow('投影记录禁止修改');
  });

  it('本台账 posted 可改金额', () => {
    const patched = patchPostedExpense(postedRecord, { amount: 70000 }, '管理员');
    expect(patched.amount).toBe(70000);
    expect(patched.audit.some(a => a.action === 'update')).toBe(true);
  });
});

// ==================== confirmExpense ====================

describe('confirmExpense', () => {
  it('pending → posted', () => {
    const pending = { ...postedRecord, status: 'pending' as const };
    const confirmed = confirmExpense(pending, '管理员');
    expect(confirmed.status).toBe('posted');
  });
});

// ==================== workdaysInRange ====================

describe('workdaysInRange', () => {
  it('10 月工天 20，足月 → 20', () => {
    expect(workdaysInRange('2026-10', '2024-01-01', undefined, 20)).toBe(20);
  });

  it('6/12 入职（19 天中后 18 天 ≈ 11 天）', () => {
    const days = workdaysInRange('2026-06', '2026-06-12', undefined, 21);
    // 6 月 30 天，在职 6/12-6/30 = 19 天，比例 19/30 ≈ 0.633，21×0.633 ≈ 13.3 → 13
    expect(days).toBeLessThan(21);
    expect(days).toBeGreaterThan(0);
  });
});

// ==================== capacityHours ====================

describe('capacityHours', () => {
  it('10 月 20 工天，3 人足月 → 480', () => {
    const employees: EmployeeForOverhead[] = [
      { id: '1', name: 'A', hireDate: '2024-01-01', employmentStatus: '在职' },
      { id: '2', name: 'B', hireDate: '2024-01-01', employmentStatus: '在职' },
      { id: '3', name: 'C', hireDate: '2024-01-01', employmentStatus: '在职' },
    ];
    const result = capacityHours(employees, '2026-10', { '2026-10': 20 });
    expect(result).toBe(3 * 20 * 8);
  });

  it('已离职且 leaveDate 在该月之前 → 不计入', () => {
    const employees: EmployeeForOverhead[] = [
      { id: '1', name: 'A', hireDate: '2024-01-01', leaveDate: '2026-07-01', employmentStatus: '已离职' },
    ];
    const result = capacityHours(employees, '2026-08', { '2026-08': 21 });
    expect(result).toBe(0);
  });
});

// ==================== overheadPool ====================

describe('overheadPool', () => {
  it('非作废、归属 pool、该月 posted → 求和', () => {
    const records: ExpenseRecord[] = [
      { ...postedRecord, billingMonth: '2026-08', status: 'posted', attribution: 'pool', amount: 65000 },
      { ...postedRecord, id: 'exp-2', billingMonth: '2026-08', status: 'voided', attribution: 'pool', amount: 10000 },
      { ...postedRecord, id: 'exp-3', billingMonth: '2026-08', status: 'posted', attribution: 'project', amount: 5000 },
    ];
    expect(overheadPool(records, '2026-08')).toBe(65000);
  });
});

// ==================== hourlyOverheadRate ====================

describe('hourlyOverheadRate', () => {
  it('pool=48000, hours=960 → 50', () => {
    expect(hourlyOverheadRate(48000, 960)).toBe(50);
  });

  it('hours=0 → 0', () => {
    expect(hourlyOverheadRate(48000, 0)).toBe(0);
  });
});

// ==================== wma ====================

describe('wma', () => {
  it('仅 2 个月 [100, 200] → 权重归一', () => {
    // 权重 [0.5, 0.3]，归一：0.5/0.8 * 100 + 0.3/0.8 * 200 = 62.5 + 75 = 137.5
    expect(wma([100, 200])).toBeCloseTo(137.5, 1);
  });

  it('空数组 → 0', () => {
    expect(wma([])).toBe(0);
  });

  it('3 个月 [100, 200, 300]', () => {
    // 0.5*100 + 0.3*200 + 0.2*300 = 50+60+60 = 170
    expect(wma([100, 200, 300])).toBeCloseTo(170, 1);
  });
});

// ==================== latestPayrollTotal ====================

describe('latestPayrollTotal', () => {
  it('actualSalary ?? nominalSalary', () => {
    const rows = [
      { actualSalary: 15000, nominalSalary: 15000 },
      { nominalSalary: 8000 }, // 无 actualSalary
    ];
    expect(latestPayrollTotal(rows)).toBe(23000);
  });
});

// ==================== importTravelReimbursement (阶段 B) ====================

describe('importTravelReimbursement', () => {
  const reimb = { id: 'reimb-1', reimbursementNo: 'BX-001', tripId: '1', totalAmount: 2886, status: 'finance_approved', createDate: '2026-05-05' };
  const tripWithProject = { id: '1', projectId: 'project-001' };
  const tripWithLead = { id: '3', leadId: 'lead-1' };

  it('finance_approved → 投影 posted', () => {
    const entry = importTravelReimbursement(reimb, tripWithProject, new Set());
    expect(entry).not.toBeNull();
    expect(entry!.status).toBe('posted');
    expect(entry!.isProjection).toBe(true);
    expect(entry!.attribution).toBe('project');
    expect(entry!.source).toBe('travel');
  });

  it('挂线索 → attribution=lead_channel', () => {
    const entry = importTravelReimbursement(reimb, tripWithLead, new Set());
    expect(entry!.attribution).toBe('lead_channel');
  });

  it('pending 状态 → 不导入', () => {
    const pending = { ...reimb, status: 'pending' };
    expect(importTravelReimbursement(pending, tripWithProject, new Set())).toBeNull();
  });

  it('已存在 → 不重复导入', () => {
    const existing = new Set(['travel-reimb-1']);
    expect(importTravelReimbursement(reimb, tripWithProject, existing)).toBeNull();
  });
});
