import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Input,
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
} from '@/design-system';
import {
  Airplane,
  ArrowRight,
  Bank,
  Buildings,
  CheckCircle,
  Clock,
  Coins,
  CurrencyCny,
  FileText,
  IconSearch,
  IconPlus,
  IconCheck,
  IconClose,
  IconEye,
  IconSafe,
  IconRefresh,
  IconFile,
  IconPrinter,
  Receipt,
} from '@/design-system';
import { FinanceAuditDashboard } from '../components/FinanceAuditDashboard';
import type { Reimbursement, ReimbursementStatus } from '../types';
import { getReimbursementList, approveReimbursement, payReimbursement } from '../travel-api';
import {
  DataTable,
  DateText,
  FilterBar,
  FileList,
  MoneyText,
  PageHeader,
  PageShell,
  MetricGrid,
  SectionCard,
  StatusTag,
  type StatusMap,
} from '@/design-system';
import './reimbursementList.css';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const REIMBURSEMENT_STATUS: StatusMap<ReimbursementStatus> = {
  draft: { label: '草稿', tone: 'neutral' },
  pending: { label: '待审批', tone: 'warning' },
  dept_approved: { label: '部门已审', tone: 'info' },
  finance_approved: { label: '待财务打款', tone: 'purple' },
  paid: { label: '已打款', tone: 'success' },
  completed: { label: '已结项', tone: 'success' },
  rejected: { label: '已驳回', tone: 'danger' },
};

