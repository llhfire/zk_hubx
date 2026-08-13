import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Card,
  Descriptions,
  Badge,
  Button,
  Typography,
  Space,
  Table,
  Tabs,
  Modal,
  Form,
  Input,
  Message,
} from '@arco-design/web-react';
import { IconLeft, IconEdit, IconPlus } from '@arco-design/web-react/icon';

const Title = Typography.Title;
const TabPane = Tabs.TabPane;

export function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [form] = Form.useForm();

  const customerInfo = {
    name: '北京科技有限公司',
    type: '企业',
    industry: '互联网',
    scale: '100-500人',
    registeredCapital: '1000万',
    creditCode: '91110000XXXXXXXXXX',
    address: '北京市朝阳区XX路XX号',
    level: 'A级',
    status: '合作中',
    source: '百度推广',
    createTime: '2025-06-15',
    owner: '张三',
  };

  const contacts = [
    {
      key: '1',
      name: '张经理',
      position: '技术总监',
      phone: '13800138000',
      wechat: 'zhang_manager',
      email: 'zhang@example.com',
      isDefault: true,
    },
    {
      key: '2',
      name: '李助理',
      position: '项目助理',
      phone: '13900139000',
      wechat: 'li_assistant',
      email: 'li@example.com',
      isDefault: false,
    },
  ];

  const leads = [
    {
      key: '1',
      name: 'APP开发需求',
      status: '已签单',
      createTime: '2025-06-20',
      signTime: '2025-07-15',
      amount: '80万',
    },
    {
      key: '2',
      name: '管理系统升级',
      status: '已签单',
      createTime: '2025-09-10',
      signTime: '2025-10-05',
      amount: '50万',
    },
    {
      key: '3',
      name: '小程序开发',
      status: '已签单',
      createTime: '2026-01-20',
      signTime: '2026-02-10',
      amount: '35万',
    },
    {
      key: '4',
      name: '数据分析平台',
      status: '跟进中',
      createTime: '2026-03-15',
      signTime: '-',
      amount: '-',
    },
  ];

  const contracts = [
    {
      key: '1',
      contractNo: 'HT202507001',
      name: 'APP开发项目合同',
      amount: '80万',
      signDate: '2025-07-15',
      status: '履行中',
      received: '60万',
      receivable: '20万',
    },
    {
      key: '2',
      contractNo: 'HT202510001',
      name: '管理系统升级合同',
      amount: '50万',
      signDate: '2025-10-05',
      status: '履行中',
      received: '40万',
      receivable: '10万',
    },
    {
      key: '3',
      contractNo: 'HT202602001',
      name: '小程序开发合同',
      amount: '35万',
      signDate: '2026-02-10',
      status: '履行中',
      received: '35万',
      receivable: '0',
    },
  ];

  const contactColumns = [
    { title: '姓名', dataIndex: 'name' },
    { title: '职位', dataIndex: 'position' },
    { title: '手机号', dataIndex: 'phone' },
    { title: '微信', dataIndex: 'wechat' },
    { title: '邮箱', dataIndex: 'email' },
    {
      title: '默认联系人',
      dataIndex: 'isDefault',
      render: (isDefault: boolean) =>
        isDefault ? <Badge status="success" text="是" /> : <span>否</span>,
    },
    {
      title: '操作',
      render: () => (
        <Space>
          <Button type="text" size="small">
            编辑
          </Button>
          <Button type="text" size="small" status="danger">
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const leadColumns = [
    {
      title: '线索名称',
      dataIndex: 'name',
      render: (name: string, record: any) => (
        <a style={{ color: 'rgb(var(--primary-6))' }}>{name}</a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => (
        <Badge
          status={status === '已签单' ? 'success' : 'processing'}
          text={status}
        />
      ),
    },
    { title: '创建时间', dataIndex: 'createTime' },
    { title: '签约时间', dataIndex: 'signTime' },
    { title: '签约金额', dataIndex: 'amount' },
  ];

  const contractColumns = [
    { title: '合同编号', dataIndex: 'contractNo' },
    {
      title: '合同名称',
      dataIndex: 'name',
      render: (name: string) => <a style={{ color: 'rgb(var(--primary-6))' }}>{name}</a>,
    },
    { title: '合同金额', dataIndex: 'amount' },
    { title: '签订日期', dataIndex: 'signDate' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => <Badge status="processing" text={status} />,
    },
    { title: '已收款', dataIndex: 'received' },
    { title: '待收款', dataIndex: 'receivable' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-3">
          <Button type="text" icon={<IconLeft />} onClick={() => navigate('/customers')}>
            返回
          </Button>
          <Title heading={4} style={{ margin: 0 }}>
            {customerInfo.name}
          </Title>
          <Badge
            status={customerInfo.level === 'A级' ? 'warning' : 'success'}
            text={customerInfo.level}
          />
        </div>
        <Space>
          <Button icon={<IconEdit />}>编辑客户</Button>
          <Button type="primary" icon={<IconPlus />}>
            新建线索
          </Button>
        </Space>
      </div>

      <Tabs defaultActiveTab="info">
        <TabPane key="info" title="客户信息">
          <Card title="基础信息" style={{ marginBottom: 16 }}>
            <Descriptions
              column={3}
              data={[
                { label: '客户名称', value: customerInfo.name },
                { label: '客户类型', value: customerInfo.type },
                { label: '所属行业', value: customerInfo.industry },
                { label: '企业规模', value: customerInfo.scale },
                { label: '注册资本', value: customerInfo.registeredCapital },
                { label: '统一社会信用代码', value: customerInfo.creditCode },
                { label: '客户地址', value: customerInfo.address, span: 3 },
                {
                  label: '客户等级',
                  value: (
                    <Badge
                      status={customerInfo.level === 'A级' ? 'warning' : 'success'}
                      text={customerInfo.level}
                    />
                  ),
                },
                {
                  label: '客户状态',
                  value: <Badge status="success" text={customerInfo.status} />,
                },
                { label: '创建时间', value: customerInfo.createTime },
                { label: '负责人', value: customerInfo.owner },
              ]}
            />
          </Card>

          <Card
            title="联系人信息"
            extra={
              <Button type="text" icon={<IconPlus />} size="small">
                添加联系人
              </Button>
            }
          >
            <Table columns={contactColumns} data={contacts} pagination={false} />
          </Card>
        </TabPane>

        <TabPane key="leads" title={`线索记录 (${leads.length})`}>
          <Card>
            <Table columns={leadColumns} data={leads} pagination={false} />
          </Card>
        </TabPane>

        <TabPane key="contracts" title={`合同记录 (${contracts.length})`}>
          <Card>
            <Table columns={contractColumns} data={contracts} pagination={false} />
          </Card>
        </TabPane>

        <TabPane key="finance" title="财务信息">
          <Card
            title="开票信息"
            style={{ marginBottom: 16 }}
            extra={
              <Button
                type="text"
                size="small"
                icon={<IconEdit />}
                onClick={() => setInvoiceVisible(true)}
              >
                编辑
              </Button>
            }
          >
            <Descriptions
              column={2}
              data={[
                { label: '开票抬头', value: customerInfo.name },
                { label: '纳税人识别号', value: customerInfo.creditCode },
                { label: '开户银行', value: '中国工商银行XX支行' },
                { label: '银行账号', value: '6222 **** **** 1234' },
                { label: '开票地址', value: customerInfo.address },
                { label: '开票电话', value: '010-12345678' },
              ]}
            />
          </Card>

          <Card title="收款信息">
            <div style={{ lineHeight: 2 }}>
              <div>累计合同金额：165万</div>
              <div>已收款金额：135万</div>
              <div>待收款金额：30万</div>
              <div>回款率：81.8%</div>
            </div>
          </Card>
        </TabPane>
      </Tabs>

      <Modal
        title="编辑开票信息"
        visible={invoiceVisible}
        onOk={() => {
          form.validate().then(() => {
            Message.success('开票信息更新成功');
            setInvoiceVisible(false);
            form.resetFields();
          });
        }}
        onCancel={() => {
          setInvoiceVisible(false);
          form.resetFields();
        }}
        style={{ width: 600 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="开票抬头"
            field="invoiceTitle"
            rules={[{ required: true, message: '请输入开票抬头' }]}
            initialValue={customerInfo.name}
          >
            <Input placeholder="请输入开票抬头" />
          </Form.Item>
          <Form.Item
            label="纳税人识别号"
            field="taxNumber"
            rules={[{ required: true, message: '请输入纳税人识别号' }]}
            initialValue={customerInfo.creditCode}
          >
            <Input placeholder="请输入纳税人识别号" />
          </Form.Item>
          <Form.Item
            label="开户银行"
            field="bank"
            rules={[{ required: true, message: '请输入开户银行' }]}
            initialValue="中国工商银行XX支行"
          >
            <Input placeholder="请输入开户银行" />
          </Form.Item>
          <Form.Item
            label="银行账号"
            field="bankAccount"
            rules={[{ required: true, message: '请输入银行账号' }]}
            initialValue="6222 **** **** 1234"
          >
            <Input placeholder="请输入银行账号" />
          </Form.Item>
          <Form.Item
            label="开票地址"
            field="invoiceAddress"
            rules={[{ required: true, message: '请输入开票地址' }]}
            initialValue={customerInfo.address}
          >
            <Input placeholder="请输入开票地址" />
          </Form.Item>
          <Form.Item
            label="开票电话"
            field="invoicePhone"
            rules={[{ required: true, message: '请输入开票电话' }]}
            initialValue="010-12345678"
          >
            <Input placeholder="请输入开票电话" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
