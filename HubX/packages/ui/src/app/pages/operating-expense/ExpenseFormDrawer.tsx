import { useState } from 'react';
import { Drawer, Form, Input, Select, InputNumber, Button, Message } from '@arco-design/web-react';
import { useOperatingExpense } from './OperatingExpenseContext';
import { CATEGORY_SEED } from './categorySeed';
import { RECORDABLE_PRIMARY } from './types';
import type { ExpenseCategoryPrimary, Attribution } from './types';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ExpenseFormDrawer({ visible, onClose }: Props) {
  const { setRecords, records } = useOperatingExpense();
  const [form, setForm] = useState({
    categoryPrimary: 'OFFICE' as ExpenseCategoryPrimary,
    categorySecondary: '',
    amount: 0,
    billingMonth: '2026-08',
    attribution: 'pool' as Attribution,
    description: '',
  });

  const selectedCat = CATEGORY_SEED.find(c => c.id === form.categoryPrimary);

  const handleSubmit = () => {
    if (form.amount <= 0) {
      Message.warning('金额必须大于 0');
      return;
    }
    const seq = records.length + 1;
    const newRecord = {
      id: `exp-manual-${Date.now()}`,
      expenseNo: `EXP-${form.billingMonth.replace('-', '')}-${String(seq).padStart(3, '0')}`,
      categoryPrimary: form.categoryPrimary,
      categorySecondary: form.categorySecondary || undefined,
      amount: form.amount,
      occurDate: `${form.billingMonth}-01`,
      billingMonth: form.billingMonth,
      attribution: form.attribution,
      source: 'manual' as const,
      status: 'posted' as const,
      handler: '当前用户',
      audit: [{ at: new Date().toISOString(), actor: '当前用户', action: 'create' as const, detail: '手动录入' }],
      isProjection: false,
    };
    setRecords(prev => [...prev, newRecord]);
    Message.success('费用已录入');
    onClose();
    setForm({ categoryPrimary: 'OFFICE', categorySecondary: '', amount: 0, billingMonth: '2026-08', attribution: 'pool', description: '' });
  };

  return (
    <Drawer title="录入费用" visible={visible} onCancel={onClose} width={480} footer={
      <div style={{ textAlign: 'right' }}>
        <Button onClick={onClose} style={{ marginRight: 8 }}>取消</Button>
        <Button type="primary" onClick={handleSubmit}>提交</Button>
      </div>
    }>
      <Form layout="vertical">
        <Form.Item label="一级科目">
          <Select value={form.categoryPrimary} onChange={v => setForm(f => ({ ...f, categoryPrimary: v, categorySecondary: '' }))}>
            {RECORDABLE_PRIMARY.map(p => {
              const cat = CATEGORY_SEED.find(c => c.id === p);
              return <Select.Option key={p} value={p}>{cat?.name ?? p}</Select.Option>;
            })}
          </Select>
        </Form.Item>
        {selectedCat?.children && selectedCat.children.length > 0 && (
          <Form.Item label="二级科目">
            <Select value={form.categorySecondary} onChange={v => setForm(f => ({ ...f, categorySecondary: v }))} allowClear>
              {selectedCat.children.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
            </Select>
          </Form.Item>
        )}
        <Form.Item label="金额（元）">
          <InputNumber value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v ?? 0 }))} min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="归属月">
          <Select value={form.billingMonth} onChange={v => setForm(f => ({ ...f, billingMonth: v }))}>
            {['2026-06', '2026-07', '2026-08', '2026-09'].map(m => <Select.Option key={m} value={m}>{m}</Select.Option>)}
          </Select>
        </Form.Item>
        <Form.Item label="归属方式">
          <Select value={form.attribution} onChange={v => setForm(f => ({ ...f, attribution: v }))}>
            <Select.Option value="pool">公共池</Select.Option>
            <Select.Option value="project">项目</Select.Option>
            <Select.Option value="lead_channel">线索</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="备注">
          <Input.TextArea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
