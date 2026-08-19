// ========================================
// 差旅管理模块 - 类型定义
// ========================================

// ==================== 枚举类型 ====================

// 出差状态
export type TripStatus =
  | 'draft'        // 草稿
  | 'pending'      // 待审批
  | 'approved'     // 已通过
  | 'in_progress'  // 进行中
  | 'to_reimburse' // 待报销
  | 'closed'       // 已关闭
  | 'rejected'     // 已拒绝
  | 'cancelled';   // 已取消

// 报销状态
export type ReimbursementStatus =
  | 'draft'           // 草稿
  | 'pending'         // 待审批
  | 'dept_approved'   // 部门审批通过
  | 'finance_approved' // 财务审批通过
  | 'paid'            // 已打款
  | 'completed'       // 已完成
  | 'rejected';       // 已拒绝

// 借款状态
export type LoanStatus =
  | 'draft'      // 草稿
  | 'pending'    // 待审批
  | 'approved'   // 已通过
  | 'paid'       // 已打款
  | 'offset'     // 已冲抵
  | 'settled'    // 已结清
  | 'rejected'   // 已拒绝
  | 'cancelled'; // 已取消

// 费用类型（旅程段子类型）
export type TripExpenseType =
  | 'transport'   // 交通费
  | 'accommodation' // 住宿费
  | 'meal'        // 餐饮费
  | 'communication' // 通讯费
  | 'local_transport' // 市内交通
  | 'entertainment' // 招待费
  | 'office'      // 办公用品
  | 'other';      // 其他

// 交通方式
export type TransportMode =
  | 'high_speed_rail' // 高铁
  | 'bullet_train'    // 动车
  | 'airplane'        // 飞机
  | 'self_drive'      // 自驾
  | 'bus'             // 大巴
  | 'ferry'           // 轮船
  | 'other';          // 其他

// 住宿类型
export type AccommodationType =
  | 'hotel'    // 酒店
  | 'dormitory' // 宿舍
  | 'none';    // 无

// 城市等级
export type CityLevel =
  | 'first_tier'  // 一线
  | 'second_tier' // 二线
  | 'third_tier'  // 三线
  | 'other';      // 其他

// 借款类型
export type LoanType =
  | 'travel'     // 差旅借款
  | 'petty_cash' // 备用金
  | 'other';     // 其他

// 补贴计算模式
export type SubsidyCalcMode =
  | 'calendar_day'    // 按自然日
  | 'working_day';    // 按实际工作日

// 宿舍费用类型
export type DormitoryExpenseType =
  | 'rent'      // 租金
  | 'water'     // 水费
  | 'electricity' // 电费
  | 'gas'       // 燃气费
  | 'internet'  // 网络费
  | 'deposit'   // 押金
  | 'maintenance' // 维修费
  | 'other';    // 其他

// 维护类型
export type MaintenanceType =
  | 'repair'   // 报修
  | 'cleaning' // 保洁
  | 'inspection'; // 巡检

// 紧急程度
export type UrgencyLevel =
  | 'normal'      // 普通
  | 'urgent'      // 紧急
  | 'very_urgent'; // 非常紧急

// 打卡类型
export type PunchType =
  | 'clock_in'  // 上班打卡
  | 'clock_out' // 下班打卡
  | 'overtime'; // 加班打卡

// 打卡状态
export type PunchStatus =
  | 'normal'   // 正常
  | 'abnormal' // 异常
  | 'makeup';  // 补卡

// 审批状态
export type ApprovalStatus =
  | 'approved' // 已通过
  | 'rejected' // 已拒绝
  | 'pending'; // 待审批

// ==================== 核心实体 ====================

// 审批记录
export interface ApprovalRecord {
  id: string;
  step: string;           // 审批节点名称
  approver: string;       // 审批人
  approverId: string;     // 审批人 ID
  status: ApprovalStatus;
  time: string;           // 审批时间
  comment: string;        // 审批意见
}

// 费用记录
export interface Expense {
  id: string;
  tripId: string;           // 关联出差单
  itinerarySegmentId: string; // 关联旅程段
  type: TripExpenseType;
  amount: number;
  date: string;             // 发生日期
  invoiceNo?: string;       // 发票号
  attachments?: Attachment[]; // 票据附件
  remark?: string;
  isOverStandard: boolean;  // 是否超标
  overStandardReason?: string; // 超标原因
}

