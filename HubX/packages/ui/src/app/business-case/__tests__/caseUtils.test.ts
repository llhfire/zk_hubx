import { describe, expect, it } from 'vitest';
import {
  buildPresalesTimeline,
  buildUnconfirmedProject,
  canReassignProject,
  canReturnToLead,
  confirmProject,
  customerPartyMismatch,
  filterProjectsForViewer,
  isInternalProject,
  isVisibleToProductManager,
  leadProjectBanner,
  projectBudgetAlert,
  reassignProductManager,
  shelveProject,
  shouldSpawnUnconfirmedProject,
  spawnUnconfirmedProject,
  startDelivery,
} from '../caseUtils';

describe('shouldSpawnUnconfirmedProject', () => {
  it('未到签约且没有合同，不建项目', () => {
    expect(
      shouldSpawnUnconfirmedProject({
        leadStatus: '方案报价',
        hasProject: false,
        contracts: [],
      }),
    ).toBe(false);
  });

  it('线索进入合同洽谈且尚无项目，必须建未确认项目', () => {
    expect(
      shouldSpawnUnconfirmedProject({
        leadStatus: '合同洽谈',
        hasProject: false,
        contracts: [],
      }),
    ).toBe(true);
  });

  it('已签单且尚无项目，必须建未确认项目', () => {
    expect(
      shouldSpawnUnconfirmedProject({
        leadStatus: '已签单',
        hasProject: false,
        contracts: [],
      }),
    ).toBe(true);
  });

  it('线索仍是方案报价，但已有未作废主合同草稿，也要建项目', () => {
    expect(
      shouldSpawnUnconfirmedProject({
        leadStatus: '方案报价',
        hasProject: false,
        contracts: [{ status: 'draft' }],
      }),
    ).toBe(true);
  });

  it('已有项目则不再建', () => {
    expect(
      shouldSpawnUnconfirmedProject({
        leadStatus: '合同洽谈',
        hasProject: true,
        contracts: [{ status: 'draft' }],
      }),
    ).toBe(false);
  });

  it('已终止不建项目', () => {
    expect(
      shouldSpawnUnconfirmedProject({
        leadStatus: '已终止',
        hasProject: false,
        contracts: [],
      }),
    ).toBe(false);
  });

  it('仅有已作废合同，不算进入签约', () => {
    expect(
      shouldSpawnUnconfirmedProject({
        leadStatus: '方案报价',
        hasProject: false,
        contracts: [{ status: 'voided' }],
      }),
    ).toBe(false);
  });
});

describe('spawnUnconfirmedProject', () => {
  it('产出未确认项目：无产品负责人，并回写业务单 projectId', () => {
    const result = spawnUnconfirmedProject({
      caseId: 'case-1',
      leadId: 'lead-1',
      projectId: 'proj-1',
    });

    expect(result.project.status).toBe('未确认');
    expect(result.project.productUsers).toEqual([]);
    expect(result.project.leadId).toBe('lead-1');
    expect(result.case.projectId).toBe('proj-1');
    expect(result.case.leadId).toBe('lead-1');
    expect(result.case.contractId).toBeNull();
    expect(result.case.extraContractIds).toEqual([]);
    expect(result.case.quoteIds).toEqual([]);
  });
});

describe('buildUnconfirmedProject', () => {
  it('有合同：客户名/签约主体/contractId 取自合同', () => {
    const project = buildUnconfirmedProject({
      lead: { id: 'lead-1', name: '华信科技' },
      contract: { id: 'c-1', current: { customerName: '华信科技有限公司', signingEntity: '中科软艺' } },
      projectId: 'proj-1',
      today: '2026-08-18',
    });

    expect(project.status).toBe('未确认');
    expect(project.name).toBe('华信科技有限公司项目（待确认）');
    expect(project.entity).toBe('中科软艺');
    expect(project.contractId).toBe('c-1');
    expect(project.leadId).toBe('lead-1');
    expect(project.id).toBe('proj-1');
    expect(project.productUsers).toEqual([]);
    expect(project.owner).toBe('');
    expect(project.latestProgress).toContain('主合同已创建');
  });

  it('无合同：客户名取自线索入参，contractId 为空', () => {
    const project = buildUnconfirmedProject({
      lead: { id: 'lead-2', name: '远景信息' },
      projectId: 'proj-2',
      today: '2026-08-18',
    });

    expect(project.status).toBe('未确认');
    expect(project.name).toBe('远景信息项目（待确认）');
    expect(project.entity).toBe('中科软艺');
    expect(project.contractId).toBeUndefined();
    expect(project.leadId).toBe('lead-2');
    expect(project.latestProgress).toContain('线索进入签约阶段');
  });

  it('projectId 回写：产出实体 id = 入参 projectId', () => {
    const spawned = spawnUnconfirmedProject({ caseId: 'case-3', leadId: 'lead-3', projectId: 'proj-3' });
    const project = buildUnconfirmedProject({
      lead: { id: 'lead-3' },
      projectId: spawned.project.id,
      today: '2026-08-18',
    });

    expect(project.id).toBe('proj-3');
    expect(project.id).toBe(spawned.project.id);
  });
});

