// 员工域数据访问服务（B5 数据接缝）。UI 只依赖本接口：
//  - α版（纯前端）：createMockEmployeeService() —— 内存，以 initialEmployees 作种子
//  - β版（前后端）：createHttpEmployeeService(baseUrl) —— 调 Cloudflare Workers 的 /api/employees

import { initialEmployees } from '@/app/pages/employee/mockData';
import type { Employee } from '@/app/pages/employee/mockData';

export interface EmployeeService {
  list(): Promise<Employee[]>;
  getById(id: string): Promise<Employee | undefined>;
}

/** α版：内存 mock，以 initialEmployees 为种子 */
export function createMockEmployeeService(): EmployeeService {
  let data = [...initialEmployees];
  return {
    async list() { return data; },
    async getById(id) { return data.find((e) => e.id === id); },
  };
}

/** β版：调 Workers /api/employees */
export function createHttpEmployeeService(baseUrl: string): EmployeeService {
  const url = (path: string) => `${baseUrl.replace(/\/$/, '')}${path}`;

  return {
    async list() {
      const res = await fetch(url('/api/employees'));
      if (!res.ok) throw new Error(`GET /api/employees ${res.status}`);
      const json = await res.json() as { employees: Employee[] };
      return json.employees ?? [];
    },
    async getById(id) {
      const res = await fetch(url(`/api/employees/${id}`));
      if (!res.ok) return undefined;
      const json = await res.json() as { employee?: Employee };
      return json.employee;
    },
  };
}
