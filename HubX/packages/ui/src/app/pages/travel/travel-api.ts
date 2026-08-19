// ========================================
// 差旅管理模块 - 模拟 API 接口
// ========================================
// 后续对接后端时，只需将内部实现替换为真实 API 调用

import type {
  Trip,
  ItinerarySegment,
  Expense,
  Reimbursement,
  Loan,
  DormitoryBuilding,
  DormitoryCheckIn,
  DormitoryExpense,
  DormitoryMaintenance,
  UtilityPayment,
  PunchRecord,
  PunchRule,
  TemporaryZone,
  ExpenseStandard,
  TravelSubsidy,
  TripListParams,
  ReimbursementListParams,
  LoanListParams,
  DormitoryListParams,
  PunchRecordListParams,
} from './types';

import {
  mockTrips,
  mockReimbursements,
  mockLoans,
  mockDormitories,
  mockPunchRecords,
  mockPunchRule,
  mockExpenseStandards,
} from './mock-data';

// 模拟延迟
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// ==================== 出差管理 API ====================

// 获取出差列表
export async function getTripList(params?: TripListParams): Promise<{ list: Trip[]; total: number }> {
  await delay();
  let filtered = [...mockTrips];

  if (params?.keyword) {
    const keyword = params.keyword.toLowerCase();
    filtered = filtered.filter(
      t =>
        t.tripNo.toLowerCase().includes(keyword) ||
        t.applicantName.toLowerCase().includes(keyword) ||
        t.destinations.some(d => d.toLowerCase().includes(keyword))
    );
  }
  if (params?.status) {
    filtered = filtered.filter(t => t.status === params.status);
  }
  if (params?.applicantId) {
    filtered = filtered.filter(t => t.applicantId === params.applicantId);
  }
  if (params?.department) {
    filtered = filtered.filter(t => t.department === params.department);
  }
  if (params?.startDate) {
    filtered = filtered.filter(t => t.startDate >= params.startDate!);
  }
  if (params?.endDate) {
    filtered = filtered.filter(t => t.endDate <= params.endDate!);
  }
  if (params?.customerId) {
    filtered = filtered.filter(t => t.customerId === params.customerId);
  }
  if (params?.projectId) {
    filtered = filtered.filter(t => t.projectId === params.projectId);
  }

  return { list: filtered, total: filtered.length };
}

// 获取出差详情
export async function getTripDetail(id: string): Promise<Trip | null> {
  await delay();
  return mockTrips.find(t => t.id === id) || null;
}

// 创建出差申请
export async function createTrip(data: Partial<Trip>): Promise<Trip> {
  await delay(500);
  const newTrip: Trip = {
    id: `trip-${Date.now()}`,
    tripNo: `BT${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(mockTrips.length + 1).padStart(3, '0')}`,
    applicantId: data.applicantId || 'emp-001',
    applicantName: data.applicantName || '当前用户',
    department: data.department || '未分配',
    destinations: data.destinations || [],
    startDate: data.startDate || '',
    endDate: data.endDate || '',
    days: data.days || 0,
    transportModes: data.transportModes || [],
    accommodationIntent: data.accommodationIntent || 'hotel',
    estimatedAccommodationDays: data.estimatedAccommodationDays || 0,
    estimatedTransportCost: data.estimatedTransportCost || 0,
    estimatedAccommodationCost: data.estimatedAccommodationCost || 0,
    estimatedMealCost: data.estimatedMealCost || 0,
    estimatedOtherCost: data.estimatedOtherCost || 0,
    estimatedTotalCost: data.estimatedTotalCost || 0,
    needLoan: data.needLoan || false,
    status: 'draft',
    purpose: data.purpose || '',
    createDate: new Date().toISOString().slice(0, 10),
    updateDate: new Date().toISOString().slice(0, 10),
    ...data,
  };
  return newTrip;
}

// 更新出差申请
export async function updateTrip(id: string, data: Partial<Trip>): Promise<Trip> {
  await delay(500);
  const trip = mockTrips.find(t => t.id === id);
  if (!trip) throw new Error('出差单不存在');
  return { ...trip, ...data, updateDate: new Date().toISOString().slice(0, 10) };
}

// 提交出差申请（草稿 → 待审批）
export async function submitTrip(id: string): Promise<Trip> {
  await delay(500);
  const trip = mockTrips.find(t => t.id === id);
  if (!trip) throw new Error('出差单不存在');
  return { ...trip, status: 'pending', updateDate: new Date().toISOString().slice(0, 10) };
}

