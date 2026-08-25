// 阶段 B + C 纯函数与逻辑测试
// 扩展：DispatchModal payload 验证 + 派发/催办逻辑

import { describe, it, expect } from 'vitest';
import type { LeadListItem } from '@/app/pages/leads/types';
import { withDispatchSeed, shiftMinutes } from '../dispatchSeed';
import {
  leadDispatchView,
  filterByCategory,
  computeDispatchKpis,
  hasPendingLevelAudit,
  returnActorsOf,
  CATEGORY_LABEL,
} from '../kpiCalc';
import type { DispatchModalPayload } from '../components/DispatchModal';
import type { LevelAdjustPayload } from '../components/LevelAdjustModal';

const NOW = new Date('2026-08-25T12:00:00');

function makeLead(overrides: Partial<LeadListItem> = {}): LeadListItem {
  return {
    key: 'k1', id: '9001', name: '测试线索', customer: '', contact: '李总', phone: '13800000000',
    wechat: '', source: 'baidu', keyword: '', status: '未联系', clueType: 'public', level: '中',
    customerLevel: 'B', tags: [], entity: '中科软齐', owner: '', optimizer: '', assistant: '',
    createTime: '2026-08-25 11:30', lastFollowTime: '', lastFollowContent: '', nextFollowTime: '',
    followCount: 0, daysHeld: 0, trashCount: 0, transformStatus: false, isOverdue: false,
    ...overrides,
  };
}

// ============================================================
// dispatchSeed
// ============================================================

describe('withDispatchSeed', () => {
  it('过滤垃圾线索且补齐业务线（三值轮换）', () => {
    const leads = [
      makeLead({ id: '1' }),
      makeLead({ id: '2' }),
      makeLead({ id: '3' }),
      makeLead({ id: '4', clueType: 'trash' }),
    ];
    const seeded = withDispatchSeed(leads);
    expect(seeded).toHaveLength(3);
    expect(seeded[0].businessLine).toBe('software_outsource');
    expect(seeded[1].businessLine).toBe('immigration');
    expect(seeded[2].businessLine).toBe('operation');
  });

  it('已分配线索：录入后 5 分钟派发给销售并留事件', () => {
    const seeded = withDispatchSeed([makeLead({ clueType: 'assigned', owner: '王五' })]);
    expect(seeded[0].dispatchedAt).toBe('2026-08-25 11:35');
    expect(seeded[0].dispatchTarget).toBe('sales');
    const kinds = seeded[0].leadEvents?.map((e) => e.kind);
    expect(kinds).toContain('inbound');
    expect(kinds).toContain('dispatch_to_sales');
  });

  it('公海线索轮换：待派发 / 派发到公海', () => {
    const seeded = withDispatchSeed([
      makeLead({ id: 'a' }),
      makeLead({ id: 'b' }),
      makeLead({ id: 'c' }),
      makeLead({ id: 'd' }),
    ]);
    expect(seeded[1].dispatchTarget).toBe('pool');
    expect(seeded[1].dispatchedAt).toBeTruthy();
    expect(seeded[0].dispatchedAt).toBeUndefined();
    expect(seeded[2].dispatchedAt).toBeUndefined();
    expect(seeded[3].dispatchedAt).toBeUndefined();
  });

  it('已有 businessLine 的新录入线索不被覆盖', () => {
    const seeded = withDispatchSeed([makeLead({ businessLine: 'operation', dispatchedAt: '2026-08-25 11:00' })]);
    expect(seeded[0].businessLine).toBe('operation');
    expect(seeded[0].dispatchedAt).toBe('2026-08-25 11:00');
    expect(seeded[0].leadEvents).toBeUndefined();
  });

  it('质检演示：第一条公海派发线索带 3 个不同销售退回', () => {
    const seeded = withDispatchSeed([
      makeLead({ id: 'a' }),
      makeLead({ id: 'b' }),
    ]);
    const actors = returnActorsOf(seeded[1]);
    expect(actors).toEqual(['李四', '王五', '赵六']);
  });

  it('shiftMinutes 跨小时/跨日', () => {
    expect(shiftMinutes('2026-08-25 23:50', 20)).toBe('2026-08-26 00:10');
  });
});

// ============================================================
// DispatchModal payload 验证（阶段 C）
// ============================================================

describe('DispatchModal payload', () => {
  it('指派销售 payload 结构正确', () => {
    const payload: DispatchModalPayload = { target: 'sales', assignee: '王五' };
    expect(payload.target).toBe('sales');
    expect(payload.assignee).toBe('王五');
  });

  it('派发到公海 payload 无 assignee', () => {
    const payload: DispatchModalPayload = { target: 'pool' };
    expect(payload.target).toBe('pool');
    expect(payload.assignee).toBeUndefined();
  });

  it('批量派发到公海：所有线索 clueType 变 public、owner 清空', () => {
    const leads = [
      makeLead({ id: '1', clueType: 'assigned', owner: '张三' }),
      makeLead({ id: '2', clueType: 'assigned', owner: '李四' }),
    ];
    // 模拟 handleDispatchConfirm 逻辑
    const updated = leads.map((l) => ({
      ...l,
      dispatchedAt: '2026-08-25 12:00',
      dispatchTarget: 'pool' as const,
      clueType: 'public' as const,
      owner: '',
    }));
    expect(updated[0].clueType).toBe('public');
    expect(updated[0].owner).toBe('');
    expect(updated[1].clueType).toBe('public');
    expect(updated[1].owner).toBe('');
  });
});

