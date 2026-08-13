import { useState, useMemo } from 'react';
import {
  Card,
  Grid,
  Statistic,
  Table,
  Button,
  Space,
  Tag,
  Select,
  DatePicker,
  Modal,
  Form,
  Input,
  Radio,
  Message,
  Typography,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconCheck,
  IconCalendar,
  IconClockCircle,
  IconExclamationCircle,
} from '@arco-design/web-react/icon';
import { useEmployee } from './EmployeeContext';
import {
  AttendanceRecord,
  LeaveType,
  AttendanceStatus,
  ALL_LEAVE_TYPES,
  ALL_EMPLOYMENT_STATUSES,
} from './mockData';

const Row = Grid.Row;
const Col = Grid.Col;
const FormItem = Form.Item;
const { MonthPicker } = DatePicker;

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  '年假': '#165dff',
  '事假': '#ff7d00',
  '病假': '#f53f3f',
  '调休': '#0fc6c2',
  '婚宴': '#eb2f96',
  '产宴': '#eb2f96',
  '丧宴': '#86909c',
  '加班': '#00b42a',
};

const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  '已批准': '#00b42a',
  '待审批': '#ff7d00',
  '已拒绝': '#f53f3f',
  '已撤销': '#86909c',
};

function getStatusColor(s: AttendanceStatus) {
  return ATTENDANCE_STATUS_COLORS[s] || '#86909c';
}

