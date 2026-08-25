import { describe, expect, it } from 'vitest';
import { deriveProjectViewMetrics } from '../projectViewMetrics';
import type { Project } from '../mockData';

const spawned: Project = {
  id: 'ap-9',
  projectNo: 'PRJ20260822009',
  name: '签约客户项目（待确认）',
  latestProgress: '主合同已创建，等待管理员确认并指派产品经理。',
  priority: '中',
  entity: '中科软艺',
  status: '未确认',
  businessLine: '外包',
  salesUsers: [],
  owner: '',
  assistants: [],
  productUsers: [],
  uiUsers: [],
  frontendUsers: [],
  backendUsers: [],
  opsUsers: [],
  testUsers: [],
  legalUsers: [],
  progress: 0,
  startDate: '',
  expectedEndDate: '',
  remark: '',
  attachments: [],
  leadId: 'lead-x',
  contractId: 'c-9',
  createdAt: '2026-08-22 00:00',
};

describe('deriveProjectViewMetrics', () => {
  it('B3 spawn 项目不在 PROJECT_LIST 时仍能派生 360 指标', () => {
    const m = deriveProjectViewMetrics(spawned, {
      customerName: '签约客户',
      contractAmount: 100000,
      receivedAmount: 0,
    });
    expect(m.id).toBe('ap-9');
    expect(m.customerName).toBe('签约客户');
    expect(m.contractAmount).toBe(100000);
    expect(m.budgetHours).toBe(0);
    expect(m.healthStatus).toBe('normal');
  });
});
