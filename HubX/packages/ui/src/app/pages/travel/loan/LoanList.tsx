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
} from '@arco-design/web-react/icon';
import type { Loan, LoanStatus } from '../types';
import { getLoanList, approveLoan, payLoan } from '../travel-api';
import { FilterBar, PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const statusConfig: Record<LoanStatus, { color: string; text: string }> = {
  draft: { color: 'gray', text: '草稿' },
  pending: { color: 'orange', text: '待审批' },
  approved: { color: 'green', text: '已通过' },
  paid: { color: 'green', text: '已打款' },
  offset: { color: 'blue', text: '已冲抵' },
  settled: { color: 'green', text: '已结清' },
  rejected: { color: 'red', text: '已拒绝' },
  cancelled: { color: 'gray', text: '已取消' },
};

export function LoanList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loanList, setLoanList] = useState<Loan[]>([]);
  const [total, setTotal] = useState(0);
  const [searchForm, setSearchForm] = useState({
    keyword: '',
    status: '' as LoanStatus | '',
    startDate: '',
    endDate: '',
  });

  // 审批弹窗
  const [approvalVisible, setApprovalVisible] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false);

  // 加载数据
  const loadLoans = async (filters = searchForm) => {
    setLoading(true);
    try {
      const result = await getLoanList({
        keyword: filters.keyword || undefined,
        status: (filters.status as LoanStatus) || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setLoanList(result.list);
      setTotal(result.total);
    } catch (error) {
      Message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  // 搜索
  const handleSearch = () => {
    loadLoans();
  };

  // 重置
  const handleReset = () => {
    const emptyFilters = { keyword: '', status: '' as LoanStatus | '', startDate: '', endDate: '' };
    setSearchForm(emptyFilters);
    loadLoans(emptyFilters);
  };

  // 查看详情
  const handleViewDetail = (loan: Loan) => {
    setSelectedLoan(loan);
    setDetailVisible(true);
  };

  // 审批
  const handleApprove = async () => {
    if (!approvalComment.trim()) {
      Message.error('请填写审批意见');
      return;
    }
    try {
      await approveLoan(selectedLoan!.id, approvalAction, approvalComment);
      Message.success(`审批${approvalAction === 'approve' ? '通过' : '不通过'}成功`);
      setApprovalVisible(false);
      setApprovalComment('');
      loadLoans();
    } catch (error) {
      Message.error('审批失败');
    }
  };

  // 打款
  const handlePay = async (loan: Loan) => {
    try {
      await payLoan(loan.id);
      Message.success('打款成功');
      loadLoans();
    } catch (error) {
      Message.error('打款失败');
    }
  };

  // 渲染操作按钮
  const renderActions = (_: unknown, record: Loan) => {
    const actions = [];

    actions.push(
      <Tooltip key="view" content="查看详情">
        <Button className="hubx-icon-action" type="text" size="small" aria-label={`查看借款单${record.loanNo}`} icon={<IconEye />} onClick={() => handleViewDetail(record)} />
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
            aria-label={`审批借款单${record.loanNo}`}
            icon={<IconCheck />}
            onClick={() => {
              setSelectedLoan(record);
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
        <Tooltip key="pay" content="确认打款">
          <Button className="hubx-icon-action" type="text" size="small" aria-label={`确认借款单${record.loanNo}打款`} icon={<IconStorage />} onClick={() => handlePay(record)} />
        </Tooltip>
      );
    }

    return <Space>{actions}</Space>;
  };

  const columns = [
    {
      title: '借款单号',
      dataIndex: 'loanNo',
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
      title: '借款类型',
      dataIndex: 'type',
      width: 100,
      render: (value: string) => (
        <Tag>
          {value === 'travel' ? '差旅借款' : value === 'petty_cash' ? '备用金' : '其他'}
        </Tag>
      ),
    },
    {
      title: '借款金额',
      dataIndex: 'amount',
      width: 120,
      render: (value: number) => (
        <Space size={4}>
          <IconStorage style={{ color: 'var(--color-text-3)' }} />
          <span>¥{value.toLocaleString()}</span>
        </Space>
      ),
    },
    {
      title: '已冲抵',
      dataIndex: 'offsetAmount',
      width: 100,
      render: (value: number) => (
        value > 0 ? <span style={{ color: 'rgb(var(--success-6))' }}>¥{value.toLocaleString()}</span> : '-'
      ),
    },
    {
      title: '剩余金额',
      dataIndex: 'remainingAmount',
      width: 120,
      render: (value: number) => <Text style={{ fontWeight: 500 }}>¥{value.toLocaleString()}</Text>,
    },
    {
      title: '关联出差单',
      dataIndex: 'tripNo',
      width: 150,
      render: (value: string) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: LoanStatus) => (
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

  const filtersActive = Boolean(searchForm.keyword || searchForm.status || searchForm.startDate || searchForm.endDate);
  const pendingCount = loanList.filter((item) => item.status === 'pending').length;
  const payableCount = loanList.filter((item) => item.status === 'approved').length;
  const offsettingCount = loanList.filter((item) => item.status === 'paid' || item.status === 'offset').length;
  const remainingAmount = loanList.reduce((sum, item) => sum + item.remainingAmount, 0);

  return (
    <PageShell>
      <PageHeader
        title="借款管理"
        description="集中查询借款申请、审批、打款与报销冲抵状态。"
        actions={<Button type="primary" icon={<IconPlus />} onClick={() => navigate('/travel/loans/new')}>新增借款</Button>}
      />

      <ProcessMetricGrid items={[
        { key: 'total', label: '借款申请', value: `${total} 单`, detail: filtersActive ? '当前查询结果' : '全部借款单' },
        { key: 'pending', label: '待审批', value: `${pendingCount} 单`, detail: '等待审批人处理', tone: pendingCount > 0 ? 'warning' : 'success' },
        { key: 'payable', label: '待打款', value: `${payableCount} 单`, detail: '审批通过待付款', tone: payableCount > 0 ? 'warning' : 'success' },
        { key: 'remaining', label: '未冲抵余额', value: `¥${remainingAmount.toLocaleString()}`, detail: `冲抵处理中 ${offsettingCount} 单` },
      ]} />

      {/* 搜索栏 */}
      <Card>
        <FilterBar actions={filtersActive ? <Button type="text" onClick={handleReset}>重置筛选</Button> : <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>共 {total} 条</span>}>
          <Input
            style={{ width: 200 }}
            placeholder="搜索借款单号/申请人"
            value={searchForm.keyword}
            onChange={(value) => setSearchForm({ ...searchForm, keyword: value })}
          />
          <Select
            style={{ width: 150 }}
            placeholder="选择状态"
            value={searchForm.status || undefined}
            onChange={(value) => setSearchForm({ ...searchForm, status: value as LoanStatus | '' })}
            allowClear
          >
            <Option value="draft">草稿</Option>
            <Option value="pending">待审批</Option>
            <Option value="approved">已通过</Option>
            <Option value="paid">已打款</Option>
            <Option value="offset">已冲抵</Option>
            <Option value="settled">已结清</Option>
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
      <Card title="借款申请列表">
        <Table
          columns={columns}
          data={loanList}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1300 }}
          pagination={{
            total,
            pageSize: 10,
            showTotal: true,
          }}
        />
      </Card>

      {/* 详情抽屉 */}
      <Drawer
        title="借款申请详情"
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={640}
      >
        {selectedLoan && (
          <div>
            <Grid.Row gutter={16} style={{ marginBottom: 24 }}>
              <Grid.Col span={12}>
                <div><Text type="secondary">借款单号</Text></div>
                <div style={{ fontWeight: 500 }}>{selectedLoan.loanNo}</div>
              </Grid.Col>
              <Grid.Col span={12}>
                <div><Text type="secondary">申请人</Text></div>
                <div style={{ fontWeight: 500 }}>{selectedLoan.applicantName}</div>
              </Grid.Col>
              <Grid.Col span={12}>
                <div><Text type="secondary">部门</Text></div>
                <div style={{ fontWeight: 500 }}>{selectedLoan.department}</div>
              </Grid.Col>
              <Grid.Col span={12}>
                <div><Text type="secondary">借款类型</Text></div>
                <div style={{ fontWeight: 500 }}>
                  {selectedLoan.type === 'travel' ? '差旅借款' : selectedLoan.type === 'petty_cash' ? '备用金' : '其他'}
                </div>
              </Grid.Col>
              <Grid.Col span={12}>
                <div><Text type="secondary">借款金额</Text></div>
                <div style={{ fontWeight: 500, color: 'rgb(var(--primary-6))' }}>¥{selectedLoan.amount.toLocaleString()}</div>
              </Grid.Col>
              <Grid.Col span={12}>
                <div><Text type="secondary">已冲抵</Text></div>
                <div style={{ fontWeight: 500 }}>
                  {selectedLoan.offsetAmount > 0 ? (
                    <span style={{ color: 'rgb(var(--success-6))' }}>¥{selectedLoan.offsetAmount.toLocaleString()}</span>
                  ) : '¥0'}
                </div>
              </Grid.Col>
              <Grid.Col span={12}>
                <div><Text type="secondary">剩余金额</Text></div>
                <div style={{ fontWeight: 500, color: 'rgb(var(--warning-6))' }}>¥{selectedLoan.remainingAmount.toLocaleString()}</div>
              </Grid.Col>
              <Grid.Col span={12}>
                <div><Text type="secondary">关联出差单</Text></div>
                <div style={{ fontWeight: 500 }}>{selectedLoan.tripNo || '-'}</div>
              </Grid.Col>
              <Grid.Col span={12}>
                <div><Text type="secondary">借款理由</Text></div>
                <div style={{ fontWeight: 500 }}>{selectedLoan.reason}</div>
              </Grid.Col>
              <Grid.Col span={12}>
                <div><Text type="secondary">打款方式</Text></div>
                <div style={{ fontWeight: 500 }}>
                  {selectedLoan.payMethod === 'bank' ? '银行转账' : selectedLoan.payMethod === 'cash' ? '现金' : '其他'}
                </div>
              </Grid.Col>
            </Grid.Row>

            <Card title="审批流程" size="small" style={{ marginBottom: 24 }}>
              <Tag color="arcoblue" style={{ marginBottom: 12 }}>
                当前节点：{{
                  draft: '草稿',
                  pending: '部门审批',
                  approved: '待打款',
                  paid: '待冲抵',
                  offset: '冲抵处理中',
                  settled: '已结清',
                  rejected: '已驳回',
                  cancelled: '已取消',
                }[selectedLoan.status]}
              </Tag>
              <Timeline>
                {(selectedLoan.approvalRecords ?? []).map(record => (
                  <Timeline.Item key={record.id} label={record.time}>
                    <Space direction="vertical" size={2}>
                      <strong>{record.step} · {record.approver}</strong>
                      <span>{record.comment || statusConfig[selectedLoan.status].text}</span>
                    </Space>
                  </Timeline.Item>
                ))}
                {(selectedLoan.approvalRecords ?? []).length === 0 && (
                  <Timeline.Item>申请已提交，等待当前节点处理。</Timeline.Item>
                )}
              </Timeline>
            </Card>

            {/* 审批按钮 */}
            {selectedLoan.status === 'pending' && (
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
                ? '请填写审批意见（如：同意借款）'
                : '请填写不通过的理由（如：借款金额过大，请重新评估）'
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
