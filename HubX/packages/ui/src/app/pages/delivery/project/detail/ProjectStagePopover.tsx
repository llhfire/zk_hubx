import type { ReactNode } from 'react';
import { Button, Popover, Tag, Typography } from '@arco-design/web-react';
import { IconCheck, IconClockCircle, IconDown, IconRight } from '@arco-design/web-react/icon';
import type { ProjectStageCheck, ProjectStageSummary } from '../projectStageSummary';

const { Text } = Typography;

interface ProjectStagePopoverProps {
  children: ReactNode;
  summary: ProjectStageSummary;
  onNavigate: (target: NonNullable<ProjectStageCheck['target']>) => void;
}

const PAYMENT_STATUS_META: Record<ProjectStageSummary['payments'][number]['status'], { label: string; color: string }> = {
  paid: { label: '已收足', color: 'green' },
  partial: { label: '部分已收', color: 'orange' },
  pending: { label: '待收', color: 'gray' },
};

export function ProjectStagePopover({ children, summary, onNavigate }: ProjectStagePopoverProps) {
  const renderChecks = (
    title: string,
    kind: 'completed' | 'pending',
    checks: ProjectStageCheck[],
  ) => checks.length > 0 && (
    <section className="project-stage-popover__section">
      <div className="project-stage-popover__heading">
        <span>{title}</span><span>{checks.length} 项</span>
      </div>
      <div className="project-stage-popover__checks">
        {checks.map((check) => (
          <button
            key={check.id}
            type="button"
            className={`project-stage-popover__check project-stage-popover__check--${kind}${check.target ? ' is-actionable' : ''}`}
            disabled={!check.target}
            onClick={() => check.target && onNavigate(check.target)}
          >
            <span className="project-stage-popover__check-icon" aria-hidden>
              {kind === 'completed' ? <IconCheck /> : <IconClockCircle />}
            </span>
            <span>{check.label}</span>
            {check.target && <IconRight className="project-stage-popover__check-arrow" />}
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <Popover
      className="project-stage-popover-popup"
      style={{ width: 384, maxWidth: 'calc(100vw - 32px)' }}
      position="bottom"
      trigger="click"
      content={(
        <div className="project-stage-popover">
          {summary.payments.length > 0 && (
            <section className="project-stage-popover__section">
              <div className="project-stage-popover__heading">
                <span>付款节点</span><span>{summary.payments.length} 项</span>
              </div>
              <div className="project-stage-popover__payments">
                {summary.payments.map((payment) => {
                  const statusMeta = PAYMENT_STATUS_META[payment.status];
                  return (
                    <button key={payment.id} type="button" onClick={() => onNavigate({ main: 'payments' })}>
                      <span className="project-stage-popover__payment-symbol">¥</span>
                      <span>
                        <strong>{payment.label} · ¥{payment.amount.toLocaleString('zh-CN')}</strong>
                        <Text type="secondary">{payment.condition} · {payment.percentage}%</Text>
                      </span>
                      <Tag size="small" color={statusMeta.color}>{statusMeta.label}</Tag>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          {renderChecks('已完成', 'completed', summary.completed)}
          {renderChecks('待完成', 'pending', summary.pending)}
        </div>
      )}
    >
      <Button type="text" size="mini" className="project-stage-popover__trigger">
        <span>{children}</span>
        {summary.payments.length > 0 && <span className="project-stage-popover__payment-mark" aria-label="包含付款节点">¥</span>}
        <IconDown className="project-stage-popover__chevron" />
      </Button>
    </Popover>
  );
}
