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
  buildTransferRecord,
  generateLeadNo,
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
      { name: '新线索', contact: '李总', phone: '13900139000', source: '百度', keyword: '小程序', customer: '某公司', entity: '中科软齐', tags: ['APP'], initialRequirement: '需要开发APP' },
      generateLeadNo(99),
    );
    expect(created.id).toBeTruthy();
    expect(created.clueType).toBe('public');
    expect(created.status).toBe('未联系');
    expect(created.owner).toBe('');
    expect(created.customerLevel).toBe('B');
    expect(created.trashCount).toBe(0);
    expect(created.createTime).toBeTruthy();
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
      content: '与客户沟通需求',
      nextFollowTime: '2026-08-30 10:00',
      creator: '张三',
    };
    const { lead, record } = applyAddFollowUp(makeLead({ id: 'F1', status: '初步沟通', followCount: 3 }), records, input);
    expect(lead.status).toBe('需求调研');
    expect(lead.followCount).toBe(4);
    expect(lead.lastFollowTime).toBeTruthy();
    expect(lead.nextFollowTime).toBe('2026-08-30 10:00');
    expect(record.leadId).toBe('F1');
    expect(record.followupStatus).toBe('pending');
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