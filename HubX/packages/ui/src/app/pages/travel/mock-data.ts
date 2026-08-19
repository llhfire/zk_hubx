import type { Trip, Reimbursement, Loan, DormitoryBuilding, PunchRecord, PunchRule, ExpenseStandard, TravelSubsidy } from './types'

export const mockTrips: Trip[] = [
  {
    id: '1', tripNo: 'BT20260425001', applicantId: 'emp-001', applicantName: '张三', department: '销售部',
    customerId: 'cust-001', customerName: '阿里巴巴（中国）有限公司', projectId: 'proj-001', projectName: '阿里巴巴-企业管理系统',
    destinations: ['杭州'], startDate: '2026-04-28', endDate: '2026-05-04', days: 7,
    transportModes: ['high_speed_rail'], accommodationIntent: 'hotel', estimatedAccommodationDays: 6,
    estimatedTransportCost: 1106, estimatedAccommodationCost: 1320, estimatedMealCost: 300, estimatedOtherCost: 200, estimatedTotalCost: 2926,
    needLoan: true, loanAmount: 3000, loanReason: '出差备用金', status: 'approved',
    purpose: '阿里巴巴-企业管理系统项目驻场实施，完成系统部署、数据迁移、用户培训',
    createDate: '2026-04-24', updateDate: '2026-04-24',
    itinerarySegments: [
      {
        id: 'seg-1-1', tripId: '1', segmentOrder: 1, departure: '北京', destination: '杭州',
        departureDate: '2026-04-28', arrivalDate: '2026-04-28',
        transportMode: 'high_speed_rail', transportDetail: 'G101 北京南→杭州东', transportCost: 553,
        customerId: 'cust-001', customerName: '阿里巴巴（中国）有限公司',
        projectId: 'proj-001', projectName: '阿里巴巴-企业管理系统',
        accommodation: { id: 'acc-1-1', itinerarySegmentId: 'seg-1-1', type: 'hotel', hotelName: '杭州西溪谷美居酒店', roomType: '标准大床房', pricePerNight: 220, nights: 6, totalAmount: 1320 },
        expenses: [
          { id: 'exp-1-01', tripId: '1', itinerarySegmentId: 'seg-1-1', type: 'meal', amount: 180, date: '2026-04-28', invoiceNo: 'FP20260428001', remark: '午餐+晚餐', isOverStandard: false },
          { id: 'exp-1-02', tripId: '1', itinerarySegmentId: 'seg-1-1', type: 'local_transport', amount: 45, date: '2026-04-28', invoiceNo: 'CZ20260428001', remark: '高铁站→酒店滴滴', isOverStandard: false },
          { id: 'exp-1-03', tripId: '1', itinerarySegmentId: 'seg-1-1', type: 'meal', amount: 40, date: '2026-04-29', invoiceNo: 'FP20260429001', remark: '早餐+午餐', isOverStandard: false },
          { id: 'exp-1-04', tripId: '1', itinerarySegmentId: 'seg-1-1', type: 'local_transport', amount: 32, date: '2026-04-29', invoiceNo: 'CZ20260429001', remark: '酒店→阿里园区', isOverStandard: false },
          { id: 'exp-1-05', tripId: '1', itinerarySegmentId: 'seg-1-1', type: 'meal', amount: 45, date: '2026-04-30', remark: '午餐', isOverStandard: false },
          { id: 'exp-1-06', tripId: '1', itinerarySegmentId: 'seg-1-1', type: 'local_transport', amount: 28, date: '2026-04-30', remark: '公交+地铁', isOverStandard: false },
          { id: 'exp-1-07', tripId: '1', itinerarySegmentId: 'seg-1-1', type: 'meal', amount: 42, date: '2026-05-01', invoiceNo: 'FP20260501001', remark: '午餐', isOverStandard: false },
          { id: 'exp-1-08', tripId: '1', itinerarySegmentId: 'seg-1-1', type: 'local_transport', amount: 35, date: '2026-05-01', remark: '地铁', isOverStandard: false },
          { id: 'exp-1-09', tripId: '1', itinerarySegmentId: 'seg-1-1', type: 'meal', amount: 38, date: '2026-05-02', remark: '午餐', isOverStandard: false },
          { id: 'exp-1-10', tripId: '1', itinerarySegmentId: 'seg-1-1', type: 'local_transport', amount: 42, date: '2026-05-02', invoiceNo: 'CZ20260502001', remark: '酒店→客户现场', isOverStandard: false },
          { id: 'exp-1-11', tripId: '1', itinerarySegmentId: 'seg-1-1', type: 'meal', amount: 40, date: '2026-05-03', remark: '午餐', isOverStandard: false },
          { id: 'exp-1-12', tripId: '1', itinerarySegmentId: 'seg-1-1', type: 'local_transport', amount: 30, date: '2026-05-03', remark: '地铁', isOverStandard: false },
        ],
        totalExpense: 1320,
      },
      {
        id: 'seg-1-2', tripId: '1', segmentOrder: 2, departure: '杭州', destination: '北京',
        departureDate: '2026-05-04', arrivalDate: '2026-05-04',
        transportMode: 'high_speed_rail', transportDetail: 'G102 杭州东→北京南', transportCost: 553,
        customerId: 'cust-001', customerName: '阿里巴巴（中国）有限公司',
        projectId: 'proj-001', projectName: '阿里巴巴-企业管理系统',
        expenses: [
          { id: 'exp-1-13', tripId: '1', itinerarySegmentId: 'seg-1-2', type: 'meal', amount: 35, date: '2026-05-04', remark: '早餐', isOverStandard: false },
          { id: 'exp-1-14', tripId: '1', itinerarySegmentId: 'seg-1-2', type: 'local_transport', amount: 55, date: '2026-05-04', invoiceNo: 'CZ20260504001', remark: '酒店→高铁站滴滴', isOverStandard: false },
        ],
        totalExpense: 608,
      },
    ],
    loans: [{ id: 'loan-1', loanNo: 'LN20260425001', applicantId: 'emp-001', applicantName: '张三', department: '销售部', tripId: '1', tripNo: 'BT20260425001', type: 'travel', amount: 3000, reason: '出差备用金', expectedPayDate: '2026-04-27', payMethod: 'bank', status: 'paid', createDate: '2026-04-25', updateDate: '2026-04-26', offsetAmount: 0, remainingAmount: 3000, approvalRecords: [{ id: 'a-1-1', step: '发起申请', approver: '张三', approverId: 'emp-001', status: 'approved', time: '2026-04-25 10:00', comment: '提交借款申请' }, { id: 'a-1-2', step: '部门主管审批', approver: '王经理', approverId: 'emp-002', status: 'approved', time: '2026-04-25 14:30', comment: '同意' }, { id: 'a-1-3', step: '财务审核', approver: '陈财务', approverId: 'emp-003', status: 'approved', time: '2026-04-26 09:00', comment: '已安排打款' }] }],
    subsidy: { id: 'sub-1', tripId: '1', calcMode: 'calendar_day', cityLevel: 'first_tier', standard: 150, days: 7, totalAmount: 1050, workingDays: 5, overtimeDays: 0, isPaid: false },
    approvalRecords: [{ id: 'at-1-1', step: '发起申请', approver: '张三', approverId: 'emp-001', status: 'approved', time: '2026-04-24 09:00', comment: '提交出差申请' }, { id: 'at-1-2', step: '部门主管审批', approver: '王经理', approverId: 'emp-002', status: 'approved', time: '2026-04-24 10:30', comment: '批准驻场' }, { id: 'at-1-3', step: '财务审核', approver: '陈财务', approverId: 'emp-003', status: 'approved', time: '2026-04-24 15:00', comment: '同意' }],
  },
  {
    id: '2', tripNo: 'BT20260424001', applicantId: 'emp-004', applicantName: '李四', department: '销售部',
    customerId: 'cust-002', customerName: '腾讯科技（深圳）有限公司',
    destinations: ['深圳'], startDate: '2026-04-26', endDate: '2026-04-27', days: 2,
    transportModes: ['airplane'], accommodationIntent: 'hotel', estimatedAccommodationDays: 1,
    estimatedTransportCost: 2000, estimatedAccommodationCost: 800, estimatedMealCost: 300, estimatedOtherCost: 200, estimatedTotalCost: 3300,
    needLoan: false, status: 'to_reimburse', purpose: '客户拜访和合同签订',
    createDate: '2026-04-24', updateDate: '2026-04-27',
    itinerarySegments: [
      {
        id: 'seg-2-1', tripId: '2', segmentOrder: 1, departure: '北京', destination: '深圳',
        departureDate: '2026-04-26', arrivalDate: '2026-04-26',
        transportMode: 'airplane', transportDetail: 'CA1234', transportCost: 1000,
        customerId: 'cust-002', customerName: '腾讯科技（深圳）有限公司',
        accommodation: { id: 'acc-2-1', itinerarySegmentId: 'seg-2-1', type: 'hotel', hotelName: '深圳福田香格里拉', roomType: '标准间', pricePerNight: 800, nights: 1, totalAmount: 800 },
        expenses: [
          { id: 'exp-2-1', tripId: '2', itinerarySegmentId: 'seg-2-1', type: 'meal', amount: 150, date: '2026-04-26', invoiceNo: 'FP20260426001', remark: '午餐-客户招待', isOverStandard: false },
          { id: 'exp-2-2', tripId: '2', itinerarySegmentId: 'seg-2-1', type: 'local_transport', amount: 85, date: '2026-04-26', invoiceNo: 'CZ20260426001', remark: '机场-酒店滴滴', isOverStandard: false },
          { id: 'exp-2-3', tripId: '2', itinerarySegmentId: 'seg-2-1', type: 'meal', amount: 180, date: '2026-04-27', invoiceNo: 'FP20260427001', remark: '早餐+午餐', isOverStandard: false },
          { id: 'exp-2-4', tripId: '2', itinerarySegmentId: 'seg-2-1', type: 'local_transport', amount: 65, date: '2026-04-27', invoiceNo: 'CZ20260427001', remark: '酒店-机场滴滴', isOverStandard: false },
          { id: 'exp-2-5', tripId: '2', itinerarySegmentId: 'seg-2-1', type: 'communication', amount: 50, date: '2026-04-26', remark: '移动数据漫游包', isOverStandard: false },
        ],
        totalExpense: 2150,
      },
      {
        id: 'seg-2-2', tripId: '2', segmentOrder: 2, departure: '深圳', destination: '北京',
        departureDate: '2026-04-27', arrivalDate: '2026-04-27',
        transportMode: 'airplane', transportDetail: 'CA5678', transportCost: 1000,
        customerId: 'cust-002', customerName: '腾讯科技（深圳）有限公司',
        expenses: [{ id: 'exp-2-6', tripId: '2', itinerarySegmentId: 'seg-2-2', type: 'meal', amount: 120, date: '2026-04-27', invoiceNo: 'FP20260427002', remark: '早餐', isOverStandard: false }],
        totalExpense: 1120,
      },
    ],
    subsidy: { id: 'sub-2', tripId: '2', calcMode: 'calendar_day', cityLevel: 'first_tier', standard: 150, days: 2, totalAmount: 300, workingDays: 2, overtimeDays: 0, isPaid: false },
    approvalRecords: [{ id: 'at-2-1', step: '发起申请', approver: '李四', approverId: 'emp-004', status: 'approved', time: '2026-04-24 09:00', comment: '提交出差申请' }, { id: 'at-2-2', step: '部门主管审批', approver: '王经理', approverId: 'emp-002', status: 'approved', time: '2026-04-24 10:30', comment: '批准' }, { id: 'at-2-3', step: '财务审核', approver: '陈财务', approverId: 'emp-003', status: 'approved', time: '2026-04-24 15:00', comment: '同意' }],
  },
]

