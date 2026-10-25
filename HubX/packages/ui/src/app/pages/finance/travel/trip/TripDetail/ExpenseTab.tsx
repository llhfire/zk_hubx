import { useMemo, useState } from 'react';
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
  IconFilter,
  IconCheckCircle,
} from '@arco-design/web-react/icon';
import { ExpenseOCR } from '../../components/ExpenseOCR';
import { TimelineView } from './TimelineView';
import { ExpensePeriodSelector } from './ExpensePeriodSelector';
import {
  buildTenDaySegments,
  diffDays,
} from './timeSegmentUtils';
import type { Trip, Expense, TripExpenseType } from '../../types';

const { Text, Title } = Typography;
const { Row, Col } = Grid;
const { Option } = Select;
const { TextArea } = Input;

interface ExpenseTabProps {
  trip: Trip;
  onUpdate: () => void;
  selectedSegmentId?: string | null;
  onClearSegmentFilter?: () => void;
  onNavigateToReimburse?: () => void;
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

export function ExpenseTab({
  trip,
  onUpdate,
  selectedSegmentId,
  onClearSegmentFilter,
  onNavigateToReimburse,
}: ExpenseTabProps) {
  const [formVisible, setFormVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline');
  const [ocrOpen, setOcrOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [reasonModalVisible, setReasonModalVisible] = useState(false);
  const [targetOverExpense, setTargetOverExpense] = useState<Expense | null>(null);
  const [tempReason, setTempReason] = useState('');
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

  // 计算差旅起止跨度与总天数
  const { totalStartDate, totalEndDate, totalSpanDays } = useMemo(() => {
    const dates = allExpenses.map((e) => e.date).filter(Boolean);
    const startList = [trip.startDate, ...dates].filter(Boolean) as string[];
    const endList = [trip.endDate, ...dates].filter(Boolean) as string[];

    const s = startList.sort()[0] || new Date().toISOString().slice(0, 10);
    const e = endList.sort().reverse()[0] || s;
    const days = diffDays(s, e);
    return { totalStartDate: s, totalEndDate: e, totalSpanDays: days };
  }, [trip.startDate, trip.endDate, allExpenses]);

  // 按每 10 天切分为一个显示段
  const segments = useMemo(() => {
    return buildTenDaySegments({
      startDate: totalStartDate,
      endDate: totalEndDate,
      expenses: allExpenses,
    });
  }, [totalStartDate, totalEndDate, allExpenses]);

  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [filterTableBySegment, setFilterTableBySegment] = useState(false);

  const safeSegmentIndex = Math.min(activeSegmentIndex, Math.max(0, segments.length - 1));
  const currentSegment = segments[safeSegmentIndex] || segments[0];

  // 默认显示 10 天的差旅费用；若总天数 <= 7（未超过一周），则显示全部日期；若 > 7，则显示当前 10 天段的日期
  const visibleDates = useMemo(() => {
    if (totalSpanDays <= 7) {
      return undefined;
    }
    return currentSegment?.dateList;
  }, [totalSpanDays, currentSegment]);

  const selectedSegment = useMemo(() => {
    if (!selectedSegmentId) return null;
    return trip.itinerarySegments?.find((s) => s.id === selectedSegmentId) || null;
  }, [trip.itinerarySegments, selectedSegmentId]);

  const displayedTableExpenses = useMemo(() => {
    let list = allExpenses;
    if (selectedSegmentId) {
      list = list.filter((e) => e.itinerarySegmentId === selectedSegmentId);
    } else if (filterTableBySegment && visibleDates) {
      list = list.filter((e) => visibleDates.includes(e.date));
    }
    return list;
  }, [allExpenses, selectedSegmentId, filterTableBySegment, visibleDates]);

  // 时间轴可见日期：如果联动筛选了航段，提取该航段流水中的发生日期；否则使用分段日期
  const timelineVisibleDates = useMemo(() => {
    if (selectedSegmentId) {
      const dates = [...new Set(displayedTableExpenses.map((e) => e.date))].filter(Boolean).sort();
      if (dates.length > 0) {
        return dates;
      }
      if (selectedSegment?.departureDate) {
        return [selectedSegment.departureDate];
      }
      return undefined;
    }
    return visibleDates;
  }, [selectedSegmentId, displayedTableExpenses, selectedSegment, visibleDates]);

  // 已勾选的费用明细
  const selectedExpenses = useMemo(() => {
    return allExpenses.filter((e) => selectedRowKeys.includes(e.id));
  }, [allExpenses, selectedRowKeys]);
  const selectedExpensesAmount = useMemo(() => {
    return selectedExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [selectedExpenses]);

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

  // 保存超标自证事由
  const handleSaveOverStandardReason = () => {
    if (!tempReason.trim()) {
      Message.warning('请输入超标自证事由');
      return;
    }
    if (targetOverExpense) {
      targetOverExpense.overStandardReason = tempReason.trim();
      Message.success('已登记超标自证事由，随报销流转财务');
      setReasonModalVisible(false);
      onUpdate();
    }
  };

  // 批量转报销确认
  const handleConfirmBatchToReimburse = () => {
    Message.success(`已将选中的 ${selectedRowKeys.length} 笔费用归集并生成报销单！`);
    setBatchModalVisible(false);
    setSelectedRowKeys([]);
    onNavigateToReimburse?.();
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
      title: '合规核验',
      dataIndex: 'isOverStandard',
      width: 150,
      render: (value: boolean, record: Expense & { segmentDesc: string }) => (
        value ? (
          <Space direction="vertical" size={2}>
            <Tag color="red" icon={<IconExclamationCircle />}>超标待佐证</Tag>
            {record.overStandardReason ? (
              <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                佐证：{record.overStandardReason}
              </span>
            ) : (
              <Button
                type="text"
                size="mini"
                status="warning"
                style={{ padding: 0, height: 'auto', fontSize: 11 }}
                onClick={() => {
                  setTargetOverExpense(record);
                  setTempReason('');
                  setReasonModalVisible(true);
                }}
              >
                补录超标事由 ✎
              </Button>
            )}
          </Space>
        ) : (
          <Tag color="green" icon={<IconCheckCircle />}>合规正常</Tag>
        )
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 180,
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

  // 核心指标计算
  const budgetTotal = trip.estimatedTotalCost || 0;
  const executionRate = budgetTotal > 0 ? Math.round((totalExpense / budgetTotal) * 100) : 0;
  const overStandardCount = allExpenses.filter((e) => e.isOverStandard).length;
  const normalCount = allExpenses.length - overStandardCount;

  const categoryList = Object.entries(expenseSummary)
    .map(([type, amount]) => ({
      type: type as TripExpenseType,
      label: expenseTypeLabels[type as TripExpenseType] || type,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const topCategory = categoryList[0];

  return (
    <div className="trip-tab-pane">
      {/* 顶部专业微指标卡片组（4列对齐） */}
      <div className="trip-stat-grid">
        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span className="trip-stat-card__icon" style={{ background: '#e8f3ff', color: '#165dff' }}>
                <IconStorage />
              </span>
              总费用汇总
            </span>
            <Tag size="small" color="blue">实时发生</Tag>
          </div>
          <div className="trip-stat-card__value">
            ¥{totalExpense.toLocaleString()}
          </div>
          <div className="trip-stat-card__meta">
            <span>共计 {allExpenses.length} 笔流水</span>
            <span>日均 ¥{totalSpanDays > 0 ? Math.round(totalExpense / totalSpanDays).toLocaleString() : 0}/天</span>
          </div>
        </div>

        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span
                className="trip-stat-card__icon"
                style={{
                  background: executionRate > 100 ? '#ffece8' : '#e8ffea',
                  color: executionRate > 100 ? '#f53f3f' : '#00b42a',
                }}
              >
                <IconDashboard />
              </span>
              预算执行率
            </span>
            <Tag size="small" color={executionRate > 100 ? 'red' : executionRate >= 80 ? 'orange' : 'green'}>
              {executionRate > 100 ? '已超预算' : executionRate >= 80 ? '接近预警' : '在控'}
            </Tag>
          </div>
          <div
            className="trip-stat-card__value"
            style={{ color: executionRate > 100 ? '#f53f3f' : 'inherit' }}
          >
            {executionRate}%
          </div>
          <div className="trip-stat-card__meta">
            <span>预估总预算：¥{budgetTotal.toLocaleString()}</span>
            <span>结余 ¥{Math.max(0, budgetTotal - totalExpense).toLocaleString()}</span>
          </div>
        </div>

        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span className="trip-stat-card__icon" style={{ background: '#fff7e6', color: '#fa8c16' }}>
                <IconList />
              </span>
              最高开销科目
            </span>
            <Tag size="small" color="orange">核心支出</Tag>
          </div>
          <div className="trip-stat-card__value">
            {topCategory ? topCategory.label : '暂无支出'}
          </div>
          <div className="trip-stat-card__meta">
            <span>金额：¥{topCategory ? topCategory.amount.toLocaleString() : 0}</span>
            <span>占总比 {topCategory ? `${topCategory.percentage}%` : '0%'}</span>
          </div>
        </div>

        <div className="trip-stat-card">
          <div className="trip-stat-card__header">
            <span className="trip-stat-card__title">
              <span
                className="trip-stat-card__icon"
                style={{
                  background: overStandardCount > 0 ? '#ffece8' : '#e8ffea',
                  color: overStandardCount > 0 ? '#f53f3f' : '#00b42a',
                }}
              >
                <IconCheckCircle />
              </span>
              记账合规核验
            </span>
            <Tag size="small" color={overStandardCount > 0 ? 'red' : 'green'}>
              {overStandardCount > 0 ? `${overStandardCount} 笔异常` : '合规正常'}
            </Tag>
          </div>
          <div
            className="trip-stat-card__value"
            style={{ color: overStandardCount > 0 ? '#f53f3f' : '#00b42a' }}
          >
            {overStandardCount > 0 ? `${overStandardCount} 笔超标` : '100% 合规'}
          </div>
          <div className="trip-stat-card__meta">
            <span>标准内合规：{normalCount} 笔</span>
            <span>发票核验率 {allExpenses.length > 0 ? '100%' : '-'}</span>
          </div>
        </div>
      </div>

      {/* 支出分类分布胶囊条（信息整齐排列，杜绝卡片掉行空隙） */}
      {categoryList.length > 0 && (
        <div className="trip-category-pill-bar">
          <span className="trip-category-pill-bar__label">支出科目构成：</span>
          {categoryList.map((c) => (
            <div key={c.type} className="trip-category-pill">
              <span
                className="trip-category-pill__dot"
                style={{ backgroundColor: '#165dff' }}
              />
              <span>{c.label}</span>
              <strong style={{ color: 'var(--color-text-1)' }}>¥{c.amount.toLocaleString()}</strong>
              <span style={{ color: 'var(--color-text-3)', fontSize: 11 }}>({c.percentage}%)</span>
            </div>
          ))}
        </div>
      )}

      {/* 联动筛选指示栏 */}
      {selectedSegment && (
        <div className="trip-filter-alert">
          <Space size={8}>
            <IconStorage />
            <span>
              已与右侧航段轨迹联动筛选：<strong>{selectedSegment.departure} → {selectedSegment.destination}</strong> ({selectedSegment.departureDate})
            </span>
            <Tag size="small" color="arcoblue">
              相关流水 {displayedTableExpenses.length} 笔
            </Tag>
          </Space>
          <Button size="mini" type="text" onClick={onClearSegmentFilter}>
            清除航段联动 ×
          </Button>
        </div>
      )}

      {/* 专业精良的操作工具栏（与表格直接咬合，去除大 Card 套娃） */}
      <div className="trip-section-toolbar">
        <div className="trip-section-toolbar__title">
          <span>费用记录明细</span>
          <Tag size="small" color="gray">
            共 {displayedTableExpenses.length} 条记录
          </Tag>
          {viewMode === 'list' && totalSpanDays > 7 && !selectedSegmentId && (
            <Button
              size="mini"
              type={filterTableBySegment ? 'primary' : 'outline'}
              icon={<IconFilter />}
              onClick={() => setFilterTableBySegment(!filterTableBySegment)}
            >
              {filterTableBySegment
                ? `按当前 10 天段筛选中 (${displayedTableExpenses.length})`
                : `全部周期流水 (${allExpenses.length})`}
            </Button>
          )}
        </div>

        <div className="trip-section-toolbar__actions">
          {viewMode === 'list' && selectedRowKeys.length > 0 && (
            <Button
              type="outline"
              status="success"
              size="small"
              icon={<IconCheckCircle />}
              onClick={() => setBatchModalVisible(true)}
            >
              转为报销单 ({selectedRowKeys.length} 笔 · ¥{selectedExpensesAmount.toLocaleString()})
            </Button>
          )}

          <Button.Group>
            <Button
              type={viewMode === 'list' ? 'primary' : 'secondary'}
              icon={<IconList />}
              onClick={() => setViewMode('list')}
              size="small"
            >
              表格列表
            </Button>
            <Button
              type={viewMode === 'timeline' ? 'primary' : 'secondary'}
              icon={<IconDashboard />}
              onClick={() => setViewMode('timeline')}
              size="small"
            >
              时间轴走势
            </Button>
          </Button.Group>

          <Button size="small" onClick={() => setOcrOpen(true)}>
            <IconScan style={{ marginRight: 4 }} />OCR 识别发票
          </Button>

          <Button type="primary" size="small" icon={<IconPlus />} onClick={handleCreate}>
            新增费用
          </Button>
        </div>
      </div>

      {/* 主体视图区域 */}
      <div style={{ marginTop: 8 }}>
        {viewMode === 'list' ? (
          <Table
            columns={columns}
            data={displayedTableExpenses}
            rowKey="id"
            scroll={{ x: 950 }}
            pagination={false}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys as string[]),
            }}
            noDataElement="暂无费用记录"
          />
        ) : (
          <TimelineView
            expenses={displayedTableExpenses}
            typeLabels={expenseTypeLabels}
            visibleDates={timelineVisibleDates}
          />
        )}

        {/* 超过一周则在下方显示时间段选择器，按每10天一个显示段 */}
        {totalSpanDays > 7 && !selectedSegmentId && (
          <ExpensePeriodSelector
            segments={segments}
            activeIndex={safeSegmentIndex}
            onChange={setActiveSegmentIndex}
            totalSpanDays={totalSpanDays}
          />
        )}
      </div>

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
                value={form.amount ? String(form.amount) : ''}
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

      {/* 批量转为报销单确认弹窗 */}
      <Modal
        title="批量归集并转为报销单"
        visible={batchModalVisible}
        onOk={handleConfirmBatchToReimburse}
        onCancel={() => setBatchModalVisible(false)}
        okText="确认生成报销单"
        cancelText="取消"
      >
        <div>
          <div style={{ marginBottom: 12, padding: '10px 12px', background: '#e8ffea', borderRadius: 4, color: '#00b42a' }}>
            已勾选 <strong>{selectedRowKeys.length}</strong> 笔记账费用，合计归集金额：<strong>¥{selectedExpensesAmount.toLocaleString()}</strong>
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            系统将自动为您创建一张待申报报销单，并关联已填报发票凭证。
          </Text>
          <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--color-border-2)', borderRadius: 4, padding: '6px 10px' }}>
            {selectedExpenses.map((exp) => (
              <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--color-border-1)', fontSize: 12 }}>
                <span>{exp.date} · {expenseTypeLabels[exp.type]} ({exp.invoiceNo || '无发票号'})</span>
                <strong style={{ color: 'rgb(var(--primary-6))' }}>¥{exp.amount.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* 超标费用自证事由录入弹窗 */}
      <Modal
        title="补录费用超标自证说明"
        visible={reasonModalVisible}
        onOk={handleSaveOverStandardReason}
        onCancel={() => setReasonModalVisible(false)}
        okText="提交合规备案"
        cancelText="取消"
      >
        <div>
          <div style={{ marginBottom: 12, fontSize: 13 }}>
            当前开销：<strong>¥{targetOverExpense?.amount}</strong> ({targetOverExpense && expenseTypeLabels[targetOverExpense.type]}) · {targetOverExpense?.date}
          </div>
          <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--color-text-3)' }}>
            请填写合规合理事由（如：旺季临时溢价、受客户指定地点、突发应急事件等），将作为财务与管理层审批参考依据：
          </div>
          <TextArea
            placeholder="例如：因客户紧急更改技术评审会议时间，周边经济型酒店满房，经总监特批预订商务标间..."
            rows={4}
            value={tempReason}
            onChange={(val) => setTempReason(val)}
          />
        </div>
      </Modal>

      {/* OCR 弹窗 */}
      <ExpenseOCR open={ocrOpen} onOpenChange={setOcrOpen} />
    </div>
  );
}
