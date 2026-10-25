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
  Space,
  Typography,
  Message,
  Grid,
  Drawer,
  Timeline,
  Tooltip,
  DatePicker,
  Radio,
  Checkbox,
  Badge,
  Progress,
  Form,
  InputNumber,
} from '@arco-design/web-react';
import {
  IconSearch,
  IconPlus,
  IconCheck,
  IconClose,
  IconEye,
  IconRefresh,
  IconFile,
  IconPrinter,
} from '@arco-design/web-react/icon';
import {
  Wallet,
  Bank,
  CheckCircle,
  FileText,
  Clock,
  Coins,
  ArrowsLeftRight,
  HandCoins,
} from '@phosphor-icons/react';
import type { Loan, LoanStatus } from '../types';
import { getLoanList, approveLoan, payLoan } from '../travel-api';
import { FilterBar, PageHeader, PageShell, ProcessMetricGrid } from '../../../../components/ui';
import './loanList.css';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Row, Col } = Grid;

const statusConfig: Record<LoanStatus, { color: string; text: string }> = {
  draft: { color: 'gray', text: '草稿' },
  pending: { color: 'orange', text: '待审批' },
  approved: { color: 'arcoblue', text: '待打款' },
  paid: { color: 'blue', text: '已打款' },
  offset: { color: 'cyan', text: '冲抵中' },
  settled: { color: 'green', text: '已结清' },
  rejected: { color: 'red', text: '已拒绝' },
  cancelled: { color: 'gray', text: '已取消' },
};

