import { Modal } from '@arco-design/web-react';
import type { ReactNode } from 'react';

export interface ConfirmActionOptions {
  title: ReactNode;
  content?: ReactNode;
  okText?: string;
  cancelText?: string;
  /** danger 用于删除、作废等不可逆操作（M-028） */
  tone?: 'default' | 'danger';
  onOk: () => void | Promise<void>;
}

/**
 * 二次确认的唯一入口。
 *
 * 危险操作必须说明「删的是什么、影响是什么」，因此 title 与 content 都必填语义清晰。
 * 页面里不要再直接调用 `Modal.confirm`（全仓 18 处）。
 */
export function confirmAction({
  title,
  content,
  okText = '确定',
  cancelText = '取消',
  tone = 'default',
  onOk,
}: ConfirmActionOptions): void {
  Modal.confirm({
    title,
    content,
    okText,
    cancelText,
    okButtonProps: tone === 'danger' ? { status: 'danger' } : undefined,
    onOk: async () => {
      await onOk();
    },
  });
}

export interface ConfirmModalProps {
  visible: boolean;
  title: ReactNode;
  content?: ReactNode;
  okText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger';
  confirmLoading?: boolean;
  onOk: () => void;
  onCancel: () => void;
}

/**
 * 受控版本的确认弹窗，用于需要自己控制 visible/loading 的场景。
 * 简单场景优先用 `confirmAction`，避免两套写法并存。
 */
export function ConfirmModal({
  visible,
  title,
  content,
  okText = '确定',
  cancelText = '取消',
  tone = 'default',
  confirmLoading,
  onOk,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      title={title}
      okText={okText}
      cancelText={cancelText}
      confirmLoading={confirmLoading}
      okButtonProps={tone === 'danger' ? { status: 'danger' } : undefined}
      onOk={onOk}
      onCancel={onCancel}
      unmountOnExit
    >
      {content}
    </Modal>
  );
}
