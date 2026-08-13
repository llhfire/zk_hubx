import {
  initialDailyReports as mockDailyReports,
  type ProjectDailyReport,
} from '../project-management/mockData';

// ─── 权限 ───────────────────────────────────────────────────
export interface ContractCostPermissions {
  salaryView: boolean;
  salaryEdit: boolean;
  contractCostView: boolean;
  contractCostDetail: boolean;
}

export const contractCostPermissions: ContractCostPermissions = {
  salaryView: true,
  salaryEdit: true,
  contractCostView: true,
  contractCostDetail: true,
};

// ─── 月度工资 ────────────────────────────────────────────────
export interface MonthlySalaryRecord {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  month: string;               // "YYYY-MM"
  nominalSalary: number;
  nominalHours: number;
  actualSalary?: number;
  actualHours?: number;
  inherited: boolean;
}

export const STANDARD_MONTHLY_HOURS = 176;

export const mockSalaryData: MonthlySalaryRecord[] = [
  // ── 2026-05 ──
  {
    employeeId: 'E001',
    employeeName: '张三',
    department: '销售部',
    position: '销售经理',
    month: '2026-05',
    nominalSalary: 15000,
    nominalHours: STANDARD_MONTHLY_HOURS,
    actualSalary: 15500,
    actualHours: 180,
    inherited: false,
  },
  {
    employeeId: 'E002',
    employeeName: '李四',
    department: '产品部',
    position: '产品经理',
    month: '2026-05',
    nominalSalary: 18000,
    nominalHours: STANDARD_MONTHLY_HOURS,
    actualSalary: 18200,
    actualHours: 176,
    inherited: false,
  },
  {
    employeeId: 'E003',
    employeeName: '王五',
    department: '技术部',
    position: '前端开发工程师',
    month: '2026-05',
    nominalSalary: 16000,
    nominalHours: STANDARD_MONTHLY_HOURS,
    actualSalary: 16800,
    actualHours: 184,
    inherited: false,
  },
  {
    employeeId: 'E004',
    employeeName: '赵六',
    department: '技术部',
    position: '后端开发工程师',
    month: '2026-05',
    nominalSalary: 17000,
    nominalHours: STANDARD_MONTHLY_HOURS,
    actualSalary: 17500,
    actualHours: 180,
    inherited: false,
  },
  {
    employeeId: 'E005',
    employeeName: '钱七',
    department: '技术部',
    position: '前端开发工程师',
    month: '2026-05',
    nominalSalary: 14000,
    nominalHours: STANDARD_MONTHLY_HOURS,
    // 钱七 2026-05 无 actualSalary / actualHours
    inherited: false,
  },

  // ── 2026-04 ──
  {
    employeeId: 'E001',
    employeeName: '张三',
    department: '销售部',
    position: '销售经理',
    month: '2026-04',
    nominalSalary: 15000,
    nominalHours: STANDARD_MONTHLY_HOURS,
    actualSalary: 15200,
    actualHours: 178,
    inherited: false,
  },
  {
    employeeId: 'E002',
    employeeName: '李四',
    department: '产品部',
    position: '产品经理',
    month: '2026-04',
    nominalSalary: 18000,
    nominalHours: STANDARD_MONTHLY_HOURS,
    actualSalary: 18000,
    actualHours: 176,
    inherited: false,
  },
  {
    employeeId: 'E003',
    employeeName: '王五',
    department: '技术部',
    position: '前端开发工程师',
    month: '2026-04',
    nominalSalary: 16000,
    nominalHours: STANDARD_MONTHLY_HOURS,
    actualSalary: 16500,
    actualHours: 182,
    inherited: false,
  },
  {
    employeeId: 'E004',
    employeeName: '赵六',
    department: '技术部',
    position: '后端开发工程师',
    month: '2026-04',
    nominalSalary: 17000,
    nominalHours: STANDARD_MONTHLY_HOURS,
    actualSalary: 17200,
    actualHours: 178,
    inherited: false,
  },
  {
    employeeId: 'E005',
    employeeName: '钱七',
    department: '技术部',
    position: '前端开发工程师',
    month: '2026-04',
    nominalSalary: 14000,
    nominalHours: STANDARD_MONTHLY_HOURS,
    actualSalary: 14500,
    actualHours: 174,
    inherited: false,
  },
];

