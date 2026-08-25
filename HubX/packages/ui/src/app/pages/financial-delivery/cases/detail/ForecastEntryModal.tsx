/**
 * 录入预计未来费用 Modal
 *
 * 设计规约见 case-detail-dev-plan.md §3.1：
 * - 分类(新五类)/类型/金额/预计日期/描述 → push mockCostItems(forecast)
 */

import { useState } from 'react';
import { Modal, Input, InputNumber, Select, DatePicker, Space, Typography, Message } from '@arco-design/web-react';
import { COST_CATEGORIES, COST_CATEGORY_LABELS, type CostCategory } from '../../types';

const { Text } = Typography;
const { TextArea } = Input;
const Option = Select.Option;

interface ForecastEntryModalProps {
  visible: boolean;
  onSave: (item: {
    costCategory: CostCategory;
    costType: string;
    amount: number;
    date: string;
    description: string;
  }) => void;
  onCancel: () => void;
}

export function ForecastEntryModal({ visible, onSave, onCancel }: ForecastEntryModalProps) {
  const [category, setCategory] = useState<CostCategory>('labor');
  const [costType, setCostType] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  const handleOk = () => {
    if (!costType.trim()) {
      Message.warning('请填写费用类型');
      return;
    }
    if (amount <= 0) {
      Message.warning('金额必须大于 0');
      return;
    }
    onSave({ costCategory: category, costType, amount, date, description });
    // 重置
    setCategory('labor');
    setCostType('');
    setAmount(0);
    setDate('');
    setDescription('');
  };

  return (
    <Modal
      title="录入预计未来费用"
      visible={visible}
      onOk={handleOk}
      onCancel={onCancel}
      okText="录入"
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <div>
          <Text style={{ display: 'block', marginBottom: 4 }}>费用分类</Text>
          <Select value={category} onChange={setCategory} style={{ width: '100%' }}>
            {COST_CATEGORIES.map((c) => (
              <Option key={c} value={c}>{COST_CATEGORY_LABELS[c]}</Option>
            ))}
          </Select>
        </div>
        <div>
          <Text style={{ display: 'block', marginBottom: 4 }}>费用类型</Text>
          <Input value={costType} onChange={setCostType} placeholder="如：开发工时、差旅交通" />
        </div>
        <div>
          <Text style={{ display: 'block', marginBottom: 4 }}>金额 (元)</Text>
          <InputNumber
            value={amount}
            onChange={(v) => setAmount(v ?? 0)}
            min={0}
            step={1000}
            formatter={(v) => `¥ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <Text style={{ display: 'block', marginBottom: 4 }}>预计日期</Text>
          <DatePicker
            value={date || undefined}
            onChange={(_, ds) => setDate(Array.isArray(ds) ? ds[0] ?? '' : ds ?? '')}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <Text style={{ display: 'block', marginBottom: 4 }}>描述</Text>
          <TextArea
            value={description}
            onChange={setDescription}
            placeholder="费用说明"
            rows={2}
          />
        </div>
      </Space>
    </Modal>
  );
}
