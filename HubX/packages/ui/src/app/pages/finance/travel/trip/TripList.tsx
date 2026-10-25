import { useState, useEffect, useMemo } from 'react';
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
  DatePicker,
  Radio,
  Checkbox,
  Badge,
} from '@arco-design/web-react';
import {
  IconSearch,
  IconPlus,
  IconRefresh,
  IconCheck,
  IconClose,
  IconThunderbolt,
} from '@arco-design/web-react/icon';
import {
  CheckCircle,
  Eye,
  PaperPlaneTilt,
  Play,
  Stop,
  Trash,
  Airplane,
  Train,
  Car,
  Buildings,
  Briefcase,
  ArrowRight,
  CalendarBlank,
  CreditCard,
  User,
} from '@phosphor-icons/react';
import type { Trip, TripStatus, TransportMode } from '../types';
import {
  getTripList,
  submitTrip,
  approveTrip,
  startTrip,
  endTrip,
  deleteTrip,
} from '../travel-api';
import { FilterBar, PageHeader, PageShell, ProcessMetricGrid } from '../../../../components/ui';
import './tripList.css';

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const statusConfig: Record<TripStatus, { color: string; text: string }> = {
  draft: { color: 'gray', text: '草稿' },
  pending: { color: 'orange', text: '待审批' },
  approved: { color: 'green', text: '已通过' },
  in_progress: { color: 'arcoblue', text: '进行中' },
  to_reimburse: { color: 'purple', text: '待报销' },
  closed: { color: 'gray', text: '已关闭' },
  rejected: { color: 'red', text: '已拒绝' },
  cancelled: { color: 'gray', text: '已取消' },
};

// 快捷审批常用语
const APPROVAL_PRESETS = [
  '行程合规，准予出差',
  '预算在合理标准内，同意申请',
  '材料齐全，准予出差并支持预支备用金',
  '行程计划不合理，请调整后重新提交',
  '请补充行前审批依据与客户邀请函',
];

