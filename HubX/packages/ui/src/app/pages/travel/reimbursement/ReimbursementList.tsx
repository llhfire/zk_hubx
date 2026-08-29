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
  Space,
  Typography,
  Message,
  Grid,
  Drawer,
  Timeline,
  Tooltip,
} from '@arco-design/web-react';
import {
  IconSearch,
  IconPlus,
  IconCheck,
  IconClose,
  IconStorage,
  IconEye,
  IconDownload,
  IconSafe,
} from '@arco-design/web-react/icon';
import { FinanceAuditDashboard } from '../components/FinanceAuditDashboard';
import type { Reimbursement, ReimbursementStatus } from '../types';
import { getReimbursementList, approveReimbursement, payReimbursement } from '../travel-api';
import { FilterBar, PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import '../travelAdminConsistency.css';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const statusConfig: Record<ReimbursementStatus, { color: string; text: string }> = {
  draft: { color: 'gray', text: '草稿' },
  pending: { color: 'orange', text: '待审批' },
  dept_approved: { color: 'blue', text: '部门已审' },
  finance_approved: { color: 'blue', text: '财务已审' },
  paid: { color: 'green', text: '已打款' },
  completed: { color: 'green', text: '已完成' },
  rejected: { color: 'red', text: '已拒绝' },
};

export function ReimbursementList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reimbursementList, setReimbursementList] = useState<Reimbursement[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchForm, setSearchForm] = useState({
    keyword: '',
    status: '' as ReimbursementStatus | '',
    startDate: '',
    endDate: '',
  });

  // 审批弹窗
  const [approvalVisible, setApprovalVisible] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');
  const [selectedReimbursement, setSelectedReimbursement] = useState<Reimbursement | null>(null);

  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false);

  // 加载数据
  const loadReimbursements = async (filters = searchForm) => {
    setLoading(true);
    try {
      const result = await getReimbursementList({
        keyword: filters.keyword || undefined,
        status: (filters.status as ReimbursementStatus) || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setReimbursementList(result.list);
      setTotal(result.total);
    } catch (error) {
      Message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReimbursements();
  }, []);

  // 搜索
  const handleSearch = () => {
    loadReimbursements();
  };

  // 重置
  const handleReset = () => {
    const emptyFilters = { keyword: '', status: '' as ReimbursementStatus | '', startDate: '', endDate: '' };
    setSearchForm(emptyFilters);
    loadReimbursements(emptyFilters);
  };

  // 查看详情
  const handleViewDetail = (reimbursement: Reimbursement) => {
    setSelectedReimbursement(reimbursement);
    setDetailVisible(true);
  };

  // 审批
  const handleApprove = async () => {
    if (!approvalComment.trim()) {
      Message.error('请填写审批意见');
      return;
    }
    try {
      await approveReimbursement(selectedReimbursement!.id, approvalAction, approvalComment);
      Message.success(`审批${approvalAction === 'approve' ? '通过' : '不通过'}成功`);
      setApprovalVisible(false);
      setApprovalComment('');
      loadReimbursements();
    } catch (error) {
      Message.error('审批失败');
    }
  };

  // 打款
  const handlePay = async (reimbursement: Reimbursement) => {
    try {
      await payReimbursement(reimbursement.id);
      Message.success('打款成功');
      loadReimbursements();
    } catch (error) {
      Message.error('打款失败');
    }
  };

  // 渲染操作按钮
  const renderActions = (_: unknown, record: Reimbursement) => {
    const actions = [];

    actions.push(
      <Tooltip key="view" content="查看详情">
        <Button className="hubx-icon-action" type="text" size="small" aria-label={`查看报销单${record.reimbursementNo}`} icon={<IconEye />} onClick={() => handleViewDetail(record)} />
      </Tooltip>
    );

    // 待审批状态
    if (record.status === 'pending') {
      actions.push(
        <Tooltip key="approve" content="审批">
          <Button
            type="text"
            size="small"
            className="hubx-icon-action"
            aria-label={`审批报销单${record.reimbursementNo}`}
            icon={<IconCheck />}
            onClick={() => {
              setSelectedReimbursement(record);
              setApprovalAction('approve');
              setApprovalVisible(true);
            }}
          />
        </Tooltip>
      );
    }

    // 财务已审状态
    if (record.status === 'finance_approved') {
      actions.push(
        <Tooltip key="pay" content="确认打款">
          <Button className="hubx-icon-action" type="text" size="small" aria-label={`确认报销单${record.reimbursementNo}打款`} icon={<IconStorage />} onClick={() => handlePay(record)} />
        </Tooltip>
      );
    }

    return <Space>{actions}</Space>;
  };

  const columns = [
    {
      title: '报销单号',
      dataIndex: 'reimbursementNo',
      width: 150,
      render: (value: string) => <Text style={{ fontWeight: 500 }}>{value}</Text>,
    },
    {
      title: '关联出差单',
      dataIndex: 'tripNo',
      width: 150,
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
      title: '报销金额',
      dataIndex: 'totalAmount',
      width: 120,
      render: (value: number) => (
        <Space size={4}>
          <IconStorage style={{ color: '#86909c' }} />
          <span>¥{value.toLocaleString()}</span>
        </Space>
      ),
    },
    {
      title: '冲抵借款',
      dataIndex: 'offsetAmount',
      width: 100,
      render: (value: number) => (
        value > 0 ? <span style={{ color: '#ff7d00' }}>-¥{value.toLocaleString()}</span> : '-'
      ),
    },
    {
      title: '实付金额',
      dataIndex: 'netAmount',
      width: 120,
      render: (value: number) => <Text style={{ fontWeight: 500 }}>¥{value.toLocaleString()}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: ReimbursementStatus) => (
        <Tag color={statusConfig[value].color}>
          {statusConfig[value].text}
        </Tag>
      ),
    },
    {
      title: '创建日期',
      dataIndex: 'createDate',
      width: 120,
    },
    {
      title: '操作',
      width: 150,
      fixed: 'right' as const,
      render: renderActions,
    },
  ];

  const pendingCount = reimbursementList.filter((item) => item.status === 'pending' || item.status === 'dept_approved').length;
  const payableCount = reimbursementList.filter((item) => item.status === 'finance_approved').length;
  const completedCount = reimbursementList.filter((item) => item.status === 'paid' || item.status === 'completed').length;
  const netAmount = reimbursementList.reduce((sum, item) => sum + item.netAmount, 0);
  const filtersActive = Boolean(searchForm.keyword || searchForm.status || searchForm.startDate || searchForm.endDate);

  return (
    <PageShell>
      <PageHeader
        title="报销管理"
        description="集中查询报销申请、审批状态、借款冲抵和实际打款金额。"
        actions={(
          <>
            <Button icon={<IconSafe />} onClick={() => setAuditOpen(!auditOpen)}>{auditOpen ? '收起 AI 稽核' : 'AI 稽核看板'}</Button>
            <Button type="primary" icon={<IconPlus />} onClick={() => Message.info('请先在出差详情页的费用管理中添加费用，再提交报销')}>新增报销</Button>
          </>
        )}
      />

      <ProcessMetricGrid items={[
        { key: 'total', label: '报销申请', value: `${total} 单`, detail: filtersActive ? '当前查询结果' : '全部报销单' },
        { key: 'pending', label: '待审批', value: `${pendingCount} 单`, detail: '部门或财务审批中', tone: pendingCount > 0 ? 'warning' : 'success' },
        { key: 'payable', label: '待打款', value: `${payableCount} 单`, detail: `已完成 ${completedCount} 单`, tone: payableCount > 0 ? 'warning' : 'success' },
        { key: 'amount', label: '列表实付金额', value: `¥${netAmount.toLocaleString()}`, detail: '已扣除借款冲抵' },
      ]} />

      {/* AI 稽核看板 */}
      {auditOpen && <FinanceAuditDashboard />}

      {/* 搜索栏 */}
      <Card>
        <FilterBar actions={filtersActive ? <Button type="text" onClick={handleReset}>重置筛选</Button> : <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>共 {total} 条</span>}>
          <Input
            style={{ width: 200 }}
            placeholder="搜索报销单号/申请人"
            value={searchForm.keyword}
            onChange={(value) => setSearchForm({ ...searchForm, keyword: value })}
          />
          <Select
            style={{ width: 150 }}
            placeholder="选择状态"
            value={searchForm.status || undefined}
            onChange={(value) => setSearchForm({ ...searchForm, status: value as ReimbursementStatus | '' })}
            allowClear
          >
            <Option value="draft">草稿</Option>
            <Option value="pending">待审批</Option>
            <Option value="dept_approved">部门已审</Option>
            <Option value="finance_approved">财务已审</Option>
            <Option value="paid">已打款</Option>
            <Option value="completed">已完成</Option>
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
      <Card
        title="报销申请列表"
      >
        <Table
          columns={columns}
          data={reimbursementList}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            total,
            pageSize: 10,
            showTotal: true,
          }}
        />
      </Card>

      {/* 详情抽屉 */}
      <Drawer
        title="报销申请详情"
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={900}
      >
        {selectedReimbursement && (
          <div>
            <Grid.Row gutter={16} style={{ marginBottom: 24 }}>
              <Grid.Col span={6}>
                <div><Text type="secondary">报销单号</Text></div>
                <div style={{ fontWeight: 500 }}>{selectedReimbursement.reimbursementNo}</div>
              </Grid.Col>
              <Grid.Col span={6}>
                <div><Text type="secondary">关联出差单</Text></div>
                <div style={{ fontWeight: 500 }}>{selectedReimbursement.tripNo}</div>
              </Grid.Col>
              <Grid.Col span={6}>
                <div><Text type="secondary">申请人</Text></div>
                <div style={{ fontWeight: 500 }}>{selectedReimbursement.applicantName}</div>
              </Grid.Col>
              <Grid.Col span={6}>
                <div><Text type="secondary">部门</Text></div>
                <div style={{ fontWeight: 500 }}>{selectedReimbursement.department}</div>
              </Grid.Col>
              <Grid.Col span={6}>
                <div><Text type="secondary">报销金额</Text></div>
                <div style={{ fontWeight: 500 }}>¥{selectedReimbursement.totalAmount.toLocaleString()}</div>
              </Grid.Col>
              <Grid.Col span={6}>
                <div><Text type="secondary">冲抵借款</Text></div>
                <div style={{ fontWeight: 500 }}>
                  {selectedReimbursement.offsetAmount > 0 ? (
                    <span style={{ color: 'rgb(var(--warning-6))' }}>-¥{selectedReimbursement.offsetAmount.toLocaleString()}</span>
                  ) : '¥0'}
                </div>
              </Grid.Col>
              <Grid.Col span={6}>
                <div><Text type="secondary">实付金额</Text></div>
                <div style={{ fontWeight: 500, color: 'rgb(var(--primary-6))' }}>¥{selectedReimbursement.netAmount.toLocaleString()}</div>
              </Grid.Col>
              <Grid.Col span={6}>
                <div><Text type="secondary">状态</Text></div>
                <div>
                  <Tag color={statusConfig[selectedReimbursement.status].color}>
                    {statusConfig[selectedReimbursement.status].text}
                  </Tag>
                </div>
              </Grid.Col>
            </Grid.Row>

            {/* 费用明细 */}
            <div style={{ marginBottom: 24 }}>
              <Text style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>费用明细</Text>
              <Table
                columns={[
                  { title: '费用类型', dataIndex: 'expenseType', width: 100, render: (v: string) => <Tag>{v}</Tag> },
                  { title: '说明', dataIndex: 'description' },
                  { title: '关联旅程段', dataIndex: 'itinerarySegmentDesc', width: 120 },
                  { title: '金额', dataIndex: 'amount', width: 100, align: 'right' as const, render: (v: number) => `¥${v.toLocaleString()}` },
                ]}
                data={selectedReimbursement.items}
                rowKey="id"
                pagination={false}
                summary={() => (
                  <Table.Summary>
                    <Table.Summary.Row>
                      <Table.Summary.Cell colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>合计</Table.Summary.Cell>
                      <Table.Summary.Cell style={{ textAlign: 'right', fontWeight: 600 }}>
                        ¥{selectedReimbursement.items.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </div>

            {/* 附件 */}
            {selectedReimbursement.attachments && selectedReimbursement.attachments.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <Text style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>附件列表</Text>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {selectedReimbursement.attachments.map((file) => (
                    <div
                      key={file.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 8,
                        background: '#f7f8fa',
                        borderRadius: 4,
                      }}
                    >
                      <Space>
                        <Text>{file.name}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>({file.size})</Text>
                      </Space>
                      <Button type="text" size="small" icon={<IconDownload />}>下载</Button>
                    </div>
                  ))}
                </Space>
              </div>
            )}

            <Card title="审批流程" size="small" style={{ marginBottom: 24 }}>
              <Tag color="arcoblue" style={{ marginBottom: 12 }}>
                当前节点：{{
                  pending: '部门审批',
                  dept_approved: '财务审批',
                  finance_approved: '待打款',
                  paid: '完成确认',
                  completed: '已完成',
                  rejected: '已驳回',
                  draft: '草稿',
                }[selectedReimbursement.status]}
              </Tag>
              <Timeline>
                {(selectedReimbursement.approvalRecords ?? []).map(record => (
                  <Timeline.Item key={record.id} label={record.time}>
                    <Space direction="vertical" size={2}>
                      <strong>{record.step} · {record.approver}</strong>
                      <span>{record.comment || statusConfig[selectedReimbursement.status].text}</span>
                    </Space>
                  </Timeline.Item>
                ))}
                {(selectedReimbursement.approvalRecords ?? []).length === 0 && (
                  <Timeline.Item>申请已提交，等待当前节点处理。</Timeline.Item>
                )}
              </Timeline>
            </Card>

            {/* 审批按钮 */}
            {selectedReimbursement.status === 'pending' && (
              <div style={{ textAlign: 'center' }}>
                <Space>
                  <Button
                    type="primary"
                    status="success"
                    icon={<IconCheck />}
                    onClick={() => {
                      setApprovalAction('approve');
                      setApprovalVisible(true);
                    }}
                  >
                    通过
                  </Button>
                  <Button
                    type="primary"
                    status="danger"
                    icon={<IconClose />}
                    onClick={() => {
                      setApprovalAction('reject');
                      setApprovalVisible(true);
                    }}
                  >
                    不通过
                  </Button>
                </Space>
              </div>
            )}
          </div>
        )}
      </Drawer>

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
        <div>
          <div style={{ marginBottom: 8 }}><Text>审批意见</Text></div>
          <TextArea
            placeholder={
              approvalAction === 'approve'
                ? '请填写审批意见（如：费用合理，同意报销）'
                : '请填写不通过的理由（如：费用超标，请重新核算）'
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
