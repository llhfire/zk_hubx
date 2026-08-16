import { describe, expect, test } from 'vitest';
import { initialProjects } from '../mockData';
import { getProjectFeatureSummary } from '../projectFeatures';

describe('project feature list', () => {
  test('项目功能摘要按范围状态统计功能点', () => {
    const project = initialProjects.find((item) => item.id === '1')!;
    expect(getProjectFeatureSummary(project)).toEqual({
      totalCount: 2,
      pendingCount: 0,
      developingCount: 1,
      testingCount: 1,
      releasedCount: 0,
    });
  });
});