export function TripList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // 筛选表单
  const [searchForm, setSearchForm] = useState({
    keyword: '',
    status: '' as TripStatus | '',
    startDate: '',
    endDate: '',
    department: '',
    onlyNeedLoan: false,
  });

  // 审批弹窗
  const [approvalVisible, setApprovalVisible] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // 加载数据
  const loadTrips = async () => {
    setLoading(true);
    try {
      // 获取全量列表以供统计与筛选
      const result = await getTripList();
      setAllTrips(result.list);
    } catch {
      Message.error('加载出差申请数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  // 客户端实时派生过滤列表
  const filteredTrips = useMemo(() => {
    return allTrips.filter((item) => {
      // 关键字搜索：单号、申请人、目的地、事由、客户名、项目名
      if (searchForm.keyword.trim()) {
        const kw = searchForm.keyword.toLowerCase();
        const matchNo = item.tripNo.toLowerCase().includes(kw);
        const matchName = item.applicantName.toLowerCase().includes(kw);
        const matchDest = item.destinations.some((d) => d.toLowerCase().includes(kw));
        const matchPurpose = item.purpose?.toLowerCase().includes(kw);
        const matchCust = item.customerName?.toLowerCase().includes(kw);
        const matchProj = item.projectName?.toLowerCase().includes(kw);
        if (!matchNo && !matchName && !matchDest && !matchPurpose && !matchCust && !matchProj) {
          return false;
        }
      }

      // 状态筛选
      if (searchForm.status && item.status !== searchForm.status) {
        return false;
      }

      // 部门筛选
      if (searchForm.department && item.department !== searchForm.department) {
        return false;
      }

      // 日期范围
      if (searchForm.startDate && item.startDate < searchForm.startDate) {
        return false;
      }
      if (searchForm.endDate && item.endDate > searchForm.endDate) {
        return false;
      }

      // 仅看有借款
      if (searchForm.onlyNeedLoan && !item.needLoan) {
        return false;
      }

      return true;
    });
  }, [allTrips, searchForm]);

  // 各状态计数统计
  const total = allTrips.length;
  const pendingCount = allTrips.filter((t) => t.status === 'pending').length;
  const approvedCount = allTrips.filter((t) => t.status === 'approved').length;
  const activeCount = allTrips.filter((t) => t.status === 'in_progress').length;
  const reimburseCount = allTrips.filter((t) => t.status === 'to_reimburse').length;
  const draftCount = allTrips.filter((t) => t.status === 'draft').length;
  const loanCount = allTrips.filter((t) => t.needLoan).length;
  const estimatedAmount = filteredTrips.reduce((sum, item) => sum + (item.estimatedTotalCost || 0), 0);

  const filtersActive = Boolean(
    searchForm.keyword ||
    searchForm.status ||
    searchForm.startDate ||
    searchForm.endDate ||
    searchForm.department ||
    searchForm.onlyNeedLoan
  );

  // 重置筛选
  const handleReset = () => {
    setSearchForm({
      keyword: '',
      status: '',
      startDate: '',
      endDate: '',
      department: '',
      onlyNeedLoan: false,
    });
  };

  // 通过指标卡或状态条快捷筛选状态
  const handleFilterByStatus = (status: TripStatus | '') => {
    setSearchForm((prev) => ({ ...prev, status }));
  };

  // 新建出差申请
  const handleCreate = () => {
    navigate('/travel/trips/new');
  };

  // 查看详情
  const handleViewDetail = (trip: Trip) => {
    navigate(`/travel/trips/${trip.id}`);
  };

  // 提交草稿
  const handleSubmit = async (trip: Trip) => {
    try {
      await submitTrip(trip.id);
      Message.success(`出差单 ${trip.tripNo} 已提交审批`);
      loadTrips();
    } catch {
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
      Message.success(`出差单 ${selectedTrip?.tripNo} 审批${approvalAction === 'approve' ? '通过' : '已驳回'}`);
      setApprovalVisible(false);
      setApprovalComment('');
      loadTrips();
    } catch {
      Message.error('审批操作失败');
    }
  };

  // 开始出差
  const handleStartTrip = async (trip: Trip) => {
    try {
      await startTrip(trip.id);
      Message.success(`出差单 ${trip.tripNo} 已标记为「进行中」`);
      loadTrips();
    } catch {
      Message.error('操作失败');
    }
  };

  // 结束出差
  const handleEndTrip = async (trip: Trip) => {
    try {
      await endTrip(trip.id);
      Message.success(`出差单 ${trip.tripNo} 已标记为「待报销」`);
      loadTrips();
    } catch {
      Message.error('操作失败');
    }
  };

  // 删除草稿
  const handleDelete = async (trip: Trip) => {
    Modal.confirm({
      title: '确认删除出差单',
      content: `确定要删除草稿出差单「${trip.tripNo}」吗？此操作不可恢复。`,
      onOk: async () => {
        try {
          await deleteTrip(trip.id);
          Message.success('删除成功');
          loadTrips();
        } catch {
          Message.error('删除失败');
        }
      },
    });
  };

  // 获取交通方式对应图标
  const renderTransportIcon = (mode?: TransportMode) => {
    switch (mode) {
      case 'airplane':
        return <Airplane size={14} weight="fill" style={{ color: '#165dff' }} />;
      case 'high_speed_rail':
      case 'bullet_train':
        return <Train size={14} weight="fill" style={{ color: '#00b42a' }} />;
      case 'self_drive':
        return <Car size={14} weight="fill" style={{ color: '#ff7d00' }} />;
      default:
        return <Train size={14} weight="fill" style={{ color: '#86909c' }} />;
    }
  };

  // 渲染操作按钮
  const renderActions = (_: unknown, record: Trip) => {
    return (
      <Space size={4}>
        {/* 查看详情（始终显示） */}
        <Tooltip content="查看详情">
          <Button
            className="hubx-icon-action"
            type="text"
            size="small"
            aria-label={`查看出差单${record.tripNo}`}
            icon={<Eye size={17} />}
            onClick={() => handleViewDetail(record)}
          />
        </Tooltip>

        {/* 草稿状态 */}
        {record.status === 'draft' && (
          <>
            <Tooltip content="提交审批">
              <Button
                className="hubx-icon-action"
                type="text"
                size="small"
                status="success"
                aria-label={`提交出差单${record.tripNo}`}
                icon={<PaperPlaneTilt size={17} />}
                onClick={() => handleSubmit(record)}
              />
            </Tooltip>
            <Tooltip content="删除草稿">
              <Button
                className="hubx-icon-action"
                type="text"
                size="small"
                status="danger"
                aria-label={`删除出差单${record.tripNo}`}
                icon={<Trash size={17} />}
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          </>
        )}

        {/* 待审批状态 */}
        {record.status === 'pending' && (
          <Tooltip content="审批处理">
            <Button
              type="text"
              size="small"
              className="hubx-icon-action"
              status="warning"
              aria-label={`审批出差单${record.tripNo}`}
              icon={<CheckCircle size={17} />}
              onClick={() => {
                setSelectedTrip(record);
                setApprovalAction('approve');
                setApprovalComment('行程合规，准予出差');
                setApprovalVisible(true);
              }}
            />
          </Tooltip>
        )}

        {/* 已通过状态 */}
        {record.status === 'approved' && (
          <Tooltip content="开始出差">
            <Button
              className="hubx-icon-action"
              type="text"
              size="small"
              status="success"
              aria-label={`开始出差单${record.tripNo}`}
              icon={<Play size={17} />}
              onClick={() => handleStartTrip(record)}
            />
          </Tooltip>
        )}

        {/* 进行中状态 */}
        {record.status === 'in_progress' && (
          <Tooltip content="结束出差（转待报销）">
            <Button
              className="hubx-icon-action"
              type="text"
              size="small"
              aria-label={`结束出差单${record.tripNo}`}
              icon={<Stop size={17} />}
              onClick={() => handleEndTrip(record)}
            />
          </Tooltip>
        )}
      </Space>
    );
  };

  // 7 大高信息密度黄金列
  const columns = [
    {
      title: '出差单与事由',
      dataIndex: 'tripNo',
      width: 230,
      fixed: 'left' as const,
      render: (tripNo: string, record: Trip) => (
        <div className="trip-cell-no-wrap">
          <span
            className="trip-cell-link"
            onClick={() => handleViewDetail(record)}
            title="点击查看出差全景详情"
          >
            {tripNo}
          </span>
          <div className="trip-cell-purpose" title={record.purpose}>
            {record.purpose || '无出差事由'}
          </div>
        </div>
      ),
    },
    {
      title: '申请人 / 归属',
      dataIndex: 'applicantName',
      width: 130,
      render: (name: string, record: Trip) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--color-text-1)' }}>
            {name}
          </div>
          <Tag size="small" color="arcoblue" style={{ padding: '0 6px', fontSize: 11, width: 'fit-content' }}>
            {record.department || '未分配'}
          </Tag>
        </div>
      ),
    },
    {
      title: '行程轨迹与周期',
      dataIndex: 'destinations',
      width: 210,
      render: (destinations: string[], record: Trip) => {
        const dest = destinations?.join('、') || '未定目的地';
        const primaryTransport = record.transportModes?.[0] || 'high_speed_rail';
        return (
          <div className="trip-cell-journey">
            <div className="trip-cell-journey__route">
              <span>北京</span>
              <ArrowRight size={13} weight="bold" style={{ color: 'var(--color-text-3)' }} />
              <span style={{ color: 'rgb(var(--primary-6))' }}>{dest}</span>
              <span style={{ marginLeft: 4 }}>{renderTransportIcon(primaryTransport)}</span>
            </div>
            <div className="trip-cell-journey__date">
              <CalendarBlank size={13} style={{ color: 'var(--color-text-3)' }} />
              <span>
                {record.startDate?.slice(5)} ~ {record.endDate?.slice(5)} · {record.days}天
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: '关联业务载体',
      dataIndex: 'customerName',
      width: 200,
      render: (_: unknown, record: Trip) => {
        const hasCustomer = Boolean(record.customerName);
        const hasProject = Boolean(record.projectName);
        if (!hasCustomer && !hasProject) {
          return <span style={{ color: 'var(--color-text-4)' }}>-</span>;
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {hasCustomer && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: 'var(--color-text-1)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={record.customerName}
              >
                <Buildings size={14} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
                <span>{record.customerName}</span>
              </div>
            )}
            {hasProject && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: 'var(--color-text-3)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={record.projectName}
              >
                <Briefcase size={14} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
                <span>{record.projectName}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '预计费用 / 借款',
      dataIndex: 'estimatedTotalCost',
      width: 160,
      render: (cost: number, record: Trip) => (
        <div className="trip-cell-cost">
          <div className="trip-cell-cost__total">
            ¥{(cost || 0).toLocaleString()}
          </div>
          {record.needLoan ? (
            <Tag size="small" color="orange" style={{ padding: '0 6px', width: 'fit-content' }}>
              借款 ¥{(record.loanAmount || 0).toLocaleString()}
            </Tag>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>无备用借款</span>
          )}
        </div>
      ),
    },
    {
      title: '当前状态',
      dataIndex: 'status',
      width: 110,
      render: (status: TripStatus) => {
        const conf = statusConfig[status] || { color: 'gray', text: status };
        return (
          <Tag color={conf.color} style={{ display: 'inline-flex', alignItems: 'center' }}>
            {status === 'in_progress' && <span className="trip-status-pulse" />}
            {conf.text}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      width: 130,
      fixed: 'right' as const,
      render: renderActions,
    },
  ];

  return (
    <PageShell className="trip-list-page">
      <PageHeader
        title="出差申请"
        description="集中统筹出差计划、审批流转、行程跟踪与差旅预借备用金结算。"
        actions={
          <Space>
            <Button icon={<IconRefresh />} onClick={loadTrips}>
              刷新
            </Button>
            <Button type="primary" icon={<IconPlus />} onClick={handleCreate}>
              新建出差申请
            </Button>
          </Space>
        }
      />

      {/* 顶部指标卡：支持点击直接筛选状态 */}
      <ProcessMetricGrid
        items={[
          {
            key: 'all',
            label: '出差申请总数',
            value: `${total} 单`,
            detail: searchForm.status === '' ? '✓ 正在显示全部' : '点击查看全部',
            onClick: () => handleFilterByStatus(''),
            tone: searchForm.status === '' ? 'neutral' : undefined,
          },
          {
            key: 'pending',
            label: '待我审批',
            value: `${pendingCount} 单`,
            detail: searchForm.status === 'pending' ? '✓ 正在筛选待审批' : '点击快速待审批',
            tone: pendingCount > 0 ? 'warning' : 'neutral',
            onClick: () => handleFilterByStatus('pending'),
          },
          {
            key: 'active',
            label: '执行中 / 待出发',
            value: `${activeCount} 单`,
            detail: `待出发 ${approvedCount} 单`,
            tone: activeCount > 0 ? 'success' : 'neutral',
            onClick: () => handleFilterByStatus('in_progress'),
          },
          {
            key: 'to_reimburse',
            label: '待报销单据',
            value: `${reimburseCount} 单`,
            detail: searchForm.status === 'to_reimburse' ? '✓ 正在筛选待报销' : '点击待报销单',
            tone: reimburseCount > 0 ? 'neutral' : 'neutral',
            onClick: () => handleFilterByStatus('to_reimburse'),
          },
          {
            key: 'amount',
            label: '预计费用总额',
            value: `¥${estimatedAmount.toLocaleString()}`,
            detail: `涉及借款 ${loanCount} 单`,
          },
        ]}
      />

      {/* 现代化搜索与快速状态切换卡 */}
      <Card className="trip-list-filter-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 状态快捷分段胶囊 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <Radio.Group
              type="button"
              value={searchForm.status}
              onChange={(val) => handleFilterByStatus(val as TripStatus | '')}
            >
              <Radio value="">全部 ({total})</Radio>
              <Radio value="pending">
                待审批 {pendingCount > 0 && <Badge count={pendingCount} style={{ marginLeft: 4 }} />}
              </Radio>
              <Radio value="approved">已通过 ({approvedCount})</Radio>
              <Radio value="in_progress">进行中 ({activeCount})</Radio>
              <Radio value="to_reimburse">待报销 ({reimburseCount})</Radio>
              <Radio value="draft">草稿 ({draftCount})</Radio>
            </Radio.Group>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {filtersActive && (
                <Button type="text" status="warning" onClick={handleReset}>
                  重置筛选条件
                </Button>
              )}
              <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                找到 <strong>{filteredTrips.length}</strong> 条符合条件的单据
              </span>
            </div>
          </div>

          {/* 细粒度筛选字段 */}
          <FilterBar>
            <Input
              style={{ width: 220 }}
              placeholder="搜索单号 / 申请人 / 目的地 / 事由"
              value={searchForm.keyword}
              allowClear
              prefix={<IconSearch />}
              onChange={(val) => setSearchForm((prev) => ({ ...prev, keyword: val }))}
            />

            <Select
              style={{ width: 140 }}
              placeholder="所属部门"
              allowClear
              value={searchForm.department || undefined}
              onChange={(val) => setSearchForm((prev) => ({ ...prev, department: val || '' }))}
            >
              <Option value="销售部">销售部</Option>
              <Option value="技术部">技术部</Option>
              <Option value="市场部">市场部</Option>
              <Option value="行政部">行政部</Option>
              <Option value="财务部">财务部</Option>
              <Option value="产品部">产品部</Option>
            </Select>

            {/* RangePicker 的 onChange 是 (dateString: string[], date: Dayjs[])：第一个参数才是
                格式化后的字符串。原写法取的是第二个参数（Dayjs 对象），把 Dayjs 塞进了 string
                字段，搜索条件因此永远匹配不上。 */}
            <RangePicker
              style={{ width: 240 }}
              value={[searchForm.startDate, searchForm.endDate]}
              onChange={(dateStrings) => {
                setSearchForm((prev) => ({
                  ...prev,
                  startDate: dateStrings[0] || '',
                  endDate: dateStrings[1] || '',
                }));
              }}
            />

            <Checkbox
              checked={searchForm.onlyNeedLoan}
              onChange={(checked) => setSearchForm((prev) => ({ ...prev, onlyNeedLoan: checked }))}
            >
              仅看有借款
            </Checkbox>
          </FilterBar>
        </div>
      </Card>

      {/* 列表主体卡片 */}
      <Card
        className="trip-list-table-card"
        title="出差申请明细台账"
        extra={
          selectedRowKeys.length > 0 && (
            <Space>
              <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
                已勾选 {selectedRowKeys.length} 项
              </span>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>
                取消勾选
              </Button>
            </Space>
          )
        }
      >
        <Table
          columns={columns}
          data={filteredTrips}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1100 }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
          }}
          pagination={{
            total: filteredTrips.length,
            pageSize: 10,
            showTotal: true,
            sizeCanChange: true,
          }}
        />
      </Card>

      {/* 强化版审批弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600 }}>
              {approvalAction === 'approve' ? '审批通过出差申请' : '驳回出差申请'}
            </span>
            {selectedTrip && <Tag size="small">{selectedTrip.tripNo}</Tag>}
          </div>
        }
        visible={approvalVisible}
        onOk={handleApprove}
        onCancel={() => {
          setApprovalVisible(false);
          setApprovalComment('');
        }}
        okText={approvalAction === 'approve' ? '确认通过' : '确认驳回'}
        okButtonProps={{ status: approvalAction === 'approve' ? 'success' : 'danger' }}
        cancelText="取消"
        style={{ width: 520 }}
      >
        {selectedTrip && (
          <div className="trip-approval-preview-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={16} weight="bold" style={{ color: 'rgb(var(--primary-6))' }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{selectedTrip.applicantName}</span>
                <Tag size="small" color="arcoblue">{selectedTrip.department}</Tag>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'rgb(var(--primary-6))' }}>
                ¥{selectedTrip.estimatedTotalCost?.toLocaleString()}
              </div>
            </div>

            <div className="trip-approval-preview-grid">
              <div>
                <span style={{ color: 'var(--color-text-3)' }}>行程路线：</span>
                北京 ➔ {selectedTrip.destinations.join('、')}
              </div>
              <div>
                <span style={{ color: 'var(--color-text-3)' }}>出差周期：</span>
                {selectedTrip.startDate} ~ {selectedTrip.endDate} ({selectedTrip.days}天)
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--color-text-3)' }}>出差事由：</span>
                {selectedTrip.purpose || '无'}
              </div>
              {selectedTrip.needLoan && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--color-text-3)' }}>预借备用金：</span>
                  <Tag color="orange" size="small">
                    ¥{selectedTrip.loanAmount?.toLocaleString()}（{selectedTrip.loanReason || '差旅备用金'}）
                  </Tag>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-1)' }}>
              审批核决意见 <span style={{ color: '#f53f3f' }}>*</span>
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
              支持点击下方常用短语一键填入
            </span>
          </div>

          <Input.TextArea
            placeholder="请填写审批核决意见..."
            rows={3}
            value={approvalComment}
            onChange={setApprovalComment}
          />

          <div className="trip-approval-quick-comments">
            <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>快捷评语：</span>
            {APPROVAL_PRESETS.map((preset) => (
              <span
                key={preset}
                className="trip-approval-quick-pill"
                onClick={() => setApprovalComment(preset)}
              >
                + {preset}
              </span>
            ))}
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