describe('confirmProject', () => {
  it('管理员指定产品经理后，状态变为未开始并写入负责人', () => {
    const confirmed = confirmProject({
      project: { status: '未确认', productUsers: [] },
      productManager: '李四',
    });

    expect(confirmed.status).toBe('未开始');
    expect(confirmed.productUsers).toEqual(['李四']);
    expect(confirmed.owner).toBe('李四');
  });

  it('未指定产品经理则拒绝确认', () => {
    expect(() =>
      confirmProject({
        project: { status: '未确认', productUsers: [] },
        productManager: '  ',
      }),
    ).toThrow(/产品经理/);
  });

  it('非未确认项目不能再走确认', () => {
    expect(() =>
      confirmProject({
        project: { status: '未开始', productUsers: ['李四'] },
        productManager: '王五',
      }),
    ).toThrow(/未确认/);
  });
});

describe('startDelivery（阶段 3 交付启动）', () => {
  it('未开始项目 + 新合同 -> 进行中并带上启动日期与合同关联', () => {
    const patch = startDelivery({
      project: { status: '未开始', contractId: null },
      contractId: 'c9',
      today: '2026-08-18',
    });
    expect(patch).not.toBeNull();
    expect(patch?.status).toBe('进行中');
    expect(patch?.startDate).toBe('2026-08-18');
    expect(patch?.contractId).toBe('c9');
    expect(patch?.latestProgress).toContain('交付已启动');
  });

  it('搁置项目也可被合同拉起', () => {
    expect(
      startDelivery({ project: { status: '搁置' }, contractId: 'c9', today: '2026-08-18' }),
    ).not.toBeNull();
  });

  it('未确认项目不启动（先走管理员确认指派）', () => {
    expect(
      startDelivery({ project: { status: '未确认' }, contractId: 'c9', today: '2026-08-18' }),
    ).toBeNull();
  });

  it('进行中/已完成项目不重复启动', () => {
    expect(
      startDelivery({ project: { status: '进行中' }, contractId: 'c9', today: '2026-08-18' }),
    ).toBeNull();
    expect(
      startDelivery({ project: { status: '已完成' }, contractId: 'c9', today: '2026-08-18' }),
    ).toBeNull();
  });

  it('项目已绑定其他合同时不启动', () => {
    expect(
      startDelivery({ project: { status: '未开始', contractId: 'c1' }, contractId: 'c9', today: '2026-08-18' }),
    ).toBeNull();
  });
});

describe('isVisibleToProductManager', () => {
  it('未确认项目对任何产品经理不可见', () => {
    expect(
      isVisibleToProductManager({ status: '未确认', productUsers: [] }, '李四'),
    ).toBe(false);
  });

  it('确认后仅指派的产品经理可见', () => {
    const project = { status: '未开始' as const, productUsers: ['李四'] };
    expect(isVisibleToProductManager(project, '李四')).toBe(true);
    expect(isVisibleToProductManager(project, '王五')).toBe(false);
  });
});

