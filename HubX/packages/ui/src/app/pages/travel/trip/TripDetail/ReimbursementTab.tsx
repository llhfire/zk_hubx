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
} from '@arco-design/web-react/icon';
import type { Trip, Reimbursement, ReimbursementStatus } from '../../types';
import { getReimbursementList } from '../../travel-api';

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

  // 计算汇总
  const totalReimbursed = reimbursements
    .filter(r => r.status === 'completed' || r.status === 'paid')
    .reduce((sum, r) => sum + r.totalAmount, 0);
  const pendingAmount = reimbursements
    .filter(r => r.status === 'pending' || r.status === 'dept_approved' || r.status === 'finance_approved')
    .reduce((sum, r) => sum + r.totalAmount, 0);

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

  return (
    <div style={{ padding: 16 }}>
      {/* 汇总信息 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <div><Text type="secondary">报销总额</Text></div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{totalReimbursed.toLocaleString()}</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div><Text type="secondary">待审批金额</Text></div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff7d00' }}>¥{pendingAmount.toLocaleString()}</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <div><Text type="secondary">报销单数</Text></div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>{reimbursements.length}</div>
          </Card>
        </Col>
      </Row>

      {/* 报销列表 */}
      <Card
        title="报销记录"
        extra={
          <Button type="primary" size="small" icon={<IconPlus />} onClick={handleCreate}>
            新增报销
          </Button>
        }
      >
        <Table
          columns={columns}
          data={reimbursements}
          loading={loading}
          rowKey="id"
          scroll={{ x: 800 }}
          pagination={false}
          noDataContent="暂无报销记录"
        />
      </Card>
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
