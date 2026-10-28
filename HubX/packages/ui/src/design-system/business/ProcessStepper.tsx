import type { ReactNode } from 'react';
import { Tooltip } from '../foundation/controls';
import '../components.css';

export type ProcessStepperStatus = 'approved' | 'rejected' | 'active' | 'pending';

export interface ProcessStepperNode {
  key: string;
  index: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  status: ProcessStepperStatus;
  statusLabel: ReactNode;
  tooltip?: ReactNode;
}

export interface ProcessStepperProps {
  nodes: ProcessStepperNode[];
  className?: string;
}

/** 横向密集流程条：用于指挥栏中快速读取节点状态；完整审批记录仍使用 ApprovalFlow。 */
export function ProcessStepper({ nodes, className }: ProcessStepperProps) {
  return (
    <ol className={['hubx-process-stepper', className].filter(Boolean).join(' ')}>
      {nodes.map((node, index) => {
        const content = (
          <div
            className={`hubx-process-stepper__node hubx-process-stepper__node--${node.status}`}
            aria-current={node.status === 'active' ? 'step' : undefined}
          >
            <span className="hubx-process-stepper__index">{node.index}</span>
            <span className="hubx-process-stepper__copy">
              <strong>{node.title}</strong>
              {node.subtitle && <small>{node.subtitle}</small>}
            </span>
            <span className="hubx-process-stepper__status">{node.statusLabel}</span>
          </div>
        );

        return (
          <li key={node.key} className="hubx-process-stepper__item">
            {node.tooltip ? <Tooltip content={node.tooltip}>{content}</Tooltip> : content}
            {index < nodes.length - 1 && <span className="hubx-process-stepper__arrow" aria-hidden="true">➔</span>}
          </li>
        );
      })}
    </ol>
  );
}
