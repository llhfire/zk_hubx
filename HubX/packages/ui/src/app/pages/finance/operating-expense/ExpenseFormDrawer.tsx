import { useState } from 'react';
import { Drawer, Form, Input, Select, InputNumber, Button, Message, DatePicker } from '@arco-design/web-react';
import { useOperatingExpense } from './OperatingExpenseContext';
import { CATEGORY_SEED } from './categorySeed';
import type { ExpenseCategoryPrimary, Attribution } from './types';
import { CURRENT_MONTH, ALPHA_TODAY } from './opexConstants';

/** 可手工录入的一级科目（排除 TRAVEL/PROMOTION/BUSINESS/LABOR） */
const MANUAL_PRIMARY: ExpenseCategoryPrimary[] = [
  'OFFICE', 'BENEFIT', 'HR_ADMIN', 'OTHER', 'THIRD_PARTY',
];

/** 按一级锁归属选项 */
function allowedAttributions(primary: ExpenseCategoryPrimary): Attribution[] {
  switch (primary) {
    case 'THIRD_PARTY':
      return ['pool', 'project'];
    default:
      return ['pool', 'project', 'lead_channel'];
  }
}

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
    occurDate: ALPHA_TODAY,
    billingMonth: CURRENT_MONTH,
    attribution: 'pool' as Attribution,
    description: '',
  });

  const selectedCat = CATEGORY_SEED.find(c => c.id === form.categoryPrimary);
  const attributions = allowedAttributions(form.categoryPrimary);

  const handleSubmit = () => {
    if (form.amount <= 0) {
      Message.warning('金额必须大于 0');
      return;
    }
    if (!form.occurDate) {
      Message.warning('请填写发生日');
      return;
    }
    // 发生日校验：MANUAL_PRIMARY 手工录入
    if (!MANUAL_PRIMARY.includes(form.categoryPrimary)) {
      Message.warning('该科目不支持手工录入');
      return;
    }
    const seq = records.length + 1;
    const newRecord = {
      id: `exp-manual-${Date.now()}`,
      expenseNo: `EXP-${form.billingMonth.replace('-', '')}-${String(seq).padStart(3, '0')}`,
      categoryPrimary: form.categoryPrimary,
      categorySecondary: form.categorySecondary || undefined,
      amount: form.amount,
      occurDate: form.occurDate,
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
    setForm({ categoryPrimary: 'OFFICE', categorySecondary: '', amount: 0, occurDate: ALPHA_TODAY, billingMonth: CURRENT_MONTH, attribution: 'pool', description: '' });
  };

  return (
    <Drawer title="录入费用" visible={visible} onCancel={onClose} width={480} footer={
      <div style={{ textAlign: 'right' }}>
        <Button onClick={onClose} style={{ marginRight: 8 }}>取消</Button>
        <Button type="primary" onClick={handleSubmit}>提交</Button>
      </div>
    }>
      <Form layout="vertical">
        <Form.Item label="发生日" required>
          <Input
            type="date"
            value={form.occurDate}
            onChange={v => {
              setForm(f => {
                const next = { ...f, occurDate: v };
                // 发生日改了，归属月默认跟随
                if (v && !f.billingMonth) {
                  next.billingMonth = v.slice(0, 7);
                }
                return next;
              });
            }}
          />
        </Form.Item>
        <Form.Item label="归属月">
          <Select value={form.billingMonth} onChange={v => setForm(f => ({ ...f, billingMonth: v }))}>
            {['2026-05', '2026-06', '2026-07', '2026-08', '2026-09'].map(m => <Select.Option key={m} value={m}>{m}</Select.Option>)}
          </Select>
        </Form.Item>
        <Form.Item label="一级科目">
          <Select value={form.categoryPrimary} onChange={v => {
            setForm(f => {
              const nextAttrib = allowedAttributions(v).includes(f.attribution) ? f.attribution : 'pool';
              return { ...f, categoryPrimary: v, categorySecondary: '', attribution: nextAttrib };
            });
          }}>
            {MANUAL_PRIMARY.map(p => {
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
        <Form.Item label="归属方式">
          <Select value={form.attribution} onChange={v => setForm(f => ({ ...f, attribution: v }))}>
            {attributions.map(a => (
              <Select.Option key={a} value={a}>
                {a === 'pool' ? '公共池' : a === 'project' ? '项目' : '线索'}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="备注">
          <Input.TextArea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
