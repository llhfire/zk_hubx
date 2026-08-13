import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  Table,
  Button,
  Select,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Tabs,
  Grid,
  Divider,
  Message,
  Popconfirm,
} from '@arco-design/web-react';
import { contractCostPermissions } from './contract-cost/contractCostData';
import {
  PieChart, Pie, Cell, Tooltip as RechartTooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { IconPlus, IconEdit, IconDelete, IconExport } from '@arco-design/web-react/icon';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Row, Col } = Grid;

// ─── Mock data ───────────────────────────────────────────────────────────────

const contractData = [
  { key: '1', name: '企业管理系统开发合同', customer: '阿里巴巴（中国）有限公司', start: '2026-03-20', end: '2026-09-30', total: 500000, received: 200000, costRD: 80000, costBiz: 30000, costOutsource: 120000, costOther: 20000 },
  { key: '2', name: '云服务平台建设合同', customer: '腾讯科技（深圳）有限公司', start: '2026-03-15', end: '2026-08-20', total: 800000, received: 800000, costRD: 200000, costBiz: 60000, costOutsource: 180000, costOther: 40000 },
  { key: '3', name: '协作工具定制开发合同', customer: '北京字节跳动科技有限公司', start: '2026-03-10', end: '2026-07-15', total: 350000, received: 105000, costRD: 90000, costBiz: 20000, costOutsource: 100000, costOther: 10000 },
  { key: '4', name: 'A公司CRM系统开发', customer: 'A科技公司', start: '2026-03-20', end: '2026-06-20', total: 1200000, received: 800000, costRD: 300000, costBiz: 80000, costOutsource: 250000, costOther: 60000 },
];

const opExpenses = [
  { key: '1', date: '2026-05-01', type: '房租物业', amount: 38000, period: '2026-05', allocation: '公司级', approvalNo: 'AP2026050001', status: '已支付', enteredBy: '张三' },
  { key: '2', date: '2026-05-03', type: '水电网络', amount: 4200, period: '2026-05', allocation: '公司级', approvalNo: 'AP2026050002', status: '已支付', enteredBy: '张三' },
  { key: '3', date: '2026-05-05', type: '行政杂费', amount: 1800, period: '2026-05', allocation: '行政部', approvalNo: 'AP2026050003', status: '已支付', enteredBy: '李四' },
  { key: '4', date: '2026-04-01', type: '房租物业', amount: 38000, period: '2026-04', allocation: '公司级', approvalNo: 'AP2026040001', status: '已支付', enteredBy: '张三' },
  { key: '5', date: '2026-04-03', type: '水电网络', amount: 3900, period: '2026-04', allocation: '公司级', approvalNo: 'AP2026040002', status: '已支付', enteredBy: '张三' },
  { key: '6', date: '2026-04-10', type: '设备维护', amount: 6500, period: '2026-04', allocation: '技术部', approvalNo: 'AP2026040003', status: '未支付', enteredBy: '王五' },
];

const trendData = [
  { month: '2025-11', 房租物业: 38000, 水电网络: 3600, 行政杂费: 2100, 设备维护: 0 },
  { month: '2025-12', 房租物业: 38000, 水电网络: 4100, 行政杂费: 3200, 设备维护: 8000 },
  { month: '2026-01', 房租物业: 38000, 水电网络: 3800, 行政杂费: 1900, 设备维护: 0 },
  { month: '2026-02', 房租物业: 38000, 水电网络: 3500, 行政杂费: 1600, 设备维护: 0 },
  { month: '2026-03', 房租物业: 38000, 水电网络: 4000, 行政杂费: 2400, 设备维护: 5000 },
  { month: '2026-04', 房租物业: 38000, 水电网络: 3900, 行政杂费: 1800, 设备维护: 6500 },
  { month: '2026-05', 房租物业: 38000, 水电网络: 4200, 行政杂费: 1800, 设备维护: 0 },
];

const PIE_COLORS = ['#165dff', '#0fc6c2', '#ff7d00', '#7816ff'];

