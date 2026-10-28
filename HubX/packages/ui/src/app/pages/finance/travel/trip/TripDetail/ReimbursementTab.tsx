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
} from '@/design-system';
import {
  IconPlus,
  IconEye,
  IconStorage,
  IconFile,
  IconClockCircle,
  IconCheckCircle,
  IconSafe,
} from '@/design-system';
import type { Trip, Reimbursement, ReimbursementStatus } from '../../types';
import { getReimbursementList } from '../../travel-api';
import { ComplianceGuide } from '../../components/ComplianceGuide';
import { DataTable, DateText, DescriptionsCard, MetricCard, MoneyText, StatusTag, type StatusMap } from '@/design-system';

const { Text } = Typography;

interface ReimbursementTabProps {
  trip: Trip;
  onUpdate: () => void;
}

const REIMBURSEMENT_STATUS: StatusMap<ReimbursementStatus> = {
  draft: { label: '草稿', tone: 'neutral' },
  pending: { label: '待审批', tone: 'warning' },
  dept_approved: { label: '部门已审', tone: 'info' },
  finance_approved: { label: '财务已审', tone: 'info' },
  paid: { label: '已打款', tone: 'success' },
  completed: { label: '已完成', tone: 'success' },
  rejected: { label: '已拒绝', tone: 'danger' },
};

