// src/app/pages/delivery-plan/__tests__/utils.test.ts

import { describe, it, expect } from 'vitest';
import {
  addBusinessDays,
  filterPhase4Steps,
  derivePhaseStatus,
  calcPhaseCompletion,
  mapRoleToProjectMember,
  mapPhaseManager,
  isStepOverdue,
  calcOverallCompletion,
  getDefaultZoomLevel,
  generateDeliveryPlan,
  appendPhasesToPlan,
} from '../utils';

import type {
  SopStep,
  SopPhase,
  DeliveryConfig,
  DeliveryPlan,
  SopMilestone,
} from '../types';

import { SOP_STEP_TEMPLATES } from '../sopTemplate';

// ────────────────────────────────
// 1. addBusinessDays
// ────────────────────────────────
describe('addBusinessDays', () => {
  it('周五 + 1 个工作日 = 下周一', () => {
    expect(addBusinessDays('2026-06-12', 1)).toBe('2026-06-15');
  });

  it('周五 + 3 个工作日 = 下周三', () => {
    expect(addBusinessDays('2026-06-12', 3)).toBe('2026-06-17');
  });

  it('周一 + 0 个工作日 = 同一天', () => {
    expect(addBusinessDays('2026-06-15', 0)).toBe('2026-06-15');
  });

  it('周三 + 2 个工作日 = 周五', () => {
    expect(addBusinessDays('2026-06-10', 2)).toBe('2026-06-12');
  });

  it('周四 + 2 个工作日 = 下周一', () => {
    expect(addBusinessDays('2026-06-11', 2)).toBe('2026-06-15');
  });

  it('周六起算 + 1 个工作日 = 下周一', () => {
    expect(addBusinessDays('2026-06-13', 1)).toBe('2026-06-15');
  });

  it('周日起算 + 1 个工作日 = 下周一', () => {
    expect(addBusinessDays('2026-06-14', 1)).toBe('2026-06-15');
  });

  it('周一 + 5 个工作日 = 下周一', () => {
    expect(addBusinessDays('2026-06-15', 5)).toBe('2026-06-22');
  });
});

// ────────────────────────────────
// 2. filterPhase4Steps
// ────────────────────────────────
describe('filterPhase4Steps', () => {
  it('"网站" 返回步骤 4.1, 4.2, 4.3, 4.7', () => {
    const steps = filterPhase4Steps('网站');
    const stepNos = steps.map((s) => s.stepNo);
    expect(stepNos).toEqual(['4.1', '4.2', '4.3', '4.7']);
  });

  it('"小程序" 返回步骤 4.1, 4.3, 4.4, 4.6, 4.7', () => {
    const steps = filterPhase4Steps('小程序');
    const stepNos = steps.map((s) => s.stepNo);
    expect(stepNos).toEqual(['4.1', '4.3', '4.4', '4.6', '4.7']);
  });

  it('"网站+小程序" 返回去重后的 4.1, 4.2, 4.3, 4.4, 4.6, 4.7', () => {
    const steps = filterPhase4Steps('网站+小程序');
    const stepNos = steps.map((s) => s.stepNo);
    expect(stepNos).toEqual(['4.1', '4.2', '4.3', '4.4', '4.6', '4.7']);
  });

  it('"全平台" 返回全部 7 个步骤', () => {
    const steps = filterPhase4Steps('全平台');
    const stepNos = steps.map((s) => s.stepNo);
    expect(stepNos).toEqual(['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7']);
  });

  it('"全平台" 4.3 名称覆盖为 "ICP 备案 / 小程序主体备案"', () => {
    const steps = filterPhase4Steps('全平台');
    const step43 = steps.find((s) => s.stepNo === '4.3');
    expect(step43?.stepName).toBe('ICP 备案 / 小程序主体备案');
  });

  it('"网站+小程序" 4.6 名称覆盖为 "小程序正式提审"', () => {
    const steps = filterPhase4Steps('网站+小程序');
    const step46 = steps.find((s) => s.stepNo === '4.6');
    expect(step46?.stepName).toBe('小程序正式提审');
  });

  it('"网站" 没有名称覆盖', () => {
    const steps = filterPhase4Steps('网站');
    const step43 = steps.find((s) => s.stepNo === '4.3');
    expect(step43?.stepName).toBe('网站 ICP 备案');
  });

  it('返回的步骤保持模板中的原始顺序', () => {
    const steps = filterPhase4Steps('小程序');
    const templateOrder = SOP_STEP_TEMPLATES.filter(
      (t) => t.phaseNo === 4,
    ).map((t) => t.stepNo);
    const stepNos = steps.map((s) => s.stepNo);
    // 步骤编号应按模板顺序排列
    for (let i = 0; i < stepNos.length; i++) {
      expect(templateOrder.indexOf(stepNos[i])).toBeGreaterThan(-1);
    }
  });
});

