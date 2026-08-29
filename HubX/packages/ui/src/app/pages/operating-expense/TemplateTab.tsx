import { useState } from 'react';
import { Table, Tag, Button, Message, Space, Modal, InputNumber } from '@arco-design/web-react';
import { useOperatingExpense } from './OperatingExpenseContext';
import { CATEGORY_SEED } from './categorySeed';
import type { RecurringExpenseTemplate } from './types';

export function TemplateTab() {
  const { records, templates, setRecords, setTemplates } = useOperatingExpense();
  const [editingTemplate, setEditingTemplate] = useState<RecurringExpenseTemplate | null>(null);
  const [nextAmount, setNextAmount] = useState<number | undefined>();

  const currentMonth = '2026-08'; // α 固定当前月

  const saveAmount = () => {
    if (!editingTemplate || nextAmount == null || nextAmount < 0) return;
    setTemplates(previous => previous.map(template => template.id === editingTemplate.id
      ? {
          ...template,
          amount: nextAmount,
          priceHistory: [
            ...template.priceHistory,
            {
              at: new Date().toISOString(),
              actor: '当前用户',
              oldAmount: template.amount,
              newAmount: nextAmount,
              effectiveMonth: currentMonth,
            },
          ],
        }
      : template));
    Message.success('模板金额已更新，后续周期将自动使用新金额');
    setEditingTemplate(null);
  };

  const replaceCurrentMonth = (template: RecurringExpenseTemplate) => {
    const affected = records.filter(record => record.templateId === template.id && record.billingMonth === currentMonth);
    if (affected.length === 0) {
      Message.info(`${currentMonth} 尚无自动生成记录`);
      return;
    }
    setRecords(previous => previous.map(record => (
      record.templateId === template.id && record.billingMonth === currentMonth
        ? {
            ...record,
            amount: template.amount,
            audit: [...record.audit, { at: new Date().toISOString(), actor: '当前用户', action: 'update', detail: `按模板一键替换为 ¥${template.amount}` }],
          }
        : record
    )));
    Message.success(`已替换 ${affected.length} 条 ${currentMonth} 费用记录`);
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
      title: '操作', width: 180,
      render: (_: unknown, r: RecurringExpenseTemplate) => {
        return (
          <Space>
            <Button size="mini" onClick={() => { setEditingTemplate(r); setNextAmount(r.amount); }}>修改金额</Button>
            <Button size="mini" type="primary" onClick={() => replaceCurrentMonth(r)}>一键替换</Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, color: '#86909c', fontSize: 13 }}>
        周期费用由系统按周期自动生成；这里只维护模板金额，必要时可用当前金额一键替换本月已生成记录。
      </div>
      <Table rowKey="id" data={templates} columns={columns} pagination={false} />
      <Modal
        title={editingTemplate ? `修改金额 · ${editingTemplate.name}` : '修改金额'}
        visible={Boolean(editingTemplate)}
        onOk={saveAmount}
        onCancel={() => setEditingTemplate(null)}
      >
        <InputNumber
          min={0}
          precision={2}
          value={nextAmount}
          onChange={(value) => setNextAmount(value as number)}
          prefix="¥"
          style={{ width: '100%' }}
          placeholder="请输入新的周期金额"
        />
      </Modal>
    </div>
  );
}
