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
} from '@arco-design/web-react';
import {
  IconPlus,
  IconHome,
  IconUser,
  IconTool,
  IconStorage,
  IconSearch,
} from '@arco-design/web-react/icon';
import type { DormitoryBuilding, DormitoryRoom, DormitoryCheckIn } from '../types';
import { getDormitoryList } from '../travel-api';

const { Text, Title } = Typography;
const { Row, Col } = Grid;
const { Option } = Select;
const { TabPane } = Tabs;

export function DormitoryManagement() {
  const [loading, setLoading] = useState(false);
  const [buildings, setBuildings] = useState<DormitoryBuilding[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<DormitoryBuilding | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [checkInVisible, setCheckInVisible] = useState(false);

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

  // 保存楼栋
  const handleSaveBuilding = () => {
    if (!buildingForm.name || !buildingForm.city) {
      Message.error('请填写完整信息');
      return;
    }
    Message.success('创建成功');
    setFormVisible(false);
    loadBuildings();
  };

  // 办理入住
  const handleCheckIn = () => {
    if (!checkInForm.employeeName || !checkInForm.bedId) {
      Message.error('请填写完整信息');
      return;
    }
    Message.success('入住登记成功');
    setCheckInVisible(false);
  };

  // 获取房间状态颜色
  const getRoomStatusColor = (status: string) => {
    switch (status) {
      case 'available': return { background: '#e8ffea', border: '#aff0b5' };
      case 'occupied': return { background: '#f2f3ff', border: '#bedaff' };
      case 'maintenance': return { background: '#fff7e6', border: '#ffd591' };
      default: return { background: '#f7f8fa', border: '#e5e6eb' };
    }
  };

  // 获取床位状态颜色
  const getBedStatusColor = (status: string) => {
    switch (status) {
      case 'available': return { background: '#e8ffea', border: '#aff0b5' };
      case 'occupied': return { background: '#f2f3ff', border: '#bedaff' };
      default: return { background: '#f7f8fa', border: '#e5e6eb' };
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <Tabs defaultActiveTab="rooms">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title heading={4}>宿舍管理</Title>
          <Space>
            <Button onClick={() => setFormVisible(true)}>
              <IconPlus style={{ marginRight: 4 }} />新增楼栋
            </Button>
            <Button type="primary" onClick={() => setCheckInVisible(true)}>
              <IconUser style={{ marginRight: 4 }} />入住登记
            </Button>
          </Space>
        </div>

        {/* 房间管理 */}
        <TabPane key="rooms" title="房间管理">
          <Row gutter={16}>
            {/* 左侧：楼栋列表 */}
            <Col span={6}>
              <Card title="楼栋列表">
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {buildings.map((building) => (
                    <div
                      key={building.id}
                      style={{
                        padding: 12,
                        borderRadius: 4,
                        cursor: 'pointer',
                        border: selectedBuilding?.id === building.id ? '1px solid #165dff' : '1px solid #e5e6eb',
                        background: selectedBuilding?.id === building.id ? '#f2f3ff' : 'white',
                      }}
                      onClick={() => setSelectedBuilding(building)}
                    >
                      <Space>
                        <IconHome style={{ color: '#86909c' }} />
                        <Text style={{ fontWeight: 500 }}>{building.name}</Text>
                      </Space>
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
            </Col>

            {/* 右侧：房间详情 */}
            <Col span={18}>
              <Card title={selectedBuilding ? selectedBuilding.name : '请选择楼栋'}>
                {selectedBuilding ? (
                  <div>
                    {/* 楼栋信息 */}
                    <div style={{ padding: 16, background: '#f7f8fa', borderRadius: 8, marginBottom: 16 }}>
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
                        <Title heading={6} style={{ marginBottom: 12 }}>{floor.floorNumber}楼</Title>
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
                                            <span style={{ color: '#165dff' }}>{bed.occupantName}</span>
                                          ) : (
                                            <span style={{ color: '#00b42a' }}>空闲</span>
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
            </Col>
          </Row>
        </TabPane>

        {/* 入住管理 */}
        <TabPane key="checkin" title="入住管理">
          <Card title="入住记录">
            <Table
              columns={[
                { title: '员工', dataIndex: 'employeeName', width: 100 },
                { title: '宿舍', dataIndex: 'buildingName', width: 150 },
                { title: '房间', dataIndex: 'roomNumber', width: 100 },
                { title: '床位', dataIndex: 'bedNumber', width: 100 },
                { title: '入住日期', dataIndex: 'checkInDate', width: 120 },
                { title: '入住类型', dataIndex: 'checkInType', width: 100, render: (v: string) => v === 'long_term' ? '长期入住' : '出差入住' },
                { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={v === 'active' ? 'green' : 'gray'}>{v === 'active' ? '在住' : '已退'}</Tag> },
              ]}
              data={[]}
              pagination={false}
              noDataContent="暂无入住记录"
            />
          </Card>
        </TabPane>

        {/* 费用管理 */}
        <TabPane key="expenses" title="费用管理">
          <Card title="宿舍费用">
            <Table
              columns={[
                { title: '楼栋', dataIndex: 'buildingName', width: 150 },
                { title: '费用类型', dataIndex: 'type', width: 100 },
                { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => `¥${v?.toLocaleString()}` },
                { title: '费用期间', dataIndex: 'period', width: 120 },
                { title: '分摊方式', dataIndex: 'splitMethod', width: 100, render: (v: string) => v === 'by_room' ? '按房间' : '按人头' },
              ]}
              data={[]}
              pagination={false}
              noDataContent="暂无费用记录"
            />
          </Card>
        </TabPane>

        {/* 维护管理 */}
        <TabPane key="maintenance" title="维护管理">
          <Card title="维护记录">
            <Table
              columns={[
                { title: '楼栋', dataIndex: 'buildingName', width: 150 },
                { title: '房间', dataIndex: 'roomNumber', width: 100 },
                { title: '类型', dataIndex: 'type', width: 100 },
                { title: '描述', dataIndex: 'description', width: 200 },
                { title: '紧急程度', dataIndex: 'urgency', width: 100 },
                { title: '状态', dataIndex: 'status', width: 100 },
              ]}
              data={[]}
              pagination={false}
              noDataContent="暂无维护记录"
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 新建楼栋弹窗 */}
      <Modal
        title="新增楼栋"
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
        title="入住登记"
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
              value={checkInForm.buildingId}
              onChange={(value) => setCheckInForm({ ...checkInForm, buildingId: value })}
              style={{ width: '100%' }}
            >
              {buildings.map((b) => (
                <Option key={b.id} value={b.id}>{b.name}</Option>
              ))}
            </Select>
          </div>
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
    </div>
  );
}
