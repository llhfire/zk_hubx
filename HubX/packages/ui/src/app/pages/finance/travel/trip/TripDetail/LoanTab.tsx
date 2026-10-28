import { useState, useEffect } from 'react';
import {
  Button,
  Space,
  Typography,
  Message,
  Drawer,
  Divider,
  Timeline,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
} from '@/design-system';
import {
  IconPlus,
  IconEye,
  IconStorage,
  IconRight,
  IconClockCircle,
  IconCheckCircle,
} from '@/design-system';
import type { Trip, Loan, LoanStatus } from '../../types';
import { getLoanList } from '../../travel-api';
import {
  DataTable,
  DateText,
  MetricCard,
  MoneyText,
  StatusTag,
  type StatusMap,
  DescriptionsCard,
  ProgressBar,
} from '@/design-system';

const { Text, Title } = Typography;

interface LoanTabProps {
  trip: Trip;
  onUpdate: () => void;
}

const LOAN_STATUS: StatusMap<LoanStatus> = {
  draft: { label: '草稿', tone: 'neutral' },
  pending: { label: '待审批', tone: 'warning' },
  approved: { label: '已通过', tone: 'success' },
  paid: { label: '已打款', tone: 'success' },
  offset: { label: '已冲抵', tone: 'info' },
  settled: { label: '已结清', tone: 'success' },
  rejected: { label: '已拒绝', tone: 'danger' },
  cancelled: { label: '已取消', tone: 'neutral' },
};

