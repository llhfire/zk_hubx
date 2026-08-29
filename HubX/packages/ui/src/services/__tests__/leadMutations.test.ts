// 线索域操作纯函数（B2）行为单测。
// 规则对齐 PRD-线索管理模块：8 态漏斗、24h 限制、退回第 3 次自动进垃圾、重复检查、软删除。
import { describe, it, expect } from 'vitest';
import type { LeadListItem, FollowUpRecord } from '@/app/pages/leads/types';
import {
  canClaimLead,
  canAssignLead,
  canReturnLead,
  applyCreateLead,
  applyClaimLead,
  applyAssignLead,
  applyReturnLead,
  applyMarkTrash,
  applySoftDelete,
  applyTransformToCustomer,
  applyAddFollowUp,
  applyDispatchLead,
  applyLevelChange,
  applyQualityConfirm,
  applyUrge,
  buildLeadDetailInfo,
  buildTransferRecord,
  generateLeadNo,
  isLevelUpgrade,
} from '../leadMutations';

function makeLead(overrides: Partial<LeadListItem> = {}): LeadListItem {
  return {
    key: 'L1',
    id: '5940',
    name: '测试线索',
    customer: '测试公司',
    contact: '张经理',
    phone: '13800138000',
    wechat: '',
    source: '百度',
    keyword: '',
    status: '初步沟通',
    clueType: 'assigned',
    level: '高',
    customerLevel: 'S',
    tags: [],
    entity: '中科软齐',
    owner: '阎杨',
    optimizer: '乐炎',
    assistant: '',
    createTime: '2026-08-19 10:30',
    lastFollowTime: '2026-08-20 10:37',
    lastFollowContent: '',
    nextFollowTime: '2026-08-25 10:00',
    followCount: 1,
    daysHeld: 1,
    trashCount: 0,
    transformStatus: false,
    isOverdue: false,
    ...overrides,
  };
}

describe('leadMutations 可操作性规则（PRD-线索管理）', () => {
  it('canClaimLead：只有公海线索可领取', () => {
    expect(canClaimLead(makeLead({ clueType: 'public' }))).toBe(true);
    expect(canClaimLead(makeLead({ clueType: 'assigned' }))).toBe(false);
    expect(canClaimLead(makeLead({ clueType: 'trash' }))).toBe(false);
  });

  it('canAssignLead：公海或当前用户负责任的可分配', () => {
    expect(canAssignLead(makeLead({ clueType: 'public' }))).toBe(true);
    expect(canAssignLead(makeLead({ clueType: 'assigned', owner: '张三' }))).toBe(true);
    expect(canAssignLead(makeLead({ clueType: 'trash' }))).toBe(false);
  });

  it('canReturnLead：已分配未成交可退回，垃圾线索可退出', () => {
    expect(canReturnLead(makeLead({ clueType: 'assigned', status: '需求调研' }))).toBe(true);
    // 已签单/已终止不可退回
    expect(canReturnLead(makeLead({ clueType: 'assigned', status: '已签单' }))).toBe(false);
    expect(canReturnLead(makeLead({ clueType: 'assigned', status: '已终止' }))).toBe(false);
    // 公海无主不可再退回
    expect(canReturnLead(makeLead({ clueType: 'public' }))).toBe(false);
    // 垃圾线索可从垃圾池退回公海
    expect(canReturnLead(makeLead({ clueType: 'trash' }))).toBe(true);
  });

  it('applyReturnLead：第 3 次退回自动转 garbage', () => {
    const twiceReturned = applyReturnLead(makeLead({ trashCount: 2 }), '张三', '无需求');
    expect(twiceReturned.clueType).toBe('trash');
    expect(twiceReturned.trashCount).toBe(3);

    const firstReturn = applyReturnLead(makeLead({ trashCount: 0 }), '张三', '无需求');
    expect(firstReturn.clueType).toBe('public');
    expect(firstReturn.trashCount).toBe(1);
    expect(firstReturn.owner).toBe('');
  });
});