export function LoanList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [allLoans, setAllLoans] = useState<Loan[]>([]);

  // 筛选表单
  const [searchForm, setSearchForm] = useState({
    keyword: '',
    status: '' as LoanStatus | '',
    startDate: '',
    endDate: '',
    department: '',
    type: '' as 'travel' | 'petty_cash' | 'other' | '',
    onlyUnsettled: false,
  });

  // 审批弹窗
  const [approvalVisible, setApprovalVisible] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');

  // 详情抽屉
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // 新建借款弹窗与表单
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();

  const handleCreateLoan = async () => {
    try {
      const values = await createForm.validate();
      const now = new Date().toISOString().slice(0, 10);
      const amount = Number(values.amount);
      const newLoan: Loan = {
        id: `loan-${Date.now()}`,
        loanNo: `JK${Date.now().toString().slice(-8)}`,
        applicantId: values.applicantId || 'emp-current',
        applicantName: values.applicantName,
        department: values.department,
        tripId: values.tripId || 'TRIP-2026-001',
        tripNo: values.tripNo || 'BT20260428001',
        type: values.type || 'travel',
        amount,
        remainingAmount: amount,
        repaymentPlan: {
          dueDate: values.expectedRepayDate || now,
          method: 'reimbursement_offset',
        },
        reason: values.reason,
        status: 'pending',
        createDate: now,
        updateDate: now,
        approvalRecords: [],
      };
      setAllLoans((prev) => [newLoan, ...prev]);
      Message.success('差旅备用借款申请已成功发起并进入审批流！');
      setCreateModalVisible(false);
      createForm.resetFields();
    } catch {
      // 验证未通过
    }
  };

  // 加载数据
  const loadLoans = async () => {
    setLoading(true);
    try {
      const result = await getLoanList();
      setAllLoans(result.list);
    } catch {
      Message.error('加载借款申请数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  // 派生过滤列表
  const filteredLoans = useMemo(() => {
    return allLoans.filter((item) => {
      // 关键字搜索：借款单号、出差单号、申请人、借款事由
      if (searchForm.keyword.trim()) {
        const kw = searchForm.keyword.toLowerCase();
        const matchNo = item.loanNo.toLowerCase().includes(kw);
        const matchTrip = item.tripNo.toLowerCase().includes(kw);
        const matchName = item.applicantName.toLowerCase().includes(kw);
        const matchReason = item.reason?.toLowerCase().includes(kw);
        if (!matchNo && !matchTrip && !matchName && !matchReason) {
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

      // 借款类型
      if (searchForm.type && item.type !== searchForm.type) {
        return false;
      }

      // 日期范围
      if (searchForm.startDate && item.createDate < searchForm.startDate) {
        return false;
      }
      if (searchForm.endDate && item.createDate > searchForm.endDate) {
        return false;
      }

      // 仅看未结清
      if (searchForm.onlyUnsettled && item.status === 'settled') {
        return false;
      }

      return true;
    });
  }, [allLoans, searchForm]);

  // 统计数据
  const total = allLoans.length;
  const pendingCount = allLoans.filter((item) => item.status === 'pending').length;
  const payableCount = allLoans.filter((item) => item.status === 'approved').length;
  const offsettingCount = allLoans.filter((item) => item.status === 'paid' || item.status === 'offset').length;
  const settledCount = allLoans.filter((item) => item.status === 'settled').length;
  const totalLoanAmount = filteredLoans.reduce((sum, item) => sum + item.amount, 0);
  const remainingAmount = filteredLoans.reduce((sum, item) => sum + item.remainingAmount, 0);

  const filtersActive = Boolean(
    searchForm.keyword ||
    searchForm.status ||
    searchForm.startDate ||
    searchForm.endDate ||
    searchForm.department ||
    searchForm.type ||
    searchForm.onlyUnsettled
  );

  // 重置筛选
  const handleReset = () => {
    setSearchForm({
      keyword: '',
      status: '',
      startDate: '',
      endDate: '',
      department: '',
      type: '',
      onlyUnsettled: false,
    });
  };

  // 通过指标卡快捷切换状态
  const handleFilterByStatus = (status: LoanStatus | '') => {
    setSearchForm((prev) => ({ ...prev, status }));
  };

  // 查看详情抽屉
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
      Message.success(`借款单 ${selectedLoan?.loanNo} 审批${approvalAction === 'approve' ? '通过' : '不通过'}成功`);
      setApprovalVisible(false);
      setApprovalComment('');
      if (selectedLoan) {
        selectedLoan.status = approvalAction === 'approve' ? 'approved' : 'rejected';
      }
      loadLoans();
    } catch {
      Message.error('审批操作失败');
    }
  };

  // 打款
  const handlePay = async (loan: Loan) => {
    try {
      await payLoan(loan.id);
      Message.success(`借款单 ${loan.loanNo} 已确认打款，借款已生效在途`);
      if (selectedLoan && selectedLoan.id === loan.id) {
        selectedLoan.status = 'paid';
      }
      loadLoans();
    } catch {
      Message.error('打款操作失败');
    }
  };

  // 渲染操作按钮
  const renderActions = (_: unknown, record: Loan) => {
    return (
      <Space size={4}>
        <Tooltip content="查看借款详情">
          <Button
            className="hubx-icon-action"
            type="text"
            size="small"
            aria-label={`查看借款单${record.loanNo}`}
            icon={<IconEye />}
            onClick={() => handleViewDetail(record)}
          />
        </Tooltip>

        {/* 待审批状态 */}
        {record.status === 'pending' && (
          <Tooltip content="审批处理">
            <Button
              type="text"
              size="small"
              className="hubx-icon-action"
              status="warning"
              aria-label={`审批借款单${record.loanNo}`}
              icon={<IconCheck />}
              onClick={() => {
                setSelectedLoan(record);
                setApprovalAction('approve');
                setApprovalComment('借款事由正当，准予借款');
                setApprovalVisible(true);
              }}
            />
          </Tooltip>
        )}

        {/* 待打款状态 */}
        {record.status === 'approved' && (
          <Tooltip content="确认打款出纳">
            <Button
              className="hubx-icon-action"
              type="text"
              size="small"
              status="success"
              aria-label={`确认借款单${record.loanNo}打款`}
              icon={<Bank size={16} weight="duotone" />}
              onClick={() => handlePay(record)}
            />
          </Tooltip>
        )}
      </Space>
    );
  };

  // 紧凑高信息密度列
  const columns = [
    {
      title: '借款单号 / 事由',
      dataIndex: 'loanNo',
      width: 220,
      fixed: 'left' as const,
      render: (loanNo: string, record: Loan) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span
            className="loan-cell-link"
            onClick={() => handleViewDetail(record)}
            title="点击查看借款详情抽屉"
          >
            {loanNo}
          </span>
          <div className="loan-cell-reason" title={record.reason}>
            {record.reason || '差旅备用金借款'}
          </div>
        </div>
      ),
    },
    {
      title: '申请人 / 归属',
      dataIndex: 'applicantName',
      width: 130,
      render: (name: string, record: Loan) => (
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
      title: '借款类型 / 关联出差',
      dataIndex: 'type',
      width: 190,
      render: (type: string, record: Loan) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Tag color="cyan" size="small" style={{ width: 'fit-content' }}>
            {type === 'travel' ? '差旅借款' : type === 'petty_cash' ? '备用金' : '其他借款'}
          </Tag>
          {record.tripNo ? (
            <span
              style={{ fontSize: 12, color: 'rgb(var(--primary-6))', cursor: 'pointer' }}
              onClick={() => navigate(`/travel/trips/${record.tripId}`)}
              title="点击查看关联出差单"
            >
              📍 {record.tripNo} ↗
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--color-text-4)' }}>无出差单关联</span>
          )}
        </div>
      ),
    },
    {
      title: '借款总额与冲抵核销进度',
      dataIndex: 'amount',
      width: 230,
      render: (amount: number, record: Loan) => {
        const offset = record.offsetAmount || 0;
        const percent = Math.min(100, Math.round((offset / amount) * 100));
        return (
          <div className="loan-cell-progress">
            <div className="loan-cell-progress__header">
              <span>¥{amount.toLocaleString()}</span>
              <span style={{ fontSize: 11, color: percent === 100 ? '#00b42a' : '#ff7d00' }}>
                已冲抵 {percent}%
              </span>
            </div>
            <div className="loan-cell-progress__track">
              <div
                className="loan-cell-progress__bar"
                style={{
                  width: `${percent}%`,
                  background: percent === 100 ? '#00b42a' : 'rgb(var(--primary-6))',
                }}
              />
            </div>
            <div className="loan-cell-progress__footer">
              <span>已冲抵 ¥{offset.toLocaleString()}</span>
              <span style={{ color: record.remainingAmount > 0 ? '#ff7d00' : 'var(--color-text-4)' }}>
                待还余额 ¥{record.remainingAmount.toLocaleString()}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: '打款方式 / 期望日期',
      dataIndex: 'payMethod',
      width: 150,
      render: (payMethod: string, record: Loan) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-1)' }}>
            {payMethod === 'bank' ? '🏦 银行转账' : payMethod === 'cash' ? '💵 现金支取' : '其他方式'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
            期望：{record.expectedPayDate || record.createDate}
          </span>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: LoanStatus) => (
        <Tag color={statusConfig[value].color}>
          {statusConfig[value].text}
        </Tag>
      ),
    },
    {
      title: '操作',
      width: 110,
      fixed: 'right' as const,
      render: renderActions,
    },
  ];

  return (
    <PageShell className="loan-list-page">
      <PageHeader
        title="借款管理"
        description="集中统筹员工差旅备用借款、审批下拨、打款出纳与后续报销对冲核销台账。"
        actions={
          <Space>
            <Button icon={<IconRefresh />} onClick={loadLoans}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<IconPlus />}
              onClick={() => {
                createForm.resetFields();
                setCreateModalVisible(true);
              }}
            >
              新建借款单
            </Button>
          </Space>
        }
      />

      {/* 顶部指标卡：支持点击直接筛选状态 */}
      <ProcessMetricGrid
        items={[
          {
            key: 'total',
            label: '借款申请总数',
            value: `${total} 单`,
            detail: searchForm.status === '' ? '✓ 正在显示全部' : '点击查看全部',
            onClick: () => handleFilterByStatus(''),
            tone: searchForm.status === '' ? 'neutral' : undefined,
          },
          {
            key: 'pending',
            label: '待我审批',
            value: `${pendingCount} 单`,
            detail: searchForm.status === 'pending' ? '✓ 正在筛选待审批' : '部门及财务审批',
            tone: pendingCount > 0 ? 'warning' : 'neutral',
            onClick: () => handleFilterByStatus('pending'),
          },
          {
            key: 'payable',
            label: '待财务打款',
            value: `${payableCount} 单`,
            detail: searchForm.status === 'approved' ? '✓ 正在筛选待打款' : '审批通过待付款',
            tone: payableCount > 0 ? 'warning' : 'neutral',
            onClick: () => handleFilterByStatus('approved'),
          },
          {
            key: 'offsetting',
            label: '冲抵核销中',
            value: `${offsettingCount} 单`,
            detail: `已完全结清 ${settledCount} 单`,
            tone: offsettingCount > 0 ? 'neutral' : 'neutral',
            onClick: () => handleFilterByStatus('offset'),
          },
          {
            key: 'remaining',
            label: '在途待还余额',
            value: `¥${remainingAmount.toLocaleString()}`,
            detail: `累计借出 ¥${totalLoanAmount.toLocaleString()}`,
          },
        ]}
      />

      {/* 搜索与快捷状态条卡片 */}
      <Card className="loan-list-filter-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 状态快捷分段胶囊 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <Radio.Group
              type="button"
              value={searchForm.status}
              onChange={(val) => handleFilterByStatus(val as LoanStatus | '')}
            >
              <Radio value="">全部 ({total})</Radio>
              <Radio value="pending">
                待审批 {pendingCount > 0 && <Badge count={pendingCount} style={{ marginLeft: 4 }} />}
              </Radio>
              <Radio value="approved">
                待打款 {payableCount > 0 && <Badge count={payableCount} style={{ marginLeft: 4 }} />}
              </Radio>
              <Radio value="offset">冲抵中 ({allLoans.filter(l => l.status === 'offset').length})</Radio>
              <Radio value="settled">已结清 ({settledCount})</Radio>
              <Radio value="draft">草稿 ({allLoans.filter(l => l.status === 'draft').length})</Radio>
            </Radio.Group>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {filtersActive && (
                <Button type="text" status="warning" onClick={handleReset}>
                  重置筛选条件
                </Button>
              )}
              <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                找到 <strong>{filteredLoans.length}</strong> 条借款单据
              </span>
            </div>
          </div>

          {/* 细粒度筛选 */}
          <FilterBar>
            <Input
              style={{ width: 220 }}
              placeholder="搜索借款单号 / 出差单 / 申请人"
              value={searchForm.keyword}
              allowClear
              prefix={<IconSearch />}
              onChange={(val) => setSearchForm((prev) => ({ ...prev, keyword: val }))}
            />

            <Select
              style={{ width: 140 }}
              placeholder="借款类型"
              allowClear
              value={searchForm.type || undefined}
              onChange={(val) => setSearchForm((prev) => ({ ...prev, type: val as any }))}
            >
              <Option value="travel">差旅借款</Option>
              <Option value="petty_cash">备用金</Option>
              <Option value="other">其他</Option>
            </Select>

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
            </Select>

            <RangePicker
              style={{ width: 240 }}
              value={[searchForm.startDate, searchForm.endDate]}
              onChange={(_, dateStrings) => {
                setSearchForm((prev) => ({
                  ...prev,
                  startDate: dateStrings[0] || '',
                  endDate: dateStrings[1] || '',
                }));
              }}
            />

            <Checkbox
              checked={searchForm.onlyUnsettled}
              onChange={(checked) => setSearchForm((prev) => ({ ...prev, onlyUnsettled: checked }))}
            >
              仅看未结清借款
            </Checkbox>
          </FilterBar>
        </div>
      </Card>

      {/* 列表主体卡片 */}
      <Card className="loan-list-table-card" title="员工借款与备用金台账">
        <Table
          columns={columns}
          data={filteredLoans}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1100 }}
          pagination={{
            total: filteredLoans.length,
            pageSize: 10,
            showTotal: true,
            sizeCanChange: true,
          }}
        />
      </Card>

      {/* 借款详情与对冲台账抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <HandCoins size={20} weight="duotone" style={{ color: 'rgb(var(--primary-6))' }} />
            <span style={{ fontWeight: 600 }}>借款申请与冲抵详情</span>
            {selectedLoan && (
              <Tag size="small" color={statusConfig[selectedLoan.status].color}>
                {statusConfig[selectedLoan.status].text}
              </Tag>
            )}
          </div>
        }
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={780}
      >
        {selectedLoan && (
          <div className="loan-drawer-container">
            {/* 顶部借款总额与冲抵进度大看板 */}
            <div className="loan-drawer-progress-card">
              <div className="loan-drawer-progress-grid">
                <div className="loan-drawer-progress-metric">
                  <span className="loan-drawer-progress-metric__label">借款总金额</span>
                  <span className="loan-drawer-progress-metric__val">
                    ¥{selectedLoan.amount.toLocaleString()}
                  </span>
                </div>

                <div className="loan-drawer-progress-metric">
                  <span className="loan-drawer-progress-metric__label">已报销冲抵</span>
                  <span className="loan-drawer-progress-metric__val" style={{ color: '#00b42a' }}>
                    ¥{selectedLoan.offsetAmount.toLocaleString()}
                  </span>
                </div>

                <div className="loan-drawer-progress-metric">
                  <span className="loan-drawer-progress-metric__label">待还 / 未冲抵余额</span>
                  <span
                    className="loan-drawer-progress-metric__val"
                    style={{ color: selectedLoan.remainingAmount > 0 ? '#ff7d00' : 'var(--color-text-3)' }}
                  >
                    ¥{selectedLoan.remainingAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 进度条 */}
              <div>
                <Progress
                  percent={Math.min(100, Math.round((selectedLoan.offsetAmount / selectedLoan.amount) * 100))}
                  status={selectedLoan.status === 'settled' ? 'success' : 'normal'}
                  color="rgb(var(--primary-6))"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>
                  <span>借款生成日：{selectedLoan.createDate}</span>
                  <span>
                    冲抵进度：{Math.min(100, Math.round((selectedLoan.offsetAmount / selectedLoan.amount) * 100))}%
                  </span>
                </div>
              </div>
            </div>

            {/* 核心要素 */}
            <div className="loan-drawer-section">
              <div className="loan-drawer-section__title">
                <FileText size={16} /> 核心单据要素
              </div>
              <Grid.Row gutter={[16, 16]}>
                <Grid.Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>借款单号</Text>
                  <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{selectedLoan.loanNo}</div>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>申请人 / 部门</Text>
                  <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>
                    {selectedLoan.applicantName} ({selectedLoan.department})
                  </div>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>借款类型</Text>
                  <div style={{ fontSize: 13, marginTop: 2 }}>
                    <Tag size="small" color="arcoblue">
                      {selectedLoan.type === 'travel' ? '差旅借款' : selectedLoan.type === 'petty_cash' ? '备用金' : '其他'}
                    </Tag>
                  </div>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>关联出差单</Text>
                  <div
                    style={{ fontWeight: 600, fontSize: 13, marginTop: 2, color: 'rgb(var(--primary-6))', cursor: 'pointer' }}
                    onClick={() => {
                      if (selectedLoan.tripId) navigate(`/travel/trips/${selectedLoan.tripId}`);
                    }}
                  >
                    {selectedLoan.tripNo || '无关联出差单'} ↗
                  </div>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>期望到款日</Text>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{selectedLoan.expectedPayDate}</div>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>打款方式</Text>
                  <div style={{ fontSize: 13, marginTop: 2 }}>
                    {selectedLoan.payMethod === 'bank' ? '对私银行转账' : '现金支取'}
                  </div>
                </Grid.Col>
              </Grid.Row>
            </div>

            {/* 借款事由 */}
            <div className="loan-drawer-section">
              <div className="loan-drawer-section__title">
                <Wallet size={16} /> 借款事由与用途说明
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-1)', lineHeight: '22px' }}>
                {selectedLoan.reason || '无借款事由说明'}
              </div>
            </div>

            {/* 冲抵往来台账 */}
            <div className="loan-drawer-section">
              <div className="loan-drawer-section__title">
                <ArrowsLeftRight size={16} /> 报销对冲往来台账
              </div>
              {selectedLoan.offsetAmount > 0 ? (
                <div
                  style={{
                    background: 'var(--color-fill-1)',
                    border: '1px solid var(--color-border-2)',
                    borderRadius: 6,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>出差报销单冲抵核销</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                      已在出差报销结算流程中自动完成轧差对冲
                    </div>
                  </div>
                  <Tag color="green" size="medium">
                    已冲抵 ¥{selectedLoan.offsetAmount.toLocaleString()}
                  </Tag>
                </div>
              ) : (
                <div style={{ color: 'var(--color-text-3)', fontSize: 12, padding: '8px 0' }}>
                  暂无报销单冲抵记录。后续员工在提交出差报销单时，系统将自动优先冲抵该笔借款。
                </div>
              )}
            </div>

            {/* 审批与打款流程 */}
            <div className="loan-drawer-section">
              <div className="loan-drawer-section__title">
                <Clock size={16} /> 审批流转流水线
              </div>
              <Timeline>
                {(selectedLoan.approvalRecords ?? []).map((record) => (
                  <Timeline.Item key={record.id} label={record.time}>
                    <Space direction="vertical" size={2}>
                      <strong>{record.step} · {record.approver}</strong>
                      <span style={{ color: 'var(--color-text-2)' }}>
                        {record.comment || '无审批说明'}
                      </span>
                    </Space>
                  </Timeline.Item>
                ))}
                {(selectedLoan.approvalRecords ?? []).length === 0 && (
                  <Timeline.Item>借款单已发起，等待部门审批人与财务审核。</Timeline.Item>
                )}
              </Timeline>
            </div>

            {/* 抽屉吸底栏 */}
            <div className="loan-drawer-sticky-footer">
              <div>
                <Button
                  icon={<IconPrinter />}
                  onClick={() => Message.success('已调起借款凭据打印预览')}
                >
                  打印借款凭证
                </Button>
              </div>

              <Space>
                {/* 待审批操作 */}
                {selectedLoan.status === 'pending' && (
                  <>
                    <Button
                      status="danger"
                      onClick={() => {
                        setApprovalAction('reject');
                        setApprovalVisible(true);
                      }}
                    >
                      驳回申请
                    </Button>
                    <Button
                      type="primary"
                      status="success"
                      icon={<IconCheck />}
                      onClick={() => {
                        setApprovalAction('approve');
                        setApprovalVisible(true);
                      }}
                    >
                      审批通过
                    </Button>
                  </>
                )}

                {/* 待打款操作 */}
                {selectedLoan.status === 'approved' && (
                  <Button
                    type="primary"
                    status="success"
                    icon={<Bank size={16} />}
                    onClick={() => handlePay(selectedLoan)}
                  >
                    确认网银打款 (¥{selectedLoan.amount.toLocaleString()})
                  </Button>
                )}

                <Button onClick={() => setDetailVisible(false)}>关闭</Button>
              </Space>
            </div>
          </div>
        )}
      </Drawer>

      {/* 审批确认弹窗 */}
      <Modal
        title={approvalAction === 'approve' ? '审批通过借款申请' : '驳回借款申请'}
        visible={approvalVisible}
        onOk={handleApprove}
        onCancel={() => {
          setApprovalVisible(false);
          setApprovalComment('');
        }}
        okText="确认提交"
        okButtonProps={{ status: approvalAction === 'approve' ? 'success' : 'danger' }}
        cancelText="取消"
      >
        <div>
          <div style={{ marginBottom: 8 }}><Text>审批核决意见</Text></div>
          <TextArea
            placeholder={
              approvalAction === 'approve'
                ? '请填写审批意见（如：同意借款，请财务安排打款）'
                : '请填写驳回原因（如：借款金额超出项目差旅预算）'
            }
            rows={4}
            value={approvalComment}
            onChange={setApprovalComment}
          />
        </div>
      </Modal>

      {/* 新建差旅借款申请弹窗 */}
      <Modal
        title="新建差旅借款申请"
        visible={createModalVisible}
        onOk={handleCreateLoan}
        onCancel={() => setCreateModalVisible(false)}
        okText="提交借款申请"
        cancelText="取消"
        style={{ width: 520 }}
      >
        <Form form={createForm} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="申请人姓名"
                field="applicantName"
                rules={[{ required: true, message: '请输入申请人' }]}
                initialValue="张三"
              >
                <Input placeholder="如：张三" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="所属部门"
                field="department"
                rules={[{ required: true, message: '请输入部门' }]}
                initialValue="技术部"
              >
                <Select placeholder="选择部门">
                  <Option value="技术部">技术部</Option>
                  <Option value="市场部">市场部</Option>
                  <Option value="销售部">销售部</Option>
                  <Option value="交付中心">交付中心</Option>
                  <Option value="综合管理部">综合管理部</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="借款类型"
                field="type"
                initialValue="travel"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="travel">差旅备用金</Option>
                  <Option value="petty_cash">日常备用金</Option>
                  <Option value="other">专项周转金</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="借款金额 (元)"
                field="amount"
                rules={[{ required: true, message: '请输入借款金额' }]}
              >
                <InputNumber
                  min={100}
                  step={500}
                  placeholder="如：3000"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="关联出差申请单号" field="tripNo" initialValue="BT20260428001">
                <Input placeholder="如：BT20260428001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="预计还款/冲抵日期"
                field="expectedRepayDate"
                rules={[{ required: true, message: '请选择预计还款日' }]}
                initialValue="2026-09-30"
              >
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="借款用途与事由说明"
            field="reason"
            rules={[{ required: true, message: '请简述借款事由' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="如：赴上海中科项目现场紧急技术交底，预支往返交通与住宿备用金"
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}