export function LoanTab({ trip, onUpdate }: LoanTabProps) {
  const [loading, setLoading] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadLoans();
  }, [trip.id]);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const result = await getLoanList({ tripId: trip.id });
      setLoans(result.list);
    } catch (error) {
      Message.error('加载借款数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 新建借款
  const handleCreate = () => {
    form.resetFields();
    form.setFieldsValue({ type: 'travel', payMethod: 'bank' });
    setCreateVisible(true);
  };

  // 查看详情
  const handleViewDetail = (loan: Loan) => {
    setSelectedLoan(loan);
  };

  const handleSave = () => {
    form.validate().then((values) => {
      const now = new Date().toISOString().slice(0, 10);
      const amount = Number(values.amount);
      const loan: Loan = {
        id: `loan-${Date.now()}`, loanNo: `JK${Date.now().toString().slice(-10)}`,
        applicantId: trip.applicantId, applicantName: trip.applicantName, department: trip.department,
        tripId: trip.id, tripNo: trip.tripNo, type: values.type, amount,
        reason: values.reason.trim(), expectedPayDate: values.expectedPayDate?.trim() || undefined,
        payMethod: values.payMethod, status: 'draft', createDate: now, updateDate: now,
        offsets: [], offsetAmount: 0, remainingAmount: amount, approvalRecords: [],
      };
      setLoans((current) => [loan, ...current]);
      setCreateVisible(false);
      onUpdate();
      Message.success('借款单已创建');
    });
  };

  // 计算汇总
  const totalLoanAmount = loans.reduce((sum, l) => sum + l.amount, 0);
  const totalOffsetAmount = loans.reduce((sum, l) => sum + l.offsetAmount, 0);
  const totalRemaining = loans.reduce((sum, l) => sum + l.remainingAmount, 0);

  const columns = [
    {
      title: '借款单号',
      dataIndex: 'loanNo',
      width: 150,
      render: (value: string) => <Text style={{ fontWeight: 500 }}>{value}</Text>,
    },
    {
      title: '借款类型',
      dataIndex: 'type',
      width: 100,
      render: (value: string) => (
        <StatusTag>
          {value === 'travel' ? '差旅借款' : value === 'petty_cash' ? '备用金' : '其他'}
        </StatusTag>
      ),
    },
    {
      title: '借款金额',
      dataIndex: 'amount',
      width: 120,
      render: (value: number) => (
        <Space size={4}>
          <IconStorage style={{ color: 'var(--color-text-3)' }} />
          <MoneyText value={value} />
        </Space>
      ),
    },
    {
      title: '已冲抵',
      dataIndex: 'offsetAmount',
      width: 100,
      render: (value: number) => (
        value > 0 ? <MoneyText value={value} tone="success" /> : '-'
      ),
    },
    {
      title: '剩余金额',
      dataIndex: 'remainingAmount',
      width: 120,
      render: (value: number) => <Text style={{ fontWeight: 500 }}><MoneyText value={value} /></Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: LoanStatus) => (
        <StatusTag meta={LOAN_STATUS[value]} />
      ),
    },
    {
      title: '创建日期',
      dataIndex: 'createDate',
      width: 120,
      render: (value: string) => <DateText value={value} />,
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: Loan) => (
        <Button type="text" size="small" icon={<IconEye />} onClick={() => handleViewDetail(record)}>
          查看
        </Button>
      ),
    },
  ];

  const offsetRate = totalLoanAmount > 0 ? Math.round((totalOffsetAmount / totalLoanAmount) * 100) : 0;

  return (
    <div className="trip-tab-pane">
      {/* 资金闭环核销总览看板（环形闭环率 + 借还核销对比条） */}
      <div className="trip-loan-dashboard">
        <div className="trip-loan-circle-box">
          <ProgressBar
            variant="circle"
            percent={offsetRate}
            diameter={96}
            tone={offsetRate === 100 ? 'success' : 'info'}
            valueText={(
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text-1)' }}>{offsetRate}%</div>
                <div style={{ fontSize: 'var(--ds-text-micro)', color: 'var(--color-text-3)' }}>闭环完成率</div>
              </div>
            )}
          />
          <div style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--color-text-2)', textAlign: 'center' }}>
            <span>资金闭环完成率</span>
            <span style={{ marginLeft: 4, display: 'inline-flex' }}>
              <StatusTag
                meta={{ label: offsetRate === 100 ? '已完全清账' : '核销中', tone: offsetRate === 100 ? 'success' : 'info' }}
              />
            </span>
          </div>
        </div>

        <div className="trip-loan-bullet-container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <MetricCard
              label={<><IconStorage style={{ color: 'rgb(var(--primary-6))' }} />借款总额</>}
              value={<MoneyText value={totalLoanAmount} />}
              detail={`共计 ${loans.length} 笔借款支出`}
            />

            <MetricCard
              label={<><IconCheckCircle style={{ color: 'var(--ds-tone-success-fg)' }} />已冲抵核销金额</>}
              value={<MoneyText value={totalOffsetAmount} tone="success" />}
              detail="报销单据自动对冲"
            />

            <MetricCard
              label={<><IconClockCircle style={{ color: totalRemaining > 0 ? 'var(--ds-tone-warning-fg)' : 'var(--color-text-3)' }} />剩余待还/在途借款</>}
              value={<span style={{ color: totalRemaining > 0 ? 'var(--ds-tone-warning-fg)' : 'var(--color-text-1)' }}><MoneyText value={totalRemaining} /></span>}
              detail={totalRemaining > 0 ? '差旅归来 5 日内核销' : '无未清待还借款'}
            />
          </div>

          {/* 核销对冲进度横向对比条 */}
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
              <span style={{ color: 'var(--color-text-3)' }}>已核销冲抵进度</span>
              <span style={{ fontWeight: 600 }}><MoneyText value={totalOffsetAmount} /> / <MoneyText value={totalLoanAmount} /> ({offsetRate}%)</span>
            </div>
            <ProgressBar percent={offsetRate} size="small" tone={offsetRate === 100 ? 'success' : 'info'} />
          </div>
        </div>
      </div>

      {/* 专业精良的操作工具栏（与表格直接咬合） */}
      <div className="trip-section-toolbar">
        <div className="trip-section-toolbar__title">
          <span>借款记录明细</span>
          <StatusTag size="small" tone="neutral">
            共 {loans.length} 笔记录
          </StatusTag>
        </div>

        <div className="trip-section-toolbar__actions">
          <Button type="primary" size="small" icon={<IconPlus />} onClick={handleCreate}>
            新增借款
          </Button>
        </div>
      </div>

      {/* 主体表格视图 */}
      <div style={{ marginTop: 8 }}>
        <DataTable
          columns={columns}
          data={loans}
          loading={loading}
          rowKey="id"
          size="default"
          scroll={{ x: 900 }}
          pagination={false}
          emptyDescription="暂无借款记录"
        />

        {/* 冲抵记录 */}
        {loans.some(l => l.offsets && l.offsets.length > 0) && (
          <div style={{ marginTop: 24 }}>
            <Title heading={6} style={{ marginBottom: 12 }}>冲抵记录</Title>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {loans.map(loan =>
                loan.offsets?.map(offset => (
                  <div
                    key={offset.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 12,
                      background: 'var(--color-fill-2)',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    <Space>
                      <StatusTag>{offset.loanNo}</StatusTag>
                      <IconRight style={{ color: 'var(--color-text-3)' }} />
                      <StatusTag>{offset.reimbursementId}</StatusTag>
                    </Space>
                    <Space>
                      <Text type="secondary"><DateText value={offset.offsetDate} /></Text>
                      <Text style={{ fontWeight: 500, color: 'var(--ds-tone-success-fg)' }}><MoneyText value={offset.offsetAmount} tone="success" /></Text>
                    </Space>
                  </div>
                ))
              )}
            </Space>
          </div>
        )}
      </div>
      <Modal title="新增借款" visible={createVisible} onOk={handleSave} onCancel={() => setCreateVisible(false)} okText="保存草稿">
        <Form form={form} layout="vertical">
          <Form.Item label="借款类型" field="type" rules={[{ required: true }]}><Select options={[{ label: '差旅借款', value: 'travel' }, { label: '备用金', value: 'petty_cash' }, { label: '其他', value: 'other' }]} /></Form.Item>
          <Form.Item label="借款金额" field="amount" rules={[{ required: true, message: '请输入借款金额' }]}><InputNumber min={0.01} precision={2} prefix="¥" style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="借款理由" field="reason" rules={[{ required: true, message: '请输入借款理由' }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label="期望打款日期" field="expectedPayDate"><Input placeholder="YYYY-MM-DD" /></Form.Item>
          <Form.Item label="打款方式" field="payMethod" rules={[{ required: true }]}><Select options={[{ label: '银行转账', value: 'bank' }, { label: '现金', value: 'cash' }, { label: '其他', value: 'other' }]} /></Form.Item>
        </Form>
      </Modal>
      <Drawer title="借款详情与审批流" width={520} visible={Boolean(selectedLoan)} onCancel={() => setSelectedLoan(null)} footer={null}>
        {selectedLoan && <><DescriptionsCard
  columns={1}
  items={[
  { key: '借款单号', label: '借款单号', value: selectedLoan.loanNo },
  { key: '申请人', label: '申请人', value: selectedLoan.applicantName },
  { key: '借款金额', label: '借款金额', value: <MoneyText value={selectedLoan.amount} /> },
  { key: '借款理由', label: '借款理由', value: selectedLoan.reason },
  { key: '期望打款日', label: '期望打款日', value: <DateText value={selectedLoan.expectedPayDate} placeholder="-" /> },
  { key: '剩余未冲抵', label: '剩余未冲抵', value: <MoneyText value={selectedLoan.remainingAmount} /> },
]}
/><Divider /><Timeline><Timeline.Item dotColor="green">创建借款单 · <DateText value={selectedLoan.createDate} /></Timeline.Item><Timeline.Item dotColor={selectedLoan.status === 'draft' ? 'gray' : 'green'}>{LOAN_STATUS[selectedLoan.status].label}</Timeline.Item></Timeline></>}
      </Drawer>
    </div>
  );
}