describe('filterProjectsForViewer', () => {
  const unconfirmed = { id: '4', status: '未确认' as const, productUsers: [] as string[] };
  const assigned = { id: '5', status: '未开始' as const, productUsers: ['李四'] };
  const otherPm = { id: '6', status: '进行中' as const, productUsers: ['王五'] };

  it('管理员能看到未确认和全部项目', () => {
    expect(
      filterProjectsForViewer([unconfirmed, assigned, otherPm], { isAdmin: true, viewerName: '张三' }).map((p) => p.id),
    ).toEqual(['4', '5', '6']);
  });

  it('产品经理默认看不到未确认，也看不到未指派给自己的单', () => {
    expect(
      filterProjectsForViewer([unconfirmed, assigned, otherPm], { isAdmin: false, viewerName: '李四' }).map((p) => p.id),
    ).toEqual(['5']);
  });
});

describe('leadProjectBanner', () => {
  it('没有项目时销售侧不展示执行条', () => {
    expect(leadProjectBanner(null)).toBe('none');
  });

  it('未确认时展示待管理员确认', () => {
    expect(leadProjectBanner({ status: '未确认', productUsers: [] })).toBe('pending_confirm');
  });

  it('已指派但未开工展示已指派', () => {
    expect(leadProjectBanner({ status: '未开始', productUsers: ['李四'] })).toBe('assigned');
  });

  it('进行中及之后展示执行中', () => {
    expect(leadProjectBanner({ status: '进行中', productUsers: ['李四'] })).toBe('in_execution');
  });
});

describe('buildPresalesTimeline', () => {
  const baseInput = {
    lead: {
      id: 'lead-9',
      name: '华信科技内部OA流程优化需求',
      createTime: '2026-06-05 14:20:00',
      requirement: '建设内部 OA 流程优化系统',
    },
    followUps: [
      { id: 'f1', time: '2026-06-10 10:00', method: '电话', content: '确认需求范围', operator: '张三' },
      { id: 'f2', time: '2026-06-06 09:30', method: '上门拜访', content: '现场调研', operator: '张三' },
    ],
    quotes: [
      { id: 'q1', name: 'OA流程优化报价单V2', createTime: '2026-06-15 16:20', amount: '960,000', flowStatus: '已审核' },
    ],
    contracts: [
      { id: 'c1', contractNo: 'ZKRY202606001', createTime: '2026-06-20 11:00', status: 'archived' },
    ],
  };

  it('聚合线索/跟进/报价/合同四类事件并按时间倒序', () => {
    const events = buildPresalesTimeline(baseInput);
    expect(events.map((event) => event.type)).toEqual(['contract', 'quote', 'follow', 'follow', 'lead']);
    const times = events.map((event) => event.time.slice(0, 16));
    const sorted = [...times].sort((a, b) => b.localeCompare(a));
    expect(times).toEqual(sorted);
  });

  it('报价事件带上金额与流程状态，跟进事件带跟进方式与操作人', () => {
    const events = buildPresalesTimeline(baseInput);
    const quote = events.find((event) => event.type === 'quote');
    expect(quote?.detail).toBe('报价金额 ¥960,000');
    expect(quote?.status).toBe('已审核');
    const follow = events.find((event) => event.type === 'follow');
    expect(follow?.title).toContain('电话');
    expect(follow?.status).toBe('张三');
  });

  it('带秒与不带秒的时间混排也能正确比较', () => {
    const events = buildPresalesTimeline({
      ...baseInput,
      lead: { ...baseInput.lead, createTime: '2026-06-20 11:00:30' },
    });
    expect(events[0].type).toBe('lead');
  });

  it('线索缺少创建时间时不产出线索事件，其余照常', () => {
    const events = buildPresalesTimeline({
      ...baseInput,
      lead: { ...baseInput.lead, createTime: '' },
    });
    expect(events.some((event) => event.type === 'lead')).toBe(false);
    expect(events).toHaveLength(4);
  });

  it('合同缺少创建时间则跳过', () => {
    const events = buildPresalesTimeline({
      ...baseInput,
      contracts: [{ id: 'c2', contractNo: 'X', status: 'draft' }],
    });
    expect(events.some((event) => event.type === 'contract')).toBe(false);
  });

  it('空输入只有线索创建时间时也只返回线索事件', () => {
    const events = buildPresalesTimeline({
      lead: baseInput.lead,
      followUps: [],
      quotes: [],
      contracts: [],
    });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('lead');
    expect(events[0].title).toBe('线索创建');
  });
});

