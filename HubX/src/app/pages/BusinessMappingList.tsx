import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Message,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconEdit, IconEye, IconPlus } from '@arco-design/web-react/icon';
import {
  loadBusinessApprovals,
  loadWorkflowTemplates,
  saveBusinessApprovals,
  type AssigneeType,
  type BusinessApprovalDefinition,
  type NodeAssignment,
  type WorkflowTemplateDefinition,
} from '@/app/approvals/configStore';

const Text = Typography.Text;
const assigneeTypeOptions: AssigneeType[] = ['具体人员', '上一节点负责人'];
const employeeOptions = ['张三（财务主管）', '李四（总经理）', '王五（运营总监）', '赵六（销售总监）'];

function normalizeAssignment(assignment: NodeAssignment): NodeAssignment {
  const validType = assignment.assigneeType === '具体人员' || assignment.assigneeType === '上一节点负责人';
  const assigneeType: AssigneeType = validType ? assignment.assigneeType : '具体人员';
  if (assigneeType === '上一节点负责人') {
    return { ...assignment, assigneeType, assigneeValue: '上一节点负责人' };
  }
  if (assignment.strategy === '单人审批') {
    return {
      ...assignment,
      assigneeType,
      assigneeValue: validType
        ? (Array.isArray(assignment.assigneeValue) ? assignment.assigneeValue[0] || '' : assignment.assigneeValue)
        : '',
    };
  }
  return {
    ...assignment,
    assigneeType,
    assigneeValue: validType
      ? (Array.isArray(assignment.assigneeValue) ? assignment.assigneeValue : assignment.assigneeValue ? [assignment.assigneeValue] : [])
      : [],
  };
}

function hasAssignee(value: string | string[]) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