export function ReimbursementTab({ trip, onUpdate }: ReimbursementTabProps) {
  const [loading, setLoading] = useState(false);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [selectedReimbursement, setSelectedReimbursement] = useState<Reimbursement | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadReimbursements();
  }, [trip.id]);

  const loadReimbursements = async () => {
    setLoading(true);
    try {
      const result = await getReimbursementList({ tripId: trip.id });
      setReimbursements(result.list);
    } catch (error) {
      Message.error('加载报销数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 新建报销
  const handleCreate = () => {
    form.resetFields();
    setCreateVisible(true);
  };

  // 查看详情
  const handleViewDetail = (reimbursement: Reimbursement) => {
    setSelectedReimbursement(reimbursement);
  };

  const handleSave = () => {
    form.validate().then((values) => {
      const now = new Date().toISOString().slice(0, 10);
      const totalAmount = Number(values.totalAmount);
      const reimbursement: Reimbursement = {
        id: `reimbursement-${Date.now()}`, reimbursementNo: `BX${Date.now().toString().slice(-10)}`,
        tripId: trip.id, tripNo: trip.tripNo, applicantId: trip.applicantId, applicantName: trip.applicantName,
        department: trip.department, items: [], totalAmount, loanOffsets: [], offsetAmount: 0,
        netAmount: totalAmount, attachments: [], status: 'draft', remark: values.remark?.trim() || undefined,
        createDate: now, updateDate: now, approvalRecords: [],
      };
      setReimbursements((current) => [reimbursement, ...current]);
      setCreateVisible(false);
      onUpdate();
      Message.success('报销单已创建');
    });
  };

  const columns = [
    {
      title: '报销单号',
      dataIndex: 'reimbursementNo',
      width: 150,
      render: (value: string) => <Text style={{ fontWeight: 500 }}>{value}</Text>,
    },
    {
      title: '报销金额',
      dataIndex: 'totalAmount',
      width: 120,
      render: (value: number) => (
        <Space size={4}>
          <IconStorage style={{ color: 'var(--color-text-3)' }} />
          <MoneyText value={value} />
        </Space>
      ),
    },
    {
      title: '冲抵借款',
      dataIndex: 'offsetAmount',
      width: 120,
      render: (value: number) => (
        value > 0 ? <MoneyText value={-value} tone="danger" /> : '-'
      ),
    },
    {
      title: '实付金额',
      dataIndex: 'netAmount',
      width: 120,
      render: (value: number) => <Text style={{ fontWeight: 500 }}><MoneyText value={value} /></Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: ReimbursementStatus) => (
        <StatusTag meta={REIMBURSEMENT_STATUS[value]} />
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
      render: (_: unknown, record: Reimbursement) => (
        <Button type="text" size="small" icon={<IconEye />} onClick={() => handleViewDetail(record)}>
          查看
        </Button>
      ),
    },
  ];

  // 计算汇总
  const totalApplied = reimbursements.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalReimbursed = reimbursements
    .filter(r => r.status === 'completed' || r.status === 'paid')
    .reduce((sum, r) => sum + r.totalAmount, 0);
  const pendingAmount = reimbursements
    .filter(r => r.status === 'pending' || r.status === 'dept_approved' || r.status === 'finance_approved')
    .reduce((sum, r) => sum + r.totalAmount, 0);
  const pendingCount = reimbursements
    .filter(r => r.status === 'pending' || r.status === 'dept_approved' || r.status === 'finance_approved').length;
  const totalOffset = reimbursements.reduce((sum, r) => sum + (r.offsetAmount || 0), 0);
  const totalNet = reimbursements.reduce((sum, r) => sum + (r.netAmount || 0), 0);
  const loanTotal = trip.loans?.reduce((sum, l) => sum + l.amount, 0) ?? 0;
  const subsidyTotal = trip.subsidy?.totalAmount ?? 0;
  const netBalance = totalApplied + subsidyTotal - loanTotal;
  const completionRate = totalApplied > 0 ? Math.round((totalReimbursed / totalApplied) * 100) : 0;

  return (
    <div className="trip-tab-pane">
      {/* 差旅资金三账合一轧差清算看板 */}
      <div className="trip-settlement-board">
        <div className="trip-settlement-board__header">
          <div className="trip-settlement-board__title">
            <IconSafe style={{ color: 'rgb(var(--primary-6))' }} />
            <span>差旅资金综合轧差清算看板</span>
            <StatusTag size="small" tone="info">三账合一</StatusTag>
          </div>
          <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
            公式：实际应退补 = 申报报销总额 + 免税出差津贴 - 已领备用借款
          </Text>
        </div>

        <div className="trip-settlement-formula">
          <div className="trip-settlement-cell">
            <span className="trip-settlement-cell__label">
              <IconFile style={{ color: 'rgb(var(--primary-6))' }} /> 报销申报总额
            </span>
            <span className="trip-settlement-cell__value" style={{ color: 'rgb(var(--primary-6))' }}>
              <MoneyText value={totalApplied} />
            </span>
            <span className="trip-settlement-cell__meta">
              已结打款 <MoneyText value={totalReimbursed} />
            </span>
          </div>

          <div className="trip-settlement-operator">＋</div>

          <div className="trip-settlement-cell">
            <span className="trip-settlement-cell__label">
              <IconCheckCircle style={{ color: 'var(--ds-tone-purple-fg)' }} /> 异地考勤津贴
            </span>
            <span className="trip-settlement-cell__value" style={{ color: 'var(--ds-tone-purple-fg)' }}>
              <MoneyText value={subsidyTotal} />
            </span>
            <span className="trip-settlement-cell__meta">
              随薪资个税免征核发
            </span>
          </div>

          <div className="trip-settlement-operator">－</div>

          <div className="trip-settlement-cell">
            <span className="trip-settlement-cell__label">
              <IconClockCircle style={{ color: 'var(--ds-tone-warning-fg)' }} /> 已领备用金借款
            </span>
            <span className="trip-settlement-cell__value" style={{ color: 'var(--ds-tone-warning-fg)' }}>
              <MoneyText value={loanTotal} />
            </span>
            <span className="trip-settlement-cell__meta">
              已冲抵 <MoneyText value={totalOffset} />
            </span>
          </div>

          <div className="trip-settlement-operator">＝</div>

          <div
            className={`trip-settlement-result ${
              netBalance > 0
                ? 'trip-settlement-result--to-pay'
                : netBalance < 0
                  ? 'trip-settlement-result--to-refund'
                  : 'trip-settlement-result--balanced'
            }`}
          >
            <span className="trip-settlement-cell__label">
              {netBalance > 0 ? '公司待付员工净额' : netBalance < 0 ? '员工待退公司款项' : '资金完全结清平衡'}
            </span>
            <span className="trip-settlement-cell__value">
              {netBalance !== 0
                ? <MoneyText value={Math.abs(netBalance)} />
                : <MoneyText value={0} fractionDigits={2} />}
            </span>
            <span className="trip-settlement-cell__meta">
              {netBalance > 0 ? '待财务安排付款' : netBalance < 0 ? '请向财务退还余款' : '账目平衡'}
            </span>
          </div>
        </div>
      </div>

      {/* 顶部专业微指标卡片组（保留资金口径，由 MetricCard 承接同构结构） */}
      <div className="trip-stat-grid">
        <MetricCard
          className="trip-stat-card"
          label={<><span className="trip-stat-card__icon" style={{ background: 'var(--ds-tone-info-bg)', color: 'rgb(var(--primary-6))' }}><IconFile /></span>报销总额</>}
          value={<MoneyText value={totalApplied} />}
          badge={<StatusTag size="small" tone="info">累计申报</StatusTag>}
          detail={<span className="trip-stat-card__meta"><span>共计 {reimbursements.length} 笔单据</span><span>已打款 <MoneyText value={totalReimbursed} /></span></span>}
        />

        <MetricCard
          className="trip-stat-card"
          label={<><span className="trip-stat-card__icon" style={{ background: 'var(--ds-tone-warning-bg)', color: 'var(--ds-tone-warning-fg)' }}><IconClockCircle /></span>待审批在途款项</>}
          value={<span style={{ color: pendingAmount > 0 ? 'var(--ds-tone-warning-fg)' : 'inherit' }}><MoneyText value={pendingAmount} /></span>}
          badge={<StatusTag meta={{ label: pendingCount > 0 ? `${pendingCount} 笔审批中` : '暂无在途', tone: pendingAmount > 0 ? 'warning' : 'neutral' }} />}
          detail={<span className="trip-stat-card__meta"><span>部门/财务核决中</span><span>实付款将扣减借款</span></span>}
        />

        <MetricCard
          className="trip-stat-card"
          label={<><span className="trip-stat-card__icon" style={{ background: 'var(--ds-tone-success-bg)', color: 'var(--ds-tone-success-fg)' }}><IconStorage /></span>累计冲抵借款</>}
          value={totalOffset > 0 ? <MoneyText value={-totalOffset} tone="danger" /> : <MoneyText value={0} />}
          badge={<StatusTag size="small" tone="success">自动冲账</StatusTag>}
          detail={<span className="trip-stat-card__meta"><span>实际打款：<MoneyText value={totalNet} /></span><span>余款转借款核销</span></span>}
        />

        <MetricCard
          className="trip-stat-card"
          label={<><span className="trip-stat-card__icon" style={{ background: 'var(--ds-tone-info-bg)', color: 'rgb(var(--primary-6))' }}><IconCheckCircle /></span>报销结清进度</>}
          value={`${completionRate}%`}
          badge={<StatusTag meta={{ label: `${completionRate}%`, tone: completionRate === 100 ? 'success' : 'info' }} />}
          detail={<span className="trip-stat-card__meta"><span>已付 {reimbursements.filter(r => r.status === 'completed' || r.status === 'paid').length} 笔</span><span>流程推进顺畅</span></span>}
        />
      </div>

      {/* 报销合规制度与限额指引 */}
      {trip.destinations?.[0] && (
        <div style={{ marginBottom: 16 }}>
          <ComplianceGuide
            destination={trip.destinations[0]}
            days={trip.days}
            department={trip.department || '销售部'}
            companions={trip.companions ?? []}
          />
        </div>
      )}

      {/* 专业精良的操作工具栏（与表格直接咬合） */}
      <div className="trip-section-toolbar">
        <div className="trip-section-toolbar__title">
          <span>报销记录明细</span>
          <StatusTag size="small" tone="neutral">
            共 {reimbursements.length} 笔单据
          </StatusTag>
        </div>

        <div className="trip-section-toolbar__actions">
          <Button type="primary" size="small" icon={<IconPlus />} onClick={handleCreate}>
            新增报销
          </Button>
        </div>
      </div>

      {/* 主体表格视图 */}
      <div style={{ marginTop: 8 }}>
        <DataTable
          columns={columns}
          data={reimbursements}
          loading={loading}
          rowKey="id"
          size="default"
          scroll={{ x: 800 }}
          pagination={false}
          emptyDescription="暂无报销记录"
        />
      </div>
      <Modal title="新增报销" visible={createVisible} onOk={handleSave} onCancel={() => setCreateVisible(false)} okText="保存草稿">
        <Form form={form} layout="vertical">
          <Form.Item label="报销金额" field="totalAmount" rules={[{ required: true, message: '请输入报销金额' }]}><InputNumber min={0.01} precision={2} prefix="¥" style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="报销说明" field="remark" rules={[{ required: true, message: '请输入报销说明' }]}><Input.TextArea rows={4} placeholder="说明本次报销的费用范围" /></Form.Item>
        </Form>
      </Modal>
      <Drawer title="报销详情与审批流" width={520} visible={Boolean(selectedReimbursement)} onCancel={() => setSelectedReimbursement(null)} footer={null}>
        {selectedReimbursement && <><DescriptionsCard
  columns={1}
  items={[
  { key: '报销单号', label: '报销单号', value: selectedReimbursement.reimbursementNo },
  { key: '申请人', label: '申请人', value: selectedReimbursement.applicantName },
  { key: '报销金额', label: '报销金额', value: <MoneyText value={selectedReimbursement.totalAmount} /> },
  { key: '冲抵借款', label: '冲抵借款', value: <MoneyText value={selectedReimbursement.offsetAmount} /> },
  { key: '实付金额', label: '实付金额', value: <MoneyText value={selectedReimbursement.netAmount} /> },
  { key: '说明', label: '说明', value: selectedReimbursement.remark || '-' },
]}
/><Divider /><Timeline><Timeline.Item dotColor="green">创建报销单 · <DateText value={selectedReimbursement.createDate} /></Timeline.Item><Timeline.Item dotColor={selectedReimbursement.status === 'draft' ? 'gray' : 'green'}>{REIMBURSEMENT_STATUS[selectedReimbursement.status].label}</Timeline.Item></Timeline></>}
      </Drawer>
    </div>
  );
}
