import { describe, expect, test } from 'vitest';
import { initialProjects } from '../mockData';
import { getProjectBugSummary } from '../projectQuality';

describe('project bug management', () => {
  test('项目 Bug 摘要会识别 P1 未关闭 Bug', () => {
    const project = initialProjects.find((item) => item.id === '1')!;
    expect(getProjectBugSummary(project)).toMatchObject({
      status: '预警',
      openCount: 2,
      fixingCount: 1,
    });
  });
});