export function BusinessMappingList() {
  const [businessApprovals, setBusinessApprovals] = useState<BusinessApprovalDefinition[]>(() => (
    loadBusinessApprovals().map((approval) => ({
      ...approval,
      assignments: approval.assignments.map(normalizeAssignment),
    }))
  ));
  const [templates, setTemplates] = useState<WorkflowTemplateDefinition[]>(loadWorkflowTemplates);
  const [configVisible, setConfigVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [editing, setEditing] = useState<BusinessApprovalDefinition | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<NodeAssignment[]>([]);
  const [form] = Form.useForm();

  useEffect(() => saveBusinessApprovals(businessApprovals), [businessApprovals]);

  const enabledTemplates = useMemo(() => templates.filter((template) => template.enabled), [templates]);
  const currentTemplate = templates.find((template) => template.id === selectedTemplateId);

  const refreshTemplates = () => setTemplates(loadWorkflowTemplates());

  const openCreate = () => {
    refreshTemplates();
    setEditing(null);
    setSelectedTemplateId(null);
    setAssignments([]);
    form.resetFields();
    form.setFieldsValue({ enabled: true });
    setConfigVisible(true);
  };

  const openConfig = (record: BusinessApprovalDefinition) => {
    refreshTemplates();
    setEditing(record);
    setSelectedTemplateId(record.templateId);
    setAssignments(record.assignments.map(normalizeAssignment));
    form.setFieldsValue({
      bizName: record.bizName,
      bizCode: record.bizCode,
      description: record.description,
      enabled: record.enabled,
    });
    setConfigVisible(true);
  };

  const openPreview = (record: BusinessApprovalDefinition) => {
    setEditing(record);
    setPreviewVisible(true);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((item) => item.id === templateId);
    setAssignments(template ? template.nodes.map((node) => ({
      nodeId: node.id,
      nodeName: node.name,
      strategy: node.strategy,
      assigneeType: '具体人员',
      assigneeValue: node.strategy === '单人审批' ? '' : [],
      skipIfEmpty: false,
    })) : []);
  };

  const updateAssignment = (nodeId: string, field: keyof NodeAssignment, value: string | string[] | boolean) => {
    setAssignments((current) => current.map((assignment) => {
      if (assignment.nodeId !== nodeId) return assignment;
      const next = { ...assignment, [field]: value };
      if (field === 'assigneeType') {
        next.assigneeValue = value === '上一节点负责人'
          ? '上一节点负责人'
          : assignment.strategy === '单人审批' ? '' : [];
      }
      return next;
    }));
  };

  const saveConfiguration = async () => {
    const values = await form.validate();
    const normalizedCode = String(values.bizCode).trim().toUpperCase();
    if (businessApprovals.some((item) => item.bizCode === normalizedCode && item.key !== editing?.key)) {
      Message.warning('业务编码已存在');
      return;
    }
    if (!selectedTemplateId) {
      Message.warning('请选择审批模板');
      return;
    }
    const incomplete = assignments.find((assignment) => !hasAssignee(assignment.assigneeValue) && !assignment.skipIfEmpty);
    if (incomplete) {
      Message.warning(`请配置“${incomplete.nodeName}”的审批人`);
      return;
    }
    const template = templates.find((item) => item.id === selectedTemplateId);
    const definition: BusinessApprovalDefinition = {
      key: editing?.key || `business-${Date.now()}`,
      bizCode: normalizedCode,
      bizName: values.bizName,
      description: values.description || '',
      templateId: selectedTemplateId,
      templateName: template?.name || '',
      assignments,
      enabled: values.enabled ?? true,
      updatedAt: '2026-07-29',
    };
    setBusinessApprovals((current) => editing
      ? current.map((item) => item.key === editing.key ? definition : item)
      : [definition, ...current]);
    Message.success(editing ? '业务审批配置已更新' : '业务审批已新增并完成配置');
    setConfigVisible(false);
  };

  const columns = [
    {
      title: '业务审批',
      render: (_: unknown, record: BusinessApprovalDefinition) => (
        <Space direction="vertical" size={2}>
          <Text bold>{record.bizName}</Text>
          <Text type="secondary">{record.bizCode} · {record.description || '暂无说明'}</Text>
        </Space>
      ),
    },
    {
      title: '审批模板',
      width: 180,
      render: (_: unknown, record: BusinessApprovalDefinition) => record.templateName
        ? <Tag color="arcoblue">{record.templateName}</Tag>
        : <Text type="secondary">未配置</Text>,
    },
    {
      title: '审批流程',
      width: 120,
      render: (_: unknown, record: BusinessApprovalDefinition) => `${record.assignments.length} 个节点`,
    },
    {
      title: '状态',
      width: 100,
      render: (_: unknown, record: BusinessApprovalDefinition) => (
        <Switch
          size="small"
          checked={record.enabled}
          onChange={(enabled) => setBusinessApprovals((current) => current.map((item) => item.key === record.key ? { ...item, enabled } : item))}
        />
      ),
    },
    { title: '最近更新', dataIndex: 'updatedAt', width: 120 },
    {
      title: '操作',
      width: 150,
      render: (_: unknown, record: BusinessApprovalDefinition) => (
        <Space size={4}>
          <Tooltip content="配置">
            <Button type="text" size="small" icon={<IconEdit />} onClick={() => openConfig(record)} />
          </Tooltip>
          <Tooltip content="预览">
            <Button type="text" size="small" icon={<IconEye />} onClick={() => openPreview(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
        <div>
          <Typography.Title heading={5} style={{ margin: 0 }}>业务审批配置</Typography.Title>
          <Text type="secondary">新增 HubX 业务审批，绑定审批模板，并为每个节点配置审批人。</Text>
        </div>
        <Button type="primary" icon={<IconPlus />} onClick={openCreate}>新增业务审批</Button>
      </div>

      <Card bordered={false}>
        <Table rowKey="key" columns={columns} data={businessApprovals} pagination={false} />
      </Card>

      <Modal
        title={editing ? `配置业务审批 — ${editing.bizName}` : '新增业务审批'}
        visible={configVisible}
        onCancel={() => setConfigVisible(false)}
        onOk={saveConfiguration}
        okText={editing ? '保存配置' : '新增并启用'}
        maskClosable={false}
        style={{ width: 820 }}
      >
        <Form form={form} layout="vertical">
          <div style={{ padding: '12px 16px', marginBottom: 18, borderRadius: 8, background: 'var(--color-fill-1)' }}>
            <div style={{ fontWeight: 500, marginBottom: 12 }}>1. 业务信息</div>
            <div className="flex gap-3">
              <Form.Item label="业务审批名称" field="bizName" rules={[{ required: true, message: '请输入业务审批名称' }]} style={{ flex: 1 }}>
                <Input placeholder="如：项目立项审批" />
              </Form.Item>
              <Form.Item label="业务编码" field="bizCode" rules={[{ required: true, match: /^[A-Za-z][A-Za-z0-9_]*$/, message: '请输入字母开头的编码' }]} style={{ width: 220 }}>
                <Input placeholder="如：PROJECT_INIT" disabled={Boolean(editing)} />
              </Form.Item>
              <Form.Item label="启用" field="enabled" triggerPropName="checked" style={{ width: 70 }}>
                <Switch />
              </Form.Item>
            </div>
            <Form.Item label="业务说明" field="description" style={{ marginBottom: 0 }}>
              <Input.TextArea rows={2} placeholder="说明该审批的触发场景" />
            </Form.Item>
          </div>
        </Form>

        <div style={{ padding: '12px 16px', marginBottom: 18, borderRadius: 8, background: 'var(--color-fill-1)' }}>
          <div style={{ fontWeight: 500, marginBottom: 10 }}>2. 选择审批模板</div>
          <Select
            value={selectedTemplateId || undefined}
            placeholder="请选择已启用的审批模板"
            style={{ width: 360 }}
            onChange={handleTemplateChange}
          >
            {enabledTemplates.map((template) => (
              <Select.Option key={template.id} value={template.id}>{template.id} — {template.name}</Select.Option>
            ))}
          </Select>
          {enabledTemplates.length === 0 ? <Text type="secondary" style={{ marginLeft: 12 }}>请先创建并启用审批模板</Text> : null}
        </div>

        {currentTemplate && assignments.length > 0 ? (
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--color-fill-1)' }}>
            <div style={{ fontWeight: 500, marginBottom: 10 }}>3. 配置节点审批人</div>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              {assignments.map((assignment, index) => (
                <Card key={assignment.nodeId} size="small" bodyStyle={{ padding: 12 }}>
                  <div className="flex items-start gap-3">
                    <Tag color="arcoblue">节点 {index + 1}</Tag>
                    <div style={{ width: 150 }}>
                      <Text bold>{assignment.nodeName}</Text>
                      <div><Text type="secondary">{assignment.strategy}</Text></div>
                    </div>
                    <Select
                      value={assignment.assigneeType}
                      onChange={(value) => updateAssignment(assignment.nodeId, 'assigneeType', value)}
                      style={{ width: 150 }}
                    >
                      {assigneeTypeOptions.map((option) => <Select.Option key={option} value={option}>{option}</Select.Option>)}
                    </Select>
                    {assignment.assigneeType === '具体人员' ? (
                      <Select
                        mode={assignment.strategy === '单人审批' ? undefined : 'multiple'}
                        value={hasAssignee(assignment.assigneeValue) ? assignment.assigneeValue : undefined}
                        placeholder={assignment.strategy === '单人审批' ? '请选择审批人' : '请选择多个审批人'}
                        onChange={(value) => updateAssignment(assignment.nodeId, 'assigneeValue', value)}
                        style={{ width: 240 }}
                      >
                        {employeeOptions.map((option) => <Select.Option key={option} value={option}>{option}</Select.Option>)}
                      </Select>
                    ) : (
                      <div style={{ width: 240, height: 32, display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: 4, background: 'var(--color-fill-2)', color: 'var(--color-text-2)' }}>
                        自动取上一节点负责人
                      </div>
                    )}
                    <Checkbox
                      checked={assignment.skipIfEmpty}
                      onChange={(value) => updateAssignment(assignment.nodeId, 'skipIfEmpty', value)}
                    >
                      审批人为空时跳过
                    </Checkbox>
                  </div>
                </Card>
              ))}
            </Space>
          </div>
        ) : null}
      </Modal>

      <Modal
        title={`审批链路预览 — ${editing?.bizName || ''}`}
        visible={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={<Button onClick={() => setPreviewVisible(false)}>关闭</Button>}
        style={{ width: 640 }}
      >
        {editing ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space><Text type="secondary">审批模板</Text><Tag color="arcoblue">{editing.templateName}</Tag></Space>
            <Card size="small"><Tag color="green">发起人提交</Tag></Card>
            {editing.assignments.map((assignment, index) => (
              <Card key={assignment.nodeId} size="small" title={`节点 ${index + 1}：${assignment.nodeName}`}>
                <Space>
                  <Tag>{assignment.strategy}</Tag>
                  <Text>审批人：{hasAssignee(assignment.assigneeValue)
                    ? Array.isArray(assignment.assigneeValue) ? assignment.assigneeValue.join('、') : assignment.assigneeValue
                    : '未配置'}</Text>
                  <Text type="secondary">（{assignment.assigneeType}）</Text>
                </Space>
              </Card>
            ))}
            <Card size="small"><Tag color="gray">审批结束</Tag><Text type="secondary" style={{ marginLeft: 8 }}>仅支持通过、驳回；驳回后返回发起人重新发起</Text></Card>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
}
