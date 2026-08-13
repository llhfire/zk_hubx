import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { IconDelete, IconEdit, IconPlus } from '@arco-design/web-react/icon';
import { useApprovals } from '@/app/approvals/ApprovalContext';
import type { ApprovalTypeDefinition } from '@/app/approvals/types';

const Text = Typography.Text;

export function ApprovalTypeRegistry() {
  const { types, saveType, deleteType, toggleType } = useApprovals();
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<ApprovalTypeDefinition | null>(null);
  const [form] = Form.useForm();

  const openEditor = (record?: ApprovalTypeDefinition) => {
    setEditing(record ?? null);
    form.setFieldsValue(record ?? {
      name: '',
      code: '',
      businessModule: '',
      description: '',
      templateName: '',
      enabled: true,
    });
    setVisible(true);
  };

  const handleSave = async () => {
    const values = await form.validate();
    const now = new Date().toLocaleString('zh-CN', { hour12: false });
    saveType({
      id: editing?.id ?? `type-${Date.now()}`,
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      businessModule: values.businessModule,
      description: values.description ?? '',
      templateName: values.templateName ?? '',
      enabled: values.enabled,
      connected: editing?.connected ?? false,
      usedCount: editing?.usedCount ?? 0,
      updatedAt: now,
    });
    setVisible(false);
    Message.success(editing ? '审批类型已更新' : '审批类型已注册');
  };

  const columns = [
    { title: '类型编码', dataIndex: 'code', width: 150 },
    { title: '类型名称', dataIndex: 'name', width: 150, render: (value: string) => <Text bold>{value}</Text> },
    { title: '关联业务', dataIndex: 'businessModule', width: 140 },
    { title: '审批模板', dataIndex: 'templateName', width: 200, render: (value: string) => value ? <Tag color="arcoblue">{value}</Tag> : <Text type="secondary">未绑定</Text> },
    {
      title: '接入状态',
      dataIndex: 'connected',
      width: 110,
      render: (value: boolean) => <Tag color={value ? 'green' : 'orange'}>{value ? '已接入' : '待接入'}</Tag>,
    },
    { title: '已使用', dataIndex: 'usedCount', width: 90, render: (value: number) => `${value} 次` },
    { title: '说明', dataIndex: 'description' },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (value: boolean, record: ApprovalTypeDefinition) => <Switch size="small" checked={value} onChange={(checked) => toggleType(record.id, checked)} />,
    },
    {
      title: '操作',
      width: 130,
      fixed: 'right' as const,
      render: (_: unknown, record: ApprovalTypeDefinition) => (
        <Space>
          <Button type="text" size="small" icon={<IconEdit />} onClick={() => openEditor(record)}>编辑</Button>
          <Popconfirm
            title={record.usedCount > 0 ? '该类型已有审批记录，只能停用，不能删除。' : '确认删除该审批类型？'}
            onOk={() => {
              if (!deleteType(record.id)) Message.warning('已使用的审批类型只能停用');
              else Message.success('审批类型已删除');
            }}
          >
            <Button type="text" size="small" status="danger" icon={<IconDelete />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Typography.Title heading={5} style={{ margin: 0 }}>审批类型管理</Typography.Title>
          <Text type="secondary">注册可接入 HubX 的业务审批类型，申请表单仍由对应业务模块提供。</Text>
        </div>
        <Button type="primary" icon={<IconPlus />} onClick={() => openEditor()}>注册审批类型</Button>
      </div>
      <Card bordered={false}>
        <Table rowKey="id" columns={columns} data={types} pagination={false} scroll={{ x: 1200 }} />
      </Card>
      <Modal
        title={editing ? '编辑审批类型' : '注册审批类型'}
        visible={visible}
        onCancel={() => setVisible(false)}
        onOk={handleSave}
        okText="保存"
        style={{ width: 640 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="类型名称" field="name" rules={[{ required: true }]}><Input placeholder="例如：项目立项审批" /></Form.Item>
          <Form.Item label="类型编码" field="code" rules={[{ required: true, match: /^[A-Za-z][A-Za-z0-9_]*$/, message: '请输入字母开头的唯一编码' }]}><Input disabled={Boolean(editing?.usedCount)} placeholder="例如：PROJECT_INITIATION" /></Form.Item>
          <Form.Item label="关联业务模块" field="businessModule" rules={[{ required: true }]}>
            <Select allowCreate placeholder="选择或输入业务模块" options={['报价管理', '合同管理', '项目管理', '线索管理'].map((value) => ({ label: value, value }))} />
          </Form.Item>
          <Form.Item label="审批模板" field="templateName">
            <Select allowClear placeholder="待业务接入后可绑定" options={['报价默认审批流程', '合同默认审批流程', '通用单节点审批'].map((value) => ({ label: value, value }))} />
          </Form.Item>
          <Form.Item label="类型说明" field="description"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label="启用状态" field="enabled" triggerPropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

