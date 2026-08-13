import { useState, useMemo } from 'react';
import {
  Card,
  Grid,
  Statistic,
  Table,
  Button,
  Space,
  Tag,
  Tabs,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  TextArea,
  Typography,
  Rate,
  Avatar,
  Descriptions,
  Divider,
  Progress,
  Popconfirm,
} from '@arco-design/web-react';
import {
  IconUser,
  IconFile,
  IconPlus,
  IconEdit,
  IconDelete,
  IconStar,
  IconCalendar,
  IconExperiment,
  IconCheckCircle,
} from '@arco-design/web-react/icon';

const Row = Grid.Row;
const Col = Grid.Col;
const TabPane = Tabs.TabPane;
const Title = Typography.Title;
const FormItem = Form.Item;
const SelectOption = Select.Option;

// ---------- 类型 ----------

type SupplierType = 'company' | 'individual';
type PaymentStatus = 'paid' | 'partial' | 'unpaid';

interface Supplier {
  id: string;
  name: string;
  type: SupplierType;
  contactPerson: string;
  phone: string;
  email: string;
  skills: string[];
  rating: number;          // 1-5
  totalContracts: number;
  totalAmount: number;
  notes?: string;
}

interface Subcontract {
  id: string;
  supplierName: string;
  projectName: string;
  contractNo: string;
  signDate: string;
  amount: number;
  status: 'active' | 'completed' | 'terminated';
  description: string;
}

interface SupplierPayment {
  id: string;
  supplierName: string;
  projectName: string;
  contractNo: string;
  period: number;
  amount: number;
  status: PaymentStatus;
  dueDate: string;
  paidDate?: string;
}

// ---------- 模拟数据 ----------

const mockSuppliers: Supplier[] = [
  { id: 'sup-1', name: '蓝鸟科技有限公司', type: 'company', contactPerson: '王经理', phone: '13800138011', email: 'wang@bluebird.com', skills: ['UI设计', '前端开发', '切图'], rating: 4.5, totalContracts: 3, totalAmount: 156000, notes: '核心设计合作伙伴' },
  { id: 'sup-2', name: '星辰软件工作室',   type: 'company', contactPerson: '李工',   phone: '13800138012', email: 'li@starsoft.com',   skills: ['后端开发', 'API开发', '数据库'], rating: 4.0, totalContracts: 2, totalAmount: 98000 },
  { id: 'sup-3', name: '张明',             type: 'individual', contactPerson: '张明', phone: '13800138013', email: 'zhangming@freelancer.com', skills: ['iOS开发', 'Swift', 'Flutter'], rating: 4.8, totalContracts: 1, totalAmount: 45000, notes: '资深iOS独立开发者' },
  { id: 'sup-4', name: '云端智联科技',     type: 'company', contactPerson: '赵总',   phone: '13800138014', email: 'zhao-cloud@cloudlink.com', skills: ['DevOps', '服务器运维', 'CI/CD'], rating: 3.5, totalContracts: 2, totalAmount: 72000 },
  { id: 'sup-5', name: '陈小红',           type: 'individual', contactPerson: '陈小红', phone: '13800138015', email: 'chenxiaohong@design.com', skills: ['UI/UX设计', 'Figma', '原型设计'], rating: 5.0, totalContracts: 4, totalAmount: 120000, notes: '顶级设计师，质量极高' },
];