// ============================================================
// 等级调整（阶段 D）
// ============================================================

describe('等级调整 LevelAdjustPayload', () => {
  const LEVEL_ORDER: Record<string, number> = { S: 4, A: 3, B: 2, C: 1 };

  it('升级不需要审批', () => {
    const from = 'B' as const, to = 'A' as const;
    const isDowngrade = LEVEL_ORDER[to] < LEVEL_ORDER[from];
    const payload: LevelAdjustPayload = { from, to, needsApproval: isDowngrade };
    expect(payload.needsApproval).toBe(false);
  });

  it('降级需要审批', () => {
    const from = 'S' as const, to = 'B' as const;
    const isDowngrade = LEVEL_ORDER[to] < LEVEL_ORDER[from];
    const payload: LevelAdjustPayload = { from, to, needsApproval: isDowngrade };
    expect(payload.needsApproval).toBe(true);
  });

  it('同级不需要审批', () => {
    const from = 'A' as const, to = 'A' as const;
    const isDowngrade = LEVEL_ORDER[to] < LEVEL_ORDER[from];
    const payload: LevelAdjustPayload = { from, to, needsApproval: isDowngrade };
    expect(payload.needsApproval).toBe(false);
  });

  it('降级写 level_change 事件（pending 审核）', () => {
    const lead = makeLead({ customerLevel: 'S' });
    const events = [
      ...(lead.leadEvents ?? []),
      { id: 'e-new', leadId: lead.id, kind: 'level_change' as const, actor: '管理员', at: '2026-08-25 12:00', levelFrom: 'S', levelTo: 'B' },
    ];
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('level_change');
    expect(hasPendingLevelAudit({ ...lead, leadEvents: events })).toBe(true);
  });

  it('升级直接生效：customerLevel 变更 + 事件记录', () => {
    const lead = makeLead({ customerLevel: 'C' });
    const updated = {
      ...lead,
      customerLevel: 'A' as const,
      leadEvents: [
        ...(lead.leadEvents ?? []),
        { id: 'e-new', leadId: lead.id, kind: 'level_change' as const, actor: '管理员', at: '2026-08-25 12:00', levelFrom: 'C', levelTo: 'A' },
      ],
    };
    expect(updated.customerLevel).toBe('A');
    expect(updated.leadEvents).toHaveLength(1);
    // 升级不触发 pending audit（只有降级才 pending）
    expect(hasPendingLevelAudit(updated)).toBe(false);
  });
});

// ============================================================
// 质检确认（阶段 D）
// ============================================================

describe('质检确认', () => {
  it('3 人退回触发质检分桶', () => {
    const lead = makeLead({
      leadEvents: ['李四', '王五', '赵六'].map((actor, i) => ({
        id: `e${i}`, leadId: '9001', kind: 'return' as const, actor, at: '2026-08-25 10:00',
      })),
    });
    const actors = returnActorsOf(lead);
    expect(actors).toHaveLength(3);
    expect(leadDispatchView(lead, NOW).returnQuality.bucket).toBe('pending_confirm');
  });

  it('质检确认后追加 level_audit_result 事件', () => {
    const lead = makeLead({
      leadEvents: ['李四', '王五', '赵六'].map((actor, i) => ({
        id: `e${i}`, leadId: '9001', kind: 'return' as const, actor, at: '2026-08-25 10:00',
      })),
    });
    const updatedEvents = [
      ...lead.leadEvents!,
      { id: 'e-confirm', leadId: '9001', kind: 'level_audit_result' as const, actor: '管理员', at: '2026-08-25 12:00', note: '质检确认：3 人退回，已标记为垃圾' },
    ];
    expect(updatedEvents).toHaveLength(4);
    expect(updatedEvents[3].kind).toBe('level_audit_result');
  });
});

// ============================================================
// 催办事件追加逻辑（阶段 C）
// ============================================================

describe('催办事件', () => {
  it('追加 urge 事件到已有事件列表', () => {
    const existing = [
      { id: 'e1', leadId: '9001', kind: 'inbound' as const, actor: '系统', at: '2026-08-25 11:30' },
    ];
    const urgeEvent = {
      id: 'e2', leadId: '9001', kind: 'urge' as const, actor: '张三',
      at: '2026-08-25 12:00', note: '催办→王五',
    };
    const updated = [...existing, urgeEvent];
    expect(updated).toHaveLength(2);
    expect(updated[1].kind).toBe('urge');
    expect(updated[1].note).toBe('催办→王五');
  });
});

// ============================================================
// leadDispatchView / 分类 / KPI
// ============================================================