export const mockReimbursements: Reimbursement[] = [
  {
    id: 'reimb-1', reimbursementNo: 'BX20260505001', tripId: '1', tripNo: 'BT20260425001',
    applicantId: 'emp-001', applicantName: '张三', department: '销售部',
    totalAmount: 3526, status: 'pending', createDate: '2026-05-05', updateDate: '2026-05-05',
    items: [
      { id: 'ri-1', type: 'transport', amount: 1106, description: '往返高铁' },
      { id: 'ri-2', type: 'accommodation', amount: 1320, description: '杭州西溪谷美居酒店6晚' },
      { id: 'ri-3', type: 'meal', amount: 640, description: '7天餐费' },
      { id: 'ri-4', type: 'local_transport', amount: 460, description: '市内打车/地铁' },
    ],
    offsetAmount: 3000, netAmount: 526,
    approvalRecords: [],
  },
]

export const mockLoans: Loan[] = [
  { id: 'loan-1', loanNo: 'LN20260425001', applicantId: 'emp-001', applicantName: '张三', department: '销售部', tripId: '1', tripNo: 'BT20260425001', type: 'travel', amount: 3000, reason: '出差备用金', expectedPayDate: '2026-04-27', payMethod: 'bank', status: 'paid', createDate: '2026-04-25', updateDate: '2026-04-26', offsetAmount: 0, remainingAmount: 3000, approvalRecords: [] },
]

export const mockDormitories: DormitoryBuilding[] = []

export const mockPunchRecords: PunchRecord[] = []

export const mockPunchRule: PunchRule = { id: 'rule-1', name: '默认打卡规则', type: 'location', workStartTime: '09:00', workEndTime: '18:00', lateMinutes: 30, earlyMinutes: 30, locations: [{ id: 'loc-1', name: '北京总部', address: '北京市海淀区中关村', radius: 500 }] }

export const mockExpenseStandards: ExpenseStandard[] = [
  { id: 'std-1', city: '北京', cityLevel: 'first_tier', hotelStandard: 220, mealStandard: 40, localTransportStandard: 50 },
  { id: 'std-2', city: '上海', cityLevel: 'first_tier', hotelStandard: 220, mealStandard: 40, localTransportStandard: 50 },
  { id: 'std-3', city: '深圳', cityLevel: 'first_tier', hotelStandard: 220, mealStandard: 40, localTransportStandard: 50 },
  { id: 'std-4', city: '杭州', cityLevel: 'new_first', hotelStandard: 220, mealStandard: 40, localTransportStandard: 50 },
  { id: 'std-5', city: '成都', cityLevel: 'new_first', hotelStandard: 220, mealStandard: 40, localTransportStandard: 50 },
]
