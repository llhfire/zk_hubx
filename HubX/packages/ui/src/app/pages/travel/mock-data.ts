import type { Trip, Reimbursement, Loan, DormitoryBuilding, ExpenseStandard } from './types'

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
    subsidy: { id: 'sub-1', tripId: '1', cityLevel: 'first_tier', standard: 150, days: 5, totalAmount: 750, isPaid: false },
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
    subsidy: { id: 'sub-2', tripId: '2', cityLevel: 'first_tier', standard: 150, days: 0, totalAmount: 0, isPaid: false },
    approvalRecords: [{ id: 'at-2-1', step: '发起申请', approver: '李四', approverId: 'emp-004', status: 'approved', time: '2026-04-24 09:00', comment: '提交出差申请' }, { id: 'at-2-2', step: '部门主管审批', approver: '王经理', approverId: 'emp-002', status: 'approved', time: '2026-04-24 10:30', comment: '批准' }, { id: 'at-2-3', step: '财务审核', approver: '陈财务', approverId: 'emp-003', status: 'approved', time: '2026-04-24 15:00', comment: '同意' }],
  },
  // 售前差旅：挂线索 lead-1
  {
    id: '3', tripNo: 'BT20260510001', applicantId: 'emp-001', applicantName: '张三', department: '销售部',
    customerId: 'cust-003', customerName: 'A公司',
    leadId: 'lead-1', leadName: 'A公司CRM系统开发需求',
    destinations: ['上海'], startDate: '2026-05-10', endDate: '2026-05-12', days: 3,
    transportModes: ['high_speed_rail'], accommodationIntent: 'hotel', estimatedAccommodationDays: 2,
    estimatedTransportCost: 1106, estimatedAccommodationCost: 440, estimatedMealCost: 120, estimatedOtherCost: 100, estimatedTotalCost: 1766,
    needLoan: false, status: 'closed', purpose: 'A公司CRM需求初次拜访',
    createDate: '2026-05-08', updateDate: '2026-05-13',
    itinerarySegments: [
      {
        id: 'seg-3-1', tripId: '3', segmentOrder: 1, departure: '北京', destination: '上海',
        departureDate: '2026-05-10', arrivalDate: '2026-05-10',
        transportMode: 'high_speed_rail', transportDetail: 'G1 北京南→上海虹桥', transportCost: 553,
        customerId: 'cust-003', customerName: 'A公司',
        accommodation: { id: 'acc-3-1', itinerarySegmentId: 'seg-3-1', type: 'hotel', hotelName: '上海全季酒店', roomType: '标准间', pricePerNight: 220, nights: 2, totalAmount: 440 },
        expenses: [
          { id: 'exp-3-01', tripId: '3', itinerarySegmentId: 'seg-3-1', type: 'meal', amount: 80, date: '2026-05-10', remark: '午餐', isOverStandard: false },
          { id: 'exp-3-02', tripId: '3', itinerarySegmentId: 'seg-3-1', type: 'local_transport', amount: 45, date: '2026-05-10', remark: '高铁站→酒店', isOverStandard: false },
        ],
        totalExpense: 440,
      },
      {
        id: 'seg-3-2', tripId: '3', segmentOrder: 2, departure: '上海', destination: '北京',
        departureDate: '2026-05-12', arrivalDate: '2026-05-12',
        transportMode: 'high_speed_rail', transportDetail: 'G2 上海虹桥→北京南', transportCost: 553,
        expenses: [],
        totalExpense: 0,
      },
    ],
    subsidy: { id: 'sub-3', tripId: '3', cityLevel: 'first_tier', standard: 150, days: 1, totalAmount: 150, isPaid: true, paidDate: '2026-05-25', paidWithSalary: '2026-05' },
    approvalRecords: [],
  },
]

