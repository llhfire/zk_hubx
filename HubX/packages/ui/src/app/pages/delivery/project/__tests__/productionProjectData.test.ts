import { describe, expect, it } from 'vitest';
import { PROJECT_LIST } from '../projectMockData';
import {
  PRODUCTION_PROJECT_LIST,
  PRODUCTION_PROJECT_SOURCE_IDS,
} from '../productionProjectData';
import { PRODUCTION_PROJECT_SNAPSHOT } from '../productionProjectSnapshot';

describe('生产站项目快照', () => {
  it('完整保存接口返回的 36 条唯一项目', () => {
    expect(PRODUCTION_PROJECT_SNAPSHOT).toHaveLength(36);
    expect(new Set(PRODUCTION_PROJECT_SOURCE_IDS).size).toBe(36);
    expect(Math.min(...PRODUCTION_PROJECT_SOURCE_IDS)).toBe(74);
    expect(Math.max(...PRODUCTION_PROJECT_SOURCE_IDS)).toBe(126);
  });

  it('保持生产状态分布，并如实标记缺失配置', () => {
    const countBy = <T extends string>(values: T[]) => (
      values.reduce<Record<string, number>>((counts, value) => {
        counts[value] = (counts[value] ?? 0) + 1;
        return counts;
      }, {})
    );

    expect(countBy(PRODUCTION_PROJECT_LIST.map((project) => project.status))).toEqual({
      '进行中': 22,
      '验收中': 9,
      '搁置': 3,
      '催款中': 2,
    });
    expect(PRODUCTION_PROJECT_LIST.filter((project) => project.priority === '未设置')).toHaveLength(5);
    expect(PRODUCTION_PROJECT_LIST.filter((project) => project.businessLine === '未设置')).toHaveLength(5);
  });

  it('生产项目排在列表前面，已有关联的项目沿用本地 id', () => {
    expect(PROJECT_LIST.slice(0, 36).every((project) => project.sourceSystem === 'production')).toBe(true);
    expect(PROJECT_LIST).toHaveLength(44);

    const railway = PROJECT_LIST.find((project) => project.sourceProjectId === 121);
    expect(railway).toMatchObject({
      id: '12',
      projectNo: 'PRJ-121',
      name: '中铁信息化',
      contractId: '12',
      totalHours: 774,
    });
  });

  it('快照中不落盘登录信息、原始链接或完整手机号', () => {
    const serialized = JSON.stringify(PRODUCTION_PROJECT_SNAPSHOT);
    expect(serialized).not.toMatch(/speed_access_token|Bearer\s|123456/);
    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).not.toMatch(/\b1\d{10}\b/);
  });
});

