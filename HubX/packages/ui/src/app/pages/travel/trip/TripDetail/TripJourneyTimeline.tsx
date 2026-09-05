import { useState } from 'react';
import {
  Button,
  Card,
  Divider,
  Grid,
  Input,
  Message,
  Modal,
  Select,
  Space,
  Tag,
  Timeline,
  Typography,
} from '@arco-design/web-react';
import {
  IconCommon,
  IconDelete,
  IconEdit,
  IconHome,
  IconLocation,
  IconPlus,
  IconPublic,
  IconRight,
} from '@arco-design/web-react/icon';
import type { Trip, ItinerarySegment, TransportMode } from '../../types';
import { formatMoney } from '../tripDetailMetrics';

const { Text } = Typography;
const { Option } = Select;
const { Row, Col } = Grid;
const TimelineItem = Timeline.Item;

interface TripJourneyTimelineProps {
  trip: Trip;
  onUpdate: () => void;
  selectedSegmentId?: string | null;
  onSelectSegment?: (segmentId: string | null) => void;
}

const transportModeLabels: Record<TransportMode, string> = {
  high_speed_rail: '高铁',
  bullet_train: '动车',
  airplane: '飞机',
  self_drive: '自驾',
  bus: '大巴',
  ferry: '轮船',
  other: '其他',
};

const transportModeIcons: Record<TransportMode, typeof IconCommon> = {
  high_speed_rail: IconCommon,
  bullet_train: IconCommon,
  airplane: IconPublic,
  self_drive: IconCommon,
  bus: IconCommon,
  ferry: IconCommon,
  other: IconCommon,
};