describe('leadMutations 操作副作用', () => {
  it('applyCreateLead 生成合法新线索：id/编号/clueType=public/created 溯源', () => {
    const created = applyCreateLead(
      { name: '新线索', contact: '李总', phone: '13900139000', source: '百度', keyword: '小程序', customer: '某公司', entity: '中科软齐', tags: ['APP'], initialRequirement: '需要开发APP', attachments: [{ id: 'att-new', name: '需求.pdf', url: '/files/需求.pdf', size: 1024, type: 'application/pdf' }] },
      generateLeadNo(99),
    );
    expect(created.id).toBeTruthy();
    expect(created.clueType).toBe('public');
    expect(created.status).toBe('未联系');
    expect(created.owner).toBe('');
    expect(created.customerLevel).toBe('B');
    expect(created.trashCount).toBe(0);
    expect(created.createTime).toBeTruthy();
    expect(created.remark).toBe('需要开发APP');
    expect(created.attachments?.[0].id).toBe('att-new');
  });

  it('applyClaimLead：公海认领后归属当前用户且维护流转记录', () => {
    const claimed = applyClaimLead(makeLead({ clueType: 'public', id: 'P1' }), '张三');
    expect(claimed.clueType).toBe('assigned');
    expect(claimed.owner).toBe('张三');
    expect(claimed.claimTime).toBeTruthy();
    expect(claimed.lastFollowTime).toBe('');
  });

  it('applyAssignLead：分配设置负责人与流转记录', () => {
    const assigned = applyAssignLead(makeLead({ clueType: 'public', id: 'P2' }), '李四', '张三', '新线索分配');
    expect(assigned.clueType).toBe('assigned');
    expect(assigned.owner).toBe('李四');
  });

  it('applyMarkTrash：标记垃圾记录原因且不抛错', () => {
    const trashed = applyMarkTrash(makeLead({ id: 'T1' }), '张三', '虚假信息');
    expect(trashed.clueType).toBe('trash');
    expect(trashed.trashReason).toBe('虚假信息');
    expect(trashed.owner).toBe('');
  });

  it('applySoftDelete：软删除只打标记不物理移除', () => {
    const deleted = applySoftDelete(makeLead({ id: 'D1' }));
    expect(deleted.deleted).toBe(true);
  });

  it('applyTransformToCustomer：转客户置位 transformStatus 且不改变池子归属', () => {
    const transformed = applyTransformToCustomer(makeLead({ id: 'X1' }));
    expect(transformed.transformStatus).toBe(true);
  });

  it('applyAddFollowUp：写跟进同步最后/下次时间与客户状态，计次+1', () => {
    const records: FollowUpRecord[] = [];
    const input = {
      method: '电话',
      customerStatus: '需求调研',
      intentionLevel: '中',
      costHours: 1,
      costMins: 30,
      content: '与客户沟通需求',
      nextFollowTime: '2026-08-30 10:00',
      attachments: [{ id: 'att-follow', name: '沟通纪要.pdf', url: '/files/follow.pdf', size: 1024, type: 'application/pdf' }],
      creator: '张三',
    };
    const { lead, record } = applyAddFollowUp(makeLead({ id: 'F1', status: '初步沟通', followCount: 3 }), records, input);
    expect(lead.status).toBe('需求调研');
    expect(lead.level).toBe('中');
    expect(lead.followCount).toBe(4);
    expect(lead.lastFollowTime).toBeTruthy();
    expect(lead.nextFollowTime).toBe('2026-08-30 10:00');
    expect(record.leadId).toBe('F1');
    expect(record.followupStatus).toBe('pending');
    expect(record.costHours).toBe(1);
    expect(record.costMins).toBe(30);
    expect(record.attachments[0].name).toBe('沟通纪要.pdf');
    // 纯函数不就地改动 records；服务负责把返回的 record 入列
    expect(record.content).toBe('与客户沟通需求');
    expect(records).toHaveLength(0);
  });

  it('buildTransferRecord 生成可追溯流转记录', () => {
    const tr = buildTransferRecord({
      leadId: 'A1',
      operator: '李四',
      action: 'assign',
      toOwner: '阎杨',
      status: '初步沟通',
      reason: '新线索分配',
      createdAt: '2026-08-19 11:20',
    });
    expect(tr.leadId).toBe('A1');
    expect(tr.action).toBe('assign');
    expect(tr.operator).toBe('李四');
  });
});
describe('leadMutations 派发域纯函数（β 阶段 2，Workers 单源）', () => {
  it('applyDispatchLead sales：指派 + dispatchedAt + dispatch_to_sales 事件 + 流转记录', () => {
    const lead = makeLead({ clueType: 'public', owner: '', leadEvents: [] });
    const { lead: updated, transfer } = applyDispatchLead(lead, { target: 'sales', assignee: '李四' }, '张三', '2026-08-26 10:00', 'evt-1');
    expect(updated.clueType).toBe('assigned');
    expect(updated.owner).toBe('李四');
    expect(updated.dispatchedAt).toBe('2026-08-26 10:00');
    expect(updated.dispatchTarget).toBe('sales');
    expect(updated.leadEvents).toHaveLength(1);
    expect(updated.leadEvents![0].kind).toBe('dispatch_to_sales');
    expect(updated.leadEvents![0].assignee).toBe('李四');
    expect(transfer?.toOwner).toBe('李四');
    expect(transfer?.operator).toBe('张三');
  });

  it('applyDispatchLead pool：回公海、清空 owner、无流转记录', () => {
    const lead = makeLead({ leadEvents: [] });
    const { lead: updated, transfer } = applyDispatchLead(lead, { target: 'pool' }, '张三', '2026-08-26 10:00', 'evt-2');
    expect(updated.clueType).toBe('public');
    expect(updated.owner).toBe('');
    expect(updated.dispatchTarget).toBe('pool');
    expect(updated.leadEvents![0].kind).toBe('dispatch_to_pool');
    expect(transfer).toBeNull();
  });

  it('isLevelUpgrade：S 为最高，A->S 升级、S->B 降级', () => {
    expect(isLevelUpgrade('A', 'S')).toBe(true);
    expect(isLevelUpgrade('C', 'B')).toBe(true);
    expect(isLevelUpgrade('S', 'B')).toBe(false);
    expect(isLevelUpgrade('A', 'A')).toBe(false);
  });

  it('applyLevelChange 升级直接生效；降级只写事件', () => {
    const lead = makeLead({ customerLevel: 'B', leadEvents: [] });
    const up = applyLevelChange(lead, 'B', 'S', '张三', '2026-08-26 10:00', 'evt-3');
    expect(up.customerLevel).toBe('S');
    expect(up.leadEvents![0].kind).toBe('level_change');

    const down = applyLevelChange(up, 'S', 'C', '张三', '2026-08-26 10:01', 'evt-4');
    expect(down.customerLevel).toBe('S'); // 降级待审核，等级保持
    expect(down.leadEvents).toHaveLength(2);
    expect(down.leadEvents![1].levelFrom).toBe('S');
    expect(down.leadEvents![1].levelTo).toBe('C');
  });

  it('applyUrge / applyQualityConfirm 只追加事件，不动其他字段', () => {
    const lead = makeLead({ leadEvents: [] });
    const urged = applyUrge(lead, '张三', '催办->李四', '2026-08-26 10:00', 'evt-5');
    expect(urged.leadEvents).toHaveLength(1);
    expect(urged.leadEvents![0]).toMatchObject({ kind: 'urge', note: '催办->李四' });
    expect(urged.owner).toBe(lead.owner);

    const confirmed = applyQualityConfirm(urged, '管理员', '质检确认：3 人退回', '2026-08-26 10:02', 'evt-6');
    expect(confirmed.leadEvents).toHaveLength(2);
    expect(confirmed.leadEvents![1].kind).toBe('level_audit_result');
  });

  it('buildLeadDetailInfo 从列表字段组装详情（迁移线索兜底口径）', () => {
    const lead = makeLead({ remark: '客户要做小程序', presalesGroupName: '售前群A' });
    const detail = buildLeadDetailInfo(lead);
    expect(detail.name).toBe('测试线索');
    expect(detail.requirement).toBe('客户要做小程序');
    expect(detail.initialRequirement).toBe('客户要做小程序');
    expect(detail.creator).toBe('阎杨');
    expect(detail.agent).toBe('乐炎');
    expect(detail.customerTitle).toBe('张经理');
    expect(detail.presalesGroupName).toBe('售前群A');
    expect(detail.clueType).toBe('assigned');
    expect(detail.attachments).toEqual([]);
  });
});
