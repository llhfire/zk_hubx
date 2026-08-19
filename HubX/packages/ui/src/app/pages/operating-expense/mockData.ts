// ========================================
// 运营费用 - Mock 数据
// ========================================

import type {
  ExpenseRecord,
  RecurringExpenseTemplate,
  WorkdaysByMonth,
  EmployeeForOverhead,
} from './types';

/** 工天数表（α 大小周估数，注释标明） */
export const mockWorkdaysByMonth: WorkdaysByMonth = {
  '2026-05': 19, // 小周偏多
  '2026-06': 21,
  '2026-07': 23, // 大周偏多
  '2026-08': 21,
  '2026-09': 22,
  '2026-10': 18, // 国庆
  '2026-11': 21,
};

/** 员工档案（供公摊计算，与 employee/mockData.ts 对齐但精简） */
export const mockEmployeesForOverhead: EmployeeForOverhead[] = [
  { id: '1', name: '张三', hireDate: '2024-03-01', employmentStatus: '在职' },
  { id: '2', name: '李四', hireDate: '2024-06-15', employmentStatus: '在职' },
  { id: '3', name: '王五', hireDate: '2025-01-10', employmentStatus: '在职' },
  { id: '4', name: '赵六', hireDate: '2025-08-01', employmentStatus: '在职' },
  { id: '5', name: '钱七', hireDate: '2026-05-01', employmentStatus: '在职' },
  // 中途入职：2026-06-12
  { id: '15', name: '周十五', hireDate: '2026-06-12', employmentStatus: '在职' },
  // 中途离职：2026-09-20
  { id: '16', name: '吴十六', hireDate: '2025-03-01', leaveDate: '2026-09-20', employmentStatus: '已离职' },
];

/** 模板 5 条 */
export const mockTemplates: RecurringExpenseTemplate[] = [
  {
    id: 'tpl-rent',
    name: '办公室房租',
    kind: 'fixed',
    categoryPrimary: 'OFFICE',
    categorySecondary: 'OFFICE_RENT',
    amount: 35000,
    cycle: 'monthly',
    billingDay: 1,
    startMonth: '2026-01',
    attribution: 'pool',
    status: 'active',
    priceHistory: [],
  },
  {
    id: 'tpl-property',
    name: '物业管理费',
    kind: 'fixed',
    categoryPrimary: 'OFFICE',
    categorySecondary: 'OFFICE_PROPERTY',
    amount: 8000,
    cycle: 'monthly',
    billingDay: 1,
    startMonth: '2026-01',
    attribution: 'pool',
    status: 'active',
    priceHistory: [],
  },
  {
    id: 'tpl-internet',
    name: '专线网络',
    kind: 'fixed',
    categoryPrimary: 'OFFICE',
    categorySecondary: 'OFFICE_INTERNET',
    amount: 2000,
    cycle: 'monthly',
    billingDay: 1,
    startMonth: '2026-01',
    attribution: 'pool',
    status: 'active',
    priceHistory: [],
  },
  {
    id: 'tpl-feishu',
    name: '飞书企业版',
    kind: 'fixed',
    categoryPrimary: 'OFFICE',
    categorySecondary: 'OFFICE_SUPPLIES',
    amount: 3000,
    cycle: 'monthly',
    billingDay: 1,
    startMonth: '2026-03',
    attribution: 'pool',
    status: 'active',
    priceHistory: [],
  },
  {
    id: 'tpl-utilities',
    name: '水电费',
    kind: 'variable',
    categoryPrimary: 'OFFICE',
    categorySecondary: 'OFFICE_UTILITIES',
    amount: 5000, // 预估
    cycle: 'monthly',
    billingDay: 5,
    startMonth: '2026-01',
    attribution: 'pool',
    status: 'active',
    priceHistory: [],
  },
];

/** 已入账记录（2026-06 ~ 2026-07 的固定模板生成） */
export const mockExpenseRecords: ExpenseRecord[] = [
  // 2026-06 房租
  {
    id: 'exp-rent-202606', expenseNo: 'EXP-202606-001',
    categoryPrimary: 'OFFICE', categorySecondary: 'OFFICE_RENT',
    amount: 35000, occurDate: '2026-06-01', billingMonth: '2026-06',
    attribution: 'pool', source: 'template', templateId: 'tpl-rent',
    status: 'posted', handler: '系统', audit: [], isProjection: false,
  },
  // 2026-06 物业
  {
    id: 'exp-property-202606', expenseNo: 'EXP-202606-002',
    categoryPrimary: 'OFFICE', categorySecondary: 'OFFICE_PROPERTY',
    amount: 8000, occurDate: '2026-06-01', billingMonth: '2026-06',
    attribution: 'pool', source: 'template', templateId: 'tpl-property',
    status: 'posted', handler: '系统', audit: [], isProjection: false,
  },
  // 2026-06 网络
  {
    id: 'exp-internet-202606', expenseNo: 'EXP-202606-003',
    categoryPrimary: 'OFFICE', categorySecondary: 'OFFICE_INTERNET',
    amount: 2000, occurDate: '2026-06-01', billingMonth: '2026-06',
    attribution: 'pool', source: 'template', templateId: 'tpl-internet',
    status: 'posted', handler: '系统', audit: [], isProjection: false,
  },
  // 2026-07 房租
  {
    id: 'exp-rent-202607', expenseNo: 'EXP-202607-001',
    categoryPrimary: 'OFFICE', categorySecondary: 'OFFICE_RENT',
    amount: 35000, occurDate: '2026-07-01', billingMonth: '2026-07',
    attribution: 'pool', source: 'template', templateId: 'tpl-rent',
    status: 'posted', handler: '系统', audit: [], isProjection: false,
  },
  // 2026-07 物业
  {
    id: 'exp-property-202607', expenseNo: 'EXP-202607-002',
    categoryPrimary: 'OFFICE', categorySecondary: 'OFFICE_PROPERTY',
    amount: 8000, occurDate: '2026-07-01', billingMonth: '2026-07',
    attribution: 'pool', source: 'template', templateId: 'tpl-property',
    status: 'posted', handler: '系统', audit: [], isProjection: false,
  },
  // 2026-07 水电（浮动，pending 待确认）
  {
    id: 'exp-utilities-202607', expenseNo: 'EXP-202607-003',
    categoryPrimary: 'OFFICE', categorySecondary: 'OFFICE_UTILITIES',
    amount: 4800, occurDate: '2026-07-05', billingMonth: '2026-07',
    attribution: 'pool', source: 'template', templateId: 'tpl-utilities',
    status: 'pending', handler: '系统', audit: [], isProjection: false,
  },
  // 种子投影行（来源=差旅，只读，演示投影形态）
  {
    id: 'exp-travel-proj', expenseNo: 'EXP-202607-004',
    categoryPrimary: 'TRAVEL', categorySecondary: 'TRAVEL_TRANSPORT',
    amount: 5500, occurDate: '2026-07-15', billingMonth: '2026-07',
    attribution: 'project', projectId: 'project-001',
    source: 'travel', status: 'posted', handler: '系统',
    audit: [], isProjection: true,
  },
];

/** 工资引用（最近已出账月 2026-05） */
export const mockSalaryForOverhead = [
  { employeeId: 'E001', actualSalary: 15000, nominalSalary: 15000 },
  { employeeId: 'E002', actualSalary: 12000, nominalSalary: 12000 },
  { employeeId: 'E003', actualSalary: 18000, nominalSalary: 18000 },
  { employeeId: 'E004', actualSalary: 10000, nominalSalary: 10000 },
  { employeeId: 'E005', nominalSalary: 8000 }, // 钱七无 actualSalary
];
