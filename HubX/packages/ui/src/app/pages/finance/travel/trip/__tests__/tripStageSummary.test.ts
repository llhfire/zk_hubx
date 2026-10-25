import { describe, expect, test } from 'vitest';
import type { Trip } from '../../types';
import { buildTripStageSummaries } from '../tripStageSummary';

describe('tripStageSummary 差旅阶段胶囊与下拉面板数据构建', () => {
  const baseTrip: Trip = {
    id: 'trip-1',
    tripNo: 'BT20260425001',
    applicantId: '1',
    applicantName: '张三',
    department: '销售部',
    destinations: ['杭州'],
    startDate: '2026-04-28',
    endDate: '2026-05-02',
    days: 5,
    purpose: '拜访客户阿里巴巴，商务谈判',
    tripType: 'project',
    status: 'approved',
    createDate: '2026-04-24 09:00',
    updateDate: '2026-04-24 10:00',
    estimatedTotalCost: 2926,
    needLoan: true,
    loanAmount: 3000,
    projectId: '1',
    projectName: '阿里巴巴-企业管理系统',
    itinerarySegments: [
      {
        id: 'seg-1',
        tripId: 'trip-1',
        departure: '上海',
        destination: '杭州',
        departureDate: '2026-04-28',
        arrivalDate: '2026-04-28',
        transportMode: 'high_speed_rail',
        transportDetail: 'G33次 二等座',
        transportCost: 73,
      },
    ],
    approvalRecords: [
      {
        id: 'a-1',
        step: '发起申请',
        approver: '张三',
        approverId: 'emp-001',
        status: 'approved',
        time: '2026-04-24 09:00',
        comment: '提交申请',
      },
      {
        id: 'a-2',
        step: '主管审批',
        approver: '李主管',
        approverId: 'emp-002',
        status: 'approved',
        time: '2026-04-24 10:00',
        comment: '同意出差',
      },
    ],
  };

  test('正确构建 6 个标准差旅阶段的摘要信息', () => {
    const summaries = buildTripStageSummaries(baseTrip);
    expect(summaries).toHaveLength(6);

    const keys = summaries.map((s) => s.key);
    expect(keys).toEqual(['draft', 'approval', 'ready', 'travel', 'reimburse', 'closed']);
  });

  test('申请填写阶段包含事由、申请人与归集对象核验项', () => {
    const summaries = buildTripStageSummaries(baseTrip);
    const draft = summaries.find((s) => s.key === 'draft')!;
    expect(draft.label).toBe('申请填写');
    expect(draft.statusText).toContain('提交');
    expect(draft.completed.length).toBeGreaterThanOrEqual(3);
    expect(draft.completed.some((c) => c.label.includes('阿里巴巴'))).toBe(true);
  });

  test('审批核决阶段反映审批流转与通过节点', () => {
    const summaries = buildTripStageSummaries(baseTrip);
    const approval = summaries.find((s) => s.key === 'approval')!;
    expect(approval.label).toBe('审批核决');
    expect(approval.statusText).toBe('已全审通过');
    expect(approval.completed).toHaveLength(2);
    expect(approval.pending).toHaveLength(0);
  });

  test('待出发阶段反映城市限额标准与借款状态', () => {
    const summaries = buildTripStageSummaries(baseTrip);
    const ready = summaries.find((s) => s.key === 'ready')!;
    expect(ready.label).toBe('待出发');
    expect(ready.statusText).toBe('待启程');
    expect(ready.completed.some((c) => c.label.includes('杭州'))).toBe(true);
    expect(ready.pending.some((c) => c.label.includes('开始出差'))).toBe(true);
  });

  test('进行中与报销阶段的状态动态流转', () => {
    const travelingTrip: Trip = {
      ...baseTrip,
      status: 'in_progress',
    };
    const summaries = buildTripStageSummaries(travelingTrip);
    const travel = summaries.find((s) => s.key === 'travel')!;
    expect(travel.statusText).toContain('进行中');
    expect(travel.pending.some((c) => c.label.includes('结束出差'))).toBe(true);
  });
});
