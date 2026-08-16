import { useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
} from '@arco-design/web-react';
import { IconSearch, IconRefresh } from '@arco-design/web-react/icon';

const TabPane = Tabs.TabPane;
const FormItem = Form.Item;
const RangePicker = DatePicker.RangePicker;

// 模拟操作日志数据
const mockOperationLogs = [
  {
    id: '1',
    username: 'admin',
    name: '管理员',
    module: '用户管理',
    operation: '新建用户',
    method: 'POST /api/users',
    params: '{"username":"zhangsan","name":"张三"}',
    ip: '192.168.1.100',
    location: '北京市',
    status: '成功',
    errorMsg: '',
    duration: '120ms',
    time: '2026-04-19 10:30:25',
  },
  {
    id: '2',
    username: 'zhangsan',
    name: '张三',
    module: '线索管理',
    operation: '新建线索',
    method: 'POST /api/leads',
    params: '{"name":"某公司APP开发需求"}',
    ip: '192.168.1.101',
    location: '上海市',
    status: '成功',
    errorMsg: '',
    duration: '95ms',
    time: '2026-04-19 10:25:18',
  },
  {
    id: '3',
    username: 'lisi',
    name: '李四',
    module: '客户管理',
    operation: '编辑客户',
    method: 'PUT /api/customers/123',
    params: '{"level":"VIP"}',
    ip: '192.168.1.102',
    location: '广州市',
    status: '成功',
    errorMsg: '',
    duration: '85ms',
    time: '2026-04-19 10:20:32',
  },
  {
    id: '4',
    username: 'wangwu',
    name: '王五',
    module: '系统配置',
    operation: '修改配置',
    method: 'PUT /api/config',
    params: '{"leadRecycleDays":7}',
    ip: '192.168.1.103',
    location: '深圳市',
    status: '失败',
    errorMsg: '权限不足',
    duration: '50ms',
    time: '2026-04-19 10:15:45',
  },
  {
    id: '5',
    username: 'admin',
    name: '管理员',
    module: '角色管理',
    operation: '权限配置',
    method: 'PUT /api/roles/2/permissions',
    params: '{"permissions":["customer-view","lead-my"]}',
    ip: '192.168.1.100',
    location: '北京市',
    status: '成功',
    errorMsg: '',
    duration: '110ms',
    time: '2026-04-19 10:10:20',
  },
];

// 模拟登录日志数据
const mockLoginLogs = [
  {
    id: '1',
    username: 'admin',
    name: '管理员',
    ip: '192.168.1.100',
    location: '北京市',
    browser: 'Chrome 122',
    os: 'Windows 10',
    status: '成功',
    message: '登录成功',
    time: '2026-04-19 09:00:00',
  },
  {
    id: '2',
    username: 'zhangsan',
    name: '张三',
    ip: '192.168.1.101',
    location: '上海市',
    browser: 'Chrome 122',
    os: 'macOS',
    status: '成功',
    message: '登录成功',
    time: '2026-04-19 08:50:15',
  },
  {
    id: '3',
    username: 'lisi',
    name: '李四',
    ip: '192.168.1.102',
    location: '广州市',
    browser: 'Safari 17',
    os: 'iOS',
    status: '成功',
    message: '登录成功',
    time: '2026-04-19 08:45:30',
  },
  {
    id: '4',
    username: 'wangwu',
    name: '王五',
    ip: '192.168.1.103',
    location: '深圳市',
    browser: 'Chrome 122',
    os: 'Android',
    status: '失败',
    message: '密码错误',
    time: '2026-04-19 08:40:20',
  },
  {
    id: '5',
    username: 'wangwu',
    name: '王五',
    ip: '192.168.1.103',
    location: '深圳市',
    browser: 'Chrome 122',
    os: 'Android',
    status: '成功',
    message: '登录成功',
    time: '2026-04-19 08:41:05',
  },
];

