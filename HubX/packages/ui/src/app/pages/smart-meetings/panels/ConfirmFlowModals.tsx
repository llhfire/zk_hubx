/**
 * 确认流程弹窗集合
 *
 * 设计规约见 smart-meetings-ui-design.md §4.8：
 * - 提交确认：校验必填（标题/时间/确认人）；二次确认
 * - 确认：「确认后行动项将同步至责任人待办」；触发 diffActionItemsToTodo
 * - 驳回：必填驳回意见（写入版本备注）
 * - 撤回：「将生成新版本，已同步待办不受影响」
 * - 归档：「归档不取消未完成待办」
 */

import { useState } from 'react';
import { Modal, Input, Message, Typography } from '@arco-design/web-react';

const { Text } = Typography;
const { TextArea } = Input;

interface ConfirmFlowModalsProps {
  /** 提交确认弹窗 */
  submitVisible: boolean;
  onSubmitConfirm: () => void;
  onSubmitCancel: () => void;

  /** 确认弹窗 */
  confirmVisible: boolean;
  onConfirmOk: () => void;
  onConfirmCancel: () => void;

  /** 驳回弹窗 */
  rejectVisible: boolean;
  onRejectOk: (reason: string) => void;
  onRejectCancel: () => void;

  /** 撤回弹窗 */
  withdrawVisible: boolean;
  onWithdrawOk: () => void;
  onWithdrawCancel: () => void;

  /** 归档弹窗 */
  archiveVisible: boolean;
  onArchiveOk: () => void;
  onArchiveCancel: () => void;

  /** 校验函数（提交时调用） */
  validateForSubmit: () => string[];
}

export function ConfirmFlowModals({
  submitVisible, onSubmitConfirm, onSubmitCancel,
  confirmVisible, onConfirmOk, onConfirmCancel,
  rejectVisible, onRejectOk, onRejectCancel,
  withdrawVisible, onWithdrawOk, onWithdrawCancel,
  archiveVisible, onArchiveOk, onArchiveCancel,
  validateForSubmit,
}: ConfirmFlowModalsProps) {
  const [rejectReason, setRejectReason] = useState('');

  const handleSubmitOk = () => {
    const errors = validateForSubmit();
    if (errors.length > 0) {
      Message.warning(errors[0]);
      return;
    }
    onSubmitConfirm();
  };

  const handleRejectOk = () => {
    if (!rejectReason.trim()) {
      Message.warning('请填写驳回意见');
      return;
    }
    onRejectOk(rejectReason);
    setRejectReason('');
  };

  return (
    <>
      {/* 提交确认 */}
      <Modal
        title="提交确认"
        visible={submitVisible}
        onOk={handleSubmitOk}
        onCancel={onSubmitCancel}
        okText="提交"
      >
        <Text>确定提交此纪要进行审核？提交后将进入待确认状态。</Text>
      </Modal>

      {/* 确认 */}
      <Modal
        title="确认纪要"
        visible={confirmVisible}
        onOk={onConfirmOk}
        onCancel={onConfirmCancel}
        okText="确认"
      >
        <Text>确认后行动项将同步至责任人待办中心。是否确认？</Text>
      </Modal>

      {/* 驳回 */}
      <Modal
        title="驳回纪要"
        visible={rejectVisible}
        onOk={handleRejectOk}
        onCancel={() => {
          onRejectCancel();
          setRejectReason('');
        }}
        okText="驳回"
        okButtonProps={{ status: 'danger' }}
      >
        <Text style={{ display: 'block', marginBottom: 8 }}>请填写驳回意见（必填）：</Text>
        <TextArea
          value={rejectReason}
          onChange={setRejectReason}
          placeholder="驳回原因..."
          rows={3}
        />
      </Modal>

      {/* 撤回 */}
      <Modal
        title="撤回修改"
        visible={withdrawVisible}
        onOk={onWithdrawOk}
        onCancel={onWithdrawCancel}
        okText="撤回"
      >
        <Text>撤回将生成新版本，已同步的待办不受影响。是否撤回？</Text>
      </Modal>

      {/* 归档 */}
      <Modal
        title="归档纪要"
        visible={archiveVisible}
        onOk={onArchiveOk}
        onCancel={onArchiveCancel}
        okText="归档"
      >
        <Text>归档后不可编辑。未完成的待办不会被取消。是否归档？</Text>
      </Modal>
    </>
  );
}
