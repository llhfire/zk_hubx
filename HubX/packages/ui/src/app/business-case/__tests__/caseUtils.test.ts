import { describe, expect, it } from 'vitest';
import {
  buildPresalesTimeline,
  confirmProject,
  filterProjectsForViewer,
  isVisibleToProductManager,
  leadProjectBanner,
  shouldSpawnUnconfirmedProject,
  spawnUnconfirmedProject,
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