export function TripJourneyTimeline({
  trip,
  onUpdate,
  selectedSegmentId,
  onSelectSegment,
}: TripJourneyTimelineProps) {
  const [formVisible, setFormVisible] = useState(false);
  const [editingSegment, setEditingSegment] = useState<ItinerarySegment | null>(null);
  const [form, setForm] = useState({
    departure: '',
    destination: '',
    departureDate: '',
    arrivalDate: '',
    transportMode: 'high_speed_rail' as TransportMode,
    transportDetail: '',
    transportCost: 0,
    accommodationHotel: '',
    accommodationDays: 1,
    accommodationCost: 0,
  });

  const segments = trip.itinerarySegments || [];

  // 计算当前所处航段
  const today = new Date().toISOString().slice(0, 10);
  const currentSegmentIndex = trip.status === 'in_progress'
    ? Math.max(0, segments.findIndex((s) => s.departureDate <= today && s.arrivalDate >= today))
    : trip.status === 'to_reimburse' || trip.status === 'closed'
      ? segments.length - 1
      : 0;

  const handleCreate = () => {
    setEditingSegment(null);
    setForm({
      departure: trip.destinations[0] ? '上海' : '',
      destination: trip.destinations[0] || '',
      departureDate: trip.startDate || today,
      arrivalDate: trip.endDate || today,
      transportMode: 'high_speed_rail',
      transportDetail: 'G33次 二等座',
      transportCost: 0,
      accommodationHotel: '',
      accommodationDays: Math.max(1, trip.days - 1),
      accommodationCost: 0,
    });
    setFormVisible(true);
  };

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
      accommodationHotel: segment.accommodation?.hotelName || '',
      accommodationDays: segment.accommodation?.days || 1,
      accommodationCost: segment.accommodation?.totalAmount || 0,
    });
    setFormVisible(true);
  };

  const handleDelete = (segment: ItinerarySegment) => {
    Modal.confirm({
      title: '确认删除航段',
      content: `确定要删除 ${segment.departure} → ${segment.destination} 的航段吗？`,
      onOk: () => {
        Message.success('航段删除成功');
        onUpdate();
      },
    });
  };

  const handleSave = () => {
    if (!form.departure || !form.destination || !form.departureDate) {
      Message.error('请填写完整航段信息');
      return;
    }
    Message.success(editingSegment ? '航段更新成功' : '航段创建成功');
    setFormVisible(false);
    onUpdate();
  };

  return (
    <div style={{ padding: 12 }}>
      {/* 顶部操作条 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Space size={6}>
          <IconLocation style={{ color: 'rgb(var(--primary-6))' }} />
          <Text style={{ fontWeight: 600, fontSize: 13 }}>全程行程规划</Text>
          <Tag size="small" color="arcoblue">{segments.length} 个航段</Tag>
        </Space>
        <Button
          type="outline"
          size="mini"
          icon={<IconPlus />}
          onClick={handleCreate}
        >
          添加航段
        </Button>
      </div>

      {/* 垂直时间线展示航段足迹 */}
      {segments.length > 0 ? (
        <Timeline style={{ paddingLeft: 4 }}>
          {segments.map((segment, index) => {
            const isCurrent = index === currentSegmentIndex && trip.status === 'in_progress';
            const isFinished = index < currentSegmentIndex || ['to_reimburse', 'closed'].includes(trip.status);

            const isSelected = selectedSegmentId === segment.id;

            return (
              <TimelineItem
                key={segment.id}
                dot={
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: isCurrent ? 'rgb(var(--primary-6))' : isFinished ? 'var(--color-fill-3)' : 'var(--color-bg-2)',
                      border: `2px solid ${isCurrent ? 'rgb(var(--primary-6))' : isFinished ? 'rgb(var(--success-6))' : 'var(--color-border-3)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCurrent ? '#fff' : isFinished ? 'rgb(var(--success-6))' : 'var(--color-text-3)',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {index + 1}
                  </div>
                }
              >
                <div
                  className={`trip-ticket-card ${isSelected ? 'trip-ticket-card--active' : ''} ${isCurrent ? 'trip-ticket-card--current' : ''}`}
                  onClick={() => onSelectSegment?.(isSelected ? null : segment.id)}
                >
                  {/* 车票顶部状态与操作栏 */}
                  <div className="trip-ticket-header">
                    <Space size={6}>
                      <Tag size="small" color={isCurrent ? 'arcoblue' : isFinished ? 'green' : 'gray'}>
                        {isCurrent ? (
                          <>
                            <span className="trip-ticket-pulse" />
                            <span>进行中行程</span>
                          </>
                        ) : isFinished ? '已抵离' : '待启程'}
                      </Tag>
                      <Tag size="small" color="blue">
                        {transportModeLabels[segment.transportMode]}
                      </Tag>
                      {isSelected && (
                        <Tag size="small" color="orangered">已联动流水</Tag>
                      )}
                    </Space>

                    <Space size={2} onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="text"
                        size="mini"
                        icon={<IconEdit />}
                        onClick={() => handleEdit(segment)}
                      />
                      <Button
                        type="text"
                        size="mini"
                        status="danger"
                        icon={<IconDelete />}
                        onClick={() => handleDelete(segment)}
                      />
                    </Space>
                  </div>

                  {/* 核心城市路线与动感航线 */}
                  <div className="trip-ticket-route">
                    <span className="trip-ticket-station">{segment.departure}</span>
                    <div className="trip-ticket-transport-bridge">
                      <span style={{ fontSize: 11, color: 'rgb(var(--primary-6))', fontWeight: 600, marginBottom: 2 }}>
                        {segment.transportDetail || transportModeLabels[segment.transportMode]}
                      </span>
                      <div className="trip-ticket-transport-line" />
                    </div>
                    <span className="trip-ticket-station" style={{ color: 'rgb(var(--primary-6))' }}>
                      {segment.destination}
                    </span>
                  </div>

                  {/* 出行班次与日期元信息 */}
                  <div className="trip-ticket-meta-grid">
                    <div>
                      <span style={{ color: 'var(--color-text-3)', marginRight: 4 }}>出发:</span>
                      <span>{segment.departureDate}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-3)', marginRight: 4 }}>到达:</span>
                      <span>{segment.arrivalDate}</span>
                    </div>
                  </div>

                  {/* 酒店住宿或费用备忘 */}
                  {(segment.accommodation || segment.transportCost > 0) && (
                    <div className="trip-ticket-hotel-badge">
                      {segment.accommodation?.hotelName ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconHome style={{ fontSize: 12 }} />
                          {segment.accommodation.hotelName} ({segment.accommodation.days}晚)
                        </span>
                      ) : (
                        <span>交通支出：{formatMoney(segment.transportCost)}</span>
                      )}
                      <span style={{ fontWeight: 600 }}>
                        小计 {formatMoney(segment.transportCost + (segment.accommodation?.totalAmount || 0))}
                      </span>
                    </div>
                  )}

                  {/* 底部点击联动提示 */}
                  <div style={{ marginTop: 6, fontSize: 11, color: isSelected ? 'rgb(var(--primary-6))' : 'var(--color-text-3)', textAlign: 'right' }}>
                    {isSelected ? '已过滤左侧记账流水 · 点击取消' : '点击可在左侧联动过滤该段流水 ➔'}
                  </div>
                </div>
              </TimelineItem>
            );
          })}
        </Timeline>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-3)' }}>
          <IconLocation style={{ fontSize: 24, marginBottom: 6 }} />
          <div>暂未规划具体旅程航段</div>
          <Button type="text" size="small" onClick={handleCreate} style={{ marginTop: 4 }}>
            点击添加第一个航段
          </Button>
        </div>
      )}

      {/* 新建/编辑航段弹窗 */}
      <Modal
        title={editingSegment ? '编辑旅程段' : '添加旅程段'}
        visible={formVisible}
        onOk={handleSave}
        onCancel={() => setFormVisible(false)}
        okText="保存"
        cancelText="取消"
        style={{ width: 440 }}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Row gutter={12}>
            <Col span={12}>
              <div style={{ marginBottom: 4, fontSize: 12 }}><Text>出发地</Text></div>
              <Input
                placeholder="出发城市"
                value={form.departure}
                onChange={(val) => setForm({ ...form, departure: val })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 4, fontSize: 12 }}><Text>目的地</Text></div>
              <Input
                placeholder="目的城市"
                value={form.destination}
                onChange={(val) => setForm({ ...form, destination: val })}
              />
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <div style={{ marginBottom: 4, fontSize: 12 }}><Text>出发日期</Text></div>
              <Input
                type="date"
                value={form.departureDate}
                onChange={(val) => setForm({ ...form, departureDate: val })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 4, fontSize: 12 }}><Text>到达日期</Text></div>
              <Input
                type="date"
                value={form.arrivalDate}
                onChange={(val) => setForm({ ...form, arrivalDate: val })}
              />
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <div style={{ marginBottom: 4, fontSize: 12 }}><Text>交通方式</Text></div>
              <Select
                value={form.transportMode}
                onChange={(val) => setForm({ ...form, transportMode: val })}
                style={{ width: '100%' }}
              >
                {Object.entries(transportModeLabels).map(([key, label]) => (
                  <Option key={key} value={key}>{label}</Option>
                ))}
              </Select>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 4, fontSize: 12 }}><Text>班次 / 车次 / 航班</Text></div>
              <Input
                placeholder="例如 G33 / CA1234"
                value={form.transportDetail}
                onChange={(val) => setForm({ ...form, transportDetail: val })}
              />
            </Col>
          </Row>

          <div>
            <div style={{ marginBottom: 4, fontSize: 12 }}><Text>入住酒店（选填）</Text></div>
            <Input
              placeholder="例如 汉庭酒店 / 全季酒店"
              value={form.accommodationHotel}
              onChange={(val) => setForm({ ...form, accommodationHotel: val })}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
