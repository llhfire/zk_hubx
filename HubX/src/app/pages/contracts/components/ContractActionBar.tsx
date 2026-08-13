// 顶部操作按钮组：按当前合同状态动态切换。
//
// 状态 → 主操作映射（详见 plan Q13 分叉 4）：
//   draft         → 编辑 / 提交审批 / 作废
//   approving     → 撤回审批 / [演示] 通过当前节点 / [演示] 驳回
//   pending_mail  → 标记已寄出 / 撤回到草稿 / 作废
//   pending_return→ 上传回寄件（在扫描归档 Tab 上传）/ 重做
//   archived      → 无操作
//   voided        → 无操作

import {
  Button,
  Modal,
  Space,
  Input,
  Form,
  Message,
} from '@arco-design/web-react';
import {
  IconEdit,
  IconSend,
  IconCheck,
  IconClose,
} from '@arco-design/web-react/icon';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useContracts } from '../ContractsContext';
import type { Contract } from '../types';

interface Props {
  contract: Contract;
}

export function ContractActionBar({ contract }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    submitForApproval,
    withdrawApproval,
    markMailed,
    voidContract,
    approveStep,
    rejectStep,
  } = useContracts();

  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const onEdit = () => {
    const returnTarget = (location.state as {
      contractDetailReturn?: { pathname: string; state?: Record<string, unknown> };
    } | null)?.contractDetailReturn;
    navigate(`/contracts/${contract.id}/edit`, {
      state: returnTarget ? { contractEditorReturn: returnTarget } : undefined,
    });
  };
  const onSubmit = () => {
    submitForApproval(contract.id, contract.current);
    Message.success('已提交审批');
  };
  const onWithdraw = () => {
    withdrawApproval(contract.id);
    Message.success('已撤回审批');
  };
  const onMailed = () => {
    markMailed(contract.id);
    Message.success('已标记寄出，进入「待回寄」状态');
  };
  const onVoid = () => {
    if (!voidReason.trim()) {
      Message.error('请填写作废原因');
      return;
    }
    voidContract(contract.id, voidReason.trim());
    Message.success('合同已作废');
    setVoidModalVisible(false);
  };

  // 演示用：找到第一个 pending 节点，把它置为 approved
  const onApproveDemoNext = () => {
    const idx = contract.approvalFlow.findIndex((n) => n.status === 'pending');
    if (idx < 0) {
      Message.warning('没有待审批节点');
      return;
    }
    approveStep(contract.id, idx, '同意（演示）');
    Message.success(`已通过节点：${contract.approvalFlow[idx].step}`);
  };

  const onRejectDemo = () => {
    if (!rejectReason.trim()) {
      Message.error('请填写驳回原因');
      return;
    }
    const idx = contract.approvalFlow.findIndex((n) => n.status === 'pending');
    if (idx < 0) {
      Message.warning('没有待审批节点');
      return;
    }
    rejectStep(contract.id, idx, rejectReason.trim());
    Message.warning('合同已驳回，回到「草稿」');
    setRejectModalVisible(false);
  };

  const buttons: React.ReactNode[] = [];

  switch (contract.status) {
    case 'draft':
      buttons.push(
        <Button key="edit" type="primary" icon={<IconEdit />} onClick={onEdit}>
          编辑
        </Button>,
        <Button key="submit" type="primary" icon={<IconSend />} onClick={onSubmit}>
          提交审批
        </Button>,
        <Button key="void" status="danger" onClick={() => setVoidModalVisible(true)}>
          作废
        </Button>,
      );
      break;
    case 'approving':
      buttons.push(
        <Button key="approve" type="primary" icon={<IconCheck />} onClick={onApproveDemoNext}>
          [演示] 通过下一节点
        </Button>,
        <Button key="reject" status="danger" icon={<IconClose />} onClick={() => setRejectModalVisible(true)}>
          [演示] 驳回
        </Button>,
        <Button key="withdraw" onClick={onWithdraw}>
          撤回审批
        </Button>,
      );
      break;
    case 'pending_mail':
      buttons.push(
        <Button key="mailed" type="primary" icon={<IconSend />} onClick={onMailed}>
          标记已寄出
        </Button>,
        <Button key="void" status="danger" onClick={() => setVoidModalVisible(true)}>
          作废
        </Button>,
      );
      break;
    case 'pending_return':
      buttons.push(
        <span key="hint" style={{ color: 'var(--color-text-3)', fontSize: 13 }}>
          请在下方「扫描件归档」Tab 上传客户回寄件
        </span>,
        <Button key="void" status="danger" onClick={() => setVoidModalVisible(true)}>
          作废
        </Button>,
      );
      break;
    case 'archived':
      break;
    case 'voided':
      buttons.push(
        <span key="hint" style={{ color: 'var(--color-danger)', fontSize: 13 }}>
          合同已作废
        </span>,
      );
      break;
  }

  if (!buttons.length) return null;

  return (
    <>
      <Space>{buttons}</Space>

      <Modal
        title="作废合同"
        visible={voidModalVisible}
        onOk={onVoid}
        onCancel={() => setVoidModalVisible(false)}
        okButtonProps={{ status: 'danger' }}
      >
        <Form.Item label="作废原因" required>
          <Input.TextArea
            rows={3}
            value={voidReason}
            onChange={setVoidReason}
            placeholder="作废后无法恢复，请填写原因"
          />
        </Form.Item>
      </Modal>

      <Modal
        title="驳回审批"
        visible={rejectModalVisible}
        onOk={onRejectDemo}
        onCancel={() => setRejectModalVisible(false)}
      >
        <Form.Item label="驳回原因" required>
          <Input.TextArea
            rows={3}
            value={rejectReason}
            onChange={setRejectReason}
            placeholder="例如：金额超出审批权限，请下调或申请特批"
          />
        </Form.Item>
      </Modal>
    </>
  );
}
