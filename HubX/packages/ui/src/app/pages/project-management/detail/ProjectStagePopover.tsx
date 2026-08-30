import type { ReactNode } from 'react';
import { Button, Popover, Tag, Typography } from '@arco-design/web-react';
import { IconDown } from '@arco-design/web-react/icon';
import type { ProjectStageCheck, ProjectStageSummary } from '../projectStageSummary';

const { Text } = Typography;

interface ProjectStagePopoverProps {
  children: ReactNode;
  summary: ProjectStageSummary;
  onNavigate: (target: NonNullable<ProjectStageCheck['target']>) => void;
}

const PAYMENT_STATUS_META: Record<ProjectStageSummary['payments'][number]['status'], { label: string; color: string }> = {
  paid: { label: '已收足', color: 'green' },
  partial: { label: '部分到账', color: 'orange' },
  pending: { label: '待收', color: 'gray' },
};

export function ProjectStagePopover({ children, summary, onNavigate }: ProjectStagePopoverProps) {
  const renderChecks = (title: string, tone: string, checks: ProjectStageCheck[]) => checks.length > 0 && (
    <section className="project-stage-popover__section">
      <div className="project-stage-popover__heading">
        <span>{title}</span><Tag size="small" color={tone}>{checks.length}</Tag>
      </div>
      {checks.map((check) => (
        <button
          key={check.id}
          type="button"
          className="project-stage-popover__check"
          disabled={!check.target}
          onClick={() => check.target && onNavigate(check.target)}
        >
          <span aria-hidden>{check.done ? '✓' : title === '阻塞' ? '!' : '○'}</span>
          <span>{check.label}</span>
        </button>
      ))}
    </section>
  );

  return (
    <Popover
      position="bottom"
      trigger="click"
      content={(
        <div className="project-stage-popover">
          <div className="project-stage-popover__title">
            <Text style={{ fontWeight: 600 }}>阶段详情</Text>
            <Text type="secondary">支持查看历史事实与付款节点</Text>
          </div>
          {summary.payments.length > 0 && (
            <section className="project-stage-popover__section">
              <div className="project-stage-popover__heading">
                <span>付款节点</span><Tag size="small" color="gold">{summary.payments.length}</Tag>
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
          {renderChecks('已完成', 'green', summary.completed)}
          {renderChecks('待完成', 'gray', summary.pending)}
          {renderChecks('阻塞', 'red', summary.blocked)}
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
