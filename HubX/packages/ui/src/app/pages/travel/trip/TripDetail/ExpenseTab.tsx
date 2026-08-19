import { useState } from 'react';
import {
  Card,
  Button,
  Tag,
  Modal,
  Input,
  Select,
  Table,
  Space,
  Typography,
  Grid,
  Message,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconEdit,
  IconDelete,
  IconExclamationCircle,
  IconStorage,
  IconScan,
  IconList,
  IconDashboard,
} from '@arco-design/web-react/icon';
import { ExpenseOCR } from '../../components/ExpenseOCR';
import { TimelineView } from './TimelineView';
import type { Trip, Expense, TripExpenseType } from '../../types';

const { Text, Title } = Typography;
const { Row, Col } = Grid;
const { Option } = Select;
const { TextArea } = Input;

interface ExpenseTabProps {
  trip: Trip;
  onUpdate: () => void;
}

const expenseTypeLabels: Record<TripExpenseType, string> = {
  transport: '交通费',
  accommodation: '住宿费',
  meal: '餐饮费',
  communication: '通讯费',
  local_transport: '市内交通',
  entertainment: '招待费',
  office: '办公用品',
  other: '其他',
};

export function ExpenseTab({ trip, onUpdate }: ExpenseTabProps) {
  const [formVisible, setFormVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline');
  const [ocrOpen, setOcrOpen] = useState(false);
  const [form, setForm] = useState({
    itinerarySegmentId: '',
    type: 'meal' as TripExpenseType,
    amount: 0,
    date: '',
    invoiceNo: '',
    remark: '',
    isOverStandard: false,
    overStandardReason: '',
  });

  // 收集所有费用记录
  const allExpenses: (Expense & { segmentDesc: string })[] = [];
  trip.itinerarySegments?.forEach(seg => {
    seg.expenses?.forEach(exp => {
      allExpenses.push({
        ...exp,
        segmentDesc: `${seg.departure}→${seg.destination}`,
      });
    });
  });

  // 费用汇总
  const expenseSummary = allExpenses.reduce((acc, exp) => {
    acc[exp.type] = (acc[exp.type] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalExpense = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // 打开新建表单
  const handleCreate = () => {
    setEditingExpense(null);
    setForm({
      itinerarySegmentId: trip.itinerarySegments?.[0]?.id || '',
      type: 'meal',
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      invoiceNo: '',
      remark: '',
      isOverStandard: false,
      overStandardReason: '',
    });
    setFormVisible(true);
  };

  // 打开编辑表单
  const handleEdit = (expense: Expense & { segmentDesc: string }) => {
    setEditingExpense(expense);
    setForm({
      itinerarySegmentId: expense.itinerarySegmentId,
      type: expense.type,
      amount: expense.amount,
      date: expense.date,
      invoiceNo: expense.invoiceNo || '',
      remark: expense.remark || '',
      isOverStandard: expense.isOverStandard,
      overStandardReason: expense.overStandardReason || '',
    });
    setFormVisible(true);
  };

  // 删除费用
  const handleDelete = (expense: Expense) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除这笔 ¥${expense.amount} 的费用吗？`,
      onOk: () => {
        Message.success('删除成功');
        onUpdate();
      },
    });
  };

  // 保存
  const handleSave = () => {
    if (!form.amount || !form.date) {
      Message.error('请填写完整信息');
      return;
    }
    if (form.isOverStandard && !form.overStandardReason) {
      Message.error('超标费用请填写原因');
      return;
    }
    Message.success(editingExpense ? '更新成功' : '创建成功');
    setFormVisible(false);
    onUpdate();
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      width: 100,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (value: TripExpenseType) => (
        <Tag>{expenseTypeLabels[value]}</Tag>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 100,
      render: (value: number) => (
        <Text style={{ fontWeight: 500 }}>¥{value.toLocaleString()}</Text>
      ),
    },
    {
      title: '关联旅程段',
      dataIndex: 'segmentDesc',
      width: 120,
    },
    {
      title: '发票号',
      dataIndex: 'invoiceNo',
      width: 120,
      render: (value: string) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'isOverStandard',
      width: 80,
      render: (value: boolean) => (
        value ? (
          <Tag color="red" icon={<IconExclamationCircle />}>超标</Tag>
        ) : (
          <Tag color="green">正常</Tag>
        )
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 200,
      ellipsis: true,
      render: (value: string) => value || '-',
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: Expense & { segmentDesc: string }) => (
        <Space>
          <Button type="text" size="small" icon={<IconEdit />} onClick={() => handleEdit(record)} />
          <Button type="text" size="small" status="danger" icon={<IconDelete />} onClick={() => handleDelete(record)} />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* 费用汇总 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {Object.entries(expenseSummary).map(([type, amount]) => (
          <Col span={6} key={type}>
            <Card>
              <div><Text type="secondary">{expenseTypeLabels[type as TripExpenseType] || type}</Text></div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>¥{amount.toLocaleString()}</div>
            </Card>
          </Col>
        ))}
        <Col span={6}>
          <Card>
            <div><Text type="secondary">总费用</Text></div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#165dff' }}>¥{totalExpense.toLocaleString()}</div>
          </Card>
        </Col>
      </Row>

      {/* 费用列表 */}
      <Card
        title="费用记录"
        extra={
          <Space>
            <Button.Group>
              <Button
                type={viewMode === 'list' ? 'primary' : 'default'}
                icon={<IconList />}
                onClick={() => setViewMode('list')}
                size="small"
              />
              <Button
                type={viewMode === 'timeline' ? 'primary' : 'default'}
                icon={<IconDashboard />}
                onClick={() => setViewMode('timeline')}
                size="small"
              />
            </Button.Group>
            <Button size="small" onClick={() => setOcrOpen(true)}>
              <IconScan style={{ marginRight: 4 }} />OCR 识别发票
            </Button>
            <Button type="primary" size="small" icon={<IconPlus />} onClick={handleCreate}>
              新增费用
            </Button>
          </Space>
        }
      >
        {viewMode === 'list' ? (
          <Table
            columns={columns}
            data={allExpenses}
            rowKey="id"
            scroll={{ x: 900 }}
            pagination={false}
            noDataContent="暂无费用记录"
          />
        ) : (
          <TimelineView expenses={allExpenses} typeLabels={expenseTypeLabels} />
        )}
      </Card>

      {/* 新建/编辑表单弹窗 */}
      <Modal
        title={editingExpense ? '编辑费用' : '新增费用'}
        visible={formVisible}
        onOk={handleSave}
        onCancel={() => setFormVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div>
            <div style={{ marginBottom: 8 }}><Text>关联旅程段</Text></div>
            <Select
              placeholder="选择旅程段"
              value={form.itinerarySegmentId}
              onChange={(value) => setForm({ ...form, itinerarySegmentId: value })}
              style={{ width: '100%' }}
            >
              {trip.itinerarySegments?.map((seg) => (
                <Option key={seg.id} value={seg.id}>
                  {seg.departure}→{seg.destination} ({seg.departureDate})
                </Option>
              ))}
            </Select>
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>费用类型</Text></div>
              <Select
                value={form.type}
                onChange={(value) => setForm({ ...form, type: value as TripExpenseType })}
                style={{ width: '100%' }}
              >
                <Option value="meal">餐饮费</Option>
                <Option value="communication">通讯费</Option>
                <Option value="local_transport">市内交通</Option>
                <Option value="entertainment">招待费</Option>
                <Option value="office">办公用品</Option>
                <Option value="other">其他</Option>
              </Select>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}>
                <Text>金额</Text> <Text type="error">*</Text>
              </div>
              <Input
                type="number"
                placeholder="¥0"
                value={form.amount || ''}
                onChange={(value) => setForm({ ...form, amount: Number(value) })}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}>
                <Text>发生日期</Text> <Text type="error">*</Text>
              </div>
              <Input
                type="date"
                value={form.date}
                onChange={(value) => setForm({ ...form, date: value })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}><Text>发票号</Text></div>
              <Input
                placeholder="选填"
                value={form.invoiceNo}
                onChange={(value) => setForm({ ...form, invoiceNo: value })}
              />
            </Col>
          </Row>
          {form.isOverStandard && (
            <div>
              <div style={{ marginBottom: 8 }}>
                <Text>超标原因</Text> <Text type="error">*</Text>
              </div>
              <TextArea
                placeholder="请说明超标原因"
                value={form.overStandardReason}
                onChange={(value) => setForm({ ...form, overStandardReason: value })}
              />
            </div>
          )}
          <div>
            <div style={{ marginBottom: 8 }}><Text>备注</Text></div>
            <TextArea
              placeholder="选填"
              value={form.remark}
              onChange={(value) => setForm({ ...form, remark: value })}
            />
          </div>
        </Space>
      </Modal>

      {/* OCR 弹窗 */}
      <ExpenseOCR open={ocrOpen} onOpenChange={setOcrOpen} />
    </div>
  );
}