// 审批出差申请
export async function approveTrip(id: string, action: 'approve' | 'reject', comment: string): Promise<Trip> {
  await delay(500);
  const trip = mockTrips.find(t => t.id === id);
  if (!trip) throw new Error('出差单不存在');
  return {
    ...trip,
    status: action === 'approve' ? 'approved' : 'rejected',
    updateDate: new Date().toISOString().slice(0, 10),
  };
}

// 开始出差（已通过 → 进行中）
export async function startTrip(id: string): Promise<Trip> {
  await delay(500);
  const trip = mockTrips.find(t => t.id === id);
  if (!trip) throw new Error('出差单不存在');
  return { ...trip, status: 'in_progress', updateDate: new Date().toISOString().slice(0, 10) };
}

// 结束出差（进行中 → 待报销）
export async function endTrip(id: string): Promise<Trip> {
  await delay(500);
  const trip = mockTrips.find(t => t.id === id);
  if (!trip) throw new Error('出差单不存在');
  return { ...trip, status: 'to_reimburse', updateDate: new Date().toISOString().slice(0, 10) };
}

// 关闭出差（待报销 → 已关闭）
export async function closeTrip(id: string): Promise<Trip> {
  await delay(500);
  const trip = mockTrips.find(t => t.id === id);
  if (!trip) throw new Error('出差单不存在');
  return { ...trip, status: 'closed', updateDate: new Date().toISOString().slice(0, 10) };
}

// 删除出差申请
export async function deleteTrip(id: string): Promise<void> {
  await delay(500);
  // 实际调用后端删除接口
}

// ==================== 旅程管理 API ====================

// 获取旅程段列表
export async function getItinerarySegments(tripId: string): Promise<ItinerarySegment[]> {
  await delay();
  const trip = mockTrips.find(t => t.id === tripId);
  return trip?.itinerarySegments || [];
}

// 创建旅程段
export async function createItinerarySegment(data: Partial<ItinerarySegment>): Promise<ItinerarySegment> {
  await delay(500);
  const newSegment: ItinerarySegment = {
    id: `seg-${Date.now()}`,
    tripId: data.tripId || '',
    segmentOrder: data.segmentOrder || 1,
    departure: data.departure || '',
    destination: data.destination || '',
    departureDate: data.departureDate || '',
    arrivalDate: data.arrivalDate || '',
    transportMode: data.transportMode || 'high_speed_rail',
    transportCost: data.transportCost || 0,
    totalExpense: data.transportCost || 0,
    ...data,
  };
  return newSegment;
}

// 更新旅程段
export async function updateItinerarySegment(id: string, data: Partial<ItinerarySegment>): Promise<ItinerarySegment> {
  await delay(500);
  // 实际调用后端更新接口
  return { id, ...data } as ItinerarySegment;
}

// 删除旅程段
export async function deleteItinerarySegment(id: string): Promise<void> {
  await delay(500);
  // 实际调用后端删除接口
}

// ==================== 费用管理 API ====================

// 获取费用记录列表
export async function getExpenseList(tripId: string, segmentId?: string): Promise<Expense[]> {
  await delay();
  const trip = mockTrips.find(t => t.id === tripId);
  if (!trip) return [];
  const expenses: Expense[] = [];
  trip.itinerarySegments?.forEach(seg => {
    if (!segmentId || seg.id === segmentId) {
      expenses.push(...(seg.expenses || []));
    }
  });
  return expenses;
}

// 创建费用记录
export async function createExpense(data: Partial<Expense>): Promise<Expense> {
  await delay(500);
  const newExpense: Expense = {
    id: `exp-${Date.now()}`,
    tripId: data.tripId || '',
    itinerarySegmentId: data.itinerarySegmentId || '',
    type: data.type || 'other',
    amount: data.amount || 0,
    date: data.date || '',
    isOverStandard: false,
    ...data,
  };
  return newExpense;
}

// 更新费用记录
export async function updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
  await delay(500);
  return { id, ...data } as Expense;
}

// 删除费用记录
export async function deleteExpense(id: string): Promise<void> {
  await delay(500);
}

// ==================== 报销管理 API ====================

