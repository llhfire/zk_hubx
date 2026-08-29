import { useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Message,
  Popconfirm,
  Tag,
  Transfer,
  Tree,
  Checkbox,
  Tooltip,
} from '@arco-design/web-react';
import { IconPlus, IconEdit, IconDelete, IconLock } from '@arco-design/web-react/icon';
import { PageHeader, PageShell, ProcessMetricGrid } from '@/app/components/ui';
import './systemConfigConsistency.css';

const TabPane = Tabs.TabPane;
const FormItem = Form.Item;

// 模拟用户数据
const mockUsers = [
  {
    id: '1',
    username: 'admin',
    name: '管理员',
    phone: '13800138001',
    email: 'admin@company.com',
    roles: ['管理员'],
    status: '启用',
    createTime: '2020-01-01',
  },
  {
    id: '2',
    username: 'zhangsan',
    name: '张三',
    phone: '13800138002',
    email: 'zhangsan@company.com',
    roles: ['销售经理'],
    status: '启用',
    createTime: '2021-03-15',
  },
  {
    id: '3',
    username: 'lisi',
    name: '李四',
    phone: '13800138003',
    email: 'lisi@company.com',
    roles: ['销售人员'],
    status: '启用',
    createTime: '2021-06-20',
  },
  {
    id: '4',
    username: 'wangwu',
    name: '王五',
    phone: '13800138004',
    email: 'wangwu@company.com',
    roles: ['技术人员'],
    status: '禁用',
    createTime: '2022-01-10',
  },
];

// 模拟角色数据
const mockRoles = [
  {
    id: '1',
    name: '管理员',
    code: 'admin',
    description: '系统管理员,拥有所有权限',
    userCount: 1,
    status: '启用',
    createTime: '2020-01-01',
  },
  {
    id: '2',
    name: '销售经理',
    code: 'sales_manager',
    description: '销售部门经理,可管理本部门所有线索和客户',
    userCount: 5,
    status: '启用',
    createTime: '2021-01-01',
  },
  {
    id: '3',
    name: '销售人员',
    code: 'sales',
    description: '销售人员,只能查看和管理自己的线索和客户',
    userCount: 20,
    status: '启用',
    createTime: '2021-01-01',
  },
  {
    id: '4',
    name: '技术人员',
    code: 'tech',
    description: '技术人员,可查看项目信息',
    userCount: 15,
    status: '启用',
    createTime: '2021-01-01',
  },
];

// 模拟权限树数据
const mockPermissionTree = [
  {
    title: '系统管理',
    key: 'system',
    children: [
      { title: '组织架构管理', key: 'system-org' },
      { title: '用户权限管理', key: 'system-permission' },
      {
        title: '本公司主体管理',
        key: 'system-company',
        children: [
          { title: '查看公司主体', key: 'system-company-view' },
          { title: '新建公司主体', key: 'system-company-create' },
          { title: '编辑公司主体', key: 'system-company-edit' },
          { title: '删除公司主体', key: 'system-company-delete' },
          { title: '维护公司资料', key: 'system-company-files' },
        ],
      },
      { title: '数据字典管理', key: 'system-dict' },
      { title: '系统日志管理', key: 'system-log' },
      { title: '系统配置管理', key: 'system-config' },
    ],
  },
  {
    title: '客户管理',
    key: 'customer',
    children: [
      { title: '查看客户', key: 'customer-view' },
      { title: '新建客户', key: 'customer-create' },
      { title: '编辑客户', key: 'customer-edit' },
      { title: '删除客户', key: 'customer-delete' },
      { title: '导出客户', key: 'customer-export' },
    ],
  },
  {
    title: '线索管理',
    key: 'lead',
    children: [
      { title: '公海线索管理', key: 'lead-public' },
      { title: '我的线索', key: 'lead-my' },
      { title: '认领线索', key: 'lead-claim' },
      { title: '新建线索', key: 'lead-create' },
      { title: '编辑线索', key: 'lead-edit' },
      { title: '转让线索', key: 'lead-transfer' },
      { title: '放弃线索', key: 'lead-abandon' },
    ],
  },
  {
    title: '合同管理',
    key: 'contract',
    children: [
      { title: '查看合同', key: 'contract-view' },
      { title: '新建合同', key: 'contract-create' },
      { title: '编辑合同', key: 'contract-edit' },
      { title: '删除合同', key: 'contract-delete' },
    ],
  },
  {
    title: '项目管理',
    key: 'project',
    children: [
      { title: '查看项目', key: 'project-view' },
      { title: '新建项目', key: 'project-create' },
      { title: '编辑项目', key: 'project-edit' },
      { title: '删除项目', key: 'project-delete' },
    ],
  },
  {
    key: 'finance',
    title: '财务管理',
    children: [
      { key: 'finance-salary-view', title: '查看工资表' },
      { key: 'finance-salary-edit', title: '编辑/导入工资和实际工时' },
      { key: 'finance-contract-cost-view', title: '查看合同成本明细' },
      { key: 'finance-contract-cost-detail', title: '查看人员薪资数字' },
    ],
  },
];

