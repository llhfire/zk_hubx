import { useState, useMemo } from 'react';
import { Table, Tag, Button, Space, Select, Message } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { useOperatingExpense } from './OperatingExpenseContext';
import { voidExpense, patchPostedExpense, confirmExpense } from './expenseMutations';
import { CATEGORY_SEED } from './categorySeed';
import { RECORDABLE_PRIMARY } from './types';
import type { ExpenseRecord, ExpenseStatus } from './types';
import { ExpenseFormDrawer } from './ExpenseFormDrawer';

const STATUSColors: Record<ExpenseStatus, string> = { pending: 'orange', posted: 'green', voided: 'red' };
const STATUSLabels: Record<ExpenseStatus, string> = { pending: '待确认', posted: '已入账', voided: '已作废' };

export function LedgerTab() {
  const { records, setRecords } = useOperatingExpense();
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all');
  const [drawerVisible, setDrawerVisible] = useState(false);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return records;
    return records.filter(r => r.status === statusFilter);
  }, [records, statusFilter]);

  const handleVoid = (record: ExpenseRecord) => {
    setRecords(prev => prev.map(r => r.id === record.id ? voidExpense(record, '当前用户') : r));
    Message.success('已作废');
  };

  const handleConfirm = (record: ExpenseRecord) => {
    setRecords(prev => prev.map(r => r.id === record.id ? confirmExpense(record, '当前用户') : r));
    Message.success('已确认入账');
  };

  const getCategoryName = (primary: string, secondary?: string) => {
    const cat = CATEGORY_SEED.find(c => c.id === primary);
    if (!secondary) return cat?.name ?? primary;
    const sub = cat?.children?.find(c => c.id === secondary);
    return `${cat?.name ?? primary} / ${sub?.name ?? secondary}`;
  };

  const columns = [
    { title: '单号', dataIndex: 'expenseNo', width: 150 },
    {
      title: '科目', render: (_: unknown, r: ExpenseRecord) => getCategoryName(r.categoryPrimary, r.categorySecondary),
    },
    { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => `¥${v.toLocaleString()}` },
    { title: '归属月', dataIndex: 'billingMonth', width: 100 },
    {
      title: '归属', dataIndex: 'attribution', width: 80,
      render: (v: string) => ({ pool: '公共池', project: '项目', lead_channel: '线索' })[v] ?? v,
    },
    { title: '来源', dataIndex: 'source', width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: ExpenseStatus) => <Tag color={STATUSColors[v]}>{STATUSLabels[v]}</Tag>,
    },
    {
      title: '操作', width: 160,
      render: (_: unknown, r: ExpenseRecord) => (
        <Space>
          {r.status === 'pending' && <Button size="mini" type="primary" onClick={() => handleConfirm(r)}>确认</Button>}
          {r.status === 'posted' && !r.isProjection && (
            <Button size="mini" status="danger" onClick={() => handleVoid(r)}>作废</Button>
          )}
          {r.isProjection && <Tag color="gray" size="small">投影只读</Tag>}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 120 }}>
            <Select.Option value="all">全部状态</Select.Option>
            <Select.Option value="pending">待确认</Select.Option>
            <Select.Option value="posted">已入账</Select.Option>
            <Select.Option value="voided">已作废</Select.Option>
          </Select>
        </Space>
        <Button type="primary" icon={<IconPlus />} onClick={() => setDrawerVisible(true)}>录入费用</Button>
      </div>
      <Table rowKey="id" data={filtered} columns={columns} pagination={{ pageSize: 20 }} />
      <ExpenseFormDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </div>
  );
}