// 附件
export interface Attachment {
  id: string;
  name: string;
  size: string;
  url?: string;
}

// 住宿安排
export interface Accommodation {
  id: string;
  itinerarySegmentId: string;
  type: AccommodationType;
  // 酒店信息
  hotelName?: string;
  roomType?: string;
  pricePerNight?: number;
  nights?: number;
  totalAmount?: number;
  // 宿舍信息
  dormitoryBuildingId?: string;
  dormitoryFloorId?: string;
  dormitoryRoomId?: string;
  dormitoryBedId?: string;
  dormitoryBuildingName?: string;
  dormitoryRoomNumber?: string;
  dormitoryBedNumber?: string;
}

// 旅程段
export interface ItinerarySegment {
  id: string;
  tripId: string;
  segmentOrder: number;     // 段序号
  departure: string;        // 出发地
  destination: string;      // 目的地
  departureDate: string;    // 出发日期
  arrivalDate: string;      // 到达日期
  transportMode: TransportMode;
  transportDetail?: string; // 交通班次（车次号、航班号）
  transportCost: number;    // 交通费用
  // 关联信息
  customerId?: string;
  customerName?: string;
  projectId?: string;
  projectName?: string;
  // 住宿安排
  accommodation?: Accommodation;
  // 费用记录
  expenses?: Expense[];
  // 费用汇总
  totalExpense: number;
}

// 出差单
export interface Trip {
  id: string;
  tripNo: string;           // 出差单号
  applicantId: string;      // 申请人 ID
  applicantName: string;    // 申请人姓名
  department: string;       // 部门
  // 关联信息
  customerId?: string;
  customerName?: string;
  projectId?: string;
  projectName?: string;
  // 行程信息
  destinations: string[];   // 目的地列表
  startDate: string;        // 出发日期
  endDate: string;          // 返回日期
  days: number;             // 出差天数
  transportModes: TransportMode[]; // 交通方式
  // 住宿信息
  accommodationIntent: AccommodationType; // 住宿方式意向
  estimatedAccommodationDays: number;
  // 费用预估
  estimatedTransportCost: number;
  estimatedAccommodationCost: number;
  estimatedMealCost: number;
  estimatedOtherCost: number;
  estimatedTotalCost: number;
  // 借款
  needLoan: boolean;
  loanAmount?: number;
  loanReason?: string;
  // 状态
  status: TripStatus;
  purpose: string;          // 出差目的
  createDate: string;
  updateDate: string;
  // 子实体
  itinerarySegments?: ItinerarySegment[];
  reimbursements?: Reimbursement[];
  loans?: Loan[];
  subsidy?: TravelSubsidy;
  approvalRecords?: ApprovalRecord[];
}

// 报销明细
export interface ReimbursementItem {
  id: string;
  reimbursementId: string;
  expenseId: string;        // 关联费用记录
  expenseType: TripExpenseType;
  description: string;
  amount: number;
  itinerarySegmentId: string;
  itinerarySegmentDesc: string; // 旅程段描述（如"北京→杭州"）
}

// 报销单
export interface Reimbursement {
  id: string;
  reimbursementNo: string;  // 报销单号
  tripId: string;           // 关联出差单
  tripNo: string;           // 出差单号
  applicantId: string;
  applicantName: string;
  department: string;
  // 费用明细
  items: ReimbursementItem[];
  totalAmount: number;      // 报销总额
  // 借款冲抵
  loanOffsets?: LoanOffset[];
  offsetAmount: number;     // 冲抵金额
  netAmount: number;        // 应退/应补金额
  // 附件
  attachments?: Attachment[];
  // 状态
  status: ReimbursementStatus;
  remark?: string;
  createDate: string;
  updateDate: string;
  // 审批
  approvalRecords?: ApprovalRecord[];
}

// 借款冲抵记录
export interface LoanOffset {
  id: string;
  loanId: string;
  loanNo: string;
  reimbursementId: string;
  offsetAmount: number;
  offsetDate: string;
}

