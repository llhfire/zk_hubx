import { useMemo, useState, type CSSProperties } from 'react';
import {
  Button,
  Form,
  Input,
  Message,
  Modal,
  Select,
  Space,
  Tooltip,
  Typography,
} from '@/design-system';
import { IconSearch, IconEye, IconCheck, IconArrowRight } from '@/design-system';
import { useNavigate } from 'react-router';
import { useApprovals } from '../../../approvals/ApprovalContext';
import type { ApprovalRecord, ApprovalStatus } from '../../../approvals/types';
import { LeadDetail360 } from '../../sales/leads/LeadDetail360';
import {
  DataTable,
  DateText,
  DescriptionsCard,
  MoneyText,
  PageHeader,
  PageShell,
  SectionCard,
  SectionTabs,
  StatusTag,
  type StatusMap,
} from '@/design-system';

const Text = Typography.Text;
const APPROVAL_STATUS: StatusMap<ApprovalStatus> = {
  approving: { label: '审批中', tone: 'warning' },
  approved: { label: '已通过', tone: 'success' },
  rejected: { label: '已驳回', tone: 'danger' },
  withdrawn: { label: '已撤回', tone: 'neutral' },
  invalidated: { label: '已作废', tone: 'neutral' },
};

const APPROVAL_NODE_STATUS: StatusMap<ApprovalRecord['nodes'][number]['status']> = {
  approved: { label: '已通过', tone: 'success' },
  rejected: { label: '已驳回', tone: 'danger' },
  pending: { label: '待审批', tone: 'warning' },
  skipped: { label: '待审批', tone: 'warning' },
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

  /** 待我审批的数量：与「待我审批」页签的筛选条件保持一致，避免页签数字和列表对不上。 */
  const pendingCount = useMemo(
    () => records.filter((item) => item.source === 'hubx' && item.status === 'approving' && item.currentApprover === '张三').length,
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
          <Text type="secondary">
            {record.typeName}
            {record.amount ? <><span> · </span><MoneyText value={record.amount} /></> : ''}
          </Text>
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
          <StatusTag meta={APPROVAL_STATUS[value]} />
          {record.overdue ? <StatusTag tone="danger">已超时</StatusTag> : null}
        </Space>
      ),
    },
    { title: '发起时间', dataIndex: 'createdAt', width: 160, render: (value: string) => <DateText value={value} mode="datetime" /> },
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
    <PageShell>
      <PageHeader
        title="审批中心"
        description="集中处理 HubX 业务审批，并查看企业微信只读审批记录。"
      />
      <SectionCard>
        <SectionTabs
          activeKey={activeView}
          onChange={(value) => setActiveView(value as ViewKey)}
          items={[
            { key: 'pending', label: '待我审批', count: pendingCount },
            { key: 'initiated', label: '我发起的' },
            { key: 'handled', label: '我已处理' },
            { key: 'wecom', label: '企业微信审批' },
            { key: 'all', label: '全部审批' },
          ]}
        />
        <DataTable
          rowKey="id"
          columns={columns}
          data={data}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
          toolbar={(
            <>
              <Input prefix={<IconSearch />} allowClear placeholder="搜索编号、事项、发起人或审批人" style={{ width: 300 }} value={keyword} onChange={setKeyword} />
              <Select allowClear placeholder="审批类型" style={{ width: 150 }} value={typeCode || undefined} onChange={(value) => setTypeCode(value || '')} options={typeOptions} />
              <Select
                allowClear
                placeholder="审批状态"
                style={{ width: 140 }}
                value={status || undefined}
                onChange={(value) => setStatus(value || '')}
                options={Object.entries(APPROVAL_STATUS).map(([value, meta]) => ({ value, label: meta.label }))}
              />
            </>
          )}
        />
      </SectionCard>

      <Modal
        className="hubx-modal"
        title={detail?.typeCode === 'QUOTATION' ? '报价审批详情' : '审批详情'}
        visible={Boolean(detail) && !decision}
        onCancel={() => setDetail(null)}
        style={(detail?.typeCode === 'QUOTATION'
          ? {
              width: 'calc(100vw - 64px)',
              maxWidth: 1480,
              '--modal-content-max-height': 'calc(100vh - 190px)',
              '--modal-content-overflow': 'auto',
              '--modal-content-padding': 0,
              '--modal-content-bg': 'var(--color-fill-1)',
            }
          : { width: 720 }) as CSSProperties}
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
          <LeadDetail360 leadId={detail.route.match(/\/leads\/([^/?#]+)/)?.[1]} initialSideTab="quotation" />
        ) : detail && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {detail.source === 'wecom' ? <StatusTag tone="success">企业微信审批 · 只读</StatusTag> : <StatusTag tone="info">HubX 业务审批</StatusTag>}
            <DescriptionsCard
              bare
              columns={2}
              items={[
                { key: 'approvalNo', label: '审批编号', value: detail.approvalNo },
                { key: 'typeName', label: '审批类型', value: detail.typeName },
                { key: 'title', label: '审批事项', value: detail.title, long: true },
                { key: 'applicant', label: '发起人', value: detail.applicant },
                { key: 'status', label: '状态', value: <StatusTag meta={APPROVAL_STATUS[detail.status]} /> },
                { key: 'currentApprover', label: '当前审批人', value: detail.currentApprover || '-' },
                { key: 'createdAt', label: '发起时间', value: detail.createdAt },
                { key: 'updatedAt', label: '最后更新', value: detail.updatedAt },
              ]}
            />
            {detail.nodes.map((node, index) => (
              <SectionCard key={node.id} title={`节点 ${index + 1}：${node.name}`}>
                <Space>
                  <StatusTag>{node.strategy}</StatusTag>
                  <Text>审批人：{node.approvers.join('、')}</Text>
                  <StatusTag meta={APPROVAL_NODE_STATUS[node.status]} />
                </Space>
                {node.comment ? <div style={{ marginTop: 8 }}><Text type="secondary">审批意见：{node.comment}</Text></div> : null}
              </SectionCard>
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
    </PageShell>
  );
}