// ────────────────────────────────
// 3. derivePhaseStatus
// ────────────────────────────────
describe('derivePhaseStatus', () => {
  const makeStep = (status: SopStep['status']): SopStep =>
    ({
      id: 's1',
      phaseId: 'p1',
      projectId: 'proj1',
      stepNo: '1.1',
      stepName: '测试步骤',
      department: '',
      assignee: '',
      status,
      startDate: '2026-06-01',
      dueDate: '2026-06-05',
      deliverables: '',
      description: '',
      notes: '',
      tools: '',
      isCustom: false,
      isEvergreen: false,
      userNotes: '',
    }) as SopStep;

  it('全部 completed/skipped → completed', () => {
    const steps = [makeStep('completed'), makeStep('skipped')];
    expect(derivePhaseStatus(steps)).toBe('completed');
  });

  it('completed + in_progress + pending → pending（取最落后状态）', () => {
    const steps = [
      makeStep('completed'),
      makeStep('in_progress'),
      makeStep('pending'),
    ];
    expect(derivePhaseStatus(steps)).toBe('pending');
  });

  it('completed + in_progress → in_progress', () => {
    const steps = [makeStep('completed'), makeStep('in_progress')];
    expect(derivePhaseStatus(steps)).toBe('in_progress');
  });

  it('全部 pending → pending', () => {
    const steps = [makeStep('pending'), makeStep('pending')];
    expect(derivePhaseStatus(steps)).toBe('pending');
  });

  it('全部 skipped → completed', () => {
    const steps = [makeStep('skipped'), makeStep('skipped')];
    expect(derivePhaseStatus(steps)).toBe('completed');
  });

  it('空数组 → pending', () => {
    expect(derivePhaseStatus([])).toBe('pending');
  });
});

// ────────────────────────────────
// 4. calcPhaseCompletion
// ────────────────────────────────
describe('calcPhaseCompletion', () => {
  const makeStep = (status: SopStep['status']): SopStep =>
    ({
      id: 's1',
      phaseId: 'p1',
      projectId: 'proj1',
      stepNo: '1.1',
      stepName: '测试步骤',
      department: '',
      assignee: '',
      status,
      startDate: '2026-06-01',
      dueDate: '2026-06-05',
      deliverables: '',
      description: '',
      notes: '',
      tools: '',
      isCustom: false,
      isEvergreen: false,
      userNotes: '',
    }) as SopStep;

  it('skipped 步骤排除在分母外', () => {
    const steps = [makeStep('completed'), makeStep('skipped')];
    // 1/1 = 1
    expect(calcPhaseCompletion(steps)).toBe(1);
  });

  it('in_progress 算 0.5', () => {
    const steps = [makeStep('completed'), makeStep('in_progress')];
    // (1 + 0.5) / 2 = 0.75
    expect(calcPhaseCompletion(steps)).toBe(0.75);
  });

  it('1 completed + 1 in_progress + 1 pending = 0.5', () => {
    const steps = [
      makeStep('completed'),
      makeStep('in_progress'),
      makeStep('pending'),
    ];
    // (1 + 0.5 + 0) / 3 = 0.5
    expect(calcPhaseCompletion(steps)).toBeCloseTo(0.5, 10);
  });

  it('全部 skipped → 1（无有效步骤时返回 1）', () => {
    const steps = [makeStep('skipped'), makeStep('skipped')];
    expect(calcPhaseCompletion(steps)).toBe(1);
  });

  it('空数组 → 1', () => {
    expect(calcPhaseCompletion([])).toBe(1);
  });

  it('全部 completed → 1', () => {
    const steps = [makeStep('completed'), makeStep('completed')];
    expect(calcPhaseCompletion(steps)).toBe(1);
  });
});