// 借款单
export interface Loan {
  id: string;
  loanNo: string;           // 借款单号
  applicantId: string;
  applicantName: string;
  department: string;
  tripId?: string;          // 关联出差单（可选）
  tripNo?: string;
  type: LoanType;
  amount: number;           // 借款金额
  reason: string;           // 借款理由
  expectedPayDate?: string; // 期望打款日期
  payMethod: 'bank' | 'cash' | 'other'; // 打款方式
  // 状态
  status: LoanStatus;
  createDate: string;
  updateDate: string;
  // 冲抵记录
  offsets?: LoanOffset[];
  offsetAmount: number;     // 已冲抵金额
  remainingAmount: number;  // 剩余金额
  // 审批
  approvalRecords?: ApprovalRecord[];
}

// 差旅补贴
export interface TravelSubsidy {
  id: string;
  tripId: string;
  calcMode: SubsidyCalcMode;
  cityLevel: CityLevel;
  standard: number;         // 补贴标准（元/天）
  days: number;             // 补贴天数
  totalAmount: number;      // 补贴总额
  // 工作日数据
  workingDays?: number;     // 工作日
  overtimeDays?: number;    // 加班工作日
  // 发放状态
  isPaid: boolean;
  paidDate?: string;
  paidWithSalary?: string;  // 随哪个月工资发放
}

// ==================== 宿舍管理 ====================

// 楼栋
export interface DormitoryBuilding {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  // 地址信息
  city: string;
  district: string;
  street: string;
  community: string;
  address: string;
  // 房东信息
  landlordName: string;
  landlordPhone: string;
  landlordIdCard?: string;
  // 租赁信息
  leaseStartDate: string;
  leaseEndDate: string;
  monthlyRent: number;
  deposit: number;
  paymentMethod: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  contractAttachment?: Attachment;
  // 水电气网络
  waterAccountNo?: string;
  waterPayMethod?: string;
  electricityAccountNo?: string;
  electricityPayMethod?: string;
  gasAccountNo?: string;
  gasPayMethod?: string;
  internetAccountNo?: string;
  internetProvider?: string;
  internetMonthlyFee?: number;
  internetPayMethod?: string;
  // 状态
  status: 'active' | 'inactive';
  floors?: DormitoryFloor[];
}

// 楼层
export interface DormitoryFloor {
  id: string;
  buildingId: string;
  floorNumber: number;
  roomCount: number;
  remark?: string;
  rooms?: DormitoryRoom[];
}

// 房间
export interface DormitoryRoom {
  id: string;
  buildingId: string;
  floorId: string;
  roomNumber: string;
  roomType: 'single' | 'double' | 'quad' | 'other';
  bedCount: number;
  facilities: string[];     // 设施列表
  status: 'available' | 'occupied' | 'maintenance';
  remark?: string;
  beds?: DormitoryBed[];
}

// 床位
export interface DormitoryBed {
  id: string;
  buildingId: string;
  floorId: string;
  roomId: string;
  bedNumber: string;
  status: 'available' | 'occupied';
  occupantId?: string;
  occupantName?: string;
  tripId?: string;          // 关联出差单（出差入住时）
}

// 入住记录
export interface DormitoryCheckIn {
  id: string;
  employeeId: string;
  employeeName: string;
  buildingId: string;
  buildingName: string;
  floorId: string;
  floorNumber: number;
  roomId: string;
  roomNumber: string;
  bedId: string;
  bedNumber: string;
  checkInDate: string;
  expectedCheckOutDate?: string;
  actualCheckOutDate?: string;
  checkInType: 'long_term' | 'trip'; // 长期入住/出差入住
  tripId?: string;
  tripNo?: string;
  status: 'active' | 'checked_out';
  remark?: string;
}

// 宿舍费用
export interface DormitoryExpense {
  id: string;
  buildingId: string;
  buildingName: string;
  roomId?: string;
  roomNumber?: string;
  type: DormitoryExpenseType;
  amount: number;
  period: string;           // 费用期间（如"2026年4月"）
  splitMethod: 'by_room' | 'by_person';
  remark?: string;
  attachments?: Attachment[];
}

// 水电气网络缴费记录
export interface UtilityPayment {
  id: string;
  buildingId: string;
  buildingName: string;
  type: 'water' | 'electricity' | 'gas' | 'internet';
  amount: number;
  paymentDate: string;
  period: string;           // 缴费周期
  paymentProof?: Attachment[];
  remark?: string;
}

