import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  Tag,
  Modal,
  Select,
  Tabs,
  Table,
  Space,
  Typography,
  Grid,
  Message,
  Spin,
  Tooltip,
  Popconfirm,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconHome,
  IconUser,
  IconEdit,
  IconDelete,
} from '@arco-design/web-react/icon';
import type { DormitoryBuilding, DormitoryCheckIn, DormitoryExpense, DormitoryMaintenance } from '../types';
import { getDormitoryList } from '../travel-api';
import { PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import '../travelAdminConsistency.css';

const { Text } = Typography;
const { Row, Col } = Grid;
const { Option } = Select;
const { TabPane } = Tabs;

const initialCheckIns: DormitoryCheckIn[] = [
  { id: 'checkin-1', employeeId: 'emp-001', employeeName: '张三', buildingId: 'dorm-1', buildingName: '中科人才公寓', floorId: 'dorm-1-f1', floorNumber: 1, roomId: 'dorm-1-f1-r1', roomNumber: '101', bedId: 'dorm-1-f1-r1-b1', bedNumber: '1', checkInDate: '2026-08-01', checkInType: 'long_term', status: 'active' },
];

const initialExpenses: DormitoryExpense[] = [
  { id: 'dorm-exp-1', buildingId: 'dorm-1', buildingName: '中科人才公寓', type: 'rent', amount: 12000, period: '2026年8月', splitMethod: 'by_person' },
  { id: 'dorm-exp-2', buildingId: 'dorm-1', buildingName: '中科人才公寓', type: 'electricity', amount: 860, period: '2026年7月', splitMethod: 'by_room' },
];

const initialMaintenances: DormitoryMaintenance[] = [
  { id: 'maintenance-1', buildingId: 'dorm-1', buildingName: '中科人才公寓', roomId: 'dorm-1-f1-r2', roomNumber: '102', type: 'repair', description: '空调制冷异常', urgency: 'urgent', status: 'in_progress', assignee: '物业维修组' },
];

export function DormitoryManagement() {
  const [loading, setLoading] = useState(false);
  const [buildings, setBuildings] = useState<DormitoryBuilding[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<DormitoryBuilding | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingBuildingId, setEditingBuildingId] = useState<string>();
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [checkIns, setCheckIns] = useState(initialCheckIns);
  const [editingCheckInId, setEditingCheckInId] = useState<string>();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [expenseVisible, setExpenseVisible] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string>();
  const [maintenances, setMaintenances] = useState(initialMaintenances);
  const [maintenanceVisible, setMaintenanceVisible] = useState(false);
  const [editingMaintenanceId, setEditingMaintenanceId] = useState<string>();

  // 新建楼栋表单
  const [buildingForm, setBuildingForm] = useState({
    name: '',
    city: '',
    district: '',
    street: '',
    community: '',
    address: '',
    landlordName: '',
    landlordPhone: '',
    leaseStartDate: '',
    leaseEndDate: '',
    monthlyRent: 0,
    deposit: 0,
  });

  // 入住表单
  const [checkInForm, setCheckInForm] = useState({
    employeeId: '',
    employeeName: '',
    buildingId: '',
    floorId: '',
    roomId: '',
    bedId: '',
    checkInDate: '',
    checkInType: 'long_term' as 'long_term' | 'trip',
    tripId: '',
  });

  const [expenseForm, setExpenseForm] = useState({
    buildingId: 'dorm-1', type: 'rent' as DormitoryExpense['type'], amount: 0, period: '', splitMethod: 'by_person' as DormitoryExpense['splitMethod'],
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    buildingId: 'dorm-1', roomNumber: '', type: 'repair' as DormitoryMaintenance['type'], description: '', urgency: 'normal' as DormitoryMaintenance['urgency'], status: 'pending' as DormitoryMaintenance['status'],
  });

  useEffect(() => {
    loadBuildings();
  }, []);

  const loadBuildings = async () => {
    setLoading(true);
    try {
      const result = await getDormitoryList();
      setBuildings(result.list);
      if (result.list.length > 0) {
        setSelectedBuilding(result.list[0]);
      }
    } catch (error) {
      Message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const openBuildingForm = (building?: DormitoryBuilding) => {
    setEditingBuildingId(building?.id);
    setBuildingForm(building ? {
      name: building.name, city: building.city, district: building.district, street: building.street,
      community: building.community, address: building.address, landlordName: building.landlordName,
      landlordPhone: building.landlordPhone, leaseStartDate: building.leaseStartDate,
      leaseEndDate: building.leaseEndDate, monthlyRent: building.monthlyRent, deposit: building.deposit,
    } : { name: '', city: '', district: '', street: '', community: '', address: '', landlordName: '', landlordPhone: '', leaseStartDate: '', leaseEndDate: '', monthlyRent: 0, deposit: 0 });
    setFormVisible(true);
  };

  // 保存楼栋
  const handleSaveBuilding = () => {
    if (!buildingForm.name || !buildingForm.city) {
      Message.error('请填写完整信息');
      return;
    }
    const previous = buildings.find((item) => item.id === editingBuildingId);
    const record: DormitoryBuilding = {
      id: editingBuildingId || `building-${Date.now()}`, companyId: previous?.companyId || 'company-1', companyName: previous?.companyName || '中科集团',
      paymentMethod: previous?.paymentMethod || 'monthly', status: previous?.status || 'active', floors: previous?.floors || [], ...buildingForm,
    };
    setBuildings((items) => editingBuildingId ? items.map((item) => item.id === editingBuildingId ? record : item) : [...items, record]);
    setSelectedBuilding(record);
    Message.success(editingBuildingId ? '楼栋已更新' : '楼栋已创建');
    setFormVisible(false);
  };

  const openNewCheckIn = () => {
    setEditingCheckInId(undefined);
    setCheckInForm({ employeeId: '', employeeName: '', buildingId: buildings[0]?.id || '', floorId: '', roomId: '', bedId: '', checkInDate: '2026-08-26', checkInType: 'long_term', tripId: '' });
    setCheckInVisible(true);
  };

  const openEditCheckIn = (record: DormitoryCheckIn) => {
    setEditingCheckInId(record.id);
    setCheckInForm({ employeeId: record.employeeId, employeeName: record.employeeName, buildingId: record.buildingId, floorId: record.floorId, roomId: record.roomId, bedId: record.bedId, checkInDate: record.checkInDate, checkInType: record.checkInType, tripId: record.tripId || '' });
    setCheckInVisible(true);
  };

  // 办理入住/修改记录
  const handleCheckIn = () => {
    if (!checkInForm.employeeName || !checkInForm.bedId) {
      Message.error('请填写完整信息');
      return;
    }
    const building = buildings.find((item) => item.id === checkInForm.buildingId);
    const floor = building?.floors?.find((item) => item.id === checkInForm.floorId);
    const room = floor?.rooms?.find((item) => item.id === checkInForm.roomId);
    const bed = room?.beds?.find((item) => item.id === checkInForm.bedId);
    const record: DormitoryCheckIn = {
      id: editingCheckInId || `checkin-${Date.now()}`,
      employeeId: checkInForm.employeeId || `emp-${Date.now()}`,
      employeeName: checkInForm.employeeName,
      buildingId: building?.id || '', buildingName: building?.name || '',
      floorId: floor?.id || '', floorNumber: floor?.floorNumber || 0,
      roomId: room?.id || '', roomNumber: room?.roomNumber || '',
      bedId: bed?.id || '', bedNumber: bed?.bedNumber || '',
      checkInDate: checkInForm.checkInDate,
      checkInType: checkInForm.checkInType,
      tripId: checkInForm.tripId || undefined,
      status: 'active',
    };
    setCheckIns((items) => editingCheckInId ? items.map((item) => item.id === editingCheckInId ? record : item) : [record, ...items]);
    Message.success(editingCheckInId ? '入住记录已更新' : '入住登记成功');
    setCheckInVisible(false);
  };

  const openExpenseForm = (record?: DormitoryExpense) => {
    setEditingExpenseId(record?.id);
    setExpenseForm(record ? { buildingId: record.buildingId, type: record.type, amount: record.amount, period: record.period, splitMethod: record.splitMethod } : { buildingId: buildings[0]?.id || '', type: 'rent', amount: 0, period: '2026年8月', splitMethod: 'by_person' });
    setExpenseVisible(true);
  };

  const handleSaveExpense = () => {
    const building = buildings.find((item) => item.id === expenseForm.buildingId);
    if (!building || !expenseForm.period || expenseForm.amount <= 0) return Message.error('请填写完整费用信息');
    const record: DormitoryExpense = { id: editingExpenseId || `dorm-exp-${Date.now()}`, buildingId: building.id, buildingName: building.name, ...expenseForm };
    setExpenses((items) => editingExpenseId ? items.map((item) => item.id === editingExpenseId ? record : item) : [record, ...items]);
    setExpenseVisible(false);
    Message.success(editingExpenseId ? '费用已更新' : '费用已新增');
  };

  const openMaintenanceForm = (record?: DormitoryMaintenance) => {
    setEditingMaintenanceId(record?.id);
    setMaintenanceForm(record ? { buildingId: record.buildingId, roomNumber: record.roomNumber || '', type: record.type, description: record.description, urgency: record.urgency, status: record.status } : { buildingId: buildings[0]?.id || '', roomNumber: '', type: 'repair', description: '', urgency: 'normal', status: 'pending' });
    setMaintenanceVisible(true);
  };

  const handleSaveMaintenance = () => {
    const building = buildings.find((item) => item.id === maintenanceForm.buildingId);
    if (!building || !maintenanceForm.description) return Message.error('请填写维护描述');
    const room = building.floors?.flatMap((item) => item.rooms || []).find((item) => item.roomNumber === maintenanceForm.roomNumber);
    const record: DormitoryMaintenance = { id: editingMaintenanceId || `maintenance-${Date.now()}`, buildingId: building.id, buildingName: building.name, roomId: room?.id, ...maintenanceForm };
    setMaintenances((items) => editingMaintenanceId ? items.map((item) => item.id === editingMaintenanceId ? record : item) : [record, ...items]);
    setMaintenanceVisible(false);
    Message.success(editingMaintenanceId ? '维护记录已更新' : '维护记录已新增');
  };

  // 获取房间状态颜色
  const getRoomStatusColor = (status: string) => {
    switch (status) {
      case 'available': return { background: 'rgb(var(--success-1))', border: 'rgb(var(--success-3))' };
      case 'occupied': return { background: 'rgb(var(--primary-1))', border: 'rgb(var(--primary-3))' };
      case 'maintenance': return { background: 'rgb(var(--warning-1))', border: 'rgb(var(--warning-3))' };
      default: return { background: 'var(--color-fill-1)', border: 'var(--color-border-2)' };
    }
  };

  // 获取床位状态颜色
  const getBedStatusColor = (status: string) => {
    switch (status) {
      case 'available': return { background: 'rgb(var(--success-1))', border: 'rgb(var(--success-3))' };
      case 'occupied': return { background: 'rgb(var(--primary-1))', border: 'rgb(var(--primary-3))' };
      default: return { background: 'var(--color-fill-1)', border: 'var(--color-border-2)' };
    }
  };

  const rooms = buildings.flatMap((building) => building.floors?.flatMap((floor) => floor.rooms ?? []) ?? []);
  const beds = rooms.flatMap((room) => room.beds ?? []);
  const occupiedBeds = beds.filter((bed) => bed.status === 'occupied').length;
  const openMaintenances = maintenances.filter((item) => item.status !== 'completed').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spin />
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="宿舍管理"
        description="统一维护楼栋、房间、床位、入住、费用和维护记录。"
        actions={(
          <>
            <Button icon={<IconPlus />} onClick={() => openBuildingForm()}>新增楼栋</Button>
            <Button type="primary" icon={<IconUser />} onClick={openNewCheckIn}>入住登记</Button>
          </>
        )}
      />

      <ProcessMetricGrid items={[
        { key: 'buildings', label: '在管楼栋', value: `${buildings.length} 栋`, detail: `${rooms.length} 个房间` },
        { key: 'beds', label: '床位总数', value: `${beds.length} 个`, detail: `空闲 ${Math.max(0, beds.length - occupiedBeds)} 个` },
        { key: 'occupied', label: '在住床位', value: `${occupiedBeds} 个`, detail: beds.length > 0 ? `入住率 ${((occupiedBeds / beds.length) * 100).toFixed(0)}%` : '暂无床位数据', tone: occupiedBeds > 0 ? 'success' : 'neutral' },
        { key: 'maintenance', label: '待处理维护', value: `${openMaintenances} 条`, detail: `费用记录 ${expenses.length} 条`, tone: openMaintenances > 0 ? 'warning' : 'success' },
      ]} />

      <Tabs defaultActiveTab="rooms">
        {/* 房间管理 */}
        <TabPane key="rooms" title="房间管理">
          <div className="travel-admin-master-detail">
            {/* 左侧：楼栋列表 */}
            <div>
              <Card title="楼栋列表">
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {buildings.map((building) => (
                    <div
                      key={building.id}
                      className={`travel-admin-selector-item${selectedBuilding?.id === building.id ? ' travel-admin-selector-item--active' : ''}`}
                      onClick={() => setSelectedBuilding(building)}
                    >
                      <div className="travel-admin-selector-item__head">
                        <Space><IconHome style={{ color: '#86909c' }} /><Text style={{ fontWeight: 500 }}>{building.name}</Text></Space>
                        <Space size={2} onClick={(event) => event.stopPropagation()}>
                          <Tooltip content="编辑楼栋"><Button aria-label={`编辑${building.name}`} className="hubx-icon-action" size="mini" type="text" icon={<IconEdit />} onClick={() => openBuildingForm(building)} /></Tooltip>
                          <Popconfirm title="确认删除该楼栋？" onOk={() => { setBuildings((items) => items.filter((item) => item.id !== building.id)); if (selectedBuilding?.id === building.id) setSelectedBuilding(null); }}><Tooltip content="删除楼栋"><Button aria-label={`删除${building.name}`} className="hubx-icon-action" size="mini" type="text" status="danger" icon={<IconDelete />} /></Tooltip></Popconfirm>
                        </Space>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{building.city} {building.district}</Text>
                      </div>
                      <div style={{ fontSize: 12, color: '#86909c' }}>
                        月租 ¥{building.monthlyRent.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </Space>
              </Card>
            </div>

            {/* 右侧：房间详情 */}
            <div>
              <Card title={selectedBuilding ? selectedBuilding.name : '请选择楼栋'}>
                {selectedBuilding ? (
                  <div>
                    {/* 楼栋信息 */}
                    <div className="travel-admin-detail-summary">
                      <Row gutter={16}>
                        <Col span={8}>
                          <div><Text type="secondary">地址</Text></div>
                          <div style={{ fontWeight: 500 }}>
                            {selectedBuilding.city} {selectedBuilding.district} {selectedBuilding.street} {selectedBuilding.community}
                          </div>
                        </Col>
                        <Col span={8}>
                          <div><Text type="secondary">房东</Text></div>
                          <div style={{ fontWeight: 500 }}>{selectedBuilding.landlordName} {selectedBuilding.landlordPhone}</div>
                        </Col>
                        <Col span={8}>
                          <div><Text type="secondary">租期</Text></div>
                          <div style={{ fontWeight: 500 }}>{selectedBuilding.leaseStartDate} ~ {selectedBuilding.leaseEndDate}</div>
                        </Col>
                      </Row>
                    </div>

                    {/* 楼层和房间 */}
                    {selectedBuilding.floors?.map((floor) => (
                      <div key={floor.id} style={{ marginBottom: 16 }}>
                        <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>{floor.floorNumber}楼</div>
                        <Row gutter={12}>
                          {floor.rooms?.map((room) => {
                            const roomColors = getRoomStatusColor(room.status);
                            return (
                              <Col span={6} key={room.id}>
                                <div
                                  style={{
                                    padding: 12,
                                    borderRadius: 8,
                                    border: `1px solid ${roomColors.border}`,
                                    background: roomColors.background,
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ fontWeight: 500 }}>{room.roomNumber}</Text>
                                    <Tag size="small">
                                      {room.roomType === 'single' ? '单人间' : room.roomType === 'double' ? '双人间' : '四人间'}
                                    </Tag>
                                  </div>
                                  <div style={{ marginBottom: 8 }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>设施：{room.facilities.join('、')}</Text>
                                  </div>
                                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                    {room.beds?.map((bed) => {
                                      const bedColors = getBedStatusColor(bed.status);
                                      return (
                                        <div
                                          key={bed.id}
                                          style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '4px 8px',
                                            borderRadius: 4,
                                            background: bedColors.background,
                                            border: `1px solid ${bedColors.border}`,
                                            fontSize: 12,
                                          }}
                                        >
                                          <Space size={4}>
                                            <IconHome />
                                            <span>{bed.bedNumber}</span>
                                          </Space>
                                          {bed.status === 'occupied' ? (
                                            <span style={{ color: 'rgb(var(--primary-6))' }}>{bed.occupantName}</span>
                                          ) : (
                                            <span style={{ color: 'rgb(var(--success-6))' }}>空闲</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </Space>
                                </div>
                              </Col>
                            );
                          })}
                        </Row>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#86909c' }}>
                    请选择楼栋查看房间
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabPane>

        {/* 入住管理 */}
        <TabPane key="checkin" title="入住管理">
          <Card title="入住记录" extra={<Button type="primary" icon={<IconPlus />} onClick={openNewCheckIn}>入住登记</Button>}>
            <Table
              columns={[
                { title: '员工', dataIndex: 'employeeName', width: 100 },
                { title: '宿舍', dataIndex: 'buildingName', width: 150 },
                { title: '房间', dataIndex: 'roomNumber', width: 100 },
                { title: '床位', dataIndex: 'bedNumber', width: 100 },
                { title: '入住日期', dataIndex: 'checkInDate', width: 120 },
                { title: '入住类型', dataIndex: 'checkInType', width: 100, render: (v: string) => v === 'long_term' ? '长期入住' : '出差入住' },
                { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={v === 'active' ? 'green' : 'gray'}>{v === 'active' ? '在住' : '已退'}</Tag> },
                { title: '操作', width: 96, fixed: 'right' as const, render: (_: unknown, record: DormitoryCheckIn) => <Space size={4}>
                  <Tooltip content="编辑入住记录"><Button aria-label={`编辑${record.employeeName}入住记录`} className="hubx-icon-action" type="text" icon={<IconEdit />} onClick={() => openEditCheckIn(record)} /></Tooltip>
                  <Popconfirm title="确认删除这条入住记录？" onOk={() => setCheckIns((items) => items.filter((item) => item.id !== record.id))}><Tooltip content="删除"><Button aria-label={`删除${record.employeeName}入住记录`} className="hubx-icon-action" type="text" status="danger" icon={<IconDelete />} /></Tooltip></Popconfirm>
                </Space> },
              ]}
              data={checkIns}
              rowKey="id"
              pagination={false}
              noDataContent="暂无入住记录"
            />
          </Card>
        </TabPane>

        {/* 费用管理 */}
        <TabPane key="expenses" title="费用管理">
          <Card title="宿舍费用" extra={<Button type="primary" icon={<IconPlus />} onClick={() => openExpenseForm()}>新增费用</Button>}>
            <Table
              columns={[
                { title: '楼栋', dataIndex: 'buildingName', width: 150 },
                { title: '费用类型', dataIndex: 'type', width: 100 },
                { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => `¥${v?.toLocaleString()}` },
                { title: '费用期间', dataIndex: 'period', width: 120 },
                { title: '分摊方式', dataIndex: 'splitMethod', width: 100, render: (v: string) => v === 'by_room' ? '按房间' : '按人头' },
                { title: '操作', width: 96, fixed: 'right' as const, render: (_: unknown, record: DormitoryExpense) => <Space size={4}>
                  <Tooltip content="编辑费用"><Button aria-label={`编辑${record.period}宿舍费用`} className="hubx-icon-action" type="text" icon={<IconEdit />} onClick={() => openExpenseForm(record)} /></Tooltip>
                  <Popconfirm title="确认删除这条费用？" onOk={() => setExpenses((items) => items.filter((item) => item.id !== record.id))}><Tooltip content="删除"><Button aria-label={`删除${record.period}宿舍费用`} className="hubx-icon-action" type="text" status="danger" icon={<IconDelete />} /></Tooltip></Popconfirm>
                </Space> },
              ]}
              data={expenses}
              rowKey="id"
              pagination={false}
              noDataContent="暂无费用记录"
            />
          </Card>
        </TabPane>

        {/* 维护管理 */}
        <TabPane key="maintenance" title="维护管理">
          <Card title="维护记录" extra={<Button type="primary" icon={<IconPlus />} onClick={() => openMaintenanceForm()}>新增维护</Button>}>
            <Table
              columns={[
                { title: '楼栋', dataIndex: 'buildingName', width: 150 },
                { title: '房间', dataIndex: 'roomNumber', width: 100 },
                { title: '类型', dataIndex: 'type', width: 100, render: (v: string) => ({ repair: '报修', cleaning: '保洁', inspection: '巡检' }[v] || v) },
                { title: '描述', dataIndex: 'description', width: 200 },
                { title: '紧急程度', dataIndex: 'urgency', width: 100, render: (v: string) => ({ normal: '普通', urgent: '紧急', very_urgent: '非常紧急' }[v] || v) },
                { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => ({ pending: '待处理', in_progress: '处理中', completed: '已完成' }[v] || v) },
                { title: '操作', width: 96, fixed: 'right' as const, render: (_: unknown, record: DormitoryMaintenance) => <Space size={4}>
                  <Tooltip content="编辑维护记录"><Button aria-label={`编辑${record.roomNumber || record.buildingName}维护记录`} className="hubx-icon-action" type="text" icon={<IconEdit />} onClick={() => openMaintenanceForm(record)} /></Tooltip>
                  <Popconfirm title="确认删除这条维护记录？" onOk={() => setMaintenances((items) => items.filter((item) => item.id !== record.id))}><Tooltip content="删除"><Button aria-label={`删除${record.roomNumber || record.buildingName}维护记录`} className="hubx-icon-action" type="text" status="danger" icon={<IconDelete />} /></Tooltip></Popconfirm>
                </Space> },
              ]}
              data={maintenances}
              rowKey="id"
              pagination={false}
              noDataContent="暂无维护记录"
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 新建楼栋弹窗 */}
      <Modal
        title={editingBuildingId ? '编辑楼栋' : '新增楼栋'}
        visible={formVisible}
        onOk={handleSaveBuilding}
        onCancel={() => setFormVisible(false)}
        okText="保存"
        cancelText="取消"
        style={{ width: 600 }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>楼栋名称</Text></div>
              <Input
                placeholder="如：杭州西湖公寓"
                value={buildingForm.name}
                onChange={(value) => setBuildingForm({ ...buildingForm, name: value })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>城市</Text></div>
              <Input
                placeholder="如：杭州"
                value={buildingForm.city}
                onChange={(value) => setBuildingForm({ ...buildingForm, city: value })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>行政区</Text></div>
              <Input
                placeholder="如：西湖区"
                value={buildingForm.district}
                onChange={(value) => setBuildingForm({ ...buildingForm, district: value })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>街道</Text></div>
              <Input
                placeholder="如：文三路"
                value={buildingForm.street}
                onChange={(value) => setBuildingForm({ ...buildingForm, street: value })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>小区名称</Text></div>
              <Input
                placeholder="如：翠苑小区"
                value={buildingForm.community}
                onChange={(value) => setBuildingForm({ ...buildingForm, community: value })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>详细地址</Text></div>
              <Input
                placeholder="如：3栋"
                value={buildingForm.address}
                onChange={(value) => setBuildingForm({ ...buildingForm, address: value })}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>房东姓名</Text></div>
              <Input
                placeholder="房东姓名"
                value={buildingForm.landlordName}
                onChange={(value) => setBuildingForm({ ...buildingForm, landlordName: value })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>房东电话</Text></div>
              <Input
                placeholder="联系电话"
                value={buildingForm.landlordPhone}
                onChange={(value) => setBuildingForm({ ...buildingForm, landlordPhone: value })}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>租期开始</Text></div>
              <Input
                type="date"
                value={buildingForm.leaseStartDate}
                onChange={(value) => setBuildingForm({ ...buildingForm, leaseStartDate: value })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>租期结束</Text></div>
              <Input
                type="date"
                value={buildingForm.leaseEndDate}
                onChange={(value) => setBuildingForm({ ...buildingForm, leaseEndDate: value })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>月租金</Text></div>
              <Input
                type="number"
                placeholder="¥0"
                value={buildingForm.monthlyRent || ''}
                onChange={(value) => setBuildingForm({ ...buildingForm, monthlyRent: Number(value) })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>押金</Text></div>
              <Input
                type="number"
                placeholder="¥0"
                value={buildingForm.deposit || ''}
                onChange={(value) => setBuildingForm({ ...buildingForm, deposit: Number(value) })}
              />
            </Col>
          </Row>
        </Space>
      </Modal>

      {/* 入住登记弹窗 */}
      <Modal
        title={editingCheckInId ? '编辑入住记录' : '入住登记'}
        visible={checkInVisible}
        onOk={handleCheckIn}
        onCancel={() => setCheckInVisible(false)}
        okText="确认入住"
        cancelText="取消"
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>员工</Text></div>
              <Input
                placeholder="选择员工"
                value={checkInForm.employeeName}
                onChange={(value) => setCheckInForm({ ...checkInForm, employeeName: value })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>入住类型</Text></div>
              <Select
                value={checkInForm.checkInType}
                onChange={(value) => setCheckInForm({ ...checkInForm, checkInType: value as 'long_term' | 'trip' })}
                style={{ width: '100%' }}
              >
                <Option value="long_term">长期入住</Option>
                <Option value="trip">出差入住</Option>
              </Select>
            </Col>
          </Row>
          <div>
            <div style={{ marginBottom: 8 }}><Text>宿舍</Text></div>
            <Select
              placeholder="选择宿舍"
              value={checkInForm.buildingId || undefined}
              onChange={(value) => setCheckInForm({ ...checkInForm, buildingId: value, floorId: '', roomId: '', bedId: '' })}
              style={{ width: '100%' }}
            >
              {buildings.map((b) => (
                <Option key={b.id} value={b.id}>{b.name}</Option>
              ))}
            </Select>
          </div>
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ marginBottom: 8 }}><Text>楼层</Text></div>
              <Select placeholder="选择楼层" value={checkInForm.floorId || undefined} onChange={(value) => setCheckInForm({ ...checkInForm, floorId: value, roomId: '', bedId: '' })} style={{ width: '100%' }}>
                {buildings.find((item) => item.id === checkInForm.buildingId)?.floors?.map((floor) => <Option key={floor.id} value={floor.id}>{floor.floorNumber}楼</Option>)}
              </Select>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 8 }}><Text>房间</Text></div>
              <Select placeholder="选择房间" value={checkInForm.roomId || undefined} onChange={(value) => setCheckInForm({ ...checkInForm, roomId: value, bedId: '' })} style={{ width: '100%' }}>
                {buildings.find((item) => item.id === checkInForm.buildingId)?.floors?.find((item) => item.id === checkInForm.floorId)?.rooms?.map((room) => <Option key={room.id} value={room.id}>{room.roomNumber}</Option>)}
              </Select>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 8 }}><Text>床位</Text></div>
              <Select placeholder="选择床位" value={checkInForm.bedId || undefined} onChange={(value) => setCheckInForm({ ...checkInForm, bedId: value })} style={{ width: '100%' }}>
                {buildings.find((item) => item.id === checkInForm.buildingId)?.floors?.find((item) => item.id === checkInForm.floorId)?.rooms?.find((item) => item.id === checkInForm.roomId)?.beds?.map((bed) => <Option key={bed.id} value={bed.id}>{bed.bedNumber}号床 · {bed.status === 'available' ? '空闲' : bed.occupantName}</Option>)}
              </Select>
            </Col>
          </Row>
          <div>
            <div style={{ marginBottom: 8 }}><Text>入住日期</Text></div>
            <Input
              type="date"
              value={checkInForm.checkInDate}
              onChange={(value) => setCheckInForm({ ...checkInForm, checkInDate: value })}
            />
          </div>
          {checkInForm.checkInType === 'trip' && (
            <div>
              <div style={{ marginBottom: 8 }}><Text>关联出差单</Text></div>
              <Input
                placeholder="选择出差单"
                value={checkInForm.tripId}
                onChange={(value) => setCheckInForm({ ...checkInForm, tripId: value })}
              />
            </div>
          )}
        </Space>
      </Modal>

      <Modal title={editingExpenseId ? '编辑宿舍费用' : '新增宿舍费用'} visible={expenseVisible} onOk={handleSaveExpense} onCancel={() => setExpenseVisible(false)} okText="保存" cancelText="取消">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div><div style={{ marginBottom: 8 }}><Text>楼栋</Text></div><Select value={expenseForm.buildingId || undefined} onChange={(value) => setExpenseForm({ ...expenseForm, buildingId: value })} style={{ width: '100%' }}>{buildings.map((item) => <Option key={item.id} value={item.id}>{item.name}</Option>)}</Select></div>
          <Row gutter={16}>
            <Col span={12}><div style={{ marginBottom: 8 }}><Text>费用类型</Text></div><Select value={expenseForm.type} onChange={(value) => setExpenseForm({ ...expenseForm, type: value })} style={{ width: '100%' }}><Option value="rent">租金</Option><Option value="water">水费</Option><Option value="electricity">电费</Option><Option value="gas">燃气费</Option><Option value="internet">网络费</Option><Option value="maintenance">维修费</Option><Option value="other">其他</Option></Select></Col>
            <Col span={12}><div style={{ marginBottom: 8 }}><Text>金额</Text></div><Input type="number" value={expenseForm.amount || ''} onChange={(value) => setExpenseForm({ ...expenseForm, amount: Number(value) })} /></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><div style={{ marginBottom: 8 }}><Text>费用期间</Text></div><Input placeholder="如：2026年8月" value={expenseForm.period} onChange={(value) => setExpenseForm({ ...expenseForm, period: value })} /></Col>
            <Col span={12}><div style={{ marginBottom: 8 }}><Text>分摊方式</Text></div><Select value={expenseForm.splitMethod} onChange={(value) => setExpenseForm({ ...expenseForm, splitMethod: value })} style={{ width: '100%' }}><Option value="by_person">按人头</Option><Option value="by_room">按房间</Option></Select></Col>
          </Row>
        </Space>
      </Modal>

      <Modal title={editingMaintenanceId ? '编辑维护记录' : '新增维护记录'} visible={maintenanceVisible} onOk={handleSaveMaintenance} onCancel={() => setMaintenanceVisible(false)} okText="保存" cancelText="取消">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={12}><div style={{ marginBottom: 8 }}><Text>楼栋</Text></div><Select value={maintenanceForm.buildingId || undefined} onChange={(value) => setMaintenanceForm({ ...maintenanceForm, buildingId: value, roomNumber: '' })} style={{ width: '100%' }}>{buildings.map((item) => <Option key={item.id} value={item.id}>{item.name}</Option>)}</Select></Col>
            <Col span={12}><div style={{ marginBottom: 8 }}><Text>房间</Text></div><Select placeholder="选择房间" value={maintenanceForm.roomNumber || undefined} onChange={(value) => setMaintenanceForm({ ...maintenanceForm, roomNumber: value })} style={{ width: '100%' }}>{buildings.find((item) => item.id === maintenanceForm.buildingId)?.floors?.flatMap((item) => item.rooms || []).map((room) => <Option key={room.id} value={room.roomNumber}>{room.roomNumber}</Option>)}</Select></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><div style={{ marginBottom: 8 }}><Text>类型</Text></div><Select value={maintenanceForm.type} onChange={(value) => setMaintenanceForm({ ...maintenanceForm, type: value })} style={{ width: '100%' }}><Option value="repair">报修</Option><Option value="cleaning">保洁</Option><Option value="inspection">巡检</Option></Select></Col>
            <Col span={8}><div style={{ marginBottom: 8 }}><Text>紧急程度</Text></div><Select value={maintenanceForm.urgency} onChange={(value) => setMaintenanceForm({ ...maintenanceForm, urgency: value })} style={{ width: '100%' }}><Option value="normal">普通</Option><Option value="urgent">紧急</Option><Option value="very_urgent">非常紧急</Option></Select></Col>
            <Col span={8}><div style={{ marginBottom: 8 }}><Text>状态</Text></div><Select value={maintenanceForm.status} onChange={(value) => setMaintenanceForm({ ...maintenanceForm, status: value })} style={{ width: '100%' }}><Option value="pending">待处理</Option><Option value="in_progress">处理中</Option><Option value="completed">已完成</Option></Select></Col>
          </Row>
          <div><div style={{ marginBottom: 8 }}><Text>维护描述</Text></div><Input.TextArea placeholder="说明需要处理的问题" value={maintenanceForm.description} onChange={(value) => setMaintenanceForm({ ...maintenanceForm, description: value })} /></div>
        </Space>
      </Modal>
    </PageShell>
  );
}
