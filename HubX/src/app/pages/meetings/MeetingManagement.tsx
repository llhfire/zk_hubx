import { useState, useMemo } from 'react';
import {
  Card,
  Grid,
  Statistic,
  Table,
  Button,
  Space,
  Tag,
  Tabs,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  TextArea,
  Typography,
  Popconfirm,
  Avatar,
  Badge,
  Timeline,
  Descriptions,
  Divider,
} from '@arco-design/web-react';
import {
  IconCalendar,
  IconPlus,
  IconEdit,
  IconDelete,
  IconClockCircle,
  IconUser,
  IconFile,
  IconCheckCircle,
  IconCloseCircle,
  IconLocation,
  IconUserGroup,
} from '@arco-design/web-react/icon';

const Row = Grid.Row;
const Col = Grid.Col;
const TabPane = Tabs.TabPane;
const Title = Typography.Title;
const FormItem = Form.Item;
const SelectOption = Select.Option;

// ---------- 类型 ----------

interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  location: string;
  equipment: string[];
  status: 'available' | 'occupied' | 'maintenance';
}

interface Meeting {
  id: string;
  title: string;
  roomName: string;
  startTime: string;
  endTime: string;
  organizer: string;
  attendees: string[];
  agenda: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  projectId?: string;
  priority: 'high' | 'normal' | 'low';
}

interface MeetingMinute {
  id: string;
  meetingId: string;
  meetingTitle: string;
  date: string;
  decisions: string[];
  actionItems: { task: string; owner: string; deadline: string; done: boolean }[];
}

// ---------- 模拟数据 ----------

const mockRooms: MeetingRoom[] = [
  { id: 'room-1', name: '会议室 A（大）', capacity: 20, location: '3楼东侧', equipment: ['投影仪', '白板', '视频会议系统'], status: 'available' },
  { id: 'room-2', name: '会议室 B（中）', capacity: 10, location: '3楼西侧', equipment: ['投影仪', '白板'], status: 'occupied' },
  { id: 'room-3', name: '会议室 C（小）', capacity: 6,  location: '2楼南侧', equipment: ['显示屏'], status: 'available' },
  { id: 'room-4', name: '洽谈室',       capacity: 4,  location: '1楼前台旁', equipment: ['显示屏', '电话'], status: 'available' },
  { id: 'room-5', name: '培训室',       capacity: 30, location: '4楼整层', equipment: ['投影仪', '音响', '白板', '录播系统'], status: 'maintenance' },
];

const mockMeetings: Meeting[] = [
  { id: 'mt-1', title: 'CRM 项目周会', roomName: '会议室 B（中）', startTime: '2026-07-02 10:00', endTime: '2026-07-02 11:00', organizer: '张三', attendees: ['张三', '李四', '王五', '黄丽'], agenda: '1. 进度同步\n2. 问题讨论\n3. 下周计划', status: 'ongoing', projectId: '1', priority: 'normal' },
  { id: 'mt-2', title: '云服务平台需求评审', roomName: '会议室 A（大）', startTime: '2026-07-02 14:00', endTime: '2026-07-02 16:00', organizer: '徐强', attendees: ['徐强', '李四', '陈明', '林小红'], agenda: '1. 需求文档评审\n2. 技术方案讨论\n3. 排期确认', status: 'scheduled', projectId: '2', priority: 'high' },
  { id: 'mt-3', title: '电商平台验收准备', roomName: '会议室 C（小）', startTime: '2026-07-03 09:30', endTime: '2026-07-03 10:30', organizer: '李四', attendees: ['李四', '赵六', '陈明'], agenda: '验收清单确认', status: 'scheduled', projectId: '3', priority: 'high' },
  { id: 'mt-4', title: 'Q2 季度复盘会', roomName: '会议室 A（大）', startTime: '2026-06-30 14:00', endTime: '2026-06-30 17:00', organizer: '徐强', attendees: ['徐强', '张三', '李四', '王五', '赵六', '黄丽', '陈明'], agenda: 'Q2 项目复盘与 Q3 规划', status: 'completed', priority: 'normal' },
  { id: 'mt-5', title: '客户 A 项目启动会', roomName: '洽谈室', startTime: '2026-07-01 10:00', endTime: '2026-07-01 11:30', organizer: '张三', attendees: ['张三', '钱七'], agenda: '项目启动沟通', status: 'completed', projectId: '1', priority: 'normal' },
];

