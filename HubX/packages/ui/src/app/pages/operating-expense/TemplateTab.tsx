import { useMemo } from 'react';
import { Table, Tag, Button, Message, Space } from '@arco-design/web-react';
import { useOperatingExpense } from './OperatingExpenseContext';
import { canGenerate, generateFromTemplate } from './expenseMutations';
import { CATEGORY_SEED } from './categorySeed';
import type { RecurringExpenseTemplate } from './types';

export function TemplateTab() {
  const { records, templates, setRecords } = useOperatingExpense();

  const currentMonth = '2026-08'; // α 固定当前月

  const handleGenerate = (template: RecurringExpenseTemplate) => {
    if (!canGenerate(template, currentMonth, records)) {
      Message.warning('该模板本月已有记录');
      return;
    }
    const seq = records.length + 1;
    const newRecord = generateFromTemplate(template, currentMonth, '当前用户', seq);
    setRecords(prev => [...prev, newRecord]);
    Message.success(`已生成 ${template.name} ${currentMonth} 费用`);
  };

  const getCategoryName = (primary: string, secondary?: string) => {
    const cat = CATEGORY_SEED.find(c => c.id === primary);
    if (!secondary) return cat?.name ?? primary;
    const sub = cat?.children?.find(c => c.id === secondary);
    return `${cat?.name ?? primary} / ${sub?.name ?? secondary}`;
  };

  const columns = [
    { title: '模板名称', dataIndex: 'name', width: 160 },
    {
      title: '科目', render: (_: unknown, r: RecurringExpenseTemplate) => getCategoryName(r.categoryPrimary, r.categorySecondary),
    },
    { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => `¥${v.toLocaleString()}` },
    {
      title: '类型', dataIndex: 'kind', width: 80,
      render: (v: string) => <Tag color={v === 'fixed' ? 'blue' : 'orange'}>{v === 'fixed' ? '固定' : '浮动'}</Tag>,
    },
    { title: '周期', dataIndex: 'cycle', width: 80, render: (v: string) => ({ monthly: '月', quarterly: '季', yearly: '年' })[v] ?? v },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: string) => <Tag color={v === 'active' ? 'green' : 'gray'}>{v === 'active' ? '启用' : '暂停'}</Tag>,
    },
    {
      title: '操作', width: 120,
      render: (_: unknown, r: RecurringExpenseTemplate) => {
        const canGen = canGenerate(r, currentMonth, records);
        return (
          <Space>
            <Button size="mini" type="primary" disabled={!canGen} onClick={() => handleGenerate(r)}>
              {canGen ? `生成${currentMonth}` : '已生成'}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, color: '#86909c', fontSize: 13 }}>
        固定模板一键生成即入账；浮动模板生成后为「待确认」，确认后才入池。同一模板同一归属月再生成自动跳过。
      </div>
      <Table rowKey="id" data={templates} columns={columns} pagination={false} />
    </div>
  );
}