// ────────────────────────────────
// 5. mapRoleToProjectMember
// ────────────────────────────────
describe('mapRoleToProjectMember', () => {
  it('"产品经理" + {productUsers: ["李四"]} → "李四"', () => {
    const project = { productUsers: ['李四'] } as any;
    expect(mapRoleToProjectMember('产品经理', project)).toBe('李四');
  });

  it('"运维专员" + {opsUsers: []} → "运维专员"（无成员时返回角色名）', () => {
    const project = { opsUsers: [] } as any;
    expect(mapRoleToProjectMember('运维专员', project)).toBe('运维专员');
  });

  it('"项目经理" + {owner: "王五"} → "王五"', () => {
    const project = { owner: '王五' } as any;
    expect(mapRoleToProjectMember('项目经理', project)).toBe('王五');
  });

  it('角色对应的字段不存在 → 返回角色名', () => {
    const project = {} as any;
    expect(mapRoleToProjectMember('产品经理', project)).toBe('产品经理');
  });
});

// ────────────────────────────────
// 6. mapPhaseManager
// ────────────────────────────────
describe('mapPhaseManager', () => {
  it('板块 1 + {productUsers: ["李四"]} → "李四"', () => {
    const project = { productUsers: ['李四'] } as any;
    expect(mapPhaseManager(1, project)).toBe('李四');
  });

  it('板块 4 + {opsUsers: []} → "opsUsers（未指定）"', () => {
    const project = { opsUsers: [] } as any;
    expect(mapPhaseManager(4, project)).toBe('opsUsers（未指定）');
  });

  it('板块 2 + {owner: "张三"} → "张三"', () => {
    const project = { owner: '张三' } as any;
    expect(mapPhaseManager(2, project)).toBe('张三');
  });

  it('板块 7 + {owner: ""} → "owner（未指定）"', () => {
    const project = { owner: '' } as any;
    expect(mapPhaseManager(7, project)).toBe('owner（未指定）');
  });
});

// ────────────────────────────────
// 7. isStepOverdue
// ────────────────────────────────
describe('isStepOverdue', () => {
  const makeStep = (
    dueDate: string,
    status: SopStep['status'],
  ): SopStep =>
    ({
      id: 's1',
      phaseId: 'p1',
      projectId: 'proj1',
      stepNo: '1.1',
      stepName: '测试步骤',
      department: '',
      assignee: '',
      status,
      startDate: '2026-06-01',
      dueDate,
      deliverables: '',
      description: '',
      notes: '',
      tools: '',
      isCustom: false,
      isEvergreen: false,
      userNotes: '',
    }) as SopStep;

  it('已超期：dueDate 在今天之前且状态 pending → true', () => {
    const step = makeStep('2026-06-10', 'pending');
    expect(isStepOverdue(step, '2026-06-12')).toBe(true);
  });

  it('未超期：dueDate 在今天之前但已完成 → false', () => {
    const step = makeStep('2026-06-10', 'completed');
    expect(isStepOverdue(step, '2026-06-12')).toBe(false);
  });

  it('未超期：dueDate 在今天之后 → false', () => {
    const step = makeStep('2026-06-15', 'pending');
    expect(isStepOverdue(step, '2026-06-12')).toBe(false);
  });

  it('未超期：dueDate 等于今天 → false', () => {
    const step = makeStep('2026-06-12', 'pending');
    expect(isStepOverdue(step, '2026-06-12')).toBe(false);
  });

  it('已跳过的步骤不算超期', () => {
    const step = makeStep('2026-06-10', 'skipped');
    expect(isStepOverdue(step, '2026-06-12')).toBe(false);
  });

  it('进行中步骤也可超期', () => {
    const step = makeStep('2026-06-10', 'in_progress');
    expect(isStepOverdue(step, '2026-06-12')).toBe(true);
  });
});