// 获取报销列表
export async function getReimbursementList(params?: ReimbursementListParams): Promise<{ list: Reimbursement[]; total: number }> {
  await delay();
  let filtered = [...mockReimbursements];

  if (params?.keyword) {
    const keyword = params.keyword.toLowerCase();
    filtered = filtered.filter(
      r =>
        r.reimbursementNo.toLowerCase().includes(keyword) ||
        r.applicantName.toLowerCase().includes(keyword) ||
        r.tripNo.toLowerCase().includes(keyword)
    );
  }
  if (params?.status) {
    filtered = filtered.filter(r => r.status === params.status);
  }
  if (params?.tripId) {
    filtered = filtered.filter(r => r.tripId === params.tripId);
  }

  return { list: filtered, total: filtered.length };
}

// 获取报销详情
export async function getReimbursementDetail(id: string): Promise<Reimbursement | null> {
  await delay();
  return mockReimbursements.find(r => r.id === id) || null;
}

// 创建报销申请
export async function createReimbursement(data: Partial<Reimbursement>): Promise<Reimbursement> {
  await delay(500);
  const newReimbursement: Reimbursement = {
    id: `reb-${Date.now()}`,
    reimbursementNo: `RB${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(mockReimbursements.length + 1).padStart(3, '0')}`,
    tripId: data.tripId || '',
    tripNo: data.tripNo || '',
    applicantId: data.applicantId || 'emp-001',
    applicantName: data.applicantName || '当前用户',
    department: data.department || '未分配',
    items: data.items || [],
    totalAmount: data.totalAmount || 0,
    offsetAmount: data.offsetAmount || 0,
    netAmount: data.netAmount || 0,
    status: 'draft',
    createDate: new Date().toISOString().slice(0, 10),
    updateDate: new Date().toISOString().slice(0, 10),
    ...data,
  };
  return newReimbursement;
}

// 提交报销申请
export async function submitReimbursement(id: string): Promise<Reimbursement> {
  await delay(500);
  const reimbursement = mockReimbursements.find(r => r.id === id);
  if (!reimbursement) throw new Error('报销单不存在');
  return { ...reimbursement, status: 'pending', updateDate: new Date().toISOString().slice(0, 10) };
}

// 审批报销申请
export async function approveReimbursement(id: string, action: 'approve' | 'reject', comment: string): Promise<Reimbursement> {
  await delay(500);
  const reimbursement = mockReimbursements.find(r => r.id === id);
  if (!reimbursement) throw new Error('报销单不存在');
  const nextStatus = action === 'approve'
    ? reimbursement.status === 'pending' ? 'dept_approved' : 'finance_approved'
    : 'rejected';
  return { ...reimbursement, status: nextStatus, updateDate: new Date().toISOString().slice(0, 10) };
}

// 打款
export async function payReimbursement(id: string): Promise<Reimbursement> {
  await delay(500);
  const reimbursement = mockReimbursements.find(r => r.id === id);
  if (!reimbursement) throw new Error('报销单不存在');
  return { ...reimbursement, status: 'paid', updateDate: new Date().toISOString().slice(0, 10) };
}

// ==================== 借款管理 API ====================

// 获取借款列表
export async function getLoanList(params?: LoanListParams): Promise<{ list: Loan[]; total: number }> {
  await delay();
  let filtered = [...mockLoans];

  if (params?.keyword) {
    const keyword = params.keyword.toLowerCase();
    filtered = filtered.filter(
      l =>
        l.loanNo.toLowerCase().includes(keyword) ||
        l.applicantName.toLowerCase().includes(keyword)
    );
  }
  if (params?.status) {
    filtered = filtered.filter(l => l.status === params.status);
  }
  if (params?.tripId) {
    filtered = filtered.filter(l => l.tripId === params.tripId);
  }

  return { list: filtered, total: filtered.length };
}

// 获取借款详情
export async function getLoanDetail(id: string): Promise<Loan | null> {
  await delay();
  return mockLoans.find(l => l.id === id) || null;
}

// 创建借款申请
export async function createLoan(data: Partial<Loan>): Promise<Loan> {
  await delay(500);
  const newLoan: Loan = {
    id: `loan-${Date.now()}`,
    loanNo: `LN${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(mockLoans.length + 1).padStart(3, '0')}`,
    applicantId: data.applicantId || 'emp-001',
    applicantName: data.applicantName || '当前用户',
    department: data.department || '未分配',
    type: data.type || 'travel',
    amount: data.amount || 0,
    reason: data.reason || '',
    payMethod: data.payMethod || 'bank',
    status: 'draft',
    createDate: new Date().toISOString().slice(0, 10),
    updateDate: new Date().toISOString().slice(0, 10),
    offsetAmount: 0,
    remainingAmount: data.amount || 0,
    ...data,
  };
  return newLoan;
}

