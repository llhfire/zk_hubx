import type { ReactNode } from 'react';
import { StatusTag, type StatusMap } from '../primitives/StatusTag';
import { EmptyState } from '../data-display/EmptyState';
import '../components.css';

export type ApprovalNodeStatus = 'approved' | 'rejected' | 'pending' | 'skipped';

const NODE_STATUS: StatusMap<ApprovalNodeStatus> = {
  approved: { label: '已通过', tone: 'success' },
  rejected: { label: '已驳回', tone: 'danger' },
  pending: { label: '待处理', tone: 'warning' },
  skipped: { label: '未到达', tone: 'neutral' },
};

export interface ApprovalFlowNode {
  key: string;
  /** 节点名，例如「商务审核」「发起申请」 */
  title: ReactNode;
  status: ApprovalNodeStatus;
  /** 覆盖默认状态文案（例如「已提交」） */
  statusLabel?: ReactNode;
  approver?: ReactNode;
  time?: ReactNode;
  /** 审批意见 / 驳回原因 */
  comment?: ReactNode;
  /** 角色或部门等副标题 */
  note?: ReactNode;
}

export interface ApprovalFlowProps {
  nodes: ApprovalFlowNode[];
  emptyDescription?: ReactNode;
  className?: string;
}

/**
 * 审批流：节点 + 审批人 + 时间 + 意见。
 *
 * 改造前合同、报价、差旅三处各自实现了一套节点竖排（各自的 CSS 类、各自的
 * 状态 → 颜色映射），同一个「已驳回」在不同页面颜色不同。这里固定为一份。
 */
export function ApprovalFlow({ nodes, emptyDescription = '暂无审批记录', className }: ApprovalFlowProps) {
  if (nodes.length === 0) {
    return <EmptyState description={emptyDescription} />;
  }

  return (
    <ol className={['hubx-approval-flow', className].filter(Boolean).join(' ')}>
      {nodes.map((node) => {
        const meta = NODE_STATUS[node.status];
        return (
          <li key={node.key} className={`hubx-approval-flow__item hubx-approval-flow__item--${node.status}`}>
            <span className="hubx-approval-flow__dot" aria-hidden="true" />
            <div className="hubx-approval-flow__content">
              <div className="hubx-approval-flow__title">
                <strong>{node.title}</strong>
                <StatusTag meta={node.statusLabel ? { ...meta, label: node.statusLabel } : meta} />
              </div>
              <div className="hubx-approval-flow__meta">
                {node.note && <span>{node.note}</span>}
                {node.approver != null && <span>{node.approver}</span>}
                <span>{node.time || '-'}</span>
              </div>
              {node.comment ? (
                <div className={`hubx-approval-flow__comment${node.status === 'rejected' ? ' is-rejected' : ''}`}>
                  <span>{node.status === 'rejected' ? '驳回原因' : '审批意见'}</span>
                  <p>{node.comment}</p>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