export function AttendanceManagement() {
  const { attendance, employees, addAttendance, approveAttendance, rejectAttendance } = useEmployee();

  const [filterType, setFilterType] = useState<LeaveType | ''>('');
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | ''>('');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // 筛选
  const filteredRecords = useMemo(() => {
    return attendance.filter(r => {
      if (filterType && r.type !== filterType) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterMonth && !r.startDate.startsWith(filterMonth)) return false;
      return true;
    });
  }, [attendance, filterType, filterStatus, filterMonth]);

  // 摘要
  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const thisMonthRecords = attendance.filter(r => r.startDate.startsWith(thisMonth) && r.status === '已批准');
    const totalLeaveDays = thisMonthRecords.filter(r => r.type !== '加班').reduce((sum, r) => sum + r.days, 0);
    const totalOvertimeHours = thisMonthRecords
      .filter(r => r.type === '加班')
      .reduce((sum, r) => sum + r.days * 8, 0);
    const pendingCount = attendance.filter(r => r.status === '待审批').length;
    const attendedEmployees = new Set<string>(thisMonthRecords.map(r => r.employeeId));
    return { totalLeaveDays, totalOvertimeHours, pendingCount, attendedCount: attendedEmployees.size };
  }, [attendance]);

  const handleAdd = () => {
    form.resetFields();
    setSelectedEmployeeId('');
    setModalVisible(true);
  };

  const handleSubmit = () => {
    form.validate().then(values => {
      addAttendance({
        employeeId: values.employeeId,
        employeeName: employees.find(e => e.id === values.employeeId)?.name || '',
        type: values.type,
        startDate: values.dateRange[0],
        endDate: values.dateRange[1],
        days: values.days,
        reason: values.reason,
        status: '待审批',
        createdAt: new Date().toISOString().slice(0, 10),
      });
      Message.success('申请已提交，等待审批');
      setModalVisible(false);
    });
  };

  const handleApprove = (id: string) => {
    approveAttendance(id, '当前管理员');
    Message.success('已批准');
  };

  const handleReject = (id: string) => {
    rejectAttendance(id, '当前管理员');
    Message.success('已拒绝');
  };

  const columns = [
    { title: '申请人', dataIndex: 'employeeName', width: 80 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 70,
      render: (t: LeaveType) => (
        <Tag color={LEAVE_TYPE_COLORS[t]}>{t}</Tag>
      ),
    },
    { title: '开始日期', dataIndex: 'startDate', width: 110 },
    { title: '结束日期', dataIndex: 'endDate', width: 110 },
    { title: '天数', dataIndex: 'days', width: 60, render: (d: number) => `${d}天` },
    { title: '事由', dataIndex: 'reason', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: AttendanceStatus) => (
        <Tag color={getStatusColor(s)}>{s}</Tag>
      ),
    },
    {
      title: '操作',
      width: 130,
      render: (_: unknown, record: AttendanceRecord) => {
        if (record.status !== '待审批') return <span style={{ color: 'var(--color-text-3)' }}>—</span>;
        return (
          <Space>
            <Button type="text" size="small" style={{ color: '#00b42a' }} onClick={() => handleApprove(record.id)}>
              批准
            </Button>
            <Button type="text" size="small" status="danger" onClick={() => handleReject(record.id)}>
              拒绝
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 摘要栏 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ color: 'var(--color-text-2)' }}>本月请假天数</span>}
              value={stats.totalLeaveDays}
              prefix={<IconCalendar style={{ color: '#ff7d00' }} />}
              suffix="天"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ color: 'var(--color-text-2)' }}>本月加班时长</span>}
              value={stats.totalOvertimeHours}
              prefix={<IconClockCircle style={{ color: '#00b42a' }} />}
              suffix="小时"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ color: 'var(--color-text-2)' }}>待审批申请</span>}
              value={stats.pendingCount}
              prefix={<IconExclamationCircle style={{ color: '#ff7d00' }} />}
              suffix="条"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span style={{ color: 'var(--color-text-2)' }}>本月有考勤记录</span>}
              value={stats.attendedCount}
              prefix={<IconCheck style={{ color: 'rgb(var(--primary-6))' }} />}
              suffix="人"
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选 + 列表 */}
      <Card bordered={false}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <MonthPicker
            style={{ width: 150 }}
            placeholder="选择月份"
            value={filterMonth}
            onChange={(_, dateStr) => setFilterMonth(dateStr as string)}
          />
          <Select
            style={{ width: 120 }}
            placeholder="全部类型"
            allowClear
            value={filterType}
            onChange={v => setFilterType(v as LeaveType | '')}
          >
            {ALL_LEAVE_TYPES.map(t => (
              <Select.Option key={t} value={t}>{t}</Select.Option>
            ))}
          </Select>
          <Select
            style={{ width: 120 }}
            placeholder="全部状态"
            allowClear
            value={filterStatus}
            onChange={v => setFilterStatus(v as AttendanceStatus | '')}
          >
            {(['已批准', '待审批', '已拒绝', '已撤销'] as AttendanceStatus[]).map(s => (
              <Select.Option key={s} value={s}>{s}</Select.Option>
            ))}
          </Select>
          <div style={{ marginLeft: 'auto' }}>
            <Button type="primary" icon={<IconPlus />} onClick={handleAdd}>
              新增申请
            </Button>
          </div>
        </div>
        <Table
          columns={columns as any}
          data={filteredRecords}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: true }}
        />
      </Card>

      {/* 新增申请弹窗 */}
      <Modal
        title={<Space><IconPlus /><span>新增请假/加班申请</span></Space>}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        autoFocus={false}
        focusLock={true}
      >
        <Form form={form} layout="vertical">
          <FormItem label="申请人" field="employeeId" rules={[{ required: true, message: '请选择申请人' }]}>
            <Select placeholder="请选择申请人" onChange={setSelectedEmployeeId}>
              {employees
                .filter(e => e.employmentStatus !== '已离职')
                .map(e => (
                  <Select.Option key={e.id} value={e.id}>
                    {e.name}（{e.department}/{e.position}）
                  </Select.Option>
                ))}
            </Select>
          </FormItem>
          <FormItem label="类型" field="type" rules={[{ required: true, message: '请选择类型' }]}>
            <Radio.Group>
              <Space wrap>
                {ALL_LEAVE_TYPES.map(t => (
                  <Radio key={t} value={t}>{t}</Radio>
                ))}
              </Space>
            </Radio.Group>
          </FormItem>
          <FormItem label="日期范围" field="dateRange" rules={[{ required: true, message: '请选择日期范围' }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </FormItem>
          <FormItem
            label="天数"
            field="days"
            rules={[
              { required: true, message: '请输入天数' },
              { match: /^\d+(\.5)?$/, message: '请输入数字（可带 .5）' },
            ]}
          >
            <Input placeholder="如 1, 0.5, 3" suffix="天" />
          </FormItem>
          <FormItem label="事由" field="reason" rules={[{ required: true, message: '请输入事由' }]}>
            <Input.TextArea placeholder="请输入请假/加班事由" autoSize={{ minRows: 3, maxRows: 6 }} />
          </FormItem>
        </Form>
      </Modal>
    </Space>
  );
}
