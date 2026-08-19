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
} from '@arco-design/web-react/icon';
import type { Loan, LoanStatus } from '../types';
import { getLoanList, approveLoan, payLoan } from '../travel-api';

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
  const loadLoans = async () => {
    setLoading(true);
    try {
      const result = await getLoanList({
        keyword: searchForm.keyword || undefined,
        status: (searchForm.status as LoanStatus) || undefined,
        startDate: searchForm.startDate || undefined,
        endDate: searchForm.endDate || undefined,
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
    setSearchForm({ keyword: '', status: '', startDate: '', endDate: '' });
    loadLoans();
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
            setSelectedLoan(record);
            setApprovalAction('approve');
            setApprovalVisible(true);
          }}
        >
          审批
        </Button>
      );
    }

    // 已通过状态
    if (record.status === 'approved') {
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
          <IconStorage style={{ color: '#86909c' }} />
          <span>¥{value.toLocaleString()}</span>
        </Space>
      ),
    },
    {
      title: '已冲抵',
      dataIndex: 'offsetAmount',
      width: 100,
      render: (value: number) => (
        value > 0 ? <span style={{ color: '#00b42a' }}>¥{value.toLocaleString()}</span> : '-'
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

  return (
    <div style={{ padding: 16 }}>
      {/* 搜索栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
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
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      {/* 列表 */}
      <Card
        title="借款申请列表"
        extra={
          <Button type="primary" icon={<IconPlus />} onClick={() => navigate('/travel/loans/new')}>
            新增借款
          </Button>
        }
      >
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

      {/* 详情弹窗 */}
      <Modal
        title="借款申请详情"
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        style={{ width: 600 }}
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
                <div style={{ fontWeight: 500, color: '#165dff' }}>¥{selectedLoan.amount.toLocaleString()}</div>
              </Grid.Col>
              <Grid.Col span={12}>
                <div><Text type="secondary">已冲抵</Text></div>
                <div style={{ fontWeight: 500 }}>
                  {selectedLoan.offsetAmount > 0 ? (
                    <span style={{ color: '#00b42a' }}>¥{selectedLoan.offsetAmount.toLocaleString()}</span>
                  ) : '¥0'}
                </div>
              </Grid.Col>
              <Grid.Col span={12}>
                <div><Text type="secondary">剩余金额</Text></div>
                <div style={{ fontWeight: 500, color: '#ff7d00' }}>¥{selectedLoan.remainingAmount.toLocaleString()}</div>
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
                ? '请填写审批意见（如：同意借款）'
                : '请填写不通过的理由（如：借款金额过大，请重新评估）'
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
