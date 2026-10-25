/**
 * 项目阻塞项 + 风险等级测试
 */

import { describe, it, expect } from 'vitest';
import {
  BLOCKER_SOURCE_LABEL,
  BLOCKER_SEVERITY_LABEL,
  BLOCKER_SEVERITY_COLOR,
  PROJECT_RISK_LEVEL_LABEL,
  PROJECT_RISK_LEVEL_COLOR,
  type ProjectBlocker,
  type ProjectRiskLevel,
  type BlockerSource,
  type BlockerSeverity,
} from '../types';

describe('ProjectBlocker 类型', () => {
  it('BLOCKER_SOURCE_LABEL 覆盖三种来源', () => {
    expect(BLOCKER_SOURCE_LABEL.customer).toBe('客户侧');
    expect(BLOCKER_SOURCE_LABEL.third_party).toBe('第三方');
    expect(BLOCKER_SOURCE_LABEL.internal).toBe('内部');
    const keys: BlockerSource[] = ['customer', 'third_party', 'internal'];
    expect(Object.keys(BLOCKER_SOURCE_LABEL)).toEqual(expect.arrayContaining(keys));
  });

  it('BLOCKER_SEVERITY_LABEL 覆盖三种严重程度', () => {
    expect(BLOCKER_SEVERITY_LABEL.critical).toBe('阻塞');
    expect(BLOCKER_SEVERITY_LABEL.major).toBe('高风险');
    expect(BLOCKER_SEVERITY_LABEL.minor).toBe('关注');
  });

  it('BLOCKER_SEVERITY_COLOR 每级有颜色', () => {
    for (const key of Object.keys(BLOCKER_SEVERITY_COLOR)) {
      expect(BLOCKER_SEVERITY_COLOR[key as BlockerSeverity]).toBeTruthy();
    }
  });

  it('ProjectBlocker 结构完整性', () => {
    const blocker: ProjectBlocker = {
      id: 'b1',
      projectId: 'p1',
      title: '客户验收环境未搭建',
      source: 'customer',
      severity: 'critical',
      customerEta: '2026-08-29',
      expectedResolveDate: '2026-08-30',
      owner: '张三',
      resolved: false,
      createdAt: '2026-08-25',
    };
    expect(blocker.source).toBe('customer');
    expect(blocker.severity).toBe('critical');
    expect(blocker.customerEta).toBe('2026-08-29');
    expect(blocker.resolved).toBe(false);
  });
});

describe('ProjectRiskLevel 类型', () => {
  it('PROJECT_RISK_LEVEL_LABEL 覆盖四级', () => {
    expect(PROJECT_RISK_LEVEL_LABEL.high).toBe('高风险');
    expect(PROJECT_RISK_LEVEL_LABEL.medium).toBe('中风险');
    expect(PROJECT_RISK_LEVEL_LABEL.low).toBe('低风险');
    expect(PROJECT_RISK_LEVEL_LABEL.none).toBe('无风险');
    const keys: ProjectRiskLevel[] = ['high', 'medium', 'low', 'none'];
    expect(Object.keys(PROJECT_RISK_LEVEL_LABEL)).toEqual(expect.arrayContaining(keys));
  });

  it('PROJECT_RISK_LEVEL_COLOR 每级有颜色', () => {
    for (const key of Object.keys(PROJECT_RISK_LEVEL_COLOR)) {
      expect(PROJECT_RISK_LEVEL_COLOR[key as ProjectRiskLevel]).toBeTruthy();
    }
  });
});

describe('活跃阻塞项过滤', () => {
  it('过滤已解决的阻塞项', () => {
    const blockers: ProjectBlocker[] = [
      { id: 'b1', projectId: 'p1', title: '阻塞1', source: 'customer', severity: 'critical', resolved: false, createdAt: '2026-08-25' },
      { id: 'b2', projectId: 'p1', title: '阻塞2', source: 'internal', severity: 'minor', resolved: true, resolvedAt: '2026-08-26', createdAt: '2026-08-25' },
      { id: 'b3', projectId: 'p1', title: '阻塞3', source: 'third_party', severity: 'major', resolved: false, createdAt: '2026-08-25' },
    ];
    const active = blockers.filter((b) => !b.resolved);
    expect(active).toHaveLength(2);
    expect(active[0].id).toBe('b1');
    expect(active[1].id).toBe('b3');
  });
});