export const mockReimbursements: Reimbursement[] = [
  {
    id: 'reimb-1', reimbursementNo: 'BX20260505001', tripId: '1', tripNo: 'BT20260425001',
    applicantId: 'emp-001', applicantName: '张三', department: '销售部',
    // 餐费不进实报（T2 规则）：1106+1320+460=2886
    totalAmount: 2886, status: 'pending', createDate: '2026-05-05', updateDate: '2026-05-05',
    items: [
      { id: 'ri-1', reimbursementId: 'reimb-1', expenseId: '', expenseType: 'transport', description: '往返高铁', amount: 1106, itinerarySegmentId: 'seg-1-1', itinerarySegmentDesc: '北京→杭州' },
      { id: 'ri-2', reimbursementId: 'reimb-1', expenseId: '', expenseType: 'accommodation', description: '杭州西溪谷美居酒店6晚', amount: 1320, itinerarySegmentId: 'seg-1-1', itinerarySegmentDesc: '北京→杭州' },
      { id: 'ri-3', reimbursementId: 'reimb-1', expenseId: '', expenseType: 'local_transport', description: '市内打车/地铁', amount: 460, itinerarySegmentId: 'seg-1-1', itinerarySegmentDesc: '北京→杭州' },
    ],
    offsetAmount: 0, netAmount: 2886,
    approvalRecords: [],
  },
]

export const mockLoans: Loan[] = [
  { id: 'loan-1', loanNo: 'LN20260425001', applicantId: 'emp-001', applicantName: '张三', department: '销售部', tripId: '1', tripNo: 'BT20260425001', type: 'travel', amount: 3000, reason: '出差备用金', expectedPayDate: '2026-04-27', payMethod: 'bank', status: 'paid', createDate: '2026-04-25', updateDate: '2026-04-26', offsetAmount: 0, remainingAmount: 3000, approvalRecords: [] },
]

/** 宿舍 mock：1 栋 2 层 4 房 */
export const mockDormitories: DormitoryBuilding[] = [
  {
    id: 'dorm-1', name: '中科人才公寓', companyId: 'company-1', companyName: '中科集团',
    city: '北京', district: '海淀区', street: '中关村大街', community: '中科人才公寓', address: '北京市海淀区中关村大街1号',
    landlordName: '张房东', landlordPhone: '13800000000',
    leaseStartDate: '2025-01-01', leaseEndDate: '2027-12-31',
    monthlyRent: 12000, deposit: 24000, paymentMethod: 'monthly',
    waterAccountNo: 'W20250001', waterPayMethod: '银行代扣',
    electricityAccountNo: 'E20250001', electricityPayMethod: '银行代扣',
    internetAccountNo: 'I20250001', internetProvider: '中国电信', internetMonthlyFee: 200, internetPayMethod: '银行代扣',
    status: 'active',
    floors: [
      {
        id: 'dorm-1-f1', buildingId: 'dorm-1', floorNumber: 1, roomCount: 2,
        rooms: [
          { id: 'dorm-1-f1-r1', buildingId: 'dorm-1', floorId: 'dorm-1-f1', roomNumber: '101', roomType: 'double', bedCount: 2, facilities: ['空调', '热水器', 'WiFi'], status: 'occupied',
            beds: [
              { id: 'dorm-1-f1-r1-b1', buildingId: 'dorm-1', floorId: 'dorm-1-f1', roomId: 'dorm-1-f1-r1', bedNumber: '1', status: 'occupied', occupantId: '1', occupantName: '张三' },
              { id: 'dorm-1-f1-r1-b2', buildingId: 'dorm-1', floorId: 'dorm-1-f1', roomId: 'dorm-1-f1-r1', bedNumber: '2', status: 'available' },
            ] },
          { id: 'dorm-1-f1-r2', buildingId: 'dorm-1', floorId: 'dorm-1-f1', roomNumber: '102', roomType: 'double', bedCount: 2, facilities: ['空调', '热水器', 'WiFi'], status: 'available',
            beds: [
              { id: 'dorm-1-f1-r2-b1', buildingId: 'dorm-1', floorId: 'dorm-1-f1', roomId: 'dorm-1-f1-r2', bedNumber: '1', status: 'available' },
              { id: 'dorm-1-f1-r2-b2', buildingId: 'dorm-1', floorId: 'dorm-1-f1', roomId: 'dorm-1-f1-r2', bedNumber: '2', status: 'available' },
            ] },
        ],
      },
      {
        id: 'dorm-1-f2', buildingId: 'dorm-1', floorNumber: 2, roomCount: 2,
        rooms: [
          { id: 'dorm-1-f2-r1', buildingId: 'dorm-1', floorId: 'dorm-1-f2', roomNumber: '201', roomType: 'single', bedCount: 1, facilities: ['空调', '热水器', 'WiFi'], status: 'occupied',
            beds: [
              { id: 'dorm-1-f2-r1-b1', buildingId: 'dorm-1', floorId: 'dorm-1-f2', roomId: 'dorm-1-f2-r1', bedNumber: '1', status: 'occupied', occupantId: '4', occupantName: '赵六' },
            ] },
          { id: 'dorm-1-f2-r2', buildingId: 'dorm-1', floorId: 'dorm-1-f2', roomNumber: '202', roomType: 'single', bedCount: 1, facilities: ['空调', '热水器', 'WiFi'], status: 'available',
            beds: [
              { id: 'dorm-1-f2-r2-b1', buildingId: 'dorm-1', floorId: 'dorm-1-f2', roomId: 'dorm-1-f2-r2', bedNumber: '1', status: 'available' },
            ] },
        ],
      },
    ],
  },
]