// ─── 工资查询工具 ─────────────────────────────────────────────

/**
 * 获取指定月份的工资数据。
 * 若该月份无数据则沿用上月（inherited = true）。
 */
export function getSalaryForMonth(
  month: string,
  allSalary: MonthlySalaryRecord[] = mockSalaryData,
): MonthlySalaryRecord[] {
  const direct = allSalary.filter((r) => r.month === month);
  if (direct.length > 0) return direct;

  // 计算上月 "YYYY-MM"
  const [yearStr, monthStr] = month.split('-');
  let y = Number(yearStr);
  let m = Number(monthStr) - 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  const prevMonth = `${y}-${String(m).padStart(2, '0')}`;
  const prev = allSalary.filter((r) => r.month === prevMonth);
  return prev.map((r) => ({ ...r, month, inherited: true }));
}

/**
 * 计算时薪。
 * useActual = true 时优先使用 actualSalary / actualHours，缺失则回退名义值。
 */
export function getHourlyRate(
  record: MonthlySalaryRecord,
  useActual: boolean,
): number {
  if (useActual && record.actualSalary != null && record.actualHours != null && record.actualHours > 0) {
    return record.actualSalary / record.actualHours;
  }
  return record.nominalHours > 0
    ? record.nominalSalary / record.nominalHours
    : 0;
}

// ─── 合同 ↔ 项目映射 ────────────────────────────────────────

/** 合同 ID → 关联项目 ID 列表 */
export const contractProjectMap: Record<string, string[]> = {
  '1': ['1'],
  '2': ['2'],
  '3': ['3'],
  '4': ['1'],
};

/** 合同 ID → 合同名称（与 FinancialDashboard contractData 对齐） */
export const contractNames: Record<string, string> = {
  '1': '企业管理系统开发合同',
  '2': '云服务平台建设合同',
  '3': '协作工具定制开发合同',
  '4': 'A公司CRM系统开发',
};

// ─── 商务成本 ────────────────────────────────────────────────

export interface BusinessCostRecord {
  id: string;
  contractId: string;
  month: string;
  category: string;
  description: string;
  amount: number;
}

export const mockBusinessCosts: BusinessCostRecord[] = [
  { id: 'biz-1', contractId: '4', month: '2026-05', category: '商务招待', description: 'A公司项目客户接待晚宴', amount: 3200 },
  { id: 'biz-2', contractId: '4', month: '2026-05', category: '差旅费', description: 'A公司驻场出差交通住宿', amount: 4800 },
  { id: 'biz-3', contractId: '2', month: '2026-05', category: '商务招待', description: 'B公司验收阶段客户沟通', amount: 1500 },
  { id: 'biz-4', contractId: '3', month: '2026-05', category: '培训费', description: '内部OA新流程培训材料', amount: 800 },
];

// ─── 外包成本 ────────────────────────────────────────────────

export interface OutsourceCostRecord {
  id: string;
  contractId: string;
  month: string;
  vendorName: string;
  description: string;
  amount: number;
}

export const mockOutsourceCosts: OutsourceCostRecord[] = [
  { id: 'out-1', contractId: '4', month: '2026-05', vendorName: '蓝鸟科技', description: 'CRM系统UI切图外包', amount: 12000 },
  { id: 'out-2', contractId: '2', month: '2026-05', vendorName: '星辰软件', description: '小程序支付模块联调', amount: 8000 },
];

// ─── 其他成本 ────────────────────────────────────────────────

export interface OtherCostRecord {
  id: string;
  contractId: string;
  month: string;
  category: string;
  description: string;
  amount: number;
}

export const mockOtherCosts: OtherCostRecord[] = [
  { id: 'oth-1', contractId: '4', month: '2026-05', category: '服务器', description: 'A公司项目测试服务器', amount: 2000 },
  { id: 'oth-2', contractId: '2', month: '2026-05', category: '第三方服务', description: '小程序短信验证接口费', amount: 600 },
  { id: 'oth-3', contractId: '3', month: '2026-05', category: '软件授权', description: '内部OA流程引擎许可', amount: 3500 },
];

