/**
 * 管理参数 Modal
 *
 * 设计规约见 case-detail-dev-plan.md §3.1：
 * - targetMargin / budgetCap / commercialCap 三个 InputNumber
 */

import { useState, useEffect } from 'react';
import { Modal, InputNumber, Space, Typography } from '@arco-design/web-react';

const { Text } = Typography;

interface ManageParamsModalProps {
  visible: boolean;
  targetMargin: number;
  budgetCap: number;
  commercialCap: number;
  onSave: (params: { targetMargin: number; budgetCap: number; commercialCap: number }) => void;
  onCancel: () => void;
}

export function ManageParamsModal({
  visible, targetMargin, budgetCap, commercialCap, onSave, onCancel,
}: ManageParamsModalProps) {
  const [margin, setMargin] = useState(targetMargin);
  const [budget, setBudget] = useState(budgetCap);
  const [commercial, setCommercial] = useState(commercialCap);

  useEffect(() => {
    if (visible) {
      setMargin(targetMargin);
      setBudget(budgetCap);
      setCommercial(commercialCap);
    }
  }, [visible, targetMargin, budgetCap, commercialCap]);

  const handleOk = () => {
    onSave({ targetMargin: margin, budgetCap: budget, commercialCap: commercial });
  };

  return (
    <Modal
      title="管理参数"
      visible={visible}
      onOk={handleOk}
      onCancel={onCancel}
      okText="保存"
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <div>
          <Text style={{ display: 'block', marginBottom: 4 }}>目标利润率 (%)</Text>
          <InputNumber
            value={margin}
            onChange={(v) => setMargin(v ?? 0)}
            min={0}
            max={100}
            step={1}
            suffix="%"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <Text style={{ display: 'block', marginBottom: 4 }}>预算上限 (元)</Text>
          <InputNumber
            value={budget}
            onChange={(v) => setBudget(v ?? 0)}
            min={0}
            step={10000}
            formatter={(v) => `¥ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <Text style={{ display: 'block', marginBottom: 4 }}>商务费用上限 (元)</Text>
          <InputNumber
            value={commercial}
            onChange={(v) => setCommercial(v ?? 0)}
            min={0}
            step={1000}
            formatter={(v) => `¥ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            style={{ width: '100%' }}
          />
        </div>
      </Space>
    </Modal>
  );
}
