import { describe, expect, it } from 'vitest';
import type { Project } from '@/app/pages/project-management/mockData';
import {
  applyAdvanceStatus,
  applyConfirmAssign,
  applyReassignPm,
  canAdvanceStatus,
  validateProjectStatusWrite,
} from '../projectMutations';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    projectNo: 'PRJ1',
    name: '测试项目',
    latestProgress: '',
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
    createdAt: '2026-08-22 10:00',
    ...overrides,
  };
}

describe('projectMutations', () => {
  it('确认指派：未确认 → 未开始，owner = 产品经理', () => {
    const next = applyConfirmAssign(makeProject(), '李四');
    expect(next.status).toBe('未开始');
    expect(next.owner).toBe('李四');
    expect(next.productUsers).toEqual(['李四']);
  });

  it('未确认项目不能直接推进到进行中', () => {
    expect(canAdvanceStatus('未确认', '进行中')).toBe(false);
    expect(() => applyAdvanceStatus(makeProject(), '进行中')).toThrow(/不允许/);
  });

  it('进行中可推进到验收中 / 搁置', () => {
    const p = makeProject({ status: '进行中', owner: '李四', productUsers: ['李四'] });
    expect(applyAdvanceStatus(p, '验收中').status).toBe('验收中');
    expect(applyAdvanceStatus(p, '搁置').status).toBe('搁置');
  });

  it('改指产品经理仅未开始/进行中', () => {
    const started = makeProject({ status: '未开始', owner: '李四', productUsers: ['李四'] });
    expect(applyReassignPm(started, '王五').owner).toBe('王五');
    expect(() => applyReassignPm(makeProject({ status: '已完成' }), '王五')).toThrow(/改指/);
  });

  it('validateProjectStatusWrite：未确认必须确认指派且有 owner', () => {
    expect(validateProjectStatusWrite('未确认', '已完成', '李四')).toMatch(/未开始/);
    expect(validateProjectStatusWrite('未确认', '未开始', '')).toMatch(/产品经理/);
    expect(validateProjectStatusWrite('未确认', '未开始', '李四')).toBeNull();
    expect(validateProjectStatusWrite('进行中', '验收中', '李四')).toBeNull();
    expect(validateProjectStatusWrite('已完成', '进行中', '李四')).toMatch(/不允许/);
  });
});
