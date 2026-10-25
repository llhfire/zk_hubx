import { describe, expect, test, vi } from 'vitest';
import type { Trip } from '../../types';
import {
  computeBudgetExecution,
  computeReimbursementRatio,
  computeApprovalCompliance,
  computeCostDeposition,
  resolveTripLinks,
  buildEnhancedProcessSteps,
  buildTripProcessMetrics,
  formatMoney,
  sumRecordedExpenses,
} from '../tripDetailMetrics';

describe('tripDetailMetrics 工具函数测试', () => {
  const baseTrip: Trip = {
    id: 'trip-1',
    tripNo: 'BT20260425001',
    applicantId: 'emp-001',
    applicantName: '张三',
    department: '销售部',
    destinations: ['杭州'],
    startDate: '2026-04-28',
    endDate: '2026-05-04',
    days: 7,
    transportModes: ['high_speed_rail'],
    accommodationIntent: 'hotel',
    estimatedAccommodationDays: 6,
    estimatedTransportCost: 1106,
    estimatedAccommodationCost: 1320,
    estimatedMealCost: 300,
    estimatedOtherCost: 200,
    estimatedTotalCost: 2926,
    needLoan: true,
    loanAmount: 3000,
    status: 'approved',
    purpose: '客户驻场测试',
    createDate: '2026-04-24',
    updateDate: '2026-04-24',
    customerId: 'cust-001',
    customerName: '阿里巴巴（中国）有限公司',
    projectId: 'proj-001',
    projectName: '阿里巴巴-企业管理系统',
    itinerarySegments: [
      {
        id: 'seg-1',
        tripId: 'trip-1',
        segmentOrder: 1,
        departure: '北京',
        destination: '杭州',
        departureDate: '2026-04-28',
        arrivalDate: '2026-04-28',
        transportMode: 'high_speed_rail',
        transportCost: 553,
        totalExpense: 1320,
        expenses: [
          { id: 'exp-1', tripId: 'trip-1', itinerarySegmentId: 'seg-1', type: 'meal', amount: 180, date: '2026-04-28', isOverStandard: false },
          { id: 'exp-2', tripId: 'trip-1', itinerarySegmentId: 'seg-1', type: 'local_transport', amount: 45, date: '2026-04-28', isOverStandard: false },
        ],
      },
    ],
    loans: [
      {
        id: 'loan-1',
        loanNo: 'LN001',
        applicantId: 'emp-001',
        applicantName: '张三',
        department: '销售部',
        type: 'travel',
        amount: 3000,
        reason: '备用金',
        payMethod: 'bank',
        status: 'paid',
        createDate: '2026-04-25',
        updateDate: '2026-04-25',
        offsetAmount: 0,
        remainingAmount: 3000,
      },
    ],
    subsidy: {
      id: 'sub-1',
      tripId: 'trip-1',
      cityLevel: 'first_tier',
      standard: 150,
      days: 5,
      totalAmount: 750,
      isPaid: false,
    },
    approvalRecords: [
      { id: 'a-1', step: '发起申请', approver: '张三', approverId: 'emp-001', status: 'approved', time: '2026-04-24 09:00', comment: '提交' },
      { id: 'a-2', step: '主管审批', approver: '主管', approverId: 'emp-002', status: 'approved', time: '2026-04-24 10:00', comment: '同意' },
    ],
  };

  test('sumRecordedExpenses 正确累加所有航段费用', () => {
    expect(sumRecordedExpenses(baseTrip)).toBe(225);
  });

  describe('1. 预算执行率 computeBudgetExecution', () => {
    test('预算内正常执行', () => {
      const info = computeBudgetExecution(baseTrip);
      expect(info.rate).toBe(8); // 225 / 2926 ≈ 8%
      expect(info.isOverBudget).toBe(false);
      expect(info.tone).toBe('success');
      expect(info.value).toBe('8%');
      expect(info.detail).toContain('已录 ¥225 / 预算 ¥2,926');
    });

    test('预算接近警戒线（>=85%）', () => {
      const trip: Trip = {
        ...baseTrip,
        itinerarySegments: [{
          ...baseTrip.itinerarySegments![0],
          expenses: [{ id: 'exp-big', tripId: '1', itinerarySegmentId: '1', type: 'accommodation', amount: 2600, date: '2026-04-28', isOverStandard: false }],
        }],
      };
      const info = computeBudgetExecution(trip);
      expect(info.rate).toBe(89);
      expect(info.tone).toBe('warning');
    });

    test('超预算标红警告', () => {
      const trip: Trip = {
        ...baseTrip,
        itinerarySegments: [{
          ...baseTrip.itinerarySegments![0],
          expenses: [{ id: 'exp-over', tripId: '1', itinerarySegmentId: '1', type: 'accommodation', amount: 3500, date: '2026-04-28', isOverStandard: false }],
        }],
      };
      const info = computeBudgetExecution(trip);
      expect(info.isOverBudget).toBe(true);
      expect(info.tone).toBe('danger');
      expect(info.detail).toContain('超支 ¥574');
    });
  });

  describe('2. 报销核销比与借款冲抵 computeReimbursementRatio', () => {
    test('有借款且未冲抵', () => {
      const info = computeReimbursementRatio(baseTrip);
      expect(info.isSettled).toBe(false);
      expect(info.ratioLabel).toBe('借款待冲抵');
      expect(info.tone).toBe('neutral');
    });

    test('有借款且已部分冲抵', () => {
      const trip: Trip = {
        ...baseTrip,
        loans: [{ ...baseTrip.loans![0], offsetAmount: 1500, remainingAmount: 1500 }],
      };
      const info = computeReimbursementRatio(trip);
      expect(info.ratioLabel).toContain('50% 部分冲抵');
      expect(info.tone).toBe('warning');
    });

    test('有借款且全额结清', () => {
      const trip: Trip = {
        ...baseTrip,
        loans: [{ ...baseTrip.loans![0], offsetAmount: 3000, remainingAmount: 0 }],
      };
      const info = computeReimbursementRatio(trip);
      expect(info.isSettled).toBe(true);
      expect(info.ratioLabel).toBe('100% 已结清');
      expect(info.tone).toBe('success');
    });

    test('无借款且已归档', () => {
      const trip: Trip = {
        ...baseTrip,
        needLoan: false,
        loanAmount: 0,
        loans: [],
        status: 'closed',
      };
      const info = computeReimbursementRatio(trip);
      expect(info.isSettled).toBe(true);
      expect(info.ratioLabel).toBe('100% 已核销');
      expect(info.tone).toBe('success');
    });
  });

  describe('3. 审批合规节点 computeApprovalCompliance', () => {
    test('全部通过且全程合规', () => {
      const info = computeApprovalCompliance(baseTrip);
      expect(info.isAllPassed).toBe(true);
      expect(info.hasOverStandard).toBe(false);
      expect(info.tone).toBe('success');
      expect(info.value).toBe('2/2 全部通过');
      expect(info.detail).toBe('全程符合差旅标准');
    });

    test('全部通过但含超标特批', () => {
      const trip: Trip = {
        ...baseTrip,
        itinerarySegments: [{
          ...baseTrip.itinerarySegments![0],
          expenses: [{ id: 'exp-std', tripId: '1', itinerarySegmentId: '1', type: 'meal', amount: 500, date: '2026-04-28', isOverStandard: true, overStandardReason: '商务宴请特批' }],
        }],
      };
      const info = computeApprovalCompliance(trip);
      expect(info.isAllPassed).toBe(true);
      expect(info.hasOverStandard).toBe(true);
      expect(info.tone).toBe('warning');
      expect(info.detail).toContain('含超标合规特批');
    });

    test('存在驳回节点', () => {
      const trip: Trip = {
        ...baseTrip,
        approvalRecords: [
          ...baseTrip.approvalRecords!,
          { id: 'a-3', step: '财务审核', approver: '财务', approverId: 'emp-003', status: 'rejected', time: '2026-04-24 11:00', comment: '发票不齐' },
        ],
      };
      const info = computeApprovalCompliance(trip);
      expect(info.isAllPassed).toBe(false);
      expect(info.tone).toBe('danger');
      expect(info.value).toBe('审批驳回');
    });
  });

  describe('4. 关联项目成本沉淀 computeCostDeposition', () => {
    test('沉淀至履约项目成本', () => {
      const info = computeCostDeposition(baseTrip);
      // 225 已录费用 + 750 补贴 = 975
      expect(info.targetType).toBe('project');
      expect(info.totalCost).toBe(975);
      expect(info.value).toBe('¥975');
      expect(info.detail).toContain('阿里巴巴-企业管理系统');
    });

    test('售前差旅计入线索获客成本', () => {
      const trip: Trip = {
        ...baseTrip,
        projectId: undefined,
        projectName: undefined,
        leadId: 'lead-88',
        leadName: '某重点商机线索',
      };
      const info = computeCostDeposition(trip);
      expect(info.targetType).toBe('lead');
      expect(info.detail).toContain('售前拓客获客成本');
      expect(info.detail).toContain('某重点商机线索');
    });

    test('无项目和线索时计入部门管理公摊', () => {
      const trip: Trip = {
        ...baseTrip,
        projectId: undefined,
        projectName: undefined,
        leadId: undefined,
        leadName: undefined,
      };
      const info = computeCostDeposition(trip);
      expect(info.targetType).toBe('general');
      expect(info.detail).toContain('部门公摊管理成本');
    });
  });

  describe('5. 穿透链接解析 resolveTripLinks', () => {
    test('解析申请人、客户、项目穿透链接', () => {
      const links = resolveTripLinks(baseTrip);
      expect(links.applicantLink).toBe('/employees/1');
      expect(links.applicantText).toBe('张三');
      expect(links.projectLink).toBe('/projects/1');
      expect(links.projectText).toBe('阿里巴巴-企业管理系统');
      expect(links.customerLink).toBe('/customers/1');
      expect(links.customerText).toBe('阿里巴巴（中国）有限公司');
      expect(links.leadLink).toBeUndefined();
    });

    test('售前差旅解析线索链接', () => {
      const trip: Trip = {
        ...baseTrip,
        projectId: undefined,
        projectName: undefined,
        leadId: 'lead-1',
        leadName: 'A公司线索',
      };
      const links = resolveTripLinks(trip);
      expect(links.leadLink).toBe('/leads/lead-1');
      expect(links.leadText).toBe('A公司线索');
      expect(links.projectLink).toBeUndefined();
    });
  });

  describe('6. buildEnhancedProcessSteps 强化型步进条', () => {
    test('各步骤动态注入丰富进度说明', () => {
      const steps = buildEnhancedProcessSteps(baseTrip);
      expect(steps).toHaveLength(6);
      expect(steps[0].description).toContain('2026-04-24 提交');
      expect(steps[1].description).toContain('2/2 已全审通过');
      expect(steps[2].description).toContain('合规通过 · 待启程');
      expect(steps[4].description).toContain('借款 ¥3,000 待冲抵');
    });
  });

  describe('7. buildTripProcessMetrics 组装标准微指标项', () => {
    test('组装 6 维指标并支持点击交互', () => {
      const onNavigateTab = vi.fn();
      const items = buildTripProcessMetrics(baseTrip, onNavigateTab);
      expect(items).toHaveLength(6);

      const keys = items.map((i) => i.key);
      expect(keys).toEqual(['schedule', 'budget', 'reimbursement', 'approval', 'cost', 'subsidy']);

      // 测试点击触发页签切换
      const scheduleItem = items.find((i) => i.key === 'schedule');
      scheduleItem?.onClick?.();
      expect(onNavigateTab).toHaveBeenCalledWith({ side: 'itinerary' });

      const budgetItem = items.find((i) => i.key === 'budget');
      budgetItem?.onClick?.();
      expect(onNavigateTab).toHaveBeenCalledWith({ main: 'expenses' });

      const reimbItem = items.find((i) => i.key === 'reimbursement');
      reimbItem?.onClick?.();
      expect(onNavigateTab).toHaveBeenCalledWith({ main: 'reimbursement' });

      const approvalItem = items.find((i) => i.key === 'approval');
      approvalItem?.onClick?.();
      expect(onNavigateTab).toHaveBeenCalledWith({ side: 'approval' });
    });
  });
});
