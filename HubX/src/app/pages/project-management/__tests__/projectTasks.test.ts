import { describe, expect, test } from 'vitest';
import { initialProjects } from '../mockData';
import { getProjectTaskSummary, PROJECT_TASK_TYPES } from '../projectTasks';

describe('project task assignment', () => {
  test('新建任务提供固定的任务类型', () => {
    expect(PROJECT_TASK_TYPES).toEqual(['开发', 'UI 设计', '产品设计', '测试', '账号注册', 'bug']);
  });

  test('项目任务摘要会区分待开始、处理中和已完成任务', () => {
    const project = initialProjects.find((item) => item.id === '1')!;
    expect(getProjectTaskSummary(project)).toEqual({
      totalCount: 2,
      pendingCount: 1,
      inProgressCount: 1,
      overdueCount: 0,
      completedCount: 0,
    });
  });
});
