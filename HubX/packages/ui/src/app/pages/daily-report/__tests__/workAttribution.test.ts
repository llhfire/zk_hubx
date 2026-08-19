import { describe, expect, test } from 'vitest';
import {
  getWorkAttributionAccounting,
  getWorkAttributionOptions,
  WORK_ATTRIBUTION_CATEGORIES,
  WORK_ATTRIBUTION_CATEGORY_LABELS,
} from '../workAttribution';
import { createDefaultDepartmentRoutineConfigs, isLegacyOperationsRoutine } from '../jobWorkConfigData';

describe('work attribution', () => {
  test('新增日报工作归属显示六个业务分类', () => {
    expect(WORK_ATTRIBUTION_CATEGORIES.map(item => WORK_ATTRIBUTION_CATEGORY_LABELS[item])).toEqual([
      '开发',
      '运营',
      '软件售前',
      '移民售前',
      '推广',
      '电商',
    ]);
  });

  test.each([
    ['external-project', 'project', 'project'],
    ['internal-project', 'project', 'internal-project'],
    ['department-routine', 'operation', 'operation'],
    ['presales-lead', 'lead', 'lead-pending'],
  ] as const)('%s 应映射到正确的关联类型和成本桶', (type, relationType, costBucket) => {
    expect(getWorkAttributionAccounting(type)).toEqual({ relationType, costBucket });
  });

  test('客户项目、内部项目和软件售前应读取对应关联对象', () => {
    expect(getWorkAttributionOptions('external-project').map(item => item.name)).toContain('A公司CRM系统开发');
    // 内部项目：当前所有项目 businessLine 均为「外包」，internal-project 过滤后为空
    const internalOptions = getWorkAttributionOptions('internal-project').map(item => item.name);
    expect(internalOptions).toEqual([]);
    expect(getWorkAttributionOptions('presales-lead', '', undefined, 'software-presales')
      .map(item => item.name))
      .toEqual(expect.arrayContaining(['线索跟进工时汇总', 'A公司CRM系统开发']));
  });

  test('软件售前项目列表将线索跟进工时汇总置于首项', () => {
    const options = getWorkAttributionOptions('presales-lead', '', undefined, 'software-presales');

    expect(options[0]).toMatchObject({
      id: 'lead-tracking-hours-summary',
      name: '线索跟进工时汇总',
    });
    // 项目列表随 initialProjects 动态变化，只验证首项和长度
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options[1].name).toBe('A公司CRM系统开发');
  });

  test('日报项目配置按工作归属返回对应子类型', () => {
    const configs = createDefaultDepartmentRoutineConfigs();
    const options = getWorkAttributionOptions(
      'internal-project',
      '',
      configs,
      'operations',
    );

    expect(options.map(item => item.name)).toEqual(['招聘', '人事管理', '财务管理', '其他']);
    expect(getWorkAttributionOptions('presales-lead', '', configs, 'immigration-presales').map(item => item.name))
      .toEqual(['俄罗斯移民', '新加坡移民']);
    expect(getWorkAttributionOptions('department-routine', '', configs, 'promotion').map(item => item.name))
      .toEqual(['IP打造', '代运营', '其他']);
    expect(getWorkAttributionOptions('department-routine', '', configs, 'ecommerce').map(item => item.name))
      .toEqual(['微商城', '助农电商']);
  });

  test('运营日报项目包含四项默认配置', () => {
    expect(createDefaultDepartmentRoutineConfigs()
      .filter(config => config.category === 'operations')
      .map(config => config.name))
      .toEqual(['招聘', '人事管理', '财务管理', '其他']);
  });

  test('旧版运营默认项目应在本地配置中自动清理', () => {
    expect(isLegacyOperationsRoutine({
      id: 'routine-payroll',
      category: 'operations',
      name: '工资核算',
    })).toBe(true);
    expect(isLegacyOperationsRoutine({
      id: 'routine-custom-planning',
      category: 'operations',
      name: '企划',
    })).toBe(true);
    expect(isLegacyOperationsRoutine({
      id: 'routine-operations-recruitment',
      category: 'operations',
      name: '招聘',
    })).toBe(true);
  });

  test('同一业务类型可以配置多项项目并按顺序提供给日报', () => {
    const configs = createDefaultDepartmentRoutineConfigs().map(config => (
      config.id === 'routine-operations-recruitment'
        ? { ...config, sortOrder: 99 }
        : config
    ));
    configs.push(
      {
        id: 'routine-custom-a',
        category: 'operations',
        departmentId: 'company',
        name: '自定义项目A',
        enabled: true,
        sortOrder: 0,
        remark: '',
      },
      {
        id: 'routine-custom-b',
        category: 'operations',
        departmentId: 'company',
        name: '自定义项目B',
        enabled: true,
        sortOrder: 1,
        remark: '',
      },
    );

    const options = getWorkAttributionOptions('internal-project', '', configs, 'operations');
    expect(options.slice(0, 2).map(item => item.name)).toEqual(['自定义项目A', '自定义项目B']);
  });
});
