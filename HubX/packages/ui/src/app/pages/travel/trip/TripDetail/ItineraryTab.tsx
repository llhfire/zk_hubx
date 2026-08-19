import { useState } from 'react';
import {
  Card,
  Button,
  Tag,
  Modal,
  Input,
  Select,
  Space,
  Typography,
  Grid,
  Divider,
  Message,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconLocation,
  IconCommon,
  IconPublic,
  IconHome,
  IconEdit,
  IconDelete,
  IconRight,
  IconList,
  IconDashboard,
} from '@arco-design/web-react/icon';
import type { Trip, ItinerarySegment, TransportMode } from '../../types';

const { Text, Title } = Typography;
const { Row, Col } = Grid;
const { Option } = Select;

interface ItineraryTabProps {
  trip: Trip;
  onUpdate: () => void;
}

const transportModeIcons: Record<TransportMode, typeof IconCommon> = {
  high_speed_rail: IconCommon,
  bullet_train: IconCommon,
  airplane: IconPublic,
  self_drive: IconCommon,
  bus: IconCommon,
  ferry: IconCommon,
  other: IconCommon,
};

const transportModeLabels: Record<TransportMode, string> = {
  high_speed_rail: '高铁',
  bullet_train: '动车',
  airplane: '飞机',
  self_drive: '自驾',
  bus: '大巴',
  ferry: '轮船',
  other: '其他',
};