// ─── 月运营费用 ──────────────────────────────────────────────

/** 月份 → 当月总运营费用 */
export const mockMonthlyOpExpenses: Record<string, number> = {
  '2026-04': 52000,
  '2026-05': 55000,
};

export const ACTIVE_EMPLOYEE_COUNT = 5;

/**
 * 运营费用时薪 = 月运营费用 / 在职人数 / 标准月工时
 */
export function getHourlyOpCost(month: string): number {
  const expense = mockMonthlyOpExpenses[month] ?? 0;
  if (expense === 0 || ACTIVE_EMPLOYEE_COUNT === 0) return 0;
  return expense / ACTIVE_EMPLOYEE_COUNT / STANDARD_MONTHLY_HOURS;
}

// ─── 研发成本明细 ────────────────────────────────────────────

export interface RDCostDetail {
  employeeId: string;
  employeeName: string;
  position: string;
  hours: number;
  hourlyRate: number;
  cost: number;
}

/**
 * 根据日报工时和工资数据，构建某合同某月的研发人力成本明细。
 */
export function buildRDCostDetails(
  contractId: string,
  month: string,
  salaryData: MonthlySalaryRecord[] = mockSalaryData,
  useActual: boolean = false,
): RDCostDetail[] {
  const projectIds = contractProjectMap[contractId] ?? [];
  const monthSalary = getSalaryForMonth(month, salaryData);

  // 汇总日报工时（按人名聚合）
  const hoursByPerson = new Map<string, { hours: number; position: string }>();
  for (const report of mockDailyReports) {
    if (!projectIds.includes(report.projectId)) continue;
    if (!report.date.startsWith(month)) continue;

    const existing = hoursByPerson.get(report.personName) ?? { hours: 0, position: report.position };
    existing.hours += report.hours;
    hoursByPerson.set(report.personName, existing);
  }

  const details: RDCostDetail[] = [];
  for (const [personName, { hours, position }] of hoursByPerson) {
    const salaryRecord = monthSalary.find((s) => s.employeeName === personName);
    const hourlyRate = salaryRecord ? getHourlyRate(salaryRecord, useActual) : 0;
    details.push({
      employeeId: salaryRecord?.employeeId ?? '',
      employeeName: personName,
      position,
      hours,
      hourlyRate,
      cost: hours * hourlyRate,
    });
  }

  return details;
}

// ─── 运营成本明细 ────────────────────────────────────────────

export interface OpCostDetail {
  employeeName: string;
  position: string;
  hours: number;
  hourlyOpCost: number;
  cost: number;
}

/**
 * 根据日报工时和月运营费用，构建某合同某月的运营分摊成本明细。
 */
export function buildOpCostDetails(
  contractId: string,
  month: string,
): OpCostDetail[] {
  const projectIds = contractProjectMap[contractId] ?? [];
  const hourlyOp = getHourlyOpCost(month);

  const hoursByPerson = new Map<string, { hours: number; position: string }>();
  for (const report of mockDailyReports) {
    if (!projectIds.includes(report.projectId)) continue;
    if (!report.date.startsWith(month)) continue;

    const existing = hoursByPerson.get(report.personName) ?? { hours: 0, position: report.position };
    existing.hours += report.hours;
    hoursByPerson.set(report.personName, existing);
  }

  const details: OpCostDetail[] = [];
  for (const [employeeName, { hours, position }] of hoursByPerson) {
    details.push({
      employeeName,
      position,
      hours,
      hourlyOpCost: hourlyOp,
      cost: hours * hourlyOp,
    });
  }

  return details;
}

// ─── 辅助判断 ────────────────────────────────────────────────

/**
 * 判断指定月份是否存在实际工资数据（至少一条记录有 actualSalary）。
 */
export function hasActualData(
  month: string,
  salaryData: MonthlySalaryRecord[] = mockSalaryData,
): boolean {
  return salaryData.some(
    (r) => r.month === month && r.actualSalary != null,
  );
}

// 重新导出供其他模块使用
export { mockDailyReports, type ProjectDailyReport };
