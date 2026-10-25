import { describe, expect, it } from 'vitest';
import { dispatchSlaState, firstContactSlaState } from '../slaCalc';
import { canBeDispatched, canBeClaimed, returnQualityBucket } from '../dispatchRules';
import { filterLeadsByRoleView } from '../roleViewFilter';
import { admissionCohortRate } from '../cohortCalc';
import { appendLeadEvent, buildTimeline, generateEventId } from '../eventLog';
import { DEFAULT_SLA_CONFIG } from '../types';
import type { LeadEvent, SlaConfig } from '../types';

// ============================================================
// SLA 计算
// ============================================================

describe('dispatchSlaState', () => {
  const config: SlaConfig = { ...DEFAULT_SLA_CONFIG, dispatchTimeoutMinutes: 30, dispatchWarningMinutes: 15 };

  it('已派发 → normal + 已派发', () => {
    const result = dispatchSlaState('2026-08-25T10:00:00', '2026-08-25T10:05:00', new Date(), config);
    expect(result.status).toBe('normal');
    expect(result.label).toBe('已派发');
  });

  it('10 分钟内 → normal + 剩余', () => {
    const now = new Date('2026-08-25T10:10:00');
    const result = dispatchSlaState('2026-08-25T10:00:00', null, now, config);
    expect(result.status).toBe('normal');
    expect(result.remainingMinutes).toBe(20);
  });

  it('20 分钟 → warning（<=15 分钟）', () => {
    const now = new Date('2026-08-25T10:20:00');
    const result = dispatchSlaState('2026-08-25T10:00:00', null, now, config);
    expect(result.status).toBe('warning');
    expect(result.remainingMinutes).toBe(10);
  });

  it('35 分钟 → overdue', () => {
    const now = new Date('2026-08-25T10:35:00');
    const result = dispatchSlaState('2026-08-25T10:00:00', null, now, config);
    expect(result.status).toBe('overdue');
    expect(result.remainingMinutes).toBeLessThan(0);
  });
});

describe('firstContactSlaState', () => {
  const config: SlaConfig = { ...DEFAULT_SLA_CONFIG, firstContactTimeoutHours: 2, firstContactWarningHours: 1 };

  it('未派发 → 待派发', () => {
    const result = firstContactSlaState(null, null, null, false, new Date(), config);
    expect(result.status).toBe('normal');
    expect(result.label).toBe('待派发');
  });

  it('派发到公海未领取 → 待领取', () => {
    const result = firstContactSlaState('2026-08-25T10:05:00', 'pool', null, false, new Date(), config);
    expect(result.status).toBe('normal');
    expect(result.label).toBe('待领取');
  });

  it('派发到销售 30 分钟 → normal', () => {
    const now = new Date('2026-08-25T10:35:00');
    const result = firstContactSlaState('2026-08-25T10:05:00', 'sales', null, false, now, config);
    expect(result.status).toBe('normal');
  });

  it('派发到销售 1.5h → warning', () => {
    const now = new Date('2026-08-25T11:35:00'); // 1.5h after 10:05
    const result = firstContactSlaState('2026-08-25T10:05:00', 'sales', null, false, now, config);
    expect(result.status).toBe('warning');
  });

  it('派发到销售 2.5h → overdue', () => {
    const now = new Date('2026-08-25T12:35:00'); // 2.5h after 10:05
    const result = firstContactSlaState('2026-08-25T10:05:00', 'sales', null, false, now, config);
    expect(result.status).toBe('overdue');
  });

  it('已有首条跟进记录 -> 已首联停表（不再计时）', () => {
    const now = new Date('2026-08-25T18:35:00'); // 远超 2h
    const result = firstContactSlaState('2026-08-25T10:05:00', 'sales', null, true, now, config);
    expect(result.status).toBe('contacted');
    expect(result.label).toBe('已首联');
  });
});;

// ============================================================
// 派发规则
// ============================================================

describe('canBeDispatched', () => {
  it('垃圾线索不可派发', () => {
    expect(canBeDispatched({ clueType: 'trash', status: '初步沟通' })).toBe(false);
  });

  it('已签单不可派发', () => {
    expect(canBeDispatched({ clueType: 'public', status: '已签单' })).toBe(false);
  });

  it('已终止不可派发', () => {
    expect(canBeDispatched({ clueType: 'assigned', status: '已终止' })).toBe(false);
  });

  it('未派发可派发', () => {
    expect(canBeDispatched({ clueType: 'public', status: '初步沟通', dispatchedAt: null })).toBe(true);
  });

  it('已派发到公海可再次派发', () => {
    expect(canBeDispatched({ clueType: 'assigned', status: '初步沟通', dispatchedAt: '2026-08-25', dispatchTarget: 'pool' })).toBe(true);
  });

  it('已派发到销售不可再派发', () => {
    expect(canBeDispatched({ clueType: 'assigned', status: '初步沟通', dispatchedAt: '2026-08-25', dispatchTarget: 'sales' })).toBe(false);
  });
});

describe('canBeClaimed', () => {
  it('垃圾线索不可领取', () => {
    expect(canBeClaimed({ clueType: 'trash', status: '初步沟通' })).toBe(false);
  });

  it('已签单不可领取', () => {
    expect(canBeClaimed({ clueType: 'public', status: '已签单' })).toBe(false);
  });

  it('派发到公海可领取', () => {
    expect(canBeClaimed({ clueType: 'assigned', status: '初步沟通', dispatchedAt: '2026-08-25', dispatchTarget: 'pool' })).toBe(true);
  });

  it('公海线索未派发可领取', () => {
    expect(canBeClaimed({ clueType: 'public', status: '未联系', dispatchedAt: null })).toBe(true);
  });

  it('已派发到销售不可领取', () => {
    expect(canBeClaimed({ clueType: 'assigned', status: '初步沟通', dispatchedAt: '2026-08-25', dispatchTarget: 'sales' })).toBe(false);
  });
});

