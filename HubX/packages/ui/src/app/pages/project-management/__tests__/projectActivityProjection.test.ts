import { describe, expect, it } from 'vitest';
import type { Contract } from '../../contracts/types';
import type { ProjectListItem } from '../types';
import type { ProjectWorkTask } from '../projectTasks';
import {
  buildProjectActivity,
  getProjectActivityPendingCounts,
  groupProjectActivity,
  onlyMajorActivity,
} from '../projectActivityProjection';

const project: Pick<ProjectListItem, 'id' | 'name' | 'riskLevel' | 'blockers'> = {
  id: 'p1',
  name: '企业管理系统',
  riskLevel: 'medium',
  blockers: [{
    id: 'blocker-1', projectId: 'p1', title: '客户等待确认验收范围', source: 'customer', severity: 'major',
    owner: '李四', resolved: false, createdAt: '2026-08-29 09:00', expectedResolveDate: '2026-09-01',
  }],
};

function contract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'c1', contractNo: 'CT-001', status: 'archived', projectId: 'p1', kind: 'main', leadId: 'l1',
    current: {
      contractName: '企业管理系统', productCategory: '定制开发', signingEntity: '中科软通', customerName: 'A 公司',
      customerContact: '刘经理', customerPhone: '', customerEmail: '', customerAddress: '', customerTaxNo: '', bankName: '', bankAccount: '',
      contractContent: '', signDate: '2026-08-01', effectiveDate: '2026-08-01', endDate: '2026-12-01', paymentMethod: '对公',
      totalAmount: 100000, rebateAmount: 0, paymentPlans: [{ period: 1, periodName: '首期款', expectedDate: '2026-08-10', amount: 50000, percentage: 50 }], templateId: 't1',
    },
    versionHistory: [], approvalFlow: [], archivedScans: [{ id: 'scan-1', files: [], uploadedAt: '2026-08-12 10:00', uploadedBy: '张三', isPrimary: true, linkedVersionNo: 'V1' }],
    createdAt: '2026-08-01 09:00', createdBy: '张三', updatedAt: '2026-08-12 10:00',
    ...overrides,
  };
}

const task: ProjectWorkTask = {
  id: 'task-1', projectId: 'p1', title: '用户验收', type: '测试', priority: '高', status: '进行中', assignee: '王五', collaborators: [],
  plannedEndDate: '2026-08-20', progress: 80, description: '完成客户验收', logs: [],
};

describe('projectActivityProjection', () => {
  it('从跨域事实派生精选活动，排除普通日报和普通跟进', () => {
    const items = buildProjectActivity({
      project,
      contracts: [contract()],
      collections: [{ id: 'col-1', contractId: 'c1', projectId: 'p1', period: 1, amount: 30000, date: '2026-08-15', method: '银行汇款', note: '首期款' }],
      confirmations: [{ id: 'confirm-1', projectId: 'p1', type: '原型确认书', status: '已签署', signer: '刘经理', signDate: '2026-08-16', attachment: 'prototype.pdf' }],
      meetings: [{ id: 'meeting-1', projectId: 'p1', subject: '验收范围会', meetingTime: '2026-08-17 10:00', employeeAttendees: ['李四'], externalAttendees: ['刘经理'], minutes: '确认一期范围', recorder: '李四' }],
      tasks: [task],
      ownedEvents: [
        { id: 'daily', projectId: 'p1', type: 'daily_report', title: '日报', content: '8h', operator: '王五', createdAt: '2026-08-18 18:00' },
        { id: 'normal-follow', projectId: 'p1', type: 'followup', title: '电话跟进', content: '已联系', operator: '李四', createdAt: '2026-08-18 12:00' },
        { id: 'key-follow', projectId: 'p1', type: 'followup', title: '验收决策', content: '确认上线', operator: '李四', createdAt: '2026-08-18 13:00', isMajor: true, milestoneTag: '项目终验报告签署' },
        { id: 'legacy-contract', projectId: 'p1', type: 'contract', title: '合同签署', content: '旧台账', operator: '张三', createdAt: '2026-08-01 10:00' },
      ],
      now: new Date('2026-08-30T00:00:00.000Z'),
    });

    expect(items.some((item) => item.id === 'owned-daily')).toBe(false);
    expect(items.some((item) => item.id === 'owned-normal-follow')).toBe(false);
    expect(items.some((item) => item.id === 'owned-key-follow')).toBe(true);
    expect(items.filter((item) => item.kind === 'contract')).toHaveLength(1);
    expect(items.some((item) => item.id === 'collection-overdue-c1-1')).toBe(true);
    expect(items.some((item) => item.kind === 'meeting')).toBe(true);
    expect(items.some((item) => item.kind === 'risk')).toBe(true);
    expect(items.some((item) => item.id === 'task-overdue-task-1-2026-08-20')).toBe(true);
    expect(items[0].occurredAt >= items[1].occurredAt).toBe(true);
  });

  it('大事记仅保留关键子集', () => {
    const items = buildProjectActivity({
      project: { ...project, blockers: [] }, contracts: [contract()], collections: [], confirmations: [], meetings: [], tasks: [], ownedEvents: [],
      now: new Date('2026-08-30T00:00:00.000Z'),
    });
    expect(onlyMajorActivity(items).every((item) => item.isMajor)).toBe(true);
    expect(onlyMajorActivity(items).some((item) => item.kind === 'contract')).toBe(true);
  });

  it('按今天、昨天和具体日期分组', () => {
    const base = { projectId: 'p1', kind: 'status' as const, title: '', summary: '', operator: '', severity: 'neutral' as const, isMajor: false, facts: [], sourceTarget: {} };
    const groups = groupProjectActivity([
      { ...base, id: '1', occurredAt: '2026-08-30 10:00' },
      { ...base, id: '2', occurredAt: '2026-08-29 10:00' },
      { ...base, id: '3', occurredAt: '2026-08-20 10:00' },
    ], new Date('2026-08-30T12:00:00.000Z'));
    expect(groups.map((group) => group.label)).toEqual(['今天', '昨天', '2026-08-20']);
  });

  it('Tab 徽标只计待处理数', () => {
    expect(getProjectActivityPendingCounts({
      confirmations: [
        { id: '1', projectId: 'p1', type: '验收单', status: '待签署', signer: '', signDate: '', attachment: '' },
        { id: '2', projectId: 'p1', type: '确认书', status: '已签署', signer: '', signDate: '', attachment: '' },
      ],
      contracts: [contract({ status: 'approving' }), contract({ id: 'c2', status: 'archived' })],
      travels: [{ status: '待审批' }, { status: '已审批' }],
      reimbursements: [{ status: '待审批' }],
    })).toEqual({ documents: 1, contracts: 1, travel: 1, reimbursement: 1 });
  });
});