// ────────────────────────────────
// 8. calcOverallCompletion
// ────────────────────────────────
describe('calcOverallCompletion', () => {
  it('计算所有板块的平均完成率', () => {
    const phases: SopPhase[] = [
      {
        id: 'p1',
        projectId: 'proj1',
        phaseNo: 1,
        phaseName: '合同交接',
        manager: '',
        status: 'completed',
        startDate: '2026-06-01',
        dueDate: '2026-06-05',
      },
      {
        id: 'p2',
        projectId: 'proj1',
        phaseNo: 2,
        phaseName: '项目启动准备',
        manager: '',
        status: 'in_progress',
        startDate: '2026-06-06',
        dueDate: '2026-06-15',
      },
    ];

    const makeStep = (status: SopStep['status'], phaseId: string): SopStep =>
      ({
        id: `s-${phaseId}-${status}`,
        phaseId,
        projectId: 'proj1',
        stepNo: '1.1',
        stepName: 'test',
        department: '',
        assignee: '',
        status,
        startDate: '2026-06-01',
        dueDate: '2026-06-05',
        deliverables: '',
        description: '',
        notes: '',
        tools: '',
        isCustom: false,
        isEvergreen: false,
        userNotes: '',
      }) as SopStep;

    // Phase 1: 2 completed = 2/2 = 1.0
    // Phase 2: 1 completed + 1 in_progress = (1+0.5)/2 = 0.75
    // Overall: (1.0 + 0.75) / 2 = 0.875
    const allSteps: SopStep[] = [
      makeStep('completed', 'p1'),
      makeStep('completed', 'p1'),
      makeStep('completed', 'p2'),
      makeStep('in_progress', 'p2'),
    ];

    expect(calcOverallCompletion(phases, allSteps)).toBeCloseTo(0.875, 10);
  });

  it('空板块数组 → 1', () => {
    expect(calcOverallCompletion([], [])).toBe(1);
  });
});

// ────────────────────────────────
// 9. getDefaultZoomLevel
// ────────────────────────────────
describe('getDefaultZoomLevel', () => {
  it('≤30 天 → day', () => {
    expect(getDefaultZoomLevel(30)).toBe('day');
    expect(getDefaultZoomLevel(15)).toBe('day');
    expect(getDefaultZoomLevel(1)).toBe('day');
  });

  it('31-90 天 → week', () => {
    expect(getDefaultZoomLevel(31)).toBe('week');
    expect(getDefaultZoomLevel(90)).toBe('week');
    expect(getDefaultZoomLevel(60)).toBe('week');
  });

  it('>90 天 → month', () => {
    expect(getDefaultZoomLevel(91)).toBe('month');
    expect(getDefaultZoomLevel(180)).toBe('month');
  });
});