export function ItineraryTab({ trip, onUpdate }: ItineraryTabProps) {
  const [formVisible, setFormVisible] = useState(false);
  const [editingSegment, setEditingSegment] = useState<ItinerarySegment | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline');
  const [form, setForm] = useState({
    departure: '',
    destination: '',
    departureDate: '',
    arrivalDate: '',
    transportMode: 'high_speed_rail' as TransportMode,
    transportDetail: '',
    transportCost: 0,
    customerId: '',
    customerName: '',
    projectId: '',
    projectName: '',
  });

  const segments = trip.itinerarySegments || [];

  // 打开新建表单
  const handleCreate = () => {
    setEditingSegment(null);
    setForm({
      departure: '',
      destination: '',
      departureDate: '',
      arrivalDate: '',
      transportMode: 'high_speed_rail',
      transportDetail: '',
      transportCost: 0,
      customerId: trip.customerId || '',
      customerName: trip.customerName || '',
      projectId: trip.projectId || '',
      projectName: trip.projectName || '',
    });
    setFormVisible(true);
  };

  // 打开编辑表单
  const handleEdit = (segment: ItinerarySegment) => {
    setEditingSegment(segment);
    setForm({
      departure: segment.departure,
      destination: segment.destination,
      departureDate: segment.departureDate,
      arrivalDate: segment.arrivalDate,
      transportMode: segment.transportMode,
      transportDetail: segment.transportDetail || '',
      transportCost: segment.transportCost,
      customerId: segment.customerId || '',
      customerName: segment.customerName || '',
      projectId: segment.projectId || '',
      projectName: segment.projectName || '',
    });
    setFormVisible(true);
  };

  // 删除旅程段
  const handleDelete = (segment: ItinerarySegment) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除旅程段 ${segment.departure} → ${segment.destination} 吗？`,
      onOk: () => {
        Message.success('删除成功');
        onUpdate();
      },
    });
  };

  // 保存
  const handleSave = () => {
    if (!form.departure || !form.destination || !form.departureDate) {
      Message.error('请填写完整信息');
      return;
    }
    Message.success(editingSegment ? '更新成功' : '创建成功');
    setFormVisible(false);
    onUpdate();
  };

  // 计算总费用
  const totalTransportCost = segments.reduce((sum, seg) => sum + seg.transportCost, 0);
  const totalAccommodationCost = segments.reduce((sum, seg) => sum + (seg.accommodation?.totalAmount || 0), 0);
  const totalExpense = segments.reduce((sum, seg) => sum + seg.totalExpense, 0);

  const cardStyle = { marginBottom: 16 };

  return (
    <div style={{ padding: 16 }}>
      {/* 汇总信息 */}
      <Row gutter={16} style={cardStyle}>
        <Col span={8}>
          <Card>
            <div><Text type="secondary">交通费用</Text></div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{totalTransportCost.toLocaleString()}</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div><Text type="secondary">住宿费用</Text></div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{totalAccommodationCost.toLocaleString()}</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div><Text type="secondary">总费用</Text></div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{totalExpense.toLocaleString()}</div>
          </Card>
        </Col>
      </Row>

      {/* 旅程段列表 */}
      <Card
        title="旅程段"
        extra={
          <Space>
            <Button.Group>
              <Button
                type={viewMode === 'list' ? 'primary' : 'default'}
                icon={<IconList />}
                onClick={() => setViewMode('list')}
                size="small"
              />
              <Button
                type={viewMode === 'timeline' ? 'primary' : 'default'}
                icon={<IconDashboard />}
                onClick={() => setViewMode('timeline')}
                size="small"
              />
            </Button.Group>
            <Button type="primary" size="small" icon={<IconPlus />} onClick={handleCreate}>
              添加旅程段
            </Button>
          </Space>
        }
      >
        {segments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#86909c' }}>
            暂无旅程段，请添加
          </div>
        ) : viewMode === 'list' ? (
          // 列表视图
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {segments.map((segment, index) => {
              const TransportIcon = transportModeIcons[segment.transportMode];
              return (
                <Card key={segment.id} style={{ border: '1px solid #e5e6eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Space>
                      <Tag color="gray">第 {index + 1} 段</Tag>
                      <Tag color="blue">
                        <TransportIcon style={{ marginRight: 4 }} />
                        {transportModeLabels[segment.transportMode]}
                      </Tag>
                      {segment.transportDetail && (
                        <Tag>{segment.transportDetail}</Tag>
                      )}
                    </Space>
                    <Space>
                      <Button type="text" size="small" icon={<IconEdit />} onClick={() => handleEdit(segment)} />
                      <Button type="text" size="small" status="danger" icon={<IconDelete />} onClick={() => handleDelete(segment)} />
                    </Space>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                    <Space>
                      <IconLocation style={{ color: '#86909c' }} />
                      <Text style={{ fontWeight: 500 }}>{segment.departure}</Text>
                    </Space>
                    <IconRight style={{ color: '#86909c' }} />
                    <Space>
                      <IconLocation style={{ color: '#165dff' }} />
                      <Text style={{ fontWeight: 500 }}>{segment.destination}</Text>
                    </Space>
                    <Text type="secondary">
                      {segment.departureDate}
                      {segment.departureDate !== segment.arrivalDate && ` ~ ${segment.arrivalDate}`}
                    </Text>
                  </div>

                  <Row gutter={16}>
                    <Col span={6}>
                      <div><Text type="secondary">交通费用</Text></div>
                      <div style={{ fontWeight: 500 }}>¥{segment.transportCost.toLocaleString()}</div>
                    </Col>
                    <Col span={6}>
                      <div><Text type="secondary">住宿</Text></div>
                      <div style={{ fontWeight: 500 }}>
                        {segment.accommodation
                          ? segment.accommodation.type === 'hotel'
                            ? `${segment.accommodation.hotelName} ¥${segment.accommodation.totalAmount}`
                            : `${segment.accommodation.dormitoryBuildingName} ${segment.accommodation.dormitoryRoomNumber}`
                          : '-'}
                      </div>
                    </Col>
                    <Col span={6}>
                      <div><Text type="secondary">关联客户</Text></div>
                      <div style={{ fontWeight: 500 }}>{segment.customerName || '-'}</div>
                    </Col>
                    <Col span={6}>
                      <div><Text type="secondary">关联项目</Text></div>
                      <div style={{ fontWeight: 500 }}>{segment.projectName || '-'}</div>
                    </Col>
                  </Row>

                  {segment.expenses && segment.expenses.length > 0 && (
                    <>
                      <Divider style={{ margin: '12px 0' }} />
                      <div><Text type="secondary" style={{ fontSize: 12 }}>其他费用</Text></div>
                      <Space direction="vertical" size={4} style={{ width: '100%', marginTop: 8 }}>
                        {segment.expenses.map((expense) => (
                          <div key={expense.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Space>
                              <Tag size="small">
                                {expense.type === 'meal' ? '餐饮' : expense.type === 'local_transport' ? '市内交通' : expense.type}
                              </Tag>
                              <Text>{expense.date}</Text>
                            </Space>
                            <Text style={{ fontWeight: 500 }}>¥{expense.amount.toLocaleString()}</Text>
                          </div>
                        ))}
                      </Space>
                    </>
                  )}
                </Card>
              );
            })}
          </Space>
        ) : (
          // 时间轴视图
          <div style={{ position: 'relative', paddingLeft: 32 }}>
            {segments.map((segment, index) => {
              const TransportIcon = transportModeIcons[segment.transportMode];
              const totalCost = segment.transportCost + (segment.accommodation?.totalAmount || 0) +
                (segment.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0);
              const isLast = index === segments.length - 1;

              return (
                <div key={segment.id} style={{ position: 'relative', marginBottom: isLast ? 0 : 24 }}>
                  {/* 时间轴线 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: isLast ? '50%' : 0,
                      width: 2,
                      background: isLast ? 'linear-gradient(to bottom, #165dff, transparent)' : '#165dff',
                    }}
                  />

                  {/* 时间轴节点 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 8,
                      transform: 'translateX(-50%)',
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: '#165dff',
                      border: '2px solid white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  />

                  {/* 出发节点标记 */}
                  {index === 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: -20,
                        transform: 'translateX(-50%)',
                        fontSize: 10,
                        color: '#165dff',
                        fontWeight: 500,
                      }}
                    >
                      出发
                    </div>
                  )}

                  {/* 内容卡片 */}
                  <Card
                    style={{
                      marginLeft: 24,
                      border: '1px solid #e5e6eb',
                      transition: 'all 0.2s',
                    }}
                    hoverable
                  >
                    {/* 头部：路线 + 交通方式 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Space>
                        <Text style={{ fontWeight: 600, color: '#1d2129' }}>{segment.departure}</Text>
                        <Space style={{ color: '#165dff' }}>
                          <div style={{ width: 32, height: 1, background: '#99baff' }} />
                          <TransportIcon />
                          <div style={{ width: 32, height: 1, background: '#99baff' }} />
                        </Space>
                        <Text style={{ fontWeight: 600, color: '#1d2129' }}>{segment.destination}</Text>
                        <Tag size="small">
                          {transportModeLabels[segment.transportMode]}
                          {segment.transportDetail && ` ${segment.transportDetail}`}
                        </Tag>
                      </Space>
                      <Space>
                        <Button type="text" size="small" icon={<IconEdit />} onClick={() => handleEdit(segment)} />
                        <Button type="text" size="small" status="danger" icon={<IconDelete />} onClick={() => handleDelete(segment)} />
                      </Space>
                    </div>

                    {/* 日期 */}
                    <div style={{ fontSize: 12, color: '#86909c', marginBottom: 12 }}>
                      {segment.departureDate}
                      {segment.departureDate !== segment.arrivalDate && ` ~ ${segment.arrivalDate}`}
                    </div>

                    {/* 费用明细 */}
                    <Row gutter={12}>
                      <Col span={6}>
                        <Card size="small" style={{ background: '#f2f3ff', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#86909c' }}>交通</div>
                          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#165dff' }}>
                            ¥{segment.transportCost.toLocaleString()}
                          </div>
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small" style={{ background: '#f5e8ff', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#86909c' }}>住宿</div>
                          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#722ed1' }}>
                            ¥{(segment.accommodation?.totalAmount || 0).toLocaleString()}
                          </div>
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small" style={{ background: '#fff7e6', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#86909c' }}>其他</div>
                          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#fa8c16' }}>
                            ¥{(segment.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0).toLocaleString()}
                          </div>
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small" style={{ background: '#e8ffea', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#86909c' }}>小计</div>
                          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#00b42a' }}>
                            ¥{totalCost.toLocaleString()}
                          </div>
                        </Card>
                      </Col>
                    </Row>

                    {/* 关联信息 */}
                    {(segment.customerName || segment.projectName) && (
                      <Space style={{ marginTop: 8, fontSize: 12, color: '#86909c' }}>
                        {segment.customerName && (
                          <Space size={4}>
                            <IconHome />
                            <span>{segment.customerName}</span>
                          </Space>
                        )}
                        {segment.projectName && (
                          <Space size={4}>
                            <IconHome />
                            <span>{segment.projectName}</span>
                          </Space>
                        )}
                      </Space>
                    )}
                  </Card>
                </div>
              );
            })}

            {/* 终点标记 */}
            {segments.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  bottom: -8,
                  transform: 'translateX(-50%)',
                  fontSize: 10,
                  color: '#86909c',
                  fontWeight: 500,
                }}
              >
                到达
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 新建/编辑表单弹窗 */}
      <Modal
        title={editingSegment ? '编辑旅程段' : '添加旅程段'}
        visible={formVisible}
        onOk={handleSave}
        onCancel={() => setFormVisible(false)}
        okText="保存"
        cancelText="取消"
        style={{ width: 600 }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}>
                <Text>出发地</Text> <Text type="error">*</Text>
              </div>
              <Input
                placeholder="如：北京"
                value={form.departure}
                onChange={(value) => setForm({ ...form, departure: value })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}>
                <Text>目的地</Text> <Text type="error">*</Text>
              </div>
              <Input
                placeholder="如：杭州"
                value={form.destination}
                onChange={(value) => setForm({ ...form, destination: value })}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}>
                <Text>出发日期</Text> <Text type="error">*</Text>
              </div>
              <Input
                type="date"
                value={form.departureDate}
                onChange={(value) => setForm({ ...form, departureDate: value })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>到达日期</Text></div>
              <Input
                type="date"
                value={form.arrivalDate}
                onChange={(value) => setForm({ ...form, arrivalDate: value })}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}>
                <Text>交通方式</Text> <Text type="error">*</Text>
              </div>
              <Select
                value={form.transportMode}
                onChange={(value) => setForm({ ...form, transportMode: value as TransportMode })}
                style={{ width: '100%' }}
              >
                <Option value="high_speed_rail">高铁</Option>
                <Option value="bullet_train">动车</Option>
                <Option value="airplane">飞机</Option>
                <Option value="self_drive">自驾</Option>
                <Option value="bus">大巴</Option>
                <Option value="ferry">轮船</Option>
                <Option value="other">其他</Option>
              </Select>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>交通班次</Text></div>
              <Input
                placeholder="如：G101、CA1234"
                value={form.transportDetail}
                onChange={(value) => setForm({ ...form, transportDetail: value })}
              />
            </Col>
          </Row>
          <div>
            <div style={{ marginBottom: 8 }}><Text>交通费用</Text></div>
            <Input
              type="number"
              placeholder="¥0"
              value={form.transportCost || ''}
              onChange={(value) => setForm({ ...form, transportCost: Number(value) })}
            />
          </div>
          <Divider />
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>关联客户</Text></div>
              <Input
                placeholder="选择客户（可选）"
                value={form.customerName}
                onChange={(value) => setForm({ ...form, customerName: value })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>关联项目</Text></div>
              <Input
                placeholder="选择项目（可选）"
                value={form.projectName}
                onChange={(value) => setForm({ ...form, projectName: value })}
              />
            </Col>
          </Row>
        </Space>
      </Modal>
    </div>
  );
}