const mockSubcontracts: Subcontract[] = [
  { id: 'sc-1', supplierName: '蓝鸟科技有限公司', projectName: '企业管理系统开发', contractNo: 'SC-2026-001', signDate: '2026-02-01', amount: 56000, status: 'active',     description: 'UI设计与前端切图' },
  { id: 'sc-2', supplierName: '星辰软件工作室',   projectName: '云服务平台项目',   contractNo: 'SC-2026-002', signDate: '2026-03-15', amount: 48000, status: 'active',     description: '支付模块后端联调' },
  { id: 'sc-3', supplierName: '蓝鸟科技有限公司', projectName: '电商平台小程序',   contractNo: 'SC-2026-003', signDate: '2026-04-01', amount: 50000, status: 'completed',  description: '小程序UI设计' },
  { id: 'sc-4', supplierName: '张明',            projectName: '医疗健康 APP',    contractNo: 'SC-2026-004', signDate: '2026-05-01', amount: 45000, status: 'active',     description: 'iOS端开发' },
  { id: 'sc-5', supplierName: '云端智联科技',     projectName: '智能制造 MES',    contractNo: 'SC-2026-005', signDate: '2026-03-01', amount: 36000, status: 'completed',  description: '测试服务器运维' },
  { id: 'sc-6', supplierName: '陈小红',          projectName: '企业管理系统开发', contractNo: 'SC-2026-006', signDate: '2026-01-15', amount: 40000, status: 'completed',  description: '产品原型设计' },
];

const mockPayments: SupplierPayment[] = [
  { id: 'sp-1', supplierName: '蓝鸟科技有限公司', projectName: '企业管理系统开发', contractNo: 'SC-2026-001', period: 1, amount: 22400, status: 'paid',     dueDate: '2026-03-01', paidDate: '2026-03-03' },
  { id: 'sp-2', supplierName: '蓝鸟科技有限公司', projectName: '企业管理系统开发', contractNo: 'SC-2026-001', period: 2, amount: 16800, status: 'paid',     dueDate: '2026-05-01', paidDate: '2026-05-02' },
  { id: 'sp-3', supplierName: '蓝鸟科技有限公司', projectName: '企业管理系统开发', contractNo: 'SC-2026-001', period: 3, amount: 16800, status: 'unpaid',   dueDate: '2026-07-01' },
  { id: 'sp-4', supplierName: '星辰软件工作室',   projectName: '云服务平台项目',   contractNo: 'SC-2026-002', period: 1, amount: 24000, status: 'paid',     dueDate: '2026-04-15', paidDate: '2026-04-16' },
  { id: 'sp-5', supplierName: '星辰软件工作室',   projectName: '云服务平台项目',   contractNo: 'SC-2026-002', period: 2, amount: 24000, status: 'partial',  dueDate: '2026-06-15', paidDate: '2026-06-20' },
  { id: 'sp-6', supplierName: '张明',            projectName: '医疗健康 APP',    contractNo: 'SC-2026-004', period: 1, amount: 22500, status: 'unpaid',   dueDate: '2026-07-01' },
  { id: 'sp-7', supplierName: '陈小红',          projectName: '企业管理系统开发', contractNo: 'SC-2026-006', period: 1, amount: 20000, status: 'paid',     dueDate: '2026-02-15', paidDate: '2026-02-14' },
  { id: 'sp-8', supplierName: '陈小红',          projectName: '企业管理系统开发', contractNo: 'SC-2026-006', period: 2, amount: 20000, status: 'paid',     dueDate: '2026-04-15', paidDate: '2026-04-15' },
];

// ---------- 主组件 ----------

