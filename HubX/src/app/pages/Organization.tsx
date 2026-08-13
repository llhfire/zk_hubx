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
  TreeSelect,
  Message,
  Popconfirm,
  Tag,
  Tooltip,
} from '@arco-design/web-react';
import { IconPlus, IconEdit, IconDelete } from '@arco-design/web-react/icon';

const TabPane = Tabs.TabPane;
const FormItem = Form.Item;

// 模拟部门树形数据
const departmentTree = [
  {
    key: '1',
    title: '总公司',
    value: '1',
    children: [
      {
        key: '1-1',
        title: '技术部',
        value: '1-1',
        children: [
          { key: '1-1-1', title: '前端组', value: '1-1-1' },
          { key: '1-1-2', title: '后端组', value: '1-1-2' },
        ],
      },
      {
        key: '1-2',
        title: '销售部',
        value: '1-2',
        children: [
          { key: '1-2-1', title: '华东区', value: '1-2-1' },
          { key: '1-2-2', title: '华北区', value: '1-2-2' },
        ],
      },
      { key: '1-3', title: '行政部', value: '1-3' },
    ],
  },
];

// 模拟部门数据
const mockDepartments = [
  { id: '1', name: '总公司', parentName: '-', level: 1, memberCount: 120, leader: '张三', status: '启用' },
  { id: '1-1', name: '技术部', parentName: '总公司', level: 2, memberCount: 50, leader: '李四', status: '启用' },
  { id: '1-1-1', name: '前端组', parentName: '技术部', level: 3, memberCount: 20, leader: '王五', status: '启用' },
  { id: '1-1-2', name: '后端组', parentName: '技术部', level: 3, memberCount: 30, leader: '赵六', status: '启用' },
  { id: '1-2', name: '销售部', parentName: '总公司', level: 2, memberCount: 40, leader: '钱七', status: '启用' },
  { id: '1-2-1', name: '华东区', parentName: '销售部', level: 3, memberCount: 20, leader: '孙八', status: '启用' },
  { id: '1-2-2', name: '华北区', parentName: '销售部', level: 3, memberCount: 20, leader: '周九', status: '启用' },
  { id: '1-3', name: '行政部', parentName: '总公司', level: 2, memberCount: 30, leader: '吴十', status: '启用' },
];

// 模拟员工数据
const mockEmployees = [
  {
    id: '1',
    name: '张三',
    jobNumber: 'EMP001',
    department: '总公司',
    position: '总经理',
    phone: '13800138001',
    email: 'zhangsan@company.com',
    status: '在职',
    hireDate: '2020-01-01',
    leaveDate: '',
  },
  {
    id: '2',
    name: '李四',
    jobNumber: 'EMP002',
    department: '技术部',
    position: '技术总监',
    phone: '13800138002',
    email: 'lisi@company.com',
    status: '在职',
    hireDate: '2020-03-15',
    leaveDate: '',
  },
  {
    id: '3',
    name: '王五',
    jobNumber: 'EMP003',
    department: '前端组',
    position: '前端主管',
    phone: '13800138003',
    email: 'wangwu@company.com',
    status: '在职',
    hireDate: '2020-06-01',
    leaveDate: '',
  },
  {
    id: '4',
    name: '赵六',
    jobNumber: 'EMP004',
    department: '后端组',
    position: '后端主管',
    phone: '13800138004',
    email: 'zhaoliu@company.com',
    status: '在职',
    hireDate: '2020-08-20',
    leaveDate: '',
  },
  {
    id: '5',
    name: '钱七',
    jobNumber: 'EMP005',
    department: '销售部',
    position: '销售总监',
    phone: '13800138005',
    email: 'qianqi@company.com',
    status: '在职',
    hireDate: '2021-01-10',
    leaveDate: '',
  },
];

