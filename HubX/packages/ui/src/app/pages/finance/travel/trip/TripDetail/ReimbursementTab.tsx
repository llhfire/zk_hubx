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
} from '@arco-design/web-react';
import {
  IconPlus,
  IconEye,
  IconStorage,
  IconFile,
  IconClockCircle,
  IconCheckCircle,
  IconSafe,
  IconDown,
  IconUp,
} from '@arco-design/web-react/icon';
import type { Trip, Reimbursement, ReimbursementStatus } from '../../types';
import { getReimbursementList } from '../../travel-api';
import { ComplianceGuide } from '../../components/ComplianceGuide';

const { Text, Title } = Typography;
const { Row, Col } = Grid;

interface ReimbursementTabProps {
  trip: Trip;
  onUpdate: () => void;
}

const statusConfig: Record<ReimbursementStatus, { color: string; text: string }> = {
  draft: { color: 'gray', text: '草稿' },
  pending: { color: 'orange', text: '待审批' },
  dept_approved: { color: 'blue', text: '部门已审' },
  finance_approved: { color: 'blue', text: '财务已审' },
  paid: { color: 'green', text: '已打款' },
  completed: { color: 'green', text: '已完成' },
  rejected: { color: 'red', text: '已拒绝' },
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
          <IconStorage style={{ color: '#86909c' }} />
          <span>¥{value.toLocaleString()}</span>
        </Space>
      ),
    },
    {
      title: '冲抵借款',
      dataIndex: 'offsetAmount',
      width: 120,
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
            <IconSafe style={{ color: '#165dff' }} />
            <span>差旅资金综合轧差清算看板</span>
            <Tag size="small" color="arcoblue">三账合一</Tag>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            公式：实际应退补 = 申报报销总额 + 免税出差津贴 - 已领备用借款
          </Text>
        </div>

        <div className="trip-settlement-formula">
          <div className="trip-settlement-cell">
            <span className="trip-settlement-cell__label">
              <IconFile style={{ color: '#165dff' }} /> 报销申报总额
            </span>
            <span className="trip-settlement-cell__value" style={{ color: '#165dff' }}>
              ¥{totalApplied.toLocaleString()}
            </span>
            <span className="trip-settlement-cell__meta">
              已结打款 ¥{totalReimbursed.toLocaleString()}
            </span>
          </div>

          <div className="trip-settlement-operator">＋</div>

          <div className="trip-settlement-cell">
            <span className="trip-settlement-cell__label">
              <IconCheckCircle style={{ color: '#722ed1' }} /> 异地考勤津贴
            </span>
            <span className="trip-settlement-cell__value" style={{ color: '#722ed1' }}>
              ¥{subsidyTotal.toLocaleString()}
            </span>
            <span className="trip-settlement-cell__meta">
              随薪资个税免征核发
            </span>
          </div>

          <div className="trip-settlement-operator">－</div>

          <div className="trip-settlement-cell">
            <span className="trip-settlement-cell__label">
              <IconClockCircle style={{ color: '#ff7d00' }} /> 已领备用金借款
            </span>
            <span className="trip-settlement-cell__value" style={{ color: '#ff7d00' }}>
              ¥{loanTotal.toLocaleString()}
            </span>
            <span className="trip-settlement-cell__meta">
              已冲抵 ¥{totalOffset.toLocaleString()}
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
              {netBalance !== 0 ? `¥${Math.abs(netBalance).toLocaleString()}` : '¥0.00'}
            </span>
            <span className="trip-settlement-cell__meta">
              {netBalance > 0 ? '待财务安排付款' : netBalance < 0 ? '请向财务退还余款' : '账目平衡'}
            </span>
          </div>
        </div>
      </div>

      {/* 顶部专业微指标卡片组（4列对齐） */}
      <div className="trip-stat-grid">
        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span className="trip-stat-card__icon" style={{ background: '#e8f3ff', color: '#165dff' }}>
                <IconFile />
              </span>
              报销总额
            </span>
            <Tag size="small" color="blue">累计申报</Tag>
          </div>
          <div className="trip-stat-card__value">
            ¥{totalApplied.toLocaleString()}
          </div>
          <div className="trip-stat-card__meta">
            <span>共计 {reimbursements.length} 笔单据</span>
            <span>已打款 ¥{totalReimbursed.toLocaleString()}</span>
          </div>
        </div>

        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span className="trip-stat-card__icon" style={{ background: '#fff7e6', color: '#fa8c16' }}>
                <IconClockCircle />
              </span>
              待审批在途款项
            </span>
            <Tag size="small" color={pendingAmount > 0 ? 'orange' : 'gray'}>
              {pendingCount > 0 ? `${pendingCount} 笔审批中` : '暂无在途'}
            </Tag>
          </div>
          <div className="trip-stat-card__value" style={{ color: pendingAmount > 0 ? '#ff7d00' : 'inherit' }}>
            ¥{pendingAmount.toLocaleString()}
          </div>
          <div className="trip-stat-card__meta">
            <span>部门/财务核决中</span>
            <span>实付款将扣减借款</span>
          </div>
        </div>

        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span className="trip-stat-card__icon" style={{ background: '#e8ffea', color: '#00b42a' }}>
                <IconStorage />
              </span>
              累计冲抵借款
            </span>
            <Tag size="small" color="green">自动冲账</Tag>
          </div>
          <div className="trip-stat-card__value" style={{ color: totalOffset > 0 ? '#ff7d00' : 'inherit' }}>
            {totalOffset > 0 ? `-¥${totalOffset.toLocaleString()}` : '¥0'}
          </div>
          <div className="trip-stat-card__meta">
            <span>实际打款：¥{totalNet.toLocaleString()}</span>
            <span>余款转借款核销</span>
          </div>
        </div>

        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span className="trip-stat-card__icon" style={{ background: '#e8f3ff', color: '#165dff' }}>
                <IconCheckCircle />
              </span>
              报销结清进度
            </span>
            <Tag size="small" color={completionRate === 100 ? 'green' : 'arcoblue'}>
              {completionRate}%
            </Tag>
          </div>
          <div className="trip-stat-card__value">
            {completionRate}%
          </div>
          <div className="trip-stat-card__meta">
            <span>已付 {reimbursements.filter(r => r.status === 'completed' || r.status === 'paid').length} 笔</span>
            <span>流程推进顺畅</span>
          </div>
        </div>
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
          <Tag size="small" color="gray">
            共 {reimbursements.length} 笔单据
          </Tag>
        </div>

        <div className="trip-section-toolbar__actions">
          <Button type="primary" size="small" icon={<IconPlus />} onClick={handleCreate}>
            新增报销
          </Button>
        </div>
      </div>

      {/* 主体表格视图 */}
      <div style={{ marginTop: 8 }}>
        <Table
          columns={columns}
          data={reimbursements}
          loading={loading}
          rowKey="id"
          scroll={{ x: 800 }}
          pagination={false}
          noDataElement="暂无报销记录"
        />
      </div>
      <Modal title="新增报销" visible={createVisible} onOk={handleSave} onCancel={() => setCreateVisible(false)} okText="保存草稿">
        <Form form={form} layout="vertical">
          <Form.Item label="报销金额" field="totalAmount" rules={[{ required: true, message: '请输入报销金额' }]}><InputNumber min={0.01} precision={2} prefix="¥" style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="报销说明" field="remark" rules={[{ required: true, message: '请输入报销说明' }]}><Input.TextArea rows={4} placeholder="说明本次报销的费用范围" /></Form.Item>
        </Form>
      </Modal>
      <Drawer title="报销详情与审批流" width={520} visible={Boolean(selectedReimbursement)} onCancel={() => setSelectedReimbursement(null)} footer={null}>
        {selectedReimbursement && <><Descriptions column={1} data={[
          { label: '报销单号', value: selectedReimbursement.reimbursementNo }, { label: '申请人', value: selectedReimbursement.applicantName },
          { label: '报销金额', value: `¥${selectedReimbursement.totalAmount.toLocaleString()}` }, { label: '冲抵借款', value: `¥${selectedReimbursement.offsetAmount.toLocaleString()}` },
          { label: '实付金额', value: `¥${selectedReimbursement.netAmount.toLocaleString()}` }, { label: '说明', value: selectedReimbursement.remark || '-' },
        ]} /><Divider /><Timeline><Timeline.Item dotColor="green">创建报销单 · {selectedReimbursement.createDate}</Timeline.Item><Timeline.Item dotColor={selectedReimbursement.status === 'draft' ? 'gray' : 'green'}>{statusConfig[selectedReimbursement.status].text}</Timeline.Item></Timeline></>}
      </Drawer>
    </div>
  );
}