export function SupplierManagement() {
  const [activeTab, setActiveTab] = useState('suppliers');
  const [suppliers, setSuppliers] = useState(mockSuppliers);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form] = Form.useForm();

  const summary = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const totalContracts = mockSubcontracts.length;
    const totalAmount = mockSubcontracts.reduce((s, c) => s + c.amount, 0);
    const unpaidAmount = mockPayments.filter(p => p.status === 'unpaid').reduce((s, p) => s + p.amount, 0);
    return { totalSuppliers, totalContracts, totalAmount, unpaidAmount, paidAmount: totalAmount - unpaidAmount };
  }, [suppliers]);

  const handleAdd = () => {
    setEditingSupplier(null);
    form.resetFields();
    form.setFieldsValue({ type: 'company', skills: [], rating: 3 });
    setModalVisible(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    form.setFieldsValue(supplier);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  const handleSubmit = () => {
    form.validate().then(values => {
      if (editingSupplier) {
        setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...values } : s));
      } else {
        const newSupplier: Supplier = {
          id: `sup-${Date.now()}`,
          ...values,
          totalContracts: 0,
          totalAmount: 0,
        };
        setSuppliers(prev => [...prev, newSupplier]);
      }
      setModalVisible(false);
    });
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 摘要栏 */}
      <Row gutter={16}>
        <Col span={4}><Card><Statistic title="供应商数" value={summary.totalSuppliers} suffix="家" icon={<IconUser style={{ color: 'var(--primary)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="分包合同" value={summary.totalContracts} suffix="个" icon={<IconFile style={{ color: 'var(--primary)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="合同总额" value={summary.totalAmount} prefix="¥" /></Card></Col>
        <Col span={4}><Card><Statistic title="已付金额" value={summary.paidAmount} prefix="¥" icon={<IconCheckCircle style={{ color: 'var(--success-500)' }} />} /></Card></Col>
        <Col span={4}><Card><Statistic title="未付金额" value={summary.unpaidAmount} prefix="¥" icon={<IconCalendar style={{ color: 'var(--destructive-500)' }} />} valueStyle={{ color: 'var(--destructive-500)' }} /></Card></Col>
        <Col span={4}><Card><Statistic title="合作评级" value={(suppliers.reduce((s, sup) => s + sup.rating, 0) / Math.max(suppliers.length, 1)).toFixed(1)} suffix="★" icon={<IconStar style={{ color: 'var(--warning-300)' }} />} /></Card></Col>
      </Row>

      {/* 主体 Tab */}
      <Card bordered={false}>
        <Tabs activeTab={activeTab} onChange={setActiveTab}>
          <TabPane key="suppliers" title={<span><IconUser /> 供应商档案</span>} />
          <TabPane key="contracts" title={<span><IconFile /> 分包合同</span>} />
          <TabPane key="payments" title={<span><IconCalendar /> 付款记录</span>} />
        </Tabs>

        <div style={{ paddingTop: 16 }}>
          {/* 供应商档案 Tab */}
          {activeTab === 'suppliers' && (
            <div>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" icon={<IconPlus />} onClick={handleAdd}>新增供应商</Button>
              </div>
              <Row gutter={16}>
                {suppliers.map(supplier => (
                  <Col span={8} key={supplier.id} style={{ marginBottom: 16 }}>
                    <Card
                      size="small"
                      style={{ borderRadius: 8 }}
                      extra={
                        <Space>
                          <Button type="text" size="small" icon={<IconEdit />} onClick={() => handleEdit(supplier)} />
                          <Popconfirm title="确定删除?" onOk={() => handleDelete(supplier.id)}>
                            <Button type="text" size="small" status="danger" icon={<IconDelete />} />
                          </Popconfirm>
                        </Space>
                      }
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <Avatar size={40} style={{ background: supplier.type === 'company' ? 'var(--primary)' : 'var(--chart-5)' }}>
                          {supplier.name.slice(0, 1)}
                        </Avatar>
                        <div>
                          <div style={{ fontWeight: 600 }}>{supplier.name}</div>
                          <Tag size="small" color={supplier.type === 'company' ? 'blue' : 'purple'}>
                            {supplier.type === 'company' ? '企业' : '个人'}
                          </Tag>
                        </div>
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        <Rate value={supplier.rating} allowHalf readonly style={{ fontSize: 14 }} />
                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--color-text-3)' }}>{supplier.rating}</span>
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        {supplier.skills.map(skill => (
                          <Tag key={skill} size="small" style={{ margin: '2px 4px 2px 0' }}>{skill}</Tag>
                        ))}
                      </div>

                      <Divider style={{ margin: '8px 0' }} />

                      <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
                        <div>联系人：{supplier.contactPerson}</div>
                        <div>合作 {supplier.totalContracts} 次 · 总额 ¥{supplier.totalAmount.toLocaleString()}</div>
                        {supplier.notes && <div style={{ color: 'var(--color-text-3)', marginTop: 4 }}><IconEdit style={{ marginRight: 4 }} /> {supplier.notes}</div>}
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}

          {/* 分包合同 Tab */}
          {activeTab === 'contracts' && (
            <Table
              columns={[
                { title: '合同编号', dataIndex: 'contractNo', width: 130 },
                { title: '供应商', dataIndex: 'supplierName', width: 140, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                { title: '项目', dataIndex: 'projectName', width: 140 },
                { title: '签订日期', dataIndex: 'signDate', width: 100 },
                { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => `¥${v.toLocaleString()}` },
                {
                  title: '状态', dataIndex: 'status', width: 80,
                  render: (s: string) => {
                    const map: Record<string, { label: string; color: string }> = { active: { label: '执行中', color: 'var(--primary)' }, completed: { label: '已完成', color: 'var(--success-500)' }, terminated: { label: '已终止', color: 'var(--destructive-500)' } };
                    const m = map[s] || map.active;
                    return <Tag color={m.color}>{m.label}</Tag>;
                  },
                },
                { title: '描述', dataIndex: 'description' },
              ] as any}
              data={mockSubcontracts}
              rowKey="id"
              pagination={false}
            />
          )}

          {/* 付款记录 Tab */}
          {activeTab === 'payments' && (
            <Table
              columns={[
                { title: '供应商', dataIndex: 'supplierName', width: 140, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                { title: '项目', dataIndex: 'projectName', width: 140 },
                { title: '合同', dataIndex: 'contractNo', width: 120 },
                { title: '期数', dataIndex: 'period', width: 50, render: (v: number) => `P${v}` },
                { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => `¥${v.toLocaleString()}` },
                {
                  title: '状态', dataIndex: 'status', width: 80,
                  render: (s: string) => {
                    const map: Record<string, { label: string; color: string }> = { paid: { label: '已付', color: 'var(--success-500)' }, partial: { label: '部分', color: 'var(--warning-500)' }, unpaid: { label: '未付', color: 'var(--destructive-500)' } };
                    const m = map[s] || map.unpaid;
                    return <Tag color={m.color}>{m.label}</Tag>;
                  },
                },
                { title: '应付日期', dataIndex: 'dueDate', width: 100 },
                { title: '实付日期', dataIndex: 'paidDate', width: 100, render: (v: string) => v || '—' },
              ] as any}
              data={mockPayments}
              rowKey="id"
              pagination={false}
            />
          )}
        </div>
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingSupplier ? '编辑供应商' : '新增供应商'}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        autoFocus={false}
        focusLock={true}
        style={{ width: 560 }}
      >
        <Form form={form} layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="名称" field="name" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="公司名或姓名" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="类型" field="type" rules={[{ required: true }]}>
                <Select placeholder="选择类型">
                  <SelectOption value="company">企业</SelectOption>
                  <SelectOption value="individual">个人</SelectOption>
                </Select>
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="联系人" field="contactPerson" rules={[{ required: true, message: '请输入联系人' }]}>
                <Input placeholder="联系人姓名" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="电话" field="phone">
                <Input placeholder="联系电话" />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <FormItem label="邮箱" field="email">
                <Input placeholder="邮箱地址" />
              </FormItem>
            </Grid.Col>
            <Grid.Col span={12}>
              <FormItem label="合作评级" field="rating">
                <Rate allowHalf />
              </FormItem>
            </Grid.Col>
          </Grid.Row>
          <FormItem label="技能标签" field="skills">
            <Select mode="tags" placeholder="输入技能标签后回车" />
          </FormItem>
          <FormItem label="备注" field="notes">
            <Input.TextArea placeholder="备注信息" autoSize={{ minRows: 2, maxRows: 4 }} />
          </FormItem>
        </Form>
      </Modal>
    </Space>
  );
}
