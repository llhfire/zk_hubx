import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Card,
  Descriptions,
  Badge,
  Button,
  Space,
  Table,
  Tabs,
  Timeline,
  Tag,
  Modal,
  Form,
  Input,
  Message,
} from '@arco-design/web-react';
import { NotePencil, Plus } from '@phosphor-icons/react';
import {
  PageShell,
  ProcessMetricGrid,
  ProcessOverview,
  ProcessWorkspace,
  ProcessWorkspaceAside,
  ProcessWorkspaceMain,
} from '../components/ui';

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
    { title: '微信', dataIndex: 'wechat', width: 150, render: (value: string) => <span style={{ whiteSpace: 'nowrap' }}>{value}</span> },
    { title: '邮箱', dataIndex: 'email', width: 190, render: (value: string) => <span style={{ whiteSpace: 'nowrap' }}>{value}</span> },
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
        <a style={{ color: 'rgb(var(--primary-6))', cursor: 'pointer' }} onClick={() => navigate(`/leads/${record.key}`, { state: { from: 'customer', customerId: id } })}>{name}</a>
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
      render: (name: string, record: { key: string }) => <a style={{ color: 'rgb(var(--primary-6))', cursor: 'pointer' }} onClick={() => navigate(`/contracts/${record.key}`, { state: { contractDetailReturn: { pathname: `/customers/${id}`, state: { activeTab: 'contracts' } } } })}>{name}</a>,
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

  const activityRecords = [
    { key: 'a1', date: '2026-03-15 10:20', type: '线索', color: 'arcoblue', content: '创建“数据分析平台”线索，当前处于跟进中。', operator: '张三' },
    { key: 'a2', date: '2026-02-10 16:40', type: '签约', color: 'green', content: '小程序开发项目完成签约，合同金额 35 万。', operator: '张三' },
    { key: 'a3', date: '2025-10-05 14:10', type: '签约', color: 'green', content: '管理系统升级项目完成签约，合同金额 50 万。', operator: '张三' },
    { key: 'a4', date: '2025-06-15 09:30', type: '建档', color: 'gray', content: '客户资料建档，来源为百度推广。', operator: '张三' },
  ];

  return (
    <PageShell
      breadcrumbs={[
        { label: '客户管理', to: '/customers' },
        { label: '客户列表', to: '/customers' },
        { label: customerInfo.name },
      ]}
    >
      <ProcessOverview
        identifier={`KH-${id ?? '001'}`}
        title={customerInfo.name}
        tags={(
          <>
            <Tag color="orange">{customerInfo.level}</Tag>
            <Tag color="green">{customerInfo.status}</Tag>
            <Tag>{customerInfo.industry}</Tag>
          </>
        )}
        actions={(
          <Space wrap>
            <Button size="small" style={{ minWidth: 96, whiteSpace: 'nowrap' }} icon={<NotePencil size={18} weight="regular" />}>编辑客户</Button>
            <Button type="primary" size="small" style={{ minWidth: 96, whiteSpace: 'nowrap' }} icon={<Plus size={18} weight="regular" />}>新建线索</Button>
          </Space>
        )}
        currentStep={2}
        steps={[
          { key: 'profile', title: '客户建档', description: customerInfo.createTime },
          { key: 'follow', title: '需求跟进', description: '4 条线索' },
          { key: 'cooperation', title: '签约合作', description: '3 份合同' },
          { key: 'operation', title: '持续经营', description: '回款率 81.8%' },
        ]}
      />

      <ProcessMetricGrid
        items={[
          { key: 'owner', label: '客户负责人', value: customerInfo.owner },
          { key: 'source', label: '客户来源', value: customerInfo.source },
          { key: 'contacts', label: '联系人', value: `${contacts.length} 人` },
          { key: 'leads', label: '关联线索', value: `${leads.length} 条` },
          { key: 'contract-total', label: '累计合同金额', value: '165 万' },
          { key: 'received', label: '已收款', value: '135 万', tone: 'success' },
          { key: 'receivable', label: '待收款', value: '30 万', tone: 'warning' },
        ]}
      />

      <ProcessWorkspace>
        <ProcessWorkspaceMain>
          <Card>
            <Tabs defaultActiveTab="info">
              <TabPane key="info" title="客户信息">
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Card title="基础信息" size="small">
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
                        { label: '客户等级', value: <Badge status="warning" text={customerInfo.level} /> },
                        { label: '客户状态', value: <Badge status="success" text={customerInfo.status} /> },
                        { label: '创建时间', value: customerInfo.createTime },
                        { label: '负责人', value: customerInfo.owner },
                      ]}
                    />
                  </Card>

                  <Card
                    title="联系人信息"
                    size="small"
                    extra={<Button type="text" icon={<Plus size={18} weight="regular" />} size="small" style={{ minWidth: 104, whiteSpace: 'nowrap' }}>添加联系人</Button>}
                  >
                    <Table columns={contactColumns} data={contacts} pagination={false} scroll={{ x: 920 }} />
                  </Card>
                </Space>
              </TabPane>

              <TabPane key="leads" title={`线索记录 (${leads.length})`}>
                <Table columns={leadColumns} data={leads} pagination={false} scroll={{ x: 720 }} />
              </TabPane>

              <TabPane key="contracts" title={`合同记录 (${contracts.length})`}>
                <Table columns={contractColumns} data={contracts} pagination={false} scroll={{ x: 900 }} />
              </TabPane>

              <TabPane key="finance" title="财务信息">
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Card
                    title="开票信息"
                    size="small"
                    extra={(
                      <Button type="text" size="small" icon={<NotePencil size={18} weight="regular" />} onClick={() => setInvoiceVisible(true)}>
                        编辑
                      </Button>
                    )}
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

                  <Card title="收款信息" size="small">
                    <Descriptions
                      column={2}
                      data={[
                        { label: '累计合同金额', value: '165 万' },
                        { label: '已收款金额', value: '135 万' },
                        { label: '待收款金额', value: '30 万' },
                        { label: '回款率', value: '81.8%' },
                      ]}
                    />
                  </Card>
                </Space>
              </TabPane>
            </Tabs>
          </Card>
        </ProcessWorkspaceMain>

        <ProcessWorkspaceAside>
          <Card title="客户动态" style={{ height: '100%' }}>
            <Tabs defaultActiveTab="activity" size="small">
              <TabPane key="activity" title="业务动态">
                <Timeline style={{ marginTop: 12 }}>
                  {activityRecords.map((record) => (
                    <Timeline.Item key={record.key}>
                      <Space direction="vertical" size={4}>
                        <Space size={6} wrap>
                          <Tag color={record.color} size="small">{record.type}</Tag>
                          <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>{record.date}</span>
                        </Space>
                        <span>{record.content}</span>
                        <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>操作人：{record.operator}</span>
                      </Space>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </TabPane>
              <TabPane key="contacts" title="关键联系人">
                <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 12 }}>
                  {contacts.map((contact) => (
                    <Card key={contact.key} size="small">
                      <Space direction="vertical" size={3}>
                        <Space size={6} wrap>
                          <strong>{contact.name}</strong>
                          {contact.isDefault && <Tag color="green" size="small">默认联系人</Tag>}
                        </Space>
                        <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>{contact.position}</span>
                        <span>{contact.phone}</span>
                        <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>{contact.email}</span>
                      </Space>
                    </Card>
                  ))}
                </Space>
              </TabPane>
            </Tabs>
          </Card>
        </ProcessWorkspaceAside>
      </ProcessWorkspace>

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
    </PageShell>
  );
}