// 提交借款申请
export async function submitLoan(id: string): Promise<Loan> {
  await delay(500);
  const loan = mockLoans.find(l => l.id === id);
  if (!loan) throw new Error('借款单不存在');
  return { ...loan, status: 'pending', updateDate: new Date().toISOString().slice(0, 10) };
}

// 审批借款申请
export async function approveLoan(id: string, action: 'approve' | 'reject', comment: string): Promise<Loan> {
  await delay(500);
  const loan = mockLoans.find(l => l.id === id);
  if (!loan) throw new Error('借款单不存在');
  return {
    ...loan,
    status: action === 'approve' ? 'approved' : 'rejected',
    updateDate: new Date().toISOString().slice(0, 10),
  };
}

// 打款
export async function payLoan(id: string): Promise<Loan> {
  await delay(500);
  const loan = mockLoans.find(l => l.id === id);
  if (!loan) throw new Error('借款单不存在');
  return { ...loan, status: 'paid', updateDate: new Date().toISOString().slice(0, 10) };
}

// ==================== 宿舍管理 API ====================

// 获取宿舍列表
export async function getDormitoryList(params?: DormitoryListParams): Promise<{ list: DormitoryBuilding[]; total: number }> {
  await delay();
  let filtered = [...mockDormitories];

  if (params?.companyId) {
    filtered = filtered.filter(d => d.companyId === params.companyId);
  }

  return { list: filtered, total: filtered.length };
}

// 获取宿舍详情
export async function getDormitoryDetail(id: string): Promise<DormitoryBuilding | null> {
  await delay();
  return mockDormitories.find(d => d.id === id) || null;
}

// 创建宿舍楼栋
export async function createDormitoryBuilding(data: Partial<DormitoryBuilding>): Promise<DormitoryBuilding> {
  await delay(500);
  const newBuilding: DormitoryBuilding = {
    id: `building-${Date.now()}`,
    name: data.name || '',
    companyId: data.companyId || '',
    companyName: data.companyName || '',
    city: data.city || '',
    district: data.district || '',
    street: data.street || '',
    community: data.community || '',
    address: data.address || '',
    landlordName: data.landlordName || '',
    landlordPhone: data.landlordPhone || '',
    leaseStartDate: data.leaseStartDate || '',
    leaseEndDate: data.leaseEndDate || '',
    monthlyRent: data.monthlyRent || 0,
    deposit: data.deposit || 0,
    paymentMethod: data.paymentMethod || 'monthly',
    status: 'active',
    ...data,
  };
  return newBuilding;
}

// 入住登记
export async function dormitoryCheckIn(data: Partial<DormitoryCheckIn>): Promise<DormitoryCheckIn> {
  await delay(500);
  const newCheckIn: DormitoryCheckIn = {
    id: `checkin-${Date.now()}`,
    employeeId: data.employeeId || '',
    employeeName: data.employeeName || '',
    buildingId: data.buildingId || '',
    buildingName: data.buildingName || '',
    floorId: data.floorId || '',
    floorNumber: data.floorNumber || 0,
    roomId: data.roomId || '',
    roomNumber: data.roomNumber || '',
    bedId: data.bedId || '',
    bedNumber: data.bedNumber || '',
    checkInDate: data.checkInDate || '',
    checkInType: data.checkInType || 'long_term',
    status: 'active',
    ...data,
  };
  return newCheckIn;
}

// 退房登记
export async function dormitoryCheckOut(id: string, checkOutDate: string): Promise<DormitoryCheckIn> {
  await delay(500);
  // 实际调用后端接口
  return {
    id,
    actualCheckOutDate: checkOutDate,
    status: 'checked_out',
  } as DormitoryCheckIn;
}

// 获取入住记录
export async function getDormitoryCheckIns(buildingId?: string): Promise<DormitoryCheckIn[]> {
  await delay();
  // 实际从后端获取
  return [];
}

// 获取宿舍费用
export async function getDormitoryExpenses(buildingId?: string): Promise<DormitoryExpense[]> {
  await delay();
  return [];
}

// 创建宿舍费用
export async function createDormitoryExpense(data: Partial<DormitoryExpense>): Promise<DormitoryExpense> {
  await delay(500);
  return { id: `dorm-exp-${Date.now()}`, ...data } as DormitoryExpense;
}

