import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Message,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconSearch, IconEye, IconCheck, IconArrowRight } from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router';
import { useApprovals } from '@/app/approvals/ApprovalContext';
import type { ApprovalRecord, ApprovalStatus } from '@/app/approvals/types';
import { LeadDetail } from '@/app/pages/LeadDetail';

const Text = Typography.Text;
const statusMeta: Record<ApprovalStatus, { label: string; color: string }> = {
  approving: { label: '审批中', color: 'orange' },
  approved: { label: '已通过', color: 'green' },
  rejected: { label: '已驳回', color: 'red' },
  withdrawn: { label: '已撤回', color: 'gray' },
  invalidated: { label: '已作废', color: 'gray' },
};

type ViewKey = 'pending' | 'initiated' | 'handled' | 'wecom' | 'all';

export function ApprovalCenter() {
  const navigate = useNavigate();
  const { records, decideApproval } = useApprovals();
  const [activeView, setActiveView] = useState<ViewKey>('pending');
  const [keyword, setKeyword] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState<ApprovalRecord | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [decisionForm] = Form.useForm();

  const typeOptions = useMemo(
    () => [...new Map(records.map((item) => [item.typeCode, item.typeName])).entries()].map(([value, label]) => ({ value, label })),
    [records],
  );

  const data = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return records.filter((item) => {
      if (activeView === 'pending' && !(item.source === 'hubx' && item.status === 'approving' && item.currentApprover === '张三')) return false;
      if (activeView === 'initiated' && !(item.source === 'hubx' && item.applicant === '张三')) return false;
      if (activeView === 'handled' && !(item.source === 'hubx' && item.handledBy?.includes('张三'))) return false;
      if (activeView === 'wecom' && item.source !== 'wecom') return false;
      if (typeCode && item.typeCode !== typeCode) return false;
      if (status && item.status !== status) return false;
      if (normalizedKeyword && ![item.approvalNo, item.title, item.applicant, item.currentApprover ?? ''].some((value) => value.toLowerCase().includes(normalizedKeyword))) return false;
      return true;
    });
  }, [activeView, keyword, records, status, typeCode]);

  const submitDecision = async () => {
    if (!detail || !decision) return;
    const values = await decisionForm.validate();
    decideApproval(detail.id, decision, values.comment ?? '');
    Message.success(decision === 'approve' ? '审批已通过' : '审批已驳回发起人');
    setDecision(null);
    setDetail(null);
  };

  const columns = [
    { title: '审批编号', dataIndex: 'approvalNo', width: 160 },
    {
      title: '审批事项',
      width: 280,
      render: (_: unknown, record: ApprovalRecord) => (
        <Space direction="vertical" size={2}>
          <Text bold>{record.title}</Text>
          <Text type="secondary">{record.typeName}{record.amount ? ` · ¥${record.amount.toLocaleString()}` : ''}</Text>
        </Space>
      ),
    },
    { title: '发起人', dataIndex: 'applicant', width: 100 },
    { title: '当前审批人', dataIndex: 'currentApprover', width: 120, render: (value?: string) => value || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value: ApprovalStatus, record: ApprovalRecord) => (
        <Space size={4}>
          <Tag color={statusMeta[value].color}>{statusMeta[value].label}</Tag>
          {record.overdue ? <Tag color="red">已超时</Tag> : null}
        </Space>
      ),
    },
    { title: '发起时间', dataIndex: 'createdAt', width: 160 },
    {
      title: '操作',
      width: 160,
      fixed: 'right' as const,
      render: (_: unknown, record: ApprovalRecord) => (
        <Space>
          <Tooltip content="详情">
            <Button type="text" size="small" icon={<IconEye />} onClick={() => setDetail(record)} />
          </Tooltip>
          {record.source === 'hubx' && record.status === 'approving' && record.currentApprover === '张三'
            ? <Tooltip content="审批"><Button type="primary" size="mini" icon={<IconCheck />} onClick={() => setDetail(record)} /></Tooltip>
            : record.route
              ? <Tooltip content="查看业务"><Button type="text" size="small" icon={<IconArrowRight />} onClick={() => navigate(record.route!)} /></Tooltip>
              : null}
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Text type="secondary">集中处理 HubX 业务审批，并查看企业微信只读审批记录。</Text>
      </div>
      <Card bordered={false}>
        <Tabs activeTab={activeView} onChange={(value) => setActiveView(value as ViewKey)}>
          <Tabs.TabPane key="pending" title={`待我审批（${records.filter((item) => item.source === 'hubx' && item.status === 'approving' && item.currentApprover === '张三').length}）`} />
          <Tabs.TabPane key="initiated" title="我发起的" />
          <Tabs.TabPane key="handled" title="我已处理" />
          <Tabs.TabPane key="wecom" title="企业微信审批" />
          <Tabs.TabPane key="all" title="全部审批" />
        </Tabs>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input prefix={<IconSearch />} allowClear placeholder="搜索编号、事项、发起人或审批人" style={{ width: 300 }} value={keyword} onChange={setKeyword} />
          <Select allowClear placeholder="审批类型" style={{ width: 150 }} value={typeCode || undefined} onChange={(value) => setTypeCode(value || '')} options={typeOptions} />
          <Select
            allowClear
            placeholder="审批状态"
            style={{ width: 140 }}
            value={status || undefined}
            onChange={(value) => setStatus(value || '')}
            options={Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))}
          />
        </Space>
        <Table rowKey="id" columns={columns} data={data} pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} />
      </Card>

      <Modal
        title={detail?.typeCode === 'QUOTATION' ? '报价审批详情' : '审批详情'}
        visible={Boolean(detail) && !decision}
        onCancel={() => setDetail(null)}
        style={detail?.typeCode === 'QUOTATION'
          ? { width: 'calc(100vw - 64px)', maxWidth: 1480 }
          : { width: 720 }}
        bodyStyle={detail?.typeCode === 'QUOTATION'
          ? { height: 'calc(100vh - 190px)', padding: 0, overflow: 'auto', background: 'var(--color-fill-1)' }
          : undefined}
        footer={detail?.source === 'hubx' && detail.status === 'approving' && detail.currentApprover === '张三'
          ? (
            <Space>
              <Button onClick={() => setDetail(null)}>关闭</Button>
              <Button status="danger" onClick={() => { decisionForm.resetFields(); setDecision('reject'); }}>驳回</Button>
              <Button type="primary" onClick={() => { decisionForm.setFieldsValue({ comment: '同意' }); setDecision('approve'); }}>通过</Button>
            </Space>
          )
          : <Button onClick={() => setDetail(null)}>关闭</Button>}
      >
        {detail?.typeCode === 'QUOTATION' && detail.route ? (
          <LeadDetail leadId={detail.route.match(/\/leads\/([^/?#]+)/)?.[1]} initialSideTab="quotation" />
        ) : detail && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {detail.source === 'wecom' ? <Tag color="green">企业微信审批 · 只读</Tag> : <Tag color="arcoblue">HubX 业务审批</Tag>}
            <Descriptions
              column={2}
              border
              data={[
                { label: '审批编号', value: detail.approvalNo },
                { label: '审批类型', value: detail.typeName },
                { label: '审批事项', value: detail.title },
                { label: '发起人', value: detail.applicant },
                { label: '状态', value: statusMeta[detail.status].label },
                { label: '当前审批人', value: detail.currentApprover || '-' },
                { label: '发起时间', value: detail.createdAt },
                { label: '最后更新', value: detail.updatedAt },
              ]}
            />
            {detail.nodes.map((node, index) => (
              <Card key={node.id} size="small" title={`节点 ${index + 1}：${node.name}`}>
                <Space>
                  <Tag>{node.strategy}</Tag>
                  <Text>审批人：{node.approvers.join('、')}</Text>
                  <Tag color={node.status === 'approved' ? 'green' : node.status === 'rejected' ? 'red' : 'orange'}>
                    {node.status === 'approved' ? '已通过' : node.status === 'rejected' ? '已驳回' : '待审批'}
                  </Tag>
                </Space>
                {node.comment ? <div style={{ marginTop: 8 }}><Text type="secondary">审批意见：{node.comment}</Text></div> : null}
              </Card>
            ))}
          </Space>
        )}
      </Modal>

      <Modal
        title={decision === 'approve' ? '确认通过审批' : '驳回审批'}
        visible={Boolean(decision)}
        onCancel={() => setDecision(null)}
        onOk={submitDecision}
        okButtonProps={decision === 'reject' ? { status: 'danger' } : undefined}
        okText={decision === 'approve' ? '确认通过' : '确认驳回'}
      >
        <Form form={decisionForm} layout="vertical">
          <Form.Item
            label={decision === 'approve' ? '审批意见' : '驳回原因'}
            field="comment"
            rules={decision === 'reject' ? [{ required: true, minLength: 5, message: '请填写不少于 5 个字的驳回原因' }] : []}
          >
            <Input.TextArea rows={4} placeholder={decision === 'approve' ? '审批意见选填' : '请说明驳回原因'} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
