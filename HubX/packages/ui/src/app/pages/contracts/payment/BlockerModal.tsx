import { useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, Message } from '@arco-design/web-react';
import { BLOCKER_TYPE_LABELS } from './paymentMock';
import type { Contract } from '../types';
import type { BlockerType } from '../types';

interface Props {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
}

export function BlockerModal({ visible, contract, onClose }: Props) {
  const [form, setForm] = useState({
    type: 'overdue_unpaid' as BlockerType,
    title: '',
    description: '',
    amountBlocked: 0,
    ownerId: '',
  });

  const handleSubmit = () => {
    if (!contract) return;
    if (!form.description) {
      Message.warning('请填写卡点原因');
      return;
    }
    Message.success('卡点已登记');
    onClose();
    setForm({ type: 'overdue_unpaid', title: '', description: '', amountBlocked: 0, ownerId: '' });
  };

  return (
    <Modal
      title="标记卡点"
      visible={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="确认标记"
    >
      <Form layout="vertical">
        <Form.Item label="合同">
          <Input value={contract ? `${contract.contractNo} - ${contract.name}` : ''} disabled />
        </Form.Item>
        <Form.Item label="卡点类型">
          <Select value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))}>
            {Object.entries(BLOCKER_TYPE_LABELS).map(([k, v]) => (
              <Select.Option key={k} value={k}>{v}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="受阻金额（元）">
          <InputNumber
            value={form.amountBlocked}
            onChange={v => setForm(f => ({ ...f, amountBlocked: v ?? 0 }))}
            min={0}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item label="卡点原因（必填）">
          <Input.TextArea
            value={form.description}
            onChange={v => setForm(f => ({ ...f, description: v }))}
            placeholder="请详细描述卡点原因"
          />
        </Form.Item>
        <Form.Item label="攻坚责任人">
          <Input
            value={form.ownerId}
            onChange={v => setForm(f => ({ ...f, ownerId: v }))}
            placeholder="默认商务负责人"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
