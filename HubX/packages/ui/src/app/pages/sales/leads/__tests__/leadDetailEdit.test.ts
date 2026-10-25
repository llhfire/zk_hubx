import { describe, expect, it } from 'vitest';
import { applyLeadEdit, findLeadByRouteId, mergeLeadDetail, type LeadEditValues } from '../leadDetailEdit';
import { PUBLIC_LEADS } from '../mockData';
import { getLeadDetailProfile } from '../leadDetailProfiles';

describe('线索详情编辑', () => {
  it('支持用列表 key 找到真实线索 id', () => {
    const target = PUBLIC_LEADS[0];
    expect(findLeadByRouteId(PUBLIC_LEADS, target.key)?.id).toBe(target.id);
    expect(findLeadByRouteId(PUBLIC_LEADS, target.id)?.key).toBe(target.key);
  });

  it('列表中的实时数据覆盖静态详情档案', () => {
    const target = { ...PUBLIC_LEADS[0], name: '实时名称', remark: '实时需求' };
    const profile = getLeadDetailProfile(target.key, 'my');
    const merged = mergeLeadDetail(profile?.leadInfo, target, null);

    expect(merged?.name).toBe('实时名称');
    expect(merged?.requirement).toBe('实时需求');
    expect(merged?.phone).toBe(target.phone);
  });

  it('保存编辑时保留派发等非编辑字段', () => {
    const target = PUBLIC_LEADS[0];
    const values: LeadEditValues = {
      name: '修改后的线索',
      contact: '张经理',
      phone: '13800001111',
      wechat: '',
      source: target.source,
      keyword: '企业系统',
      status: '需求调研',
      level: '高',
      customerLevel: 'A',
      tags: ['B端'],
      entity: target.entity,
      owner: target.owner,
      optimizer: target.optimizer,
      assistant: target.assistant,
      presalesGroupName: '售前协作群',
      requirement: '需要企业管理系统',
      customerNote: '重点客户',
      attachments: [{ id: 'att-1', name: '需求文档.pdf', url: '/files/需求文档.pdf', size: 1024, type: 'application/pdf' }],
    };
    const updated = applyLeadEdit(target, values);

    expect(updated.name).toBe('修改后的线索');
    expect(updated.remark).toBe('需要企业管理系统');
    expect(updated.attachments?.[0].name).toBe('需求文档.pdf');
    expect(updated.businessLine).toBe(target.businessLine);
    expect(updated.leadEvents).toEqual(target.leadEvents);
  });
});