export function SystemLog() {
  const [activeTab, setActiveTab] = useState('operation');
  const [operationForm] = Form.useForm();
  const [loginForm] = Form.useForm();

  // 操作日志表格列配置
  const operationColumns = [
    { title: '操作人', dataIndex: 'name', width: 100 },
    { title: '所属模块', dataIndex: 'module', width: 120 },
    { title: '操作类型', dataIndex: 'operation', width: 120 },
    { title: '请求方式', dataIndex: 'method', width: 200 },
    { title: 'IP地址', dataIndex: 'ip', width: 120 },
    { title: '操作地点', dataIndex: 'location', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === '成功' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    { title: '耗时', dataIndex: 'duration', width: 80 },
    { title: '操作时间', dataIndex: 'time', width: 160 },
  ];

  // 登录日志表格列配置
  const loginColumns = [
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: 'IP地址', dataIndex: 'ip', width: 120 },
    { title: '登录地点', dataIndex: 'location', width: 100 },
    { title: '浏览器', dataIndex: 'browser', width: 120 },
    { title: '操作系统', dataIndex: 'os', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === '成功' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    { title: '提示消息', dataIndex: 'message', width: 120 },
    { title: '登录时间', dataIndex: 'time', width: 160 },
  ];

  const handleOperationSearch = () => {
    console.log('搜索操作日志', operationForm.getFieldsValue());
  };

  const handleOperationReset = () => {
    operationForm.resetFields();
  };

  const handleLoginSearch = () => {
    console.log('搜索登录日志', loginForm.getFieldsValue());
  };

  const handleLoginReset = () => {
    loginForm.resetFields();
  };

  return (
    <div>
      <Card bordered={false}>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="operation" title="操作日志">
            <Form form={operationForm} layout="inline" style={{ marginBottom: 16 }}>
              <FormItem field="username">
                <Input placeholder="操作人" style={{ width: 150 }} />
              </FormItem>
              <FormItem field="module">
                <Select placeholder="所属模块" style={{ width: 150 }} allowClear>
                  <Select.Option value="user">用户管理</Select.Option>
                  <Select.Option value="customer">客户管理</Select.Option>
                  <Select.Option value="lead">线索管理</Select.Option>
                  <Select.Option value="contract">合同管理</Select.Option>
                  <Select.Option value="project">项目管理</Select.Option>
                </Select>
              </FormItem>
              <FormItem field="status">
                <Select placeholder="状态" style={{ width: 120 }} allowClear>
                  <Select.Option value="success">成功</Select.Option>
                  <Select.Option value="fail">失败</Select.Option>
                </Select>
              </FormItem>
              <FormItem field="timeRange">
                <RangePicker style={{ width: 280 }} />
              </FormItem>
              <FormItem>
                <Space>
                  <Button key="search" type="primary" icon={<IconSearch />} onClick={handleOperationSearch}>
                    搜索
                  </Button>
                  <Button key="reset" icon={<IconRefresh />} onClick={handleOperationReset}>
                    重置
                  </Button>
                </Space>
              </FormItem>
            </Form>
            <Table
              columns={operationColumns}
              data={mockOperationLogs}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1400 }}
            />
          </TabPane>
          <TabPane key="login" title="登录日志">
            <Form form={loginForm} layout="inline" style={{ marginBottom: 16 }}>
              <FormItem field="username">
                <Input placeholder="用户名" style={{ width: 150 }} />
              </FormItem>
              <FormItem field="ip">
                <Input placeholder="IP地址" style={{ width: 150 }} />
              </FormItem>
              <FormItem field="status">
                <Select placeholder="状态" style={{ width: 120 }} allowClear>
                  <Select.Option value="success">成功</Select.Option>
                  <Select.Option value="fail">失败</Select.Option>
                </Select>
              </FormItem>
              <FormItem field="timeRange">
                <RangePicker style={{ width: 280 }} />
              </FormItem>
              <FormItem>
                <Space>
                  <Button key="search" type="primary" icon={<IconSearch />} onClick={handleLoginSearch}>
                    搜索
                  </Button>
                  <Button key="reset" icon={<IconRefresh />} onClick={handleLoginReset}>
                    重置
                  </Button>
                </Space>
              </FormItem>
            </Form>
            <Table
              columns={loginColumns}
              data={mockLoginLogs}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1200 }}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
