import { useMemo, useState } from 'react';
import { Badge, Button, Card, Form, Grid, Input, Message, Modal, Popconfirm, Select, Space, Switch, Table, Tooltip } from '@arco-design/web-react';
import { IconEdit, IconEye, IconPlus, IconSearch, IconSwap } from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router';
import { FilterBar, PageHeader, PageShell } from '@/app/components/ui';
import { useContracts } from './contracts/ContractsContext';
import { useProjects } from './project-management/ProjectContext';
import { useCustomers } from './customers/CustomerContext';
import { deriveCustomerStatus, findCustomerDuplicate } from './customers/customerModel';
import type { Customer, CustomerCreateInput } from './customers/types';

const Row = Grid.Row;
const Col = Grid.Col;

function money(value: number) {
  return value ? `¥${value.toLocaleString('zh-CN')}` : '—';
}

export function Customers() {
  const navigate = useNavigate();
  const { customers, createCustomer, updateCustomer, setCustomerActive, mergeCustomer } = useCustomers();
  const { contracts } = useContracts();
  const { projects } = useProjects();
  const [form] = Form.useForm();
  const [mergeForm] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [mergeVisible, setMergeVisible] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [filters, setFilters] = useState({ keyword: '', kind: '', level: '', status: '', includeDisabled: false });

  const rows = useMemo(() => customers.map((customer) => {
    const customerContracts = contracts.filter((contract) => contract.customerId === customer.id || contract.current.customerName === customer.name);
    const projectIds = new Set(customerContracts.map((contract) => contract.projectId).filter(Boolean));
    const hasActiveProject = projects.some((project) => projectIds.has(project.id) && !['completed', 'cancelled', '已完成', '已取消'].includes(String(project.status)));
    const outstanding = customerContracts.reduce((sum, contract) => sum + Math.max(0, contract.current.totalAmount - (contract.receivedAmount ?? 0)), 0);
    const contractAmount = customerContracts.filter((item) => item.status !== 'voided').reduce((sum, item) => sum + item.current.totalAmount, 0);
    const status = deriveCustomerStatus({
      activeMainContractCount: customerContracts.filter((item) => item.kind !== 'supplement' && item.status !== 'draft' && item.status !== 'voided').length,
      hasActiveProject,
      hasOutstandingCollection: outstanding > 0,
      hasActiveMaintenance: false,
      hasHistoricCooperation: customerContracts.some((item) => item.status === 'archived'),
    });
    const primary = customer.contacts.find((item) => item.isPrimary && item.active);
    return { ...customer, primary, status, contractCount: customerContracts.length, contractAmount, outstanding };
  }), [contracts, customers, projects]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const keyword = filters.keyword.trim().toLowerCase();
    return (filters.includeDisabled || row.active)
      && (!keyword || [row.name, row.creditCode, row.primary?.name, row.primary?.phone].some((value) => value?.toLowerCase().includes(keyword)))
      && (!filters.kind || row.kind === filters.kind)
      && (!filters.level || row.level === filters.level)
      && (!filters.status || row.status === filters.status);
  }), [filters, rows]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ kind: 'enterprise', level: 'B', ownerName: '张三' });
    setVisible(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    form.setFieldsValue(customer);
    setVisible(true);
  };

  const save = async () => {
    const values = await form.validate();
    if (editing) {
      updateCustomer(editing.id, values);
      Message.success('客户资料已更新；历史业务快照保持不变');
      setVisible(false);
      return;
    }
    const input: CustomerCreateInput = {
      ...values,
      contact: values.contactName || values.contactPhone ? { name: values.contactName ?? values.name, phone: values.contactPhone ?? '' } : undefined,
    };
    const duplicate = findCustomerDuplicate(customers, input);
    if (duplicate?.strong) {
      Message.warning(`命中已有客户“${duplicate.customer.name}”，请绑定或恢复该档案`);
      setVisible(false);
      navigate(`/customers/${duplicate.customer.id}`);
      return;
    }
    const result = createCustomer(input);
    if (result.id) {
      Message.success(duplicate ? `客户已创建；名称与“${duplicate.customer.name}”相似，请后续核验` : '客户已创建');
      setVisible(false);
      navigate(`/customers/${result.id}`);
    }
  };

  const columns = [
    {
      title: '客户', dataIndex: 'name', width: 250,
      render: (_: string, record: typeof rows[number]) => (
        <div>
          <a className="table-primary-link" onClick={() => navigate(`/customers/${record.id}`)}>{record.name}</a>
          <div className="table-secondary-text">{record.kind === 'enterprise' ? record.creditCode || '未维护统一社会信用代码' : '个人客户'}{!record.active ? ' · 已停用' : ''}</div>
        </div>
      ),
    },
    { title: '负责人', dataIndex: 'ownerName', width: 100 },
    { title: '主联系人', width: 150, render: (_: unknown, record: typeof rows[number]) => <div>{record.primary?.name ?? '—'}<div className="table-secondary-text">{record.primary?.phone ?? '未维护电话'}</div></div> },
    { title: '行业 / 规模', width: 170, render: (_: unknown, record: typeof rows[number]) => <div>{record.industry ?? '—'}<div className="table-secondary-text">{record.scale ?? '未维护规模'}</div></div> },
    { title: '等级', dataIndex: 'level', width: 88, render: (value: string) => <Badge status={value === 'S' ? 'success' : value === 'A' ? 'processing' : 'default'} text={`${value}级`} /> },
    { title: '合作状态', dataIndex: 'status', width: 110, render: (value: string) => <Badge status={value === '合作中' ? 'success' : value === '已合作' ? 'processing' : 'default'} text={value} /> },
    { title: '合同概况', width: 160, render: (_: unknown, record: typeof rows[number]) => <div>{record.contractCount} 份 · {money(record.contractAmount)}<div className="table-secondary-text">待收 {money(record.outstanding)}</div></div> },
    { title: '建档时间', width: 112, render: (_: unknown, record: typeof rows[number]) => record.createdAt.slice(0, 10) },
    {
      title: '操作', width: 132, fixed: 'right' as const,
      render: (_: unknown, record: typeof rows[number]) => <Space size={2}>
        <Tooltip content="查看客户"><Button type="text" size="small" icon={<IconEye />} onClick={() => navigate(`/customers/${record.id}`)} /></Tooltip>
        <Tooltip content="编辑资料"><Button type="text" size="small" icon={<IconEdit />} onClick={() => openEdit(record)} /></Tooltip>
        <Popconfirm title={record.active ? '停用后不再用于新业务，确认停用？' : '确认恢复该客户档案？'} onOk={() => { setCustomerActive(record.id, !record.active); Message.success(record.active ? '客户已停用' : '客户已恢复'); }}>
          <Button type="text" size="small" status={record.active ? 'warning' : 'success'}>{record.active ? '停用' : '恢复'}</Button>
        </Popconfirm>
      </Space>,
    },
  ];

  return (
    <PageShell>
      <PageHeader title="客户管理" description="统一维护签约对象、联系人、开票资料和完整业务链。" actions={<Space><Button icon={<IconSwap />} onClick={() => setMergeVisible(true)}>重复客户治理</Button><Button type="primary" icon={<IconPlus />} onClick={openCreate}>新建客户</Button></Space>} />
      <Card>
        <FilterBar>
          <Input style={{ width: 260 }} placeholder="客户名称、代码、联系人或电话" prefix={<IconSearch />} value={filters.keyword} onChange={(keyword) => setFilters((current) => ({ ...current, keyword }))} allowClear />
          <Select placeholder="客户类型" style={{ width: 130 }} value={filters.kind || undefined} onChange={(kind) => setFilters((current) => ({ ...current, kind: kind ?? '' }))} allowClear><Select.Option value="enterprise">企业</Select.Option><Select.Option value="individual">个人</Select.Option></Select>
          <Select placeholder="客户等级" style={{ width: 130 }} value={filters.level || undefined} onChange={(level) => setFilters((current) => ({ ...current, level: level ?? '' }))} allowClear>{['S', 'A', 'B', 'C'].map((level) => <Select.Option key={level} value={level}>{level}级</Select.Option>)}</Select>
          <Select placeholder="合作状态" style={{ width: 140 }} value={filters.status || undefined} onChange={(status) => setFilters((current) => ({ ...current, status: status ?? '' }))} allowClear>{['待合作', '合作中', '已合作'].map((status) => <Select.Option key={status} value={status}>{status}</Select.Option>)}</Select>
          <Space><Switch size="small" checked={filters.includeDisabled} onChange={(includeDisabled) => setFilters((current) => ({ ...current, includeDisabled }))} />显示停用档案</Space>
        </FilterBar>
        <Table rowKey="id" columns={columns} data={filteredRows} pagination={{ pageSize: 10 }} scroll={{ x: 1240 }} noDataElement="没有符合条件的客户" />
      </Card>

      <Modal title={editing ? '编辑客户资料' : '新建客户'} visible={visible} onCancel={() => setVisible(false)} onOk={save} okText={editing ? '保存资料' : '创建客户'} style={{ width: 720 }}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}><Form.Item label="客户类型" field="kind" required><Select disabled={Boolean(editing)}><Select.Option value="enterprise">企业</Select.Option><Select.Option value="individual">个人</Select.Option></Select></Form.Item></Col>
            <Col span={16}><Form.Item label="客户名称" field="name" required rules={[{ required: true, message: '请输入签约对象名称' }]}><Input placeholder="企业全称或个人姓名" /></Form.Item></Col>
            <Form.Item shouldUpdate noStyle>{(values) => values.kind === 'enterprise' ? <Col span={24}><Form.Item label="统一社会信用代码" field="creditCode" required={!editing} rules={!editing ? [{ required: true, message: '企业客户必须填写统一社会信用代码' }] : []}><Input placeholder="用于强判重，建档后请谨慎修改" /></Form.Item></Col> : null}</Form.Item>
            <Col span={8}><Form.Item label="客户等级" field="level"><Select>{['S', 'A', 'B', 'C'].map((level) => <Select.Option key={level} value={level}>{level}级</Select.Option>)}</Select></Form.Item></Col>
            <Col span={8}><Form.Item label="负责人" field="ownerName"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item label="来源" field="source"><Input placeholder="如：小红书" /></Form.Item></Col>
            <Col span={12}><Form.Item label="所属行业" field="industry"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item label="企业规模" field="scale"><Input /></Form.Item></Col>
            <Col span={24}><Form.Item label="联系地址" field="address"><Input /></Form.Item></Col>
            {!editing && <><Col span={12}><Form.Item label="首位主联系人" field="contactName"><Input /></Form.Item></Col><Col span={12}><Form.Item label="联系电话" field="contactPhone"><Input /></Form.Item></Col></>}
          </Row>
        </Form>
      </Modal>

      <Modal title="重复客户治理" visible={mergeVisible} onCancel={() => setMergeVisible(false)} onOk={async () => {
        const values = await mergeForm.validate();
        mergeCustomer(values.targetId, values.sourceId);
        Message.success('客户已合并；来源档案和历史引用已保留');
        setMergeVisible(false);
        mergeForm.resetFields();
      }} okText="确认合并">
        <p className="form-help-text">选择保留的主客户和需要并入的重复档案。该动作不会物理删除来源档案。</p>
        <Form form={mergeForm} layout="vertical">
          <Form.Item label="保留为主客户" field="targetId" rules={[{ required: true }]}><Select showSearch>{customers.filter((item) => item.active).map((item) => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}</Select></Form.Item>
          <Form.Item label="并入的重复档案" field="sourceId" rules={[{ required: true }]}><Select showSearch>{customers.filter((item) => item.active).map((item) => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}</Select></Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}