export function ReimbursementList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [allReimbursements, setAllReimbursements] = useState<Reimbursement[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);

  // 筛选表单
  const [searchForm, setSearchForm] = useState({
    keyword: '',
    status: '' as ReimbursementStatus | '',
    startDate: '',
    endDate: '',
    department: '',
    onlyOffset: false,
  });

  // 审批弹窗
  const [approvalVisible, setApprovalVisible] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');

  // 详情抽屉
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedReimbursement, setSelectedReimbursement] = useState<Reimbursement | null>(null);

  // 加载数据
  const loadReimbursements = async () => {
    setLoading(true);
    try {
      const result = await getReimbursementList();
      setAllReimbursements(result.list);
    } catch {
      Message.error('加载报销申请数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReimbursements();
  }, []);

  // 客户端实时派生过滤列表
  const filteredReimbursements = useMemo(() => {
    return allReimbursements.filter((item) => {
      // 关键字搜索：报销单号、出差单号、申请人、部门
      if (searchForm.keyword.trim()) {
        const kw = searchForm.keyword.toLowerCase();
        const matchNo = item.reimbursementNo.toLowerCase().includes(kw);
        const matchTrip = item.tripNo.toLowerCase().includes(kw);
        const matchName = item.applicantName.toLowerCase().includes(kw);
        const matchDept = item.department.toLowerCase().includes(kw);
        if (!matchNo && !matchTrip && !matchName && !matchDept) {
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
      if (searchForm.startDate && item.createDate < searchForm.startDate) {
        return false;
      }
      if (searchForm.endDate && item.createDate > searchForm.endDate) {
        return false;
      }

      // 仅看有借款冲抵
      if (searchForm.onlyOffset && (!item.offsetAmount || item.offsetAmount <= 0)) {
        return false;
      }

      return true;
    });
  }, [allReimbursements, searchForm]);

  // 统计数据
  const total = allReimbursements.length;
  const pendingCount = allReimbursements.filter(
    (item) => item.status === 'pending' || item.status === 'dept_approved'
  ).length;
  const payableCount = allReimbursements.filter((item) => item.status === 'finance_approved').length;
  const paidCount = allReimbursements.filter(
    (item) => item.status === 'paid' || item.status === 'completed'
  ).length;
  const netAmount = filteredReimbursements.reduce((sum, item) => sum + item.netAmount, 0);
  const totalOffset = filteredReimbursements.reduce((sum, item) => sum + (item.offsetAmount || 0), 0);

  const filtersActive = Boolean(
    searchForm.keyword ||
    searchForm.status ||
    searchForm.startDate ||
    searchForm.endDate ||
    searchForm.department ||
    searchForm.onlyOffset
  );

  // 重置筛选
  const handleReset = () => {
    setSearchForm({
      keyword: '',
      status: '',
      startDate: '',
      endDate: '',
      department: '',
      onlyOffset: false,
    });
  };

  // 通过指标卡快捷切换状态
  const handleFilterByStatus = (status: ReimbursementStatus | '') => {
    setSearchForm((prev) => ({ ...prev, status }));
  };

  // 查看详情抽屉
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
      Message.success(`报销单 ${selectedReimbursement?.reimbursementNo} 审批${approvalAction === 'approve' ? '通过' : '不通过'}成功`);
      setApprovalVisible(false);
      setApprovalComment('');
      // 同步刷新抽屉数据
      if (selectedReimbursement) {
        selectedReimbursement.status = approvalAction === 'approve' ? 'finance_approved' : 'rejected';
      }
      loadReimbursements();
    } catch {
      Message.error('审批操作失败');
    }
  };

  // 财务打款
  const handlePay = async (reimbursement: Reimbursement) => {
    try {
      await payReimbursement(reimbursement.id);
      Message.success(`报销单 ${reimbursement.reimbursementNo} 已确认打款，冲抵借款已同步核销`);
      if (selectedReimbursement && selectedReimbursement.id === reimbursement.id) {
        selectedReimbursement.status = 'paid';
      }
      loadReimbursements();
    } catch {
      Message.error('打款操作失败');
    }
  };

  // 渲染操作按钮
  const renderActions = (_: unknown, record: Reimbursement) => {
    return (
      <Space size={4}>
        <Tooltip content="查看报销详情">
          <Button
            className="hubx-icon-action"
            type="text"
            size="small"
            aria-label={`查看报销单${record.reimbursementNo}`}
            icon={<IconEye />}
            onClick={() => handleViewDetail(record)}
          />
        </Tooltip>

        {/* 待审批状态 */}
        {(record.status === 'pending' || record.status === 'dept_approved') && (
          <Tooltip content="审批处理">
            <Button
              type="text"
              size="small"
              className="hubx-icon-action"
              status="warning"
              aria-label={`审批报销单${record.reimbursementNo}`}
              icon={<IconCheck />}
              onClick={() => {
                setSelectedReimbursement(record);
                setApprovalAction('approve');
                setApprovalComment('发票验真合规，同意报销');
                setApprovalVisible(true);
              }}
            />
          </Tooltip>
        )}

        {/* 待打款状态 */}
        {record.status === 'finance_approved' && (
          <Tooltip content="确认打款出纳">
            <Button
              className="hubx-icon-action"
              type="text"
              size="small"
              status="success"
              aria-label={`确认报销单${record.reimbursementNo}打款`}
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
      title: '报销单号 / 关联出差',
      dataIndex: 'reimbursementNo',
      width: 210,
      fixed: 'left' as const,
      render: (reimbursementNo: string, record: Reimbursement) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span
            className="reimb-cell-link"
            onClick={() => handleViewDetail(record)}
            title="点击打开报销详情抽屉"
          >
            {reimbursementNo}
          </span>
          <span
            className="reimb-cell-trip-link"
            onClick={() => navigate(`/travel/trips/${record.tripId}`)}
            title="点击前往关联出差单"
          >
            📍 关联出差：{record.tripNo}
          </span>
        </div>
      ),
    },
    {
      title: '申请人 / 归属',
      dataIndex: 'applicantName',
      width: 130,
      render: (name: string, record: Reimbursement) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontWeight: 500, fontSize: 'var(--ds-text-dense)', color: 'var(--color-text-1)' }}>
            {name}
          </div>
          <StatusTag size="small" tone="info" style={{ padding: '0 6px', fontSize: 'var(--ds-text-caption)', width: 'fit-content' }}>
            {record.department || '未分配'}
          </StatusTag>
        </div>
      ),
    },
    {
      title: '费用科目明细',
      dataIndex: 'items',
      width: 220,
      render: (items: Reimbursement['items']) => {
        const count = items?.length || 0;
        const descriptions = items?.map((i) => i.description).slice(0, 2).join('、') || '差旅费用报销';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-1)', fontWeight: 500 }}>
              共 {count} 笔费用支出
            </span>
            <span
              style={{
                fontSize: 'var(--ds-text-caption)',
                color: 'var(--color-text-3)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 200,
              }}
              title={descriptions}
            >
              {descriptions}
            </span>
          </div>
        );
      },
    },
    {
      title: '资金综合轧差（报销 - 冲抵 = 实付）',
      dataIndex: 'netAmount',
      width: 230,
      render: (_: unknown, record: Reimbursement) => (
        <div className="reimb-cell-calc">
          <div className="reimb-cell-calc__net">
            实付 <MoneyText value={record.netAmount} />
          </div>
          <div className="reimb-cell-calc__sub">
            <span>报销 <MoneyText value={record.totalAmount} /></span>
            {record.offsetAmount > 0 ? (
              <StatusTag size="small" tone="warning" style={{ padding: '0 4px', fontSize: 'var(--ds-text-micro)' }}>
                冲借款 -<MoneyText value={record.offsetAmount} />
              </StatusTag>
            ) : (
              <span style={{ color: 'var(--color-text-4)' }}>无冲抵</span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '发票材料',
      dataIndex: 'attachments',
      width: 110,
      render: (attachments: Reimbursement['attachments']) => {
        const count = attachments?.length || 0;
        return count > 0 ? (
          <StatusTag size="small" tone="info" style={{ cursor: 'pointer' }}>
            <IconFile style={{ marginRight: 4 }} />
            {count} 份附件
          </StatusTag>
        ) : (
          <span style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--color-text-4)' }}>无电子票</span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value: ReimbursementStatus) => <StatusTag meta={REIMBURSEMENT_STATUS[value]} />,
    },
    {
      title: '申请日期',
      dataIndex: 'createDate',
      width: 110,
      render: (date: string) => <DateText value={date} />,
    },
    {
      title: '操作',
      width: 110,
      fixed: 'right' as const,
      render: renderActions,
    },
  ];

  return (
    <PageShell className="reimb-list-page">
      <PageHeader
        title="报销管理"
        description="集中统筹差旅报销申请、发票验真、备用金冲抵核销与资金出纳拨付。"
        actions={
          <Space>
            <Button
              icon={<IconSafe />}
              type={auditOpen ? 'primary' : 'secondary'}
              onClick={() => setAuditOpen(!auditOpen)}
            >
              {auditOpen ? '收起 AI 财务稽核' : 'AI 智能稽核看板'}
            </Button>
            <Button icon={<IconRefresh />} onClick={loadReimbursements}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<IconPlus />}
              onClick={() => Message.info('请在出差详情页（TripDetail）直接一键勾选流水生成报销单')}
            >
              新建报销单
            </Button>
          </Space>
        }
      />

      {/* 顶部指标卡：支持点击直接筛选对应状态 */}
      <MetricGrid
        items={[
          {
            key: 'total',
            label: '报销申请总数',
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
            label: '待出纳打款',
            value: `${payableCount} 单`,
            detail: searchForm.status === 'finance_approved' ? '✓ 正在筛选待打款' : '财务已审待付款',
            tone: payableCount > 0 ? 'warning' : 'neutral',
            onClick: () => handleFilterByStatus('finance_approved'),
          },
          {
            key: 'paid',
            label: '已完成拨付',
            value: `${paidCount} 单`,
            detail: searchForm.status === 'paid' ? '✓ 正在筛选已打款' : '已入账结算',
            tone: paidCount > 0 ? 'success' : 'neutral',
            onClick: () => handleFilterByStatus('paid'),
          },
          {
            key: 'amount',
            label: '最终实付总额',
            value: <MoneyText value={netAmount} />,
            detail: <>已冲抵借款 <MoneyText value={totalOffset} /></>,
          },
        ]}
      />

      {/* AI 稽核面板 */}
      {auditOpen && <FinanceAuditDashboard />}

      {/* 搜索与快捷状态条卡片 */}
      <SectionCard className="reimb-list-filter-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 状态快速分段胶囊 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <Radio.Group
              type="button"
              value={searchForm.status}
              onChange={(val) => handleFilterByStatus(val as ReimbursementStatus | '')}
            >
              <Radio value="">全部 ({total})</Radio>
              <Radio value="pending">
                待审批 {pendingCount > 0 && <Badge count={pendingCount} style={{ marginLeft: 4 }} />}
              </Radio>
              <Radio value="finance_approved">
                待打款 {payableCount > 0 && <Badge count={payableCount} style={{ marginLeft: 4 }} />}
              </Radio>
              <Radio value="paid">已打款 ({allReimbursements.filter(r => r.status === 'paid').length})</Radio>
              <Radio value="completed">已结项 ({allReimbursements.filter(r => r.status === 'completed').length})</Radio>
              <Radio value="draft">草稿 ({allReimbursements.filter(r => r.status === 'draft').length})</Radio>
            </Radio.Group>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {filtersActive && (
                <Button type="text" status="warning" onClick={handleReset}>
                  重置筛选条件
                </Button>
              )}
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                找到 <strong>{filteredReimbursements.length}</strong> 条报销单据
              </span>
            </div>
          </div>

          {/* 细粒度筛选 */}
          <FilterBar>
            <Input
              style={{ width: 220 }}
              placeholder="搜索报销单号 / 出差单 / 申请人"
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
              <Option value="财务部">财务部</Option>
            </Select>

            {/* RangePicker 第一个参数才是 string[]，原写法取到的是 Dayjs[]。 */}
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
              checked={searchForm.onlyOffset}
              onChange={(checked) => setSearchForm((prev) => ({ ...prev, onlyOffset: checked }))}
            >
              仅看有借款冲抵
            </Checkbox>
          </FilterBar>
        </div>
      </SectionCard>

      {/* 列表主体卡片 */}
      <SectionCard className="reimb-list-table-card" title="差旅报销申请台账">
        <DataTable
          columns={columns}
          data={filteredReimbursements}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1100 }}
          pagination={{
            total: filteredReimbursements.length,
            pageSize: 10,
            showTotal: true,
            sizeCanChange: true,
          }}
        />
      </SectionCard>

      {/* 报销详情与审批协同专业抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Receipt size={20} weight="duotone" style={{ color: 'rgb(var(--primary-6))' }} />
            <span style={{ fontWeight: 600 }}>出差报销申请详情</span>
            {selectedReimbursement && <StatusTag meta={REIMBURSEMENT_STATUS[selectedReimbursement.status]} />}
          </div>
        }
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={820}
      >
        {selectedReimbursement && (
          <div className="reimb-drawer-container">
            {/* 顶部三账合一轧差算式看板 */}
            <div className="reimb-drawer-calc-bar">
              <div className="reimb-drawer-calc-formula">
                <div className="reimb-drawer-calc-node">
                  <span className="reimb-drawer-calc-node__label">报销核准总额</span>
                  <span className="reimb-drawer-calc-node__val">
                    <MoneyText value={selectedReimbursement.totalAmount} />
                  </span>
                </div>

                <span className="reimb-drawer-calc-operator">-</span>

                <div className="reimb-drawer-calc-node">
                  <span className="reimb-drawer-calc-node__label">冲抵备用借款</span>
                  <span className="reimb-drawer-calc-node__val">
                    <MoneyText value={selectedReimbursement.offsetAmount} tone="danger" />
                  </span>
                </div>

                <span className="reimb-drawer-calc-operator">=</span>

                <div className="reimb-drawer-calc-node">
                  <span className="reimb-drawer-calc-node__label">最终实付 / 退款</span>
                  <span className="reimb-drawer-calc-node__val reimb-drawer-calc-node__val--net">
                    <MoneyText value={selectedReimbursement.netAmount} />
                  </span>
                </div>
              </div>

              <StatusTag tone="success" size="default">
                合规审核通过
              </StatusTag>
            </div>

            {/* 基本要素卡片 */}
            <div className="reimb-drawer-section">
              <div className="reimb-drawer-section__title">
                <FileText size={16} /> 核心单据要素
              </div>
              <Grid.Row gutter={[16, 16]}>
                <Grid.Col span={8}>
                  <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>报销单号</Text>
                  <div style={{ fontWeight: 600, fontSize: 'var(--ds-text-dense)', marginTop: 2 }}>
                    {selectedReimbursement.reimbursementNo}
                  </div>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>关联出差单</Text>
                  <div
                    style={{ fontWeight: 600, fontSize: 'var(--ds-text-dense)', marginTop: 2, color: 'rgb(var(--primary-6))', cursor: 'pointer' }}
                    onClick={() => navigate(`/travel/trips/${selectedReimbursement.tripId}`)}
                  >
                    {selectedReimbursement.tripNo} ↗
                  </div>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>申请人 / 部门</Text>
                  <div style={{ fontWeight: 600, fontSize: 'var(--ds-text-dense)', marginTop: 2 }}>
                    {selectedReimbursement.applicantName} ({selectedReimbursement.department})
                  </div>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>打款账户</Text>
                  <div style={{ fontSize: 'var(--ds-text-dense)', marginTop: 2 }}>招商银行 · 尾号 8892</div>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>申请时间</Text>
                  <div style={{ fontSize: 'var(--ds-text-dense)', marginTop: 2 }}><DateText value={selectedReimbursement.createDate} /></div>
                </Grid.Col>
                <Grid.Col span={8}>
                  <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>发票验真</Text>
                  <div style={{ fontSize: 'var(--ds-text-dense)', marginTop: 2, color: 'rgb(var(--success-6))' }}>全额增值税电子发票已验真</div>
                </Grid.Col>
              </Grid.Row>
            </div>

            {/* 费用明细拆解表 */}
            <div className="reimb-drawer-section">
              <div className="reimb-drawer-section__title">
                <Coins size={16} /> 费用明细清单
              </div>
              <DataTable
                columns={[
                  {
                    title: '科目',
                    dataIndex: 'expenseType',
                    width: 100,
                    render: (v: string) => {
                      const map: Record<string, string> = {
                        transport: '往返交通',
                        accommodation: '酒店住宿',
                        local_transport: '市内交通',
                        meal: '餐饮津贴',
                        other: '其他杂费',
                      };
                      return <StatusTag tone="info">{map[v] || v}</StatusTag>;
                    },
                  },
                  { title: '费用说明与明细', dataIndex: 'description' },
                  { title: '对应行程段', dataIndex: 'itinerarySegmentDesc', width: 140 },
                  {
                    title: '报销金额',
                    dataIndex: 'amount',
                    width: 110,
                    align: 'right' as const,
                    render: (v: number) => (
                      <span style={{ fontWeight: 600 }}><MoneyText value={v} /></span>
                    ),
                  },
                ]}
                data={selectedReimbursement.items}
                rowKey="id"
                pagination={false}
                summary={() => (
                  <Table.Summary>
                    <Table.Summary.Row>
                      <Table.Summary.Cell colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>
                        核报总额
                      </Table.Summary.Cell>
                      <Table.Summary.Cell style={{ textAlign: 'right', fontWeight: 700, color: 'rgb(var(--primary-6))' }}>
                        <MoneyText value={selectedReimbursement.totalAmount} />
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </div>

            {/* 票据与附件 */}
            {selectedReimbursement.attachments && selectedReimbursement.attachments.length > 0 && (
              <div className="reimb-drawer-section">
                <div className="reimb-drawer-section__title">
                  <IconFile /> 票据凭证与附件
                </div>
                <FileList
                  items={selectedReimbursement.attachments.map((file) => ({
                    key: file.id,
                    name: file.name,
                    meta: file.size,
                    onDownload: () => Message.success(`正在下载电子票据「${file.name}」`),
                  }))}
                />
              </div>
            )}

            {/* 审批与打款流程 */}
            <div className="reimb-drawer-section">
              <div className="reimb-drawer-section__title">
                <Clock size={16} /> 审批流转与出纳记录
              </div>
              <Timeline>
                {(selectedReimbursement.approvalRecords ?? []).map((record) => (
                  <Timeline.Item key={record.id} label={record.time}>
                    <Space direction="vertical" size={2}>
                      <strong>{record.step} · {record.approver}</strong>
                      <span style={{ color: 'var(--color-text-2)' }}>
                        {record.comment || '无审批说明'}
                      </span>
                    </Space>
                  </Timeline.Item>
                ))}
                {(selectedReimbursement.approvalRecords ?? []).length === 0 && (
                  <Timeline.Item>报销单已发起，等待当前节点审批处理。</Timeline.Item>
                )}
              </Timeline>
            </div>

            {/* 抽屉吸底操作栏 */}
            <div className="reimb-drawer-sticky-footer">
              <div>
                <Button
                  icon={<IconPrinter />}
                  onClick={() => Message.success('已调起差旅报销凭证套打模态框')}
                >
                  套打报销单
                </Button>
              </div>

              <Space>
                {/* 待审批操作 */}
                {(selectedReimbursement.status === 'pending' || selectedReimbursement.status === 'dept_approved') && (
                  <>
                    <Button
                      status="danger"
                      onClick={() => {
                        setApprovalAction('reject');
                        setApprovalVisible(true);
                      }}
                    >
                      驳回退回
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
                {selectedReimbursement.status === 'finance_approved' && (
                  <Button
                    type="primary"
                    status="success"
                    icon={<Bank size={16} />}
                    onClick={() => handlePay(selectedReimbursement)}
                  >
                    确认网银打款 (<MoneyText value={selectedReimbursement.netAmount} />)
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
        title={approvalAction === 'approve' ? '审批通过报销申请' : '驳回出差报销申请'}
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
                ? '请填写审批通过意见（如：单据齐全，费用合规，同意报销）'
                : '请填写驳回原因（如：酒店单据金额超出标准，请重新调整）'
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