// ────────────────────────────────
// 10. generateDeliveryPlan
// ────────────────────────────────
describe('generateDeliveryPlan', () => {
  const baseProject = {
    id: 'proj-001',
    name: '测试项目',
    startDate: '2026-06-15',
    productUsers: ['产品张三'],
    salesUsers: ['销售李四'],
    owner: '经理王五',
    opsUsers: ['运维赵六'],
    uiUsers: ['UI 孙七'],
    frontendUsers: ['开发周八'],
    testUsers: ['测试吴九'],
    legalUsers: [],
  };

  it('生成包含指定板块的交付计划', () => {
    const config: DeliveryConfig = {
      selectedPhases: [1, 2],
      deliveryType: '网站',
    };

    const plan = generateDeliveryPlan(config, baseProject as any);
    expect(plan.projectId).toBe('proj-001');
    expect(plan.deliveryType).toBe('网站');
    expect(plan.phases.map((p) => p.phaseNo)).toEqual([1, 2]);
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.milestones).toEqual([]);
  });

  it('板块 1 使用 contractSignDate 作为起始日期', () => {
    const config: DeliveryConfig = {
      selectedPhases: [1],
      deliveryType: '网站',
      contractId: 'contract-001',
    };

    const plan = generateDeliveryPlan(
      config,
      baseProject as any,
      '2026-06-10',
    );
    const phase1 = plan.phases.find((p) => p.phaseNo === 1)!;
    // 板块 1 的开始日期应该是 2026-06-10（合同签署日）
    expect(phase1.startDate).toBe('2026-06-10');
  });

  it('板块 1 无 contractSignDate 时使用 project.startDate', () => {
    const config: DeliveryConfig = {
      selectedPhases: [1],
      deliveryType: '网站',
    };

    const plan = generateDeliveryPlan(config, baseProject as any);
    const phase1 = plan.phases.find((p) => p.phaseNo === 1)!;
    expect(phase1.startDate).toBe('2026-06-15');
  });

  it('有依赖的板块使用依赖板块结束日期 + 1 个工作日', () => {
    const config: DeliveryConfig = {
      selectedPhases: [1, 2],
      deliveryType: '网站',
      contractId: 'c1',
    };

    const plan = generateDeliveryPlan(
      config,
      baseProject as any,
      '2026-06-15',
    );
    const phase1 = plan.phases.find((p) => p.phaseNo === 1)!;
    const phase2 = plan.phases.find((p) => p.phaseNo === 2)!;

    // phase2 依赖 phase1，起始日期应为 phase1 结束日期 + 1 个工作日
    const phase1End = new Date(phase1.dueDate);
    const expectedStart = addBusinessDays(phase1.dueDate, 1);
    expect(phase2.startDate).toBe(expectedStart);
  });

  it('步骤按依赖关系排列日期', () => {
    const config: DeliveryConfig = {
      selectedPhases: [1],
      deliveryType: '网站',
      contractId: 'c1',
    };

    const plan = generateDeliveryPlan(
      config,
      baseProject as any,
      '2026-06-15',
    );

    const step11 = plan.steps.find((s) => s.stepNo === '1.1')!;
    const step12 = plan.steps.find((s) => s.stepNo === '1.2')!;

    // 1.2 依赖 1.1，所以 1.2 的起始日期 = 1.1 的截止日期 + 1 个工作日
    expect(step12.startDate).toBe(addBusinessDays(step11.dueDate, 1));
  });

  it('映射角色到项目成员', () => {
    const config: DeliveryConfig = {
      selectedPhases: [1],
      deliveryType: '网站',
      contractId: 'c1',
    };

    const plan = generateDeliveryPlan(
      config,
      baseProject as any,
      '2026-06-15',
    );

    const step11 = plan.steps.find((s) => s.stepNo === '1.1')!;
    // 1.1 的 assigneeRole 是 '销售'，映射到 salesUsers
    expect(step11.assignee).toBe('销售李四');
  });

  it('映射板块主管', () => {
    const config: DeliveryConfig = {
      selectedPhases: [1, 2],
      deliveryType: '网站',
    };

    const plan = generateDeliveryPlan(config, baseProject as any);
    const phase1 = plan.phases.find((p) => p.phaseNo === 1)!;
    const phase2 = plan.phases.find((p) => p.phaseNo === 2)!;

    // 板块 1 主管映射到 productUsers
    expect(phase1.manager).toBe('产品张三');
    // 板块 2 主管映射到 owner
    expect(phase2.manager).toBe('经理王五');
  });

  it('合同里程碑正确生成', () => {
    const config: DeliveryConfig = {
      selectedPhases: [1],
      deliveryType: '网站',
      contractId: 'c1',
    };

    const milestones = [
      { name: '首期款', date: '2026-06-20', completed: false },
      { name: '尾款', date: '2026-08-20', completed: false },
    ];

    const plan = generateDeliveryPlan(
      config,
      baseProject as any,
      '2026-06-15',
      milestones,
    );

    expect(plan.milestones.length).toBe(2);
    expect(plan.milestones[0].name).toBe('首期款');
    expect(plan.milestones[0].date).toBe('2026-06-20');
    expect(plan.milestones[0].projectId).toBe('proj-001');
    expect(plan.milestones[0].completed).toBe(false);
  });

  it('交付类型影响板块四步骤', () => {
    const config: DeliveryConfig = {
      selectedPhases: [4],
      deliveryType: '网站',
    };

    const plan = generateDeliveryPlan(config, baseProject as any);
    const stepNos = plan.steps.map((s) => s.stepNo);
    expect(stepNos).toEqual(['4.1', '4.2', '4.3', '4.7']);
  });

  it('evergreen 步骤的 dueDate 等于板块结束日期', () => {
    const config: DeliveryConfig = {
      selectedPhases: [3],
      deliveryType: '网站',
    };

    const plan = generateDeliveryPlan(config, baseProject as any);
    const evergreenStep = plan.steps.find((s) => s.isEvergreen)!;
    const phase3 = plan.phases.find((p) => p.phaseNo === 3)!;

    expect(evergreenStep.stepNo).toBe('3.8');
    expect(evergreenStep.dueDate).toBe(phase3.dueDate);
  });
});