describe('canReturnToLead 退回线索', () => {
  it('未确认项目可退回', () => {
    expect(canReturnToLead({ status: '未确认' }, []).allowed).toBe(true);
  });

  it('未开始且无未作废合同可退回', () => {
    expect(
      canReturnToLead({ status: '未开始' }, [{ id: 'c1', status: 'voided' }]).allowed,
    ).toBe(true);
  });

  it('未开始但有未作废合同不可退回', () => {
    const result = canReturnToLead({ status: '未开始' }, [{ id: 'c1', status: 'approved' }]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('未作废');
  });

  it('进行中不可退回', () => {
    const result = canReturnToLead({ status: '进行中' }, []);
    expect(result.allowed).toBe(false);
  });

  it('已完成不可退回', () => {
    expect(canReturnToLead({ status: '已完成' }, []).allowed).toBe(false);
  });

  it('搁置不可退回', () => {
    expect(canReturnToLead({ status: '搁置' }, []).allowed).toBe(false);
  });
});

describe('shelveProject 主合同作废→搁置', () => {
  it('进行中且绑定该合同 → 搁置', () => {
    const result = shelveProject({ project: { status: '进行中', contractId: 'c1' }, contractId: 'c1' });
    expect(result).not.toBeNull();
    expect(result!.status).toBe('搁置');
    expect(result!.latestProgress).toContain('作废');
  });

  it('进行中但绑其他合同 → 不动', () => {
    expect(shelveProject({ project: { status: '进行中', contractId: 'c2' }, contractId: 'c1' })).toBeNull();
  });

  it('未确认 → 不动', () => {
    expect(shelveProject({ project: { status: '未确认' }, contractId: 'c1' })).toBeNull();
  });

  it('未开始 → 不动', () => {
    expect(shelveProject({ project: { status: '未开始', contractId: 'c1' }, contractId: 'c1' })).toBeNull();
  });
});

describe('U5 改指产品经理', () => {
  it('admin + 未开始 → 可改指', () => {
    expect(canReassignProject({ status: '未开始' }, { isAdmin: true })).toBe(true);
  });

  it('admin + 进行中 → 可改指', () => {
    expect(canReassignProject({ status: '进行中' }, { isAdmin: true })).toBe(true);
  });

  it('admin + 未确认 → 不可改指', () => {
    expect(canReassignProject({ status: '未确认' }, { isAdmin: true })).toBe(false);
  });

  it('非 admin → 不可改指', () => {
    expect(canReassignProject({ status: '未开始' }, { isAdmin: false })).toBe(false);
  });

  it('reassignProductManager 联动 owner', () => {
    const result = reassignProductManager({ productUsers: ['旧PM'], owner: '旧PM' }, '新PM');
    expect(result.productUsers).toEqual(['新PM']);
    expect(result.owner).toBe('新PM');
  });

  it('reassignProductManager 空名抛错', () => {
    expect(() => reassignProductManager({ productUsers: [], owner: '' }, '  ')).toThrow();
  });
});

describe('U5 客户/甲方黄灯', () => {
  it('两侧非空且不等 → true', () => {
    expect(customerPartyMismatch('和昇塑料', '中科软艺')).toBe(true);
  });

  it('两侧相同 → false', () => {
    expect(customerPartyMismatch('和昇塑料', '和昇塑料')).toBe(false);
  });

  it('任一侧空 → false', () => {
    expect(customerPartyMismatch('', '中科软艺')).toBe(false);
    expect(customerPartyMismatch('和昇塑料', undefined)).toBe(false);
  });
});

describe('U6 内部项目', () => {
  it('无 leadId 且无 contractId → 内部项目', () => {
    expect(isInternalProject({})).toBe(true);
    expect(isInternalProject({ leadId: undefined, contractId: undefined })).toBe(true);
  });

  it('有 leadId → 非内部', () => {
    expect(isInternalProject({ leadId: 'lead-1' })).toBe(false);
  });

  it('有 contractId → 非内部', () => {
    expect(isInternalProject({ contractId: 'c1' })).toBe(false);
  });

  it('内部项目预算告警豁免', () => {
    expect(projectBudgetAlert({})).toBe('none');
  });
});
