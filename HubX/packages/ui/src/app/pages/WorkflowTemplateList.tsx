import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import {
  Button,
  Card,
  Form,
  Input,
  Message,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from '@arco-design/web-react';
import { IconArrowRight, IconCopy, IconDelete, IconEdit, IconPlus } from '@arco-design/web-react/icon';
import { PageHeader, PageShell } from '@/app/components/ui';
import {
  loadBusinessApprovals,
  loadWorkflowTemplates,
  saveWorkflowTemplates,
  type ApproveStrategy,
  type WorkflowTemplateDefinition,
} from '@/app/approvals/configStore';

const Text = Typography.Text;
type ApprovalNode = WorkflowTemplateDefinition['nodes'][number];

const strategyColor: Record<ApproveStrategy, string> = {
  单人审批: 'arcoblue',
  或签: 'orange',
  会签: 'purple',
};

function FlowPreview({ nodes }: { nodes: ApprovalNode[] }) {
  return (
    <div className="flex items-center flex-wrap gap-1">
      <Tag color="green">发起</Tag>
      {nodes.map((node) => (
        <span key={node.id} className="flex items-center gap-1">
          <IconArrowRight style={{ color: 'var(--color-text-4)' }} />
          <Tag color={strategyColor[node.strategy]}>{node.name}</Tag>
        </span>
      ))}
      <IconArrowRight style={{ color: 'var(--color-text-4)' }} />
      <Tag color="gray">结束</Tag>
    </div>
  );
}

export function WorkflowTemplateList() {
  const location = useLocation();
  const isSystemEntry = location.pathname.startsWith('/system/');
  const [templates, setTemplates] = useState<WorkflowTemplateDefinition[]>(loadWorkflowTemplates);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<WorkflowTemplateDefinition | null>(null);
  const [nodes, setNodes] = useState<ApprovalNode[]>([]);
  const [form] = Form.useForm();

  useEffect(() => saveWorkflowTemplates(templates), [templates]);

  const usageCount = useMemo(() => {
    const approvals = loadBusinessApprovals();
    return Object.fromEntries(templates.map((template) => [
      template.id,
      approvals.filter((approval) => approval.templateId === template.id).length,
    ]));
  }, [templates]);

  const openCreate = () => {
    setEditing(null);
    setNodes([{ id: `node-${Date.now()}`, name: '', strategy: '单人审批', rejectPolicy: '驳回至发起人' }]);
    form.resetFields();
    setVisible(true);
  };

  const openEdit = (template: WorkflowTemplateDefinition) => {
    setEditing(template);
    setNodes(template.nodes.map((node) => ({ ...node })));
    form.setFieldsValue({ name: template.name, description: template.description });
    setVisible(true);
  };

  const openCopy = (template: WorkflowTemplateDefinition) => {
    setEditing(null);
    setNodes(template.nodes.map((node) => ({ ...node, id: `node-${Date.now()}-${Math.random()}` })));
    form.setFieldsValue({ name: `${template.name}-副本`, description: template.description });
    setVisible(true);
  };

  const saveTemplate = async () => {
    const values = await form.validate();
    if (nodes.some((node) => !node.name.trim())) {
      Message.warning('请填写完整的审批节点名称');
      return;
    }
    if (editing) {
      setTemplates((current) => current.map((template) => template.id === editing.id ? {
        ...template,
        name: values.name,
        description: values.description || '',
        nodes,
        updatedAt: '2026-07-29',
      } : template));
      Message.success('模板已更新；正式接入后，调整模板将作废使用旧流程的进行中审批');
    } else {
      const nextNumber = Math.max(0, ...templates.map((template) => Number(template.id.replace(/\D/g, '')) || 0)) + 1;
      setTemplates((current) => [...current, {
        key: `template-${Date.now()}`,
        id: `T${String(nextNumber).padStart(3, '0')}`,
        name: values.name,
        description: values.description || '',
        nodes,
        enabled: true,
        updatedAt: '2026-07-29',
      }]);
      Message.success('审批模板已创建');
    }
    setVisible(false);
  };

  const deleteTemplate = (template: WorkflowTemplateDefinition) => {
    if (usageCount[template.id] > 0) {
      Message.warning('模板已被业务审批使用，请先解除业务绑定');
      return;
    }
    setTemplates((current) => current.filter((item) => item.id !== template.id));
    Message.success('模板已删除');
  };

  const toggleTemplate = (template: WorkflowTemplateDefinition, enabled: boolean) => {
    if (!enabled && usageCount[template.id] > 0) {
      Message.warning('模板正在被业务审批使用，不能停用');
      return;
    }
    setTemplates((current) => current.map((item) => item.id === template.id ? { ...item, enabled } : item));
  };

  const updateNode = (id: string, field: 'name' | 'strategy', value: string) => {
    setNodes((current) => current.map((node) => node.id === id ? { ...node, [field]: value } : node));
  };

  const columns = [
    {
      title: '模板名称',
      render: (_: unknown, template: WorkflowTemplateDefinition) => (
        <Space direction="vertical" size={2}>
          <Text bold>{template.name}</Text>
          <Text type="secondary">{template.id} · {template.description || '暂无说明'}</Text>
        </Space>
      ),
    },
    {
      title: '审批流程',
      width: 420,
      render: (_: unknown, template: WorkflowTemplateDefinition) => <FlowPreview nodes={template.nodes} />,
    },
    {
      title: '业务使用',
      width: 100,
      render: (_: unknown, template: WorkflowTemplateDefinition) => `${usageCount[template.id] || 0} 个`,
    },
    {
      title: '状态',
      width: 90,
      render: (_: unknown, template: WorkflowTemplateDefinition) => (
        <Switch size="small" checked={template.enabled} onChange={(value) => toggleTemplate(template, value)} />
      ),
    },
    { title: '最后更新', dataIndex: 'updatedAt', width: 130 },
    {
      title: '操作',
      width: 120,
      render: (_: unknown, template: WorkflowTemplateDefinition) => (
        <Space size={4}>
          <Tooltip content="编辑">
            <Button type="text" size="small" className="hubx-icon-action" aria-label={`编辑${template.name}模板`} icon={<IconEdit />} onClick={() => openEdit(template)} />
          </Tooltip>
          <Tooltip content="复制">
            <Button type="text" size="small" className="hubx-icon-action" aria-label={`复制${template.name}模板`} icon={<IconCopy />} onClick={() => openCopy(template)} />
          </Tooltip>
          <Tooltip content="删除">
            <Popconfirm title="确认删除该模板？" onOk={() => deleteTemplate(template)}>
              <Button type="text" size="small" status="danger" className="hubx-icon-action" aria-label={`删除${template.name}模板`} icon={<IconDelete />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageShell breadcrumbs={isSystemEntry
      ? [{ label: '系统管理', to: '/system/config' }, { label: '系统配置', to: '/system/config' }, { label: '审批模板' }]
      : [{ label: '审批管理', to: '/approvals' }, { label: '审批中心', to: '/approvals' }, { label: '审批模板' }]}
    >
      <PageHeader
        title="审批模板"
        description="模板只定义审批节点和通过策略，具体审批人由业务审批配置决定。"
        actions={<Button type="primary" icon={<IconPlus />} onClick={openCreate}>新建审批模板</Button>}
      />

      <Card bordered={false}>
        <Table rowKey="id" columns={columns} data={templates} pagination={false} scroll={{ x: 960 }} />
      </Card>

      <Modal
        title={editing ? '编辑审批模板' : '新建审批模板'}
        visible={visible}
        onCancel={() => setVisible(false)}
        onOk={saveTemplate}
        okText="保存模板"
        maskClosable={false}
        style={{ width: 720 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="模板名称" field="name" rules={[{ required: true, message: '请输入模板名称' }]}>
            <Input placeholder="如：项目立项审批模板" />
          </Form.Item>
          <Form.Item label="适用说明" field="description">
            <Input.TextArea rows={2} placeholder="说明该模板适用的业务场景" />
          </Form.Item>
        </Form>

        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <Text bold>审批节点</Text>
          <Text type="secondary">节点按从上到下的顺序执行，驳回后直接返回发起人</Text>
        </div>
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          {nodes.map((node, index) => (
            <Card key={node.id} size="small" bodyStyle={{ padding: 12 }}>
              <div className="flex items-center gap-3">
                <Tag color="arcoblue">节点 {index + 1}</Tag>
                <Input
                  value={node.name}
                  onChange={(value) => updateNode(node.id, 'name', value)}
                  placeholder="审批节点名称"
                  style={{ flex: 1 }}
                />
                <Radio.Group value={node.strategy} onChange={(value) => updateNode(node.id, 'strategy', value)}>
                  <Radio value="单人审批">单人</Radio>
                  <Radio value="或签">或签</Radio>
                  <Radio value="会签">会签</Radio>
                </Radio.Group>
                <Button
                  type="text"
                  status="danger"
                  icon={<IconDelete />}
                  disabled={nodes.length === 1}
                  onClick={() => setNodes((current) => current.filter((item) => item.id !== node.id))}
                />
              </div>
            </Card>
          ))}
          <Button
            type="dashed"
            long
            icon={<IconPlus />}
            onClick={() => setNodes((current) => [...current, {
              id: `node-${Date.now()}`,
              name: '',
              strategy: '单人审批',
              rejectPolicy: '驳回至发起人',
            }])}
          >
            添加审批节点
          </Button>
        </Space>
      </Modal>
    </PageShell>
  );
}
