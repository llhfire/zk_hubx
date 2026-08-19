import { useState } from 'react';
import { Modal, Form, Input, Select, Message } from '@arco-design/web-react';
import { DUNNING_METHODS } from './paymentMock';
import type { Contract } from '../types';

interface Props {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
}

export function DunningModal({ visible, contract, onClose }: Props) {
  const [form, setForm] = useState({
    date: '2026-08-19',
    method: '电话' as string,
    contactPerson: '',
    result: '',
    promisedPayDate: '',
    nextPlan: '',
  });

  const handleSubmit = () => {
    if (!contract) return;
    if (!form.result) {
      Message.warning('请填写沟通结果');
      return;
    }
    Message.success('催款记录已保存');
    onClose();
    setForm({ date: '2026-08-19', method: '电话', contactPerson: '', result: '', promisedPayDate: '', nextPlan: '' });
  };

  return (
    <Modal
      title="记录催款"
      visible={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="保存记录"
    >
      <Form layout="vertical">
        <Form.Item label="合同">
          <Input value={contract ? `${contract.contractNo} - ${contract.name}` : ''} disabled />
        </Form.Item>
        <Form.Item label="催款日期">
          <Input type="date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
        </Form.Item>
        <Form.Item label="催款方式">
          <Select value={form.method} onChange={v => setForm(f => ({ ...f, method: v }))}>
            {DUNNING_METHODS.map(m => <Select.Option key={m} value={m}>{m}</Select.Option>)}
          </Select>
        </Form.Item>
        <Form.Item label="客户方对接人">
          <Input value={form.contactPerson} onChange={v => setForm(f => ({ ...f, contactPerson: v }))} placeholder="姓名/职位" />
        </Form.Item>
        <Form.Item label="沟通结果（必填）">
          <Input.TextArea value={form.result} onChange={v => setForm(f => ({ ...f, result: v }))} placeholder="客户反馈情况" />
        </Form.Item>
        <Form.Item label="客户承诺付款日期（选填）">
          <Input type="date" value={form.promisedPayDate} onChange={v => setForm(f => ({ ...f, promisedPayDate: v }))} />
        </Form.Item>
        <Form.Item label="下一步跟进计划">
          <Input.TextArea value={form.nextPlan} onChange={v => setForm(f => ({ ...f, nextPlan: v }))} placeholder="我方下一步计划" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
