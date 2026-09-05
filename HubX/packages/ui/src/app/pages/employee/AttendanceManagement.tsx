import { useState, useMemo } from 'react';
import {
  Card,
  Empty,
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
  Tooltip,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconCheck,
  IconClose,
  IconRefresh,
} from '@arco-design/web-react/icon';
import { useEmployee } from './EmployeeContext';
import {
  AttendanceRecord,
  LeaveType,
  AttendanceStatus,
  ALL_LEAVE_TYPES,
} from './mockData';
import { FilterBar, PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import './employeeAdminConsistency.css';

const FormItem = Form.Item;
const { MonthPicker } = DatePicker;

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  '年假': 'var(--primary)',
  '事假': 'var(--warning-500)',
  '病假': 'var(--destructive-500)',
  '调休': 'var(--info-500)',
  '婚假': 'var(--chart-5)',
  '产假': 'var(--chart-5)',
  '丧假': 'var(--grey-400)',
  '加班': 'var(--success-500)',
};

const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  '已批准': 'var(--success-500)',
  '待审批': 'var(--warning-500)',
  '已拒绝': 'var(--destructive-500)',
  '已撤销': 'var(--grey-400)',
};

function getStatusColor(s: AttendanceStatus) {
  return ATTENDANCE_STATUS_COLORS[s] || 'var(--grey-400)';
}

export function AttendanceManagement() {
  const { attendance, employees, addAttendance, approveAttendance, rejectAttendance } = useEmployee();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [filterType, setFilterType] = useState<LeaveType | ''>('');
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | ''>('');
  const [filterMonth, setFilterMonth] = useState(currentMonth);

  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

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
    const thisMonthRecords = attendance.filter(r => r.startDate.startsWith(currentMonth) && r.status === '已批准');
    const totalLeaveDays = thisMonthRecords.filter(r => r.type !== '加班').reduce((sum, r) => sum + r.days, 0);
    const totalOvertimeHours = thisMonthRecords
      .filter(r => r.type === '加班')
      .reduce((sum, r) => sum + r.days * 8, 0);
    const pendingCount = attendance.filter(r => r.status === '待审批').length;
    const attendedEmployees = new Set<string>(thisMonthRecords.map(r => r.employeeId));
    return { totalLeaveDays, totalOvertimeHours, pendingCount, attendedCount: attendedEmployees.size };
  }, [attendance, currentMonth]);

  const filtersActive = Boolean(filterType || filterStatus || filterMonth !== currentMonth);

  const handleAdd = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const resetFilters = () => {
    setFilterMonth(currentMonth);
    setFilterType('');
    setFilterStatus('');
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
    { title: '开始日期', dataIndex: 'startDate', width: 130 },
    { title: '结束日期', dataIndex: 'endDate', width: 130 },
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
            <Tooltip content="批准">
              <Button
                className="hubx-icon-action"
                type="text"
                size="small"
                icon={<IconCheck />}
                style={{ color: 'var(--success-500)' }}
                aria-label={`批准${record.employeeName}的${record.type}申请`}
                onClick={() => handleApprove(record.id)}
              />
            </Tooltip>
            <Tooltip content="拒绝">
              <Button
                className="hubx-icon-action"
                type="text"
                size="small"
                icon={<IconClose />}
                status="danger"
                aria-label={`拒绝${record.employeeName}的${record.type}申请`}
                onClick={() => handleReject(record.id)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <PageShell
      className="employee-admin-page"
      breadcrumbs={[{ label: '员工管理', to: '/employees' }, { label: '考勤管理' }]}
    >
      <PageHeader
        title="考勤管理"
        description="集中处理请假、加班申请及审批状态，默认查看当前月份。"
        actions={<Button type="primary" icon={<IconPlus />} onClick={handleAdd}>新增申请</Button>}
      />

      <ProcessMetricGrid
        items={[
          { key: 'leave', label: '本月请假', value: `${stats.totalLeaveDays} 天`, detail: currentMonth },
          { key: 'overtime', label: '本月加班', value: `${stats.totalOvertimeHours} 小时`, detail: currentMonth, tone: 'success' },
          { key: 'pending', label: '待审批申请', value: `${stats.pendingCount} 条`, detail: '需要管理员处理', tone: stats.pendingCount ? 'warning' : 'neutral' },
          { key: 'employees', label: '涉及员工', value: `${stats.attendedCount} 人`, detail: '本月已批准记录' },
        ]}
      />

      <Card bordered={false} title="考勤申请" className="employee-admin-list-card">
        <FilterBar
          actions={filtersActive ? (
            <Button type="text" icon={<IconRefresh />} onClick={resetFilters}>重置筛选</Button>
          ) : undefined}
        >
          <MonthPicker
            className="employee-admin-month"
            placeholder="选择月份"
            value={filterMonth}
            onChange={(_, dateStr) => setFilterMonth(dateStr as string)}
          />
          <Select
            className="employee-admin-select"
            placeholder="类型（全部）"
            allowClear
            value={filterType || undefined}
            onChange={v => setFilterType(v as LeaveType | '')}
          >
            {ALL_LEAVE_TYPES.map(t => (
              <Select.Option key={t} value={t}>{t}</Select.Option>
            ))}
          </Select>
          <Select
            className="employee-admin-select"
            placeholder="状态（全部）"
            allowClear
            value={filterStatus || undefined}
            onChange={v => setFilterStatus(v as AttendanceStatus | '')}
          >
            {(['已批准', '待审批', '已拒绝', '已撤销'] as AttendanceStatus[]).map(s => (
              <Select.Option key={s} value={s}>{s}</Select.Option>
            ))}
          </Select>
        </FilterBar>
        <div className="employee-admin-result-summary">
          <span>共 {filteredRecords.length} 条申请</span>
          <span>{filterMonth || '全部月份'}</span>
        </div>
        <Table
          columns={columns as any}
          data={filteredRecords}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: true }}
          scroll={{ x: 900 }}
          noDataElement={<Empty description="没有符合当前条件的考勤申请" />}
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
            <Select placeholder="请选择申请人">
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
    </PageShell>
  );
}