const EXPENSE_TYPES = ['房租物业', '水电网络', '行政杂费', '设备维护', '其他'];
const ALLOCATION_OPTIONS = ['公司级', '销售部', '技术部', '行政部', '财务部'];
const STATUS_OPTIONS = ['已支付', '未支付', '分期'];

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      padding: '16px 20px',
      border: '1px solid var(--color-border-2)',
      borderRadius: 8,
      background: '#fff',
      borderTop: `3px solid ${color || '#165dff'}`,
    }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-1)' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FinancialDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'month' | 'year' | 'all'>('all');
  const [opList, setOpList] = useState(opExpenses);
  const [entryVisible, setEntryVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [periodFilter, setPeriodFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [form] = Form.useForm();

  // Derived contract stats
  const totalContract = contractData.reduce((s, r) => s + r.total, 0);
  const totalReceived = contractData.reduce((s, r) => s + r.received, 0);
  const totalPending = totalContract - totalReceived;
  const totalCost = contractData.reduce((s, r) => s + r.costRD + r.costBiz + r.costOutsource + r.costOther, 0);

  // Pie chart data for latest month op expenses
  const pieData = [
    { name: '房租物业', value: opList.filter((e) => e.type === '房租物业').reduce((s, e) => s + e.amount, 0) },
    { name: '水电网络', value: opList.filter((e) => e.type === '水电网络').reduce((s, e) => s + e.amount, 0) },
    { name: '行政杂费', value: opList.filter((e) => e.type === '行政杂费').reduce((s, e) => s + e.amount, 0) },
    { name: '设备维护', value: opList.filter((e) => e.type === '设备维护').reduce((s, e) => s + e.amount, 0) },
  ].filter((d) => d.value > 0);

  const filteredOp = opList.filter((e) => {
    if (periodFilter && e.period !== periodFilter) return false;
    if (typeFilter && e.type !== typeFilter) return false;
    return true;
  });

  const filteredTotal = filteredOp.reduce((s, e) => s + e.amount, 0);

  const openCreate = () => {
    setEditingEntry(null);
    form.resetFields();
    form.setFieldsValue({ enteredBy: '张三', date: new Date() });
    setEntryVisible(true);
  };

  const openEdit = (record: any) => {
    setEditingEntry(record);
    form.setFieldsValue(record);
    setEntryVisible(true);
  };

  const handleSave = () => {
    form.validate().then((values) => {
      if (editingEntry) {
        setOpList((prev) => prev.map((e) => e.key === editingEntry.key ? { ...e, ...values } : e));
        Message.success('已更新');
      } else {
        setOpList((prev) => [...prev, { ...values, key: String(Date.now()) }]);
        Message.success('录入成功');
      }
      setEntryVisible(false);
    });
  };

  const handleDelete = (key: string) => {
    setOpList((prev) => prev.filter((e) => e.key !== key));
    Message.success('已删除');
  };

  // Contract table columns
  const contractColumns = [
    { title: '合同名称', dataIndex: 'name', width: 220, render: (v: string, record: any) => contractCostPermissions.contractCostView
      ? <a style={{ color: 'var(--primary)', cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = 'var(--color-fill-1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => navigate(`/finance/contract-cost/${record.key}`)}>{v}</a>
      : <span>{v}</span> },
    { title: '客户', dataIndex: 'customer', width: 200 },
    { title: '合同总额', dataIndex: 'total', width: 110, render: (v: number) => `¥${(v / 10000).toFixed(0)}万` },
    { title: '回款金额', dataIndex: 'received', width: 110, render: (v: number) => `¥${(v / 10000).toFixed(0)}万` },
    {
      title: '成本总额',
      width: 110,
      render: (_: any, r: any) => {
        const cost = r.costRD + r.costBiz + r.costOutsource + r.costOther;
        return `¥${(cost / 10000).toFixed(0)}万`;
      },
    },
    {
      title: '利润',
      width: 120,
      render: (_: any, r: any) => {
        const cost = r.costRD + r.costBiz + r.costOutsource + r.costOther;
        const profit = r.total - cost;
        const ratio = cost / r.total;
        const isWarning = ratio >= 0.8;
        return (
          <span style={{ color: isWarning ? '#ff7d00' : '#00b42a', fontWeight: 600 }}>
            ¥{(profit / 10000).toFixed(0)}万
            {isWarning && <span style={{ fontSize: 11, marginLeft: 4 }}>⚠</span>}
          </span>
        );
      },
    },
    { title: '科研成本', dataIndex: 'costRD', width: 100, render: (v: number) => `¥${(v / 10000).toFixed(0)}万` },
    { title: '商务成本', dataIndex: 'costBiz', width: 100, render: (v: number) => `¥${(v / 10000).toFixed(0)}万` },
    { title: '外包成本', dataIndex: 'costOutsource', width: 100, render: (v: number) => `¥${(v / 10000).toFixed(0)}万` },
    { title: '其他成本', dataIndex: 'costOther', width: 100, render: (v: number) => `¥${(v / 10000).toFixed(0)}万` },
    { title: '合同起始', dataIndex: 'start', width: 110 },
    { title: '合同截止', dataIndex: 'end', width: 110 },
  ];

  // Op expense columns
  const opColumns = [
    { title: '发生日期', dataIndex: 'date', width: 110 },
    { title: '成本类型', dataIndex: 'type', width: 110, render: (v: string) => <Tag color="cyan">{v}</Tag> },
    { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => `¥${v.toLocaleString()}` },
    { title: '归属周期', dataIndex: 'period', width: 100 },
    { title: '分摊对象', dataIndex: 'allocation', width: 100 },
    { title: '关联审批单号', dataIndex: 'approvalNo', width: 140 },
    {
      title: '付款状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => (
        <Tag color={v === '已支付' ? 'green' : v === '未支付' ? 'orange' : 'purple'}>{v}</Tag>
      ),
    },
    { title: '录入人', dataIndex: 'enteredBy', width: 80 },
    {
      title: '操作',
      width: 110,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          <Button type="text" size="small" icon={<IconEdit />} onClick={() => openEdit(record)} />
          <Popconfirm title="确认删除？" onOk={() => handleDelete(record.key)}>
            <Button type="text" size="small" icon={<IconDelete />} status="danger" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const periods = [...new Set(opList.map((e) => e.period))].sort().reverse();

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <Title heading={4} style={{ margin: 0 }}>财务统计</Title>
      </div>

      <Tabs defaultActiveTab="contract" type="card-gutter">
        {/* ── 合同统计 ── */}
        <TabPane key="contract" title="合同统计">
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            <SummaryCard label="合同总额" value={`¥${(totalContract / 10000).toFixed(0)}万`} color="#165dff" />
            <SummaryCard label="到账金额" value={`¥${(totalReceived / 10000).toFixed(0)}万`} sub={`回款率 ${(totalReceived / totalContract * 100).toFixed(1)}%`} color="#00b42a" />
            <SummaryCard label="待收款" value={`¥${(totalPending / 10000).toFixed(0)}万`} color="#ff7d00" />
            <SummaryCard label="成本总额" value={`¥${(totalCost / 10000).toFixed(0)}万`} sub={`利润率 ${((totalContract - totalCost) / totalContract * 100).toFixed(1)}%`} color="#7816ff" />
          </div>

          <Card
            title="合同费用明细"
            extra={<Button icon={<IconExport />} size="small">导出报表</Button>}
          >
            <Table
              columns={contractColumns}
              data={contractData}
              pagination={false}
              scroll={{ x: 1600 }}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell style={{ fontWeight: 600 }}>合计</Table.Summary.Cell>
                    <Table.Summary.Cell />
                    <Table.Summary.Cell style={{ fontWeight: 600 }}>
                      ¥{(contractData.reduce((s, r) => s + r.total, 0) / 10000).toFixed(0)}万
                    </Table.Summary.Cell>
                    <Table.Summary.Cell style={{ fontWeight: 600 }}>
                      ¥{(contractData.reduce((s, r) => s + r.received, 0) / 10000).toFixed(0)}万
                    </Table.Summary.Cell>
                    <Table.Summary.Cell style={{ fontWeight: 600 }}>
                      ¥{(contractData.reduce((s, r) => s + r.costRD + r.costBiz + r.costOutsource + r.costOther, 0) / 10000).toFixed(0)}万
                    </Table.Summary.Cell>
                    <Table.Summary.Cell style={{ fontWeight: 600, color: '#00b42a' }}>
                      ¥{((contractData.reduce((s, r) => s + r.total, 0) - contractData.reduce((s, r) => s + r.costRD + r.costBiz + r.costOutsource + r.costOther, 0)) / 10000).toFixed(0)}万
                    </Table.Summary.Cell>
                    <Table.Summary.Cell>
                      ¥{(contractData.reduce((s, r) => s + r.costRD, 0) / 10000).toFixed(0)}万
                    </Table.Summary.Cell>
                    <Table.Summary.Cell>
                      ¥{(contractData.reduce((s, r) => s + r.costBiz, 0) / 10000).toFixed(0)}万
                    </Table.Summary.Cell>
                    <Table.Summary.Cell>
                      ¥{(contractData.reduce((s, r) => s + r.costOutsource, 0) / 10000).toFixed(0)}万
                    </Table.Summary.Cell>
                    <Table.Summary.Cell>
                      ¥{(contractData.reduce((s, r) => s + r.costOther, 0) / 10000).toFixed(0)}万
                    </Table.Summary.Cell>
                    <Table.Summary.Cell /><Table.Summary.Cell />
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </TabPane>

        {/* ── 运营成本 ── */}
        <TabPane key="operation" title="运营成本">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
            {/* Pie chart */}
            <Card title="支出分布">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <RechartTooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Line chart */}
            <Card title="月度支出趋势">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-2)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <RechartTooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
                  <Legend />
                  {['房租物业', '水电网络', '行政杂费', '设备维护'].map((key, i) => (
                    <Line key={key} type="monotone" dataKey={key} stroke={PIE_COLORS[i]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Op expense list */}
          <Card
            title="运营费用明细"
            extra={
              <Space>
                <Select
                  placeholder="筛选周期"
                  style={{ width: 120 }}
                  value={periodFilter || undefined}
                  onChange={setPeriodFilter}
                  allowClear
                >
                  {periods.map((p) => <Select.Option key={p} value={p}>{p}</Select.Option>)}
                </Select>
                <Select
                  placeholder="费用类型"
                  style={{ width: 120 }}
                  value={typeFilter || undefined}
                  onChange={setTypeFilter}
                  allowClear
                >
                  {EXPENSE_TYPES.map((t) => <Select.Option key={t} value={t}>{t}</Select.Option>)}
                </Select>
                <Button type="primary" icon={<IconPlus />} size="small" onClick={openCreate}>
                  录入费用
                </Button>
              </Space>
            }
          >
            <Table
              columns={opColumns}
              data={filteredOp}
              pagination={false}
              scroll={{ x: 1200 }}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={2} style={{ textAlign: 'right', fontWeight: 600 }}>
                      合计
                    </Table.Summary.Cell>
                    <Table.Summary.Cell style={{ fontWeight: 600, color: 'rgb(var(--primary-6))' }}>
                      ¥{filteredTotal.toLocaleString()}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell colSpan={6} />
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Entry Modal */}
      <Modal
        title={editingEntry ? '编辑费用记录' : '录入运营费用'}
        visible={entryVisible}
        maskClosable={false}
        style={{ width: 600 }}
        onCancel={() => setEntryVisible(false)}
        onOk={handleSave}
        okText="保存"
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item label="成本类型" field="type" rules={[{ required: true, message: '请选择成本类型' }]}>
              <Select placeholder="请选择">
                {EXPENSE_TYPES.map((t) => <Select.Option key={t} value={t}>{t}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item label="归属周期" field="period" rules={[{ required: true, message: '请输入归属周期' }]}>
              <Input placeholder="如：2026-05" />
            </Form.Item>
            <Form.Item label="发生日期" field="date" rules={[{ required: true, message: '请选择发生日期' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="金额（元）" field="amount" rules={[{ required: true, message: '请输入金额' }]}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入金额" />
            </Form.Item>
            <Form.Item label="付款状态" field="status" rules={[{ required: true, message: '请选择状态' }]}>
              <Select placeholder="请选择">
                {STATUS_OPTIONS.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item label="分摊对象" field="allocation">
              <Select placeholder="请选择" allowClear>
                {ALLOCATION_OPTIONS.map((a) => <Select.Option key={a} value={a}>{a}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item label="关联审批单号" field="approvalNo">
              <Input placeholder="如：AP2026050001" />
            </Form.Item>
            <Form.Item label="录入人" field="enteredBy">
              <Input disabled />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