const mockMinutes: MeetingMinute[] = [
  {
    id: 'min-1', meetingId: 'mt-4', meetingTitle: 'Q2 季度复盘会', date: '2026-06-30',
    decisions: ['Q3 重点推进 CRM 系统升级', '增加自动化测试覆盖率目标至 80%'],
    actionItems: [
      { task: '编写 Q3 技术规划', owner: '徐强', deadline: '2026-07-10', done: false },
      { task: '搭建自动化测试框架', owner: '黄丽', deadline: '2026-07-15', done: false },
      { task: '完成 CRM 看板优化', owner: '王五', deadline: '2026-07-08', done: true },
    ],
  },
  {
    id: 'min-2', meetingId: 'mt-5', meetingTitle: '客户 A 项目启动会', date: '2026-07-01',
    decisions: ['项目周期 3 个月', '采用敏捷开发模式，2 周一个 Sprint'],
    actionItems: [
      { task: '签署合同', owner: '张三', deadline: '2026-07-03', done: true },
      { task: '组建项目团队', owner: '徐强', deadline: '2026-07-05', done: true },
    ],
  },
];

// ---------- 主组件 ----------

export function MeetingManagement() {
  const [activeTab, setActiveTab] = useState('meetings');
  const [rooms, setRooms] = useState(mockRooms);
  const [meetings, setMeetings] = useState(mockMeetings);
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [meetingModalVisible, setMeetingModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [roomForm] = Form.useForm();
  const [meetingForm] = Form.useForm();

  const summary = useMemo(() => {
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(r => r.status === 'available').length;
    const todayMeetings = meetings.filter(m => m.startTime.startsWith('2026-07-02')).length;
    const upcomingMeetings = meetings.filter(m => m.status === 'scheduled').length;
    return { totalRooms, availableRooms, todayMeetings, upcomingMeetings, totalMeetings: meetings.length, completedMeetings: meetings.filter(m => m.status === 'completed').length };
  }, [rooms, meetings]);

  // 会议室操作
  const handleAddRoom = () => {
    setEditingRoom(null);
    roomForm.resetFields();
    roomForm.setFieldsValue({ capacity: 10, equipment: [], status: 'available' });
    setRoomModalVisible(true);
  };

  const handleEditRoom = (room: MeetingRoom) => {
    setEditingRoom(room);
    roomForm.setFieldsValue(room);
    setRoomModalVisible(true);
  };

  const handleDeleteRoom = (id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
  };

  const handleRoomSubmit = () => {
    roomForm.validate().then(values => {
      if (editingRoom) {
        setRooms(prev => prev.map(r => r.id === editingRoom.id ? { ...r, ...values } : r));
      } else {
        setRooms(prev => [...prev, { id: `room-${Date.now()}`, ...values }]);
      }
      setRoomModalVisible(false);
    });
  };

  // 会议操作
  const handleAddMeeting = () => {
    setEditingMeeting(null);
    meetingForm.resetFields();
    meetingForm.setFieldsValue({ status: 'scheduled', priority: 'normal', attendees: [] });
    setMeetingModalVisible(true);
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    meetingForm.setFieldsValue(meeting);
    setMeetingModalVisible(true);
  };

  const handleCancelMeeting = (id: string) => {
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, status: 'cancelled' as const } : m));
  };

  const handleMeetingSubmit = () => {
    meetingForm.validate().then(values => {
      if (editingMeeting) {
        setMeetings(prev => prev.map(m => m.id === editingMeeting.id ? { ...m, ...values } : m));
      } else {
        setMeetings(prev => [...prev, { id: `mt-${Date.now()}`, ...values, status: 'scheduled' }]);
      }
      setMeetingModalVisible(false);
    });
  };

  const roomStatusLabels: Record<string, { label: string; color: string }> = {
    available:   { label: '空闲', color: 'var(--success-500)' },
    occupied:    { label: '使用中', color: 'var(--primary)' },
    maintenance: { label: '维护中', color: 'var(--destructive-500)' },
  };

  const meetingStatusLabels: Record<string, { label: string; color: string }> = {
    scheduled:  { label: '已预约', color: 'var(--primary)' },
    ongoing:    { label: '进行中', color: 'var(--success-500)' },
    completed:  { label: '已结束', color: 'var(--muted-foreground)' },
    cancelled:  { label: '已取消', color: 'var(--destructive-500)' },
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 摘要栏 */}
      <Row gutter={16}>
        <Col span={4}><Card><Statistic title="会议室" value={summary.totalRooms} suffix="间" icon={<IconLocation style={{ color: 'var(--primary)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="空闲" value={summary.availableRooms} suffix="间" icon={<IconCheckCircle style={{ color: 'var(--success-500)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="今日会议" value={summary.todayMeetings} suffix="场" icon={<IconCalendar style={{ color: 'var(--warning-500)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="待开会议" value={summary.upcomingMeetings} suffix="场" icon={<IconClockCircle style={{ color: 'var(--primary)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="会议总数" value={summary.totalMeetings} suffix="场" icon={<IconFile style={{ color: 'var(--chart-5)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="已完成" value={summary.completedMeetings} suffix="场" icon={<IconCheckCircle style={{ color: 'var(--success-500)' }} />} /></Card></Col>
      </Row>

      {/* 主体 Tab */}
      <Card bordered={false}>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="meetings" title={<span><IconCalendar style={{ fontSize: 16 }} /> 会议安排 <Badge count={summary.upcomingMeetings} style={{ background: 'var(--primary)' }} /></span>} />
          <TabPane key="rooms" title={<span><IconLocation style={{ fontSize: 16 }} /> 会议室管理</span>} />
          <TabPane key="minutes" title={<span><IconEdit style={{ fontSize: 16 }} /> 会议记录</span>} />
        </Tabs>

        <div style={{ paddingTop: 16 }}>
          {/* 会议安排 Tab */}
          {activeTab === 'meetings' && (
            <div>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" icon={<IconPlus />} onClick={handleAddMeeting}>预约会议</Button>
              </div>
              <Table
                columns={[
                  { title: '会议主题', dataIndex: 'title', width: 180, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                  {
                    title: '优先级', dataIndex: 'priority', width: 70,
                    render: (p: string) => <Tag color={p === 'high' ? 'var(--destructive-500)' : p === 'normal' ? 'var(--primary)' : 'var(--muted-foreground)'}>{p === 'high' ? '高' : p === 'normal' ? '普通' : '低'}</Tag>,
                  },
                  { title: '会议室', dataIndex: 'roomName', width: 110 },
                  { title: '时间', dataIndex: 'startTime', width: 200, render: (_: unknown, row: Meeting) => `${row.startTime} ~ ${row.endTime.slice(11)}` },
                  { title: '组织人', dataIndex: 'organizer', width: 70 },
                  { title: '参会人', dataIndex: 'attendees', width: 120, render: (a: string[]) => <Avatar.Group size={24} maxCount={4}>{a.map(u => <Avatar key={u} style={{ background: 'var(--primary)', fontSize: 11 }}>{u.slice(0, 1)}</Avatar>)}</Avatar.Group> },
                  {
                    title: '状态', dataIndex: 'status', width: 70,
                    render: (s: string) => <Tag color={meetingStatusLabels[s]?.color || 'var(--muted-foreground)'}>{meetingStatusLabels[s]?.label || s}</Tag>,
                  },
                  {
                    title: '操作', width: 130,
                    render: (_: unknown, row: Meeting) => (
                      <Space>
                        <Button type="text" size="small" icon={<IconEdit />} onClick={() => handleEditMeeting(row)}>编辑</Button>
                        {row.status === 'scheduled' && (
                          <Button type="text" size="small" status="danger" icon={<IconCloseCircle />} onClick={() => handleCancelMeeting(row.id)}>取消</Button>
                        )}
                      </Space>
                    ),
                  },
                ] as any}
                data={meetings}
                rowKey="id"
                pagination={false}
              />
            </div>
          )}

          {/* 会议室管理 Tab */}
          {activeTab === 'rooms' && (
            <div>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" icon={<IconPlus />} onClick={handleAddRoom}>新增会议室</Button>
              </div>
              <Row gutter={16}>
                {rooms.map(room => (
                  <Col span={8} key={room.id} style={{ marginBottom: 16 }}>
                    <Card
                      size="small"
                      style={{ borderRadius: 8, borderTop: `3px solid ${roomStatusLabels[room.status].color}` }}
                      extra={
                        <Space>
                          <Button type="text" size="small" icon={<IconEdit />} onClick={() => handleEditRoom(room)} />
                          <Popconfirm title="确定删除?" onOk={() => handleDeleteRoom(room.id)}>
                            <Button type="text" size="small" status="danger" icon={<IconDelete />} />
                          </Popconfirm>
                        </Space>
                      }
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{room.name}</span>
                        <Tag color={roomStatusLabels[room.status].color}>{roomStatusLabels[room.status].label}</Tag>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 8 }}>
                        <div><IconLocation style={{ marginRight: 4 }} /> {room.location}</div>
                        <div><IconUserGroup style={{ marginRight: 4 }} /> 容量 {room.capacity} 人</div>
                      </div>
                      <Space size={4} wrap>
                        {room.equipment.map(e => <Tag key={e} size="small">{e}</Tag>)}
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}

          {/* 会议记录 Tab */}
          {activeTab === 'minutes' && (
            <div>
              {mockMinutes.length === 0 ? (
                <Typography.Paragraph style={{ textAlign: 'center', color: 'var(--color-text-3)', padding: '40px 0' }}>
                  暂无会议记录
                </Typography.Paragraph>
              ) : (
                mockMinutes.map(min => (
                  <Card key={min.id} size="small" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Title heading={6} style={{ margin: 0 }}><IconEdit style={{ marginRight: 4 }} /> {min.meetingTitle}</Title>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{min.date}</Typography.Text>
                    </div>

                    {min.decisions.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <Typography.Text style={{ fontWeight: 600, fontSize: 13 }}>决议事项：</Typography.Text>
                        <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                          {min.decisions.map((d, i) => <li key={i} style={{ fontSize: 13 }}>{d}</li>)}
                        </ul>
                      </div>
                    )}

                    {min.actionItems.length > 0 && (
                      <div>
                        <Typography.Text style={{ fontWeight: 600, fontSize: 13 }}>行动项：</Typography.Text>
                        <Table
                          size="small"
                          columns={[
                            { title: '任务', dataIndex: 'task', width: 200 },
                            { title: '负责人', dataIndex: 'owner', width: 70 },
                            { title: '截止日期', dataIndex: 'deadline', width: 100 },
                            {
                              title: '状态', dataIndex: 'done', width: 70,
                              render: (done: boolean) => done ? <Tag color="var(--success-500)" size="small">已完成</Tag> : <Tag color="var(--warning-500)" size="small">待办</Tag>,
                            },
                          ] as any}
                          data={min.actionItems}
                          rowKey={(item, idx) => `${min.id}-${idx}`}
                          pagination={false}
                          style={{ marginTop: 8 }}
                        />
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </Card>

      {/* 会议室弹窗 */}
      <Modal
        title={editingRoom ? '编辑会议室' : '新增会议室'}
        visible={roomModalVisible}
        onOk={handleRoomSubmit}
        onCancel={() => setRoomModalVisible(false)}
        autoFocus={false}
        focusLock={true}
        style={{ width: 500 }}
      >
        <Form form={roomForm} layout="vertical">
          <FormItem label="名称" field="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：会议室 A" />
          </FormItem>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="容量" field="capacity" rules={[{ required: true, message: '请输入容量' }]}>
                <Input type="number" placeholder="人数" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="状态" field="status" rules={[{ required: true }]}>
                <Select placeholder="选择状态">
                  <SelectOption value="available">空闲</SelectOption>
                  <SelectOption value="occupied">使用中</SelectOption>
                  <SelectOption value="maintenance">维护中</SelectOption>
                </Select>
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <FormItem label="位置" field="location" rules={[{ required: true, message: '请输入位置' }]}>
            <Input placeholder="如：3楼东侧" />
          </FormItem>
          <FormItem label="设备" field="equipment">
            <Select mode="tags" placeholder="输入设备后回车" />
          </FormItem>
        </Form>
      </Modal>

      {/* 会议弹窗 */}
      <Modal
        title={editingMeeting ? '编辑会议' : '预约会议'}
        visible={meetingModalVisible}
        onOk={handleMeetingSubmit}
        onCancel={() => setMeetingModalVisible(false)}
        autoFocus={false}
        focusLock={true}
        style={{ width: 560 }}
      >
        <Form form={meetingForm} layout="vertical">
          <FormItem label="会议主题" field="title" rules={[{ required: true, message: '请输入主题' }]}>
            <Input placeholder="会议主题" />
          </FormItem>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="会议室" field="roomName" rules={[{ required: true, message: '请选择会议室' }]}>
                <Select placeholder="选择会议室">
                  {rooms.filter(r => r.status === 'available').map(r => (
                    <SelectOption key={r.id} value={r.name}>{r.name}（{r.capacity}人）</SelectOption>
                  ))}
                </Select>
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="优先级" field="priority" initialValue="normal">
                <Select>
                  <SelectOption value="high">高</SelectOption>
                  <SelectOption value="normal">普通</SelectOption>
                  <SelectOption value="low">低</SelectOption>
                </Select>
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="开始时间" field="startTime" rules={[{ required: true }]}>
                <DatePicker showTime placeholder="选择开始时间" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="结束时间" field="endTime" rules={[{ required: true }]}>
                <DatePicker showTime placeholder="选择结束时间" style={{ width: '100%' }} />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <FormItem label="组织人" field="organizer" rules={[{ required: true, message: '请输入组织人' }]}>
            <Input placeholder="组织人姓名" />
          </FormItem>
          <FormItem label="参会人" field="attendees">
            <Select mode="tags" placeholder="输入参会人后回车" />
          </FormItem>
          <FormItem label="议程" field="agenda">
            <Input.TextArea placeholder="会议议程" autoSize={{ minRows: 3, maxRows: 6 }} />
          </FormItem>
        </Form>
      </Modal>
    </Space>
  );
}