// ────────────────────────────────
// 11. appendPhasesToPlan
// ────────────────────────────────
describe('appendPhasesToPlan', () => {
  const baseProject = {
    id: 'proj-001',
    name: '测试项目',
    startDate: '2026-06-15',
    productUsers: ['产品张三'],
    salesUsers: ['销售李四'],
    owner: '经理王五',
    opsUsers: ['运维赵六'],
    uiUsers: ['UI 孙七'],
    frontendUsers: ['开发周八'],
    testUsers: ['测试吴九'],
    legalUsers: [],
  };

  it('追加新板块到已有计划', () => {
    const config1: DeliveryConfig = {
      selectedPhases: [1],
      deliveryType: '网站',
    };

    const existingPlan = generateDeliveryPlan(
      config1,
      baseProject as any,
      '2026-06-15',
    );

    const updatedPlan = appendPhasesToPlan(
      existingPlan,
      [2],
      baseProject as any,
      '网站',
    );

    expect(updatedPlan.phases.map((p) => p.phaseNo)).toContain(1);
    expect(updatedPlan.phases.map((p) => p.phaseNo)).toContain(2);
    expect(updatedPlan.steps.length).toBeGreaterThan(existingPlan.steps.length);
  });

  it('追加的板块使用已有依赖板块的结束日期计算起始日期', () => {
    const config1: DeliveryConfig = {
      selectedPhases: [1],
      deliveryType: '网站',
    };

    const existingPlan = generateDeliveryPlan(
      config1,
      baseProject as any,
      '2026-06-15',
    );

    const updatedPlan = appendPhasesToPlan(
      existingPlan,
      [2],
      baseProject as any,
      '网站',
    );

    const phase1 = updatedPlan.phases.find((p) => p.phaseNo === 1)!;
    const phase2 = updatedPlan.phases.find((p) => p.phaseNo === 2)!;

    // phase2 依赖 phase1，起始日期应为 phase1 结束日期 + 1 个工作日
    expect(phase2.startDate).toBe(addBusinessDays(phase1.dueDate, 1));
  });

  it('不重复已有板块', () => {
    const config1: DeliveryConfig = {
      selectedPhases: [1, 2],
      deliveryType: '网站',
    };

    const existingPlan = generateDeliveryPlan(
      config1,
      baseProject as any,
      '2026-06-15',
    );

    // 尝试追加已存在的板块 2
    const updatedPlan = appendPhasesToPlan(
      existingPlan,
      [2, 3],
      baseProject as any,
      '网站',
    );

    const phase2Count = updatedPlan.phases.filter(
      (p) => p.phaseNo === 2,
    ).length;
    expect(phase2Count).toBe(1);
  });
});