export function UserPermission() {
  const [activeTab, setActiveTab] = useState('user');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [userForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [dataScope, setDataScope] = useState('all');

  // 用户表格列配置
  const userColumns = [
    { title: '用户名', dataIndex: 'username' },
    { title: '姓名', dataIndex: 'name' },
    { title: '手机号', dataIndex: 'phone' },
    { title: '邮箱', dataIndex: 'email' },
    {
      title: '角色',
      dataIndex: 'roles',
      render: (roles: string[]) => (
        <Space>
          {roles.map((role, idx) => (
            <Tag key={idx} color="blue">{role}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === '启用' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createTime' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space>
          <Tooltip content="编辑">
            <Button
              key="edit"
              type="text"
              size="small"
              icon={<IconEdit />}
              onClick={() => handleEditUser(record)}
            />
          </Tooltip>
          <Tooltip content="重置密码">
            <Button
              key="reset"
              type="text"
              size="small"
              icon={<IconLock />}
            />
          </Tooltip>
          <Tooltip content="删除">
            <Popconfirm
              key="delete"
              title="确定要删除该用户吗?"
              onOk={() => handleDeleteUser(record.id)}
            >
              <Button type="text" size="small" status="danger" icon={<IconDelete />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 角色表格列配置
  const roleColumns = [
    { title: '角色名称', dataIndex: 'name' },
    { title: '角色编码', dataIndex: 'code' },
    { title: '描述', dataIndex: 'description' },
    { title: '用户数', dataIndex: 'userCount', render: (count: number) => `${count}人` },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === '启用' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createTime' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space>
          <Button
            key="permission"
            type="text"
            size="small"
            onClick={() => handleEditRolePermission(record)}
          >
            权限配置
          </Button>
          <Button
            key="edit"
            type="text"
            size="small"
            icon={<IconEdit />}
            onClick={() => handleEditRole(record)}
          >
            编辑
          </Button>
          <Popconfirm
            key="delete"
            title="确定要删除该角色吗?"
            onOk={() => handleDeleteRole(record.id)}
          >
            <Button type="text" size="small" status="danger" icon={<IconDelete />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleAddUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    setUserModalVisible(true);
  };

  const handleEditUser = (record: any) => {
    setEditingUser(record);
    userForm.setFieldsValue(record);
    setUserModalVisible(true);
  };

  const handleDeleteUser = (id: string) => {
    Message.success('删除成功');
  };

  const handleUserSubmit = () => {
    userForm.validate().then(() => {
      Message.success(editingUser ? '编辑成功' : '新建成功');
      setUserModalVisible(false);
    });
  };

  const handleAddRole = () => {
    setEditingRole(null);
    roleForm.resetFields();
    setRoleModalVisible(true);
  };

  const handleEditRole = (record: any) => {
    setEditingRole(record);
    roleForm.setFieldsValue(record);
    setRoleModalVisible(true);
  };

  const handleEditRolePermission = (record: any) => {
    setEditingRole(record);
    setSelectedPermissions(['system-org', 'customer-view', 'lead-public']);
    setDataScope('all');
    setPermissionModalVisible(true);
  };

  const handleDeleteRole = (id: string) => {
    Message.success('删除成功');
  };

  const handleRoleSubmit = () => {
    roleForm.validate().then(() => {
      Message.success(editingRole ? '编辑成功' : '新建成功');
      setRoleModalVisible(false);
    });
  };

  const handlePermissionSubmit = () => {
    Message.success('权限配置成功');
    setPermissionModalVisible(false);
  };

  return (
    <PageShell
      className="system-config-page"
      breadcrumbs={[{ label: '系统管理' }, { label: '用户权限' }]}
    >
      <PageHeader
        title="用户权限"
        description="维护系统账号、角色、功能权限和数据访问范围。"
        actions={activeTab === 'user' ? (
          <Button type="primary" icon={<IconPlus />} onClick={handleAddUser}>新建用户</Button>
        ) : (
          <Button type="primary" icon={<IconPlus />} onClick={handleAddRole}>新建角色</Button>
        )}
      />

      <ProcessMetricGrid items={[
        { key: 'users', label: '系统用户', value: `${mockUsers.length} 人`, detail: '当前账号目录' },
        { key: 'active', label: '启用账号', value: `${mockUsers.filter(item => item.status === '启用').length} 人`, detail: '允许登录', tone: 'success' },
        { key: 'roles', label: '角色数量', value: `${mockRoles.length} 个`, detail: '权限组合' },
        { key: 'disabled', label: '禁用账号', value: `${mockUsers.filter(item => item.status === '禁用').length} 人`, detail: '需要定期复核', tone: mockUsers.some(item => item.status === '禁用') ? 'warning' : 'neutral' },
      ]} />

      <Card bordered={false} title="账号与角色" className="system-config-card">
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="user" title="用户管理">
            <div className="system-config-result-summary">共 {mockUsers.length} 个账号</div>
            <Table
              columns={userColumns}
              data={mockUsers}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 980 }}
            />
          </TabPane>
          <TabPane key="role" title="角色管理">
            <div className="system-config-result-summary">共 {mockRoles.length} 个角色</div>
            <Table
              columns={roleColumns}
              data={mockRoles}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 900 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 用户编辑弹窗 */}
      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        visible={userModalVisible}
        onOk={handleUserSubmit}
        onCancel={() => setUserModalVisible(false)}
        autoFocus={false}
        focusLock={true}
      >
        <Form form={userForm} layout="vertical">
          <FormItem label="用户名" field="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入用户名" />
          </FormItem>
          <FormItem label="姓名" field="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </FormItem>
          <FormItem label="手机号" field="phone" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input placeholder="请输入手机号" />
          </FormItem>
          <FormItem label="邮箱" field="email">
            <Input placeholder="请输入邮箱" />
          </FormItem>
          <FormItem label="密码" field="password" rules={[{ required: !editingUser, message: '请输入密码' }]}>
            <Input.Password placeholder={editingUser ? '不填写则不修改密码' : '请输入密码'} />
          </FormItem>
          <FormItem label="角色" field="roles" rules={[{ required: true, message: '请选择角色' }]}>
            <Select placeholder="请选择角色" mode="multiple">
              {mockRoles.map(role => (
                <Select.Option key={role.id} value={role.name}>{role.name}</Select.Option>
              ))}
            </Select>
          </FormItem>
          <FormItem label="状态" field="status" initialValue="启用">
            <Select placeholder="请选择状态">
              <Select.Option value="启用">启用</Select.Option>
              <Select.Option value="禁用">禁用</Select.Option>
            </Select>
          </FormItem>
        </Form>
      </Modal>

      {/* 角色编辑弹窗 */}
      <Modal
        title={editingRole ? '编辑角色' : '新建角色'}
        visible={roleModalVisible}
        onOk={handleRoleSubmit}
        onCancel={() => setRoleModalVisible(false)}
        autoFocus={false}
        focusLock={true}
      >
        <Form form={roleForm} layout="vertical">
          <FormItem label="角色名称" field="name" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="请输入角色名称" />
          </FormItem>
          <FormItem label="角色编码" field="code" rules={[{ required: true, message: '请输入角色编码' }]}>
            <Input placeholder="请输入角色编码,如:sales_manager" />
          </FormItem>
          <FormItem label="描述" field="description">
            <Input.TextArea placeholder="请输入角色描述" rows={3} />
          </FormItem>
          <FormItem label="状态" field="status" initialValue="启用">
            <Select placeholder="请选择状态">
              <Select.Option value="启用">启用</Select.Option>
              <Select.Option value="禁用">禁用</Select.Option>
            </Select>
          </FormItem>
        </Form>
      </Modal>

      {/* 权限配置弹窗 */}
      <Modal
        title={`权限配置 - ${editingRole?.name || ''}`}
        visible={permissionModalVisible}
        onOk={handlePermissionSubmit}
        onCancel={() => setPermissionModalVisible(false)}
        autoFocus={false}
        focusLock={true}
        style={{ width: 600 }}
      >
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>功能权限</div>
            <Tree
              checkable
              checkedKeys={selectedPermissions}
              onCheck={(keys) => setSelectedPermissions(keys as string[])}
              treeData={mockPermissionTree}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>数据权限</div>
            <Select
              value={dataScope}
              onChange={setDataScope}
              style={{ width: '100%' }}
            >
              <Select.Option value="all">全部数据</Select.Option>
              <Select.Option value="department">本部门数据</Select.Option>
              <Select.Option value="self">仅本人数据</Select.Option>
            </Select>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