// 维护记录
export interface DormitoryMaintenance {
  id: string;
  buildingId: string;
  buildingName: string;
  roomId?: string;
  roomNumber?: string;
  type: MaintenanceType;
  description: string;
  urgency: UrgencyLevel;
  photos?: Attachment[];
  status: 'pending' | 'in_progress' | 'completed';
  assignee?: string;
  completedDate?: string;
  remark?: string;
}

// ==================== 打卡模块 ====================

// 打卡记录
export interface PunchRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  punchTime: string;
  punchType: PunchType;
  punchMethod: 'gps' | 'wifi' | 'manual';
  // 定位信息
  longitude?: number;
  latitude?: number;
  address?: string;
  accuracy?: number;
  // 出差关联
  isOnTrip: boolean;
  tripId?: string;
  tripNo?: string;
  // 状态
  status: PunchStatus;
  abnormalReason?: string;
  makeupReason?: string;
  makeupProof?: Attachment[];
}

// 临时打卡区域
export interface TemporaryZone {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  radius: number;           // 有效范围（米）
  startDate: string;
  endDate: string;
  tripId?: string;
  tripNo?: string;
  projectId?: string;
  projectName?: string;
}

// 打卡规则
export interface PunchRule {
  id: string;
  name: string;
  // 工作时间
  workStartTime: string;    // 如 "09:00"
  workEndTime: string;      // 如 "18:00"
  flexibleMinutes: number;  // 弹性时间（分钟）
  // 打卡范围
  companyLongitude: number;
  companyLatitude: number;
  companyRadius: number;    // 有效范围（米）
  limitOnTrip: boolean;     // 出差时是否限制范围
  temporaryZones?: TemporaryZone[];
  // 加班规则
  overtimeStartTime: string; // 如 "18:30"
  overtimeMinUnit: number;   // 加班最小单位（小时）
  overtimeNeedApproval: boolean;
  // 异常规则
  lateThresholdMinutes: number; // 迟到阈值（分钟）
  absentHandling: 'auto_absent' | 'allow_makeup';
  makeupDeadlineDays: number;   // 补卡时限（天）
  // 状态
  isActive: boolean;
}

// ==================== 费用标准 ====================

// 标准明细
export interface StandardDetail {
  id: string;
  standardId: string;
  // 维度
  levels: string[];         // 职级列表（如 ['L1', 'L2', 'L3']）
  cityLevels: CityLevel[];
  // 交通标准
  highSpeedRailClass: 'second' | 'first' | 'business';
  bulletTrainClass: 'second' | 'first';
  airplaneClass: 'economy' | 'business' | 'first';
  selfDriveRate: number;    // 元/公里
  localTransportLimit: number; // 元/天
  // 住宿标准
  hotelLimit: number;       // 元/晚
  hotelRoomType: string;    // 房型限制
  // 餐饮标准
  mealAllowance: number;    // 元/天
  entertainmentMealLimit: number; // 元/次
  // 其他标准
  communicationAllowance: number; // 元/天
  miscellaneousAllowance: number; // 元/天
  // 补贴标准
  subsidyCalcMode: SubsidyCalcMode;
  subsidyAmount: number;    // 元/天
}

// 费用标准
export interface ExpenseStandard {
  id: string;
  name: string;
  effectiveDate: string;
  expiryDate?: string;
  status: 'active' | 'inactive';
  details: StandardDetail[];
  createDate: string;
  updateDate: string;
}

// ==================== API 参数类型 ====================

// 出差列表查询参数
export interface TripListParams {
  keyword?: string;
  status?: TripStatus;
  applicantId?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  projectId?: string;
  page?: number;
  pageSize?: number;
}

// 报销列表查询参数
export interface ReimbursementListParams {
  keyword?: string;
  status?: ReimbursementStatus;
  applicantId?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  tripId?: string;
  page?: number;
  pageSize?: number;
}

// 借款列表查询参数
export interface LoanListParams {
  keyword?: string;
  status?: LoanStatus;
  applicantId?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  tripId?: string;
  page?: number;
  pageSize?: number;
}

// 宿舍列表查询参数
export interface DormitoryListParams {
  buildingId?: string;
  floorId?: string;
  roomStatus?: string;
  companyId?: string;
  page?: number;
  pageSize?: number;
}

// 打卡记录查询参数
export interface PunchRecordListParams {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  punchType?: PunchType;
  status?: PunchStatus;
  tripId?: string;
  page?: number;
  pageSize?: number;
}