describe('returnQualityBucket', () => {
  it('无退回 → safe', () => {
    const result = returnQualityBucket([]);
    expect(result.bucket).toBe('safe');
    expect(result.distinctReturnCount).toBe(0);
  });

  it('1 人退回 → abandoned_1', () => {
    const result = returnQualityBucket(['张三']);
    expect(result.bucket).toBe('abandoned_1');
    expect(result.distinctReturnCount).toBe(1);
  });

  it('2 人退回 → abandoned_2', () => {
    const result = returnQualityBucket(['张三', '李四']);
    expect(result.bucket).toBe('abandoned_2');
  });

  it('3 人退回 → pending_confirm', () => {
    const result = returnQualityBucket(['张三', '李四', '王五']);
    expect(result.bucket).toBe('pending_confirm');
    expect(result.distinctReturnCount).toBe(3);
  });

  it('同一人重复退回不累计', () => {
    const result = returnQualityBucket(['张三', '张三', '张三']);
    expect(result.bucket).toBe('abandoned_1');
    expect(result.distinctReturnCount).toBe(1);
  });

  it('2人+重复 → abandoned_2', () => {
    const result = returnQualityBucket(['张三', '李四', '张三']);
    expect(result.bucket).toBe('abandoned_2');
    expect(result.distinctReturnCount).toBe(2);
  });
});

// ============================================================
// 视角过滤
// ============================================================

describe('filterLeadsByRoleView', () => {
  const leads = [
    { source: '百度', owner: '张三', createTime: '2026-08-25T09:00:00' },
    { source: '抖音', owner: '李四', createTime: '2026-08-25T10:00:00' },
    { source: '百度', owner: '李四', createTime: '2026-08-24T10:00:00' },
    { source: '小红书', owner: '张三', createTime: '2026-08-24T10:00:00' },
  ];

  it('管理员看全量', () => {
    const result = filterLeadsByRoleView(leads, { role: 'admin', userId: '张三' });
    expect(result.length).toBe(4);
  });

  it('推广看负责渠道 ∪ 本人录入', () => {
    const result = filterLeadsByRoleView(leads, {
      role: 'promoter',
      userId: '张三',
      userChannels: ['百度'],
    });
    // 百度渠道(2条) ∪ 张三录入(2条) = 3条去重（百度+张三有重叠）
    expect(result.length).toBe(3);
  });

  it('录入员看本人当日录入', () => {
    const result = filterLeadsByRoleView(leads, {
      role: 'recorder',
      userId: '张三',
    }, '2026-08-25');
    // 张三 + 2026-08-25 = 1 条
    expect(result.length).toBe(1);
    expect(result[0].source).toBe('百度');
  });
});

// ============================================================
// Cohort 成交率
// ============================================================

describe('admissionCohortRate', () => {
  it('按月统计成交率', () => {
    const leads = [
      { createTime: '2026-08-10T10:00:00', status: '已签单' },
      { createTime: '2026-08-15T10:00:00', status: '初步沟通' },
      { createTime: '2026-08-20T10:00:00', status: '已签单' },
      { createTime: '2026-07-10T10:00:00', status: '已签单' },
      { createTime: '2026-07-20T10:00:00', status: '初步沟通' },
    ];
    const result = admissionCohortRate(leads);
    expect(result.length).toBe(2);
    // 2026-08: 3 total, 2 won = 2/3
    expect(result[0].month).toBe('2026-08');
    expect(result[0].total).toBe(3);
    expect(result[0].won).toBe(2);
    expect(result[0].rate).toBeCloseTo(2 / 3);
    // 2026-07: 2 total, 1 won = 1/2
    expect(result[1].month).toBe('2026-07');
    expect(result[1].rate).toBeCloseTo(0.5);
  });

  it('空列表返回空', () => {
    expect(admissionCohortRate([])).toEqual([]);
  });
});

// ============================================================
// 事件日志
// ============================================================

describe('appendLeadEvent', () => {
  it('追加事件到列表', () => {
    const events: LeadEvent[] = [];
    const event: LeadEvent = {
      id: 'e1',
      leadId: 'l-001',
      kind: 'inbound',
      actor: '张三',
      at: '2026-08-25T10:00:00',
    };
    const result = appendLeadEvent(events, event);
    expect(result.length).toBe(1);
    expect(result[0]).toEqual(event);
    // 不修改原数组
    expect(events.length).toBe(0);
  });
});

describe('buildTimeline', () => {
  it('按时间倒序排列', () => {
    const events: LeadEvent[] = [
      { id: 'e1', leadId: 'l-001', kind: 'inbound', actor: '张三', at: '2026-08-25T10:00:00' },
      { id: 'e2', leadId: 'l-001', kind: 'dispatch_to_sales', actor: '管理员', assignee: '李四', at: '2026-08-25T10:05:00' },
      { id: 'e3', leadId: 'l-001', kind: 'return', actor: '李四', reason: '无法联系', at: '2026-08-25T14:00:00' },
    ];
    const timeline = buildTimeline(events);
    expect(timeline.length).toBe(3);
    expect(timeline[0].kind).toBe('return'); // 最新在前
    expect(timeline[2].kind).toBe('inbound');
    // 每条有 description 和 icon
    expect(timeline[0].description).toContain('退回公海');
    expect(timeline[0].icon).toBe('↩️');
  });
});

describe('generateEventId', () => {
  it('生成非空 ID', () => {
    const id = generateEventId();
    expect(id).toBeTruthy();
    expect(id.startsWith('evt-')).toBe(true);
  });
});