// 获取水电气网络缴费记录
export async function getUtilityPayments(buildingId?: string): Promise<UtilityPayment[]> {
  await delay();
  return [];
}

// 创建缴费记录
export async function createUtilityPayment(data: Partial<UtilityPayment>): Promise<UtilityPayment> {
  await delay(500);
  return { id: `utility-${Date.now()}`, ...data } as UtilityPayment;
}

// 获取维护记录
export async function getDormitoryMaintenances(buildingId?: string): Promise<DormitoryMaintenance[]> {
  await delay();
  return [];
}

// 创建维护记录
export async function createDormitoryMaintenance(data: Partial<DormitoryMaintenance>): Promise<DormitoryMaintenance> {
  await delay(500);
  return { id: `maintenance-${Date.now()}`, ...data } as DormitoryMaintenance;
}

// ==================== 打卡模块 API ====================

// 打卡
export async function punch(data: Partial<PunchRecord>): Promise<PunchRecord> {
  await delay(500);
  const newPunch: PunchRecord = {
    id: `punch-${Date.now()}`,
    employeeId: data.employeeId || 'emp-001',
    employeeName: data.employeeName || '当前用户',
    punchTime: new Date().toISOString(),
    punchType: data.punchType || 'clock_in',
    punchMethod: data.punchMethod || 'gps',
    isOnTrip: data.isOnTrip || false,
    status: 'normal',
    ...data,
  };
  return newPunch;
}

// 获取打卡记录
export async function getPunchRecords(params?: PunchRecordListParams): Promise<{ list: PunchRecord[]; total: number }> {
  await delay();
  let filtered = [...mockPunchRecords];

  if (params?.employeeId) {
    filtered = filtered.filter(p => p.employeeId === params.employeeId);
  }
  if (params?.punchType) {
    filtered = filtered.filter(p => p.punchType === params.punchType);
  }
  if (params?.status) {
    filtered = filtered.filter(p => p.status === params.status);
  }

  return { list: filtered, total: filtered.length };
}

// 获取打卡规则
export async function getPunchRule(): Promise<PunchRule> {
  await delay();
  return mockPunchRule;
}

// 更新打卡规则
export async function updatePunchRule(data: Partial<PunchRule>): Promise<PunchRule> {
  await delay(500);
  return { ...mockPunchRule, ...data };
}

// 创建临时打卡区域
export async function createTemporaryZone(data: Partial<TemporaryZone>): Promise<TemporaryZone> {
  await delay(500);
  return { id: `zone-${Date.now()}`, ...data } as TemporaryZone;
}

// 删除临时打卡区域
export async function deleteTemporaryZone(id: string): Promise<void> {
  await delay(500);
}

// ==================== 费用标准 API ====================

// 获取费用标准列表
export async function getExpenseStandardList(): Promise<ExpenseStandard[]> {
  await delay();
  return mockExpenseStandards;
}

// 获取费用标准详情
export async function getExpenseStandardDetail(id: string): Promise<ExpenseStandard | null> {
  await delay();
  return mockExpenseStandards.find(s => s.id === id) || null;
}

// 创建费用标准
export async function createExpenseStandard(data: Partial<ExpenseStandard>): Promise<ExpenseStandard> {
  await delay(500);
  return {
    id: `std-${Date.now()}`,
    createDate: new Date().toISOString().slice(0, 10),
    updateDate: new Date().toISOString().slice(0, 10),
    ...data,
  } as ExpenseStandard;
}

// 更新费用标准
export async function updateExpenseStandard(id: string, data: Partial<ExpenseStandard>): Promise<ExpenseStandard> {
  await delay(500);
  return { id, ...data, updateDate: new Date().toISOString().slice(0, 10) } as ExpenseStandard;
}

// ==================== 差旅补贴 API ====================

// 计算差旅补贴
export async function calculateSubsidy(tripId: string): Promise<TravelSubsidy> {
  await delay(500);
  const trip = mockTrips.find(t => t.id === tripId);
  if (!trip) throw new Error('出差单不存在');

  // 模拟计算逻辑
  const subsidy: TravelSubsidy = {
    id: `sub-${Date.now()}`,
    tripId,
    calcMode: 'calendar_day',
    cityLevel: 'first_tier',
    standard: 150,
    days: trip.days,
    totalAmount: 150 * trip.days,
    workingDays: Math.max(0, trip.days - 2), // 简单模拟
    overtimeDays: 0,
    isPaid: false,
  };
  return subsidy;
}

