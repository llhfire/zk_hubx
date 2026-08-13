import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  Form,
  Message,
  Space,
  Typography,
  Grid,
} from '@arco-design/web-react';
import { IconSearch, IconPlus, IconEye, IconEdit } from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router';

const Title = Typography.Title;
const Row = Grid.Row;
const Col = Grid.Col;

export function Customers() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();

  const customers = [
    {
      key: '1',
      name: '北京科技有限公司',
      type: '企业',
      industry: '互联网',
      scale: '100-500人',
      contact: '张经理',
      phone: '138****1111',
      level: 'A级',
      status: '合作中',
      contractCount: 3,
      contractAmount: '180万',
      receivable: '30万',
      createTime: '2025-06-15',
    },
    {
      key: '2',
      name: '上海商贸公司',
      type: '企业',
      industry: '零售',
      scale: '50-100人',
      contact: '李总',
      phone: '139****2222',
      level: 'B级',
      status: '跟进中',
      contractCount: 1,
      contractAmount: '45万',
      receivable: '15万',
      createTime: '2025-08-20',
    },
    {
      key: '3',
      name: '深圳电商公司',
      type: '企业',
      industry: '电商',
      scale: '500-1000人',
      contact: '王总',
      phone: '136****3333',
      level: 'A级',
      status: '合作中',
      contractCount: 5,
      contractAmount: '320万',
      receivable: '80万',
      createTime: '2025-03-10',
    },
    {
      key: '4',
      name: '广州金融公司',
      type: '企业',
      industry: '金融',
      scale: '1000人以上',
      contact: '赵经理',
      phone: '137****4444',
      level: 'S级',
      status: '合作中',
      contractCount: 8,
      contractAmount: '680万',
      receivable: '120万',
      createTime: '2024-11-05',
    },
    {
      key: '5',
      name: '成都教育机构',
      type: '机构',
      industry: '教育',
      scale: '100-500人',
      contact: '周主任',
      phone: '135****5555',
      level: 'B级',
      status: '跟进中',
      contractCount: 0,
      contractAmount: '0',
      receivable: '0',
      createTime: '2026-02-12',
    },
  ];

  const levelMap = {
    'S级': 'error',
    'A级': 'warning',
    'B级': 'success',
    'C级': 'default',
  };

  const statusMap = {
    合作中: 'success',
    跟进中: 'processing',
    已流失: 'default',
  };

  // --- Columns with deliberate hierarchy ---
  const columns = [
    {
      title: '客户名称',
      dataIndex: 'name',
      width: 200,
      render: (name: string, record: any) => (
        <a
          onClick={() => navigate(`/customers/${record.key}`)}
          style={{ fontWeight: 500, color: 'var(--primary)', cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-fill-1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {name}
        </a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (type: string) => <Badge status="default" text={type} />,
    },
    {
      title: '所属行业',
      dataIndex: 'industry',
      width: 120,
      render: (text: string) => (
        <span style={{ color: 'hsl(220 10% 45%)' }}>{text}</span>
      ),
    },
    {
      title: '企业规模',
      dataIndex: 'scale',
      width: 120,
      render: (text: string) => (
        <span style={{ color: 'hsl(220 10% 45%)' }}>{text}</span>
      ),
    },
    {
      title: '主要联系人',
      dataIndex: 'contact',
      width: 120,
      render: (text: string) => (
        <span style={{ color: 'hsl(220 10% 35%)' }}>{text}</span>
      ),
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      width: 120,
      render: (text: string) => (
        <span style={{ color: 'hsl(220 8% 55%)', fontSize: 13 }}>{text}</span>
      ),
    },
    {
      title: '客户等级',
      dataIndex: 'level',
      width: 100,
      render: (level: string) => (
        <Badge status={levelMap[level as keyof typeof levelMap]} text={level} />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => (
        <Badge status={statusMap[status as keyof typeof statusMap]} text={status} />
      ),
    },
    {
      title: '合同数',
      dataIndex: 'contractCount',
      width: 100,
      render: (value: number) => (
        <span style={{ fontWeight: 500, color: 'hsl(220 15% 25%)' }}>{value}</span>
      ),
    },
    {
      title: '合同金额',
      dataIndex: 'contractAmount',
      width: 120,
      render: (text: string) => (
        <span style={{ fontWeight: 500, color: 'hsl(220 15% 25%)' }}>{text}</span>
      ),
    },
    {
      title: '待收款',
      dataIndex: 'receivable',
      width: 100,
      render: (text: string) => (
        <span style={{ color: 'hsl(30 90% 44%)', fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 120,
      render: (text: string) => (
        <span style={{ color: 'hsl(220 8% 55%)', fontSize: 13 }}>{text}</span>
      ),
    },
    {
      title: '操作',
      width: 150,
      fixed: 'right' as const,
      render: (_, record: any) => (
        <Space size={0}>
          <Button
            key={`view-${record.key}`}
            type="text"
            icon={<IconEye />}
            size="small"
            onClick={() => navigate(`/customers/${record.key}`)}
          />
          <Button key={`edit-${record.key}`} type="text" icon={<IconEdit />} size="small" onClick={() => setVisible(true)} />
        </Space>
      ),
    },
  ];

  const handleCreate = () => {
    form.validate().then((values) => {
      console.log(values);
      Message.success('客户创建成功');
      setVisible(false);
      form.resetFields();
    });
  };

  return (
    <div>
      {/* Page label — subtle */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'hsl(220 8% 55%)', letterSpacing: '0.025em', textTransform: 'uppercase' }}>
          客户管理
        </div>
        <Button type="primary" icon={<IconPlus />} onClick={() => setVisible(true)}>
          新建客户
        </Button>
      </div>

      <Card
        style={{
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xs)',
          border: '1px solid hsl(220 12% 88%)',
        }}
      >
        {/* Search & Filter Bar */}
        <div className="flex gap-3" style={{ marginBottom: 16 }}>
          <Input
            style={{ width: 240 }}
            placeholder="搜索客户名称、联系人"
            prefix={<IconSearch />}
          />
          <Select placeholder="客户类型" style={{ width: 160 }} allowClear>
            <Select.Option value="enterprise">企业</Select.Option>
            <Select.Option value="institution">机构</Select.Option>
            <Select.Option value="individual">个人</Select.Option>
          </Select>
          <Select placeholder="客户等级" style={{ width: 160 }} allowClear>
            <Select.Option value="S">S级</Select.Option>
            <Select.Option value="A">A级</Select.Option>
            <Select.Option value="B">B级</Select.Option>
            <Select.Option value="C">C级</Select.Option>
          </Select>
          <Select placeholder="客户状态" style={{ width: 160 }} allowClear>
            <Select.Option value="active">合作中</Select.Option>
            <Select.Option value="following">跟进中</Select.Option>
            <Select.Option value="lost">已流失</Select.Option>
          </Select>
          <Button type="primary">搜索</Button>
        </div>

        <Table
          columns={columns}
          data={customers}
          scroll={{ x: 1800 }}
          pagination={{
            total: 68,
            pageSize: 10,
            showTotal: true,
            showJumper: true,
          }}
        />
      </Card>

      {/* ---- New Customer Modal ---- */}
      <Modal
        title="新建客户"
        visible={visible}
        onOk={handleCreate}
        onCancel={() => {
          setVisible(false);
          form.resetFields();
        }}
        style={{ width: 680 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="客户名称"
            field="name"
            rules={[{ required: true, message: '请输入客户名称' }]}
          >
            <Input placeholder="请输入客户名称" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="客户类型" field="type">
                <Select placeholder="请选择">
                  <Select.Option value="enterprise">企业</Select.Option>
                  <Select.Option value="institution">机构</Select.Option>
                  <Select.Option value="individual">个人</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="所属行业" field="industry">
                <Select placeholder="请选择">
                  <Select.Option value="internet">互联网</Select.Option>
                  <Select.Option value="finance">金融</Select.Option>
                  <Select.Option value="education">教育</Select.Option>
                  <Select.Option value="retail">零售</Select.Option>
                  <Select.Option value="ecommerce">电商</Select.Option>
                  <Select.Option value="manufacturing">制造业</Select.Option>
                  <Select.Option value="other">其他</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="企业规模" field="scale">
                <Select placeholder="请选择">
                  <Select.Option value="1-50">1-50人</Select.Option>
                  <Select.Option value="50-100">50-100人</Select.Option>
                  <Select.Option value="100-500">100-500人</Select.Option>
                  <Select.Option value="500-1000">500-1000人</Select.Option>
                  <Select.Option value="1000+">1000人以上</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="负责人" field="owner">
                <Select placeholder="请选择负责人">
                  <Select.Option value="zhang">张三</Select.Option>
                  <Select.Option value="li">李四</Select.Option>
                  <Select.Option value="wang">王五</Select.Option>
                  <Select.Option value="zhao">赵六</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="注册资本" field="registeredCapital">
                <Input placeholder="请输入注册资本，例如：1000万" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="客户等级" field="level">
                <Select placeholder="请选择" defaultValue="B">
                  <Select.Option value="S">S级（战略客户）</Select.Option>
                  <Select.Option value="A">A级（重要客户）</Select.Option>
                  <Select.Option value="B">B级（普通客户）</Select.Option>
                  <Select.Option value="C">C级（潜在客户）</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="客户地址" field="address">
            <Input placeholder="请输入客户地址" />
          </Form.Item>

          <Form.Item label="备注" field="remark">
            <Input.TextArea placeholder="请输入备注信息" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
