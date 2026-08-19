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
  const loadReimbursements = async () => {
    setLoading(true);
    try {
      const result = await getReimbursementList({
        keyword: searchForm.keyword || undefined,
        status: (searchForm.status as ReimbursementStatus) || undefined,
        startDate: searchForm.startDate || undefined,
        endDate: searchForm.endDate || undefined,
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
    setSearchForm({ keyword: '', status: '', startDate: '', endDate: '' });
    loadReimbursements();
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
      <Button key="view" type="text" size="small" icon={<IconEye />} onClick={() => handleViewDetail(record)}>
        查看
      </Button>
    );

    // 待审批状态
    if (record.status === 'pending') {
      actions.push(
        <Button
          key="approve"
          type="text"
          size="small"
          onClick={() => {
            setSelectedReimbursement(record);
            setApprovalAction('approve');
            setApprovalVisible(true);
          }}
        >
          审批
        </Button>
      );
    }

    // 财务已审状态
    if (record.status === 'finance_approved') {
      actions.push(
        <Button key="pay" type="text" size="small" onClick={() => handlePay(record)}>
          打款
        </Button>
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

  return (
    <div style={{ padding: 16 }}>
      {/* AI 稽核看板 */}
      {auditOpen && <FinanceAuditDashboard />}

      {/* 搜索栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            style={{ width: 200 }}
            placeholder="搜索报销单号/申请人"
            value={searchForm.keyword}
            onChange={(value) => setSearchForm({ ...searchForm, keyword: value })}
          />
          <Button onClick={() => setAuditOpen(!auditOpen)}>
            <IconSafe style={{ color: '#722ed1', marginRight: 4 }} />
            {auditOpen ? '收起' : 'AI 稽核看板'}
          </Button>
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
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      {/* 列表 */}
      <Card
        title="报销申请列表"
        extra={
          <Button type="primary" icon={<IconPlus />} onClick={() => Message.info('请先在出差详情页的费用管理中添加费用，再提交报销')}>
            新增报销
          </Button>
        }
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

      {/* 详情弹窗 */}
      <Modal
        title="报销申请详情"
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        style={{ width: 900 }}
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
                    <span style={{ color: '#ff7d00' }}>-¥{selectedReimbursement.offsetAmount.toLocaleString()}</span>
                  ) : '¥0'}
                </div>
              </Grid.Col>
              <Grid.Col span={6}>
                <div><Text type="secondary">实付金额</Text></div>
                <div style={{ fontWeight: 500, color: '#165dff' }}>¥{selectedReimbursement.netAmount.toLocaleString()}</div>
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
      </Modal>

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
    </div>
  );
}
