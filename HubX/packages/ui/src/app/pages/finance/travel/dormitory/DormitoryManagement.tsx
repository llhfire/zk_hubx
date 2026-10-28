import { useState, useEffect, useMemo } from 'react';
import {
  Button,
  AsyncState,
  Input,
  Tag,
  Modal,
  Select,
  Tabs,
  Space,
  Typography,
  Message,
  Tooltip,
  Popconfirm,
  Radio,
  InputNumber,
  Checkbox,
  Divider,
  FormGrid,
  FormSection,
} from '@/design-system';
import {
  IconPlus,
  IconHome,
  IconUser,
  IconEdit,
  IconDelete,
  IconSearch,
  IconCheck,
  IconClockCircle,
  IconCheckCircle,
  IconExclamationCircle,
  IconSwap,
  IconFilter,
  IconDown,
  IconUp,
  IconFile,
} from '@/design-system';
import type { DormitoryBuilding, DormitoryCheckIn, DormitoryExpense, DormitoryMaintenance, DormitoryBed } from '../types';
import { getDormitoryList } from '../travel-api';
import { mockDormitories, mockTrips } from '../mock-data';
import {
  DataTable,
  DateText,
  DormitoryRoomBoard,
  EmptyState,
  MetricGrid,
  MoneyText,
  PageHeader,
  PageShell,
  SectionTabs,
  SectionCard,
  StatusTag,
  resolveStatus,
  type StatusMap,
} from '@/design-system';
import '../travelAdminConsistency.css';
import './dormitoryManagement.css';

const { Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const CHECK_IN_STATUS: StatusMap<DormitoryCheckIn['status']> = {
  active: { label: '在住', tone: 'success' },
  checked_out: { label: '已退宿', tone: 'neutral' },
};

const MAINTENANCE_STATUS: StatusMap<DormitoryMaintenance['status']> = {
  pending: { label: '待处理', tone: 'warning' },
  in_progress: { label: '处理中', tone: 'info' },
  completed: { label: '已完成', tone: 'success' },
};

const MAINTENANCE_URGENCY: StatusMap<DormitoryMaintenance['urgency']> = {
  normal: { label: '普通', tone: 'neutral' },
  urgent: { label: '紧急', tone: 'warning' },
  very_urgent: { label: '非常紧急', tone: 'danger' },
};

/** 费用类型是并列分类而非状态好坏，用分类色（cyan/pink/gold）区分 */
const EXPENSE_TYPE: StatusMap = {
  rent: { label: '房屋租金', tone: 'pink' },
  water: { label: '水费', tone: 'cyan' },
  electricity: { label: '电费', tone: 'warning' },
  gas: { label: '燃气费', tone: 'danger' },
  internet: { label: '宽带费', tone: 'info' },
  maintenance: { label: '维修保洁', tone: 'success' },
  other: { label: '其他杂费', tone: 'neutral' },
};

const MAINTENANCE_TYPE: StatusMap = {
  repair: { label: '设施报修', tone: 'danger' },
  cleaning: { label: '专业保洁', tone: 'cyan' },
  inspection: { label: '定期巡检', tone: 'info' },
};

// 常用城市快选标签
const quickCities = ['北京', '杭州', '上海', '深圳', '成都', '武汉'];

// 常用报修故障胶囊标签
const quickFaults = [
  '空调不制冷且排水管渗水',
  '卫生间水龙头微漏水',
  '门锁感应不灵需要换电池',
  '热水器跳闸不通电',
  '宿舍千兆WiFi信号微弱掉线',
  '主卧顶灯闪烁不亮',
  '洗衣机排水故障',
];

// 候选员工库
const candidateEmployees = [
  { id: 'emp-001', name: '张三', department: '销售部', phone: '13800000001' },
  { id: 'emp-002', name: '李四', department: '产品设计部', phone: '13800000002' },
  { id: 'emp-003', name: '王五', department: '技术研发部', phone: '13800000003' },
  { id: 'emp-004', name: '赵六', department: '运维工程部', phone: '13800000004' },
  { id: 'emp-005', name: '孙七', department: '大数据分析部', phone: '13800000005' },
  { id: 'emp-006', name: '周八', department: '商务拓展部', phone: '13800000006' },
  { id: 'emp-007', name: '吴九', department: '财务结算部', phone: '13800000007' },
  { id: 'emp-008', name: '郑十', department: '人力行政部', phone: '13800000008' },
];

// 初始入住数据
const initialCheckIns: DormitoryCheckIn[] = [
  {
    id: 'checkin-1',
    employeeId: 'emp-001',
    employeeName: '张三',
    buildingId: 'dorm-1',
    buildingName: '中科人才公寓',
    floorId: 'dorm-1-f1',
    floorNumber: 1,
    roomId: 'dorm-1-f1-r1',
    roomNumber: '101',
    bedId: 'dorm-1-f1-r1-b1',
    bedNumber: '1',
    checkInDate: '2026-08-01',
    checkInType: 'long_term',
    status: 'active',
  },
  {
    id: 'checkin-2',
    employeeId: 'emp-004',
    employeeName: '赵六',
    buildingId: 'dorm-1',
    buildingName: '中科人才公寓',
    floorId: 'dorm-1-f2',
    floorNumber: 2,
    roomId: 'dorm-1-f2-r1',
    roomNumber: '201',
    bedId: 'dorm-1-f2-r1-b1',
    bedNumber: '1',
    checkInDate: '2026-08-10',
    checkInType: 'long_term',
    status: 'active',
  },
  {
    id: 'checkin-3',
    employeeId: 'emp-002',
    employeeName: '李四',
    buildingId: 'dorm-2',
    buildingName: '杭州滨江创新公寓',
    floorId: 'dorm-2-f1',
    floorNumber: 1,
    roomId: 'dorm-2-f1-r1',
    roomNumber: '101',
    bedId: 'dorm-2-f1-r1-b1',
    bedNumber: '1',
    checkInDate: '2026-07-15',
    checkInType: 'long_term',
    status: 'active',
  },
  {
    id: 'checkin-4',
    employeeId: 'emp-003',
    employeeName: '王五',
    buildingId: 'dorm-2',
    buildingName: '杭州滨江创新公寓',
    floorId: 'dorm-2-f2',
    floorNumber: 2,
    roomId: 'dorm-2-f2-r1',
    roomNumber: '201',
    bedId: 'dorm-2-f2-r1-b1',
    bedNumber: '1',
    checkInDate: '2026-08-20',
    checkInType: 'trip',
    tripId: 'TRIP-2026-003',
    tripNo: 'BT20260425001',
    status: 'active',
  },
  {
    id: 'checkin-5',
    employeeId: 'emp-005',
    employeeName: '孙七',
    buildingId: 'dorm-2',
    buildingName: '杭州滨江创新公寓',
    floorId: 'dorm-2-f2',
    floorNumber: 2,
    roomId: 'dorm-2-f2-r1',
    roomNumber: '201',
    bedId: 'dorm-2-f2-r1-b2',
    bedNumber: '2',
    checkInDate: '2026-08-22',
    checkInType: 'trip',
    tripId: 'TRIP-2026-005',
    tripNo: 'BT20260424001',
    status: 'active',
  },
  {
    id: 'checkin-6',
    employeeId: 'emp-008',
    employeeName: '周八',
    buildingId: 'dorm-1',
    buildingName: '中科人才公寓',
    floorId: 'dorm-1-f1',
    floorNumber: 1,
    roomId: 'dorm-1-f1-r2',
    roomNumber: '102',
    bedId: 'dorm-1-f1-r2-b1',
    bedNumber: '1',
    checkInDate: '2026-06-01',
    expectedCheckOutDate: '2026-07-31',
    actualCheckOutDate: '2026-07-31',
    checkInType: 'trip',
    tripNo: 'BT20260424001',
    status: 'checked_out',
  },
];

// 初始费用数据
const initialExpenses: DormitoryExpense[] = [
  { id: 'dorm-exp-1', buildingId: 'dorm-1', buildingName: '中科人才公寓', type: 'rent', amount: 12000, period: '2026年8月', splitMethod: 'by_person', remark: '8月份房屋总租金' },
  { id: 'dorm-exp-2', buildingId: 'dorm-1', buildingName: '中科人才公寓', type: 'electricity', amount: 860, period: '2026年8月', splitMethod: 'by_room', remark: '8月夏季用电高峰' },
  { id: 'dorm-exp-3', buildingId: 'dorm-1', buildingName: '中科人才公寓', type: 'water', amount: 180, period: '2026年8月', splitMethod: 'by_person', remark: '8月水费抄表' },
  { id: 'dorm-exp-4', buildingId: 'dorm-1', buildingName: '中科人才公寓', type: 'internet', amount: 200, period: '2026年8月', splitMethod: 'by_person', remark: '电信千兆宽带代扣' },
  { id: 'dorm-exp-5', buildingId: 'dorm-2', buildingName: '杭州滨江创新公寓', type: 'rent', amount: 16000, period: '2026年8月', splitMethod: 'by_person', remark: '三季度租金按月记账' },
  { id: 'dorm-exp-6', buildingId: 'dorm-2', buildingName: '杭州滨江创新公寓', type: 'electricity', amount: 1120, period: '2026年8月', splitMethod: 'by_room', remark: '空调制冷电费' },
  { id: 'dorm-exp-7', buildingId: 'dorm-2', buildingName: '杭州滨江创新公寓', type: 'internet', amount: 260, period: '2026年8月', splitMethod: 'by_person', remark: '移动千兆专线' },
];

// 初始维护数据
const initialMaintenances: DormitoryMaintenance[] = [
  { id: 'maintenance-1', buildingId: 'dorm-1', buildingName: '中科人才公寓', roomId: 'dorm-1-f1-r2', roomNumber: '102', type: 'repair', description: '空调制冷异常，排水管有微渗', urgency: 'urgent', status: 'in_progress', assignee: '物业维修组' },
  { id: 'maintenance-2', buildingId: 'dorm-2', buildingName: '杭州滨江创新公寓', roomId: 'dorm-2-f1-r2', roomNumber: '102', type: 'repair', description: '卫浴花洒水压过小，门锁需要更换电池', urgency: 'normal', status: 'pending', assignee: '房东李经理' },
  { id: 'maintenance-3', buildingId: 'dorm-1', buildingName: '中科人才公寓', roomId: 'dorm-1-f2-r2', roomNumber: '202', type: 'cleaning', description: '新入住前深度保洁与床品消毒', urgency: 'normal', status: 'completed', assignee: '保洁阿姨' },
  { id: 'maintenance-4', buildingId: 'dorm-2', buildingName: '杭州滨江创新公寓', roomId: 'dorm-2-f2-r1', roomNumber: '201', type: 'inspection', description: '四人间用电安全与消防设施季度巡检', urgency: 'normal', status: 'completed', assignee: '综合管理部' },
];

export function DormitoryManagement() {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [buildings, setBuildings] = useState<DormitoryBuilding[]>(mockDormitories);
  const [selectedBuilding, setSelectedBuilding] = useState<DormitoryBuilding | null>(mockDormitories[0] || null);
  const [activeTab, setActiveTab] = useState<string>('rooms');

  // 楼栋搜索与房态过滤
  const [buildingSearchKey, setBuildingSearchKey] = useState('');
  const [roomStatusFilter, setRoomStatusFilter] = useState<'all' | 'available' | 'occupied' | 'maintenance'>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');
  const [isHeroExpanded, setIsHeroExpanded] = useState(false);

  // 列表数据
  const [checkIns, setCheckIns] = useState<DormitoryCheckIn[]>(initialCheckIns);
  const [expenses, setExpenses] = useState<DormitoryExpense[]>(initialExpenses);
  const [maintenances, setMaintenances] = useState<DormitoryMaintenance[]>(initialMaintenances);

  // 列表过滤条件
  const [checkInSearch, setCheckInSearch] = useState('');
  const [checkInTypeFilter, setCheckInTypeFilter] = useState<string>('all');
  const [checkInStatusFilter, setCheckInStatusFilter] = useState<string>('all');

  const [expenseBuildingFilter, setExpenseBuildingFilter] = useState<string>('all');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<string>('all');

  const [maintenanceBuildingFilter, setMaintenanceBuildingFilter] = useState<string>('all');
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState<string>('all');
  const [maintenanceUrgencyFilter, setMaintenanceUrgencyFilter] = useState<string>('all');

  // 弹窗状态
  const [formVisible, setFormVisible] = useState(false);
  const [editingBuildingId, setEditingBuildingId] = useState<string>();

  const [checkInVisible, setCheckInVisible] = useState(false);
  const [editingCheckInId, setEditingCheckInId] = useState<string>();

  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [checkingOutRecord, setCheckingOutRecord] = useState<DormitoryCheckIn | null>(null);
  const [checkoutChecklist, setCheckoutChecklist] = useState({
    keysReturned: true,
    facilitiesIntact: true,
    belongingsCleared: true,
    utilitiesSettled: true,
    autoGenerateCleaning: true,
  });

  const [expenseVisible, setExpenseVisible] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string>();

  const [maintenanceVisible, setMaintenanceVisible] = useState(false);
  const [editingMaintenanceId, setEditingMaintenanceId] = useState<string>();

  // 1. 楼栋档案表单
  const [buildingForm, setBuildingForm] = useState({
    name: '',
    city: '',
    district: '',
    street: '',
    community: '',
    address: '',
    landlordName: '',
    landlordPhone: '',
    leaseStartDate: '2026-01-01',
    leaseEndDate: '2028-12-31',
    monthlyRent: 15000,
    deposit: 30000,
    paymentMethod: 'monthly' as DormitoryBuilding['paymentMethod'],
    waterAccountNo: '',
    electricityAccountNo: '',
    internetAccountNo: '',
    internetProvider: '中国电信千兆',
    internetMonthlyFee: 200,
    // 房源自动批量初始化
    autoInitRooms: true,
    initFloorsCount: 2,
    initRoomsPerFloor: 2,
    initRoomType: 'double' as 'single' | 'double' | 'quad',
  });

  // 2. 入住登记表单
  const [checkInForm, setCheckInForm] = useState({
    employeeId: '',
    employeeName: '',
    department: '技术研发部',
    phone: '',
    buildingId: '',
    floorId: '',
    roomId: '',
    bedId: '',
    checkInDate: '2026-08-26',
    expectedCheckOutDate: '2026-12-31',
    checkInType: 'long_term' as 'long_term' | 'trip',
    tripId: '',
    tripNo: '',
    accessCardNo: 'CARD-8809',
    depositAmount: 200,
  });

  // 3. 费用表单
  const [expenseForm, setExpenseForm] = useState({
    buildingId: '',
    type: 'rent' as DormitoryExpense['type'],
    amount: 12000,
    period: '2026年8月',
    splitMethod: 'by_person' as DormitoryExpense['splitMethod'],
    remark: '',
  });

  // 4. 报修维护表单
  const [maintenanceForm, setMaintenanceForm] = useState({
    buildingId: '',
    roomNumber: '',
    type: 'repair' as DormitoryMaintenance['type'],
    description: '',
    urgency: 'normal' as DormitoryMaintenance['urgency'],
    status: 'pending' as DormitoryMaintenance['status'],
    assignee: '物业维修组',
  });

  useEffect(() => {
    loadBuildings();
  }, []);

  const loadBuildings = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const result = await getDormitoryList();
      setBuildings(result.list);
      setSelectedBuilding((prev) => result.list.find((building) => building.id === prev?.id) ?? result.list[0] ?? null);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  // 全局汇总与计算
  const allRooms = useMemo(() => {
    return buildings.flatMap((b) => b.floors?.flatMap((f) => f.rooms ?? []) ?? []);
  }, [buildings]);

  const allBeds = useMemo(() => {
    return allRooms.flatMap((r) => r.beds ?? []);
  }, [allRooms]);

  const totalMonthlyRent = useMemo(() => {
    return buildings.reduce((acc, b) => acc + (b.monthlyRent || 0), 0);
  }, [buildings]);

  const totalOccupiedBeds = useMemo(() => {
    return allBeds.filter((b) => b.status === 'occupied').length;
  }, [allBeds]);

  const totalAvailableBeds = useMemo(() => {
    return Math.max(0, allBeds.length - totalOccupiedBeds);
  }, [allBeds.length, totalOccupiedBeds]);

  const pendingMaintenancesCount = useMemo(() => {
    return maintenances.filter((m) => m.status !== 'completed').length;
  }, [maintenances]);

  // 过滤楼栋列表
  const filteredBuildings = useMemo(() => {
    if (!buildingSearchKey.trim()) return buildings;
    const key = buildingSearchKey.toLowerCase();
    return buildings.filter(
      (b) =>
        b.name.toLowerCase().includes(key) ||
        b.city.toLowerCase().includes(key) ||
        b.district.toLowerCase().includes(key) ||
        b.address.toLowerCase().includes(key)
    );
  }, [buildings, buildingSearchKey]);

  // =================== 子功能一：楼栋弹窗操作与批量房源初始化 ===================
  const openBuildingForm = (building?: DormitoryBuilding) => {
    setEditingBuildingId(building?.id);
    setBuildingForm(
      building
        ? {
            name: building.name,
            city: building.city,
            district: building.district,
            street: building.street,
            community: building.community,
            address: building.address,
            landlordName: building.landlordName,
            landlordPhone: building.landlordPhone,
            leaseStartDate: building.leaseStartDate || '2026-01-01',
            leaseEndDate: building.leaseEndDate || '2028-12-31',
            monthlyRent: building.monthlyRent || 0,
            deposit: building.deposit || 0,
            paymentMethod: building.paymentMethod || 'monthly',
            waterAccountNo: building.waterAccountNo || '',
            electricityAccountNo: building.electricityAccountNo || '',
            internetAccountNo: building.internetAccountNo || '',
            internetProvider: building.internetProvider || '中国电信千兆',
            internetMonthlyFee: building.internetMonthlyFee || 200,
            autoInitRooms: false,
            initFloorsCount: 2,
            initRoomsPerFloor: 2,
            initRoomType: 'double',
          }
        : {
            name: '',
            city: '杭州',
            district: '滨江区',
            street: '科技大道',
            community: '高新人才公寓',
            address: '杭州市滨江区科技大道100号8号楼',
            landlordName: '陈房东',
            landlordPhone: '13888889999',
            leaseStartDate: '2026-01-01',
            leaseEndDate: '2028-12-31',
            monthlyRent: 18000,
            deposit: 36000,
            paymentMethod: 'monthly',
            waterAccountNo: 'W-HZ-9901',
            electricityAccountNo: 'E-HZ-9901',
            internetAccountNo: 'NET-HZ-9901',
            internetProvider: '中国电信千兆',
            internetMonthlyFee: 220,
            autoInitRooms: true,
            initFloorsCount: 2,
            initRoomsPerFloor: 2,
            initRoomType: 'double',
          }
    );
    setFormVisible(true);
  };

  const handleSaveBuilding = () => {
    if (!buildingForm.name.trim() || !buildingForm.city.trim()) {
      Message.error('请填写楼栋名称和所在城市');
      return;
    }
    const previous = buildings.find((b) => b.id === editingBuildingId);
    const buildingId = editingBuildingId || `dorm-${Date.now()}`;

    // 智能批量生成楼层与房间
    let generatedFloors = previous?.floors || [];
    if (!editingBuildingId && buildingForm.autoInitRooms) {
      const floorsCount = Math.min(10, Math.max(1, buildingForm.initFloorsCount));
      const roomsCount = Math.min(8, Math.max(1, buildingForm.initRoomsPerFloor));
      const bedsPerRoom = buildingForm.initRoomType === 'single' ? 1 : buildingForm.initRoomType === 'double' ? 2 : 4;

      generatedFloors = Array.from({ length: floorsCount }, (_, fIndex) => {
        const floorNum = fIndex + 1;
        const floorId = `${buildingId}-f${floorNum}`;
        const rooms = Array.from({ length: roomsCount }, (_, rIndex) => {
          const roomNum = `${floorNum}0${rIndex + 1}`;
          const roomId = `${floorId}-r${rIndex + 1}`;
          const beds = Array.from({ length: bedsPerRoom }, (_, bIndex) => ({
            id: `${roomId}-b${bIndex + 1}`,
            buildingId,
            floorId,
            roomId,
            bedNumber: `${bIndex + 1}`,
            status: 'available' as const,
          }));
          return {
            id: roomId,
            buildingId,
            floorId,
            roomNumber: roomNum,
            roomType: buildingForm.initRoomType,
            bedCount: bedsPerRoom,
            facilities: ['独立卫浴', '空调', '热水器', 'WiFi'],
            status: 'available' as const,
            beds,
          };
        });

        return {
          id: floorId,
          buildingId,
          floorNumber: floorNum,
          roomCount: roomsCount,
          rooms,
        };
      });
    }

    const newRecord: DormitoryBuilding = {
      id: buildingId,
      companyId: previous?.companyId || 'company-1',
      companyName: previous?.companyName || '中科集团',
      paymentMethod: buildingForm.paymentMethod,
      status: previous?.status || 'active',
      floors: generatedFloors,
      name: buildingForm.name,
      city: buildingForm.city,
      district: buildingForm.district,
      street: buildingForm.street,
      community: buildingForm.community,
      address: buildingForm.address,
      landlordName: buildingForm.landlordName,
      landlordPhone: buildingForm.landlordPhone,
      leaseStartDate: buildingForm.leaseStartDate,
      leaseEndDate: buildingForm.leaseEndDate,
      monthlyRent: buildingForm.monthlyRent,
      deposit: buildingForm.deposit,
      waterAccountNo: buildingForm.waterAccountNo,
      electricityAccountNo: buildingForm.electricityAccountNo,
      internetAccountNo: buildingForm.internetAccountNo,
      internetProvider: buildingForm.internetProvider,
      internetMonthlyFee: buildingForm.internetMonthlyFee,
    };

    setBuildings((prev) =>
      editingBuildingId ? prev.map((item) => (item.id === editingBuildingId ? newRecord : item)) : [...prev, newRecord]
    );
    setSelectedBuilding(newRecord);
    Message.success(
      editingBuildingId
        ? '楼栋档案已成功更新'
        : `楼栋创建成功，已自动初始化 ${generatedFloors.length} 个楼层与对应房源`
    );
    setFormVisible(false);
  };

  // =================== 子功能二：入住登记（含出差单联动与图形化选床） ===================
  const openNewCheckIn = (prefill?: { buildingId?: string; floorId?: string; roomId?: string; bedId?: string }) => {
    setEditingCheckInId(undefined);
    const targetBuildingId = prefill?.buildingId || selectedBuilding?.id || buildings[0]?.id || '';
    const b = buildings.find((x) => x.id === targetBuildingId);
    const targetFloorId = prefill?.floorId || b?.floors?.[0]?.id || '';
    const f = b?.floors?.find((x) => x.id === targetFloorId);
    const targetRoomId = prefill?.roomId || f?.rooms?.[0]?.id || '';
    const r = f?.rooms?.find((x) => x.id === targetRoomId);
    const targetBedId = prefill?.bedId || r?.beds?.find((bd) => bd.status === 'available')?.id || r?.beds?.[0]?.id || '';

    setCheckInForm({
      employeeId: 'emp-001',
      employeeName: '张三',
      department: '销售部',
      phone: '13800000001',
      buildingId: targetBuildingId,
      floorId: targetFloorId,
      roomId: targetRoomId,
      bedId: targetBedId,
      checkInDate: '2026-08-26',
      expectedCheckOutDate: '2026-12-31',
      checkInType: 'long_term',
      tripId: '',
      tripNo: '',
      accessCardNo: 'CARD-8809',
      depositAmount: 200,
    });
    setCheckInVisible(true);
  };

  const openEditCheckIn = (record: DormitoryCheckIn) => {
    setEditingCheckInId(record.id);
    setCheckInForm({
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      department: '技术研发部',
      phone: '13900001111',
      buildingId: record.buildingId,
      floorId: record.floorId,
      roomId: record.roomId,
      bedId: record.bedId,
      checkInDate: record.checkInDate,
      expectedCheckOutDate: record.expectedCheckOutDate || '2026-12-31',
      checkInType: record.checkInType,
      tripId: record.tripId || '',
      tripNo: record.tripNo || '',
      accessCardNo: 'CARD-8809',
      depositAmount: 200,
    });
    setCheckInVisible(true);
  };

  // 联动选择出差单
  const handleSelectTrip = (tripNo: string) => {
    const trip = mockTrips.find((t) => t.tripNo === tripNo);
    if (!trip) return;
    setCheckInForm((prev) => ({
      ...prev,
      tripId: trip.id,
      tripNo: trip.tripNo,
      employeeId: trip.applicantId,
      employeeName: trip.applicantName,
      department: trip.department,
      checkInDate: trip.startDate,
      expectedCheckOutDate: trip.endDate,
    }));
    Message.info(`已自动匹配出差人【${trip.applicantName}】及行程日期（${trip.startDate} ~ ${trip.endDate}）`);
  };

  // 联动选择候选员工
  const handleSelectCandidate = (empId: string) => {
    const emp = candidateEmployees.find((e) => e.id === empId);
    if (!emp) return;
    setCheckInForm((prev) => ({
      ...prev,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      phone: emp.phone,
    }));
  };

  const handleSaveCheckIn = () => {
    if (!checkInForm.employeeName.trim() || !checkInForm.bedId) {
      Message.error('请填写员工姓名并选定具体床位');
      return;
    }
    const building = buildings.find((b) => b.id === checkInForm.buildingId);
    const floor = building?.floors?.find((f) => f.id === checkInForm.floorId);
    const room = floor?.rooms?.find((r) => r.id === checkInForm.roomId);
    const bed = room?.beds?.find((b) => b.id === checkInForm.bedId);

    const record: DormitoryCheckIn = {
      id: editingCheckInId || `checkin-${Date.now()}`,
      employeeId: checkInForm.employeeId || `emp-${Date.now()}`,
      employeeName: checkInForm.employeeName.trim(),
      buildingId: building?.id || '',
      buildingName: building?.name || '',
      floorId: floor?.id || '',
      floorNumber: floor?.floorNumber || 1,
      roomId: room?.id || '',
      roomNumber: room?.roomNumber || '',
      bedId: bed?.id || '',
      bedNumber: bed?.bedNumber || '',
      checkInDate: checkInForm.checkInDate,
      expectedCheckOutDate: checkInForm.expectedCheckOutDate,
      checkInType: checkInForm.checkInType,
      tripId: checkInForm.tripId || undefined,
      tripNo: checkInForm.tripNo || checkInForm.tripId || undefined,
      status: 'active',
    };

    // 同步更新楼栋房间床位状态
    setBuildings((prevBuildings) =>
      prevBuildings.map((b) => {
        if (b.id !== checkInForm.buildingId) return b;
        return {
          ...b,
          floors: b.floors?.map((f) => {
            if (f.id !== checkInForm.floorId) return f;
            return {
              ...f,
              rooms: f.rooms?.map((r) => {
                if (r.id !== checkInForm.roomId) return r;
                return {
                  ...r,
                  status: 'occupied',
                  beds: r.beds?.map((bd) => {
                    if (bd.id !== checkInForm.bedId) return bd;
                    return {
                      ...bd,
                      status: 'occupied',
                      occupantId: record.employeeId,
                      occupantName: record.employeeName,
                      tripId: record.tripId,
                    };
                  }),
                };
              }),
            };
          }),
        };
      })
    );

    // 同步更新 selectedBuilding
    if (selectedBuilding?.id === checkInForm.buildingId) {
      setSelectedBuilding((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          floors: prev.floors?.map((f) => {
            if (f.id !== checkInForm.floorId) return f;
            return {
              ...f,
              rooms: f.rooms?.map((r) => {
                if (r.id !== checkInForm.roomId) return r;
                return {
                  ...r,
                  status: 'occupied',
                  beds: r.beds?.map((bd) => {
                    if (bd.id !== checkInForm.bedId) return bd;
                    return {
                      ...bd,
                      status: 'occupied',
                      occupantId: record.employeeId,
                      occupantName: record.employeeName,
                      tripId: record.tripId,
                    };
                  }),
                };
              }),
            };
          }),
        };
      });
    }

    setCheckIns((prev) =>
      editingCheckInId ? prev.map((item) => (item.id === editingCheckInId ? record : item)) : [record, ...prev]
    );

    Message.success(editingCheckInId ? '入住记录已成功更新' : '入住登记办理成功，床位已锁定');
    setCheckInVisible(false);
  };

  // =================== 子功能三：办理退宿交接与结算 ===================
  const openCheckOutModal = (record: DormitoryCheckIn) => {
    setCheckingOutRecord(record);
    setCheckoutChecklist({
      keysReturned: true,
      facilitiesIntact: true,
      belongingsCleared: true,
      utilitiesSettled: true,
      autoGenerateCleaning: true,
    });
    setCheckoutVisible(true);
  };

  const confirmCheckOut = () => {
    if (!checkingOutRecord) return;
    const record = checkingOutRecord;
    const actualCheckOutDate = new Date().toISOString().slice(0, 10);

    // 1. 更新入住记录为已退宿
    setCheckIns((prev) =>
      prev.map((item) =>
        item.id === record.id
          ? { ...item, status: 'checked_out', actualCheckOutDate }
          : item
      )
    );

    // 2. 释放床位
    setBuildings((prevBuildings) =>
      prevBuildings.map((b) => {
        if (b.id !== record.buildingId) return b;
        return {
          ...b,
          floors: b.floors?.map((f) => {
            if (f.id !== record.floorId) return f;
            return {
              ...f,
              rooms: f.rooms?.map((r) => {
                if (r.id !== record.roomId) return r;
                const newBeds = r.beds?.map((bd) => {
                  if (bd.id !== record.bedId) return bd;
                  return {
                    ...bd,
                    status: 'available' as const,
                    occupantId: undefined,
                    occupantName: undefined,
                    tripId: undefined,
                  };
                });
                const anyOccupied = newBeds?.some((bd) => bd.status === 'occupied');
                return {
                  ...r,
                  status: (anyOccupied ? 'occupied' : 'available') as 'occupied' | 'available',
                  beds: newBeds,
                };
              }),
            };
          }),
        };
      })
    );

    // 3. 更新 selectedBuilding
    if (selectedBuilding?.id === record.buildingId) {
      setSelectedBuilding((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          floors: prev.floors?.map((f) => {
            if (f.id !== record.floorId) return f;
            return {
              ...f,
              rooms: f.rooms?.map((r) => {
                if (r.id !== record.roomId) return r;
                const newBeds = r.beds?.map((bd) => {
                  if (bd.id !== record.bedId) return bd;
                  return {
                    ...bd,
                    status: 'available' as const,
                    occupantId: undefined,
                    occupantName: undefined,
                    tripId: undefined,
                  };
                });
                const anyOccupied = newBeds?.some((bd) => bd.status === 'occupied');
                return {
                  ...r,
                  status: (anyOccupied ? 'occupied' : 'available') as 'occupied' | 'available',
                  beds: newBeds,
                };
              }),
            };
          }),
        };
      });
    }

    // 4. 若勾选自动生成退宿保洁工单，自动追加到维保列表
    if (checkoutChecklist.autoGenerateCleaning) {
      const cleaningOrder: DormitoryMaintenance = {
        id: `maint-clean-${Date.now()}`,
        buildingId: record.buildingId,
        buildingName: record.buildingName,
        roomId: record.roomId,
        roomNumber: record.roomNumber,
        type: 'cleaning',
        description: `【退宿自动派工】${record.employeeName} 办理退宿，安排${record.roomNumber}室全面深度保洁与床品消杀`,
        urgency: 'normal',
        status: 'pending',
        assignee: '保洁服务组',
      };
      setMaintenances((prev) => [cleaningOrder, ...prev]);
      Message.success(`${record.employeeName} 退宿手续交接完成，床位已释放，已自动派遣保洁工单！`);
    } else {
      Message.success(`${record.employeeName} 退宿手续已成功办结，床位已恢复可用状态`);
    }

    setCheckoutVisible(false);
    setCheckingOutRecord(null);
  };

  // =================== 子功能四：费用管理与实时分摊测算 ===================
  const openExpenseForm = (record?: DormitoryExpense) => {
    setEditingExpenseId(record?.id);
    setExpenseForm(
      record
        ? {
            buildingId: record.buildingId,
            type: record.type,
            amount: record.amount,
            period: record.period,
            splitMethod: record.splitMethod,
            remark: record.remark || '',
          }
        : {
            buildingId: selectedBuilding?.id || buildings[0]?.id || '',
            type: 'electricity',
            amount: 980,
            period: '2026年8月',
            splitMethod: 'by_person',
            remark: '8月夏季用电结算',
          }
    );
    setExpenseVisible(true);
  };

  const handleSaveExpense = () => {
    const building = buildings.find((b) => b.id === expenseForm.buildingId);
    if (!building || !expenseForm.period || expenseForm.amount <= 0) {
      Message.error('请填写完整的费用金额与计费周期');
      return;
    }
    // expenseForm 里也有 buildingId，必须放在展开之后再覆盖，否则前面的赋值会被冲掉。
    const record: DormitoryExpense = {
      ...expenseForm,
      id: editingExpenseId || `dorm-exp-${Date.now()}`,
      buildingId: building.id,
      buildingName: building.name,
    };
    setExpenses((prev) =>
      editingExpenseId ? prev.map((item) => (item.id === editingExpenseId ? record : item)) : [record, ...prev]
    );
    setExpenseVisible(false);
    Message.success(editingExpenseId ? '宿舍费用账单已更新' : '宿舍费用已成功登记并核算分摊');
  };

  // 动态测算选中楼栋的分摊指标
  const activeExpenseBuilding = useMemo(() => {
    return buildings.find((b) => b.id === expenseForm.buildingId) || buildings[0];
  }, [buildings, expenseForm.buildingId]);

  const expenseSplitEstimate = useMemo(() => {
    if (!activeExpenseBuilding) return { count: 1, perUnit: 0, label: '人' };
    const bRooms = activeExpenseBuilding.floors?.flatMap((f) => f.rooms || []) || [];
    const bBeds = bRooms.flatMap((r) => r.beds || []);
    const bOccupants = bBeds.filter((b) => b.status === 'occupied').length;

    if (expenseForm.splitMethod === 'by_person') {
      const count = Math.max(1, bOccupants);
      return {
        count,
        perUnit: (expenseForm.amount / count).toFixed(2),
        label: '人',
        desc: `该楼栋当前实际在住 ${bOccupants} 人`,
      };
    } else {
      const count = Math.max(1, bRooms.length);
      return {
        count,
        perUnit: (expenseForm.amount / count).toFixed(2),
        label: '间',
        desc: `该楼栋共有 ${bRooms.length} 间宿舍房间`,
      };
    }
  }, [activeExpenseBuilding, expenseForm.amount, expenseForm.splitMethod]);

  // =================== 子功能五：维保与报修闭环 ===================
  const openMaintenanceForm = (record?: DormitoryMaintenance, prefillRoom?: { buildingId: string; roomNumber: string }) => {
    setEditingMaintenanceId(record?.id);
    setMaintenanceForm(
      record
        ? {
            buildingId: record.buildingId,
            roomNumber: record.roomNumber || '',
            type: record.type,
            description: record.description,
            urgency: record.urgency,
            status: record.status,
            assignee: record.assignee || '物业维修组',
          }
        : {
            buildingId: prefillRoom?.buildingId || selectedBuilding?.id || buildings[0]?.id || '',
            roomNumber: prefillRoom?.roomNumber || '',
            type: 'repair',
            description: '',
            urgency: 'normal',
            status: 'pending',
            assignee: '物业工程组',
          }
    );
    setMaintenanceVisible(true);
  };

  const handleSaveMaintenance = () => {
    const building = buildings.find((b) => b.id === maintenanceForm.buildingId);
    if (!building || !maintenanceForm.description.trim()) {
      Message.error('请填写故障或维护事项描述');
      return;
    }
    const room = building.floors?.flatMap((f) => f.rooms || []).find((r) => r.roomNumber === maintenanceForm.roomNumber);
    // 同上：maintenanceForm 里也有 buildingId，展开必须在前。
    const record: DormitoryMaintenance = {
      ...maintenanceForm,
      id: editingMaintenanceId || `maintenance-${Date.now()}`,
      buildingId: building.id,
      buildingName: building.name,
      roomId: room?.id,
    };
    setMaintenances((prev) =>
      editingMaintenanceId ? prev.map((item) => (item.id === editingMaintenanceId ? record : item)) : [record, ...prev]
    );
    setMaintenanceVisible(false);
    Message.success(editingMaintenanceId ? '维保工单已更新' : '维保工单已提交并进入派工队列');
  };

  // 快捷流转维保工单状态
  const advanceMaintenanceStatus = (record: DormitoryMaintenance) => {
    let nextStatus: DormitoryMaintenance['status'] = 'in_progress';
    if (record.status === 'pending') {
      nextStatus = 'in_progress';
    } else if (record.status === 'in_progress') {
      nextStatus = 'completed';
    } else {
      return;
    }
    setMaintenances((prev) =>
      prev.map((item) => (item.id === record.id ? { ...item, status: nextStatus } : item))
    );
    Message.success(
      nextStatus === 'in_progress'
        ? `工单 [${record.roomNumber ? `${record.roomNumber}室` : record.buildingName}] 已接单派工`
        : `工单 [${record.roomNumber ? `${record.roomNumber}室` : record.buildingName}] 维修验收已办结完成`
    );
  };

  // 过滤后的入住管理数据
  const filteredCheckIns = useMemo(() => {
    return checkIns.filter((item) => {
      if (checkInSearch.trim()) {
        const query = checkInSearch.toLowerCase();
        const matchName = item.employeeName.toLowerCase().includes(query);
        const matchEmpId = item.employeeId.toLowerCase().includes(query);
        const matchRoom = item.roomNumber.toLowerCase().includes(query);
        const matchTrip = (item.tripNo || '').toLowerCase().includes(query);
        if (!matchName && !matchEmpId && !matchRoom && !matchTrip) return false;
      }
      if (checkInTypeFilter !== 'all' && item.checkInType !== checkInTypeFilter) return false;
      if (checkInStatusFilter !== 'all' && item.status !== checkInStatusFilter) return false;
      return true;
    });
  }, [checkIns, checkInSearch, checkInTypeFilter, checkInStatusFilter]);

  // 过滤后的费用数据
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      if (expenseBuildingFilter !== 'all' && item.buildingId !== expenseBuildingFilter) return false;
      if (expenseTypeFilter !== 'all' && item.type !== expenseTypeFilter) return false;
      return true;
    });
  }, [expenses, expenseBuildingFilter, expenseTypeFilter]);

  // 费用统计条数据
  const expenseSummary = useMemo(() => {
    const list = filteredExpenses;
    const total = list.reduce((sum, item) => sum + item.amount, 0);
    const rentTotal = list.filter((item) => item.type === 'rent').reduce((sum, item) => sum + item.amount, 0);
    const utilityTotal = list
      .filter((item) => ['water', 'electricity', 'gas', 'internet'].includes(item.type))
      .reduce((sum, item) => sum + item.amount, 0);
    const activeCount = Math.max(1, totalOccupiedBeds);
    const avgPerPerson = Math.round(total / activeCount);
    return { total, rentTotal, utilityTotal, avgPerPerson };
  }, [filteredExpenses, totalOccupiedBeds]);

  // 过滤后的维护数据
  const filteredMaintenances = useMemo(() => {
    return maintenances.filter((item) => {
      if (maintenanceBuildingFilter !== 'all' && item.buildingId !== maintenanceBuildingFilter) return false;
      if (maintenanceStatusFilter !== 'all' && item.status !== maintenanceStatusFilter) return false;
      if (maintenanceUrgencyFilter !== 'all' && item.urgency !== maintenanceUrgencyFilter) return false;
      return true;
    });
  }, [maintenances, maintenanceBuildingFilter, maintenanceStatusFilter, maintenanceUrgencyFilter]);

  const roomBoardFloors = (selectedBuilding?.floors || []).map((floor) => {
    const floorRooms = floor.rooms || [];
    const floorBeds = floorRooms.flatMap((room) => room.beds || []);
    return {
      key: floor.id,
      label: `${floor.floorNumber}F 楼层`,
      roomCount: floorRooms.length,
      bedCount: floorBeds.length,
      occupiedCount: floorBeds.filter((bed) => bed.status === 'occupied').length,
      rooms: floorRooms.map((room) => {
        const isUnderMaintenance = room.status === 'maintenance' || maintenances.some(
          (maintenance) => maintenance.buildingId === selectedBuilding?.id
            && maintenance.roomNumber === room.roomNumber
            && maintenance.status !== 'completed',
        );
        const roomTypeLabel = room.roomType === 'single' ? '单人间' : room.roomType === 'double' ? '双人间' : '四人间';
        const roomTypeTone = room.roomType === 'single' ? 'warning' as const : room.roomType === 'double' ? 'info' as const : 'purple' as const;
        return {
          key: room.id,
          roomNumber: room.roomNumber,
          roomTypeKey: room.roomType,
          roomTypeLabel,
          roomTypeTone,
          facilities: room.facilities,
          maintenance: isUnderMaintenance,
          onMaintenance: () => openMaintenanceForm(undefined, { buildingId: selectedBuilding!.id, roomNumber: room.roomNumber }),
          beds: (room.beds || []).map((bed) => {
            const isOccupied = bed.status === 'occupied';
            const checkInRecord = checkIns.find((checkIn) => checkIn.bedId === bed.id && checkIn.status === 'active');
            return {
              key: bed.id,
              label: `${bed.bedNumber}号床`,
              occupied: isOccupied,
              occupantName: bed.occupantName || checkInRecord?.employeeName || '在住员工',
              stayLabel: bed.tripId ? '出差借宿' : '长期员工',
              stayTone: bed.tripId ? 'purple' as const : 'info' as const,
              onSelect: !isOccupied ? () => openNewCheckIn({
                buildingId: selectedBuilding!.id,
                floorId: floor.id,
                roomId: room.id,
                bedId: bed.id,
              }) : undefined,
              onCheckout: isOccupied && checkInRecord ? () => openCheckOutModal(checkInRecord) : undefined,
            };
          }),
        };
      }),
    };
  });

  return (
    <PageShell>
      <PageHeader
        title="宿舍管理"
        description="统一管理企业宿舍楼栋档案、房态床位网格、员工入住/退宿、水电气租金分摊及报修维护闭环。"
        actions={!loading && !loadError && (
          <Space>
            <Button icon={<IconPlus />} onClick={() => openBuildingForm()}>
              新增楼栋
            </Button>
            <Button type="primary" icon={<IconUser />} onClick={() => openNewCheckIn()}>
              办理入住
            </Button>
          </Space>
        )}
      />

      <AsyncState
        status={loading ? 'loading' : loadError ? 'error' : 'ready'}
        loadingText="正在加载宿舍楼栋"
        errorText="加载宿舍楼栋失败"
        onRetry={() => void loadBuildings()}
      >
      {/* 4 大核心指标中枢 */}
      <MetricGrid
        items={[
          {
            key: 'buildings',
            label: '在管楼栋',
            value: `${buildings.length} 栋`,
            detail: <>全网总月租 <MoneyText value={totalMonthlyRent} /></>,
          },
          {
            key: 'beds',
            label: '床位总数',
            value: `${allBeds.length} 个`,
            detail: `当前空闲 ${totalAvailableBeds} 个可立即安排`,
            tone: totalAvailableBeds > 0 ? 'success' : 'neutral',
          },
          {
            key: 'occupied',
            label: '在住床位',
            value: `${totalOccupiedBeds} 人`,
            detail: allBeds.length > 0 ? `当前综合入住率 ${((totalOccupiedBeds / allBeds.length) * 100).toFixed(0)}%` : '暂无床位',
            tone: totalOccupiedBeds > 0 ? 'success' : 'neutral',
          },
          {
            key: 'maintenance',
            label: '待办维保',
            value: `${pendingMaintenancesCount} 单`,
            detail: `当月公摊费用记录 ${expenses.length} 笔`,
            tone: pendingMaintenancesCount > 0 ? 'warning' : 'success',
          },
        ]}
      />

      <SectionTabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'rooms',
            label: "房态与床位",
            content: (
              <>
                  <div className="dorm-master-detail travel-admin-master-detail">
                    {/* 左侧：楼栋选择器 Master */}
                    <div className="dorm-master-col">
                      <SectionCard
                        title="楼栋清单"
                        extra={
                          <Button
                            size="mini"
                            type="text"
                            icon={<IconPlus />}
                            onClick={() => openBuildingForm()}
                          >
                            新增
                          </Button>
                        }
                      >
                        <div style={{ marginBottom: 12 }}>
                          <Input
                            prefix={<IconSearch />}
                            placeholder="按楼栋/城市搜索..."
                            allowClear
                            value={buildingSearchKey}
                            onChange={setBuildingSearchKey}
                          />
                        </div>
                        <Space direction="vertical" size={12} style={{ width: '100%' }}>
                          {filteredBuildings.map((building) => {
                            const isActive = selectedBuilding?.id === building.id;
                            const bRooms = building.floors?.flatMap((f) => f.rooms ?? []) ?? [];
                            const bBeds = bRooms.flatMap((r) => r.beds ?? []);
                            const bOccupied = bBeds.filter((b) => b.status === 'occupied').length;
                            const bAvailable = bBeds.length - bOccupied;
        
                            return (
                              <div
                                key={building.id}
                                className={`dorm-building-card${isActive ? ' dorm-building-card--active' : ''}`}
                                onClick={() => setSelectedBuilding(building)}
                              >
                                {/* 1. 标题与快捷操作 */}
                                <div className="dorm-building-card__head">
                                  <div className="dorm-building-card__title" title={building.name}>
                                    <IconHome style={{ color: isActive ? 'rgb(var(--primary-6))' : 'var(--color-text-3)', flexShrink: 0 }} />
                                    <span className="dorm-building-card__name">{building.name}</span>
                                  </div>
                                  <div onClick={(e) => e.stopPropagation()}><Space size={2} className="dorm-building-card__actions">
                                    <Tooltip content="编辑楼栋档案">
                                      <Button
                                        aria-label={`编辑${building.name}`}
                                        className="hubx-icon-action"
                                        size="mini"
                                        type="text"
                                        icon={<IconEdit />}
                                        onClick={() => openBuildingForm(building)}
                                      />
                                    </Tooltip>
                                    <Popconfirm
                                      title="确认删除该楼栋档案？关联房间将一并移除。"
                                      onOk={() => {
                                        setBuildings((items) => items.filter((b) => b.id !== building.id));
                                        if (selectedBuilding?.id === building.id) {
                                          const rest = buildings.filter((b) => b.id !== building.id);
                                          setSelectedBuilding(rest[0] || null);
                                        }
                                        Message.success('楼栋档案已删除');
                                      }}
                                    >
                                      <Tooltip content="删除楼栋">
                                        <Button
                                          aria-label={`删除${building.name}`}
                                          className="hubx-icon-action"
                                          size="mini"
                                          type="text"
                                          status="danger"
                                          icon={<IconDelete />}
                                        />
                                      </Tooltip>
                                    </Popconfirm>
                                  </Space></div>
                                </div>
        
                                {/* 2. 城市行政区与社区门牌 */}
                                <div className="dorm-building-card__sub">
                                  <StatusTag size="small" tone="info" style={{ flexShrink: 0 }}>
                                    {building.city}·{building.district}
                                  </StatusTag>
                                  <span className="dorm-building-card__address" title={building.community || building.address}>
                                    {building.community || building.address}
                                  </span>
                                </div>
        
                                {/* 3. 房床使用状态 */}
                                <div className="dorm-building-card__stats-row">
                                  <StatusTag
                                    meta={{
                                      label: bAvailable > 0 ? `余 ${bAvailable} 空床` : '已满员',
                                      tone: bAvailable > 0 ? 'success' : 'neutral',
                                    }}
                                  />
                                  <span className="dorm-building-card__room-count">
                                    共 {bRooms.length} 房 · {bBeds.length} 床
                                  </span>
                                </div>
        
                                {/* 4. 月租费用行（独立成行，避免挤压） */}
                                <div className="dorm-building-card__rent-row">
                                  <span className="dorm-building-card__lease-tag">预算月租</span>
                                  <span className="dorm-building-card__rent">
                                    <MoneyText value={building.monthlyRent} />
                                    <Text type="secondary" style={{ marginLeft: 2 }}>/月</Text>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {filteredBuildings.length === 0 && <EmptyState description="无匹配楼栋" />}
                        </Space>
                      </SectionCard>
                    </div>
        
                    {/* 右侧：房态可视化矩阵 Detail */}
                    <div style={{ minWidth: 0 }}>
                      <SectionCard
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span>{selectedBuilding ? selectedBuilding.name : '请选择楼栋'}</span>
                            {selectedBuilding && (
                              <StatusTag tone="info">{selectedBuilding.city} · {selectedBuilding.district}</StatusTag>
                            )}
                          </div>
                        }
                        extra={
                          selectedBuilding && (
                            <Space>
                              <Button
                                size="small"
                                icon={<IconFile />}
                                onClick={() => openExpenseForm()}
                              >
                                录入费用
                              </Button>
                              <Button
                                size="small"
                                type="primary"
                                icon={<IconPlus />}
                                onClick={() => openNewCheckIn({ buildingId: selectedBuilding.id })}
                              >
                                快速办理入住
                              </Button>
                            </Space>
                          )
                        }
                      >
                        {selectedBuilding ? (
                          <div>
                            {/* 楼栋全貌档案卡（可展开/折叠） */}
                            <div className="dorm-hero-panel">
                              <div className="dorm-hero-header">
                                <div className="dorm-hero-title">
                                  <IconHome />
                                  <span>楼栋租赁与物业公摊信息</span>
                                </div>
                                <Button
                                  size="mini"
                                  type="text"
                                  icon={isHeroExpanded ? <IconUp /> : <IconDown />}
                                  onClick={() => setIsHeroExpanded(!isHeroExpanded)}
                                >
                                  {isHeroExpanded ? '收起详情' : '展开档案'}
                                </Button>
                              </div>
        
                              <div className="dorm-hero-meta-grid">
                                <div className="dorm-hero-meta-item">
                                  <span className="dorm-hero-meta-label">详细地址</span>
                                  <span className="dorm-hero-meta-val">{selectedBuilding.address}</span>
                                </div>
                                <div className="dorm-hero-meta-item">
                                  <span className="dorm-hero-meta-label">房东联系人</span>
                                  <span className="dorm-hero-meta-val">
                                    {selectedBuilding.landlordName} ({selectedBuilding.landlordPhone})
                                  </span>
                                </div>
                                <div className="dorm-hero-meta-item">
                                  <span className="dorm-hero-meta-label">租赁周期与押金</span>
                                  <span className="dorm-hero-meta-val">
                                    <DateText value={selectedBuilding.leaseStartDate} end={selectedBuilding.leaseEndDate} /> (押金 <MoneyText value={selectedBuilding.deposit} />)
                                  </span>
                                </div>
                                <div className="dorm-hero-meta-item">
                                  <span className="dorm-hero-meta-label">月租总额</span>
                                  <span className="dorm-hero-meta-val">
                                    <MoneyText value={selectedBuilding.monthlyRent} tone="danger" />/月 (按月付)
                                  </span>
                                </div>
                              </div>
        
                              {/* 展开的公用事业账户明细 */}
                              {isHeroExpanded && (
                                <div
                                  style={{
                                    marginTop: 14,
                                    paddingTop: 12,
                                    borderTop: '1px dashed var(--color-border-2)',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '10px 20px',
                                  }}
                                >
                                  <div className="dorm-hero-meta-item">
                                    <span className="dorm-hero-meta-label">水费户号</span>
                                    <span className="dorm-hero-meta-val">{selectedBuilding.waterAccountNo || 'W-880219 (自动代扣)'}</span>
                                  </div>
                                  <div className="dorm-hero-meta-item">
                                    <span className="dorm-hero-meta-label">电费户号</span>
                                    <span className="dorm-hero-meta-val">{selectedBuilding.electricityAccountNo || 'E-330108 (阶梯电价)'}</span>
                                  </div>
                                  <div className="dorm-hero-meta-item">
                                    <span className="dorm-hero-meta-label">宽带网络</span>
                                    <span className="dorm-hero-meta-val">
                                      {selectedBuilding.internetProvider || '中国电信千兆专网'} (月费 <MoneyText value={selectedBuilding.internetMonthlyFee || 200} />)
                                    </span>
                                  </div>
                                  <div className="dorm-hero-meta-item">
                                    <span className="dorm-hero-meta-label">支付方式</span>
                                    <span className="dorm-hero-meta-val">
                                      {selectedBuilding.paymentMethod === 'quarterly' ? '季付' : selectedBuilding.paymentMethod === 'annual' ? '年付' : '月付'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
        
                            <DormitoryRoomBoard
                              floors={roomBoardFloors}
                              statusFilter={roomStatusFilter}
                              onStatusFilterChange={setRoomStatusFilter}
                              roomTypeFilter={roomTypeFilter}
                              onRoomTypeFilterChange={setRoomTypeFilter}
                            />
                          </div>
                        ) : (
                          <EmptyState description="请选择左侧楼栋查看房态矩阵" />
                        )}
                      </SectionCard>
                    </div>
                  </div>
                
              </>
            ),
          },
          {
            key: 'checkin',
            label: "入住管理",
            content: (
              <>
                  <SectionCard
                    title="员工入住台账"
                    extra={
                      <Button type="primary" icon={<IconPlus />} onClick={() => openNewCheckIn()}>
                        办理入住登记
                      </Button>
                    }
                  >
                    {/* 表格：严格无头像 */}
                    <DataTable
                      toolbar={
                        <>
                          <Input
                            prefix={<IconSearch />}
                            placeholder="搜索员工姓名 / 工号 / 房间号 / 出差单..."
                            allowClear
                            value={checkInSearch}
                            onChange={setCheckInSearch}
                            style={{ width: 280 }}
                          />
                          <Select
                            placeholder="入住类型"
                            value={checkInTypeFilter}
                            onChange={setCheckInTypeFilter}
                            style={{ width: 130 }}
                          >
                            <Option value="all">全部类型</Option>
                            <Option value="long_term">长期员工宿舍</Option>
                            <Option value="trip">出差临时借宿</Option>
                          </Select>
                          <Select
                            placeholder="入住状态"
                            value={checkInStatusFilter}
                            onChange={setCheckInStatusFilter}
                            style={{ width: 120 }}
                          >
                            <Option value="all">全部状态</Option>
                            <Option value="active">当前在住</Option>
                            <Option value="checked_out">已退宿</Option>
                          </Select>
                        </>
                      }
                      caption={<>共查询到 <strong>{filteredCheckIns.length}</strong> 条入住记录</>}
                      columns={[
                        {
                          title: '入住员工',
                          dataIndex: 'employeeName',
                          width: 140,
                          render: (_: unknown, record: DormitoryCheckIn) => (
                            <div className="dorm-employee-cell">
                              <span className="dorm-employee-name">{record.employeeName}</span>
                              <span className="dorm-employee-sub">{record.employeeId}</span>
                            </div>
                          ),
                        },
                        {
                          title: '分配宿舍与床位',
                          dataIndex: 'buildingName',
                          width: 220,
                          render: (_: unknown, record: DormitoryCheckIn) => (
                            <div>
                              <div style={{ fontWeight: 500 }}>{record.buildingName}</div>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                                {record.floorNumber}层 · {record.roomNumber}室 · {record.bedNumber}号床
                              </div>
                            </div>
                          ),
                        },
                        {
                          title: '入住类型',
                          dataIndex: 'checkInType',
                          width: 130,
                          render: (v: string, record: DormitoryCheckIn) => (
                            <Space direction="vertical" size={2}>
                              <StatusTag tone={v === 'long_term' ? 'info' : 'purple'}>
                                {v === 'long_term' ? '长期入住' : '出差临时'}
                              </StatusTag>
                              {record.tripNo && (
                                <span style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--color-text-3)' }}>
                                  单号: {record.tripNo}
                                </span>
                              )}
                            </Space>
                          ),
                        },
                        {
                          title: '入住周期',
                          dataIndex: 'checkInDate',
                          width: 180,
                          render: (_: unknown, record: DormitoryCheckIn) => (
                            <div style={{ fontSize: 'var(--text-xs)' }}>
                              <div>起：<DateText value={record.checkInDate} /></div>
                              {record.actualCheckOutDate ? (
                                <div>止：<DateText value={record.actualCheckOutDate} /> (已退)</div>
                              ) : (
                                <div style={{ color: 'rgb(var(--success-6))' }}>在住中</div>
                              )}
                            </div>
                          ),
                        },
                        {
                          title: '当前状态',
                          dataIndex: 'status',
                          width: 100,
                          render: (v: DormitoryCheckIn['status']) => <StatusTag meta={CHECK_IN_STATUS[v]} />,
                        },
                        {
                          title: '操作',
                          width: 140,
                          fixed: 'right',
                          render: (_: unknown, record: DormitoryCheckIn) => (
                            <Space size={6}>
                              {record.status === 'active' && (
                                <Button
                                  size="mini"
                                  type="outline"
                                  status="warning"
                                  onClick={() => openCheckOutModal(record)}
                                >
                                  退宿
                                </Button>
                              )}
                              <Tooltip content="编辑记录">
                                <Button
                                  aria-label={`编辑${record.employeeName}入住`}
                                  className="hubx-icon-action"
                                  type="text"
                                  icon={<IconEdit />}
                                  onClick={() => openEditCheckIn(record)}
                                />
                              </Tooltip>
                              <Popconfirm
                                title="确认删除该入住记录？"
                                onOk={() => {
                                  setCheckIns((items) => items.filter((item) => item.id !== record.id));
                                  Message.success('记录已删除');
                                }}
                              >
                                <Tooltip content="删除记录">
                                  <Button
                                    aria-label={`删除${record.employeeName}入住`}
                                    className="hubx-icon-action"
                                    type="text"
                                    status="danger"
                                    icon={<IconDelete />}
                                  />
                                </Tooltip>
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                      data={filteredCheckIns}
                      rowKey="id"
                      pagination={{ pageSize: 8 }}
                      emptyDescription="暂无入住登记记录"
                    />
                  </SectionCard>
                
              </>
            ),
          },
          {
            key: 'expenses',
            label: "费用管理",
            content: (
              <>
                  <SectionCard
                    title="宿舍账单与公用事业分摊"
                    extra={
                      <Button type="primary" icon={<IconPlus />} onClick={() => openExpenseForm()}>
                        登记费用账单
                      </Button>
                    }
                  >
                    {/* 费用胶囊数据看板 */}
                    <div className="dorm-cost-ribbon">
                      <div className="dorm-cost-ribbon-item">
                        <span>当期总费用：</span>
                        <span className="dorm-cost-ribbon-val">
                          <MoneyText value={expenseSummary.total} tone="danger" />
                        </span>
                      </div>
                      <div className="dorm-cost-ribbon-item">
                        <span>房屋租金总计：</span>
                        <span className="dorm-cost-ribbon-val">
                          <MoneyText value={expenseSummary.rentTotal} />
                        </span>
                      </div>
                      <div className="dorm-cost-ribbon-item">
                        <span>水电气网公摊：</span>
                        <span className="dorm-cost-ribbon-val">
                          <MoneyText value={expenseSummary.utilityTotal} />
                        </span>
                      </div>
                      <div className="dorm-cost-ribbon-item">
                        <span>当前在住人均分摊测算：</span>
                        <span className="dorm-cost-ribbon-val">
                          ≈ <MoneyText value={expenseSummary.avgPerPerson} /> / 人
                        </span>
                      </div>
                    </div>
        
                    <DataTable
                      toolbar={
                        <>
                          <Select
                            placeholder="选择楼栋"
                            value={expenseBuildingFilter}
                            onChange={setExpenseBuildingFilter}
                            style={{ width: 180 }}
                          >
                            <Option value="all">全部楼栋</Option>
                            {buildings.map((b) => (
                              <Option key={b.id} value={b.id}>
                                {b.name}
                              </Option>
                            ))}
                          </Select>
                          <Select
                            placeholder="费用类型"
                            value={expenseTypeFilter}
                            onChange={setExpenseTypeFilter}
                            style={{ width: 140 }}
                          >
                            <Option value="all">全部类型</Option>
                            <Option value="rent">租金</Option>
                            <Option value="water">水费</Option>
                            <Option value="electricity">电费</Option>
                            <Option value="gas">燃气费</Option>
                            <Option value="internet">网络宽带</Option>
                            <Option value="maintenance">维修保洁</Option>
                            <Option value="other">其他</Option>
                          </Select>
                        </>
                      }
                      caption={<>共 {filteredExpenses.length} 笔支出明细</>}
                      columns={[
                        {
                          title: '所属楼栋',
                          dataIndex: 'buildingName',
                          width: 180,
                          render: (v: string, record: DormitoryExpense) => (
                            <div>
                              <div style={{ fontWeight: 500 }}>{v}</div>
                              {record.roomNumber && (
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                                  关联房间：{record.roomNumber}
                                </div>
                              )}
                            </div>
                          ),
                        },
                        {
                          title: '费用类型',
                          dataIndex: 'type',
                          width: 120,
                          render: (v: string) => <StatusTag meta={resolveStatus(EXPENSE_TYPE, v)} />,
                        },
                        {
                          title: '金额',
                          dataIndex: 'amount',
                          width: 130,
                          render: (v: number) => (
                            <span style={{ fontWeight: 700 }}>
                              <MoneyText value={v} tone="danger" />
                            </span>
                          ),
                        },
                        { title: '费用所属期间', dataIndex: 'period', width: 140 },
                        {
                          title: '分摊方案',
                          dataIndex: 'splitMethod',
                          width: 120,
                          render: (v: string) => (
                            <StatusTag>{v === 'by_room' ? '按房间均摊' : '按实际入住人头'}</StatusTag>
                          ),
                        },
                        {
                          title: '备注说明',
                          dataIndex: 'remark',
                          render: (v?: string) => v || '-',
                        },
                        {
                          title: '操作',
                          width: 100,
                          fixed: 'right',
                          render: (_: unknown, record: DormitoryExpense) => (
                            <Space size={4}>
                              <Tooltip content="编辑费用账单">
                                <Button
                                  aria-label={`编辑${record.period}费用`}
                                  className="hubx-icon-action"
                                  type="text"
                                  icon={<IconEdit />}
                                  onClick={() => openExpenseForm(record)}
                                />
                              </Tooltip>
                              <Popconfirm
                                title="确认删除该笔费用记录？"
                                onOk={() => {
                                  setExpenses((items) => items.filter((item) => item.id !== record.id));
                                  Message.success('费用记录已删除');
                                }}
                              >
                                <Tooltip content="删除费用">
                                  <Button
                                    aria-label={`删除${record.period}费用`}
                                    className="hubx-icon-action"
                                    type="text"
                                    status="danger"
                                    icon={<IconDelete />}
                                  />
                                </Tooltip>
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                      data={filteredExpenses}
                      rowKey="id"
                      pagination={{ pageSize: 8 }}
                      emptyDescription="暂无宿舍费用记录"
                    />
                  </SectionCard>
                
              </>
            ),
          },
          {
            key: 'maintenance',
            label: "维护管理",
            content: (
              <>
                  <SectionCard
                    title="宿舍维保与报修工单"
                    extra={
                      <Button type="primary" icon={<IconPlus />} onClick={() => openMaintenanceForm()}>
                        登记报修工单
                      </Button>
                    }
                  >
                    <DataTable
                      toolbar={
                        <>
                          <Select
                            placeholder="所属楼栋"
                            value={maintenanceBuildingFilter}
                            onChange={setMaintenanceBuildingFilter}
                            style={{ width: 180 }}
                          >
                            <Option value="all">全部楼栋</Option>
                            {buildings.map((b) => (
                              <Option key={b.id} value={b.id}>
                                {b.name}
                              </Option>
                            ))}
                          </Select>
                          <Select
                            placeholder="工单状态"
                            value={maintenanceStatusFilter}
                            onChange={setMaintenanceStatusFilter}
                            style={{ width: 130 }}
                          >
                            <Option value="all">全部状态</Option>
                            <Option value="pending">待处理</Option>
                            <Option value="in_progress">处理中</Option>
                            <Option value="completed">已完成</Option>
                          </Select>
                          <Select
                            placeholder="紧急程度"
                            value={maintenanceUrgencyFilter}
                            onChange={setMaintenanceUrgencyFilter}
                            style={{ width: 130 }}
                          >
                            <Option value="all">全部等级</Option>
                            <Option value="normal">普通</Option>
                            <Option value="urgent">紧急</Option>
                            <Option value="very_urgent">非常紧急</Option>
                          </Select>
                        </>
                      }
                      caption={<>待处理 <strong style={{ color: 'rgb(var(--warning-6))' }}>{pendingMaintenancesCount}</strong> 单</>}
                      columns={[
                        {
                          title: '楼栋与房间',
                          dataIndex: 'buildingName',
                          width: 200,
                          render: (_: unknown, record: DormitoryMaintenance) => (
                            <div>
                              <div style={{ fontWeight: 500 }}>{record.buildingName}</div>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                                {record.roomNumber ? `${record.roomNumber} 室` : '公共区域'}
                              </div>
                            </div>
                          ),
                        },
                        {
                          title: '工单类型',
                          dataIndex: 'type',
                          width: 100,
                          render: (v: string) => <StatusTag meta={resolveStatus(MAINTENANCE_TYPE, v)} />,
                        },
                        {
                          title: '问题与事项说明',
                          dataIndex: 'description',
                          render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
                        },
                        {
                          title: '紧急程度',
                          dataIndex: 'urgency',
                          width: 110,
                          render: (v: DormitoryMaintenance['urgency']) => <StatusTag meta={MAINTENANCE_URGENCY[v]} />,
                        },
                        {
                          title: '处理进度',
                          dataIndex: 'status',
                          width: 110,
                          render: (v: DormitoryMaintenance['status']) => <StatusTag meta={MAINTENANCE_STATUS[v]} />,
                        },
                        {
                          title: '跟进负责人',
                          dataIndex: 'assignee',
                          width: 120,
                          render: (v?: string) => v || '物业服务处',
                        },
                        {
                          title: '操作',
                          width: 170,
                          fixed: 'right',
                          render: (_: unknown, record: DormitoryMaintenance) => (
                            <Space size={6}>
                              {record.status === 'pending' && (
                                <Button
                                  size="mini"
                                  type="outline"
                                  status="success"
                                  icon={<IconClockCircle />}
                                  onClick={() => advanceMaintenanceStatus(record)}
                                >
                                  接单
                                </Button>
                              )}
                              {record.status === 'in_progress' && (
                                <Button
                                  size="mini"
                                  type="outline"
                                  status="success"
                                  icon={<IconCheck />}
                                  onClick={() => advanceMaintenanceStatus(record)}
                                >
                                  办结
                                </Button>
                              )}
                              <Tooltip content="编辑工单">
                                <Button
                                  aria-label={`编辑${record.roomNumber || record.buildingName}工单`}
                                  className="hubx-icon-action"
                                  type="text"
                                  icon={<IconEdit />}
                                  onClick={() => openMaintenanceForm(record)}
                                />
                              </Tooltip>
                              <Popconfirm
                                title="确认删除该维保记录？"
                                onOk={() => {
                                  setMaintenances((items) => items.filter((item) => item.id !== record.id));
                                  Message.success('维保记录已删除');
                                }}
                              >
                                <Tooltip content="删除工单">
                                  <Button
                                    aria-label={`删除${record.roomNumber || record.buildingName}工单`}
                                    className="hubx-icon-action"
                                    type="text"
                                    status="danger"
                                    icon={<IconDelete />}
                                  />
                                </Tooltip>
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                      data={filteredMaintenances}
                      rowKey="id"
                      pagination={{ pageSize: 8 }}
                      emptyDescription="暂无报修与维护记录"
                    />
                  </SectionCard>
                
              </>
            ),
          },
        ]}
      />

      {/* ===================== 子功能一：新建/编辑楼栋档案弹窗 ===================== */}
      <Modal
        title={editingBuildingId ? '编辑楼栋档案' : '新增宿舍楼栋档案'}
        visible={formVisible}
        onOk={handleSaveBuilding}
        onCancel={() => setFormVisible(false)}
        okText="保存楼栋"
        cancelText="取消"
        style={{ width: 720 }}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          {/* 分段 1：基础信息与城市快选 */}
          <FormSection
            className="dorm-form-section"
            leading={<span className="dorm-form-section__badge">1</span>}
            title="楼栋基础档案与地址定位"
          >
            <FormGrid template="2-1-1">
              <div>
                <div style={{ marginBottom: 6 }}><Text>楼栋名称 *</Text></div>
                <Input
                  placeholder="如：北京中关村人才公寓"
                  value={buildingForm.name}
                  onChange={(value) => setBuildingForm({ ...buildingForm, name: value })}
                />
              </div>
              <div>
                <div style={{ marginBottom: 6 }}><Text>所在城市 *</Text></div>
                <Input
                  placeholder="如：北京"
                  value={buildingForm.city}
                  onChange={(value) => setBuildingForm({ ...buildingForm, city: value })}
                />
              </div>
              <div>
                <div style={{ marginBottom: 6 }}><Text>行政区</Text></div>
                <Input
                  placeholder="如：海淀区"
                  value={buildingForm.district}
                  onChange={(value) => setBuildingForm({ ...buildingForm, district: value })}
                />
              </div>
            </FormGrid>

            {/* 常用城市快选药丸标签 */}
            <div className="dorm-quick-tags">
              <span style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--color-text-3)' }}>常用城市：</span>
              {quickCities.map((city) => (
                <StatusTag
                  key={city}
                  size="small"
                  className="dorm-quick-tag-item"
                  onClick={() => setBuildingForm({ ...buildingForm, city })}
                >
                  {city}
                </StatusTag>
              ))}
            </div>

            <FormGrid template="5-7" className="dorm-form-grid--spaced">
              <div>
                <div style={{ marginBottom: 6 }}><Text>社区 / 园区名称</Text></div>
                <Input
                  placeholder="如：中关村南大街1号院"
                  value={buildingForm.community}
                  onChange={(value) => setBuildingForm({ ...buildingForm, community: value })}
                />
              </div>
              <div>
                <div style={{ marginBottom: 6 }}><Text>详细门牌地址</Text></div>
                <Input
                  placeholder="如：北京市海淀区中关村南大街1号3号楼5单元"
                  value={buildingForm.address}
                  onChange={(value) => setBuildingForm({ ...buildingForm, address: value })}
                />
              </div>
            </FormGrid>
          </FormSection>

          {/* 分段 2：租赁合同与租金 */}
          <FormSection
            className="dorm-form-section"
            leading={<span className="dorm-form-section__badge">2</span>}
            title="房东对接与租赁合同"
          >
            <FormGrid columns={2}>
              <div>
                <div style={{ marginBottom: 6 }}><Text>房东姓名/物业联系人</Text></div>
                <Input
                  placeholder="房东姓名"
                  value={buildingForm.landlordName}
                  onChange={(value) => setBuildingForm({ ...buildingForm, landlordName: value })}
                />
              </div>
              <div>
                <div style={{ marginBottom: 6 }}><Text>房东联系手机号</Text></div>
                <Input
                  placeholder="11位手机号码"
                  value={buildingForm.landlordPhone}
                  onChange={(value) => setBuildingForm({ ...buildingForm, landlordPhone: value })}
                />
              </div>
            </FormGrid>
            <FormGrid columns={2} className="dorm-form-grid--spaced">
              <div>
                <div style={{ marginBottom: 6 }}><Text>租期开始日期</Text></div>
                <Input
                  placeholder="YYYY-MM-DD"
                  value={buildingForm.leaseStartDate}
                  onChange={(value) => setBuildingForm({ ...buildingForm, leaseStartDate: value })}
                />
              </div>
              <div>
                <div style={{ marginBottom: 6 }}><Text>租期截止日期</Text></div>
                <Input
                  placeholder="YYYY-MM-DD"
                  value={buildingForm.leaseEndDate}
                  onChange={(value) => setBuildingForm({ ...buildingForm, leaseEndDate: value })}
                />
              </div>
            </FormGrid>
            <FormGrid columns={3} className="dorm-form-grid--spaced">
              <div>
                <div style={{ marginBottom: 6 }}><Text>每月总租金 (元) *</Text></div>
                <InputNumber
                  min={0}
                  step={500}
                  style={{ width: '100%' }}
                  value={buildingForm.monthlyRent}
                  onChange={(value) => setBuildingForm({ ...buildingForm, monthlyRent: value || 0 })}
                />
              </div>
              <div>
                <div style={{ marginBottom: 6 }}><Text>房屋押金 (元)</Text></div>
                <InputNumber
                  min={0}
                  step={1000}
                  style={{ width: '100%' }}
                  value={buildingForm.deposit}
                  onChange={(value) => setBuildingForm({ ...buildingForm, deposit: value || 0 })}
                />
              </div>
              <div>
                <div style={{ marginBottom: 6 }}><Text>付款周期</Text></div>
                <Select
                  value={buildingForm.paymentMethod}
                  onChange={(value) => setBuildingForm({ ...buildingForm, paymentMethod: value })}
                  style={{ width: '100%' }}
                >
                  <Option value="monthly">按月支付 (押一付一)</Option>
                  <Option value="quarterly">按季支付 (押一付三)</Option>
                  <Option value="semi_annual">半年付</Option>
                  <Option value="annual">年付</Option>
                </Select>
              </div>
            </FormGrid>
          </FormSection>

          {/* 分段 3：公用事业与代扣设置 */}
          <FormSection
            className="dorm-form-section"
            leading={<span className="dorm-form-section__badge">3</span>}
            title="水电气网托收账号与代扣设置"
          >
            <FormGrid columns={3}>
              <div>
                <div style={{ marginBottom: 6 }}><Text>水费代扣户号</Text></div>
                <Input
                  placeholder="水务托收户号"
                  value={buildingForm.waterAccountNo}
                  onChange={(value) => setBuildingForm({ ...buildingForm, waterAccountNo: value })}
                />
              </div>
              <div>
                <div style={{ marginBottom: 6 }}><Text>电费托收户号</Text></div>
                <Input
                  placeholder="国家电网户号"
                  value={buildingForm.electricityAccountNo}
                  onChange={(value) => setBuildingForm({ ...buildingForm, electricityAccountNo: value })}
                />
              </div>
              <div>
                <div style={{ marginBottom: 6 }}><Text>宽带运营商及月费</Text></div>
                <Input
                  placeholder="如：中国电信千兆 (¥200/月)"
                  value={buildingForm.internetProvider}
                  onChange={(value) => setBuildingForm({ ...buildingForm, internetProvider: value })}
                />
              </div>
            </FormGrid>
          </FormSection>

          {/* 分段 4：新建楼栋专属：智能批量房源初始化 */}
          {!editingBuildingId && (
            <FormSection
              className="dorm-form-section dorm-form-section--initialization"
              leading={<span className="dorm-form-section__badge">4</span>}
              title="智能批量房源初始化 (新建自动生成)"
              extra={(
                <Checkbox
                  checked={buildingForm.autoInitRooms}
                  onChange={(checked) => setBuildingForm({ ...buildingForm, autoInitRooms: checked })}
                >
                  启用自动生成房间与床位
                </Checkbox>
              )}
            >
              {buildingForm.autoInitRooms && (
                <FormGrid columns={3}>
                  <div>
                    <div style={{ marginBottom: 6 }}><Text>总楼层数</Text></div>
                    <InputNumber
                      min={1}
                      max={10}
                      value={buildingForm.initFloorsCount}
                      onChange={(val) => setBuildingForm({ ...buildingForm, initFloorsCount: val || 1 })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ marginBottom: 6 }}><Text>每层房间数</Text></div>
                    <InputNumber
                      min={1}
                      max={8}
                      value={buildingForm.initRoomsPerFloor}
                      onChange={(val) => setBuildingForm({ ...buildingForm, initRoomsPerFloor: val || 1 })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ marginBottom: 6 }}><Text>默认房型</Text></div>
                    <Select
                      value={buildingForm.initRoomType}
                      onChange={(val) => setBuildingForm({ ...buildingForm, initRoomType: val })}
                      style={{ width: '100%' }}
                    >
                      <Option value="single">单人间 (1床位)</Option>
                      <Option value="double">双人间 (2床位)</Option>
                      <Option value="quad">四人间 (4床位)</Option>
                    </Select>
                  </div>
                </FormGrid>
              )}
            </FormSection>
          )}
        </Space>
      </Modal>

      {/* ===================== 子功能二：入住登记弹窗（含出差单联动与图形化选床） ===================== */}
      <Modal
        title={editingCheckInId ? '修改入住登记信息' : '办理员工宿舍入住'}
        visible={checkInVisible}
        onOk={handleSaveCheckIn}
        onCancel={() => setCheckInVisible(false)}
        okText="确认入住登记"
        cancelText="取消"
        style={{ width: 680 }}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          {/* 入住性质切换 */}
          <div style={{ padding: '10px 14px', background: 'var(--color-fill-1)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 'var(--ds-text-dense)' }}>入住性质类型：</span>
            <Radio.Group
              type="button"
              value={checkInForm.checkInType}
              onChange={(value) => setCheckInForm({ ...checkInForm, checkInType: value as 'long_term' | 'trip' })}
            >
              <Radio value="long_term">长期员工宿舍</Radio>
              <Radio value="trip">出差临时借宿</Radio>
            </Radio.Group>
          </div>

          {/* 出差单联动快捷选择器 */}
          {checkInForm.checkInType === 'trip' && (
            <div style={{ padding: '12px 14px', background: 'rgba(var(--purple-1), 0.6)', border: '1px solid rgba(var(--purple-3), 0.7)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-xs)', color: 'rgb(var(--purple-7))', marginBottom: 6 }}>
                快捷关联已审批出差申请单 (自动回填员工与出差周期)：
              </div>
              <Select
                placeholder="从待安排出差申请中选择..."
                value={checkInForm.tripNo || undefined}
                onChange={handleSelectTrip}
                style={{ width: '100%' }}
              >
                {mockTrips.map((t) => (
                  <Option key={t.id} value={t.tripNo}>
                    {t.tripNo} · {t.applicantName} ({t.department}) · {t.destinations.join('、')}出差 · {t.startDate} ~ {t.endDate}
                  </Option>
                ))}
              </Select>
            </div>
          )}

          {/* 长期员工候选库快选 */}
          {checkInForm.checkInType === 'long_term' && (
            <div style={{ padding: '10px 14px', background: 'rgba(var(--primary-1), 0.5)', border: '1px solid rgba(var(--primary-3), 0.6)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-xs)', color: 'rgb(var(--primary-7))', marginBottom: 6 }}>
                候选员工库快选 (自动填充工号与部门)：
              </div>
              <Select
                placeholder="从企业员工库快选..."
                value={checkInForm.employeeId || undefined}
                onChange={handleSelectCandidate}
                style={{ width: '100%' }}
              >
                {candidateEmployees.map((emp) => (
                  <Option key={emp.id} value={emp.id}>
                    {emp.name} · {emp.department} ({emp.id})
                  </Option>
                ))}
              </Select>
            </div>
          )}

          {/* 员工信息表单 */}
          <FormGrid columns={3}>
            <div>
              <div style={{ marginBottom: 6 }}><Text>员工姓名 *</Text></div>
              <Input
                placeholder="员工姓名"
                value={checkInForm.employeeName}
                onChange={(value) => setCheckInForm({ ...checkInForm, employeeName: value })}
              />
            </div>
            <div>
              <div style={{ marginBottom: 6 }}><Text>员工工号</Text></div>
              <Input
                placeholder="如：emp-001"
                value={checkInForm.employeeId}
                onChange={(value) => setCheckInForm({ ...checkInForm, employeeId: value })}
              />
            </div>
            <div>
              <div style={{ marginBottom: 6 }}><Text>所属部门</Text></div>
              <Input
                placeholder="如：技术研发部"
                value={checkInForm.department}
                onChange={(value) => setCheckInForm({ ...checkInForm, department: value })}
              />
            </div>
          </FormGrid>

          <FormGrid columns={2}>
            <div>
              <div style={{ marginBottom: 6 }}><Text>入住生效日期 *</Text></div>
              <Input
                placeholder="YYYY-MM-DD"
                value={checkInForm.checkInDate}
                onChange={(value) => setCheckInForm({ ...checkInForm, checkInDate: value })}
              />
            </div>
            <div>
              <div style={{ marginBottom: 6 }}><Text>预计退宿日期</Text></div>
              <Input
                placeholder="YYYY-MM-DD"
                value={checkInForm.expectedCheckOutDate}
                onChange={(value) => setCheckInForm({ ...checkInForm, expectedCheckOutDate: value })}
              />
            </div>
          </FormGrid>

          {/* 楼栋与图形化床位选择器 */}
          <div style={{ padding: '12px 14px', background: 'var(--color-fill-1)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--ds-text-dense)' }}>选择分配楼栋与具体床位</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>可直接点击下方绿色空床快速选中</span>
            </div>

            <div style={{ marginBottom: 10 }}>
              <Select
                placeholder="选择分配宿舍楼栋"
                value={checkInForm.buildingId || undefined}
                onChange={(value) => {
                  const b = buildings.find((x) => x.id === value);
                  const firstFloor = b?.floors?.[0];
                  const firstRoom = firstFloor?.rooms?.[0];
                  const availableBed = firstRoom?.beds?.find((bd) => bd.status === 'available') || firstRoom?.beds?.[0];
                  setCheckInForm({
                    ...checkInForm,
                    buildingId: value,
                    floorId: firstFloor?.id || '',
                    roomId: firstRoom?.id || '',
                    bedId: availableBed?.id || '',
                  });
                }}
                style={{ width: '100%' }}
              >
                {buildings.map((b) => (
                  <Option key={b.id} value={b.id}>
                    {b.name} ({b.city} · {b.district})
                  </Option>
                ))}
              </Select>
            </div>

            {/* 图形化床位选择微矩阵 */}
            <div className="dorm-bed-picker-box">
              {buildings
                .find((b) => b.id === checkInForm.buildingId)
                ?.floors?.map((floor) => (
                  <div key={floor.id} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 4 }}>
                      {floor.floorNumber}F 楼层
                    </div>
                    {floor.rooms?.map((room) => (
                      <div key={room.id} className="dorm-bed-picker-room">
                        <div className="dorm-bed-picker-room__title">
                          <span>{room.roomNumber} 室 ({room.roomType === 'single' ? '单人间' : room.roomType === 'double' ? '双人间' : '四人间'})</span>
                          <span style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--color-text-3)' }}>设施：{room.facilities.join('、')}</span>
                        </div>
                        <div className="dorm-bed-picker-grid">
                          {room.beds?.map((bed) => {
                            const isSelected = checkInForm.bedId === bed.id;
                            const isOccupied = bed.status === 'occupied';

                            return (
                              <div
                                key={bed.id}
                                className={`dorm-bed-picker-chip ${
                                  isOccupied
                                    ? 'dorm-bed-picker-chip--occupied'
                                    : isSelected
                                    ? 'dorm-bed-picker-chip--selected'
                                    : 'dorm-bed-picker-chip--available'
                                }`}
                                onClick={() => {
                                  if (!isOccupied) {
                                    setCheckInForm({
                                      ...checkInForm,
                                      floorId: floor.id,
                                      roomId: room.id,
                                      bedId: bed.id,
                                    });
                                  }
                                }}
                              >
                                <span>{bed.bedNumber}号床</span>
                                <span>
                                  {isOccupied ? (
                                    <span style={{ fontSize: 'var(--ds-text-caption)' }}>已占({bed.occupantName})</span>
                                  ) : isSelected ? (
                                    <StatusTag size="small" tone="info">已选定</StatusTag>
                                  ) : (
                                    <StatusTag size="small" tone="success">空闲</StatusTag>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>

            {/* 门禁与配套登记 */}
            <FormGrid columns={2} className="dorm-form-grid--spaced">
              <div>
                <div style={{ marginBottom: 6 }}><Text>门禁卡/钥匙编号</Text></div>
                <Input
                  placeholder="如：CARD-101-B1"
                  value={checkInForm.accessCardNo}
                  onChange={(val) => setCheckInForm({ ...checkInForm, accessCardNo: val })}
                />
              </div>
              <div>
                <div style={{ marginBottom: 6 }}><Text>钥匙押金 (元)</Text></div>
                <InputNumber
                  min={0}
                  value={checkInForm.depositAmount}
                  onChange={(val) => setCheckInForm({ ...checkInForm, depositAmount: val || 0 })}
                  style={{ width: '100%' }}
                />
              </div>
            </FormGrid>
          </div>
        </Space>
      </Modal>

      {/* ===================== 子功能三：办理退宿交接结算弹窗 ===================== */}
      <Modal
        title="办理退宿手续与交接结算"
        visible={checkoutVisible}
        onOk={confirmCheckOut}
        onCancel={() => setCheckoutVisible(false)}
        okText="确认退房并释放床位"
        okButtonProps={{ status: 'danger' }}
        cancelText="取消"
        style={{ width: 540 }}
      >
        {checkingOutRecord && (
          <div>
            {/* 退宿摘要卡 */}
            <div className="dorm-checkout-card">
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-1)' }}>
                退宿员工：{checkingOutRecord.employeeName} ({checkingOutRecord.employeeId})
              </div>
              <div className="dorm-checkout-summary-grid">
                <div>楼栋：<strong>{checkingOutRecord.buildingName}</strong></div>
                <div>房间：<strong>{checkingOutRecord.roomNumber}室</strong></div>
                <div>床位：<strong>{checkingOutRecord.bedNumber}号床</strong></div>
                <div>入住日期：<strong><DateText value={checkingOutRecord.checkInDate} /></strong></div>
                <div>入住性质：<strong>{checkingOutRecord.checkInType === 'long_term' ? '长期员工' : '出差借宿'}</strong></div>
                <div>退宿日期：<strong><DateText value={new Date().toISOString().slice(0, 10)} /></strong></div>
              </div>
            </div>

            {/* 退宿验收 Checklist */}
            <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 'var(--ds-text-dense)' }}>退宿交接验收清单：</div>
            <Space direction="vertical" size={10} style={{ width: '100%', marginBottom: 16 }}>
              <Checkbox
                checked={checkoutChecklist.keysReturned}
                onChange={(checked) => setCheckoutChecklist({ ...checkoutChecklist, keysReturned: checked })}
              >
                房间钥匙、门禁卡已收回归还
              </Checkbox>
              <Checkbox
                checked={checkoutChecklist.facilitiesIntact}
                onChange={(checked) => setCheckoutChecklist({ ...checkoutChecklist, facilitiesIntact: checked })}
              >
                宿舍房间设施完好无损（空调、热水器、床具等均完好）
              </Checkbox>
              <Checkbox
                checked={checkoutChecklist.belongingsCleared}
                onChange={(checked) => setCheckoutChecklist({ ...checkoutChecklist, belongingsCleared: checked })}
              >
                个人行李物品已全部清空搬离，无遗留物品
              </Checkbox>
              <Checkbox
                checked={checkoutChecklist.utilitiesSettled}
                onChange={(checked) => setCheckoutChecklist({ ...checkoutChecklist, utilitiesSettled: checked })}
              >
                水电表底数已抄录结清，押金无扣减款项
              </Checkbox>
            </Space>

            <Divider style={{ margin: '12px 0' }} />

            {/* 智能闭环联动选项 */}
            <div style={{ padding: '10px 14px', background: 'rgba(var(--primary-1), 0.5)', borderRadius: 'var(--radius-sm)' }}>
              <Checkbox
                checked={checkoutChecklist.autoGenerateCleaning}
                onChange={(checked) => setCheckoutChecklist({ ...checkoutChecklist, autoGenerateCleaning: checked })}
              >
                <strong>自动生成该房间专业退宿保洁与床品消毒工单</strong> (推荐开启，自动派工)
              </Checkbox>
            </div>
          </div>
        )}
      </Modal>

      {/* ===================== 子功能四：费用登记与实时分摊测算弹窗 ===================== */}
      <Modal
        title={editingExpenseId ? '编辑宿舍费用账单' : '登记宿舍费用账单与核算分摊'}
        visible={expenseVisible}
        onOk={handleSaveExpense}
        onCancel={() => setExpenseVisible(false)}
        okText="保存费用"
        cancelText="取消"
        style={{ width: 560 }}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <div>
            <div style={{ marginBottom: 6 }}><Text>归属楼栋 *</Text></div>
            <Select
              value={expenseForm.buildingId || undefined}
              onChange={(value) => setExpenseForm({ ...expenseForm, buildingId: value })}
              style={{ width: '100%' }}
            >
              {buildings.map((b) => (
                <Option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </Option>
              ))}
            </Select>
          </div>

          <FormGrid columns={2}>
            <div>
              <div style={{ marginBottom: 6 }}><Text>费用类型 *</Text></div>
              <Select
                value={expenseForm.type}
                onChange={(value) => setExpenseForm({ ...expenseForm, type: value })}
                style={{ width: '100%' }}
              >
                <Option value="rent">房屋租金</Option>
                <Option value="water">水费</Option>
                <Option value="electricity">电费</Option>
                <Option value="gas">燃气费</Option>
                <Option value="internet">宽带费</Option>
                <Option value="maintenance">维修保洁费</Option>
                <Option value="other">其他杂费</Option>
              </Select>
            </div>
            <div>
              <div style={{ marginBottom: 6 }}><Text>费用金额 (元) *</Text></div>
              <InputNumber
                min={0}
                step={50}
                style={{ width: '100%' }}
                value={expenseForm.amount}
                onChange={(value) => setExpenseForm({ ...expenseForm, amount: value || 0 })}
              />
            </div>
          </FormGrid>

          <FormGrid columns={2}>
            <div>
              <div style={{ marginBottom: 6 }}><Text>费用归属期间 *</Text></div>
              <Input
                placeholder="如：2026年8月"
                value={expenseForm.period}
                onChange={(value) => setExpenseForm({ ...expenseForm, period: value })}
              />
            </div>
            <div>
              <div style={{ marginBottom: 6 }}><Text>公摊分账方案</Text></div>
              <Select
                value={expenseForm.splitMethod}
                onChange={(value) => setExpenseForm({ ...expenseForm, splitMethod: value })}
                style={{ width: '100%' }}
              >
                <Option value="by_person">按在住实际人头分摊</Option>
                <Option value="by_room">按房间固定均摊</Option>
              </Select>
            </div>
          </FormGrid>

          {/* 实时分摊测算动态看板 */}
          <div className="dorm-split-calculator">
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--ds-text-dense)', color: 'var(--color-text-1)' }}>
                实时测算分摊结果：
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)', marginTop: 2 }}>
                {expenseSplitEstimate.desc}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="dorm-split-calculator__num"><MoneyText value={Number(expenseSplitEstimate.perUnit)} fractionDigits={2} /></span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', marginLeft: 4 }}>
                / {expenseSplitEstimate.label}
              </span>
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 6 }}><Text>备注说明 / 发票凭据号</Text></div>
            <Input.TextArea
              placeholder="填写费用核算凭证或备注说明..."
              value={expenseForm.remark}
              onChange={(value) => setExpenseForm({ ...expenseForm, remark: value })}
            />
          </div>
        </Space>
      </Modal>

      {/* ===================== 子功能五：报修与维保工单登记弹窗 ===================== */}
      <Modal
        title={editingMaintenanceId ? '编辑维保工单' : '登记宿舍报修/维护工单'}
        visible={maintenanceVisible}
        onOk={handleSaveMaintenance}
        onCancel={() => setMaintenanceVisible(false)}
        okText="提交工单"
        cancelText="取消"
        style={{ width: 560 }}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <FormGrid columns={2}>
            <div>
              <div style={{ marginBottom: 6 }}><Text>报修楼栋 *</Text></div>
              <Select
                value={maintenanceForm.buildingId || undefined}
                onChange={(value) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    buildingId: value,
                    roomNumber: '',
                  })
                }
                style={{ width: '100%' }}
              >
                {buildings.map((b) => (
                  <Option key={b.id} value={b.id}>
                    {b.name}
                  </Option>
                ))}
              </Select>
            </div>
            <div>
              <div style={{ marginBottom: 6 }}><Text>房间号</Text></div>
              <Select
                placeholder="选择房间或公共区"
                allowClear
                value={maintenanceForm.roomNumber || undefined}
                onChange={(value) => setMaintenanceForm({ ...maintenanceForm, roomNumber: value || '' })}
                style={{ width: '100%' }}
              >
                {buildings
                  .find((b) => b.id === maintenanceForm.buildingId)
                  ?.floors?.flatMap((f) => f.rooms || [])
                  .map((room) => (
                    <Option key={room.id} value={room.roomNumber}>
                      {room.roomNumber} 室
                    </Option>
                  ))}
              </Select>
            </div>
          </FormGrid>

          <FormGrid columns={3}>
            <div>
              <div style={{ marginBottom: 6 }}><Text>工单类型</Text></div>
              <Select
                value={maintenanceForm.type}
                onChange={(value) => setMaintenanceForm({ ...maintenanceForm, type: value })}
                style={{ width: '100%' }}
              >
                <Option value="repair">设施报修</Option>
                <Option value="cleaning">专业保洁</Option>
                <Option value="inspection">巡检维护</Option>
              </Select>
            </div>
            <div>
              <div style={{ marginBottom: 6 }}><Text>紧急程度</Text></div>
              <Select
                value={maintenanceForm.urgency}
                onChange={(value) => setMaintenanceForm({ ...maintenanceForm, urgency: value })}
                style={{ width: '100%' }}
              >
                <Option value="normal">普通 (48h内)</Option>
                <Option value="urgent">紧急 (24h内)</Option>
                <Option value="very_urgent">非常紧急 (当天)</Option>
              </Select>
            </div>
            <div>
              <div style={{ marginBottom: 6 }}><Text>派工负责组</Text></div>
              <Select
                value={maintenanceForm.assignee}
                onChange={(value) => setMaintenanceForm({ ...maintenanceForm, assignee: value })}
                style={{ width: '100%' }}
              >
                <Option value="物业维修组">物业维修组</Option>
                <Option value="驻场保洁组">驻场保洁组</Option>
                <Option value="外部厂家售后">外部厂家售后</Option>
                <Option value="房东联系人">房东联系人</Option>
              </Select>
            </div>
          </FormGrid>

          <div>
            <div style={{ marginBottom: 6 }}><Text>故障或维护内容描述 *</Text></div>
            <Input.TextArea
              rows={3}
              placeholder="详细说明需要处理的问题（如：空调滴水、门锁故障、热水器不通电等）"
              value={maintenanceForm.description}
              onChange={(value) => setMaintenanceForm({ ...maintenanceForm, description: value })}
            />
          </div>

          {/* 常见故障快捷胶囊标签 */}
          <div>
            <div style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--color-text-3)', marginBottom: 4 }}>常见报修故障点击快速输入：</div>
            <div className="dorm-fault-tags">
              {quickFaults.map((fault) => (
                <StatusTag
                  key={fault}
                  size="small"
                  className="dorm-fault-tag-item"
                  onClick={() => setMaintenanceForm({ ...maintenanceForm, description: fault })}
                >
                  {fault}
                </StatusTag>
              ))}
            </div>
          </div>
        </Space>
      </Modal>
      </AsyncState>
    </PageShell>
  );
}

