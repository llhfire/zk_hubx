import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Tag,
  Table,
  Space,
  Typography,
  Grid,
  Message,
  Spin,
  Drawer,
  Descriptions,
  Divider,
  Timeline,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Progress,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconEye,
  IconStorage,
  IconRight,
  IconClockCircle,
  IconCheckCircle,
  IconCompass,
} from '@arco-design/web-react/icon';
import type { Trip, Loan, LoanStatus } from '../../types';
import { getLoanList } from '../../travel-api';

const { Text, Title } = Typography;
const { Row, Col } = Grid;

interface LoanTabProps {
  trip: Trip;
  onUpdate: () => void;
}

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
          <Progress
            type="circle"
            percent={offsetRate}
            width={96}
            color={offsetRate === 100 ? '#00b42a' : '#165dff'}
            formatText={(p) => (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-1)' }}>{p}%</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>闭环完成率</div>
              </div>
            )}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-2)', textAlign: 'center' }}>
            <span>资金闭环完成率</span>
            <Tag size="small" color={offsetRate === 100 ? 'green' : 'arcoblue'} style={{ marginLeft: 4 }}>
              {offsetRate === 100 ? '已完全清账' : '核销中'}
            </Tag>
          </div>
        </div>

        <div className="trip-loan-bullet-container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconStorage style={{ color: '#165dff' }} /> 借款总额
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-1)', marginTop: 4 }}>
                ¥{totalLoanAmount.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
                共计 {loans.length} 笔借款支出
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconCheckCircle style={{ color: '#00b42a' }} /> 已冲抵核销金额
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#00b42a', marginTop: 4 }}>
                ¥{totalOffsetAmount.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
                报销单据自动对冲
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconClockCircle style={{ color: totalRemaining > 0 ? '#ff7d00' : '#86909c' }} /> 剩余待还/在途借款
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: totalRemaining > 0 ? '#ff7d00' : 'var(--color-text-1)', marginTop: 4 }}>
                ¥{totalRemaining.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
                {totalRemaining > 0 ? '差旅归来 5 日内核销' : '无未清待还借款'}
              </div>
            </div>
          </div>

          {/* 核销对冲进度横向对比条 */}
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: 'var(--color-text-3)' }}>已核销冲抵进度</span>
              <span style={{ fontWeight: 600 }}>{totalOffsetAmount.toLocaleString()} / {totalLoanAmount.toLocaleString()} ({offsetRate}%)</span>
            </div>
            <Progress
              percent={offsetRate}
              size="small"
              status={offsetRate === 100 ? 'success' : 'normal'}
              color={offsetRate === 100 ? '#00b42a' : '#165dff'}
            />
          </div>
        </div>
      </div>

      {/* 专业精良的操作工具栏（与表格直接咬合） */}
      <div className="trip-section-toolbar">
        <div className="trip-section-toolbar__title">
          <span>借款记录明细</span>
          <Tag size="small" color="gray">
            共 {loans.length} 笔记录
          </Tag>
        </div>

        <div className="trip-section-toolbar__actions">
          <Button type="primary" size="small" icon={<IconPlus />} onClick={handleCreate}>
            新增借款
          </Button>
        </div>
      </div>

      {/* 主体表格视图 */}
      <div style={{ marginTop: 8 }}>
        <Table
          columns={columns}
          data={loans}
          loading={loading}
          rowKey="id"
          scroll={{ x: 900 }}
          pagination={false}
          noDataContent="暂无借款记录"
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
                      background: '#f7f8fa',
                      borderRadius: 4,
                    }}
                  >
                    <Space>
                      <Tag>{offset.loanNo}</Tag>
                      <IconRight style={{ color: '#86909c' }} />
                      <Tag>{offset.reimbursementId}</Tag>
                    </Space>
                    <Space>
                      <Text type="secondary">{offset.offsetDate}</Text>
                      <Text style={{ fontWeight: 500, color: '#00b42a' }}>¥{offset.offsetAmount.toLocaleString()}</Text>
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
        {selectedLoan && <><Descriptions column={1} data={[
          { label: '借款单号', value: selectedLoan.loanNo }, { label: '申请人', value: selectedLoan.applicantName },
          { label: '借款金额', value: `¥${selectedLoan.amount.toLocaleString()}` }, { label: '借款理由', value: selectedLoan.reason },
          { label: '期望打款日', value: selectedLoan.expectedPayDate || '-' }, { label: '剩余未冲抵', value: `¥${selectedLoan.remainingAmount.toLocaleString()}` },
        ]} /><Divider /><Timeline><Timeline.Item dotColor="green">创建借款单 · {selectedLoan.createDate}</Timeline.Item><Timeline.Item dotColor={selectedLoan.status === 'draft' ? 'gray' : 'green'}>{statusConfig[selectedLoan.status].text}</Timeline.Item></Timeline></>}
      </Drawer>
    </div>
  );
}