export function Organization() {
  const [activeTab, setActiveTab] = useState('department');
  const [departmentModalVisible, setDepartmentModalVisible] = useState(false);
  const [employeeModalVisible, setEmployeeModalVisible] = useState(false);
  const [departmentForm] = Form.useForm();
  const [employeeForm] = Form.useForm();
  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);

  // 部门表格列配置
  const departmentColumns = [
    { title: '部门名称', dataIndex: 'name' },
    { title: '上级部门', dataIndex: 'parentName' },
    { title: '层级', dataIndex: 'level', render: (level: number) => `第${level}级` },
    { title: '人员数量', dataIndex: 'memberCount', render: (count: number) => `${count}人` },
    { title: '负责人', dataIndex: 'leader' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === '启用' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
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
              onClick={() => handleEditDepartment(record)}
            />
          </Tooltip>
          <Tooltip content="删除">
            <Popconfirm
              key="delete"
              title="确定要删除该部门吗?"
              onOk={() => handleDeleteDepartment(record.id)}
            >
              <Button type="text" size="small" status="danger" icon={<IconDelete />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 员工表格列配置
  const employeeColumns = [
    { title: '工号', dataIndex: 'jobNumber' },
    { title: '姓名', dataIndex: 'name' },
    { title: '部门', dataIndex: 'department' },
    { title: '职位', dataIndex: 'position' },
    { title: '手机号', dataIndex: 'phone' },
    { title: '邮箱', dataIndex: 'email' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === '在职' ? 'green' : 'gray'}>{status}</Tag>
      ),
    },
    { title: '入职日期', dataIndex: 'hireDate' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space>
          <Button
            key="edit"
            type="text"
            size="small"
            icon={<IconEdit />}
            onClick={() => handleEditEmployee(record)}
          >
            编辑
          </Button>
          <Popconfirm
            key="delete"
            title="确定要删除该员工吗?"
            onOk={() => handleDeleteEmployee(record.id)}
          >
            <Button type="text" size="small" status="danger" icon={<IconDelete />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleAddDepartment = () => {
    setEditingDepartment(null);
    departmentForm.resetFields();
    setDepartmentModalVisible(true);
  };

  const handleEditDepartment = (record: any) => {
    setEditingDepartment(record);
    departmentForm.setFieldsValue(record);
    setDepartmentModalVisible(true);
  };

  const handleDeleteDepartment = (id: string) => {
    Message.success('删除成功');
  };

  const handleDepartmentSubmit = () => {
    departmentForm.validate().then(() => {
      Message.success(editingDepartment ? '编辑成功' : '新建成功');
      setDepartmentModalVisible(false);
    });
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    employeeForm.resetFields();
    setEmployeeModalVisible(true);
  };

  const handleEditEmployee = (record: any) => {
    setEditingEmployee(record);
    employeeForm.setFieldsValue(record);
    setEmployeeModalVisible(true);
  };

  const handleDeleteEmployee = (id: string) => {
    Message.success('删除成功');
  };

  const handleEmployeeSubmit = () => {
    employeeForm.validate().then(() => {
      Message.success(editingEmployee ? '编辑成功' : '新建成功');
      setEmployeeModalVisible(false);
    });
  };

  return (
    <div>
      <Card bordered={false}>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="department" title="部门管理">
            <div style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<IconPlus />} onClick={handleAddDepartment}>
                新建部门
              </Button>
            </div>
            <Table
              columns={departmentColumns}
              data={mockDepartments}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
          <TabPane key="employee" title="人员管理">
            <div style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<IconPlus />} onClick={handleAddEmployee}>
                新增员工
              </Button>
            </div>
            <Table
              columns={employeeColumns}
              data={mockEmployees}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 部门编辑弹窗 */}
      <Modal
        title={editingDepartment ? '编辑部门' : '新建部门'}
        visible={departmentModalVisible}
        onOk={handleDepartmentSubmit}
        onCancel={() => setDepartmentModalVisible(false)}
        autoFocus={false}
        focusLock={true}
      >
        <Form form={departmentForm} layout="vertical">
          <FormItem label="部门名称" field="name" rules={[{ required: true, message: '请输入部门名称' }]}>
            <Input placeholder="请输入部门名称" />
          </FormItem>
          <FormItem label="上级部门" field="parentId">
            <TreeSelect
              placeholder="请选择上级部门"
              treeData={departmentTree}
              allowClear
            />
          </FormItem>
          <FormItem label="部门负责人" field="leader">
            <Input placeholder="请输入负责人姓名" />
          </FormItem>
          <FormItem label="状态" field="status" initialValue="启用">
            <Select placeholder="请选择状态">
              <Select.Option value="启用">启用</Select.Option>
              <Select.Option value="禁用">禁用</Select.Option>
            </Select>
          </FormItem>
        </Form>
      </Modal>

      {/* 员工编辑弹窗 */}
      <Modal
        title={editingEmployee ? '编辑员工' : '新增员工'}
        visible={employeeModalVisible}
        onOk={handleEmployeeSubmit}
        onCancel={() => setEmployeeModalVisible(false)}
        autoFocus={false}
        focusLock={true}
      >
        <Form form={employeeForm} layout="vertical">
          <FormItem label="工号" field="jobNumber" rules={[{ required: true, message: '请输入工号' }]}>
            <Input placeholder="请输入工号" />
          </FormItem>
          <FormItem label="姓名" field="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </FormItem>
          <FormItem label="所属部门" field="department" rules={[{ required: true, message: '请选择部门' }]}>
            <TreeSelect
              placeholder="请选择部门"
              treeData={departmentTree}
            />
          </FormItem>
          <FormItem label="职位" field="position">
            <Input placeholder="请输入职位" />
          </FormItem>
          <FormItem label="手机号" field="phone" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input placeholder="请输入手机号" />
          </FormItem>
          <FormItem label="邮箱" field="email">
            <Input placeholder="请输入邮箱" />
          </FormItem>
          <FormItem label="状态" field="status" initialValue="在职">
            <Select placeholder="请选择状态">
              <Select.Option value="在职">在职</Select.Option>
              <Select.Option value="离职">离职</Select.Option>
            </Select>
          </FormItem>
          <FormItem label="入职日期" field="hireDate">
            <Input placeholder="请选择入职日期" type="date" />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}