// ==================== 差旅看板 API ====================

// 获取个人差旅统计
export async function getPersonalTravelStats(employeeId: string): Promise<{
  tripCount: number;
  totalDays: number;
  totalExpense: number;
  totalSubsidy: number;
  pendingReimbursement: number;
  unsettledLoan: number;
}> {
  await delay();
  return {
    tripCount: 12,
    totalDays: 45,
    totalExpense: 35000,
    totalSubsidy: 6750,
    pendingReimbursement: 2950,
    unsettledLoan: 3000,
  };
}

// 获取部门差旅统计
export async function getDepartmentTravelStats(department: string): Promise<{
  tripCount: number;
  totalExpense: number;
  avgExpensePerPerson: number;
  expenseByType: { type: string; amount: number }[];
  expenseByCity: { city: string; amount: number }[];
  monthlyTrend: { month: string; amount: number }[];
}> {
  await delay();
  return {
    tripCount: 28,
    totalExpense: 125000,
    avgExpensePerPerson: 6250,
    expenseByType: [
      { type: '交通费', amount: 45000 },
      { type: '住宿费', amount: 50000 },
      { type: '餐饮费', amount: 20000 },
      { type: '其他', amount: 10000 },
    ],
    expenseByCity: [
      { city: '上海', amount: 45000 },
      { city: '深圳', amount: 35000 },
      { city: '杭州', amount: 25000 },
      { city: '广州', amount: 20000 },
    ],
    monthlyTrend: [
      { month: '1月', amount: 18000 },
      { month: '2月', amount: 15000 },
      { month: '3月', amount: 22000 },
      { month: '4月', amount: 28000 },
    ],
  };
}

// 获取项目差旅统计
export async function getProjectTravelStats(projectId: string): Promise<{
  totalExpense: number;
  costRatio: number;
  tripCount: number;
  expenseBySegment: { segment: string; amount: number }[];
  expenseByPerson: { person: string; amount: number }[];
  monthlyTrend: { month: string; amount: number }[];
}> {
  await delay();
  return {
    totalExpense: 18500,
    costRatio: 0.12,
    tripCount: 5,
    expenseBySegment: [
      { segment: '北京→杭州', amount: 5000 },
      { segment: '杭州→上海', amount: 3500 },
      { segment: '上海→北京', amount: 4000 },
    ],
    expenseByPerson: [
      { person: '张三', amount: 8000 },
      { person: '李四', amount: 6000 },
      { person: '王五', amount: 4500 },
    ],
    monthlyTrend: [
      { month: '1月', amount: 3000 },
      { month: '2月', amount: 4500 },
      { month: '3月', amount: 5000 },
      { month: '4月', amount: 6000 },
    ],
  };
}

// 获取费用分析统计
export async function getExpenseAnalysis(): Promise<{
  totalExpense: number;
  avgExpense: number;
  maxExpense: number;
  expenseByType: { type: string; amount: number }[];
  expenseByCity: { city: string; amount: number }[];
  transportDistribution: { mode: string; count: number }[];
  avgAccommodationCost: number;
  hotelVsDormitory: { hotel: number; dormitory: number };
  overStandardCount: number;
  overStandardAmount: number;
  overStandardReasons: { reason: string; count: number }[];
}> {
  await delay();
  return {
    totalExpense: 125000,
    avgExpense: 4464,
    maxExpense: 12000,
    expenseByType: [
      { type: '交通费', amount: 45000 },
      { type: '住宿费', amount: 50000 },
      { type: '餐饮费', amount: 20000 },
      { type: '其他', amount: 10000 },
    ],
    expenseByCity: [
      { city: '上海', amount: 45000 },
      { city: '深圳', amount: 35000 },
      { city: '杭州', amount: 25000 },
      { city: '广州', amount: 20000 },
    ],
    transportDistribution: [
      { mode: '高铁', count: 15 },
      { mode: '动车', count: 8 },
      { mode: '飞机', count: 10 },
      { mode: '自驾', count: 3 },
    ],
    avgAccommodationCost: 450,
    hotelVsDormitory: { hotel: 80, dormitory: 20 },
    overStandardCount: 5,
    overStandardAmount: 3500,
    overStandardReasons: [
      { reason: '协议酒店满房', count: 2 },
      { reason: '紧急出差无协议酒店', count: 2 },
      { reason: '客户指定酒店', count: 1 },
    ],
  };
}
