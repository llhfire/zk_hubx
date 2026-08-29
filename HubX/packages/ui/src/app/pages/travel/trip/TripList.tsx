import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Button,
  Input,
  Tag,
  Modal,
  Select,
  Table,
  Message,
  Space,
  Typography,
  Tooltip,
} from '@arco-design/web-react';
import {
  IconSearch,
  IconPlus,
  IconLocation,
  IconCalendar,
} from '@arco-design/web-react/icon';
import { CheckCircle, Eye, PaperPlaneTilt, Play, Stop, Trash } from '@phosphor-icons/react';
import type { Trip, TripStatus } from '../types';
import { getTripList, submitTrip, approveTrip, startTrip, endTrip, deleteTrip } from '../travel-api';
import { FilterBar, PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';

const { Text } = Typography;
const { Option } = Select;

const statusConfig: Record<TripStatus, { color: string; text: string }> = {
  draft: { color: 'gray', text: '草稿' },
  pending: { color: 'orange', text: '待审批' },
  approved: { color: 'green', text: '已通过' },
  in_progress: { color: 'blue', text: '进行中' },
  to_reimburse: { color: 'purple', text: '待报销' },
  closed: { color: 'gray', text: '已关闭' },
  rejected: { color: 'red', text: '已拒绝' },
  cancelled: { color: 'gray', text: '已取消' },
};

export function TripList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tripList, setTripList] = useState<Trip[]>([]);
  const [total, setTotal] = useState(0);
  const [searchForm, setSearchForm] = useState({
    keyword: '',
    status: '' as TripStatus | '',
    startDate: '',
    endDate: '',
  });

  // 审批弹窗
  const [approvalVisible, setApprovalVisible] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // 加载数据
  const loadTrips = async (filters = searchForm) => {
    setLoading(true);
    try {
      const result = await getTripList({
        keyword: filters.keyword || undefined,
        status: (filters.status as TripStatus) || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setTripList(result.list);
      setTotal(result.total);
    } catch (error) {
      Message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  // 搜索
  const handleSearch = () => {
    loadTrips();
  };

  // 重置
  const handleReset = () => {
    const emptyFilters = { keyword: '', status: '' as TripStatus | '', startDate: '', endDate: '' };
    setSearchForm(emptyFilters);
    loadTrips(emptyFilters);
  };

  // 新建出差申请
  const handleCreate = () => {
    navigate('/travel/trips/new');
  };

  // 查看详情
  const handleViewDetail = (trip: Trip) => {
    navigate(`/travel/trips/${trip.id}`);
  };

  // 提交申请
  const handleSubmit = async (trip: Trip) => {
    try {
      await submitTrip(trip.id);
      Message.success('出差申请已提交');
      loadTrips();
    } catch (error) {
      Message.error('提交失败');
    }
  };

  // 审批
  const handleApprove = async () => {
    if (!approvalComment.trim()) {
      Message.error('请填写审批意见');
      return;
    }
    try {
      await approveTrip(selectedTrip!.id, approvalAction, approvalComment);
      Message.success(`审批${approvalAction === 'approve' ? '通过' : '不通过'}成功`);
      setApprovalVisible(false);
      setApprovalComment('');
      loadTrips();
    } catch (error) {
      Message.error('审批失败');
    }
  };

  // 开始出差
  const handleStartTrip = async (trip: Trip) => {
    try {
      await startTrip(trip.id);
      Message.success('已标记为进行中');
      loadTrips();
    } catch (error) {
      Message.error('操作失败');
    }
  };

  // 结束出差
  const handleEndTrip = async (trip: Trip) => {
    try {
      await endTrip(trip.id);
      Message.success('已标记为待报销');
      loadTrips();
    } catch (error) {
      Message.error('操作失败');
    }
  };

  // 删除
  const handleDelete = async (trip: Trip) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除出差单 ${trip.tripNo} 吗？`,
      onOk: async () => {
        try {
          await deleteTrip(trip.id);
          Message.success('删除成功');
          loadTrips();
        } catch (error) {
          Message.error('删除失败');
        }
      },
    });
  };

  // 渲染操作按钮
  const renderActions = (_: unknown, record: Trip) => {
    const actions = [];

    // 查看详情（始终显示）
    actions.push(
      <Tooltip key="view" content="查看详情">
        <Button className="hubx-icon-action" type="text" size="small" aria-label={`查看出差单${record.tripNo}`} icon={<Eye size={18} />} onClick={() => handleViewDetail(record)} />
      </Tooltip>
    );

    // 草稿状态
    if (record.status === 'draft') {
      actions.push(
        <Tooltip key="submit" content="提交">
          <Button className="hubx-icon-action" type="text" size="small" aria-label={`提交出差单${record.tripNo}`} icon={<PaperPlaneTilt size={18} />} onClick={() => handleSubmit(record)} />
        </Tooltip>
      );
      actions.push(
        <Tooltip key="delete" content="删除">
          <Button className="hubx-icon-action" type="text" size="small" status="danger" aria-label={`删除出差单${record.tripNo}`} icon={<Trash size={18} />} onClick={() => handleDelete(record)} />
        </Tooltip>
      );
    }

    // 待审批状态（管理员/审批人视角）
    if (record.status === 'pending') {
      actions.push(
        <Tooltip key="approve" content="审批">
          <Button
            type="text"
            size="small"
            className="hubx-icon-action"
            aria-label={`审批出差单${record.tripNo}`}
            icon={<CheckCircle size={18} />}
            onClick={() => {
              setSelectedTrip(record);
              setApprovalAction('approve');
              setApprovalVisible(true);
            }}
          />
        </Tooltip>
      );
    }

    // 已通过状态
    if (record.status === 'approved') {
      actions.push(
        <Tooltip key="start" content="开始出差">
          <Button className="hubx-icon-action" type="text" size="small" aria-label={`开始出差单${record.tripNo}`} icon={<Play size={18} />} onClick={() => handleStartTrip(record)} />
        </Tooltip>
      );
    }

    // 进行中状态
    if (record.status === 'in_progress') {
      actions.push(
        <Tooltip key="end" content="结束出差">
          <Button className="hubx-icon-action" type="text" size="small" aria-label={`结束出差单${record.tripNo}`} icon={<Stop size={18} />} onClick={() => handleEndTrip(record)} />
        </Tooltip>
      );
    }

    return <Space>{actions}</Space>;
  };

  const columns = [
    {
      title: '出差单号',
      dataIndex: 'tripNo',
      width: 150,
      render: (value: string) => <Text style={{ fontWeight: 500 }}>{value}</Text>,
    },
    {
      title: '申请人',
      dataIndex: 'applicantName',
      width: 100,
    },
    {
      title: '部门',
      dataIndex: 'department',
      width: 100,
    },
    {
      title: '目的地',
      dataIndex: 'destinations',
      width: 150,
      render: (value: string[]) => (
        <Space size={4}>
          <IconLocation style={{ color: 'var(--color-text-3)' }} />
          <span>{value?.join('、')}</span>
        </Space>
      ),
    },
    {
      title: '出发日期',
      dataIndex: 'startDate',
      width: 120,
      render: (value: string) => (
        <Space size={4} style={{ whiteSpace: 'nowrap' }}>
          <IconCalendar style={{ color: 'var(--color-text-3)' }} />
          <span>{value}</span>
        </Space>
      ),
    },
    {
      title: '返回日期',
      dataIndex: 'endDate',
      width: 120,
    },
    {
      title: '天数',
      dataIndex: 'days',
      width: 80,
      render: (value: number) => `${value}天`,
    },
    {
      title: '关联客户',
      dataIndex: 'customerName',
      width: 150,
      render: (value: string) => value || '-',
    },
    {
      title: '关联项目',
      dataIndex: 'projectName',
      width: 150,
      render: (value: string) => value || '-',
    },
    {
      title: '预计费用',
      dataIndex: 'estimatedTotalCost',
      width: 120,
      render: (value: number) => (
        <span style={{ whiteSpace: 'nowrap' }}>¥{value?.toLocaleString()}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: TripStatus) => (
        <Tag color={statusConfig[value].color}>
          {statusConfig[value].text}
        </Tag>
      ),
    },
    {
      title: '操作',
      width: 112,
      fixed: 'right' as const,
      render: renderActions,
    },
  ];

  const filtersActive = Boolean(searchForm.keyword || searchForm.status || searchForm.startDate || searchForm.endDate);
  const pendingCount = tripList.filter((item) => item.status === 'pending').length;
  const approvedCount = tripList.filter((item) => item.status === 'approved').length;
  const activeCount = tripList.filter((item) => item.status === 'in_progress').length;
  const reimburseCount = tripList.filter((item) => item.status === 'to_reimburse').length;
  const estimatedAmount = tripList.reduce((sum, item) => sum + (item.estimatedTotalCost || 0), 0);

  return (
    <PageShell>
      <PageHeader
        title="出差申请"
        description="集中查询出差计划、审批进度、执行状态与预计费用。"
        actions={<Button type="primary" icon={<IconPlus />} onClick={handleCreate}>新建出差申请</Button>}
      />

      <ProcessMetricGrid items={[
        { key: 'total', label: '出差申请', value: `${total} 单`, detail: filtersActive ? '当前查询结果' : '全部出差单' },
        { key: 'pending', label: '待审批', value: `${pendingCount} 单`, detail: '等待审批人处理', tone: pendingCount > 0 ? 'warning' : 'success' },
        { key: 'active', label: '执行中', value: `${activeCount} 单`, detail: `待出发 ${approvedCount} 单`, tone: activeCount > 0 ? 'success' : 'neutral' },
        { key: 'amount', label: '预计费用', value: `¥${estimatedAmount.toLocaleString()}`, detail: `待报销 ${reimburseCount} 单` },
      ]} />

      {/* 搜索栏 */}
      <Card>
        <FilterBar actions={filtersActive ? <Button type="text" onClick={handleReset}>重置筛选</Button> : <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>共 {total} 条</span>}>
          <Input
            style={{ width: 200 }}
            placeholder="搜索出差单号/申请人/目的地"
            value={searchForm.keyword}
            onChange={(value) => setSearchForm({ ...searchForm, keyword: value })}
          />
          <Select
            style={{ width: 150 }}
            placeholder="选择状态"
            value={searchForm.status || undefined}
            onChange={(value) => setSearchForm({ ...searchForm, status: value as TripStatus | '' })}
            allowClear
          >
            <Option value="draft">草稿</Option>
            <Option value="pending">待审批</Option>
            <Option value="approved">已通过</Option>
            <Option value="in_progress">进行中</Option>
            <Option value="to_reimburse">待报销</Option>
            <Option value="closed">已关闭</Option>
            <Option value="rejected">已拒绝</Option>
          </Select>
          <Input
            type="date"
            style={{ width: 140 }}
            value={searchForm.startDate}
            onChange={(value) => setSearchForm({ ...searchForm, startDate: value })}
          />
          <Input
            type="date"
            style={{ width: 140 }}
            value={searchForm.endDate}
            onChange={(value) => setSearchForm({ ...searchForm, endDate: value })}
          />
          <Button type="primary" icon={<IconSearch />} onClick={handleSearch}>
            搜索
          </Button>
        </FilterBar>
      </Card>

      {/* 列表 */}
      <Card title="出差申请列表">
        <Table
          columns={columns}
          data={tripList}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1412 }}
          pagination={{
            total,
            pageSize: 10,
            showTotal: true,
          }}
        />
      </Card>

      {/* 审批弹窗 */}
      <Modal
        title={approvalAction === 'approve' ? '审批通过' : '审批不通过'}
        visible={approvalVisible}
        onOk={handleApprove}
        onCancel={() => {
          setApprovalVisible(false);
          setApprovalComment('');
        }}
        okText="确认"
        cancelText="取消"
      >
        {selectedTrip && (
          <div style={{ padding: 12, background: 'var(--color-fill-1)', borderRadius: 4, marginBottom: 16 }}>
            <div>
              <Text style={{ fontWeight: 500 }}>{selectedTrip.applicantName}</Text> 的出差申请
            </div>
            <div style={{ color: 'var(--color-text-3)', marginTop: 4 }}>
              目的地：{selectedTrip.destinations.join('、')} | 日期：{selectedTrip.startDate} ~ {selectedTrip.endDate}
            </div>
          </div>
        )}
        <div>
          <div style={{ marginBottom: 8 }}>审批意见</div>
          <Input.TextArea
            placeholder={
              approvalAction === 'approve'
                ? '请填写审批意见（如：同意出差申请）'
                : '请填写不通过的理由（如：出差计划不合理，请重新调整）'
            }
            rows={4}
            value={approvalComment}
            onChange={setApprovalComment}
          />
        </div>
      </Modal>
    </PageShell>
  );
}
