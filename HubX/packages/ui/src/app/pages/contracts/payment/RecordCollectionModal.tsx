import { useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, Message } from '@arco-design/web-react';
import { COLLECTION_METHODS } from './paymentMock';
import type { Contract } from '../types';

interface Props {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
}

export function RecordCollectionModal({ visible, contract, onClose }: Props) {
  const [form, setForm] = useState({
    periodNo: 1,
    amount: 0,
    date: '2026-08-19',
    method: '对公转账' as string,
    note: '',
  });

  const plans = contract?.paymentPlans ?? [];

  const handleSubmit = () => {
    if (!contract) return;
    if (form.amount <= 0) {
      Message.warning('金额必须大于 0');
      return;
    }
    // α 模拟：提示成功
    Message.success(`已录入回款 ¥${form.amount.toLocaleString()}`);
    onClose();
    setForm({ periodNo: 1, amount: 0, date: '2026-08-19', method: '对公转账', note: '' });
  };

  return (
    <Modal
      title="录入回款"
      visible={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="确认录入"
    >
      <Form layout="vertical">
        <Form.Item label="合同">
          <Input value={contract ? `${contract.contractNo} - ${contract.name}` : ''} disabled />
        </Form.Item>
        <Form.Item label="关联回款期次">
          <Select value={form.periodNo} onChange={v => setForm(f => ({ ...f, periodNo: v }))}>
            {plans.map(p => (
              <Select.Option key={p.periodNo} value={p.periodNo}>
                {p.planName}（¥{p.amount.toLocaleString()}）
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="本次到账金额（元）">
          <InputNumber
            value={form.amount}
            onChange={v => setForm(f => ({ ...f, amount: v ?? 0 }))}
            min={0}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item label="到账日期">
          <Input type="date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
        </Form.Item>
        <Form.Item label="收款渠道">
          <Select value={form.method} onChange={v => setForm(f => ({ ...f, method: v }))}>
            {COLLECTION_METHODS.map(m => <Select.Option key={m} value={m}>{m}</Select.Option>)}
          </Select>
        </Form.Item>
        <Form.Item label="备注">
          <Input.TextArea value={form.note} onChange={v => setForm(f => ({ ...f, note: v }))} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
