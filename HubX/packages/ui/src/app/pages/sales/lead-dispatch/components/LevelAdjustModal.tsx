// 等级调整弹窗（阶段 D）
// PLAN.md 决策 5：S/A/B/C，无 D 级。
// 升级免审直接生效；降级走审批（写 level_change 事件 + pending 标记）。

import { useEffect, useState } from 'react';
import { GradeTag, Message, Modal, OrderedStatePicker, Space, Typography } from '@/design-system';
import type { CustomerLevel } from '../../leads/types';
import { CUSTOMER_LEVEL_LIST } from '../../leads/types';
import { GRADE_TONE } from '@/design-system';

const LEVEL_ORDER: Record<CustomerLevel, number> = { S: 4, A: 3, B: 2, C: 1 };

export interface LevelAdjustPayload {
  from: CustomerLevel;
  to: CustomerLevel;
  /** true = 需要审批（降级）；false = 直接生效（升级/同级） */
  needsApproval: boolean;
}

interface LevelAdjustModalProps {
  visible: boolean;
  currentLevel: CustomerLevel;
  leadName: string;
  onClose: () => void;
  onConfirm: (payload: LevelAdjustPayload) => void;
}

export function LevelAdjustModal({ visible, currentLevel, leadName, onClose, onConfirm }: LevelAdjustModalProps) {
  const [selected, setSelected] = useState<CustomerLevel>(currentLevel);

  useEffect(() => {
    if (visible) setSelected(currentLevel);
  }, [visible, currentLevel]);

  const isDowngrade = LEVEL_ORDER[selected] < LEVEL_ORDER[currentLevel];
  const isSame = selected === currentLevel;

  const handleConfirm = () => {
    if (isSame) {
      Message.info('等级未变更');
      return;
    }
    onConfirm({
      from: currentLevel,
      to: selected,
      needsApproval: isDowngrade,
    });
  };

  return (
    <Modal
      title={`调整客户等级 — ${leadName}`}
      visible={visible}
      onCancel={onClose}
      onOk={handleConfirm}
      okText={isDowngrade ? '提交审核' : '确认调整'}
      cancelText="取消"
      style={{ width: 380 }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Typography.Text style={{ marginBottom: 8, display: 'block' }}>
            当前等级： <GradeTag grade={currentLevel} />
          </Typography.Text>
          <OrderedStatePicker
            ariaLabel="客户等级"
            value={selected}
            onChange={(value) => setSelected((value ?? currentLevel) as CustomerLevel)}
            options={CUSTOMER_LEVEL_LIST.map((lv) => ({
              value: lv,
              tone: GRADE_TONE[lv],
              label: <Space><GradeTag grade={lv} />{lv === currentLevel && <Typography.Text type="secondary">（当前）</Typography.Text>}</Space>,
              description: LEVEL_ORDER[lv] > LEVEL_ORDER[currentLevel] && lv !== currentLevel
                ? '↑ 升级'
                : LEVEL_ORDER[lv] < LEVEL_ORDER[currentLevel]
                  ? '↓ 降级（需审核）'
                  : undefined,
            }))}
          />
        </div>

        {isDowngrade && (
          <Typography.Text type="warning" style={{ fontSize: 'var(--text-xs)' }}>
            ⚠️ 降级操作需要管理员审核，提交后进入「等级审核」队列。
          </Typography.Text>
        )}
      </Space>
    </Modal>
  );
}