/** 费用标准 — 版本 std-2026，2026-01-01 生效 */
export const mockExpenseStandards: ExpenseStandard[] = [
  {
    id: 'std-2026',
    name: '2026年差旅费用标准',
    effectiveDate: '2026-01-01',
    status: 'active',
    createDate: '2025-12-20',
    updateDate: '2025-12-20',
    details: [
      // L1-L3 × 一线
      {
        id: 'std-2026-d1', standardId: 'std-2026',
        levels: ['L1', 'L2', 'L3'], cityLevels: ['first_tier'],
        highSpeedRailClass: 'first', bulletTrainClass: 'first', airplaneClass: 'economy',
        selfDriveRate: 0, localTransportLimit: 80,
        hotelLimit: 500, hotelRoomType: '标准间',
        mealAllowance: 0, entertainmentMealLimit: 0,
        communicationAllowance: 0, miscellaneousAllowance: 0,
        subsidyCalcMode: 'calendar_day', subsidyAmount: 150,
      },
      // L4-L6 × 一线
      {
        id: 'std-2026-d2', standardId: 'std-2026',
        levels: ['L4', 'L5', 'L6'], cityLevels: ['first_tier'],
        highSpeedRailClass: 'second', bulletTrainClass: 'second', airplaneClass: 'economy',
        selfDriveRate: 0, localTransportLimit: 60,
        hotelLimit: 400, hotelRoomType: '标准间',
        mealAllowance: 0, entertainmentMealLimit: 0,
        communicationAllowance: 0, miscellaneousAllowance: 0,
        subsidyCalcMode: 'calendar_day', subsidyAmount: 120,
      },
      // 二线（所有职级）
      {
        id: 'std-2026-d3', standardId: 'std-2026',
        levels: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'], cityLevels: ['second_tier'],
        highSpeedRailClass: 'second', bulletTrainClass: 'second', airplaneClass: 'economy',
        selfDriveRate: 0, localTransportLimit: 50,
        hotelLimit: 350, hotelRoomType: '标准间',
        mealAllowance: 0, entertainmentMealLimit: 0,
        communicationAllowance: 0, miscellaneousAllowance: 0,
        subsidyCalcMode: 'calendar_day', subsidyAmount: 100,
      },
      // 三线
      {
        id: 'std-2026-d4', standardId: 'std-2026',
        levels: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'], cityLevels: ['third_tier'],
        highSpeedRailClass: 'second', bulletTrainClass: 'second', airplaneClass: 'economy',
        selfDriveRate: 0, localTransportLimit: 40,
        hotelLimit: 280, hotelRoomType: '标准间',
        mealAllowance: 0, entertainmentMealLimit: 0,
        communicationAllowance: 0, miscellaneousAllowance: 0,
        subsidyCalcMode: 'calendar_day', subsidyAmount: 80,
      },
      // 其他
      {
        id: 'std-2026-d5', standardId: 'std-2026',
        levels: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'], cityLevels: ['other'],
        highSpeedRailClass: 'second', bulletTrainClass: 'second', airplaneClass: 'economy',
        selfDriveRate: 0, localTransportLimit: 30,
        hotelLimit: 200, hotelRoomType: '标准间',
        mealAllowance: 0, entertainmentMealLimit: 0,
        communicationAllowance: 0, miscellaneousAllowance: 0,
        subsidyCalcMode: 'calendar_day', subsidyAmount: 60,
      },
    ],
  },
]