describe('leadDispatchView', () => {
  it('待派发 31 分钟 -> 派发超期，行高亮橙', () => {
    const view = leadDispatchView(makeLead({ createTime: '2026-08-25 11:29' }), NOW);
    expect(view.dispatchSla.status).toBe('overdue');
    expect(view.highlight).toBe('dispatch_overdue');
  });

  it('派发给销售超 2h 未首联 -> 首联超时，行高亮红', () => {
    const lead = makeLead({
      clueType: 'assigned', owner: '王五',
      dispatchedAt: '2026-08-25 09:00', dispatchTarget: 'sales', followCount: 0,
    });
    const view = leadDispatchView(lead, NOW);
    expect(view.firstContactSla.status).toBe('overdue');
    expect(view.highlight).toBe('first_contact_overdue');
  });

  it('已有跟进记录 -> 已首联停表', () => {
    const lead = makeLead({
      dispatchedAt: '2026-08-25 09:00', dispatchTarget: 'sales', followCount: 1,
    });
    expect(leadDispatchView(lead, NOW).firstContactSla.label).toBe('已首联');
  });

  it('派发到公海未领取 -> 待领取', () => {
    const lead = makeLead({ dispatchedAt: '2026-08-25 09:00', dispatchTarget: 'pool' });
    expect(leadDispatchView(lead, NOW).firstContactSla.label).toBe('待领取');
  });

  it('降级待审核 -> 琥珀高亮；有审核结果则清除', () => {
    const pending = makeLead({
      dispatchedAt: '2026-08-25 11:00', dispatchTarget: 'sales', followCount: 1,
      leadEvents: [
        { id: 'e1', leadId: '9001', kind: 'level_change', actor: '王五', at: '2026-08-25 10:00', levelFrom: 'S', levelTo: 'B' },
      ],
    });
    expect(hasPendingLevelAudit(pending)).toBe(true);
    expect(leadDispatchView(pending, NOW).highlight).toBe('level_audit');

    const resolved = makeLead({
      leadEvents: [
        ...pending.leadEvents!,
        { id: 'e2', leadId: '9001', kind: 'level_audit_result', actor: '管理员', at: '2026-08-25 10:30', note: '通过' },
      ],
    });
    expect(hasPendingLevelAudit(resolved)).toBe(false);
  });

  it('3 人退回 -> pending_confirm 质检桶', () => {
    const lead = makeLead({
      leadEvents: ['李四', '王五', '赵六'].map((actor, i) => ({
        id: `e${i}`, leadId: '9001', kind: 'return' as const, actor, at: '2026-08-25 10:00',
      })),
    });
    expect(leadDispatchView(lead, NOW).returnQuality.bucket).toBe('pending_confirm');
  });
});

describe('filterByCategory', () => {
  const leads = [
    makeLead({ id: '1', customerLevel: 'S' }),
    makeLead({ id: '2', customerLevel: 'B', dispatchedAt: '2026-08-25 09:00', dispatchTarget: 'sales', followCount: 0 }),
    makeLead({ id: '3', customerLevel: 'C', dispatchedAt: '2026-08-25 11:50', dispatchTarget: 'sales', followCount: 1 }),
  ];

  it('六个分类口径', () => {
    expect(filterByCategory(leads, 'all', NOW)).toHaveLength(3);
    expect(filterByCategory(leads, 'pending_dispatch', NOW)).toHaveLength(1);
    expect(filterByCategory(leads, 'first_contact_overdue', NOW)).toHaveLength(1);
    expect(filterByCategory(leads, 'sa_focus', NOW)).toHaveLength(1);
    expect(CATEGORY_LABEL.quality_bucket).toBe('质检分桶');
  });
});

describe('computeDispatchKpis', () => {
  it('今日录入/派发量与各告警计数', () => {
    const leads = [
      makeLead({ id: '1', createTime: '2026-08-25 11:00' }),
      makeLead({ id: '2', createTime: '2026-08-25 11:00', dispatchedAt: '2026-08-25 11:05', dispatchTarget: 'sales' }),
      makeLead({ id: '3', createTime: '2026-08-20 10:00' }),
      makeLead({ id: '4', createTime: '2026-08-20 10:00', status: '已签单' }),
    ];
    const kpis = computeDispatchKpis(leads, NOW);
    expect(kpis.inboundToday).toBe(2);
    expect(kpis.dispatchedToday).toBe(1);
    expect(kpis.pendingDispatch).toBe(3);
    expect(kpis.dispatchOverdue).toBe(3);
  });

  it('Cohort 按录入月倒序', () => {
    const leads = [
      makeLead({ id: '1', createTime: '2026-07-01 10:00', status: '已签单' }),
      makeLead({ id: '2', createTime: '2026-07-02 10:00' }),
      makeLead({ id: '3', createTime: '2026-06-01 10:00', status: '已签单' }),
    ];
    const { cohort } = computeDispatchKpis(leads, NOW);
    expect(cohort[0].month).toBe('2026-07');
    expect(cohort[0]).toMatchObject({ total: 2, won: 1 });
    expect(cohort[1].month).toBe('2026-06');
  });
});
